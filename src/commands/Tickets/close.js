const {
    SlashCommandBuilder,
    MessageFlags,
    TextDisplayBuilder,
    ContainerBuilder,
} = require('discord.js');
const Ticket = require('../../ticket/models/Ticket');
const handler = require('../../ticket/handlers/TicketHandler');
const config = require('../../config/config.json');

module.exports = {
    name: 'close',
    description: 'Manually close the current ticket.',
    slashData: new SlashCommandBuilder()
        .setName('close')
        .setDescription('Manually close the current ticket and generate a secure transcript.')
        .addStringOption(opt => opt.setName('reason').setDescription('The reason for closing this ticket.').setRequired(false)),

    /**
     * @param {import('discord.js').Client} client
     * @param {import('discord.js').CommandInteraction|import('discord.js').Message} context
     */
    run: async (client, context) => {
        const isSlash = context.isChatInputCommand?.() || false;
        let reason = 'No reason provided';

        if (isSlash) {
            reason = context.options.getString('reason') || reason;
        } else {
            const args = context.args || [];
            if (args.length > 0) reason = args.join(' ');
        }

        const currentChannelId = context.channelId || context.channel?.id;
        const ticket = await Ticket.findOne({ channelId: currentChannelId });
        
        if (!ticket) {
            const errorBlock = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${config.crossmark_emoji} **This command can only be used inside an active ticket channel.**`)
            );
            return context.reply({ flags: MessageFlags.IsComponentsV2, components: [errorBlock] });
        }

        if (ticket.status === 'closed') {
            const errorBlock = new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${config.crossmark_emoji} **This ticket is already closed.**`)
            );
            return context.reply({ flags: MessageFlags.IsComponentsV2, components: [errorBlock] });
        }
        
        // Defer reply if dealing with slow transcript generations computationally
        if (isSlash) {
            await context.deferReply({ flags: MessageFlags.IsComponentsV2 });
            const originalReply = context.reply.bind(context);
            context.reply = async (payload) => {
                return await context.editReply(payload);
            };
            
            // Mock message.edit for control panel updates
            context.message = { edit: async () => {} };
            
            await handler.closeTicket(context, ticket._id, reason);
            context.reply = originalReply;
            
            // Schedule the channel deletion
            setTimeout(() => context.channel.delete().catch(() => {}), 5000);
        } else {
            const statusMsg = await context.reply(`${config.checkmark_emoji} Processing ticket closure and generating transcript...`);
            
            const mockedInteraction = {
                client: client,
                guild: context.guild,
                channel: context.channel,
                member: context.member,
                message: { edit: async () => {} }, // Mock message.edit
                reply: async (payload) => {
                    if (payload.components) {
                        return await statusMsg.edit({ content: null, flags: MessageFlags.IsComponentsV2, components: payload.components });
                    }
                    return await statusMsg.edit(payload);
                }
            };

            await handler.closeTicket(mockedInteraction, ticket._id, reason);
            setTimeout(() => context.channel.delete().catch(() => {}), 5000);
        }
    },
};
