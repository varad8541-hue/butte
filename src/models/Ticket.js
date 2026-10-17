const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true }, // The channel where the ticket was opened
    userId: { type: String, required: true }, // The user who opened the ticket
    ticketId: { type: String, required: true }, // Numerical ID like 0001
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    type: { type: String, default: 'General' }, // Category like Support, Billing, etc.
    claimedBy: { type: String, default: null }, // Staff user ID
    panelId: { type: String }, // Links to the generating Panel's panelId
    transcriptPath: { type: String }, // The local filesystem filename of the saved HTML transcript
    aiSummary: { type: String }, // The groq summary of the ticket content before close
    closedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ticket', TicketSchema);
