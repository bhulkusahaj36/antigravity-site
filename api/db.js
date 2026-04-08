const { MongoClient } = require('mongodb');

let client;
let db;

/**
 * Ensures a connection to the MongoDB cluster and returns the database instance.
 * Reuses the existing connection if already established (serverless cold start optimization).
 */
async function connectToDatabase() {
    if (db) return db;

    // Use MONGODB_URI or fallback to AzureCosmosDBConnectionString for compatibility
    const uri = process.env.MONGODB_URI || process.env.AzureCosmosDBConnectionString;
    
    if (!uri) {
        throw new Error("Missing MongoDB Connection String in Environment Variables (MONGODB_URI or AzureCosmosDBConnectionString)");
    }

    if (!client) {
        client = new MongoClient(uri);
        await client.connect();
        console.log("Connected successfully to MongoDB Atlas");
    }

    // Default database name is 'antigravity'
    db = client.db("antigravity");
    return db;
}

/**
 * Returns a MongoDB collection instance for the specified name.
 * @param {string} name - The name of the collection.
 */
async function getCollection(name) {
    const database = await connectToDatabase();
    return database.collection(name);
}

module.exports = { connectToDatabase, getCollection };
