// Packages
const fs = require("fs"),
    Discord = require("discord.js"),
    bodyParser = require("body-parser"),
    mongoose = require("mongoose"), // Library for MongoDB
    express = require("express"), // Web server
    hbs = require("hbs"); // Handlebars, used to host a temporary page

// Local JS files
const {confirmRequest} = require("./util/functions");

// Local config files
const config = require("$/config.json");

// Schemas
const Music = require("$/models/music");

// Init
// Express
const app = express();

app.use(express.static("public")); // Set public as static files folder, can be uses for JS and CSS files
app.set("view engine", "hbs"); // Set the view engine to Handlebars

app.listen(3001); // Start the web server on port 3001
console.log("Express is listening");

// Mongoose
mongoose.connect(`mongodb+srv://${config.mongodb.username}:${config.mongodb.password}@${config.mongodb.host}/${config.mongodb.database}`, { useNewUrlParser: true, useUnifiedTopology: true });

// Code
// Routers
app.get("/", (req, res) => {
    Music.find({}).lean().exec((err, docs) => {
        if(err) console.error(err);
        res.render("index", { music: docs });
    });
});

app.get("/player/:id", (req, res) => {
    Music.findOne({ _id: req.params.id }).lean().exec((err, doc) => {
        if(err) return console.error(err);
        if(doc) return res.render("player", { music: doc });
        else res.status(400).send("Page not found")
    })
});

// Discord bot

// Create a Discord client
const client = new Discord.Client();

client.on("ready", () => {
    client.commands = new Discord.Collection(); // This holds all the commands accessible for the end users.
    client.devcmds = new Discord.Collection(); // This will hold commands that are only accessible for the maintainers
    loadcmds();
    console.log("Bot online");
});

client.on("message", (message) => {
    if(message.author.bot) return;
    if (message.content.startsWith(config.discord.prefix)) { // User command handler
        if (!message.member.roles.cache.has(config.discord.roles.musician) && !message.member.roles.cache.has(config.discord.roles.staff)) return;

        let cont = message.content.slice(config.discord.prefix.length).split(" ");
        let args = cont.slice(1);
        let cmd = client.commands.get(cont[0]);
        if(!cmd) return;
        if (!message.member.roles.cache.has(config.discord.roles.musician)) {
            message.reply("you don't have the musician role, do you still want to perform this action?").then(msg => {
                confirmRequest(msg, message.author.id)
                    .then(result => {
                        if(result === true) {
                            msg.delete({ reason: "Automated" });
                            return cmd.run(client, message, args);
                        } else {
                            message.delete({ reason: "Automated" });
                            return msg.delete({ reason: "Automated" });
                        }
                    });
            });

        } else {
            return cmd.run(client, message, args);
        }
    } else if (message.content.startsWith(config.discord.devprefix)) { // Dev command handler
        if (!message.member.roles.cache.has(config.discord.roles.dev)) return;
        let cont = message.content.slice(config.discord.devprefix.length).split(" ");
        if (cont[0] === "reload") {
            message.channel.send("Reloading commands...");
            loadcmds();
            return message.channel.send("All commands have been reloaded.");
        }
        let args = cont.slice(1);
        let cmd = client.devcmds.get(cont[0]);
        if (cmd) return cmd.run(client, message, args);
    }
})

client.login(config.discord.token);


// Functions
function loadcmds() {
    fs.readdir("./commands/user", (err, files) => { // Read all the files in the directory, this are the commands usable by everyone or staff
        if (err) throw (err);
        let jsfiles = files.filter(f => f.split(".").pop() === "js");
        if (jsfiles.length <= 0) {
            return console.log("No commands found.");
        }
        jsfiles.forEach((f, i) => {
            delete require.cache[require.resolve(`./commands/user/${f}`)];
            const cmd = require(`./commands/user/${f}`);
            client.commands.set(cmd.config.command, cmd);
        });
    });
    fs.readdir("./commands/dev", (err, files) => { // Commmands only available to the developer, these can break.
        if (err) throw (err);
        let jsfiles = files.filter(f => f.split(".").pop() === "js");
        if (jsfiles.length <= 0) {
            return console.log("No commands found.");
        }
        jsfiles.forEach((f, i) => {
            delete require.cache[require.resolve(`./commands/dev/${f}`)];
            const cmd = require(`./commands/dev/${f}`);
            client.devcmds.set(cmd.config.command, cmd);
        });
    });
}