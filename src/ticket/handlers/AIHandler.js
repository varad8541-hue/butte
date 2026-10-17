const groq = require('../ai/GroqService');
const Ticket = require('../models/Ticket');
const Panel = require('../models/Panel');
const ui = require('../utils/TicketUI');
const { MessageFlags, PermissionFlagsBits } = require('discord.js');

const aiRateLimitCache = new Map();

class AIHandler {
    /**
     * Handle incoming messages in ticket channels
     */
    async handleMessage(message) {
        if (message.author.bot) return;

        const ticket = await Ticket.findOne({ channelId: message.channel.id, status: 'open' }).populate('panelId');
        if (!ticket || !ticket.panelId?.aiEnabled) return;

        // Update Activity
        ticket.lastMessageAt = Date.now();
        await ticket.save();

        const panel = ticket.panelId;

        // Save context ALWAYS so the AI doesn't forget rapid messages
        await groq.saveContext(message.channel.id, 'user', message.content);

        // Rate Limit AI Replies (Local In-Memory)
        const aiRateLimitKey = `rate_limit:ai_reply:${message.channel.id}`;
        const now = Date.now();
        const lastAiReply = aiRateLimitCache.get(aiRateLimitKey) || 0;
        if (now < lastAiReply) return; 
        aiRateLimitCache.set(aiRateLimitKey, now + (3 * 1000)); // 3s cooldown between AI replies

        // Determine if AI should reply
        let shouldReply = false;

        // Check if the message is from a staff member
        const isStaff = message.member.permissions.has(PermissionFlagsBits.Administrator) || message.member.roles.cache.has(panel.staffRoleId);

        // AI only replies if ticket is unclaimed AND user is NOT staff AND aiMode allows automatic replies
        if (!ticket.claimedBy && !isStaff && panel.aiMode !== 'assist') {
            shouldReply = true;
        }

        if (shouldReply) {
            await message.channel.sendTyping();
            
            const context = await groq.getContext(message.channel.id, panel.aiContextLimit);
            const response = await groq.generateResponse(ticket._id, context, panel.aiMode);

            if (response) {
                await message.reply({
                    content: response,
                    // Minimalist indicator that it's an AI reply
                    // In Component V2, we could use a TextDisplay but standard reply is cleaner for chat
                });
                await groq.saveContext(message.channel.id, 'assistant', response);
                
                // Update Analytics
                ticket.lastAiResponseAt = Date.now();
                await ticket.save();
            }
        }
    }
}

module.exports = new AIHandler();
