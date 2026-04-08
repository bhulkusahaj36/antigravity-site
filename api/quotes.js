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

        // ── GET /api/quotes — returns all active quotes (public) ─────────
        if (method === 'GET') {
            const includeAll = req.query.all === 'true';
            const filter = { type: 'quote' };

            if (!(includeAll && isAuthorized(req))) {
                // Public view: active quotes only
                filter.active = true;
            }

            const resources = await col.find(filter).sort({ createdAt: -1 }).toArray();
            
            res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=900');
            return res.json(resources);
        }

        // ── Write operations require auth ────────────────────────────────
        if (!isAuthorized(req)) {
            return res.status(401).send('Unauthorized: missing or invalid X-Admin-Token');
        }

        // ── POST /api/quotes — add a new quote ───────────────────────────
        if (method === 'POST') {
            const body = req.body;
            if (!body.text?.trim()) {
                return res.status(400).send('Quote text is required');
            }
            if (body.text.length > 2000) {
                return res.status(400).send('Quote text exceeds 2000 characters');
            }

            const now = new Date().toISOString();
            const quote = {
                id: Date.now().toString(),
                type: 'quote',
                text: body.text.trim(),
                author: (body.author || '').trim(),
                active: body.active !== false, // default true
                createdAt: now,
                updatedAt: now
            };

            await col.replaceOne({ id: quote.id }, quote, { upsert: true });
            return res.status(201).json(quote);
        }

        // ── PATCH /api/quotes?id=xxx — toggle active or update ───────────
        if (method === 'PATCH') {
            const { id } = req.query;
            if (!id) return res.status(400).send('id query param required');

            const body = req.body;
            const existing = await col.findOne({ id, type: 'quote' });
            
            if (!existing) {
                return res.status(404).send('Quote not found');
            }

            if (body.text !== undefined) existing.text = body.text.trim();
            if (body.author !== undefined) existing.author = body.author.trim();
            if (body.active !== undefined) existing.active = body.active;
            existing.updatedAt = new Date().toISOString();

            await col.replaceOne({ id }, existing, { upsert: true });
            return res.json(existing);
        }

        // ── DELETE /api/quotes?id=xxx ────────────────────────────────────
        if (method === 'DELETE') {
            const { id } = req.query;
            if (!id) return res.status(400).send('id query param required');
            
            await col.deleteOne({ id, type: 'quote' });
            return res.status(204).end();
        }

        return res.status(405).send(`Method ${method} Not Allowed`);

    } catch (error) {
        console.error("Quotes API Error:", error);
        return res.status(500).send(error.message);
    }
};
