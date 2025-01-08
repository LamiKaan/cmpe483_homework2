const express = require('express');
const path = require('path');
const { writeAbisAndBytecodesToFile } = require('./scripts/helpers');

const app = express();
const PORT = 3000;

async function startServer() {
    await writeAbisAndBytecodesToFile();

    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });

}

app.use(express.static(path.join(__dirname, 'public')));

startServer();