const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');

// CosmosDB document shape for quotes:
// { id, type: 'quote', text, author, active: true, createdAt }

let quotesContainer;

async function getContainer() {
    if (quotesContainer) return quotesContainer;
    const connectionString = process.env.AzureCosmosDBConnectionString;
    if (!connectionString) {
        throw new Error("Missing AzureCosmosDBConnectionString in Environment Variables");
    }
    const client = new CosmosClient(connectionString);
    const database = client.database("antigravity");
    // Quotes are stored in the same 'articles' container with type='quote'
    quotesContainer = database.container("articles");
    return quotesContainer;
}

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
            const c = await getContainer();

            // ── GET /api/quotes — returns all active quotes (public) ─────────
            if (request.method === 'GET') {
                const includeAll = request.query.get('all') === 'true';

                let query;
                if (includeAll && isAuthorized(request)) {
                    // Admin view: return all quotes regardless of active status
                    query = "SELECT * FROM c WHERE c.type = 'quote' ORDER BY c.createdAt DESC";
                } else {
                    // Public view: active quotes only
                    query = "SELECT * FROM c WHERE c.type = 'quote' AND c.active = true ORDER BY c.createdAt DESC";
                }

                const { resources } = await c.items.query({ query }).fetchAll();
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

                const { resource } = await c.items.upsert(quote);
                return { status: 201, jsonBody: resource };
            }

            // ── PATCH /api/quotes?id=xxx — toggle active or update ───────────
            if (request.method === 'PATCH') {
                const id = request.query.get('id');
                if (!id) return { status: 400, body: 'id query param required' };

                const body = await request.json();
                const { resource: existing } = await c.item(id, id).read();
                if (!existing || existing.type !== 'quote') {
                    return { status: 404, body: 'Quote not found' };
                }

                if (body.text !== undefined) existing.text = body.text.trim();
                if (body.author !== undefined) existing.author = body.author.trim();
                if (body.active !== undefined) existing.active = body.active;
                existing.updatedAt = new Date().toISOString();

                const { resource } = await c.items.upsert(existing);
                return { jsonBody: resource };
            }

            // ── DELETE /api/quotes?id=xxx ────────────────────────────────────
            if (request.method === 'DELETE') {
                const id = request.query.get('id');
                if (!id) return { status: 400, body: 'id query param required' };
                await c.item(id, id).delete();
                return { status: 204 };
            }

        } catch (error) {
            context.log("Quotes API Error:", error);
            return { status: 500, body: error.message };
        }
    }
});
