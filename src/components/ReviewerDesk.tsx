import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { VerificationSubmission, User } from '../types';
import { ShieldCheck, CheckCircle2, XCircle, FileText, AlertTriangle, RefreshCw, Award } from 'lucide-react';

interface ReviewerDeskProps {
  currentUser: User | null;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ReviewerDesk: React.FC<ReviewerDeskProps> = ({ currentUser, onNotify }) => {
  const [submissions, setSubmissions] = useState<VerificationSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState<string>('Simulated Demo Audit: Document verified against Department of Agriculture registry format.');

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await api.getVerifications();
      setSubmissions(res.submissions);
    } catch (err: any) {
      onNotify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleDecision = async (id: string, decision: 'reviewed_approved' | 'reviewed_rejected') => {
    try {
      const res = await api.decideVerification(id, decision, decisionNotes);
      onNotify(res.message, decision === 'reviewed_approved' ? 'success' : 'info');
      await fetchSubmissions();
    } catch (err: any) {
      onNotify(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
            Platform Trust & Verification Desk
          </span>
          <h2 className="text-xl font-bold text-stone-900 mt-1">
            Produce Standards & Evidence Review Workspace
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            Logged in as: <strong>{currentUser?.name || 'Compliance Reviewer'}</strong> ({currentUser?.organization})
          </p>
        </div>

        <button
          onClick={fetchSubmissions}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Submissions</span>
        </button>
      </div>

      {/* Mandatory Regulatory & Simulated Badge Disclaimer */}
      <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-amber-950">
          <AlertTriangle className="w-4 h-4 text-amber-700" />
          <span>Verification Protocol Disclaimer (Simulated Demonstration Badge)</span>
        </div>
        <p className="leading-relaxed">
          In this prototype, verified badges record the precise evidence reviewed (e.g. SL-GAP certificate, pesticide test), reviewer ID, and timestamp.
          All approvals are explicitly labeled <strong>“Simulated Demonstration Review”</strong> and do not represent official certification by the Sri Lanka Department of Agriculture or SLSI.
        </p>
      </div>

      {/* Evidence Submissions Table */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-800" />
          <span>Producer Evidence Submissions ({submissions.length})</span>
        </h3>

        <div className="space-y-4">
          {submissions.map(s => (
            <div
              key={s.id}
              className="p-4 bg-stone-50 border border-stone-300 rounded-xl space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-2">
                <div>
                  <span className="font-bold text-stone-900 text-sm">{s.producer_name}</span>
                  <span className="text-xs text-stone-500 ml-2">({s.producer_district} • {s.producer_org})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    s.status === 'reviewed_approved' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                    s.status === 'reviewed_rejected' ? 'bg-red-100 text-red-900 border border-red-300' :
                    'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {s.status.replace(/_/g, ' ')}
                  </span>
                  {s.is_simulated_demo === 1 && (
                    <span className="text-[10px] font-mono bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded">
                      Simulated Demo
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-white p-2.5 rounded border border-stone-200">
                  <span className="text-stone-500 text-[10px] uppercase block">Evidence Type</span>
                  <span className="font-bold text-stone-900">{s.evidence_type.toUpperCase().replace(/_/g, ' ')}</span>
                  <span className="block text-[11px] font-mono text-emerald-800 mt-1">{s.document_name}</span>
                </div>

                <div className="bg-white p-2.5 rounded border border-stone-200 md:col-span-2">
                  <span className="text-stone-500 text-[10px] uppercase block">Producer Submission Notes</span>
                  <span className="text-stone-700">{s.submission_notes || 'No extra notes provided'}</span>
                  {s.reviewer_decision_notes && (
                    <div className="mt-2 pt-1 border-t border-stone-100 text-[11px] text-purple-900">
                      <strong>Audit Decision:</strong> {s.reviewer_decision_notes}
                      {s.valid_until && <span> (Valid until: {s.valid_until})</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Reviewer Action Buttons if Pending */}
              {s.status === 'pending' && currentUser?.role === 'reviewer' && (
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <input
                    type="text"
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    placeholder="Audit decision note..."
                    className="text-xs border border-stone-300 rounded px-2.5 py-1.5 flex-1 bg-white"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDecision(s.id, 'reviewed_rejected')}
                      className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Reject Submission
                    </button>
                    <button
                      onClick={() => handleDecision(s.id, 'reviewed_approved')}
                      className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve (Simulated Badge)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
