const handler = require('../handlers/TicketHandler');
const Panel = require('../models/Panel');
const Ticket = require('../models/Ticket');
const ui = require('../utils/TicketUI');
const { MessageFlags, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, UserSelectMenuBuilder } = require('discord.js');

module.exports = {
    /**
     * Entry point for all ticket-related interactions
     */
    async handle(interaction) {
        if (interaction.isButton()) return await this.handleButton(interaction);
        if (interaction.isAnySelectMenu()) return await this.handleSelect(interaction);
        if (interaction.isModalSubmit()) return await this.handleModal(interaction);
        return false;
    },

    async handleButton(interaction) {
        const [action, id] = interaction.customId.split(':');
        if (!action.startsWith('ticket_')) return false;

        switch (action) {
            case 'ticket_open_btn':
                await handler.requestTicket(interaction, id);
                break;
            case 'ticket_claim':
                await handler.claimTicket(interaction, id);
                break;
            case 'ticket_close_modal':
                await handler.closeTicket(interaction, id);
                break;
            case 'ticket_lock':
                await handler.lockTicket(interaction, id);
                break;
            case 'ticket_rename':
                // For rename, we usually want a modal, but let's keep it simple for now or implement modal
                const renameModal = new ModalBuilder()
                    .setCustomId(`ticket_rename_modal:${id}`)
                    .setTitle('Rename Ticket');
                
                const nameInput = new TextInputBuilder()
                    .setCustomId('new_name')
                    .setLabel('New Channel Name')
                    .setPlaceholder('e.g. fixed-bug')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                
                renameModal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                await interaction.showModal(renameModal);
                break;
            case 'ticket_unclaim':
                await handler.unclaimTicket(interaction, id);
                break;
            case 'ticket_add_user':
                const addSelect = new UserSelectMenuBuilder()
                    .setCustomId(`ticket_add_user_select:${id}`)
                    .setPlaceholder('Select a user to add...')
                    .setMinValues(1)
                    .setMaxValues(1);
                
                await interaction.reply({
                    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                    components: [new ActionRowBuilder().addComponents(addSelect)]
                });
                break;
            case 'ticket_remove_user':
                const removeSelect = new UserSelectMenuBuilder()
                    .setCustomId(`ticket_remove_user_select:${id}`)
                    .setPlaceholder('Select a user to remove...')
                    .setMinValues(1)
                    .setMaxValues(1);
                
                await interaction.reply({
                    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                    components: [new ActionRowBuilder().addComponents(removeSelect)]
                });
                break;
            case 'ticket_reopen':
                await handler.reopenTicket(interaction, id);
                break;
            case 'ticket_delete':
                await interaction.reply({ content: 'Deleting in 5 seconds...', flags: MessageFlags.Ephemeral });
                setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
                break;
        }
        return true;
    },

    async handleSelect(interaction) {
        const [action, id] = interaction.customId.split(':');
        
        if (action === 'ticket_open_select') {
            const type = interaction.values[0];
            await handler.requestTicket(interaction, id, type);
            return true;
        }

        if (action === 'ticket_add_user_select') {
            const targetUser = interaction.users.first();
            await handler.addUser(interaction, id, targetUser);
            return true;
        }

        if (action === 'ticket_remove_user_select') {
            const targetUser = interaction.users.first();
            await handler.removeUser(interaction, id, targetUser);
            return true;
        }

        return false;
    },

    async handleModal(interaction) {
        const [action, id, type] = interaction.customId.split(':');
        
        if (action === 'ticket_modal') {
            const panel = await Panel.findOne({ guildId: interaction.guild.id, panelId: id });
            if (!panel) return true;

            const modalData = panel.modalQuestions.map((q, i) => ({
                question: q.label,
                response: interaction.fields.getTextInputValue(`question_${i}`)
            }));

            await handler.createTicket(interaction, panel, type, modalData);
            return true;
        }

        if (action === 'ticket_rename_modal') {
            const newName = interaction.fields.getTextInputValue('new_name');
            await handler.renameTicket(interaction, id, newName);
            return true;
        }

        return false;
    }
};
