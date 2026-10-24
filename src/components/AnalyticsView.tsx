import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { AnalyticsData } from '../types';
import {
  BarChart3, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, Package, RefreshCw, FileText, Target
} from 'lucide-react';

interface AnalyticsViewProps {
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onNotify }) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.getAnalytics();
      setData(res);
    } catch (err: any) {
      onNotify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Analytics Header */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Operational Dashboard & Impact Attribution
          </span>
          <h2 className="text-xl font-bold text-stone-900 mt-1">
            Platform Operational Metrics & Verification
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            Transparently computed from persistent SQLite demo logs with mathematical formula disclosure.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Mandatory Disclaimer Alert */}
      <div className="p-4 bg-stone-100 border border-stone-300 rounded-xl text-xs text-stone-800 space-y-1">
        <div className="flex items-center gap-2 font-bold text-stone-900">
          <AlertTriangle className="w-4 h-4 text-amber-700" />
          <span>Synthetic Demonstration Data Disclaimer</span>
        </div>
        <p className="leading-relaxed text-[11px] text-stone-600">
          All metrics presented below are computed strictly from stored prototype events and simulated seed accounts.
          They demonstrate mathematical functionality and reporting logic; they do <strong>not</strong> represent a causal empirical field study or claim verified agricultural income growth.
        </p>
      </div>

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs text-center">
            <span className="text-[10px] uppercase font-bold text-stone-500 block">Confirmed Volume</span>
            <span className="text-xl font-black text-stone-900 font-mono mt-1 block">
              {data.metrics.confirmed_quantity_kg} kg
            </span>
            <span className="text-[10px] text-stone-400 mt-1 block">Atomic allocations</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs text-center">
            <span className="text-[10px] uppercase font-bold text-stone-500 block">Fulfilled Volume</span>
            <span className="text-xl font-black text-emerald-900 font-mono mt-1 block">
              {data.metrics.completed_quantity_kg} kg
            </span>
            <span className="text-[10px] text-stone-400 mt-1 block">Completed suborders</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs text-center">
            <span className="text-[10px] uppercase font-bold text-stone-500 block">Fulfilment Rate</span>
            <span className="text-xl font-black text-blue-900 font-mono mt-1 block">
              {data.metrics.fulfilment_rate_percent}%
            </span>
            <span className="text-[10px] text-stone-400 mt-1 block">Due committed stock</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs text-center">
            <span className="text-[10px] uppercase font-bold text-stone-500 block">Redirected Surplus</span>
            <span className="text-xl font-black text-purple-900 font-mono mt-1 block">
              {data.metrics.redirected_surplus_kg} kg
            </span>
            <span className="text-[10px] text-stone-400 mt-1 block">Rescued post-allocation</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs text-center">
            <span className="text-[10px] uppercase font-bold text-stone-500 block">Cancelled Orders</span>
            <span className="text-xl font-black text-stone-700 font-mono mt-1 block">
              {data.metrics.cancelled_commitments_count}
            </span>
            <span className="text-[10px] text-stone-400 mt-1 block">Restored to ATP</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs text-center">
            <span className="text-[10px] uppercase font-bold text-stone-500 block">Proposal Turnaround</span>
            <span className="text-sm font-black text-stone-800 font-mono mt-1 block">
              {data.metrics.average_time_to_first_proposal}
            </span>
            <span className="text-[10px] text-stone-400 mt-1 block">Optimizer response</span>
          </div>
        </div>
      )}

      {/* Formula Disclosures */}
      {data && (
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-emerald-800" />
            <span>Mathematical Metric Formulas & Audit Definitions</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
              <span className="font-bold text-stone-900 block">Fulfilment Rate:</span>
              <p className="font-mono text-[11px] text-stone-700">{data.formula_disclosure.fulfilment_rate}</p>
              <span className="text-[10px] text-stone-500 block">Prevents distortion from brand-new open orders.</span>
            </div>

            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
              <span className="font-bold text-stone-900 block">Redirected Surplus:</span>
              <p className="font-mono text-[11px] text-stone-700">{data.formula_disclosure.redirected_surplus}</p>
              <span className="text-[10px] text-stone-500 block">Tracks crop volume actually committed to a buyer.</span>
            </div>

            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
              <span className="font-bold text-stone-900 block">Available-to-Promise (ATP):</span>
              <p className="font-mono text-[11px] text-stone-700">{data.formula_disclosure.available_to_promise}</p>
              <span className="text-[10px] text-stone-500 block">Protects against double-selling during concurrent buyer requests.</span>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Launch Validation Plan & Research Protocol */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
          <Target className="w-5 h-5 text-emerald-800" />
          <h3 className="text-base font-bold text-stone-900">
            Pre-Launch Field Validation Plan & Research Protocol
          </h3>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          Before any real capital commitment or commercial launch, the product must validate core operational hypotheses through structured field interviews in Sri Lanka.
          The validation protocol below targets empirical evidence across the entire supply chain.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
            <h4 className="font-bold text-stone-900 text-sm">Target Interview Cohorts</h4>
            <ul className="space-y-1.5 text-stone-700 text-[11px]">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>5 Business Buyers:</strong> Commercial kitchens, hotel chains, and supermarket aggregators in Colombo/Western Province.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>10 Agricultural Producers:</strong> Medium-scale tomato and vegetable growers across Dambulla, Nuwara Eliya, Badulla, and Anuradhapura.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>2 Logistics Partners:</strong> Regional freight operators and aggregation hub coordinators with crate transport facilities.</span>
              </li>
            </ul>
          </div>

          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
            <h4 className="font-bold text-stone-900 text-sm">Critical Hypotheses to Stress-Test</h4>
            <ul className="space-y-1.5 text-stone-700 text-[11px]">
              <li><strong>H1 (Order Regularity):</strong> Commercial buyers request multi-producer orders with sufficient volume (&ge; 300 kg) to warrant algorithmic aggregation.</li>
              <li><strong>H2 (Inventory Discipline):</strong> Producers will update on-hand inventory accurately before harvesting, avoiding stale commitments.</li>
              <li><strong>H3 (Packaging Compliance):</strong> Logistics providers agree to handle rigid plastic crates rather than destructive poly-sacks.</li>
              <li><strong>H4 (Price Transparency):</strong> Buyers and producers honor agreed landed cost terms without off-platform leakage.</li>
            </ul>
          </div>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
          <strong>Production Pilot Gate:</strong> Progressing to a live pilot requires achieving 3 repeatable manually coordinated test orders with zero post-harvest crate damage and &ge; 95% quote acceptance from interviewed partners.
          <span className="block text-[11px] text-blue-700 italic mt-0.5">
            * These milestones are targets to be tested, not represented as achieved research.
          </span>
        </div>
      </div>
    </div>
  );
};
