import { runAcceptanceTests } from './test-suite.js';

console.log('================================================================');
console.log('ASWANU (අස්වනු / அறுவடை) — AUTOMATED ACCEPTANCE TEST RUNNER');
console.log('Testing constrained allocation, atomic locking, RBAC, and flows');
console.log('================================================================\n');

const suite = runAcceptanceTests();

for (const t of suite.results) {
  const icon = t.passed ? '[PASS]' : '[FAIL]';
  console.log(`${icon} Test ${t.code}: ${t.title}`);
  if (t.details) {
    console.log('       Details:', JSON.stringify(t.details));
  }
}

console.log('\n----------------------------------------------------------------');
console.log(`Summary: ${suite.passed_count}/${suite.total_tests} tests passed (${suite.all_passed ? 'ALL PASSED' : 'FAILURES DETECTED'})`);
console.log('----------------------------------------------------------------\n');

if (!suite.all_passed) {
  process.exit(1);
} else {
  process.exit(0);
}
