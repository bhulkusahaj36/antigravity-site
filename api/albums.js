const { getCollection } = require('./db');

// ── Auth ────────────────────────────────────────────────────────────────────
function isAuthorized(req) {
    const token = req.headers['x-admin-token'];
    const expected = process.env.ADMIN_SECRET_TOKEN;
    if (!expected) return false;
    return token && token === expected;
}

module.exports = async (req, res) => {
    try {
        const col = await getCollection('articles');
        const { method } = req;

        // ── GET — list all albums (public) ───────────────────────────
        if (method === 'GET') {
            const { id: specificId } = req.query;
            const filter = { type: 'album' };
            if (specificId) filter.id = specificId;

            const resources = await col.find(filter).sort({ title: 1 }).toArray();

            res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=900');
            return res.json(specificId ? (resources[0] || null) : resources);
        }

        // ── WRITE OPERATIONS — require auth ──────────────────────────
        if (!isAuthorized(req)) {
            return res.status(401).send('Unauthorized: missing or invalid X-Admin-Token');
        }

        // ── POST — create album ──────────────────────────────────────
        if (method === 'POST') {
            const rawData = req.body;

            if (!rawData.title?.trim()) {
                return res.status(400).send('Album title is required');
            }
            if (rawData.title.length > 300) {
                return res.status(400).send('Album title exceeds 300 characters');
            }

            const now = new Date().toISOString();
            const album = {
                id: rawData.id || Date.now().toString(),
                title: rawData.title.trim(),
                description: rawData.description?.trim() || '',
                type: 'album',
                createdAt: now,
                updatedAt: now
            };

            await col.replaceOne({ id: album.id }, album, { upsert: true });
            return res.status(201).json(album);
        }

        // ── DELETE — remove album ────────────────────────────────────
        if (method === 'DELETE') {
            const { id: albumId } = req.query;
            if (!albumId) {
                return res.status(400).send('Please pass ?id=<album-id>');
            }

            await col.deleteOne({ id: albumId, type: 'album' });
            return res.status(204).end();
        }

        return res.status(405).send(`Method ${method} Not Allowed`);

    } catch (error) {
        console.error("Albums API Error:", error);
        return res.status(500).send(error.message);
    }
};
