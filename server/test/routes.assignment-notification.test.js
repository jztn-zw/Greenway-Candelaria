const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture({ eligible = true, failInsert = false, failCommit = false } = {}) {
  const events = [], rows = [], sockets = [], pushes = [];
  let sequence = 0;
  const connection = {
    beginTransaction: async () => events.push('begin'),
    query: async (sql, params) => {
      if (sql.includes('SELECT id FROM trucks')) return [[{ id: 'truck' }]];
      if (sql.includes('SELECT u.id FROM drivers')) {
        assert.deepEqual(Array.from(params), ['driver']);
        assert.match(sql, /u.role = 'DRIVER'.*u.status = 'ACTIVE'.*u.deleted_at IS NULL/);
        return [eligible ? [{ id: 'collector-user' }] : []];
      }
      if (sql.includes('INSERT INTO notifications')) {
        events.push('notice');
        if (failInsert) throw new Error('notification insert failed');
        rows.push(...params[0]);
      } else {
        assert.match(sql, /INSERT INTO (routes|route_stops)/);
        events.push('route-write');
      }
      return [{ affectedRows: 1 }];
    },
    commit: async () => { if (failCommit) throw new Error('commit failed'); events.push('commit'); },
    rollback: async () => { events.push('rollback'); rows.length = 0; },
    release: () => events.push('release'),
  };
  const load = (file, dependencies) => {
    const module = { exports: {} };
    const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
    vm.runInNewContext(`(function(require, module, exports) { ${source}\n })`, { Date, console })(name => {
      assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
      return dependencies[name];
    }, module, module.exports);
    return module.exports;
  };
  const notifications = load('modules/notifications/notifications.service.js', {
    '../../config/db': { pool: {} }, '../../utils/generateId': () => `notice-${++sequence}`,
    './push.service': { sendCollectorPushAlert: async notice => {
      assert.ok(events.includes('commit')); pushes.push(notice);
    } },
    '../../sockets/notifications.socket': { emitNotificationToUser: (id, notice) => {
      assert.ok(events.includes('commit')); sockets.push({ id, notice });
    } },
  });
  // Exercise the actual create flow with fixture guards and the real inbox/socket/push dispatcher.
  const source = fs.readFileSync(path.join(__dirname, '../src/modules/routes/routes.service.js'), 'utf8');
  const createSource = source.slice(source.indexOf('const create = async'), source.indexOf('// ─── Update'));
  const create = vm.runInNewContext(`${createSource}\ncreate`, {
    pool: { getConnection: async () => connection },
    generateId: () => `route-${++sequence}`,
    resolveRouteStops: async (_db, stops) => stops,
    assertUniqueRouteStops() {}, assertCollectionReadyForStops: async () => {},
    resolveAssignedTruckId: async () => 'truck', assertNoRouteTruckDayConflict: async () => {},
    assertNoActiveRouteBarangayConflicts: async () => {}, ...notifications,
    getById: async id => ({ id }), auditService: { log: async () => events.push('audit') },
  });
  return { create, events, rows, sockets, pushes };
}

const route = { truck_id: 'truck', driver_id: 'driver', day_of_week: 'MONDAY', start_time: '13:05',
  name: 'West collection', waste_type: 'Biodegradable', stops: [{ barangay_id: 'area', stop_order: 1 }] };

test('new enabled route sends one matching inbox, socket and push notice only after commit', async () => {
  const f = fixture();
  const saved = await f.create(route, 'admin');
  assert.equal(f.rows.length, 1);
  assert.equal(f.sockets.length, 1);
  assert.equal(f.pushes.length, 1);
  assert.equal(f.sockets[0].id, 'collector-user');
  const notice = f.pushes[0];
  assert.equal(notice.user_id, 'collector-user');
  assert.equal(notice.ref_id, saved.id);
  assert.equal(notice.type, 'SYSTEM');
  assert.equal(notice.ref_module, 'routes');
  assert.equal(notice.metadata.destination, 'notification');
  assert.match(notice.body, /West collection.*Monday at 1:05 PM.*1 stop.*Biodegradable/);
  assert.equal(f.rows[0][4], notice.body);
  assert.equal(f.sockets[0].notice, notice);
  assert.ok(f.events.indexOf('notice') < f.events.indexOf('commit'));
});

test('inactive, unassigned and unavailable accounts do not receive assignment alerts', async () => {
  for (const overrides of [{ status: 'INACTIVE' }, { driver_id: undefined }]) {
    const f = fixture(); await f.create({ ...route, ...overrides }, 'admin');
    assert.equal(f.rows.length, 0); assert.equal(f.pushes.length, 0);
  }
  const f = fixture({ eligible: false }); await f.create(route, 'admin');
  assert.equal(f.rows.length, 0); assert.equal(f.sockets.length, 0);
});

test('failed notification insert or commit rolls back without sockets or push', async () => {
  for (const options of [{ failInsert: true }, { failCommit: true }]) {
    const f = fixture(options);
    await assert.rejects(f.create(route, 'admin'), /failed/);
    assert.ok(f.events.includes('rollback'));
    assert.equal(f.rows.length, 0); assert.equal(f.sockets.length, 0); assert.equal(f.pushes.length, 0);
  }
});

test('unnamed route and midnight use readable assignment copy', async () => {
  const f = fixture(); await f.create({ ...route, name: '', start_time: '00:00' }, 'admin');
  assert.match(f.pushes[0].body, /a new collection route every Monday at 12:00 AM/);
});
