// /api/places.js
// Complete Vercel backend with Chrome Extension ID authentication

export default async function handler(req, res) {
  // Get environment variables
  const allowedExtensionId = process.env.ALLOWED_EXTENSION_ID; // Your extension ID
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY; // Your Google API key
  
  // Get request origin
  const origin = req.headers.origin;
  
  console.log('Request origin:', origin);
  
  // Validate origin is from a Chrome extension
  if (!origin || !origin.startsWith('chrome-extension://')) {
    console.log('❌ Request not from Chrome extension');
    return res.status(403).json({ 
      error: 'Forbidden - Requests must come from Chrome extension' 
    });
  }
  
  // Extract extension ID from origin
  const requestExtensionId = origin.replace('chrome-extension://', '');
  console.log('Extension ID:', requestExtensionId);
  
  // Validate extension ID matches
  if (requestExtensionId !== allowedExtensionId) {
    console.log('❌ Extension ID mismatch');
    console.log('Expected:', allowedExtensionId);
    console.log('Received:', requestExtensionId);
    return res.status(403).json({ 
      error: 'Forbidden - Invalid extension ID' 
    });
  }
  
  console.log('✅ Extension ID validated');
  
  // Set CORS headers for the validated extension
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Parse request body
    const { location, radius } = req.body;
    
    // Validate request parameters
    if (!location || !location.lat || !location.lon || !radius) {
      return res.status(400).json({ 
        error: 'Invalid request - location and radius required' 
      });
    }
    
    // Validate Google API key is configured
    if (!googleApiKey) {
      console.error('❌ GOOGLE_PLACES_API_KEY not configured');
      return res.status(500).json({ 
        error: 'Server configuration error' 
      });
    }
    
    console.log(`🔍 Fetching restaurants for location: ${location.lat}, ${location.lon}`);
    
    // Build Google Places API URL
    const googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lon}&radius=${radius}&type=restaurant&key=${googleApiKey}`;
    
    // Make request to Google Places API
    const googleResponse = await fetch(googleUrl);
    
    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();
      console.error('❌ Google API error:', errorText);
      return res.status(googleResponse.status).json({ 
        error: 'Google Places API request failed' 
      });
    }
    
    // Parse Google API response
    const data = await googleResponse.json();
    
    // Check for API errors
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('❌ Google API status:', data.status);
      return res.status(500).json({ 
        error: `Google API error: ${data.status}`,
        details: data.error_message 
      });
    }
    
    console.log(`✅ Successfully fetched ${data.results?.length || 0} results`);
    
    // Return results
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('❌ Server error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
