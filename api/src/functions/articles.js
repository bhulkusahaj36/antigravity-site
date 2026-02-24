const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');

let container;

function getContainer() {
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

app.http('articles', {
    methods: ['GET', 'POST', 'DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            if (request.method === 'GET') {
                const c = getContainer();
                const { resources } = await c.items.readAll().fetchAll();
                return { jsonBody: resources };
            }

            if (request.method === 'POST') {
                const articleData = await request.json();

                // If it doesn't have an ID, give it a timestamp-based ID
                if (!articleData.id) {
                    articleData.id = Date.now().toString();
                }

                const c = getContainer();
                const { resource } = await c.items.create(articleData);
                return { status: 201, jsonBody: resource };
            }

            if (request.method === 'DELETE') {
                const id = request.query.get('id');
                if (!id) {
                    return { status: 400, body: "Please pass an id on the query string" };
                }

                const c = getContainer();
                await c.item(id, id).delete();
                return { status: 204 };
            }

        } catch (error) {
            context.log("Error interacting with Cosmos DB:", error);
            return {
                status: 500,
                body: "Error connecting to database: " + error.message
            };
        }
    }
});
