export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (url.pathname === '/health') {
      return json({ ok: true, service: 'rotating-snakes-submit' });
    }

    if (url.pathname === '/assign' && request.method === 'GET') {
      const participantId = url.searchParams.get('participant_id') || crypto.randomUUID();
      const coordinatorId = env.ASSIGNMENT_COORDINATOR.idFromName('global');
      const stub = env.ASSIGNMENT_COORDINATOR.get(coordinatorId);
      const response = await stub.fetch(`https://internal/next?participant_id=${encodeURIComponent(participantId)}`);
      const data = await response.json();

      const anchorId = 'ANCHOR_01';
      const anchorFile = 'stimuli/anchor.png';
      const stimuli = (GROUPS[data.group_index] || []).map((id) => ({
        id,
        file: `stimuli/${id}.png`
      }));

      return json({
        participant_id: participantId,
        mode: 'durable-object-round-robin',
        group_index: data.group_index,
        anchor_id: anchorId,
        anchor_file: anchorFile,
        stimuli
      });
    }

    if (url.pathname === '/submit' && request.method === 'POST') {
      const body = await request.json();
      validateSubmission(body);

      const key = `submission:${body.participant_id}`;
      await env.RESULTS.put(key, JSON.stringify(body));
      return json({
        ok: true,
        message: '응답이 서버에 저장되었습니다.',
        key
      });
    }

    if (url.pathname === '/export.csv' && request.method === 'GET') {
      requireAdmin(url, env);
      const csv = await exportCsv(env.RESULTS);
      return new Response(csv, {
        status: 200,
        headers: {
          ...corsHeaders(),
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': 'attachment; filename="rotating-snakes-export.csv"'
        }
      });
    }

    if (url.pathname === '/export.json' && request.method === 'GET') {
      requireAdmin(url, env);
      const rows = await readAllRows(env.RESULTS);
      return json({ ok: true, rows, count: rows.length });
    }

    if (url.pathname === '/summary' && request.method === 'GET') {
      requireAdmin(url, env);
      const rows = await readAllRows(env.RESULTS);
      const summary = buildSummary(rows);
      return json({ ok: true, summary });
    }

    return json({ ok: false, error: 'Not found' }, 404);
  }
};

export class AssignmentCoordinator {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/next') {
      const participantId = url.searchParams.get('participant_id') || crypto.randomUUID();

      let meta = await this.state.storage.get('meta');
      if (!meta) meta = { next_index: 0, assignments: {} };

      if (meta.assignments[participantId] !== undefined) {
        return new Response(JSON.stringify({
          participant_id: participantId,
          group_index: meta.assignments[participantId]
        }), { headers: { 'content-type': 'application/json' } });
      }

      const groupIndex = meta.next_index % GROUPS.length;
      meta.assignments[participantId] = groupIndex;
      meta.next_index += 1;
      await this.state.storage.put('meta', meta);

      return new Response(JSON.stringify({
        participant_id: participantId,
        group_index: groupIndex
      }), { headers: { 'content-type': 'application/json' } });
    }

    return new Response('Not found', { status: 404 });
  }
}

function validateSubmission(body) {
  if (!body || typeof body !== 'object') throw new Error('Invalid JSON body');
  if (!body.participant_id || typeof body.participant_id !== 'string') throw new Error('participant_id is required');
  if (!Array.isArray(body.results) || body.results.length === 0) throw new Error('results must be a non-empty array');
}

async function exportCsv(resultsKv) {
  const rows = await readAllRows(resultsKv);
  const header = [
    'participant_id', 'group_index', 'assignment_mode', 'started_at', 'submitted_at',
    'trial_index', 'trial_id', 'trial_kind', 'score', 'shown_at', 'answered_at', 'response_ms', 'user_agent'
  ];
  const lines = [header.join(',')];

  for (const row of rows) {
    const base = {
      participant_id: row.participant_id || '',
      group_index: row.group_index ?? '',
      assignment_mode: row.assignment_mode || '',
      started_at: row.started_at || '',
      submitted_at: row.submitted_at || '',
      user_agent: row.user_agent || ''
    };

    for (const result of row.results || []) {
      lines.push([
        csvEscape(base.participant_id),
        csvEscape(base.group_index),
        csvEscape(base.assignment_mode),
        csvEscape(base.started_at),
        csvEscape(base.submitted_at),
        csvEscape(result.trial_index),
        csvEscape(result.trial_id),
        csvEscape(result.trial_kind),
        csvEscape(result.score),
        csvEscape(result.shown_at),
        csvEscape(result.answered_at),
        csvEscape(result.response_ms),
        csvEscape(base.user_agent)
      ].join(','));
    }
  }
  return lines.join('\n');
}

async function readAllRows(resultsKv) {
  let cursor = undefined;
  const rows = [];

  while (true) {
    const page = await resultsKv.list({ prefix: 'submission:', cursor });
    for (const key of page.keys) {
      const raw = await resultsKv.get(key.name);
      if (!raw) continue;
      rows.push(JSON.parse(raw));
    }
    if (page.list_complete) break;
    cursor = page.cursor;
  }

  rows.sort((a, b) => String(a.submitted_at || '').localeCompare(String(b.submitted_at || '')));
  return rows;
}

function buildSummary(rows) {
  const participants = rows.length;
  const groupCounts = {};
  const trialCounts = {};

  for (const row of rows) {
    const g = String(row.group_index ?? 'unknown');
    groupCounts[g] = (groupCounts[g] || 0) + 1;
    for (const result of row.results || []) {
      const id = result.trial_id;
      trialCounts[id] = (trialCounts[id] || 0) + 1;
    }
  }

  return { participants, groupCounts, trialCounts };
}

function requireAdmin(url, env) {
  const token = url.searchParams.get('token');
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    throw new Response('Unauthorized', { status: 401, headers: corsHeaders() });
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...corsHeaders(),
      'content-type': 'application/json; charset=utf-8'
    }
  });
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'Content-Type'
  };
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const GROUPS = [
  [
    "A1_B1_C4",
    "A1_B2_C3",
    "A1_B3_C1",
    "A1_B3_C3",
    "A1_B4_C3",
    "A1_B4_C4",
    "A2_B1_C2",
    "A2_B1_C4",
    "A2_B2_C4",
    "A2_B3_C3",
    "A2_B4_C1",
    "A2_B4_C3",
    "A3_B1_C2",
    "A3_B1_C3",
    "A3_B2_C2",
    "A3_B2_C4",
    "A3_B3_C1",
    "A3_B4_C1",
    "A4_B1_C1",
    "A4_B2_C2",
    "A4_B2_C4",
    "A4_B3_C1",
    "A4_B3_C2",
    "A4_B4_C2"
  ],
  [
    "A1_B1_C1",
    "A1_B2_C1",
    "A1_B2_C2",
    "A1_B2_C4",
    "A1_B3_C2",
    "A1_B4_C2",
    "A2_B1_C1",
    "A2_B1_C4",
    "A2_B2_C2",
    "A2_B3_C1",
    "A2_B3_C3",
    "A2_B4_C3",
    "A3_B1_C1",
    "A3_B1_C3",
    "A3_B1_C4",
    "A3_B2_C1",
    "A3_B3_C2",
    "A3_B4_C4",
    "A4_B2_C3",
    "A4_B3_C3",
    "A4_B3_C4",
    "A4_B4_C2",
    "A4_B4_C3",
    "A4_B4_C4"
  ],
  [
    "A1_B1_C2",
    "A1_B1_C3",
    "A1_B3_C2",
    "A1_B3_C3",
    "A1_B4_C1",
    "A1_B4_C2",
    "A2_B1_C1",
    "A2_B1_C3",
    "A2_B2_C1",
    "A2_B2_C4",
    "A2_B3_C1",
    "A2_B4_C4",
    "A3_B2_C1",
    "A3_B2_C2",
    "A3_B2_C4",
    "A3_B3_C2",
    "A3_B3_C3",
    "A3_B4_C3",
    "A4_B1_C3",
    "A4_B1_C4",
    "A4_B2_C4",
    "A4_B3_C2",
    "A4_B4_C1",
    "A4_B4_C4"
  ],
  [
    "A1_B1_C2",
    "A1_B1_C4",
    "A1_B2_C2",
    "A1_B2_C3",
    "A1_B3_C1",
    "A1_B4_C4",
    "A2_B2_C2",
    "A2_B2_C3",
    "A2_B3_C2",
    "A2_B4_C1",
    "A2_B4_C2",
    "A2_B4_C4",
    "A3_B1_C3",
    "A3_B1_C4",
    "A3_B3_C3",
    "A3_B3_C4",
    "A3_B4_C1",
    "A3_B4_C2",
    "A4_B1_C1",
    "A4_B1_C3",
    "A4_B2_C1",
    "A4_B2_C4",
    "A4_B3_C1",
    "A4_B3_C3"
  ],
  [
    "A1_B1_C1",
    "A1_B1_C3",
    "A1_B1_C4",
    "A1_B3_C2",
    "A1_B3_C4",
    "A1_B4_C3",
    "A2_B1_C1",
    "A2_B2_C1",
    "A2_B2_C3",
    "A2_B3_C4",
    "A2_B4_C2",
    "A2_B4_C4",
    "A3_B2_C1",
    "A3_B2_C2",
    "A3_B2_C3",
    "A3_B3_C2",
    "A3_B3_C3",
    "A3_B4_C4",
    "A4_B1_C2",
    "A4_B1_C3",
    "A4_B2_C1",
    "A4_B3_C2",
    "A4_B4_C1",
    "A4_B4_C4"
  ],
  [
    "A1_B1_C1",
    "A1_B1_C2",
    "A1_B2_C1",
    "A1_B2_C4",
    "A1_B4_C1",
    "A1_B4_C2",
    "A2_B1_C2",
    "A2_B2_C1",
    "A2_B3_C2",
    "A2_B3_C3",
    "A2_B3_C4",
    "A2_B4_C3",
    "A3_B1_C2",
    "A3_B2_C3",
    "A3_B2_C4",
    "A3_B3_C4",
    "A3_B4_C2",
    "A3_B4_C3",
    "A4_B1_C1",
    "A4_B1_C4",
    "A4_B2_C3",
    "A4_B3_C1",
    "A4_B3_C4",
    "A4_B4_C3"
  ],
  [
    "A1_B1_C3",
    "A1_B2_C1",
    "A1_B3_C1",
    "A1_B3_C4",
    "A1_B4_C3",
    "A1_B4_C4",
    "A2_B1_C3",
    "A2_B1_C4",
    "A2_B2_C2",
    "A2_B3_C2",
    "A2_B4_C1",
    "A2_B4_C2",
    "A3_B1_C1",
    "A3_B1_C4",
    "A3_B2_C3",
    "A3_B3_C1",
    "A3_B3_C4",
    "A3_B4_C4",
    "A4_B1_C2",
    "A4_B2_C1",
    "A4_B2_C2",
    "A4_B2_C3",
    "A4_B3_C3",
    "A4_B4_C2"
  ],
  [
    "A1_B2_C2",
    "A1_B2_C3",
    "A1_B2_C4",
    "A1_B3_C3",
    "A1_B3_C4",
    "A1_B4_C1",
    "A2_B1_C2",
    "A2_B1_C3",
    "A2_B2_C3",
    "A2_B2_C4",
    "A2_B3_C1",
    "A2_B3_C4",
    "A3_B1_C1",
    "A3_B1_C2",
    "A3_B3_C1",
    "A3_B4_C1",
    "A3_B4_C2",
    "A3_B4_C3",
    "A4_B1_C2",
    "A4_B1_C4",
    "A4_B2_C2",
    "A4_B3_C4",
    "A4_B4_C1",
    "A4_B4_C3"
  ]
];
