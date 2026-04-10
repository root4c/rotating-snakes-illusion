export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders()
      });
    }

    if (url.pathname === '/submit' && request.method === 'POST') {
      try {
        const body = await request.json();

        if (!body || !Array.isArray(body.results) || body.results.length === 0) {
          return json({ ok: false, error: 'invalid_payload' }, 400);
        }

        const savedAt = new Date().toISOString();
        const id = body.participant_id || crypto.randomUUID();
        const payload = {
          participant_id: id,
          experiment_started_at: body.experiment_started_at || null,
          submitted_at: body.submitted_at || savedAt,
          saved_at: savedAt,
          results: body.results
        };

        await env.RESULTS.put(`responses/${savedAt}_${id}.json`, JSON.stringify(payload));
        return json({ ok: true, participant_id: id, saved_at: savedAt }, 200);
      } catch (err) {
        return json({ ok: false, error: 'server_error', detail: String(err) }, 500);
      }
    }

    if (url.pathname === '/health') {
      return json({ ok: true, service: 'rotating-snakes-submit-worker' }, 200);
    }

    return json({ ok: false, error: 'not_found' }, 404);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...corsHeaders()
    }
  });
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS, GET',
    'access-control-allow-headers': 'Content-Type'
  };
}
