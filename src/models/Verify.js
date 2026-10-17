const mongoose = require('mongoose');

const VerifySchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
    roleId: { type: String, required: true },
    youtubeChannel: { type: String, required: true },
    enabled: { type: Boolean, default: true }
});

module.exports = mongoose.model('Verify', VerifySchema);
