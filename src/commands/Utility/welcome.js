const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    TextDisplayBuilder,
    ContainerBuilder,
    ChannelType
} = require('discord.js');
const Welcome = require('../../models/Welcome');
const config = require('../../config/config.json');

module.exports = {
    name: 'welcome',
    description: 'Set up the welcome channel for the server.',
    permissions: [PermissionFlagsBits.ManageGuild],
    slashData: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Manage the welcome system for the server.')
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Enable and set the welcome channel.')
                .addChannelOption(opt => 
                    opt.setName('channel')
                        .setDescription('The channel where welcome messages will be sent.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Disable the welcome system.')
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('Check the current welcome configuration.')
        ),

    /**
     * @param {import('discord.js').Client} client
     * @param {import('discord.js').CommandInteraction|import('discord.js').Message} context
     */
    run: async (client, context) => {
        const isSlash = context.isChatInputCommand?.() || false;
        let subcommand, channel;

        if (isSlash) {
            subcommand = context.options.getSubcommand();
            channel = context.options.getChannel('channel');
        } else {
            const args = context.args || [];
            subcommand = args[0]?.toLowerCase();
            const mention = args[1];

            if (!subcommand || !['add', 'remove', 'list'].includes(subcommand)) {
                const errorBlock = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${config.crossmark_emoji} Usage: \`${config.prefix}welcome add <#channel>\`, \`remove\`, or \`list\``)
                    );
                return context.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [errorBlock]
                });
            }

            if (subcommand === 'add') {
                if (!mention) {
                    const errorBlock = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`${config.crossmark_emoji} Please mention a channel to add.`)
                        );
                    return context.reply({
                        flags: MessageFlags.IsComponentsV2,
                        components: [errorBlock]
                    });
                }
                const channelId = mention.replace(/[<#>]/g, '');
                channel = context.guild.channels.cache.get(channelId);

                if (!channel || channel.type !== ChannelType.GuildText) {
                    const errorBlock = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`${config.crossmark_emoji} Invalid text channel provided.`)
                        );
                    return context.reply({
                        flags: MessageFlags.IsComponentsV2,
                        components: [errorBlock]
                    });
                }
            }
        }

        if (subcommand === 'add') {
            try {
                await Welcome.findOneAndUpdate(
                    { guildId: context.guild.id },
                    { channelId: channel.id, enabled: true },
                    { upsert: true, returnDocument: 'after' }
                );

                const responseBlock = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${config.checkmark_emoji} **Welcome system enabled!**\n> Messages will be sent in ${channel}.`)
                    );

                return context.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [responseBlock]
                });
            } catch (err) {
                console.error('[WELCOME ADD ERROR]', err);
                const errorBlock = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${config.crossmark_emoji} Failed to enable welcome system.`)
                    );
                return context.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [errorBlock]
                });
            }
        }

        if (subcommand === 'remove') {
            try {
                const result = await Welcome.findOneAndDelete({ guildId: context.guild.id });
                
                const message = result 
                    ? `${config.checkmark_emoji} **Welcome system disabled and removed.**`
                    : `${config.info_emoji} **Welcome system was not enabled for this server.**`;

                const responseBlock = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(message)
                    );

                return context.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [responseBlock]
                });
            } catch (err) {
                console.error('[WELCOME REMOVE ERROR]', err);
                const errorBlock = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${config.crossmark_emoji} Failed to disable welcome system.`)
                    );
                return context.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [errorBlock]
                });
            }
        }

        if (subcommand === 'list') {
            const welcomeData = await Welcome.findOne({ guildId: context.guild.id });

            if (!welcomeData || !welcomeData.enabled) {
                const responseBlock = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${config.info_emoji} **Welcome system is currently disabled.**`)
                    );
                return context.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [responseBlock]
                });
            }

            const welcomeChannel = context.guild.channels.cache.get(welcomeData.channelId);
            const responseBlock = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${config.info_emoji} **Welcome Configuration:**\n> **Status:** Enabled\n> **Channel:** ${welcomeChannel || 'Unknown (Channel deleted?)'}`)
                );

            return context.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [responseBlock]
            });
        }
    },
};
