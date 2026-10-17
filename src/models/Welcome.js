const mongoose = require('mongoose');

const WelcomeSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
    enabled: { type: Boolean, default: true }
});

module.exports = mongoose.model('Welcome', WelcomeSchema);
