const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
} = require('discord.js');
const Panel = require('../../ticket/models/Panel');
const config = require('../../config/config.json');
const ui = require('../../ticket/utils/TicketUI');

module.exports = {
    name: 't-deletepanel',
    description: 'Deletes a ticket panel and removes its message.',
    permissions: [PermissionFlagsBits.Administrator],
    slashData: new SlashCommandBuilder()
        .setName('t-deletepanel')
        .setDescription('Deletes a ticket panel and removes its message.')
        .addStringOption(opt => opt.setName('id').setDescription('The exact ID of the panel to delete').setRequired(true)),

    /**
     * @param {import('discord.js').Client} client
     * @param {import('discord.js').CommandInteraction|import('discord.js').Message} context
     */
    run: async (client, context) => {
        const isSlash = context.isChatInputCommand?.() || false;
        if (!isSlash) return context.reply('Please use the slash command for deleting panels.');

        const id = context.options.getString('id').toLowerCase();

        try {
            const panel = await Panel.findOne({ guildId: context.guild.id, panelId: id });
            if (!panel) {
                return context.reply({
                    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                    components: [ui.createSimpleResponse(`No panel found with ID: \`${id}\``, 'warn')]
                });
            }

            let messageDeleted = false;

            // Attempt to delete the message in the channel
            if (panel.channelId && panel.messageId) {
                const channel = context.guild.channels.cache.get(panel.channelId);
                if (channel) {
                    try {
                        const msg = await channel.messages.fetch(panel.messageId);
                        if (msg) {
                            await msg.delete();
                            messageDeleted = true;
                        }
                    } catch (e) {
                        // Message might already be deleted or inaccessible
                        console.log('[DELETE PANEL] Message could not be found or deleted.');
                    }
                }
            }

            // Remove from Database
            await Panel.deleteOne({ _id: panel._id });

            let responseMsg = `Panel **${panel.name}** (\`${id}\`) has been permanently deleted from the database.`;
            if (messageDeleted) responseMsg += `\nThe panel message in <#${panel.channelId}> was also removed.`;

            return context.reply({
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse(responseMsg, 'success')]
            });

        } catch (err) {
            console.error('[DELETE PANEL ERROR]', err);
            return context.reply({
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse('An error occurred while deleting the panel.', 'error')]
            });
        }
    },
};
