const { 
    AttachmentBuilder, 
    MessageFlags, 
    ContainerBuilder, 
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder
} = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const axios = require('axios');
const Welcome = require('../../models/Welcome');
const config = require('../../config/config.json');

module.exports = {
    name: 'guildMemberAdd',
    once: false,
    async execute(client, member) {
        const welcomeData = await Welcome.findOne({ guildId: member.guild.id });
        if (!welcomeData || !welcomeData.enabled) return;

        const channel = member.guild.channels.cache.get(welcomeData.channelId);
        if (!channel) return;

        try {
            // 1. Get random pokemon data
            const pokemonId = Math.floor(Math.random() * 898) + 1;
            const pokemonRes = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
            const pokemonName = pokemonRes.data.name.charAt(0).toUpperCase() + pokemonRes.data.name.slice(1);
            const pokemonImageUrl = pokemonRes.data.sprites.other['official-artwork'].front_default || pokemonRes.data.sprites.front_default;

            // 2. Create Canvas
            const canvas = createCanvas(800, 350);
            const ctx = canvas.getContext('2d');

            // --- ULTRA TUFF BACKGROUND ---
            // Dark Industrial Gradient
            const bgGradient = ctx.createLinearGradient(0, 0, 0, 350);
            bgGradient.addColorStop(0, '#000000');
            bgGradient.addColorStop(1, '#0d0d0d');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, 800, 350);

            // Add Grain/Noise Texture for Grit
            ctx.globalAlpha = 0.08;
            for (let i = 0; i < 800; i += 4) {
                for (let j = 0; j < 350; j += 4) {
                    if (Math.random() > 0.5) {
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(i, j, 2, 2);
                    }
                }
            }
            ctx.globalAlpha = 1.0;

            // --- ABSTRACT VECTOR LAYERS ---
            ctx.fillStyle = config.color || '#5865F2';
            
            // Sharp Slanted Vector Bar (Bottom Right)
            ctx.globalAlpha = 0.25;
            ctx.beginPath();
            ctx.moveTo(450, 350);
            ctx.lineTo(800, 350);
            ctx.lineTo(800, 50);
            ctx.closePath();
            ctx.fill();

            // Sharp Top Left Accent
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(250, 0);
            ctx.lineTo(0, 150);
            ctx.closePath();
            ctx.fill();

            // Glitch Bars (Accent Color)
            ctx.globalAlpha = 0.5;
            ctx.fillRect(0, 30, 60, 4);
            ctx.fillRect(740, 310, 60, 4);
            ctx.globalAlpha = 1.0;

            // --- TECH HUD OVERLAY ---
            ctx.strokeStyle = config.color || '#5865F2';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.15;
            
            // Grid Mesh
            for (let i = 0; i < 800; i += 40) {
                ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 350); ctx.stroke();
            }
            for (let i = 0; i < 350; i += 40) {
                ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(800, i); ctx.stroke();
            }

            // HUD Corners (High Visibility)
            ctx.globalAlpha = 0.9;
            ctx.lineWidth = 3;
            // Top Left Corner
            ctx.beginPath(); ctx.moveTo(15, 50); ctx.lineTo(15, 15); ctx.lineTo(50, 15); ctx.stroke();
            // Bottom Right Corner
            ctx.beginPath(); ctx.moveTo(750, 335); ctx.lineTo(785, 335); ctx.lineTo(785, 300); ctx.stroke();
            ctx.globalAlpha = 1.0;

            // --- AVATAR PROCESSING ---
            const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
            const avatarImg = await loadImage(avatarUrl);
            
            // Neon Bloom Glow
            ctx.shadowBlur = 35;
            ctx.shadowColor = config.color || '#5865F2';
            
            // Double Border Glow Effect
            ctx.save();
            ctx.beginPath();
            ctx.arc(160, 175, 105, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatarImg, 55, 70, 210, 210);
            ctx.restore();
            
            ctx.shadowBlur = 0; // Reset Shadow

            // Tuff Borders
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(160, 175, 105, 0, Math.PI * 2, true); ctx.stroke();
            ctx.strokeStyle = config.color || '#5865F2';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(160, 175, 115, 0, Math.PI * 2, true); ctx.stroke();

            // --- POKEMON INTEGRATION ---
            if (pokemonImageUrl) {
                const pokemonImg = await loadImage(pokemonImageUrl);
                // Depth Shadow
                ctx.shadowBlur = 25;
                ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                ctx.drawImage(pokemonImg, 530, 40, 260, 260);
                ctx.shadowBlur = 0;
            }

            // --- TUFF & CLEAN TEXT ---
            ctx.textAlign = 'left';
            
            // System Status
            ctx.fillStyle = config.color || '#5865F2';
            ctx.font = 'bold 14px monospace';
            ctx.fillText('>> STATUS: OPERATIVE_DETECTED', 310, 85);

            // Bold Bot Name
            ctx.fillStyle = '#ffffff';
            ctx.font = '900 70px sans-serif';
            ctx.fillText('ZENITH', 310, 145);
            
            // Accent Line
            ctx.fillStyle = config.color || '#5865F2';
            ctx.fillRect(310, 155, 200, 5);

            // Username (Clean & Tuff)
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 42px sans-serif';
            ctx.fillText(member.user.username, 310, 205);

            // Pokemon Assignment (Cute Style)
            ctx.font = 'italic 26px cursive';
            ctx.fillStyle = '#a0aec0';
            ctx.fillText(`You are like ${pokemonName}!`, 310, 255);

            // Member Counter (HUD Style)
            ctx.font = '14px monospace';
            ctx.fillStyle = config.color || '#5865F2';
            ctx.fillText(`[ ID: #${member.guild.memberCount.toString().padStart(4, '0')} ]`, 310, 300);

            // --- FINAL DELIVERY ---
            const buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: 'welcome.png' });
            
            const gallery = new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL('attachment://welcome.png')
            );

            const welcomeBlock = new ContainerBuilder()
                .setAccentColor(parseInt(String(config.color || '#5865F2').replace('#', ''), 16))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${config.welcome_emoji} Welcome to **${member.guild.name}**, ${member}! You've been assigned as **${pokemonName}**!`)
                )
                .addMediaGalleryComponents(gallery);

            await channel.send({
                flags: MessageFlags.IsComponentsV2,
                components: [welcomeBlock],
                files: [attachment]
            });

        } catch (error) {
            console.error('[WELCOME EVENT ERROR]', error);
        }
    },
};
