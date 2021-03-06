// Models
const PingSubscription = require("$/models/pingSubscription");

// Local files
const {confirmRequest} = require("$/util/functions"),
    unicodeEmojis = require("$/util/unicodeEmojis.json"),
    {logger} = require("$/index");

// Modules
const Discord = require("discord.js")

exports.run = (client, message, args) => {
    client.channels.fetch(args[0])
        .then((channel) => {
            const name = args.slice(2).join(" ");
            PingSubscription.findById(name).lean().exec((err, doc) => {
                if(err) logger.error(err);
                if(doc) return message.reply("That list already exists.")
                    .then((msg) => {
                        message.delete({timeout: 4000, reason: "Automated"});
                        msg.delete({timeout: 4000, reason: "Automated"});
                    });
            })
            if(unicodeEmojis[args[1].toLowerCase()]) {
                const emoji = unicodeEmojis[args[1].toLowerCase()];
                createList(message, channel, emoji, emoji, emoji, name);
            }
            else {
                const emoji = message.guild.emojis.resolve(args[1]);
                if (!emoji) return message.reply("That emote doesn't exist.")
                    .then((msg) => {
                        message.delete({timeout: 4000, reason: "Automated"});
                        msg.delete({timeout: 4000, reason: "Automated"});
                    });
                else createList(message, channel, emoji, `<:${emoji.name}:${emoji.id}>`, emoji.name, name)
            }

        })
        .catch((err) => {
            if (err) return message.reply("That channel doesn't exist.")
                .then((msg) => {
                    message.delete({timeout: 4000, reason: "Automated"});
                    msg.delete({timeout: 4000, reason: "Automated"});
                });
        });
}

module.exports.config = {
    command: "createpinglist"
}

function createList(message, channel, emoji, emojiText, emojiName, name) {
    message.reply(`are you sure you want to create a new ping list with the name ${name}?`)
        .then((msg) => {
            confirmRequest(msg, message.author.id)
                .then((result) => {
                    if (result === true) {
                        const embed = new Discord.MessageEmbed()
                            .setTitle(name)
                            .setDescription(`React with ${emoji} to subscribe to this ping list`)
                        channel.send(embed).then((embedMsg) => {
                            embedMsg.react(emoji);
                            const ping = new PingSubscription({
                                _id: name,
                                messageID: embedMsg.id,
                                channelID: embedMsg.channel.id,
                                users: [],
                                emoji: emojiName
                            });
                            ping.save();
                            msg.edit("New list created");
                            message.delete({timeout: 4000, reason: "Automated"});
                            msg.delete({timeout: 4000, reason: "Automated"});
                        });
                    } else {
                        msg.edit("Action cancelled");
                        message.delete({timeout: 4000, reason: "Automated"});
                        msg.delete({timeout: 4000, reason: "Automated"});
                    }
                })
        });
}
