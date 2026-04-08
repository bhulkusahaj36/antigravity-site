// ============================================================
// albums.js — Dedicated Azure Function for Album CRUD
// ============================================================

const { app } = require('@azure/functions');
const { getCollection } = require('../db');

// ── Auth ────────────────────────────────────────────────────────────────────
function isAuthorized(request) {
    const token = request.headers.get('X-Admin-Token');
    const expected = process.env.ADMIN_SECRET_TOKEN;
    if (!expected) return false;
    return token && token === expected;
}

app.http('albums', {
    methods: ['GET', 'POST', 'DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const col = await getCollection('articles');

            // ── GET — list all albums (public) ───────────────────────────
            if (request.method === 'GET') {
                const specificId = request.query.get('id');
                const filter = { type: 'album' };
                if (specificId) filter.id = specificId;

                const resources = await col.find(filter).sort({ title: 1 }).toArray();

                return {
                    jsonBody: specificId ? (resources[0] || null) : resources,
                    headers: {
                        'Cache-Control': 'public, max-age=300, stale-while-revalidate=900',
                        'Content-Type': 'application/json'
                    }
                };
            }

            // ── WRITE OPERATIONS — require auth ──────────────────────────
            if (!isAuthorized(request)) {
                return {
                    status: 401,
                    body: 'Unauthorized: missing or invalid X-Admin-Token',
                    headers: { 'Content-Type': 'text/plain' }
                };
            }

            // ── POST — create album ──────────────────────────────────────
            if (request.method === 'POST') {
                const rawData = await request.json();

                if (!rawData.title?.trim()) {
                    return { status: 400, body: 'Album title is required' };
                }
                if (rawData.title.length > 300) {
                    return { status: 400, body: 'Album title exceeds 300 characters' };
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
                return { status: 201, jsonBody: album };
            }

            // ── DELETE — remove album ────────────────────────────────────
            if (request.method === 'DELETE') {
                const albumId = request.query.get('id');
                if (!albumId) {
                    return { status: 400, body: 'Please pass ?id=<album-id>' };
                }

                await col.deleteOne({ id: albumId, type: 'album' });
                return { status: 204 };
            }

        } catch (error) {
            context.log("Albums Function Error:", error);
            return { status: 500, body: error.message };
        }
    }
});
