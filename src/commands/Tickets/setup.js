const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    ChannelType,
    TextDisplayBuilder
} = require('discord.js');
const Panel = require('../../ticket/models/Panel');
const ui = require('../../ticket/utils/TicketUI');
const config = require('../../config/config.json');

module.exports = {
    name: 't-setup',
    description: 'Setup a production-grade AI ticket panel.',
    permissions: [PermissionFlagsBits.Administrator],
    slashData: new SlashCommandBuilder()
        .setName('t-setup')
        .setDescription('Setup a production-grade AI ticket panel.')
        .addStringOption(opt => opt.setName('id').setDescription('Unique ID for this panel (e.g. support)').setRequired(true))
        .addStringOption(opt => opt.setName('name').setDescription('Name of the panel').setRequired(true))
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel to post the panel').addChannelTypes(ChannelType.GuildText).setRequired(true))
        .addChannelOption(opt => opt.setName('category').setDescription('Category for tickets').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
        .addRoleOption(opt => opt.setName('staff').setDescription('Staff role for this panel').setRequired(true))
        .addBooleanOption(opt => opt.setName('ai').setDescription('Enable AI assistant?'))
        .addStringOption(opt => opt.setName('description').setDescription('Panel description')),

    /**
     * @param {import('discord.js').Client} client
     * @param {import('discord.js').CommandInteraction|import('discord.js').Message} context
     */
    run: async (client, context) => {
        const isSlash = context.isChatInputCommand?.() || false;
        if (!isSlash) return context.reply('Please use the slash command for setup.');

        const id = context.options.getString('id').toLowerCase();
        const name = context.options.getString('name');
        const channel = context.options.getChannel('channel');
        const category = context.options.getChannel('category');
        const staff = context.options.getRole('staff');
        const ai = context.options.getBoolean('ai') || false;
        const desc = context.options.getString('description') || 'Open a ticket to get assistance from our staff.';

        try {
            const panel = await Panel.findOneAndUpdate(
                { guildId: context.guild.id, panelId: id },
                {
                    name,
                    description: desc,
                    categoryId: category.id,
                    staffRoleId: staff.id,
                    aiEnabled: ai,
                    aiMode: ai ? 'hybrid' : 'assist',
                    channelId: channel.id,
                    // Default questions for SaaS feel
                    modalQuestions: [
                        { label: 'Issue Summary', placeholder: 'Briefly describe your issue', style: 'short' },
                        { label: 'Detailed Description', placeholder: 'Provide more details...', style: 'paragraph' }
                    ]
                },
                { upsert: true, returnDocument: 'after' }
            );

            const panelUI = ui.createPanelUI(panel);
            // In Components V2, you cannot use 'content' alongside MessageFlags.IsComponentsV2.
            // We must move the content into a TextDisplayBuilder within the container.
            panelUI.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`📩 **${name} System Online**`)
            );

            const msg = await channel.send({
                flags: MessageFlags.IsComponentsV2,
                components: [panelUI]
            });

            panel.messageId = msg.id;
            await panel.save();

            return context.reply({
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse(`Panel **${name}** has been successfully deployed to ${channel}.`, 'success')]
            });

        } catch (err) {
            console.error('[SETUP ERROR]', err);
            return context.reply({
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse('Failed to setup the panel. Ensure the ID is unique.', 'error')]
            });
        }
    },
};
