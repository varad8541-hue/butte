const mongoose = require('mongoose');

const TicketConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true }, // Channel where the dashboard is sent
    messageId: { type: String, required: true }, // The dashboard message ID
    categoryId: { type: String, required: true }, // Category where ticket channels are created
    staffRoleId: { type: String, required: true }, // Role allowed to view/manage tickets
    logsChannelId: { type: String, default: null }, // Channel for ticket logs
    ticketCount: { type: Number, default: 0 }, // Global count to generate ID 0001, 0002...
    enabled: { type: Boolean, default: true }
});

module.exports = mongoose.model('TicketConfig', TicketConfigSchema);
