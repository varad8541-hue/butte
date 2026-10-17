const {
    SlashCommandBuilder,
    MessageFlags,
    TextDisplayBuilder,
    ContainerBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    AttachmentBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder,
    ComponentType,
    Collection
} = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const config = require('../../config/config.json');

// --- COOLDOWN HANDLER ---
const cooldowns = new Collection();

module.exports = {
    name: 'help',
    description: 'List all available Zenith commands.',
    aliases: ['h', 'commands'],
    slashData: new SlashCommandBuilder()
        .setName('help')
        .setDescription('List all available Zenith commands.'),

    /**
     * @param {import('discord.js').Client} client
     * @param {import('discord.js').CommandInteraction|import('discord.js').Message} context
     */
    run: async (client, context) => {
        const isSlash = context.isChatInputCommand?.() || false;
        const user = isSlash ? context.user : context.author;
        
        // --- RATE LIMIT / COOLDOWN CHECK ---
        const cooldownAmount = 5000; // 5 seconds
        const now = Date.now();
        const timestamps = cooldowns.get(this.name) || new Collection();
        if (!cooldowns.has(this.name)) cooldowns.set(this.name, timestamps);

        if (timestamps.has(user.id)) {
            const expirationTime = timestamps.get(user.id) + cooldownAmount;
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                const cooldownBlock = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${config.warn_emoji} **Slow down!** Please wait \`${timeLeft.toFixed(1)}s\` before using the help command again.`)
                    );
                return context.reply({
                    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
                    components: [cooldownBlock]
                });
            }
        }
        timestamps.set(user.id, now);
        setTimeout(() => timestamps.delete(user.id), cooldownAmount);

        // --- LOADING STATE ---
        const loadingBlock = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${config.loading_emoji} **Initializing Help Interface...**\n> *Please wait, generating Canvas banners.*`)
            );
        
        const loadingMsg = await context.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [loadingBlock],
            fetchReply: true
        });

        const ownerIDs = config.ownerIDs || [];
        const isOwner = ownerIDs.includes(user.id);
        const prefix = config.prefix || 'z!';
        const botAvatar = client.user.displayAvatarURL({ extension: 'png', size: 256 });
        const accentColorInt = parseInt(String(config.color || '#2f3136').replace('#', ''), 16);

        // Group commands by category
        const categories = {};
        client.commands.forEach(cmd => {
            const category = cmd.category || 'Other';
            if ((category === 'Owner' || cmd.ownerOnly) && !isOwner) return;
            if (!categories[category]) categories[category] = [];
            if (!categories[category].some(c => c.name === cmd.name)) {
                categories[category].push(cmd);
            }
        });

        // --- CANVAS BANNER GENERATION ---
        const generateBanner = async (title = 'HELP MENU', subtitle = 'SELECT A CATEGORY') => {
            const canvas = createCanvas(800, 250);
            const ctx = canvas.getContext('2d');

            // Background
            const bgGradient = ctx.createLinearGradient(0, 0, 0, 250);
            bgGradient.addColorStop(0, '#000000');
            bgGradient.addColorStop(1, '#0d0d0d');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, 800, 250);

            // Grid Mesh (Subtle)
            ctx.strokeStyle = config.color || '#5865F2';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.08;
            for (let i = 0; i < 800; i += 40) {
                ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 250); ctx.stroke();
            }
            for (let i = 0; i < 250; i += 40) {
                ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(800, i); ctx.stroke();
            }

            // Tech HUD Accents
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = config.color || '#5865F2';
            ctx.beginPath();
            ctx.moveTo(550, 250);
            ctx.lineTo(800, 250);
            ctx.lineTo(800, 0);
            ctx.closePath();
            ctx.fill();

            // HUD Corners
            ctx.globalAlpha = 0.8;
            ctx.lineWidth = 3;
            ctx.strokeStyle = config.color || '#5865F2';
            // Top Left
            ctx.beginPath(); ctx.moveTo(20, 40); ctx.lineTo(20, 20); ctx.lineTo(40, 20); ctx.stroke();
            // Bottom Right
            ctx.beginPath(); ctx.moveTo(760, 230); ctx.lineTo(780, 230); ctx.lineTo(780, 210); ctx.stroke();

            // Bot Avatar
            const avatarImg = await loadImage(botAvatar);
            
            // Avatar Glow
            ctx.shadowBlur = 20;
            ctx.shadowColor = config.color || '#5865F2';
            ctx.save();
            ctx.beginPath();
            ctx.arc(120, 125, 75, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatarImg, 45, 50, 150, 150);
            ctx.restore();
            ctx.shadowBlur = 0;

            // Avatar Ring
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(120, 125, 75, 0, Math.PI * 2, true); ctx.stroke();
            ctx.strokeStyle = config.color || '#5865F2';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(120, 125, 82, 0, Math.PI * 2, true); ctx.stroke();

            // Text Rendering
            ctx.textAlign = 'left';
            
            // Status Tag
            ctx.fillStyle = config.color || '#5865F2';
            ctx.font = 'bold 14px monospace';
            ctx.fillText('>> SYSTEM_STATUS: OPERATIONAL', 230, 75);

            // Title
            ctx.fillStyle = '#ffffff';
            ctx.font = '900 56px sans-serif';
            ctx.fillText(title, 230, 130);

            // Accent Bar
            ctx.fillStyle = config.color || '#5865F2';
            ctx.fillRect(230, 145, 180, 6);

            // Subtitle
            ctx.fillStyle = '#a0aec0';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText(subtitle, 230, 185);

            // Command Counter
            const totalCmds = Object.values(categories).reduce((acc, curr) => acc + curr.length, 0);
            ctx.font = '14px monospace';
            ctx.fillStyle = config.color || '#5865F2';
            ctx.fillText(`[ INDEXED_OPERATIONS: ${totalCmds.toString().padStart(3, '0')} ]`, 230, 215);

            return canvas.toBuffer('image/png');
        };

        // --- PAGE GENERATORS ---
        const createHomePage = async () => {
            const buffer = await generateBanner('ZENITH HELP', 'COMMAND INTERFACE');
            const attachment = new AttachmentBuilder(buffer, { name: 'help_main.png' });
            
            const gallery = new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL('attachment://help_main.png')
            );

            const container = new ContainerBuilder()
                .setAccentColor(accentColorInt)
                .addMediaGalleryComponents(gallery)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${config.info_emoji} **Welcome to ${config.botName || 'Zenith'} System Hub**`),
                    new TextDisplayBuilder().setContent(`Navigate through the operational sectors using the menu below to view available sub-commands.`)
                );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('help_select')
                .setPlaceholder('Select a command category...')
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Home')
                        .setDescription('Back to the main menu')
                        .setEmoji('🏠')
                        .setValue('help_home')
                );

            const catEmojis = config.category_emojis || {};
            Object.keys(categories).forEach(cat => {
                const emoji = catEmojis[cat] || '🔹';
                selectMenu.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(cat)
                        .setDescription(`View commands in ${cat}`)
                        .setEmoji(emoji)
                        .setValue(`help_cat_${cat.toLowerCase()}`)
                );
            });

            const row = new ActionRowBuilder().addComponents(selectMenu);
            container.addActionRowComponents(row);

            return { components: [container], files: [attachment] };
        };

        const createCategoryPage = async (categoryName) => {
            const catNameUpper = categoryName.toUpperCase();
            const buffer = await generateBanner(catNameUpper, 'SUB-SECTOR COMMANDS');
            const attachment = new AttachmentBuilder(buffer, { name: `help_${categoryName}.png` });

            const gallery = new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(`attachment://help_${categoryName}.png`)
            );

            const commands = categories[Object.keys(categories).find(k => k.toLowerCase() === categoryName.toLowerCase())] || [];
            const commandList = commands.map(cmd => `**\`${prefix}${cmd.name}\`**\n> ${cmd.description}`).join('\n\n');

            const container = new ContainerBuilder()
                .setAccentColor(accentColorInt)
                .addMediaGalleryComponents(gallery)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${config.category_emojis?.[categoryName.charAt(0).toUpperCase() + categoryName.slice(1)] || '📂'} **Sector: ${catNameUpper}**`),
                    new TextDisplayBuilder().setContent(commandList || '*No operational protocols found in this sector.*')
                );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('help_select')
                .setPlaceholder('Select another category...')
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Home')
                        .setDescription('Back to the main menu')
                        .setEmoji('🏠')
                        .setValue('help_home')
                );

            const catEmojis = config.category_emojis || {};
            Object.keys(categories).forEach(cat => {
                const emoji = catEmojis[cat] || '🔹';
                selectMenu.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(cat)
                        .setDescription(`View commands in ${cat}`)
                        .setEmoji(emoji)
                        .setValue(`help_cat_${cat.toLowerCase()}`)
                        .setDefault(cat.toLowerCase() === categoryName.toLowerCase())
                );
            });

            const row = new ActionRowBuilder().addComponents(selectMenu);
            container.addActionRowComponents(row);

            return { components: [container], files: [attachment] };
        };

        // --- FINAL RENDERING ---
        const initialPage = await createHomePage();
        await loadingMsg.edit({
            ...initialPage,
            flags: MessageFlags.IsComponentsV2
        });

        // --- INTERACTION COLLECTOR ---
        const collector = loadingMsg.createMessageComponentCollector({
            filter: (i) => i.user.id === user.id && i.customId === 'help_select',
            time: 90000,
            componentType: ComponentType.StringSelect
        });

        let lastComponents = initialPage.components;

        collector.on('collect', async (i) => {
            try {
                const value = i.values[0];
                let nextPage;
                if (value === 'help_home') {
                    nextPage = await createHomePage();
                } else if (value.startsWith('help_cat_')) {
                    const category = value.split('_')[2];
                    nextPage = await createCategoryPage(category);
                }

                if (nextPage) {
                    lastComponents = nextPage.components;
                    await i.update({ ...nextPage, flags: MessageFlags.IsComponentsV2 });
                }
            } catch (err) {
                console.error('[HELP_INTERACTION_ERROR]', err);
            }
        });

        collector.on('end', async () => {
            try {
                // To properly disable buttons in V2, we need to manipulate the JSON data or recreate.
                // Re-running a simplified version without action rows is the cleanest way.
                const timeoutBlock = new ContainerBuilder()
                    .setAccentColor(accentColorInt)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${config.warn_emoji} **Help Session Expired**`),
                        new TextDisplayBuilder().setContent(`> Interaction timed out. Use \`${prefix}help\` to open the menu again.`)
                    );

                await loadingMsg.edit({
                    components: [timeoutBlock],
                    files: [], // Clear attachments to keep it clean
                    flags: MessageFlags.IsComponentsV2
                });
            } catch (err) {
                // Silently fail if message was deleted
            }
        });
    },
};
