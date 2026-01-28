// /api/places.js
// Hybrid authentication: Extension ID (primary) + Token (fallback)

export default async function handler(req, res) {
  const allowedExtensionId = process.env.ALLOWED_EXTENSION_ID;
  const devAuthToken = process.env.API_AUTH_TOKEN;
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
  
  const origin = req.headers.origin;
  const authToken = req.headers['x-auth-token'];
  
  let isAuthorized = false;
  let authMethod = 'none';
  
  // METHOD 1 (PRIMARY): Check Extension ID
  if (origin && origin.startsWith('chrome-extension://')) {
    const requestExtensionId = origin.replace('chrome-extension://', '');
    
    if (allowedExtensionId && requestExtensionId === allowedExtensionId) {
      isAuthorized = true;
      authMethod = 'extension-id';
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  }
  
  // METHOD 2 (FALLBACK): Check Auth Token
  if (!isAuthorized && devAuthToken && authToken === devAuthToken) {
    isAuthorized = true;
    authMethod = 'token';
    
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Auth-Token');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (!isAuthorized) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { includedTypes, maxResultCount, locationRestriction, rankPreference } = req.body;
    
    if (!locationRestriction || !locationRestriction.circle) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    
    if (!googleApiKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const requestBody = {
      includedTypes,
      maxResultCount,
      locationRestriction,
      rankPreference,
      languageCode: 'en'
    };
    
    const googleResponse = await fetch(
      'https://places.googleapis.com/v1/places:searchNearby',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googleApiKey,
          'X-Goog-FieldMask': 'places.displayName,places.id,places.types,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.internationalPhoneNumber,places.nationalPhoneNumber,places.websiteUri,places.currentOpeningHours,places.photos'
        },
        body: JSON.stringify(requestBody)
      }
    );
    
    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();
      return res.status(googleResponse.status).json({ error: 'Google API error', details: errorText });
    }
    
    const data = await googleResponse.json();
    return res.status(200).json(data);
    
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
