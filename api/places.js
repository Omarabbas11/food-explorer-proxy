export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Auth-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get tokens
    const receivedToken = req.headers['x-auth-token'];
    const expectedToken = process.env.API_AUTH_TOKEN;
    
    // DEBUG LOGGING
    console.log('=== AUTH DEBUG ===');
    console.log('Received token:', receivedToken);
    console.log('Expected token:', expectedToken);
    console.log('Match:', receivedToken === expectedToken);
    console.log('================');
    
    if (!receivedToken) {
      console.error('❌ No token received in headers');
      return res.status(401).json({ error: 'No auth token provided' });
    }
    
    if (!expectedToken) {
      console.error('❌ No token configured in environment');
      return res.status(500).json({ error: 'Server not configured' });
    }
    
    if (receivedToken !== expectedToken) {
      console.error('❌ Token mismatch');
      return res.status(401).json({ 
        error: 'Invalid token',
        debug: {
          receivedLength: receivedToken.length,
          expectedLength: expectedToken.length
        }
      });
    }

    console.log('✅ Auth successful');

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.error('❌ Missing API key');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.types,places.primaryType,places.nationalPhoneNumber,places.websiteUri,places.businessStatus,places.currentOpeningHours'
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Google API error:', errorData);
      return res.status(response.status).json({ 
        error: errorData.error?.message |
