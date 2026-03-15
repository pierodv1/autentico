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
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY non configurata. Vai su Vercel → Settings → Environment Variables.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const userText = system
      ? system + '\n\n' + (messages[messages.length - 1]?.content || '')
      : (messages[messages.length - 1]?.content || '');

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_KEY;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
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
