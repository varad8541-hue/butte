const {
    ContainerBuilder,
    TextDisplayBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');
const config = require('../../config/config.json');

class TicketUI {
    /**
     * Dashboard UI (No Embeds)
     */
    static createPanelUI(panel) {
        const topDivider = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large);
        const bottomSpacer = new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small);

        const container = new ContainerBuilder()
            .setAccentColor(parseInt(config.color.replace('#', ''), 16))
            .addSeparatorComponents(topDivider)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`📩 **${panel.name.toUpperCase()}**`),
                new TextDisplayBuilder().setContent(`> ${panel.description || 'Open a ticket to get assistance from our staff.'}`)
            )
            .addSeparatorComponents(bottomSpacer);

        const row = new ActionRowBuilder();
        if (panel.useSelectMenu) {
            // Placeholder logic for multiple types
            const select = new StringSelectMenuBuilder()
                .setCustomId(`ticket_open_select:${panel.panelId}`)
                .setPlaceholder('Select a category...')
                .addOptions([
                    { label: 'General Support', value: 'general', emoji: '🛡️' },
                    { label: 'Technical Issue', value: 'tech', emoji: '⚙️' }
                ]);
            row.addComponents(select);
        } else {
            const button = new ButtonBuilder()
                .setCustomId(`ticket_open_btn:${panel.panelId}`)
                .setLabel(panel.buttonLabel || 'Open Ticket')
                .setStyle(ButtonStyle.Primary);
            if (panel.buttonEmoji) button.setEmoji(panel.buttonEmoji);
            row.addComponents(button);
        }

        container.addActionRowComponents(row);
        return container;
    }

    /**
     * Ticket Control UI (Inside Ticket)
     */
    static createControlsUI(ticket, configData) {
        const topDivider = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large);
        const middleDivider = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

        const container = new ContainerBuilder()
            .setAccentColor(parseInt(config.color.replace('#', ''), 16))
            .addSeparatorComponents(topDivider)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`⭐ **TICKET HUB // CONTROL PANEL**`),
                new TextDisplayBuilder().setContent(`> **User:** <@${ticket.userId}>\n> **ID:** \`#${ticket.ticketId}\``)
            )
            .addSeparatorComponents(middleDivider);

        if (ticket.status === 'closed') {
            const closedRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`ticket_reopen:${ticket._id}`)
                    .setLabel('Reopen Ticket')
                    .setEmoji('🔓')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`ticket_delete:${ticket._id}`)
                    .setLabel('Delete Ticket')
                    .setEmoji('🗑️')
                    .setStyle(ButtonStyle.Danger)
            );
            container.addActionRowComponents(closedRow);
            return container;
        }

        if (ticket.claimedBy) {
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`✋ **Claimed by:** <@${ticket.claimedBy}>`)
            );
        }

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(ticket.claimedBy ? `ticket_unclaim:${ticket._id}` : `ticket_claim:${ticket._id}`)
                .setLabel(ticket.claimedBy ? 'Unclaim' : 'Claim')
                .setEmoji(ticket.claimedBy ? '🙌' : '✋')
                .setStyle(ticket.claimedBy ? ButtonStyle.Secondary : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`ticket_close_modal:${ticket._id}`)
                .setLabel('Close')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`ticket_lock:${ticket._id}`)
                .setLabel(ticket.status === 'locked' ? 'Unlock' : 'Lock')
                .setEmoji(ticket.status === 'locked' ? '🔓' : '🔏')
                .setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ticket_add_user:${ticket._id}`)
                .setLabel('Add')
                .setEmoji('👤')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`ticket_remove_user:${ticket._id}`)
                .setLabel('Remove')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`ticket_rename:${ticket._id}`)
                .setLabel('Rename')
                .setEmoji('📝')
                .setStyle(ButtonStyle.Secondary)
        );

        container.addActionRowComponents(row1, row2);
        return container;
    }

    /**
     * Generic Response (Clean Text)
     */
    static createSimpleResponse(text, type = 'info') {
        const emojis = {
            info: config.info_emoji || 'ℹ️',
            success: config.checkmark_emoji || '✅',
            error: config.crossmark_emoji || '❌',
            warn: config.warn_emoji || '⚠️'
        };

        const container = new ContainerBuilder()
            .setAccentColor(parseInt(config.color.replace('#', ''), 16))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${emojis[type]} ${text}`)
            );
        
        return container;
    }
}

module.exports = TicketUI;
