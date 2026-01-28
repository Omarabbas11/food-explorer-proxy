export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const extensionId = req.headers['x-extension-id']?.trim();
    const authToken = req.headers['x-auth-token']?.trim();

    const ALLOWED_EXTENSION_ID = process.env.ALLOWED_EXTENSION_ID?.trim();
    const ALLOWED_AUTH_TOKEN = process.env.ALLOWED_AUTH_TOKEN?.trim();

    // Primary: Official extension ID (production)
    if (ALLOWED_EXTENSION_ID && extensionId === ALLOWED_EXTENSION_ID) {
        // Authorized via official extension
        console.log('Authorized via official extension ID');
    }
    // Secondary: Fallback token (testing only)
    else if (ALLOWED_AUTH_TOKEN && authToken === ALLOWED_AUTH_TOKEN) {
        console.warn('Authorized via fallback token (testing mode)');
        // Optional: add rate-limiting or logging here to monitor testing usage
    }
    // Reject everything else
    else {
        console.warn('Unauthorized request attempt', { extensionId, hasToken: !!authToken });
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Forward to Google Places API
    try {
        const googleResponse = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
                'X-Goog-FieldMask': '*'  // Adjust field mask as needed for bandwidth/quotas
            },
            body: req.body  // req.body is already parsed JSON in Vercel
        });

        const data = await googleResponse.json();
        res.status(googleResponse.status).json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
