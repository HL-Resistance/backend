// Models
const PingSubscription = require("$/models/pingSubscription");

// Local files
const {confirmRequest} = require("$/util/functions"),
    {logger} = require("$/index");

exports.run = (client, message, args) => {
    client.channels.fetch(args[0])
        .then((channel) => {
            PingSubscription.findById(args.slice(1).join(" ")).lean().exec((err, doc) => {
                if (!doc) return message.channel.send("That list doesn't exist.")
                    .then((msg) => {
                        message.delete({timeout: 4000, reason: "Automated"});
                        msg.delete({timeout: 4000, reason: "Automated"});
                    });
                message.channel.send(`Are you sure you want to ping everyone in: ${doc._id}?`)
                    .then((msg) => {
                        confirmRequest(msg, message.author.id)
                            .then((result) => {
                                if (result === true) {
                                    let userList = doc.users.slice(),
                                        firstPingMsg = null;
                                    const loops = Math.ceil(userList.length / 95);
                                    for (let i = 0; i < loops; i++) {
                                        let pingMsg = "";
                                        if (userList.length > 95) {
                                            for (let x = 0; x < 95; x++) {
                                                pingMsg = `${pingMsg}<@${userList[x]}>`;
                                            }
                                            userList = userList.splice(0, 95);
                                        } else {
                                            for (let x = 0; x < userList.length; x++) {
                                                pingMsg = `${pingMsg}<@${userList[x]}>`;
                                            }
                                        }
                                        channel.send(pingMsg)
                                            .then((sentPingMsg) => {
                                                if (!firstPingMsg) firstPingMsg = sentPingMsg;
                                                else sentPingMsg.delete({timeout: 1000, reason: "Automated"});
                                                if (i === loops - 1) {
                                                    sentPingMsg.edit(`Everyone in ${doc._id} has been pinged.`)
                                                    msg.edit("Done with sending pings");
                                                    message.delete({timeout: 4000, reason: "Automated"});
                                                    msg.delete({timeout: 4000, reason: "Automated"});
                                                }
                                            });
                                    }
                                } else {
                                    msg.edit("Cancelled.");
                                    message.delete({timeout: 4000, reason: "Automated"});
                                    msg.delete({timeout: 4000, reason: "Automated"});
                                }
                            });
                    });
            });
        })
        .catch((err) => {
            if (err) return message.channel.send("That channel doesn't exist.")
                .then((msg) => {
                    message.delete({timeout: 4000, reason: "Automated"});
                    msg.delete({timeout: 4000, reason: "Automated"});
                });
        })
}

module.exports.config = {
    command: "ping"
}