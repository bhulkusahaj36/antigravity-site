const { getCollection } = require('./db');
const { isAuthorized } = require('./admin-auth');

// ── Input Validation & Sanitization ─────────────────────────────────────────
function validateAndSanitize(data) {
    if (!data.title?.trim()) throw new Error('Title is required');
    if (data.title.length > 500) throw new Error('Title exceeds 500 characters');
    if (data.content?.length > 600_000) throw new Error('Content too large (>600KB)');

    if (data.content) {
        data.content = data.content.replace(/<script[\s\S]*?<\/script>/gi, '');
    }

    const allowed = [
        'id', 'title', 'content', 'type', 'topic', 'source', 'prasang',
        'album', 'location', 'date', 'public', 'status', 'featured', 'author',
        'createdAt', 'updatedAt', 'category', 'excerpt'
    ];
    Object.keys(data).forEach(k => { if (!allowed.includes(k)) delete data[k]; });
    return data;
}

module.exports = async (req, res) => {
    try {
        const col = await getCollection('articles');
        const { method } = req;

        // ── GET  (public, no auth required) ─────────────────────────────
        if (method === 'GET') {
            const {
                type,
                album,
                search,
                sortBy,
                compact: compactRaw,
                id: specificId,
                status,
                limit: limitRaw,
                continuationToken
            } = req.query;

            const compact = compactRaw === 'true';
            const limit = parseInt(limitRaw || '0');

            const filter = {};
            if (type) filter.type = type;
            if (album) filter.album = album;
            if (search) {
                filter.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { content: { $regex: search, $options: 'i' } }
                ];
            }
            if (specificId) filter.id = specificId;
            if (status) filter.status = status;

            const sortObj = {};
            if (sortBy === 'createdAt_desc') sortObj.createdAt = -1;
            else if (sortBy === 'createdAt_asc') sortObj.createdAt = 1;
            else if (sortBy === 'updatedAt_desc') sortObj.updatedAt = -1;
            else if (sortBy === 'updatedAt_asc') sortObj.updatedAt = 1;
            else sortObj.id = -1;

            const cacheSeconds = compact ? 300 : 60;
            res.setHeader('Cache-Control', `public, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 3}`);

            if (limit > 0) {
                const skip = parseInt(continuationToken) || 0;
                let resources = await col.find(filter)
                    .sort(sortObj)
                    .skip(skip)
                    .limit(limit)
                    .toArray();
                
                const nextToken = resources.length === limit ? String(skip + limit) : null;

                if (compact) {
                    resources = resources.map(r => {
                        if (content) {
                            const plain = content.replace(/<[^>]*>?/gm, '');
                            const trimmed = plain.substring(0, 300);
                            const lastSpace = trimmed.lastIndexOf(' ');
                            r.excerpt = (lastSpace > 0 ? trimmed.substring(0, lastSpace) : trimmed) + (plain.length > 300 ? '...' : '');
                        } else {
                            r.excerpt = "";
                        }
                        return r;
                    });
                }

                return res.json({ items: resources, nextToken });
            } else {
                let resources = await col.find(filter).sort(sortObj).toArray();
                
                if (compact) {
                    resources = resources.map(r => {
                        if (content) {
                            const plain = content.replace(/<[^>]*>?/gm, '');
                            const trimmed = plain.substring(0, 300);
                            const lastSpace = trimmed.lastIndexOf(' ');
                            r.excerpt = (lastSpace > 0 ? trimmed.substring(0, lastSpace) : trimmed) + (plain.length > 300 ? '...' : '');
                        } else {
                            r.excerpt = "";
                        }
                        return r;
                    });
                }

                return res.json(resources);
            }
        }

        // ── WRITE OPERATIONS — require auth ──────────────────────────────
        if (['POST', 'DELETE', 'PATCH'].includes(method)) {
            if (!(await isAuthorized(req))) {
                return res.status(401).send('Unauthorized: missing or invalid authentication');
            }
        }

        // ── POST (create / upsert article) ───────────────────────────────
        if (method === 'POST') {
            const articleData = validateAndSanitize(req.body);
            const now = new Date().toISOString();

            if (!articleData.id) {
                articleData.id = Date.now().toString();
                articleData.createdAt = now;
            } else {
                articleData.id = String(articleData.id);
                const existing = await col.findOne({ id: articleData.id });
                if (existing && existing.createdAt) {
                    articleData.createdAt = existing.createdAt;
                } else {
                    articleData.createdAt = new Date(Number(articleData.id)).toISOString();
                }
            }

            articleData.updatedAt = now;
            await col.replaceOne({ id: articleData.id }, articleData, { upsert: true });
            return res.status(201).json(articleData);
        }

        // ── DELETE ───────────────────────────────────────────────────────
        if (method === 'DELETE') {
            const singleId = req.query.id;
            if (singleId) {
                await col.deleteOne({ id: singleId });
                return res.status(204).end();
            }
            const { ids } = req.body;
            if (ids && Array.isArray(ids)) {
                const result = await col.deleteMany({ id: { $in: ids.map(String) } });
                return res.json({ deleted: result.deletedCount });
            }
            return res.status(400).send("Please pass an id or { ids: [...] }");
        }

        // ── PATCH (bulk update) ──────────────────────────────────────────
        if (method === 'PATCH') {
            const { ids, updates: rawUpdates } = req.body;
            if (!ids || !Array.isArray(ids) || !rawUpdates) {
                return res.status(400).send("Provide { ids: [...], updates: { ... } }");
            }
            const now = new Date().toISOString();
            const updates = { ...rawUpdates, updatedAt: now };
            
            const result = await col.updateMany(
                { id: { $in: ids.map(String) } },
                { $set: updates }
            );
            
            return res.json({ updated: result.modifiedCount });
        }

        return res.status(405).send(`Method ${method} Not Allowed`);

    } catch (error) {
        console.error("Vercel API Error:", error);
        return res.status(500).send("Internal server error. Please try again later.");
    }
};
