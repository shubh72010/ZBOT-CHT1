// bot.js
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { storeGroqApiKey, getEncryptedGroqApiKey, deleteGroqApiKey } = require('./services/firebase');
const { decrypt, encrypt } = require('./utils/encryption');

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
        GatewayIntentBits.MessageContent, // Keep this intent
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

// --- UPDATED: Message Listener for Mentions and "ping" ---
client.on('messageCreate', async message => {
    // Ignore messages from bots to prevent infinite loops
    if (message.author.bot) return;

    const botMentioned = message.mentions.users.has(client.user.id);

    // If the bot is mentioned OR if it's a DM to the bot
    if (botMentioned || message.channel.type === 1 /* DM Channel */) {
        // Remove bot mentions from the message content for cleaner processing
        const contentWithoutMention = message.content.replace(`<@${client.user.id}>`, '').replace(`<@!${client.user.id}>`, '').trim().toLowerCase();

        if (contentWithoutMention === 'ping') {
            await message.reply('Pong!');
            console.log(`Responded to "@bot ping" from ${message.author.tag} (${message.author.id})`);
        } else if (contentWithoutMention.length === 0) {
            // If only the bot was mentioned (e.g., just "@bot")
            await message.reply(`Hello there, ${message.author}! How can I assist you?`);
            console.log(`Responded to mention from ${message.author.tag} (${message.author.id})`);
        } else {
            // If bot was mentioned with other text (e.g., "@bot tell me a joke")
            // You could potentially route this to a general AI response later.
            await message.reply(`I heard you, ${message.author}! You said: "${contentWithoutMention}".`);
            console.log(`Responded to mention with content from ${message.author.tag} (${message.author.id})`);
        }
    }
});
// --- END UPDATED: Message Listener ---


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
            await interaction.deferReply();

            try {
                const encryptedGroqKey = await getEncryptedGroqApiKey(userId);
                if (!encryptedGroqKey) {
                    return await interaction.editReply("You need to set your Groq API key first using `/setkey` to use AI features.");
                }
                const decryptedGroqKey = decrypt(encryptedGroqKey);

                // --- INTEGRATE GROQ API HERE (THIS IS THE NEXT BIG STEP!) ---
                const aiResponse = `(AI Response for ${interaction.user.tag}): You asked: "${prompt}". Your Groq key is active! This is where Groq API call will go.`;

                await interaction.editReply(aiResponse);

            } catch (error) {
                console.error(`Error with chatbot command for user ${userId}:`, error);
                await interaction.editReply('There was an error communicating with the AI. Please ensure your Groq API key is valid.');
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
