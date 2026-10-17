const mongoose = require('mongoose');

const PanelSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    panelId: { type: String, required: true }, // Unique ID for this panel (e.g., 'support', 'billing')
    name: { type: String, required: true },
    description: { type: String },
    categoryId: { type: String, required: true }, // Where tickets will be created
    staffRoleId: { type: String, required: true },
    logsChannelId: { type: String },
    
    // UI Config (Component V2)
    useSelectMenu: { type: Boolean, default: false },
    buttonLabel: { type: String, default: 'Open Ticket' },
    buttonEmoji: { type: String },
    
    // AI Settings
    aiEnabled: { type: Boolean, default: false },
    aiMode: { type: String, enum: ['assist', 'auto', 'hybrid'], default: 'assist' },
    aiContextLimit: { type: Number, default: 15 },
    
    // Modal Configuration
    modalEnabled: { type: Boolean, default: true },
    modalQuestions: [{
        label: String,
        placeholder: String,
        style: { type: String, enum: ['short', 'paragraph'], default: 'paragraph' },
        required: { type: Boolean, default: true },
        minLength: Number,
        maxLength: Number
    }],
    
    // Automation
    autoCloseInactive: { type: Boolean, default: false },
    inactiveHours: { type: Number, default: 24 },
    autoAssignStaff: { type: Boolean, default: false },
    
    // Status
    ticketCount: { type: Number, default: 0 },
    messageId: { type: String }, // ID of the panel message
    channelId: { type: String }, // Channel where panel is posted
    createdAt: { type: Date, default: Date.now }
});

// Ensure panelId is unique per guild
PanelSchema.index({ guildId: 1, panelId: 1 }, { unique: true });

module.exports = mongoose.model('TicketPanel', PanelSchema);
