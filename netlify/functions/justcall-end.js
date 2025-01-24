import fetch from 'node-fetch';

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    const sessionId = event.path.split('/').pop();
    const apiKey = process.env.JUSTCALL_API_KEY;
    
    if (!apiKey) {
      throw new Error('JustCall API key is not configured');
    }

    const response = await fetch(`https://api.justcall.io/v1/calls/${sessionId}/end`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ message: 'Failed to end JustCall session' }));
      throw new Error(data.message || 'Failed to end JustCall session');
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('JustCall API error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
}