// bot.js
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { storeGroqApiKey, getEncryptedGroqApiKey, deleteGroqApiKey } = require('./services/firebase');
const { decrypt, encrypt } = require('./utils/encryption');
const Groq = require('groq-sdk'); // <-- NEW: Import Groq SDK

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

    const botMentioned = message.mentions.users.has(client.user.id);

    if (botMentioned || message.channel.type === 1 /* DM Channel */) {
        // Remove bot mentions from the message content for cleaner processing
        const contentWithoutMention = message.content.replace(`<@${client.user.id}>`, '').replace(`<@!${client.user.id}>`, '').trim(); // Removed .toLowerCase() for AI context
        const userId = message.author.id;

        // Immediately defer the reply to show "Bot is thinking..."
        // Discord interactions (including message replies) have a limited time to respond.
        // For AI, it's best to defer if the response might take a moment.
        const replyMessage = await message.reply('Thinking...'); // Initial "Thinking..." message

        if (contentWithoutMention.length === 0 || contentWithoutMention.toLowerCase() === 'ping') {
            // Handle simple mentions or "@bot ping"
            await replyMessage.edit('Pong!'); // Edit the "Thinking..." message to "Pong!"
            console.log(`Responded to "${contentWithoutMention}" from ${message.author.tag} (${message.author.id})`);
            return; // Stop here if it's just ping/empty mention
        }

        // --- NEW: Groq API Integration for Mentions ---
        try {
            const encryptedGroqKey = await getEncryptedGroqApiKey(userId);
            if (!encryptedGroqKey) {
                return await replyMessage.edit("You need to set your Groq API key first using `/setkey` to use AI features.");
            }
            const decryptedGroqKey = decrypt(encryptedGroqKey);

            // Initialize Groq client with the decrypted key
            const groq = new Groq({ apiKey: decryptedGroqKey });

            // Make the API call to Groq
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: 'You are ZBØTS CHT1, a helpful and friendly AI assistant. Provide concise and helpful answers.',
                    },
                    {
                        role: 'user',
                        content: contentWithoutMention, // Use the cleaned user message as the prompt
                    },
                ],
                model: 'llama3-8b-8192', // Or 'mixtral-8x7b-32768' or 'llama3-70b-8192'
                                          // Check Groq docs for available models.
                temperature: 0.7, // Adjust creativity (0.0 to 1.0)
                max_tokens: 1000, // Max tokens for AI's response
            });

            const aiResponse = chatCompletion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
            await replyMessage.edit(aiResponse); // Edit the "Thinking..." message with AI response
            console.log(`AI responded to mention from ${message.author.tag} (${userId}): "${contentWithoutMention}"`);

        } catch (error) {
            console.error(`Error with AI response for user ${userId} (mention):`, error);
            // Check for specific error types if needed, e.g., invalid API key
            if (error.response && error.response.status === 401) {
                await replyMessage.edit('It looks like your Groq API key is invalid. Please set it again using `/setkey`.');
            } else {
                await replyMessage.edit('There was an error communicating with the AI. Please try again later.');
            }
        }
        // --- END NEW: Groq API Integration for Mentions ---
    }
});


client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;
    const userId = interaction.user.id;

    switch (commandName) {
        case 'setkey':
            const groqApiKey = interaction.options.getString('key');

            if (!groqApiKey.startsWith('gsk_') || groqApiKey.length < 20) {
                return interaction.reply({ content: 'That does not look like a valid Groq API key. Please double check it. Groq keys usually start with `gsk_`.', ephemeral: true });
            }

            try {
                const encryptedKey = encrypt(groqApiKey);
                await storeGroqApiKey(userId, encryptedKey);
                await interaction.reply({ content: 'Your Groq API key has been securely stored! You can now use AI features.', ephemeral: true });
                console.log(`Groq API key set by user ${interaction.user.tag} (${userId})`);
            } catch (error) {
                console.error(`Error processing /setkey command for user ${userId}:`, error);
                await interaction.reply({ content: 'There was an error storing your key. Please try again later.', ephemeral: true });
            }
            break;

        case 'removekey':
            try {
                const wasDeleted = await deleteGroqApiKey(userId);
                if (wasDeleted) {
                    await interaction.reply({ content: 'Your Groq API key has been successfully removed. AI features are now disabled.', ephemeral: true });
                    console.log(`Groq API key removed by user ${interaction.user.tag} (${userId})`);
                } else {
                    await interaction.reply({ content: 'No Groq API key was found to remove for your account.', ephemeral: true });
                }
            } catch (error) {
                console.error(`Error processing /removekey command for user ${userId}:`, error);
                await interaction.reply({ content: 'There was an error removing your key. Please try again later.', ephemeral: true });
            }
            break;

        case 'chatbot':
            const prompt = interaction.options.getString('prompt');
            await interaction.deferReply(); // Defer for slash command too

            try {
                const encryptedGroqKey = await getEncryptedGroqApiKey(userId);
                if (!encryptedGroqKey) {
                    return await interaction.editReply("You need to set your Groq API key first using `/setkey` to use AI features.");
                }
                const decryptedGroqKey = decrypt(encryptedGroqKey);

                // --- INTEGRATE GROQ API HERE (SAME LOGIC AS ABOVE) ---
                const groq = new Groq({ apiKey: decryptedGroqKey });

                const chatCompletion = await groq.chat.completions.create({
                    messages: [
                        {
                            role: 'system',
                            content: 'You are ZBØTS CHT1, a helpful and friendly AI assistant. Provide concise and helpful answers.',
                        },
                        {
                            role: 'user',
                            content: prompt, // Use the prompt from the slash command
                        },
                    ],
                    model: 'llama3-8b-8192', // Or your preferred model
                    temperature: 0.7,
                    max_tokens: 1000,
                });

                const aiResponse = chatCompletion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
                await interaction.editReply(aiResponse);

            } catch (error) {
                console.error(`Error with chatbot command for user ${userId}:`, error);
                if (error.response && error.response.status === 401) {
                    await interaction.editReply('It looks like your Groq API key is invalid. Please set it again using `/setkey`.');
                } else {
                    await interaction.editReply('There was an error communicating with the AI. Please ensure your Groq API key is valid.');
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
