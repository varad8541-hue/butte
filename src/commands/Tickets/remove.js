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
    name: 'remove',
    description: 'Remove a user from the ticket.',
    slashData: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a user from the ticket.')
        .addUserOption(opt => opt.setName('user').setDescription('The user to remove.').setRequired(true)),

    /**
     * @param {import('discord.js').Client} client
     * @param {import('discord.js').CommandInteraction|import('discord.js').Message} context
     */
    run: async (client, context) => {
        const isSlash = context.isChatInputCommand?.() || false;
        let targetUser;

        if (isSlash) {
            targetUser = context.options.getUser('user');
        } else {
            const args = context.args || [];
            const mention = args[0];
            if (!mention) {
                const errorBlock = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${config.crossmark_emoji} **Usage:** \`${config.prefix}remove <@user>\``));
                return context.reply({ flags: MessageFlags.IsComponentsV2, components: [errorBlock] });
            }
            const userId = mention.replace(/[<@!>]/g, '');
            try { targetUser = await client.users.fetch(userId); } catch { return; }
        }

        const currentChannelId = context.channelId || context.channel?.id;
        const ticket = await Ticket.findOne({ channelId: currentChannelId });
        
        if (!ticket) {
            const errorBlock = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${config.crossmark_emoji} **This is not a valid ticket channel.**`));
            return context.reply({ flags: MessageFlags.IsComponentsV2, components: [errorBlock] });
        }
        
        // Setup mock interaction layer for handler logic
        const originalReply = context.reply.bind(context);
        let statusMsg = null;
        
        const mockedInteraction = {
            client: client,
            guild: context.guild,
            channel: context.channel,
            member: context.member,
            user: isSlash ? context.user : context.author,
            message: { edit: async () => {} }, // Mock message.edit
            deferReply: async () => {}, 
            reply: async (payload) => {
                if (isSlash) {
                    if (context.deferred) return await context.editReply(payload);
                    return await originalReply(payload);
                }
                statusMsg = await originalReply(payload);
                return statusMsg;
            },
            editReply: async (payload) => {
                if (isSlash) return await context.editReply(payload);
                if (statusMsg) return await statusMsg.edit(payload);
            }
        };

        await handler.removeUser(mockedInteraction, ticket._id, targetUser);
    },
};
