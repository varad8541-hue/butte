const {
    SlashCommandBuilder,
    MessageFlags,
    TextDisplayBuilder,
    ContainerBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ThumbnailBuilder,
    SectionBuilder
} = require('discord.js');
const config = require('../../config/config.json');

module.exports = {
    name: 'ping',
    description: 'Check Zenith\'s network latency and heartbeat.',
    aliases: ['latency', 'p'],
    slashData: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check Zenith\'s network latency and heartbeat.'),

    /**
     * @param {import('discord.js').Client} client
     * @param {import('discord.js').CommandInteraction|import('discord.js').Message} context
     */
    run: async (client, context) => {
        const isSlash = context.isChatInputCommand?.() || false;

        // Initial pinging message
        const loadingText = new TextDisplayBuilder()
            .setContent(`${config.loading_emoji} **Calculating latency...**`);

        const loadingContainer = new ContainerBuilder()
            .addTextDisplayComponents(loadingText);

        const response = isSlash
            ? await context.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [loadingContainer],
                withResponse: true
            }).then(r => r.resource.message)
            : await context.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [loadingContainer]
            });

        const latency = response.createdTimestamp - context.createdTimestamp;
        const apiPing = Math.round(client.ws.ping);

        // Professional result components
        const separator = new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small);

        const botAvatar = client.user.displayAvatarURL({ extension: 'png', size: 256 });
        const thumbnail = new ThumbnailBuilder({ media: { url: botAvatar } });

        const statsSection = new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`📡 **ZENITH NETWORK STATUS**`),
                new TextDisplayBuilder().setContent(`> 🟢 **Bot Latency:** \`${latency}ms\``),
                new TextDisplayBuilder().setContent(`> ⚡ **API Heartbeat:** \`${apiPing}ms\``)
            )
            .setThumbnailAccessory(thumbnail);

        const footerText = new TextDisplayBuilder()
            .setContent(`*Service Node: Cluster ${client.cluster.id} | Shard: ${context.guild?.shardId ?? 0} | Total Clusters: ${client.cluster.count}*`);

        const resultContainer = new ContainerBuilder()
            .addSectionComponents(statsSection)
            .addSeparatorComponents(separator)
            .addTextDisplayComponents(footerText);

        // Edit the reply with results
        if (isSlash) {
            await context.editReply({
                components: [resultContainer]
            });
        } else {
            await response.edit({
                components: [resultContainer]
            });
        }
    },
};
