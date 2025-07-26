// deploy-commands.js
const { REST, Routes, PermissionsBitField } = require('discord.js');
const dotenv = require('dotenv');
dotenv.config(); // Load environment variables from .env file

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
// IMPORTANT: If you want to deploy commands only to a specific guild for testing,
// uncomment the line below and replace with your Guild ID.
// For global deployment, keep it commented out.
// const GUILD_ID = process.env.DISCORD_GUILD_ID; // This should be in your .env if used

if (!TOKEN || !CLIENT_ID) {
    console.error('Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID environment variables.');
    process.exit(1);
}

const commands = [
    {
        name: 'setkey',
        description: 'Set the Groq API key for this server (Admin only).', // Updated description
        options: [
            {
                name: 'key',
                type: 3, // String type
                description: 'Your Groq API key (starts with gsk_).',
                required: true,
            },
        ],
        // NEW: Restrict to Administrator permission
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
    },
    {
        name: 'removekey',
        description: 'Remove the stored Groq API key for this server (Admin only).', // Updated description
        // NEW: Restrict to Administrator permission
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
    },
    {
        name: 'chatbot',
        description: 'Chat with the AI!',
        options: [
            {
                name: 'prompt',
                type: 3, // String type
                description: 'Your message to the AI.',
                required: true,
            },
        ],
    },
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // Determine if deploying globally or to a specific guild
        let data;
        if (process.env.DISCORD_GUILD_ID) {
            console.log(`Deploying commands to guild ID: ${process.env.DISCORD_GUILD_ID}`);
            data = await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, process.env.DISCORD_GUILD_ID),
                { body: commands },
            );
        } else {
            console.log('Deploying commands globally.');
            data = await rest.put(
                Routes.applicationCommands(CLIENT_ID),
                { body: commands },
            );
        }

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error('Failed to deploy commands:', error);
    }
})();
