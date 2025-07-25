// app.js (TEMPORARY WORKAROUND for mobile deployment of commands)
require('dotenv').config();
const express = require('express');
const { startBot } = require('./bot');
const { exec } = require('child_process'); // Import for running shell commands

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/healthcheck', (req, res) => {
    res.status(200).send('ZBØTS Backend is healthy!');
});

app.listen(PORT, async () => {
    console.log(`ZBØTS Backend listening on port ${PORT}`);
    console.log(`Healthcheck available at http://localhost:${PORT}/healthcheck`);

    // --- TEMPORARY COMMAND DEPLOYMENT WORKAROUND ---
    // This will run 'node deploy-commands.js' once when your Render service starts.
    // This is NOT ideal for production (due to rate limits, unnecessary calls).
    // Please revert this section once your commands are successfully deployed
    // and you have access to a desktop/laptop for local deployment.
    console.log('Attempting to deploy Discord slash commands...');
    exec('node deploy-commands.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error deploying commands: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Deploy commands stderr: ${stderr}`);
            return;
        }
        console.log(`Deploy commands stdout: ${stdout}`);
        console.log('Discord slash commands deployment process initiated.');
    });
    // --- END TEMPORARY WORKAROUND ---


    // Start the single Discord bot client
    await startBot();
});
