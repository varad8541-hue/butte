const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    userId: { type: String, required: true },
    ticketId: { type: String, required: true }, // Numerical ID (e.g., 0001, 0002...)
    panelId: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketPanel' },
    
    // Status
    status: { type: String, enum: ['open', 'closed', 'locked', 'claimed'], default: 'open' },
    type: { type: String, default: 'General' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    tags: [String], // Auto-detected tags like 'billing', 'bug', etc.
    
    // Assignments
    claimedBy: { type: String, default: null }, // Staff user ID
    assignedStaff: [{ type: String }],
    
    // AI Data
    aiSummary: { type: String },
    aiResolution: { type: String },
    lastAiResponseAt: { type: Date },
    
    // Analytics
    createdAt: { type: Date, default: Date.now },
    closedAt: { type: Date },
    responseTime: { type: Number }, // Time to first claim/staff reply in ms
    resolutionTime: { type: Number }, // Total time to close in ms
    
    // Additional Data
    modalResponses: [{
        question: String,
        response: String
    }],
    transcriptPath: { type: String },
    
    // Activity Tracking
    lastMessageAt: { type: Date, default: Date.now },
    isInactive: { type: Boolean, default: false }
});

// Indexing for faster queries
TicketSchema.index({ guildId: 1, channelId: 1 });
TicketSchema.index({ guildId: 1, userId: 1, status: 1 });

module.exports = mongoose.model('TicketData', TicketSchema);
