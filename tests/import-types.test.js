'use strict';
const assert = require('node:assert/strict');
const P = require('../js/core.js');
const demo = require('../dane-demo.json');
let failures = 0;
for (const field of ['start', 'end']) {
  const data = structuredClone(demo);
  data.entries[0][field] = [data.entries[0][field]];
  try { assert.throws(() => P.validateDataset(data), /godzin/); }
  catch (e) { failures++; console.error(`FAIL: import odrzuca tablicę w polu ${field}`); }
}
try { assert.throws(() => P.validatePractice({ name: 'Test', required: 1e100 }), /Wymagany czas/); }
catch { failures++; console.error('FAIL: wymagane minuty poza bezpiecznym zakresem całkowitym'); }
if (failures) process.exitCode = 1;
else console.log('PASS: import odrzuca godziny o błędnym typie i niebezpieczną liczbę minut.');
