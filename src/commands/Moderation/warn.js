const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    TextDisplayBuilder,
    ContainerBuilder,
} = require('discord.js');
const Warning = require('../../models/Warning');
const config = require('../../config/config.json');

module.exports = {
    name: 'warn',
    description: 'Warn a user in the server.',
    permissions: [PermissionFlagsBits.ManageMessages],
    slashData: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user in the server.')
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add a warning to a user.')
                .addUserOption(opt => opt.setName('user').setDescription('The user to warn.').setRequired(true))
                .addStringOption(opt => opt.setName('reason').setDescription('Reason for the warning.'))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List warnings for a user.')
                .addUserOption(opt => opt.setName('user').setDescription('The user to list warnings for.').setRequired(true))
        ),

    /**
     * @param {import('discord.js').Client} client
     * @param {import('discord.js').CommandInteraction|import('discord.js').Message} context
     */
    run: async (client, context) => {
        const isSlash = context.isChatInputCommand?.() || false;
        let subcommand, targetUser, reason;

        if (isSlash) {
            subcommand = context.options.getSubcommand();
            targetUser = context.options.getUser('user');
            reason = context.options.getString('reason') || 'No reason provided.';
        } else {
            const args = context.args || [];
            subcommand = args[0]?.toLowerCase();
            const mention = args[1];
            reason = args.slice(2).join(' ') || 'No reason provided.';

            if (!subcommand || !['add', 'list'].includes(subcommand)) {
                const errorBlock = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${config.crossmark_emoji} Usage: \`${config.prefix}warn add <user> [reason]\` or \`${config.prefix}warn list <user>\``)
                    );
                return context.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [errorBlock]
                });
            }

            const userId = mention?.replace(/[<@!>]/g, '');
            try {
                targetUser = await client.users.fetch(userId);
            } catch {
                const errorBlock = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${config.crossmark_emoji} Invalid user provided.`)
                    );
                return context.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [errorBlock]
                });
            }
        }

        if (subcommand === 'add') {
            const warning = new Warning({
                guildId: context.guild.id,
                userId: targetUser.id,
                reason: reason,
                moderatorId: (isSlash ? context.user.id : context.author.id)
            });

            await warning.save();

            const responseBlock = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${config.warn_emoji} **${targetUser.tag}** has been warned.\n> **Reason:** ${reason}`)
                );

            return context.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [responseBlock]
            });
        }

        if (subcommand === 'list') {
            const warnings = await Warning.find({ guildId: context.guild.id, userId: targetUser.id });

            if (warnings.length === 0) {
                const responseBlock = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${config.info_emoji} **${targetUser.tag}** has no warnings.`)
                    );
                return context.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [responseBlock]
                });
            }

            const warningList = warnings.map((w, i) => `**${i + 1}.** ${w.reason} (by <@${w.moderatorId}>)`).join('\n');
            const responseBlock = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${config.info_emoji} **Warnings for ${targetUser.tag}:**\n${warningList}`)
                );

            return context.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [responseBlock]
            });
        }
    },
};
