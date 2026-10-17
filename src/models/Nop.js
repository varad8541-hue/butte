const mongoose = require('mongoose');

const nopSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    expiresAt: { type: Date, default: null } // null means permanent
});

module.exports = mongoose.model('Nop', nopSchema);
