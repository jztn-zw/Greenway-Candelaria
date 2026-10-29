const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture(status = 'RESOLVED', overrides = {}, { legacySchema = false, unrelatedMissingColumn = false, reviewed = false, linked = false } = {}) {
  const row = { id: 'report', reference_number: 'RPT-2026-00001', user_id: 'owner',
    status, deleted_at: null, resident_hidden_at: null, ...overrides };
  const events = [], audits = [], writes = [], transactions = [];
  let failUpdate = false;
  let removed = false;
  const query = async (sql, params = []) => {
    if ((legacySchema && sql.includes('resident_hidden_at')) || unrelatedMissingColumn) {
      const error = new Error(`Unknown column '${unrelatedMissingColumn ? 'barangay_name' : 'r.resident_hidden_at'}' in 'where clause'`);
      error.code = 'ER_BAD_FIELD_ERROR';
      throw error;
    }
    if (sql.startsWith('DELETE FROM reports')) {
      writes.push(sql);
      if (failUpdate) throw new Error('write failed');
      assert.deepEqual(Array.from(params), ['report']);
      removed = true;
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('AS has_review_history')) return [[{ has_notes: Number(reviewed), has_review_history: Number(reviewed), has_linked_reports: Number(linked) }]];
    if (sql.startsWith('UPDATE reports')) {
      writes.push(sql);
      if (failUpdate) throw new Error('write failed');
      if (sql.includes('resident_hidden_at')) row.resident_hidden_at = '2026-10-30 01:00:00';
      else row.deleted_at = '2026-10-30 01:00:00';
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('FROM report_photos') || sql.includes('FROM report_status_history') || sql.includes('FROM report_notes')) return [[]];
    if (sql.includes('FROM reports')) {
      const visible = !removed && !row.deleted_at && (!sql.includes('resident_hidden_at IS NULL') || !row.resident_hidden_at);
      if (sql.includes('FOR UPDATE')) {
        assert.equal(transactions.at(-1), 'begin');
        return [removed || row.deleted_at ? [] : [{ ...row }]];
      }
      if (sql.includes('COUNT(*)')) {
        if (sql.includes("SUM(status = 'RESOLVED')")) return [[{ total: Number(visible), resolved: Number(visible) }]];
        if (sql.includes('AS submitted')) return [[{ total: Number(visible), resolved: Number(visible) }]];
        return [[{ total: Number(visible) }]];
      }
      if (sql.includes('r.user_id = ?')) assert.equal(params[0], 'owner');
      return [visible ? [{ ...row }] : []];
    }
    throw new Error(`Unexpected query: ${sql}`);
  };
  const conn = { query, beginTransaction: async () => transactions.push('begin'),
    commit: async () => transactions.push('commit'), rollback: async () => transactions.push('rollback'), release: () => transactions.push('release') };
  const dependencies = {
    '../../config/db': { pool: { query, getConnection: async () => conn } },
    '../../config/cloudinary': { cloudinary: {} }, '../../utils/generateId': () => 'id',
    '../notifications/notifications.service': {},
    '../audit/audit.service': { log: async data => audits.push(data) },
    '../../sockets/residentChanges.socket': { emitResidentDataChanged: (...args) => events.push(args) },
  };
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '../src/modules/reports/reports.service.js'), 'utf8');
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, { Date, console, URL })(name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return { service: module.exports, row, events, audits, writes, transactions, removed: () => removed, fail: () => { failUpdate = true; } };
}
const owner = { id: 'owner', role: 'RESIDENT' };

test('removing resolved history hides resident reads but preserves admin records and totals', async () => {
  const f = fixture();
  await f.service.softDelete('report', owner);
  assert.ok(f.row.resident_hidden_at);
  assert.equal(f.row.deleted_at, null);
  assert.equal((await f.service.getMyReports('owner')).total, 0);
  assert.equal((await f.service.getMyStats('owner')).total, 0);
  await assert.rejects(f.service.getMyReportById('report', 'owner'), e => e.statusCode === 404);
  assert.equal((await f.service.getById('report')).id, 'report');
  assert.equal((await f.service.getAll()).total, 1);
  assert.equal(f.events.length, 1);
  assert.equal(f.events[0][1], 'owner');
  assert.equal(f.audits[0].action, 'REPORT_HIDDEN_BY_RESIDENT');
  await f.service.softDelete('report', owner);
  assert.equal(f.writes.length, 1);
  assert.equal(f.events.length, 1);
  assert.equal(f.audits.length, 1);
});

test('untouched submitted reports are permanently deleted by their owner', async () => {
  for (const status of ['SUBMITTED', 'PENDING']) {
    const f = fixture(status);
    await f.service.softDelete('report', owner);
    assert.equal(f.removed(), true);
    assert.equal(f.row.deleted_at, null);
    assert.equal(f.row.resident_hidden_at, null);
    await assert.rejects(f.service.getById('report'), e => e.statusCode === 404);
  }
});

test('active and unknown statuses reject deletion without writes or events', async () => {
  for (const status of ['UNDER_REVIEW', 'DISPATCHED', 'IN_PROGRESS', 'UNKNOWN']) {
    const f = fixture(status);
    await assert.rejects(f.service.softDelete('report', owner), e => e.statusCode === 400);
    assert.equal(f.writes.length, 0);
    assert.equal(f.events.length, 0);
    assert.ok(f.transactions.includes('rollback'));
  }
});

test('only the resident owner can delete reports', async () => {
  for (const user of [{ id: 'other', role: 'RESIDENT' }, { id: 'owner', role: 'DRIVER' }]) {
    const f = fixture('SUBMITTED');
    await assert.rejects(f.service.softDelete('report', user), e => e.statusCode === 403);
    assert.equal(f.writes.length, 0);
  }
});

test('admins cannot delete any report, even their own or hidden resolved reports', async () => {
  for (const status of ['SUBMITTED', 'UNDER_REVIEW', 'DISPATCHED', 'RESOLVED']) {
    const f = fixture(status, { user_id: 'admin', resident_hidden_at: status === 'RESOLVED' ? '2026-10-29 01:00:00' : null });
    await assert.rejects(f.service.softDelete('report', { id: 'admin', role: 'ADMIN' }), e => e.statusCode === 403);
    assert.equal(f.writes.length, 0);
    assert.equal(f.events.length, 0);
    assert.equal(f.audits.length, 0);
  }
});

test('submitted reports with admin work or linked reports cannot be permanently deleted', async () => {
  for (const options of [{ reviewed: true }, { linked: true }]) {
    const f = fixture('SUBMITTED', {}, options);
    await assert.rejects(f.service.softDelete('report', owner), e => e.statusCode === 409);
    assert.equal(f.removed(), false);
    assert.equal(f.writes.length, 0);
  }
  for (const fields of [{ admin_response: '' }, { is_false: 1 }, { is_duplicate: 1 }, { false_flagged_at: '2026-10-30 01:00:00' }]) {
    const f = fixture('SUBMITTED', fields);
    await assert.rejects(f.service.softDelete('report', owner), e => e.statusCode === 409);
    assert.equal(f.removed(), false);
    assert.equal(f.writes.length, 0);
  }
});

test('failed removals roll back and never emit success events or audits', async () => {
  for (const status of ['SUBMITTED', 'RESOLVED']) {
    const f = fixture(status);
    f.fail();
    await assert.rejects(f.service.softDelete('report', owner), /write failed/);
    assert.ok(f.transactions.includes('rollback'));
    assert.ok(!f.transactions.includes('commit'));
    assert.equal(f.removed(), false);
    assert.equal(f.events.length, 0);
    assert.equal(f.audits.length, 0);
  }
});

test('unmigrated databases still load resident history, details and stats', async () => {
  const f = fixture('SUBMITTED', {}, { legacySchema: true });
  assert.equal((await f.service.getMyReports('owner')).total, 1);
  assert.equal((await f.service.getMyReportById('report', 'owner')).id, 'report');
  assert.equal((await f.service.getMyStats('owner')).total, 1);
  await f.service.softDelete('report', owner);
  assert.equal(f.removed(), true);
});

test('unmigrated resolved removal returns a clear unavailable error without deleting admin records', async () => {
  const f = fixture('RESOLVED', {}, { legacySchema: true });
  await assert.rejects(f.service.softDelete('report', owner), e => e.statusCode === 503 && /upgrade/i.test(e.message));
  assert.equal(f.row.deleted_at, null);
  assert.equal(f.row.resident_hidden_at, null);
  assert.equal(f.events.length, 0);
  assert.equal(f.audits.length, 0);
});

test('unrelated database errors are not swallowed by the compatibility fallback', async () => {
  const f = fixture('SUBMITTED', {}, { unrelatedMissingColumn: true });
  await assert.rejects(f.service.getMyReports('owner'), /barangay_name/);
  await assert.rejects(f.service.getMyStats('owner'), /barangay_name/);
});
