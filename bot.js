// bot.js
const { Client, GatewayIntentBits, Partials, Collection, PermissionsBitField } = require('discord.js');
const { storeGroqApiKey, getEncryptedGroqApiKey, deleteGroqApiKey } = require('./services/firebase');
const { decrypt, encrypt } = require('./utils/encryption');
const Groq = require('groq-sdk');

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!TOKEN) {
    console.error('DISCORD_BOT_TOKEN environment variable is not set. Bot cannot log in.');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember
    ],
});

client.commands = new Collection();

client.once('ready', () => {
    console.log(`ZBOT CHT1 is online! Logged in as ${client.user.tag}`);
    client.user.setActivity('ZBØTS Online!', { type: 3 });
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // We only care about messages in guilds (servers) or DMs to the bot
    if (!message.guild && message.channel.type !== 1 /* DM Channel */) return;

    const botMentioned = message.mentions.users.has(client.user.id);
    const guildId = message.guild ? message.guild.id : null; // Get guildId if in a guild

    // Only proceed if bot is mentioned in a guild, or if it's a DM (though AI is guild-only)
    if (botMentioned || message.channel.type === 1) {
        const contentWithoutMention = message.content.replace(`<@${client.user.id}>`, '').replace(`<@!${client.user.id}>`, '').trim();
        const userId = message.author.id; // Still useful for logging or potential per-user features

        // For DM channels, we cannot use a guild-specific key.
        // For simplicity, we'll currently restrict AI features to guilds.
        if (!guildId) {
            return await message.reply("AI features are currently only available in Discord servers (guilds), not direct messages.");
        }

        // Immediately acknowledge with "Thinking..."
        const replyMessage = await message.reply('Thinking...');

        if (contentWithoutMention.length === 0 || contentWithoutMention.toLowerCase() === 'ping') {
            await replyMessage.edit('Pong!');
            console.log(`Responded to "${contentWithoutMention}" from ${message.author.tag} (${userId}) in guild ${guildId}`);
            return;
        }

        // --- Groq API Integration for Mentions ---
        try {
            // Retrieve key using guildId
            const encryptedGroqKey = await getEncryptedGroqApiKey(guildId);
            if (!encryptedGroqKey) {
                return await replyMessage.edit(`No Groq API key set for this server. An administrator needs to set it using \`/setkey\`.`);
            }
            const decryptedGroqKey = decrypt(encryptedGroqKey);

            const groq = new Groq({ apiKey: decryptedGroqKey });

            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: 'You are ZBØTS CHT1, a helpful and friendly AI assistant. Provide concise and helpful answers.',
                    },
                    {
                        role: 'user',
                        content: contentWithoutMention,
                    },
                ],
                model: 'llama3-8b-8192',
                temperature: 0.7,
                max_tokens: 1000,
            });

            const aiResponse = chatCompletion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
            await replyMessage.edit(aiResponse);
            console.log(`AI responded to mention from ${message.author.tag} (${userId}) in guild ${guildId}: "${contentWithoutMention}"`);

        } catch (error) {
            console.error(`Error with AI response for user ${userId} in guild ${guildId} (mention):`, error);
            if (error.response && error.response.status === 401) {
                await replyMessage.edit('It looks like the Groq API key for this server is invalid. An administrator needs to set it again using `/setkey`.');
            } else {
                await replyMessage.edit('There was an error communicating with the AI. Please try again later.');
            }
        }
    }
});


client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    // Ensure the interaction is from a guild (server) for key management and AI
    if (!interaction.guildId) {
        return await interaction.reply({ content: 'These commands can only be used in a Discord server, not in direct messages.', ephemeral: true });
    }

    const { commandName } = interaction;
    const guildId = interaction.guildId; // Get the guild ID from the interaction
    const userId = interaction.user.id; // User ID is still useful for logging

    // Check if the user has Administrator permissions (only for setkey/removekey)
    const hasAdminPermissions = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    switch (commandName) {
        case 'setkey':
            // Defer the reply immediately to prevent "Application did not respond"
            // Make it ephemeral so only the user who ran the command sees the "thinking..." message
            await interaction.deferReply({ ephemeral: true });

            if (!hasAdminPermissions) {
                // Use editReply now since we deferred
                return await interaction.editReply({ content: 'You must be an administrator to set the Groq API key for this server.' });
            }

            const groqApiKey = interaction.options.getString('key');

            if (!groqApiKey.startsWith('gsk_') || groqApiKey.length < 20) {
                // Use editReply now since we deferred
                return interaction.editReply({ content: 'That does not look like a valid Groq API key. Please double check it. Groq keys usually start with `gsk_`.' });
            }

            try {
                const encryptedKey = encrypt(groqApiKey);
                await storeGroqApiKey(guildId, encryptedKey); // Pass guildId
                // Use editReply now since we deferred
                await interaction.editReply({ content: 'The Groq API key has been securely stored for this server! AI features are now enabled for everyone here.' });
                console.log(`Groq API key set by ${interaction.user.tag} (${userId}) for guild ${guildId}`);
            } catch (error) {
                console.error(`Error processing /setkey command for guild ${guildId} by user ${userId}:`, error);
                // Use editReply now since we deferred
                await interaction.editReply({ content: 'There was an error storing the key. Please try again later.' });
            }
            break;

        case 'removekey':
            // We can defer this one too, though it's usually faster
            await interaction.deferReply({ ephemeral: true });

            if (!hasAdminPermissions) {
                return await interaction.editReply({ content: 'You must be an administrator to remove the Groq API key for this server.' });
            }

            try {
                const wasDeleted = await deleteGroqApiKey(guildId); // Pass guildId
                if (wasDeleted) {
                    await interaction.editReply({ content: 'The Groq API key has been successfully removed for this server. AI features are now disabled for everyone here.' });
                    console.log(`Groq API key removed by ${interaction.user.tag} (${userId}) for guild ${guildId}`);
                } else {
                    await interaction.editReply({ content: 'No Groq API key was found to remove for this server.', ephemeral: true });
                }
            } catch (error) {
                console.error(`Error processing /removekey command for guild ${guildId} by user ${userId}:`, error);
                await interaction.editReply({ content: 'There was an error removing the key. Please try again later.' });
            }
            break;

        case 'chatbot':
            const prompt = interaction.options.getString('prompt');
            await interaction.deferReply(); // Already deferring here

            try {
                // Retrieve key using guildId
                const encryptedGroqKey = await getEncryptedGroqApiKey(guildId);
                if (!encryptedGroqKey) {
                    return await interaction.editReply(`No Groq API key set for this server. An administrator needs to set it using \`/setkey\`.`);
                }
                const decryptedGroqKey = decrypt(encryptedGroqKey);

                const groq = new Groq({ apiKey: decryptedGroqKey });

                const chatCompletion = await groq.chat.completions.create({
                    messages: [
                        {
                            role: 'system',
                            content: 'You are ZBØTS CHT1, a helpful and friendly AI assistant. Provide concise and helpful answers.',
                        },
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                    model: 'llama3-8b-8192',
                    temperature: 0.7,
                    max_tokens: 1000,
                });

                const aiResponse = chatCompletion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
                await interaction.editReply(aiResponse);
                console.log(`AI responded to slash command from ${interaction.user.tag} (${userId}) in guild ${guildId}: "${prompt}"`);

            } catch (error) {
                console.error(`Error with chatbot command for guild ${guildId} by user ${userId}:`, error);
                if (error.response && error.response.status === 401) {
                    await interaction.editReply('It looks like the Groq API key for this server is invalid. An administrator needs to set it again using `/setkey`.');
                } else {
                    await interaction.editReply('There was an error communicating with the AI. Please ensure the Groq API key is valid.');
                }
            }
            break;

        default:
            await interaction.reply({ content: 'Unknown command.', ephemeral: true });
            break;
    }
});

client.on('error', error => {
    console.error('Discord client error:', error);
});

client.on('shardError', error => {
    console.error('A shard encountered an error:', error);
});

client.on('disconnect', (event) => {
    console.warn(`Discord client disconnected. Code: ${event.code}, Reason: ${event.reason}`);
});

const startBot = async () => {
    console.log('Attempting to log in ZBOT CHT1...');
    try {
        await client.login(TOKEN);
    } catch (error) {
        console.error('Failed to log in Discord bot:', error);
    }
};

module.exports = { startBot, client };
