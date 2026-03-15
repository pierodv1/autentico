export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  try {
    const { messages, system } = await req.json();
    const GEMINI_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_KEY) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY non configurata su Vercel → Settings → Environment Variables.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const userText = system
      ? system + '\n\n' + (messages[messages.length - 1]?.content || '')
      : (messages[messages.length - 1]?.content || '');

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_KEY;

    // Use responseSchema to force perfectly valid JSON every time
    const responseSchema = {
      type: 'object',
      properties: {
        title:       { type: 'string' },
        region:      { type: 'string' },
        country:     { type: 'string' },
        emoji:       { type: 'string' },
        difficulty:  { type: 'string', enum: ['Facile', 'Medio', 'Difficile'] },
        time_minutes:{ type: 'integer' },
        portions:    { type: 'integer' },
        description: { type: 'string' },
        ingredients: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              qty:  { type: 'string' }
            },
            required: ['name', 'qty']
          }
        },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text:  { type: 'string' },
              tip:   { type: 'string' },
              timer: { type: 'integer' }
            },
            required: ['text', 'tip', 'timer']
          }
        },
        notes: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['title','region','country','emoji','difficulty','time_minutes','portions','description','ingredients','steps','notes']
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
          responseSchema: responseSchema
        }
      })
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data.error?.message || 'Errore ' + res.status;
      return new Response(JSON.stringify({ error: errMsg }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Verify it's valid JSON before returning
    try {
      JSON.parse(text);
    } catch(e) {
      return new Response(JSON.stringify({ error: 'Risposta AI non valida, riprova.' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response(JSON.stringify({ text }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
