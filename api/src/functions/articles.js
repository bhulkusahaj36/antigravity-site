const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');

const connectionString = process.env.AzureCosmosDBConnectionString;
const client = new CosmosClient(connectionString);
const database = client.database("antigravity");
const container = database.container("articles");

app.http('articles', {
    methods: ['GET', 'POST', 'DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            if (request.method === 'GET') {
                const { resources } = await container.items.readAll().fetchAll();
                return { jsonBody: resources };
            }

            if (request.method === 'POST') {
                const articleData = await request.json();

                // If it doesn't have an ID, give it a timestamp-based ID
                if (!articleData.id) {
                    articleData.id = Date.now().toString();
                }

                const { resource } = await container.items.create(articleData);
                return { status: 201, jsonBody: resource };
            }

            if (request.method === 'DELETE') {
                const id = request.query.get('id');
                if (!id) {
                    return { status: 400, body: "Please pass an id on the query string" };
                }

                await container.item(id, id).delete();
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
