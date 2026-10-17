const { 
    PermissionFlagsBits, 
    ChannelType, 
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    TextDisplayBuilder,
    ContainerBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    AttachmentBuilder
} = require('discord.js');
const Panel = require('../models/Panel');
const Ticket = require('../models/Ticket');
const ui = require('../utils/TicketUI');
const groq = require('../ai/GroqService');
const transcript = require('../services/TranscriptService');
const config = require('../../config/config.json');

const rateLimitCache = new Map();

class TicketHandler {
    /**
     * Handle Ticket Creation Request (Button/Select)
     */
    async requestTicket(interaction, panelId, type = 'General') {
        const panel = await Panel.findOne({ guildId: interaction.guild.id, panelId });
        if (!panel) return;

        // Rate Limit Check (Local In-Memory)
        const rateLimitKey = `rate_limit:ticket_create:${interaction.user.id}:${interaction.guild.id}`;
        const now = Date.now();
        const userRateLimit = rateLimitCache.get(rateLimitKey) || 0;
        if (now < userRateLimit) {
            return interaction.reply({
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse('Please wait a few minutes before opening another ticket.', 'warn')]
            });
        }
        rateLimitCache.set(rateLimitKey, now + (15 * 1000)); // 15 seconds cooldown

        if (panel.modalEnabled) {
            const modal = new ModalBuilder()
                .setCustomId(`ticket_modal:${panelId}:${type}`)
                .setTitle(`${panel.name} Form`);

            const questions = panel.modalQuestions.length > 0 ? panel.modalQuestions : [{
                label: 'What do you need help with?',
                placeholder: 'Describe your issue in detail...',
                style: 'paragraph',
                required: true
            }];

            questions.slice(0, 5).forEach((q, i) => {
                const input = new TextInputBuilder()
                    .setCustomId(`question_${i}`)
                    .setLabel(q.label)
                    .setPlaceholder(q.placeholder || '')
                    .setStyle(q.style === 'short' ? TextInputStyle.Short : TextInputStyle.Paragraph)
                    .setRequired(q.required);
                
                modal.addComponents(new ActionRowBuilder().addComponents(input));
            });

            await interaction.showModal(modal);
        } else {
            await this.createTicket(interaction, panel, type);
        }
    }

    /**
     * Finalize Ticket Creation
     */
    async createTicket(interaction, panel, type, modalData = []) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }

        // Generate ID using MongoDB Atomic Increment
        const updatedPanel = await Panel.findOneAndUpdate(
            { _id: panel._id },
            { $inc: { ticketCount: 1 } },
            { returnDocument: 'after' }
        );
        const ticketIdStr = updatedPanel.ticketCount.toString().padStart(4, '0');

        const category = interaction.guild.channels.cache.get(panel.categoryId);
        if (!category) return interaction.editReply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [ui.createSimpleResponse('Ticket category not found.', 'error')] 
        });

        // Create Channel
        const channel = await interaction.guild.channels.create({
            name: `ticket-${ticketIdStr}`,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                { id: panel.staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }
            ]
        });

        // Save to DB
        const ticket = await Ticket.create({
            guildId: interaction.guild.id,
            channelId: channel.id,
            userId: interaction.user.id,
            ticketId: ticketIdStr,
            panelId: panel._id,
            type,
            modalResponses: modalData
        });

        // Send Control Hub Message (Editable)
        const controls = ui.createControlsUI(ticket, panel);
        
        // Add Professional Welcome Text
        controls.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`👋 **Welcome, <@${interaction.user.id}>!**`),
            new TextDisplayBuilder().setContent(`> Thank you for opening a ticket. A staff member (<@&${panel.staffRoleId}>) will be with you shortly.\n> Please review your provided details below.`)
        );
        
        // Add Modal Responses cleanly
        if (modalData && modalData.length > 0) {
            controls.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large));
            
            modalData.forEach(data => {
                controls.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**${data.question}**\n\`\`\`\n${data.response}\n\`\`\``)
                );
            });
        }

        await channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [controls]
        });

        // AI Initial Analysis (Async)
        if (panel.aiEnabled && modalData.length > 0) {
            this.runInitialAIAnalysis(ticket, channel, modalData[0].response);
        }

        await interaction.editReply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [ui.createSimpleResponse(`Ticket created: ${channel}`, 'success')] 
        });
    }

    /**
     * AI Analysis & Auto-Tagging
     */
    async runInitialAIAnalysis(ticket, channel, issue) {
        const analysis = await groq.analyzeTicket(issue);
        if (analysis) {
            ticket.tags = analysis.tags;
            ticket.priority = analysis.priority;
            await ticket.save();

            // Notify staff if high priority
            if (analysis.priority === 'high') {
                await channel.send({
                    flags: MessageFlags.IsComponentsV2,
                    components: [ui.createSimpleResponse(`**Attention:** AI has flagged this as **HIGH PRIORITY**.`, 'warn')]
                });
            }
        }
    }

    /**
     * Handle Claiming
     */
    async claimTicket(interaction, ticketId) {
        const ticket = await Ticket.findById(ticketId).populate('panelId');
        if (!ticket) return;

        // Permission Check
        const isStaff = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || (ticket.panelId && ticket.panelId.staffRoleId ? interaction.member.roles.cache.has(ticket.panelId.staffRoleId) : false);
        if (!isStaff) {
            return interaction.reply({ 
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse('You must be staff to claim tickets.', 'error')] 
            });
        }

        if (ticket.claimedBy) {
            return interaction.reply({ 
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse(`This ticket is already claimed by <@${ticket.claimedBy}>.`, 'warn')] 
            });
        }

        ticket.claimedBy = interaction.user.id;
        if (!ticket.responseTime) ticket.responseTime = Date.now() - ticket.createdAt;
        await ticket.save();
        
        await interaction.reply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [ui.createSimpleResponse(`Ticket claimed by ${interaction.user}.`, 'success')] 
        });

        // Update control message
        const panel = ticket.panelId;
        const controls = ui.createControlsUI(ticket, panel);
        await interaction.message.edit({ 
            components: [controls] 
        });
    }

    async unclaimTicket(interaction, ticketId) {
        const ticket = await Ticket.findById(ticketId).populate('panelId');
        if (!ticket) return;

        // Permission Check
        const isStaff = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || (ticket.panelId && ticket.panelId.staffRoleId ? interaction.member.roles.cache.has(ticket.panelId.staffRoleId) : false);
        if (!isStaff) {
            return interaction.reply({ 
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse('You must be staff to unclaim tickets.', 'error')] 
            });
        }

        if (!ticket.claimedBy) {
            return interaction.reply({ 
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse('This ticket is not currently claimed.', 'warn')] 
            });
        }

        ticket.claimedBy = null;
        await ticket.save();

        await interaction.reply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [ui.createSimpleResponse('Ticket has been unclaimed.', 'info')] 
        });

        // Update control message
        const panel = ticket.panelId;
        const controls = ui.createControlsUI(ticket, panel);
        await interaction.message.edit({ 
            components: [controls] 
        });
    }

    /**
     * Handle Closing
     */
    async renameTicket(interaction, dbTicketId, newName) {
        const ticket = await Ticket.findById(dbTicketId).populate('panelId');
        if (!ticket) return;

        // Permission Check
        const isStaff = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || (ticket.panelId && ticket.panelId.staffRoleId ? interaction.member.roles.cache.has(ticket.panelId.staffRoleId) : false);
        if (!isStaff) {
            return interaction.reply({ 
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse('You do not have permission to rename this ticket.', 'error')] 
            });
        }

        try {
            await interaction.channel.setName(`ticket-${newName}`);
            await interaction.reply({ 
                flags: MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse(`Ticket renamed to **ticket-${newName}**.`, 'success')] 
            });
        } catch (err) {
            console.error('[TICKET RENAME ERROR]', err);
            await interaction.reply({ 
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse('Failed to rename ticket. Check my permissions.', 'error')] 
            });
        }
    }

    async addUser(interaction, dbTicketId, targetUser) {
        const ticket = await Ticket.findById(dbTicketId).populate('panelId');
        if (!ticket) return;

        // Permission Check
        const isStaff = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || (ticket.panelId && ticket.panelId.staffRoleId ? interaction.member.roles.cache.has(ticket.panelId.staffRoleId) : false);
        if (!isStaff) {
            return interaction.reply({ 
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse('You do not have permission to add users to this ticket.', 'error')] 
            });
        }

        if (!targetUser) {
            return interaction.reply({
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse('No user selected.', 'error')]
            });
        }

        try {
            await interaction.channel.permissionOverwrites.edit(targetUser.id, {
                ViewChannel: true,
                SendMessages: true,
                AttachFiles: true
            });

            await interaction.reply({ 
                flags: MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse(`**${targetUser.username}** has been added to the ticket.`, 'success')] 
            });
        } catch (err) {
            console.error('[TICKET ADD USER ERROR]', err);
            await interaction.reply({ 
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse('Failed to add user. Check my permissions.', 'error')] 
            });
        }
    }

    async removeUser(interaction, dbTicketId, targetUser) {
        const ticket = await Ticket.findById(dbTicketId).populate('panelId');
        if (!ticket) return;

        // Permission Check
        const isStaff = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || (ticket.panelId && ticket.panelId.staffRoleId ? interaction.member.roles.cache.has(ticket.panelId.staffRoleId) : false);
        if (!isStaff) {
            return interaction.reply({ 
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse('You do not have permission to remove users from this ticket.', 'error')] 
            });
        }

        if (!targetUser) {
            return interaction.reply({
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse('No user selected.', 'error')]
            });
        }

        if (targetUser.id === ticket.userId) {
            return interaction.reply({ 
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse('You cannot remove the ticket creator.', 'warn')] 
            });
        }

        try {
            await interaction.channel.permissionOverwrites.delete(targetUser.id);

            await interaction.reply({ 
                flags: MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse(`**${targetUser.username}** has been removed from the ticket.`, 'success')] 
            });
        } catch (err) {
            console.error('[TICKET REMOVE USER ERROR]', err);
            await interaction.reply({ 
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse('Failed to remove user. Check my permissions.', 'error')] 
            });
        }
    }

    async lockTicket(interaction, dbTicketId) {
        const ticket = await Ticket.findById(dbTicketId).populate('panelId');
        if (!ticket) return;

        // Permission Check
        const isStaff = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || (ticket.panelId && ticket.panelId.staffRoleId ? interaction.member.roles.cache.has(ticket.panelId.staffRoleId) : false);
        if (!isStaff) {
            return interaction.reply({ 
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse('You do not have permission to lock this ticket.', 'error')] 
            });
        }

        const isLocked = ticket.status === 'locked';
        const newStatus = isLocked ? 'open' : 'locked';

        try {
            await interaction.channel.permissionOverwrites.edit(ticket.userId, {
                SendMessages: isLocked
            });

            ticket.status = newStatus;
            await ticket.save();

            await interaction.reply({ 
                flags: MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse(`Ticket has been **${isLocked ? 'unlocked' : 'locked'}**.`, 'info')] 
            });

            // Update control message
            const controls = ui.createControlsUI(ticket, ticket.panelId);
            await interaction.message.edit({ 
                components: [controls] 
            });
        } catch (err) {
            console.error('[TICKET LOCK ERROR]', err);
        }
    }

    async closeTicket(interaction, dbTicketId, reason = 'No reason provided') {
        const ticket = await Ticket.findById(dbTicketId).populate('panelId');
        if (!ticket) return;

        // Permission Check (fallback to Administrator if panel was deleted)
        const isStaff = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || (ticket.panelId && ticket.panelId.staffRoleId ? interaction.member.roles.cache.has(ticket.panelId.staffRoleId) : false);

        if (!isStaff) {
            return interaction.reply({ 
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse('You do not have permission to close this ticket.', 'error')] 
            });
        }

        ticket.status = 'closed';
        ticket.closedAt = Date.now();
        ticket.resolutionTime = ticket.closedAt - ticket.createdAt;
        
        // Generate AI Summary
        const context = await groq.getContext(ticket.channelId);
        if (context.length > 0) {
            ticket.aiSummary = await groq.generateSummary(context);
        }

        // Generate Transcript and save filename reference to DB
        const { filename, filepath } = await transcript.generate(interaction.channel, ticket);
        ticket.transcriptPath = filename;
        await ticket.save();

        await interaction.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [ui.createSimpleResponse('Ticket closed. Transcript has been generated and saved.', 'info')]
        });

        // Transcript Live Preview URL
        const dashboardUrl = process.env.APP_URL || config.dashboard_url || 'http://localhost:3000';
        const transcriptUrl = `${dashboardUrl}/transcripts/${filename}`;
        
        const { ButtonBuilder, ButtonStyle } = require('discord.js');
        const transcriptRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('View Live Transcript')
                .setEmoji('🌐')
                .setStyle(ButtonStyle.Link)
                .setURL(transcriptUrl)
        );

        // Log to Log Channel
        if (ticket.panelId?.logsChannelId) {
            const logsChannel = interaction.guild.channels.cache.get(ticket.panelId.logsChannelId);
            if (logsChannel) {
                await logsChannel.send({
                    flags: MessageFlags.IsComponentsV2,
                    components: [
                        ui.createSimpleResponse(`**Transcript: Ticket #${ticket.ticketId}**\nUser: <@${ticket.userId}>\nReason: ${reason}\nSummary: ${ticket.aiSummary || 'N/A'}`),
                        transcriptRow
                    ]
                });
            }
        }

        // Send to User
        const user = await interaction.client.users.fetch(ticket.userId).catch(() => null);
        if (user) {
            await user.send({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    ui.createSimpleResponse(`Your ticket **#${ticket.ticketId}** in **${interaction.guild.name}** has been closed.`),
                    transcriptRow
                ]
            }).catch(() => {});
        }

        // Lockout user permissions and update the UI
        try {
            await interaction.channel.permissionOverwrites.edit(ticket.userId, {
                ViewChannel: false,
                SendMessages: false
            });
            const controls = ui.createControlsUI(ticket, ticket.panelId);
            await interaction.message.edit({ components: [controls] }).catch(() => {});
        } catch (err) {
            console.error('[TICKET CLOSE PERMISSIONS ERROR]', err);
        }
    }

    async reopenTicket(interaction, dbTicketId) {
        const ticket = await Ticket.findById(dbTicketId).populate('panelId');
        if (!ticket) return;

        const isStaff = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || (ticket.panelId && ticket.panelId.staffRoleId ? interaction.member.roles.cache.has(ticket.panelId.staffRoleId) : false);

        if (!isStaff) {
            return interaction.reply({ 
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse('You do not have permission to reopen this ticket.', 'error')] 
            });
        }

        ticket.status = 'open';
        await ticket.save();

        try {
            await interaction.channel.permissionOverwrites.edit(ticket.userId, {
                ViewChannel: true,
                SendMessages: true
            });

            await interaction.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [ui.createSimpleResponse(`Ticket reopened! User <@${ticket.userId}> has regained access.`, 'success')]
            });

            const controls = ui.createControlsUI(ticket, ticket.panelId);
            await interaction.message.edit({ components: [controls] }).catch(() => {});
        } catch (err) {
            console.error('[TICKET REOPEN ERROR]', err);
        }
    }
}

module.exports = new TicketHandler();
