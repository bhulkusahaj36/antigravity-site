const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');

let container;

async function getContainer() {
    if (container) return container;
    const connectionString = process.env.AzureCosmosDBConnectionString;
    if (!connectionString) {
        throw new Error("Missing AzureCosmosDBConnectionString in Environment Variables");
    }
    const client = new CosmosClient(connectionString);
    const database = client.database("antigravity");
    const dbContainer = database.container("articles");
    container = dbContainer;
    return container;
}

// ── Auth ────────────────────────────────────────────────────────────────────
function isAuthorized(request) {
    const token = request.headers.get('X-Admin-Token');
    const expected = process.env.ADMIN_SECRET_TOKEN;
    if (!expected) {
        // ADMIN_SECRET_TOKEN not set — write access disabled for safety
        return false;
    }
    return token && token === expected;
}

// ── Input Validation & Sanitization ─────────────────────────────────────────
function validateAndSanitize(data) {
    if (!data.title?.trim()) throw new Error('Title is required');
    if (data.title.length > 500) throw new Error('Title exceeds 500 characters');
    if (data.content?.length > 600_000) throw new Error('Content too large (>600KB)');

    // Strip script tags server-side as a defense-in-depth measure
    if (data.content) {
        data.content = data.content.replace(/<script[\s\S]*?<\/script>/gi, '');
    }

    // Whitelist allowed fields — drop anything unexpected
    const allowed = [
        'id', 'title', 'content', 'type', 'topic', 'source', 'prasang',
        'album', 'location', 'date', 'public', 'status', 'featured', 'author',
        'createdAt', 'updatedAt', 'category', 'excerpt'
    ];
    Object.keys(data).forEach(k => { if (!allowed.includes(k)) delete data[k]; });
    return data;
}

app.http('articles', {
    methods: ['GET', 'POST', 'DELETE', 'PATCH'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            // ── GET  (public, no auth required) ─────────────────────────────
            if (request.method === 'GET') {
                const c = await getContainer();

                const type              = request.query.get('type');
                const album             = request.query.get('album');
                const search            = request.query.get('search');
                const sortBy            = request.query.get('sortBy');
                const compact           = request.query.get('compact') === 'true';
                const specificId        = request.query.get('id');
                const status            = request.query.get('status');
                const limit             = parseInt(request.query.get('limit') || '0');
                const continuationToken = request.query.get('continuationToken') || null;

                // Legacy OFFSET support for backward compat (ignored when continuationToken is used)
                const page = parseInt(request.query.get('page') || '0');

                let query = compact
                    ? "SELECT c.id, c.title, c.author, c.source, c.topic, c.prasang, c.category, c.date, c.location, c.featured, c.public, c.type, c.album, c.status, c.createdAt, c.updatedAt, LEFT(c.content, 300) as excerpt FROM c"
                    : "SELECT * FROM c";

                let params = [];
                let conditions = [];

                if (type) {
                    conditions.push("c.type = @type");
                    params.push({ name: "@type", value: type });
                }
                if (album) {
                    conditions.push("c.album = @album");
                    params.push({ name: "@album", value: album });
                }
                if (search) {
                    conditions.push("(CONTAINS(c.title, @search, true) OR CONTAINS(c.content, @search, true))");
                    params.push({ name: "@search", value: search });
                }
                if (specificId) {
                    conditions.push("c.id = @specificId");
                    params.push({ name: "@specificId", value: specificId });
                }
                if (status) {
                    conditions.push("c.status = @status");
                    params.push({ name: "@status", value: status });
                }

                if (conditions.length > 0) {
                    query += " WHERE " + conditions.join(" AND ");
                }

                if (sortBy === 'createdAt_desc') {
                    query += " ORDER BY c.createdAt DESC";
                } else if (sortBy === 'createdAt_asc') {
                    query += " ORDER BY c.createdAt ASC";
                } else if (sortBy === 'updatedAt_desc') {
                    query += " ORDER BY c.updatedAt DESC";
                } else if (sortBy === 'updatedAt_asc') {
                    query += " ORDER BY c.updatedAt ASC";
                } else {
                    query += " ORDER BY c.id DESC";
                }

                const cacheSeconds = compact ? 300 : 60;
                let resources;
                let nextToken = null;

                if (limit > 0) {
                    // ── Continuation-token pagination ─────────────────────────
                    const querySpec = { query, parameters: params };
                    const iteratorOptions = {
                        maxItemCount: limit,
                        continuationToken: continuationToken || undefined
                    };
                    const iterator = c.items.query(querySpec, iteratorOptions);
                    const page_result = await iterator.fetchNext();
                    resources = page_result.resources;
                    nextToken = page_result.continuationToken || null;

                    return {
                        jsonBody: { items: resources, nextToken },
                        headers: {
                            'Cache-Control': `public, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 3}`,
                            'Content-Type': 'application/json'
                        }
                    };
                } else {
                    // ── No limit: fetch all (used by admin, search, etc.) ─────
                    const { resources: all } = await c.items.query({ query, parameters: params }).fetchAll();
                    return {
                        jsonBody: all,
                        headers: {
                            'Cache-Control': `public, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 3}`,
                            'Content-Type': 'application/json'
                        }
                    };
                }
            }

            // ── WRITE OPERATIONS — require auth ──────────────────────────────
            if (['POST', 'DELETE', 'PATCH'].includes(request.method)) {
                if (!isAuthorized(request)) {
                    return {
                        status: 401,
                        body: 'Unauthorized: missing or invalid X-Admin-Token',
                        headers: { 'Content-Type': 'text/plain' }
                    };
                }
            }

            // ── POST (create / upsert article) ───────────────────────────────
            if (request.method === 'POST') {
                const rawData = await request.json();
                const articleData = validateAndSanitize(rawData);
                const now = new Date().toISOString();
                const c = await getContainer();

                if (!articleData.id) {
                    articleData.id = Date.now().toString();
                    articleData.createdAt = now;
                } else {
                    articleData.id = String(articleData.id);
                    try {
                        const { resource: existing } = await c.item(articleData.id, articleData.id).read();
                        if (existing && existing.createdAt) {
                            articleData.createdAt = existing.createdAt;
                        } else {
                            articleData.createdAt = new Date(Number(articleData.id)).toISOString();
                        }
                    } catch (e) {
                        articleData.createdAt = new Date(Number(articleData.id)).toISOString();
                    }
                }

                articleData.updatedAt = now;

                const { resource } = await c.items.upsert(articleData);
                return { status: 201, jsonBody: resource };
            }

            // ── DELETE ───────────────────────────────────────────────────────
            if (request.method === 'DELETE') {
                const c = await getContainer();
                const singleId = request.query.get('id');
                if (singleId) {
                    await c.item(singleId, singleId).delete();
                    return { status: 204 };
                }
                const body = await request.json();
                if (body.ids && Array.isArray(body.ids)) {
                    let deleted = 0;
                    for (const id of body.ids) {
                        try {
                            await c.item(String(id), String(id)).delete();
                            deleted++;
                        } catch (e) { context.log(`Delete failed for ${id}:`, e.message); }
                    }
                    return { jsonBody: { deleted } };
                }
                return { status: 400, body: "Please pass an id or { ids: [...] }" };
            }

            // ── PATCH (bulk update) ──────────────────────────────────────────
            if (request.method === 'PATCH') {
                const body = await request.json();
                if (!body.ids || !Array.isArray(body.ids) || !body.updates) {
                    return { status: 400, body: "Provide { ids: [...], updates: { ... } }" };
                }
                const c = await getContainer();
                const now = new Date().toISOString();
                let updated = 0;
                for (const id of body.ids) {
                    try {
                        const { resource: existing } = await c.item(String(id), String(id)).read();
                        if (existing) {
                            Object.assign(existing, body.updates);
                            existing.updatedAt = now;
                            await c.items.upsert(existing);
                            updated++;
                        }
                    } catch (e) { context.log(`Patch failed for ${id}:`, e.message); }
                }
                return { jsonBody: { updated } };
            }

        } catch (error) {
            context.log("Cosmos DB Error:", error);
            return { status: 500, body: error.message };
        }
    }
});
