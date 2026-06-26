const { MongoClient } = require('mongodb');

// Use a global variable to persist the connection across serverless function invocations
let cachedClient = null;
let cachedDb = null;

/**
 * Ensures a connection to the MongoDB cluster and returns the database instance.
 */
async function connectToDatabase() {
    // If we have a cached connection, check if it's still alive
    if (cachedClient && cachedDb) {
        return cachedDb;
    }

    const uri = process.env.MONGODB_URI || process.env.AzureCosmosDBConnectionString;
    
    if (!uri) {
        throw new Error("Missing MongoDB Connection String");
    }

    // Options for high performance and stability in serverless
    const options = {
        maxPoolSize: 1, // Minimize connections in serverless
        connectTimeoutMS: 5000,
        socketTimeoutMS: 30000,
    };

    try {
        const client = new MongoClient(uri, options);
        await client.connect();
        
        const db = client.db("antigravity");
        
        // Cache the client and db
        cachedClient = client;
        cachedDb = db;
        
        console.log("Connected successfully to MongoDB Atlas");
        return db;
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
        // Reset cache on error
        cachedClient = null;
        cachedDb = null;
        throw error;
    }
}

async function getCollection(name) {
    const database = await connectToDatabase();
    return database.collection(name);
}

module.exports = { connectToDatabase, getCollection };
