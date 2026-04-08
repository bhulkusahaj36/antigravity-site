const { app } = require('@azure/functions');
const { getCollection } = require('../db');

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
            const col = await getCollection('articles');

            // ── GET  (public, no auth required) ─────────────────────────────
            if (request.method === 'GET') {
                const type              = request.query.get('type');
                const album             = request.query.get('album');
                const search            = request.query.get('search');
                const sortBy            = request.query.get('sortBy');
                const compact           = request.query.get('compact') === 'true';
                const specificId        = request.query.get('id');
                const status            = request.query.get('status');
                const limit             = parseInt(request.query.get('limit') || '0');
                const continuationToken = request.query.get('continuationToken') || null;

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
                let resources;
                let nextToken = null;

                if (limit > 0) {
                    const skip = parseInt(continuationToken) || 0;
                    resources = await col.find(filter)
                        .sort(sortObj)
                        .skip(skip)
                        .limit(limit)
                        .toArray();
                    
                    nextToken = resources.length === limit ? String(skip + limit) : null;

                    if (compact) {
                        resources = resources.map(r => {
                            const { content, ...rest } = r;
                            return {
                                ...rest,
                                excerpt: content ? (content.substring(0, 300) + (content.length > 300 ? '...' : '')) : ""
                            };
                        });
                    }

                    return {
                        jsonBody: { items: resources, nextToken },
                        headers: {
                            'Cache-Control': `public, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 3}`,
                            'Content-Type': 'application/json'
                        }
                    };
                } else {
                    resources = await col.find(filter).sort(sortObj).toArray();
                    
                    if (compact) {
                        resources = resources.map(r => {
                            const { content, ...rest } = r;
                            return {
                                ...rest,
                                excerpt: content ? (content.substring(0, 300) + (content.length > 300 ? '...' : '')) : ""
                            };
                        });
                    }

                    return {
                        jsonBody: resources,
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
                return { status: 201, jsonBody: articleData };
            }

            // ── DELETE ───────────────────────────────────────────────────────
            if (request.method === 'DELETE') {
                const singleId = request.query.get('id');
                if (singleId) {
                    await col.deleteOne({ id: singleId });
                    return { status: 204 };
                }
                const body = await request.json();
                if (body.ids && Array.isArray(body.ids)) {
                    const result = await col.deleteMany({ id: { $in: body.ids.map(String) } });
                    return { jsonBody: { deleted: result.deletedCount } };
                }
                return { status: 400, body: "Please pass an id or { ids: [...] }" };
            }

            // ── PATCH (bulk update) ──────────────────────────────────────────
            if (request.method === 'PATCH') {
                const body = await request.json();
                if (!body.ids || !Array.isArray(body.ids) || !body.updates) {
                    return { status: 400, body: "Provide { ids: [...], updates: { ... } }" };
                }
                const now = new Date().toISOString();
                const updates = { ...body.updates, updatedAt: now };
                
                const result = await col.updateMany(
                    { id: { $in: body.ids.map(String) } },
                    { $set: updates }
                );
                
                return { jsonBody: { updated: result.modifiedCount } };
            }

        } catch (error) {
            context.log("MongoDB API Error:", error);
            return { status: 500, body: error.message };
        }
    }
});
