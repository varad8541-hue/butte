const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ThumbnailBuilder
} = require('discord.js');
const Panel = require('../../ticket/models/Panel');
const config = require('../../config/config.json');
const ui = require('../../ticket/utils/TicketUI');

module.exports = {
    name: 't-listpanels',
    description: 'Lists all active ticket panels configured on the server.',
    permissions: [PermissionFlagsBits.Administrator],
    slashData: new SlashCommandBuilder()
        .setName('t-listpanels')
        .setDescription('Lists all active ticket panels configured on the server.'),

    /**
     * @param {import('discord.js').Client} client
     * @param {import('discord.js').CommandInteraction|import('discord.js').Message} context
     */
    run: async (client, context) => {
        const isSlash = context.isChatInputCommand?.() || false;

        const loadingContainer = new ContainerBuilder()
            .setAccentColor(parseInt(config.color.replace('#', ''), 16))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${config.loading_emoji || '⏳'} **Fetching panels...**`));

        const response = isSlash
            ? await context.reply({ flags: MessageFlags.IsComponentsV2, components: [loadingContainer], withResponse: true }).then(r => r.resource?.message || r)
            : await context.reply({ flags: MessageFlags.IsComponentsV2, components: [loadingContainer] });

        try {
            const panels = await Panel.find({ guildId: context.guild.id });

            if (panels.length === 0) {
                const emptyContainer = ui.createSimpleResponse('No ticket panels found on this server.', 'warn');
                return isSlash ? context.editReply({ components: [emptyContainer] }) : response.edit({ components: [emptyContainer] });
            }

            const headerDivider = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large);
            
            const container = new ContainerBuilder()
                .setAccentColor(parseInt(config.color.replace('#', ''), 16))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`📋 **YOUR TICKET PANELS [${panels.length}]**`)
                )
                .addSeparatorComponents(headerDivider);

            const serverIcon = context.guild.iconURL({ extension: 'png' }) || client.user.displayAvatarURL({ extension: 'png' });
            
            for (const panel of panels) {
                const thumbnail = new ThumbnailBuilder({ media: { url: serverIcon } });
                const section = new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**${panel.name.toUpperCase()}** (\`ID: ${panel.panelId}\`)`),
                        new TextDisplayBuilder().setContent(`> **Channel:** <#${panel.channelId}> | **Category:** <#${panel.categoryId}>\n> **Staff Role:** <@&${panel.staffRoleId}> | **Total Tickets:** \`${panel.ticketCount}\``),
                        new TextDisplayBuilder().setContent(`> *Messages & UI configuration managed.*`)
                    )
                    .setThumbnailAccessory(thumbnail);
                
                container.addSectionComponents(section);
                container.addSeparatorComponents(new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small));
            }

            if (isSlash) {
                await context.editReply({ components: [container] });
            } else {
                await response.edit({ components: [container] });
            }

        } catch (err) {
            console.error('[LIST PANEL ERROR]', err);
            const errorContainer = ui.createSimpleResponse('An error occurred while fetching panels.', 'error');
            return isSlash ? context.editReply({ components: [errorContainer] }) : response.edit({ components: [errorContainer] });
        }
    },
};
