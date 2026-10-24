import React, { useState } from 'react';
import { api } from '../api';
import { AcceptanceTestReport } from '../types';
import { ShieldCheck, CheckCircle2, XCircle, Play, RefreshCw, Terminal, Layers } from 'lucide-react';

interface TestRunnerViewProps {
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TestRunnerView: React.FC<TestRunnerViewProps> = ({ onNotify }) => {
  const [report, setReport] = useState<AcceptanceTestReport | null>(null);
  const [running, setRunning] = useState(false);

  const handleRunTests = async () => {
    setRunning(true);
    try {
      const res = await api.runTests();
      setReport(res);
      if (res.all_passed) {
        onNotify(`All ${res.passed_count}/${res.total_tests} acceptance tests passed successfully!`, 'success');
      } else {
        onNotify(`${res.failed_count} acceptance test(s) failed. Inspect details below.`, 'error');
      }
    } catch (err: any) {
      onNotify(err.message, 'error');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Runner Header */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Automated Acceptance Test Suite
          </span>
          <h2 className="text-xl font-bold text-stone-900 mt-1">
            Verification of 10 Hard System Constraints
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            Executes programmatic regression tests against persistent SQLite database verifying multi-producer optimization, atomic locking, RBAC, and data privacy.
          </p>
        </div>

        <button
          onClick={handleRunTests}
          disabled={running}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <Play className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
          <span>{running ? 'Executing Tests (a-j)...' : 'Run Full Acceptance Test Suite'}</span>
        </button>
      </div>

      {/* Summary Box if run */}
      {report && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          report.all_passed ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-red-50 border-red-300 text-red-950'
        }`}>
          <div className="flex items-center gap-3">
            {report.all_passed ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-700" />
            ) : (
              <XCircle className="w-6 h-6 text-red-700" />
            )}
            <div>
              <h3 className="font-bold text-sm">
                {report.all_passed ? 'All System Acceptance Tests Passed' : 'Test Failures Encountered'}
              </h3>
              <p className="text-xs text-stone-600 mt-0.5">
                {report.passed_count} of {report.total_tests} test criteria satisfied against live database transactions.
              </p>
            </div>
          </div>
          <span className="font-mono text-xs font-bold px-3 py-1 bg-white rounded-lg border border-stone-300 shadow-xs">
            {report.passed_count} / {report.total_tests} PASS
          </span>
        </div>
      )}

      {/* Test List */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
          <Terminal className="w-4 h-4 text-emerald-800" />
          <span>Acceptance Test Results (Items a through j)</span>
        </h3>

        {!report ? (
          <div className="text-center py-10 bg-stone-50 rounded-xl border border-stone-200 text-stone-500 text-xs">
            Click <strong>“Run Full Acceptance Test Suite”</strong> above to execute tests against the database.
          </div>
        ) : (
          <div className="space-y-3">
            {report.results.map((t) => (
              <div
                key={t.code}
                className={`p-3.5 rounded-xl border transition-all text-xs ${
                  t.passed ? 'bg-white border-stone-200' : 'bg-red-50/50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                      Test {t.code}
                    </span>
                    <span className="font-bold text-stone-900">{t.title}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    t.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {t.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>

                {t.details && (
                  <pre className="mt-2.5 p-2 bg-stone-900 text-emerald-400 rounded-lg text-[10px] font-mono overflow-x-auto leading-relaxed">
                    {JSON.stringify(t.details, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
