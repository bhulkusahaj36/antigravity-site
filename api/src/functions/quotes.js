const { app } = require('@azure/functions');
const { getCollection } = require('../db');

// MongoDB document shape for quotes:
// { id, type: 'quote', text, author, active: true, createdAt }

function isAuthorized(request) {
    const token = request.headers.get('X-Admin-Token');
    const expected = process.env.ADMIN_SECRET_TOKEN;
    if (!expected) return false;
    return token && token === expected;
}

app.http('quotes', {
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    authLevel: 'anonymous',
    route: 'quotes',
    handler: async (request, context) => {
        try {
            const col = await getCollection('articles');

            // ── GET /api/quotes — returns all active quotes (public) ─────────
            if (request.method === 'GET') {
                const includeAll = request.query.get('all') === 'true';
                const filter = { type: 'quote' };

                if (!(includeAll && isAuthorized(request))) {
                    // Public view: active quotes only
                    filter.active = true;
                }

                const resources = await col.find(filter).sort({ createdAt: -1 }).toArray();
                
                return {
                    jsonBody: resources,
                    headers: {
                        'Cache-Control': 'public, max-age=300, stale-while-revalidate=900',
                        'Content-Type': 'application/json'
                    }
                };
            }

            // ── Write operations require auth ────────────────────────────────
            if (!isAuthorized(request)) {
                return {
                    status: 401,
                    body: 'Unauthorized: missing or invalid X-Admin-Token',
                    headers: { 'Content-Type': 'text/plain' }
                };
            }

            // ── POST /api/quotes — add a new quote ───────────────────────────
            if (request.method === 'POST') {
                const body = await request.json();
                if (!body.text?.trim()) {
                    return { status: 400, body: 'Quote text is required' };
                }
                if (body.text.length > 2000) {
                    return { status: 400, body: 'Quote text exceeds 2000 characters' };
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
                return { status: 201, jsonBody: quote };
            }

            // ── PATCH /api/quotes?id=xxx — toggle active or update ───────────
            if (request.method === 'PATCH') {
                const id = request.query.get('id');
                if (!id) return { status: 400, body: 'id query param required' };

                const body = await request.json();
                const existing = await col.findOne({ id, type: 'quote' });
                
                if (!existing) {
                    return { status: 404, body: 'Quote not found' };
                }

                if (body.text !== undefined) existing.text = body.text.trim();
                if (body.author !== undefined) existing.author = body.author.trim();
                if (body.active !== undefined) existing.active = body.active;
                existing.updatedAt = new Date().toISOString();

                await col.replaceOne({ id }, existing, { upsert: true });
                return { jsonBody: existing };
            }

            // ── DELETE /api/quotes?id=xxx ────────────────────────────────────
            if (request.method === 'DELETE') {
                const id = request.query.get('id');
                if (!id) return { status: 400, body: 'id query param required' };
                
                await col.deleteOne({ id, type: 'quote' });
                return { status: 204 };
            }

        } catch (error) {
            context.log("Quotes API Error:", error);
            return { status: 500, body: error.message };
        }
    }
});
