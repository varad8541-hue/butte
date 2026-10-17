const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const axios = require('axios'); // For OAuth2 requests
const Panel = require('../models/Panel');
const Ticket = require('../models/Ticket');
const Analytics = require('../models/Analytics');
const { EmbedBuilder } = require('discord.js');
const ui = require('../utils/TicketUI');
const config = require('../../config/config.json');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'zenith-saas-premium-secret';

const path = require('path');

// Middleware
app.use(cors());
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https://cdn.discordapp.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
            connectSrc: ["'self'", "https://discord.com"]
        }
    },
    crossOriginEmbedderPolicy: false
}));
app.use(morgan('dev'));
app.use(express.json());

// Serve compiled Vite React SPA instead of legacy public HTML
const reactPath = path.join(__dirname, '../../../dashboard/dist');
app.use(express.static(reactPath));

// Expose Transcript History for Live Preview capabilities
app.use('/transcripts', express.static(path.join(__dirname, '../../../transcripts')));

/**
 * Authentication Middleware
 * Verifies the JWT sent in the Authorization header
 */
const auth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Contains userId and username
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

// --- OAuth2 Routes ---

/**
 * Step 1: Login Route
 * Returns the Discord OAuth2 URL to the frontend
 */
app.get('/api/auth/login', (req, res) => {
    const url = `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENTID}&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
    res.redirect(url);
});

/**
 * Step 2: Callback Route
 * Exchanges the code for a token and redirects to dashboard with JWT
 */
app.get('/api/auth/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect('/login?error=NoCode');

    try {
        // Exchange code for token
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: process.env.CLIENTID,
            client_secret: process.env.CLIENT_SECRET,
            grant_type: 'authorization_code',
            code,
            redirect_uri: process.env.REDIRECT_URI
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const { access_token } = tokenResponse.data;

        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        // Filter guilds where user is Admin (0x8) or Manage Server (0x20) AND the bot is actually in the server!
        const allowedGuilds = guildsResponse.data.filter(g => {
            if (botClient && !botClient.guilds.cache.has(g.id)) return false; // Hide servers Zenith hasn't joined!
            
            const perms = BigInt(g.permissions);
            return g.owner || (perms & 0x8n) === 0x8n || (perms & 0x20n) === 0x20n;
        }).map(g => ({
            id: g.id,
            name: g.name,
            icon: g.icon
        }));

        const user = userResponse.data;

        // Generate JWT
        const token = jwt.sign({
            userId: user.id,
            username: user.username,
            avatar: user.avatar,
            allowedGuilds
        }, JWT_SECRET, { expiresIn: '7d' });

        res.redirect(`/login?token=${token}`);
    } catch (err) {
        console.error('[AUTH ERROR]', err.response?.data || err.message);
        res.redirect('/login?error=AuthFailed');
    }
});

// --- Admin Permission Check ---
const requireGuildAdmin = (getGuildId) => {
    return (req, res, next) => {
        const guildId = getGuildId(req);
        if (!req.user.allowedGuilds || !req.user.allowedGuilds.some(g => g.id === guildId)) {
            return res.status(403).json({ error: 'Forbidden: You lack Administrator permissions for this server.' });
        }
        next();
    };
};

// --- Live Discord Data Fetching ---
app.get('/api/guilds/:guildId/data', auth, requireGuildAdmin(req => req.params.guildId), async (req, res) => {
    try {
        if (!botClient) return res.status(503).json({ error: 'Bot Client Unavailable' });
        
        const guild = botClient.guilds.cache.get(req.params.guildId);
        if (!guild) return res.status(404).json({ error: 'Zenith Bot is not in this server.' });

        const roles = guild.roles.cache.map(r => ({ id: r.id, name: r.name, color: r.hexColor }));
        const channels = guild.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name })); // GuildText = 0
        const categories = guild.channels.cache.filter(c => c.type === 4).map(c => ({ id: c.id, name: c.name })); // GuildCategory = 4

        res.json({ roles, channels, categories });
    } catch (err) {
        console.error('[DATA FETCH ERROR]', err);
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

app.post('/api/guilds/:guildId/announcements', auth, requireGuildAdmin(req => req.params.guildId), async (req, res) => {
    try {
        const { targetChannelId, outsideText, title, description, url, imageUrl, color } = req.body;
        
        if (!botClient) return res.status(503).json({ error: 'Bot Client unavailable' });
        const guild = botClient.guilds.cache.get(req.params.guildId);
        if (!guild) return res.status(404).json({ error: 'Guild not found' });

        const channel = guild.channels.cache.get(targetChannelId);
        if (!channel) return res.status(404).json({ error: 'Target Channel not found' });

        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder();
        if (title) embed.setTitle(title);
        if (description) embed.setDescription(description);
        if (url) embed.setURL(url);
        if (imageUrl) embed.setImage(imageUrl);
        if (color) embed.setColor(color);
        else embed.setColor(config.color);
        
        const payloadRich = {
            content: outsideText || undefined,
            embeds: [embed]
        };
        
        console.log('[DEBUG ANNOUNCEMENT RICH]:', JSON.stringify(payloadRich));
        const msg = await channel.send(payloadRich);
        return res.status(200).json({ success: true, messageId: msg.id });
    } catch (err) {
        console.error('[ANNOUNCEMENT ERROR]', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Panels API ---
app.get('/api/panels/:guildId', auth, requireGuildAdmin(req => req.params.guildId), async (req, res) => {
    const panels = await Panel.find({ guildId: req.params.guildId });
    res.json(panels);
});

app.post('/api/panels', auth, requireGuildAdmin(req => req.body.guildId), async (req, res) => {
    try {
        const panel = new Panel(req.body);

        if (!panel.modalQuestions || panel.modalQuestions.length === 0) {
            panel.modalQuestions = [
                { label: 'Issue Summary', placeholder: 'Briefly describe your issue', style: 'short' },
                { label: 'Detailed Description', placeholder: 'Provide more details...', style: 'paragraph' }
            ];
        }

        if (botClient && panel.channelId) {
            const channel = botClient.channels.cache.get(panel.channelId);
            if (channel) {
                try {
                    const { MessageFlags } = require('discord.js');
                    const panelUI = ui.createPanelUI(panel);

                    const msg = await channel.send({
                        flags: MessageFlags.IsComponentsV2,
                        components: [panelUI]
                    });
                    panel.messageId = msg.id;
                } catch(e) { console.error('[API] Panel Drop Error:', e); }
            }
        }

        await panel.save();
        res.status(201).json(panel);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/panels/:panelId', auth, async (req, res) => {
    try {
        const panel = await Panel.findOne({ panelId: req.params.panelId });
        if (!panel) return res.status(404).json({ error: 'Panel not found' });
        
        if (!req.user.allowedGuilds || !req.user.allowedGuilds.some(g => g.id === panel.guildId)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        await Panel.deleteOne({ panelId: req.params.panelId });
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// --- Tickets API ---
app.get('/api/tickets/:guildId', auth, requireGuildAdmin(req => req.params.guildId), async (req, res) => {
    const { status } = req.query;
    const query = { guildId: req.params.guildId };
    if (status) query.status = status;
    
    const tickets = await Ticket.find(query).sort({ createdAt: -1 });
    res.json(tickets);
});

const fs = require('fs');

app.get('/api/tickets/:guildId/transcript/:ticketId', (req, res, next) => {
    if (req.query.token) req.headers.authorization = `Bearer ${req.query.token}`;
    auth(req, res, next);
}, requireGuildAdmin(req => req.params.guildId), async (req, res) => {
    try {
        const ticket = await Ticket.findOne({ ticketId: req.params.ticketId, guildId: req.params.guildId });
        if (!ticket || !ticket.transcriptPath) {
            return res.status(404).send('Transcript not found or ticket is still open.');
        }

        const transcriptPath = path.join(__dirname, '../../../transcripts', ticket.transcriptPath);
        if (!fs.existsSync(transcriptPath)) {
            return res.status(404).send('HTML log file could not be located on the server filesystem.');
        }

        const html = await fs.promises.readFile(transcriptPath, 'utf8');
        res.send(html);
    } catch (err) {
        res.status(500).send('Internal Server Error fetching transcript.');
    }
});

app.delete('/api/tickets/:guildId/all', auth, requireGuildAdmin(req => req.params.guildId), async (req, res) => {
    try {
        const tickets = await Ticket.find({ guildId: req.params.guildId, status: { $ne: 'open' } });
        
        for (const ticket of tickets) {
            if (ticket.transcriptPath) {
                const transcriptPath = path.join(__dirname, '../../../transcripts', ticket.transcriptPath);
                if (fs.existsSync(transcriptPath)) fs.unlinkSync(transcriptPath);
            }
        }

        await Ticket.deleteMany({ guildId: req.params.guildId, status: { $ne: 'open' } });
        res.json({ success: true, count: tickets.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/tickets/:guildId/:ticketId', auth, requireGuildAdmin(req => req.params.guildId), async (req, res) => {
    try {
        const ticket = await Ticket.findOne({ ticketId: req.params.ticketId, guildId: req.params.guildId });
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

        if (ticket.transcriptPath) {
            const transcriptPath = path.join(__dirname, '../../../transcripts', ticket.transcriptPath);
            if (fs.existsSync(transcriptPath)) fs.unlinkSync(transcriptPath);
        }

        await Ticket.deleteOne({ _id: ticket._id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Analytics API ---
app.get('/api/analytics/:guildId', auth, requireGuildAdmin(req => req.params.guildId), async (req, res) => {
    const stats = await Analytics.find({ guildId: req.params.guildId }).sort({ date: -1 }).limit(30);
    res.json(stats);
});

// --- Settings API ---
app.patch('/api/panels/:panelId', auth, async (req, res) => {
    try {
        // Must fetch panel first to know its guildId
        const existingPanel = await Panel.findOne({ panelId: req.params.panelId });
        if (!existingPanel) return res.status(404).json({ error: 'Panel not found' });
        
        if (!req.user.allowedGuilds || !req.user.allowedGuilds.some(g => g.id === existingPanel.guildId)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const panel = await Panel.findOneAndUpdate(
            { panelId: req.params.panelId },
            req.body,
            { returnDocument: 'after' }
        );

        // Edit the live panel message in Discord!
        if (botClient && panel.channelId && panel.messageId) {
            const channel = botClient.channels.cache.get(panel.channelId);
            if (channel) {
                try {
                    const msg = await channel.messages.fetch(panel.messageId);
                    if (msg) {
                        const embed = new EmbedBuilder()
                            .setTitle(panel.name)
                            .setDescription(panel.description || 'Click the button below to open a ticket.')
                            .setColor(config.colors.primary);
                            
                        const buttonRow = ui.createButtonRow({
                            id: 'ticket_create', 
                            label: panel.buttonLabel || 'Open Ticket', 
                            style: 'primary', 
                            emoji: panel.buttonEmoji
                        });
                        
                        await msg.edit({ embeds: [embed], components: [buttonRow] });
                    }
                } catch(e) { 
                    console.log('[API] Could not edit live panel message for ' + panel.panelId); 
                }
            }
        }

        res.json(panel);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// --- React Router Fallback ---
app.use((req, res, next) => {
    // Prevent catching /api endpoints
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../../../dashboard/dist/index.html'));
});

// Start API (Internal)
let botClient = null;
const startAPI = (client, port = 3000) => {
    botClient = client;
    app.listen(port, () => {
        console.log('[API]'.cyan + ` Dashboard API running on port ${port}`.white);
    });
};

module.exports = { startAPI };
