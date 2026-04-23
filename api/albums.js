const { getCollection } = require('./db');
const { isAuthorized } = require('./admin-auth');

module.exports = async (req, res) => {
    try {
        const col = await getCollection('articles');
        const { method } = req;

        // ── GET — list all albums (public) ───────────────────────────
        if (method === 'GET') {
            const { id: specificId } = req.query;
            
            // 1. Get explicit album objects (those with type: 'album')
            const filter = { type: 'album' };
            if (specificId) filter.id = specificId;
            const explicitAlbums = await col.find(filter).sort({ title: 1 }).toArray();

            if (specificId) {
                res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=900');
                return res.json(explicitAlbums[0] || null);
            }

            // 2. Extract unique album names used in paravani articles
            // This ensures "dynamic" albums show up even without a dedicated album document.
            const albumNamesInArticles = await col.distinct("album", { 
                type: 'paravani', 
                album: { $ne: null, $ne: "" },
                public: { $ne: false, $ne: 'no' } // Only show albums with public articles
            });


            // 3. Merge them, prioritizing explicit album objects (which might have descriptions/extra metadata)
            const albumMap = new Map();
            explicitAlbums.forEach(a => albumMap.set(a.title, a));
            
            albumNamesInArticles.forEach(name => {
                if (!albumMap.has(name)) {
                    albumMap.set(name, { 
                        id: name, // Fallback ID is the name itself
                        title: name, 
                        type: 'album' 
                    });
                }
            });

            const finalAlbums = Array.from(albumMap.values()).sort((a, b) => a.title.localeCompare(b.title));

            res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=900');
            return res.json(finalAlbums);
        }


        // ── WRITE OPERATIONS — require auth ──────────────────────────
        if (!(await isAuthorized(req))) {
            return res.status(401).send('Unauthorized: missing or invalid authentication');
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
