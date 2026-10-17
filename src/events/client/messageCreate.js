const config = require('../../config/config.json');
const Nop = require('../../models/Nop');
const Verify = require('../../models/Verify');
const Tesseract = require('tesseract.js');
const {
    MessageFlags,
    TextDisplayBuilder,
    ContainerBuilder,
    SeparatorBuilder,
} = require('discord.js');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const aiHandler = require('../../ticket/handlers/AIHandler');

module.exports = {
    name: 'messageCreate',
    once: false,
    async execute(client, message) {
        if (!message || !message.guild) return;
        if (message.author?.bot) return;

        // Handle AI Ticket Replies & Activity Tracking
        await aiHandler.handleMessage(message);

        // Standard Ticket Activity Tracking (if AI is disabled)
        if (!message.author.bot) {
            const Ticket = require('../../ticket/models/Ticket');
            await Ticket.findOneAndUpdate(
                { channelId: message.channel.id, status: 'open' },
                { lastMessageAt: Date.now() }
            );
        }

        // --- YouTube Verification Logic ---
        const verifyData = await Verify.findOne({ guildId: message.guild.id, channelId: message.channel.id, enabled: true });
        if (verifyData && message.attachments.size > 0) {
            const attachment = message.attachments.first();
            if (attachment.contentType?.startsWith('image/')) {
                const loadingBlock = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${config.loading_emoji} **Scanning image for verification...**\n> Target Channel: \`${verifyData.youtubeChannel}\``)
                    );
                
                const statusMsg = await message.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [loadingBlock]
                });

                try {
                    const { data: { text } } = await Tesseract.recognize(attachment.url, 'eng');
                    const ocrText = text.toLowerCase();
                    const targetName = verifyData.youtubeChannel.toLowerCase();

                    // Check for channel name and "Subscribed" status
                    const hasChannelName = ocrText.includes(targetName);
                    const isSubscribed = ocrText.includes('subscribed') || ocrText.includes('subscriber');

                    if (hasChannelName && isSubscribed) {
                        const role = message.guild.roles.cache.get(verifyData.roleId);
                        if (role) {
                            await message.member.roles.add(role);
                            const successBlock = new ContainerBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(`${config.checkmark_emoji} **Verification Successful!**\n> You have been given the **${role.name}** role.\n> Target: \`${verifyData.youtubeChannel}\``)
                                );
                            await statusMsg.edit({ components: [successBlock] });
                        }
                    } else {
                        const failBlock = new ContainerBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(`${config.crossmark_emoji} **Verification Failed.**\n> Could not confirm subscription to \`${verifyData.youtubeChannel}\`.\n> Make sure the channel name and "Subscribed" button are visible.`)
                            );
                        await statusMsg.edit({ components: [failBlock] });
                    }
                } catch (err) {
                    console.error('[OCR ERROR]', err);
                    const errorBlock = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`${config.crossmark_emoji} **An error occurred during scanning.**`)
                        );
                    await statusMsg.edit({ components: [errorBlock] });
                }
                return; // Stop here if it's a verification attempt
            }
        }

        if (!message.content) return;

        const ownerIDs = config.ownerIDs || [];
        const isOwner = ownerIDs.includes(message.author.id);

        // Check for No Prefix (NOP) user in database
        let isNop = false;
        if (!isOwner) {
            const nopData = await Nop.findOne({ userId: message.author.id });
            if (nopData) {
                if (!nopData.expiresAt || nopData.expiresAt > new Date()) {
                    isNop = true;
                } else {
                    // Clean up expired NOP
                    await Nop.deleteOne({ userId: message.author.id });
                }
            }
        }

        const prefix = typeof config.prefix === 'string' ? config.prefix.trim() : 'z!';
        const botName = typeof config.botName === 'string' && config.botName.trim().length > 0
            ? config.botName.trim().toLowerCase()
            : 'zenith';
        const mentionRegex = client.user
            ? new RegExp(`^<@!?${escapeRegex(client.user.id)}>(?:\\s+|$)`)
            : null;

        let content = message.content.trim();
        let triggerMatched = false;

        // Owners and NOP users can bypass prefix check
        if (isOwner || isNop) {
            // Check if first word is a command or alias
            const firstWord = content.split(/\s+/)[0].toLowerCase();
            if (client.commands.has(firstWord) || client.aliases.has(firstWord)) {
                triggerMatched = true;
            }
        }

        // 1) Mention trigger, e.g. @zenith ping
        if (!triggerMatched && mentionRegex) {
            const mentionMatch = content.match(mentionRegex);
            if (mentionMatch) {
                triggerMatched = true;
                content = content.slice(mentionMatch[0].length).trim();
            }
        }

        // 2) Prefix trigger, e.g. z!ping
        if (!triggerMatched && prefix && content.startsWith(prefix)) {
            triggerMatched = true;
            content = content.slice(prefix.length).trim();
        }

        // 3) Bot name trigger, e.g. zenith ping
        if (!triggerMatched && botName) {
            const botNameRegex = new RegExp(`^${escapeRegex(botName)}(?:\\s+|$)`, 'i');
            const nameMatch = content.match(botNameRegex);
            if (nameMatch) {
                triggerMatched = true;
                content = content.slice(nameMatch[0].length).trim();
            }
        }

        if (!triggerMatched) return;

        const args = content.split(/\s+/).filter(Boolean);
        if (args.length === 0) return;

        const input = args.shift().toLowerCase();
        const resolvedName = client.commands.has(input) ? input : client.aliases.get(input);
        if (!resolvedName) return;

        const command = client.commands.get(resolvedName);
        if (!command || typeof command.run !== 'function') return;

        // Owner-only check
        if (command.ownerOnly && !isOwner) {
            const errorBlock = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${config.crossmark_emoji} This command is restricted to bot owners only.`)
                );
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [errorBlock]
            });
        }

        // Permission check
        if (command.permissions && !message.member.permissions.has(command.permissions)) {
            const errorBlock = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${config.crossmark_emoji} You do not have the required permissions to use this command.`)
                );
            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [errorBlock]
            });
        }

        // Attach args to message for convenience in hybrid commands
        message.args = args;

        try {
            await command.run(client, message);
        } catch (error) {
            console.error(`[MESSAGE COMMAND ERROR] ${resolvedName}:`, error);
            const errorText = new TextDisplayBuilder()
                .setContent('⚠ **Command Error**\nAn unexpected error occurred while running that command.');

            const sep = new SeparatorBuilder();
            const container = new ContainerBuilder()
                .setAccentColor(parseInt(String(config.color || '#2f3136').replace('#', ''), 16))
                .addSeparatorComponents(sep)
                .addTextDisplayComponents(errorText)
                .addSeparatorComponents(sep);

            await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [container],
            }).catch(() => null);
        }
    },
};
