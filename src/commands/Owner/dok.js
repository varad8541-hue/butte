// src/commands/Owner/dok.js
module.exports = {
    name: 'dok',
    description: 'Zenith\'s developer debugging and utility tool (Dokdo).',
    ownerOnly: true,
    aliases: ['d'],

    /**
     * @param {import('discord.js').Client} client
     * @param {import('discord.js').Message} message
     */
    run: async (client, message) => {
        // Handle 'stats' alias for Dokdo's main command
        if (message.args && message.args[0] === 'stats') {
            message.args = [];
            message.content = message.content.replace(/stats/i, '').trim();
        }

        // Run Dokdo
        try {
            await client.dokdo.run(message);
        } catch (error) {
            console.error('[DOKDO ERROR]', error);
            message.reply('An error occurred while running Dokdo. Check the console for details.');
        }
    },
};
