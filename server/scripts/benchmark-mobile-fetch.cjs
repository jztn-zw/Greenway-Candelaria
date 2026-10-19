// Read-only probes. Tokens, response bodies and resource IDs never enter output.
const month = () => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  return `${parts.find(part => part.type === 'year').value}-${parts.find(part => part.type === 'month').value}`;
};

async function run(env = process.env, fetchRequest = fetch, output = console.log) {
  const base = new URL(env.BENCHMARK_BASE_URL || 'http://127.0.0.1:2000');
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) throw Error('Use an HTTP(S) origin without embedded credentials.');
  const probes = [['health', '/health'], ['database-clock', '/api/time']];
  const add = (role, token, endpoints) => {
    if (!token) return;
    for (const [label, path] of endpoints) probes.push([`${role}:${label}`, `/api${path}`, token]);
  };
  add('resident', env.BENCHMARK_RESIDENT_TOKEN, [
    ['home-posts', '/posts?status=PUBLISHED&page=1&limit=3&sort=newest'],
    ['community', '/posts?status=PUBLISHED&page=1&limit=10'], ['reports', '/reports/my?page=1&limit=15'],
    ['profile', '/users/profile'], ['report-stats', '/reports/my/stats'],
    ['calendar', `/schedule/events?month=${month()}&visibility=PUBLIC`], ['collection-schedule', '/schedule'],
    ['notifications', '/notifications?category=all&web_category=all&limit=20'],
    ['notification-badge', '/notifications/unread-count'], ['tracking', '/tracking/live'],
  ]);
  add('collector', env.BENCHMARK_COLLECTOR_TOKEN, [
    ['assignment', '/routes/today/mine?include_finished=true'], ['vehicle', '/drivers/me'], ['profile', '/users/profile'],
    ['history', '/drivers/me/history?view=collector&limit=15'], ['calendar', `/schedule/events?view=collector&month=${month()}`],
    ['notifications', '/notifications?limit=100&exclude_messages=true'],
    ['notification-badge', '/notifications/unread-count?exclude_messages=true'],
    ['messages', '/drivers/me/messages/conversation?limit=50'],
  ]);
  const samples = Math.min(5, Math.max(1, Number.parseInt(env.BENCHMARK_SAMPLES, 10) || 3));
  for (const [label, path, token] of probes) {
    const results = [];
    for (let i = 0; i < samples; i++) {
      const start = performance.now();
      try {
        const response = await fetchRequest(new URL(path, base.origin), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          redirect: 'error', signal: AbortSignal.timeout(20_000),
        });
        const bytes = (await response.arrayBuffer()).byteLength;
        results.push({ status: response.status, ms: Math.round(performance.now() - start), bytes });
        if (response.status === 401 || response.status === 403 || response.status === 429) break;
      } catch { results.push({ status: 'network-error', ms: Math.round(performance.now() - start) }); break; }
    }
    output(JSON.stringify({ label, samples: results }));
  }
}

module.exports = { run };
if (require.main === module) run().catch(() => { console.error('Benchmark configuration is invalid.'); process.exitCode = 1; });
