const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    TextDisplayBuilder,
    ContainerBuilder,
    ChannelType
} = require('discord.js');
const Verify = require('../../models/Verify');
const config = require('../../config/config.json');

module.exports = {
    name: 'verify',
    description: 'Set up YouTube subscription verification.',
    permissions: [PermissionFlagsBits.ManageGuild],
    slashData: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Set up YouTube subscription verification.')
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Set up the verification system.')
                .addChannelOption(opt => 
                    opt.setName('channel')
                        .setDescription('The channel where users send subscription proof.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
                .addRoleOption(opt =>
                    opt.setName('role')
                        .setDescription('The role to give upon verification.')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName('youtube_name')
                        .setDescription('The exact name of the YouTube channel users should subscribe to.')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('disable')
                .setDescription('Disable the verification system.')
        ),

    /**
     * @param {import('discord.js').Client} client
     * @param {import('discord.js').CommandInteraction|import('discord.js').Message} context
     */
    run: async (client, context) => {
        const isSlash = context.isChatInputCommand?.() || false;
        let subcommand, channel, role, ytName;

        if (isSlash) {
            subcommand = context.options.getSubcommand();
            channel = context.options.getChannel('channel');
            role = context.options.getRole('role');
            ytName = context.options.getString('youtube_name');
        } else {
            const args = context.args || [];
            subcommand = args[0]?.toLowerCase();
            
            if (!subcommand || !['setup', 'disable'].includes(subcommand)) {
                const errorBlock = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${config.crossmark_emoji} Usage: \`${config.prefix}verify setup <#channel> <@role> <Youtube Name>\` or \`disable\``)
                    );
                return context.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [errorBlock]
                });
            }

            if (subcommand === 'setup') {
                const channelMention = args[1];
                const roleMention = args[2];
                ytName = args.slice(3).join(' ');

                if (!channelMention || !roleMention || !ytName) {
                    const errorBlock = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`${config.crossmark_emoji} Missing arguments. Provide channel, role, and YouTube name.`)
                        );
                    return context.reply({
                        flags: MessageFlags.IsComponentsV2,
                        components: [errorBlock]
                    });
                }

                const channelId = channelMention.replace(/[<#>]/g, '');
                channel = context.guild.channels.cache.get(channelId);
                const roleId = roleMention.replace(/[<@&>]/g, '');
                role = context.guild.roles.cache.get(roleId);

                if (!channel || channel.type !== ChannelType.GuildText) {
                    const errorBlock = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${config.crossmark_emoji} Invalid channel.`));
                    return context.reply({ flags: MessageFlags.IsComponentsV2, components: [errorBlock] });
                }
                if (!role) {
                    const errorBlock = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${config.crossmark_emoji} Invalid role.`));
                    return context.reply({ flags: MessageFlags.IsComponentsV2, components: [errorBlock] });
                }
            }
        }

        if (subcommand === 'setup') {
            // --- SECURITY CHECKS ---
            const moderator = context.member || await context.guild.members.fetch(isSlash ? context.user.id : context.author.id);
            
            // 1. Role Hierarchy Check
            if (role.position >= moderator.roles.highest.position && context.guild.ownerId !== moderator.id) {
                const errorBlock = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${config.crossmark_emoji} You cannot set a verification role that is equal to or higher than your own.`)
                    );
                return context.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [errorBlock]
                });
            }

            // 2. Administrator Permission Check
            if (role.permissions.has(PermissionFlagsBits.Administrator)) {
                const errorBlock = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${config.crossmark_emoji} For security reasons, the verification role cannot have Administrator permissions.`)
                    );
                return context.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [errorBlock]
                });
            }

            // 3. Bot Hierarchy Check
            if (role.position >= context.guild.members.me.roles.highest.position) {
                const errorBlock = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${config.crossmark_emoji} I cannot assign this role because it is higher than my own role.`)
                    );
                return context.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [errorBlock]
                });
            }

            try {
                await Verify.findOneAndUpdate(
                    { guildId: context.guild.id },
                    { channelId: channel.id, roleId: role.id, youtubeChannel: ytName, enabled: true },
                    { upsert: true, returnDocument: 'after' }
                );

                const responseBlock = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${config.verify_emoji} **Verification system enabled!**\n> **Channel:** ${channel}\n> **Role:** ${role}\n> **YT Target:** \`${ytName}\``)
                    );

                return context.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [responseBlock]
                });
            } catch (err) {
                console.error('[VERIFY SETUP ERROR]', err);
                const errorBlock = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${config.crossmark_emoji} Failed to save configuration.`));
                return context.reply({ flags: MessageFlags.IsComponentsV2, components: [errorBlock] });
            }
        }

        if (subcommand === 'disable') {
            await Verify.findOneAndDelete({ guildId: context.guild.id });
            const responseBlock = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${config.checkmark_emoji} Verification system disabled.`)
                );
            return context.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [responseBlock]
            });
        }
    },
};
