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

    // Assume Database and Container already exist
    const database = client.database("antigravity");
    const dbContainer = database.container("articles");

    container = dbContainer;
    return container;
}

app.http('articles', {
    methods: ['GET', 'POST', 'DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            if (request.method === 'GET') {
                const c = await getContainer();
                
                const type = request.query.get('type');
                const album = request.query.get('album');
                const search = request.query.get('search');
                const page = parseInt(request.query.get('page') || '0');
                const limit = parseInt(request.query.get('limit') || '0');

                let query = "SELECT * FROM c";
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
                    // Use CONTAINS for case-insensitive search across title and content
                    conditions.push("(CONTAINS(c.title, @search, true) OR CONTAINS(c.content, @search, true))");
                    params.push({ name: "@search", value: search });
                }

                if (conditions.length > 0) {
                    query += " WHERE " + conditions.join(" AND ");
                }

                // Sorting (id is timestamp string, but let's assume we want newest first)
                query += " ORDER BY c.id DESC";

                if (limit > 0) {
                    query += ` OFFSET ${page * limit} LIMIT ${limit}`;
                }

                const { resources } = await c.items.query({ query, parameters: params }).fetchAll();
                return { jsonBody: resources };
            }

            if (request.method === 'POST') {
                const articleData = await request.json();
                if (!articleData.id) {
                    articleData.id = Date.now().toString();
                } else {
                    articleData.id = String(articleData.id);
                }

                const c = await getContainer();
                const { resource } = await c.items.upsert(articleData);
                return { status: 201, jsonBody: resource };
            }

            if (request.method === 'DELETE') {
                const id = request.query.get('id');
                if (!id) return { status: 400, body: "Please pass an id" };

                const c = await getContainer();
                await c.item(id, id).delete();
                return { status: 204 };
            }

        } catch (error) {
            context.log("Cosmos DB Error:", error);
            return { status: 500, body: error.message };
        }
    }
});
