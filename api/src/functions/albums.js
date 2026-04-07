// ============================================================
// albums.js — Dedicated Azure Function for Album CRUD
//
// GET    /api/albums               — List all albums (public)
// POST   /api/albums               — Create album (admin)
// DELETE /api/albums?id=<id>       — Delete album (admin)
//
// Albums are stored in the articles container with type='album'.
// This keeps infrastructure simple (no new CosmosDB container needed).
// ============================================================

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
    container = database.container("articles");
    return container;
}

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
            // ── GET — list all albums (public) ───────────────────────────
            if (request.method === 'GET') {
                const c = await getContainer();

                const specificId = request.query.get('id');

                let query;
                let params = [];

                if (specificId) {
                    query = "SELECT * FROM c WHERE c.type = 'album' AND c.id = @id";
                    params.push({ name: '@id', value: specificId });
                } else {
                    query = "SELECT c.id, c.title, c.description, c.type, c.createdAt, c.updatedAt FROM c WHERE c.type = 'album' ORDER BY c.title ASC";
                }

                const { resources } = await c.items.query({ query, parameters: params }).fetchAll();

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

                const c = await getContainer();
                const now = new Date().toISOString();

                const album = {
                    id: rawData.id || Date.now().toString(),
                    title: rawData.title.trim(),
                    description: rawData.description?.trim() || '',
                    type: 'album',
                    createdAt: now,
                    updatedAt: now
                };

                const { resource } = await c.items.upsert(album);
                return { status: 201, jsonBody: resource };
            }

            // ── DELETE — remove album ────────────────────────────────────
            if (request.method === 'DELETE') {
                const albumId = request.query.get('id');
                if (!albumId) {
                    return { status: 400, body: 'Please pass ?id=<album-id>' };
                }

                const c = await getContainer();
                await c.item(albumId, albumId).delete();

                return { status: 204 };
            }

        } catch (error) {
            context.log("Albums Function Error:", error);
            return { status: 500, body: error.message };
        }
    }
});
