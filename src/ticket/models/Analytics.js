const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    date: { type: Date, required: true }, // For daily tracking
    
    // Counter data
    totalTickets: { type: Number, default: 0 },
    closedTickets: { type: Number, default: 0 },
    claimedTickets: { type: Number, default: 0 },
    
    // AI data
    totalAiReplies: { type: Number, default: 0 },
    totalAiAutoResolved: { type: Number, default: 0 },
    
    // Timing data (to calculate averages)
    totalResponseTime: { type: Number, default: 0 },
    totalResolutionTime: { type: Number, default: 0 },
    
    // Issue tracking
    commonIssues: [{
        tag: String,
        count: { type: Number, default: 0 }
    }],
    
    // Staff analytics
    staffPerformance: [{
        userId: String,
        claims: { type: Number, default: 0 },
        resolutions: { type: Number, default: 0 },
        avgResponseTime: { type: Number, default: 0 }
    }]
});

// Ensure only one entry per guild per day
AnalyticsSchema.index({ guildId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('TicketAnalytics', AnalyticsSchema);
