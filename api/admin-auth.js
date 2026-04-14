const admin = require('firebase-admin');

// Ensure firebase-admin is only initialized once
if (!admin.apps.length) {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountVar) {
        try {
            const serviceAccount = JSON.parse(serviceAccountVar);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } catch (e) {
            console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", e);
        }
    } else {
         console.warn("FIREBASE_SERVICE_ACCOUNT environment variable is missing - Token verification will fail!");
    }
}

/**
 * Middleware or helper to verify Firebase ID Token from Authorization header
 * @param {Object} req - The incoming request object
 * @returns {Promise<boolean>} - True if authorized
 */
async function isAuthorized(req) {
    // 1. Fallback for legacy static token (for transition and CLI tools)
    const staticToken = req.headers['x-admin-token'];
    const expected = process.env.ADMIN_SECRET_TOKEN;
    if (staticToken && expected && staticToken === expected) {
        return true;
    }

    // 2. Check Bearer Token (New Firebase Auth method)
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // If admin is not initialized, we can't verify
    if (!admin.apps.length) {
        console.error("Firebase Admin NOT initialized. Check FIREBASE_SERVICE_ACCOUNT env variable.");
        return false;
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        // User is valid
        return !!decodedToken;
    } catch (error) {
        console.error("Firebase Token Verification Error:", error.message);
        return false;
    }
}

module.exports = { isAuthorized, admin };
