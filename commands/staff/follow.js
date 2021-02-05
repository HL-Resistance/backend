// Imports
// Models
const Twitter = require('twitter-lite');
const TweetSubscription = require('$/models/tweetSubscription');

// Packages

// Local imports
const { confirmRequest } = require('$/util/functions');
const { restart } = require('$/util/twitter');
const { logger } = require('$/index');
const config = require('$/config.json');

// Init
const T = new Twitter(config.twitter);

// Functions
function checkExistingAndFollow(message, subscription, channel, user) {
	TweetSubscription.findById(subscription._id, async (err, doc) => {
		if (err) return logger.error(err);
		if (doc) {
			const index = await doc.channels.findIndex((docChannel) => docChannel.id === channel.id);
			if (index !== -1) {
				return message.channel.send(`${channel.name} is already following @${user.screen_name}.`)
					.then((errMsg) => {
						message.delete({ timeout: 4000, reason: 'Automated' });
						errMsg.delete({ timeout: 4000, reason: 'Automated' });
					});
			}
			doc.channels.push(channel.id);
			const msg = await message.channel.send(`Are you sure you want to add @${user.screen_name} to ${channel.name}?`);
			const result = await confirmRequest(msg, message.author.id);
			msg.delete({ reason: 'Automated' });

			if (result === true) {
				doc.save((err2) => {
					if (err2) {
						logger.error(err2);
						message.channel.send('Something went wrong saving to the database.')
							.then((errMsg) => {
								message.delete({ timeout: 4000, reason: 'Automated' });
								errMsg.delete({ timeout: 4000, reason: 'Automated' });
							});
					} else {
						message.channel.send('Subscription successful.')
							.then((errMsg) => {
								message.delete({ timeout: 4000, reason: 'Automated' });
								errMsg.delete({ timeout: 4000, reason: 'Automated' });
							});
					}
				});
			} else {
				message.channel.send('Cancelled.')
					.then((errMsg) => {
						message.delete({ timeout: 4000, reason: 'Automated' });
						errMsg.delete({ timeout: 4000, reason: 'Automated' });
					});
			}
		}
		const msg = await message.channel.send(`Are you sure you want to add @${user.screen_name} to ${channel.name}?`);
		const result = await confirmRequest(msg, message.author.id);

		if (result === true) {
			msg.delete({ timeout: 2000, reason: 'Automated' });
			subscription.save((err2) => {
				if (err2) {
					logger.error(err2);
					message.channel.send('Something went wrong during the subscription, try again later.')
						.then((errMsg) => {
							message.delete({ timeout: 4000, reason: 'Automated' });
							errMsg.delete({ timeout: 4000, reason: 'Automated' });
						});
				} else {
					restart();
					message.channel.send('Follow successful.')
						.then((errMsg) => {
							message.delete({ timeout: 4000, reason: 'Automated' });
							errMsg.delete({ timeout: 4000, reason: 'Automated' });
						});
				}
			});
		} else {
			await msg.edit('Cancelled.');
			msg.delete({ timeout: 4000, reason: 'Automated' });
			message.delete({ timeout: 4000, reason: 'Automated' });
		}
	});
}

// Command
exports.run = async (client, message, args) => {
	if (!args[0]) {
		return message.channel.send(`**USAGE:** ${config.discord.prefix}follow <Twitter @name (without @)> <Discord channel id>`)
			.then((errMsg) => {
				message.delete({ timeout: 4000, reason: 'Automated' });
				errMsg.delete({ timeout: 4000, reason: 'Automated' });
			});
	}
	const users = await T.get('users/lookup', { screen_name: args[0] })
		.catch((e) => {
			if (e) {
				return message.channel.send("Couldn't find this user, please try again.")
					.then((errMsg) => {
						message.delete({ timeout: 4000, reason: 'Automated' });
						errMsg.delete({ timeout: 4000, reason: 'Automated' });
					});
			}
		});

	if (!users[0]) {
		return message.channel.send("Couldn't find this user, please try again.")
			.then((errMsg) => {
				message.delete({ timeout: 4000, reason: 'Automated' });
				errMsg.delete({ timeout: 4000, reason: 'Automated' });
			});
	}

	const channel = await client.channels.fetch(args[1])
		.catch((err) => {
			if (err) {
				message.channel.send("That channel doesn't exist.")
					.then((errMsg) => {
						message.delete({ timeout: 4000, reason: 'Automated' });
						errMsg.delete({ timeout: 4000, reason: 'Automated' });
					});
			}
		});

	const subscription = new TweetSubscription({
		_id: users[0].id_str,
		channels: [],
	});
	subscription.channels.push(channel.id);

	await channel.fetchWebhooks()
		.then(async (hooks) => {
			const existingWebhook = await hooks.find((wh) => wh.name.toLowerCase() === 'holotweeter');
			if (!existingWebhook) {
				await channel.createWebhook('HoloTweeter').catch((err) => {
					logger.error(err);
					return message.channel.send('Unable to create a webhook in that channel, please create one with the name `HoloTweeter` and run this command again.')
						.then((errMsg) => {
							message.delete({ timeout: 4000, reason: 'Automated' });
							errMsg.delete({ timeout: 4000, reason: 'Automated' });
						});
				});
			}
			checkExistingAndFollow(message, subscription, channel, users[0]);
		});
};

exports.config = {
	command: 'follow',
};