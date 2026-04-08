const { CosmosClient } = require('@azure/cosmos');
const fs = require('fs');

const connectionString = process.env.AzureCosmosDBConnectionString || "AccountEndpoint=https://hariprabodhamathamrut.documents.azure.com:443/;AccountKey=YOUR_KEY_HERE;";

async function exportData() {
    const client = new CosmosClient(connectionString);
    const container = client.database("antigravity").container("articles");

    console.log("Connecting to CosmosDB...");

    const { resources: all } = await container.items
        .query("SELECT * FROM c")
        .fetchAll();

    const albums = all.filter(i => i.type === 'album');
    const articles = all.filter(i => i.type === 'article');
    const quotes = all.filter(i => i.type === 'quote');

    fs.writeFileSync('backup_all.json', JSON.stringify(all, null, 2));
    fs.writeFileSync('backup_albums.json', JSON.stringify(albums, null, 2));
    fs.writeFileSync('backup_articles.json', JSON.stringify(articles, null, 2));
    fs.writeFileSync('backup_quotes.json', JSON.stringify(quotes, null, 2));

    console.log(`✅ Export complete!`);
    console.log(`   Albums:   ${albums.length}`);
    console.log(`   Articles: ${articles.length}`);
    console.log(`   Quotes:   ${quotes.length}`);
    console.log(`   Total:    ${all.length} items`);
}

exportData().catch(console.error);