const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../../client/node_modules/typescript');

function policy() {
  const file = path.join(__dirname, '../../residentapp/src/components/reports/reportRemoval.ts');
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(module,exports){${source}\n})`)(module, module.exports);
  return module.exports.getReportRemoval;
}

test('mobile report actions allow withdrawal and describe personal-history removal', () => {
  const action = policy();
  const report = { id: 'report', reference_number: 'RPT-2026-00001' };
  assert.equal(action({ ...report, status: 'SUBMITTED' }).title, 'Delete Report');
  assert.equal(action({ ...report, status: 'PENDING' }).title, 'Delete Report');
  const resolved = action({ ...report, status: 'RESOLVED' });
  assert.equal(resolved.title, 'Remove from History');
  assert.match(resolved.message, /MENRO.*retain/i);
  for (const status of ['UNDER_REVIEW', 'DISPATCHED', 'IN_PROGRESS', 'REJECTED', '', 'UNKNOWN']) {
    assert.equal(action({ ...report, status }), null);
  }
  assert.equal(action(null), null);
});
