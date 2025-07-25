// deploy-commands.js
require('dotenv').config();
const { REST, Routes } = require('discord.js');

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID; // Optional, for testing in a specific guild

if (!token) {
    console.error('DISCORD_BOT_TOKEN environment variable is not set.');
    process.exit(1);
}
if (!clientId) {
    console.error('DISCORD_CLIENT_ID environment variable is not set.');
    process.exit(1);
}

const commands = [
    {
        name: 'setkey',
        description: 'Set your personal Groq API key for AI features.',
        options: [
            {
                name: 'key',
                type: 3, // String type
                description: 'Your Groq API key (e.g., gsk_...). Keep it private!',
                required: true,
            },
        ],
    },
    {
        name: 'removekey', // NEW COMMAND DEFINITION
        description: 'Remove your stored Groq API key. AI features will be disabled.',
    },
    // Add other slash commands here as your bot grows
];

const rest = new REST().setToken(token);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        let data;
        if (guildId) {
            // For testing: register commands to a specific guild (faster updates)
            console.log(`Registering commands to Guild ID: ${guildId}`);
            data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands },
            );
        } else {
            // For production: register commands globally (takes up to an hour to propagate)
            console.log('Registering commands globally (this can take up to 1 hour).');
            data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands },
            );
        }

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();
