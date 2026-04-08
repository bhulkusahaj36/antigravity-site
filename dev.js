require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simulate Vercel API routes
const mountHandler = (route, filePath) => {
    try {
        const handler = require(filePath);
        app.all(route, async (req, res) => {
            console.log(`[API] ${req.method} ${route}`);
            try {
                // Vercel handlers are typically (req, res)
                await handler(req, res);
            } catch (err) {
                console.error(`Error in ${route}:`, err);
                res.status(500).json({ error: 'Internal Server Error', details: err.message });
            }
        });
        console.log(`Mounted ${route} -> ${filePath}`);
    } catch (err) {
        console.warn(`Could not mount ${route}: ${err.message}`);
    }
};

// Mount Vercel functions
mountHandler('/api/articles', './api/articles');
mountHandler('/api/quotes', './api/quotes');
mountHandler('/api/albums', './api/albums');

// Serve static files
app.use(express.static(path.join(__dirname, '.')));

// Fallback for SPA-like behavior or just serve index.html
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`
🚀 Antigravity Local Dev Server Running!
---------------------------------------
Frontend: http://localhost:${port}
API:      http://localhost:${port}/api/articles
Database: Connected via MONGODB_URI
---------------------------------------
    `);
});
