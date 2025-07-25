// app.js (CLEAN, PERMANENT VERSION)
require('dotenv').config();
const express = require('express');
const { startBot } = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/healthcheck', (req, res) => {
    res.status(200).send('ZBØTS Backend is healthy!');
});

app.listen(PORT, async () => {
    console.log(`ZBØTS Backend listening on port ${PORT}`);
    console.log(`Healthcheck available at http://localhost:${PORT}/healthcheck`);

    // Start the single Discord bot client
    await startBot();
});
