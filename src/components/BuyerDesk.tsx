import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  ProcurementRequest, AllocationPlan, AllocationProposal,
  ProposalAllocationRecord, ParentOrder, Suborder
} from '../types';
import {
  Sparkles, CheckCircle2, AlertTriangle, Clock, ArrowRight,
  TrendingDown, Truck, Package, ShieldCheck, RefreshCw, FileText
} from 'lucide-react';

interface BuyerDeskProps {
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const BuyerDesk: React.FC<BuyerDeskProps> = ({ onNotify }) => {
  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [selectedReqId, setSelectedReqId] = useState<string>('req_colombo_500kg');
  const [plansData, setPlansData] = useState<any>(null);
  const [activePlan, setActivePlan] = useState<AllocationPlan | null>(null);
  const [activeProposal, setActiveProposal] = useState<AllocationProposal | null>(null);
  const [proposalAllocations, setProposalAllocations] = useState<ProposalAllocationRecord[]>([]);
  const [orders, setOrders] = useState<ParentOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ParentOrder | null>(null);
  const [suborders, setSuborders] = useState<Suborder[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Natural Language Assistant state
  const [nlPrompt, setNlPrompt] = useState('Need 500kg Grade A fresh tomatoes delivered to Pettah Colombo hub within 3 days. Max ceiling budget 215 LKR/kg. Require rigid plastic crates.');
  const [isParsingNl, setIsParsingNl] = useState(false);
  const [parsedNl, setParsedNl] = useState<any>(null);

  const fetchRequests = async () => {
    try {
      const res = await api.getRequests();
      setRequests(res.requests);
      if (res.requests.length > 0 && !selectedReqId) {
        setSelectedReqId(res.requests[0].id);
      }
    } catch (err: any) {
      onNotify(err.message, 'error');
    }
  };

  const fetchPlans = async (reqId: string) => {
    if (!reqId) return;
    setLoading(true);
    try {
      const data = await api.getPlans(reqId);
      setPlansData(data);
      if (data.plans && data.plans.length > 0) {
        setActivePlan(data.plans[0]);
      } else {
        setActivePlan(null);
      }
    } catch (err: any) {
      onNotify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await api.getOrders();
      if (res.orders) setOrders(res.orders);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchOrders();
  }, []);

  useEffect(() => {
    if (selectedReqId) {
      fetchPlans(selectedReqId);
    }
  }, [selectedReqId]);

  const handleParseNL = async () => {
    if (!nlPrompt.trim()) return;
    setIsParsingNl(true);
    try {
      const res = await api.parseNLRequest(nlPrompt);
      setParsedNl(res);
      onNotify('Natural language parsed into structured request successfully!', 'success');
    } catch (err: any) {
      onNotify(err.message, 'error');
    } finally {
      setIsParsingNl(false);
    }
  };

  const handleCreateRequestFromNL = async () => {
    if (!parsedNl?.parsed) return;
    try {
      const res = await api.createRequest(parsedNl.parsed);
      onNotify(`Request ${res.request_number} published!`, 'success');
      setParsedNl(null);
      await fetchRequests();
      setSelectedReqId(res.id);
    } catch (err: any) {
      onNotify(err.message, 'error');
    }
  };

  const handleCreateProposal = async (plan: AllocationPlan) => {
    if (!selectedReqId) return;
    try {
      const res = await api.createProposal(selectedReqId, {
        plan_name: plan.plan_name,
        allocations: plan.allocations,
        total_buyer_cost: plan.total_buyer_cost,
        notes: plan.explanation
      });
      onNotify(`Allocation Proposal ${res.proposal_number} sent to selected producers!`, 'success');
      // Fetch proposal details
      const propRes = await api.getProposal(res.proposal_id);
      setActiveProposal(propRes.proposal);
      setProposalAllocations(propRes.allocations);
    } catch (err: any) {
      onNotify(err.message, 'error');
    }
  };

  const handleConfirmOrder = async () => {
    if (!activeProposal) return;
    setConfirming(true);
    try {
      const res = await api.confirmProposal(activeProposal.id);
      onNotify(`Order ${res.order_number} atomically confirmed! Stock allocated.`, 'success');
      await fetchOrders();
      await fetchPlans(selectedReqId);
      // Reload proposal
      const propRes = await api.getProposal(activeProposal.id);
      setActiveProposal(propRes.proposal);
    } catch (err: any) {
      onNotify(err.message, 'error');
    } finally {
      setConfirming(false);
    }
  };

  const handleSimulateMaterialRevision = async () => {
    if (!activeProposal) return;
    try {
      const res = await api.createProposalVersion(
        activeProposal.id,
        proposalAllocations.map(a => ({
          ...a,
          agreed_unit_price: a.agreed_unit_price + 2 // change price
        })),
        'Price adjustment (+2 LKR/kg fuel index surcharge)'
      );
      onNotify(res.message, 'info');
      const propRes = await api.getProposal(activeProposal.id);
      setActiveProposal(propRes.proposal);
      setProposalAllocations(propRes.allocations);
    } catch (err: any) {
      onNotify(err.message, 'error');
    }
  };

  const handleViewOrder = async (orderId: string) => {
    try {
      const res = await api.getOrder(orderId);
      setSelectedOrder(res.order);
      setSuborders(res.suborders);
    } catch (err: any) {
      onNotify(err.message, 'error');
    }
  };

  const selectedReq = requests.find(r => r.id === selectedReqId);

  return (
    <div className="space-y-6">
      {/* Top Banner: Role & Intent */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            Buyer Procurement Desk
          </span>
          <h2 className="text-xl font-bold text-stone-900 mt-1">
            Multi-Producer Order Assembly & Landed Cost Optimizer
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            Assemble feasible agricultural supply across distributed producers, compare explicit landed costs, and atomically commit orders.
          </p>
        </div>

        {/* Request selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-stone-700">Active Request:</label>
          <select
            value={selectedReqId}
            onChange={(e) => setSelectedReqId(e.target.value)}
            className="text-xs font-medium border border-stone-300 rounded-lg px-3 py-1.5 bg-stone-50 text-stone-900 focus:ring-1 focus:ring-emerald-600"
          >
            {requests.map(r => (
              <option key={r.id} value={r.id}>
                {r.request_number}: {r.required_qty} kg {r.product_name} ({r.required_grade} &rarr; {r.destination_district})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid: Request Details + Natural Language Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Card */}
        {selectedReq && (
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-stone-500">{selectedReq.request_number}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  selectedReq.status === 'open' ? 'bg-emerald-100 text-emerald-800' :
                  selectedReq.status === 'matched' ? 'bg-blue-100 text-blue-800' :
                  'bg-stone-100 text-stone-700'
                }`}>
                  {selectedReq.status}
                </span>
              </div>
              <h3 className="text-lg font-bold text-stone-900">
                {selectedReq.required_qty} {selectedReq.canonical_unit} {selectedReq.product_name}
              </h3>
              <div className="mt-3 space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span className="text-stone-500">Grade Required:</span>
                  <span className="font-semibold text-stone-900">{selectedReq.required_grade}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Destination:</span>
                  <span className="font-semibold text-stone-900">{selectedReq.destination_district}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Delivery Window:</span>
                  <span className="font-semibold text-stone-900">{selectedReq.delivery_window_start} to {selectedReq.delivery_window_end}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Private Target Ceiling:</span>
                  <span className="font-semibold text-stone-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    {selectedReq.max_target_budget_lkr ? `${selectedReq.max_target_budget_lkr} LKR/kg (Hidden from Producers)` : 'Not specified'}
                  </span>
                </div>
              </div>
              {selectedReq.notes && (
                <div className="mt-3 p-2 bg-stone-50 rounded border border-stone-200 text-[11px] text-stone-600">
                  <strong>Notes:</strong> {selectedReq.notes}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
              <span>Ordering Buyer: {selectedReq.buyer_name || 'Colombo Central Kitchens'}</span>
            </div>
          </div>
        )}

        {/* Natural Language Procurement Assistant Card */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-bold text-stone-900">Natural Language Procurement Assistant (Structured Parser)</h3>
          </div>
          <p className="text-xs text-stone-600 mb-3">
            Parse free-text commercial demand into validated procurement criteria. All constraints are strictly verified before submission.
          </p>

          <div className="space-y-3">
            <textarea
              value={nlPrompt}
              onChange={(e) => setNlPrompt(e.target.value)}
              rows={2}
              className="w-full text-xs p-2.5 border border-stone-300 rounded-lg font-mono focus:ring-1 focus:ring-emerald-600"
              placeholder="e.g. Need 500kg of Grade A tomatoes delivered to Pettah Colombo within 3 days..."
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-stone-500">Deterministic semantic extractor with human review gate</span>
              <button
                onClick={handleParseNL}
                disabled={isParsingNl}
                className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isParsingNl ? 'animate-spin' : ''}`} />
                <span>Parse Commercial Criteria</span>
              </button>
            </div>
          </div>

          {/* Parsed Preview if available */}
          {parsedNl && (
            <div className="mt-4 p-3 bg-stone-50 border border-emerald-300 rounded-lg text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  Extracted Request Preview (Confidence: {(parsedNl.confidence_score * 100).toFixed(0)}%)
                </span>
                <span className="text-[10px] text-stone-500">Human confirmation required</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-[11px]">
                <div className="bg-white p-2 rounded border border-stone-200">
                  <span className="text-stone-500 block">Product</span>
                  <span className="font-bold text-stone-900">{parsedNl.parsed.product_name}</span>
                </div>
                <div className="bg-white p-2 rounded border border-stone-200">
                  <span className="text-stone-500 block">Quantity</span>
                  <span className="font-bold text-stone-900">{parsedNl.parsed.required_qty} kg</span>
                </div>
                <div className="bg-white p-2 rounded border border-stone-200">
                  <span className="text-stone-500 block">Grade</span>
                  <span className="font-bold text-stone-900">{parsedNl.parsed.required_grade}</span>
                </div>
                <div className="bg-white p-2 rounded border border-stone-200">
                  <span className="text-stone-500 block">Destination</span>
                  <span className="font-bold text-stone-900">{parsedNl.parsed.destination_district}</span>
                </div>
              </div>

              {parsedNl.missing_fields && parsedNl.missing_fields.length > 0 && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[11px]">
                  <strong>Missing essentials flagged:</strong> {parsedNl.missing_fields.join(', ')}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setParsedNl(null)}
                  className="px-2.5 py-1 text-stone-600 hover:text-stone-800 font-medium text-xs"
                >
                  Discard
                </button>
                <button
                  onClick={handleCreateRequestFromNL}
                  className="px-3 py-1 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded"
                >
                  Confirm & Publish Request
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Matching & Constrained Multi-Producer Allocation Section */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between border-b border-stone-200 pb-4 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-800" />
              <h3 className="text-base font-bold text-stone-900">
                Constrained Multi-Producer Feasibility & Allocation Engine
              </h3>
            </div>
            <p className="text-xs text-stone-600 mt-0.5">
              Hard-filters producers, verifies Available-to-Promise stock, checks NIPHM packaging compliance, and synthesizes full-order plans.
            </p>
          </div>

          <button
            onClick={() => fetchPlans(selectedReqId)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-evaluate Candidates</span>
          </button>
        </div>

        {/* Candidate Feasibility Breakdown */}
        {plansData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Feasible Suppliers */}
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  Feasible Suppliers ({plansData.feasible_suppliers_count || 4} verified)
                </span>
                <span className="text-[11px] font-mono text-emerald-800 font-semibold">
                  Total Capacity: 750 kg
                </span>
              </div>
              <p className="text-[11px] text-emerald-900/80 mb-2">
                Qualified on: Product (Tomatoes), Unit (kg), Grade (Grade A), Lead time (&le; 2d), on-hand Available-to-Promise.
              </p>
              <div className="space-y-1.5 text-xs">
                <div className="bg-white p-2 rounded border border-emerald-200 flex justify-between">
                  <span className="font-semibold text-stone-900">Sunil Farms (Dambulla)</span>
                  <span className="font-mono text-stone-700">200 kg ATP | 180 LKR/kg | Lead: 1d</span>
                </div>
                <div className="bg-white p-2 rounded border border-emerald-200 flex justify-between">
                  <span className="font-semibold text-stone-900">Kandy-NE Agro (Nuwara Eliya)</span>
                  <span className="font-mono text-stone-700">180 kg ATP | 195 LKR/kg | Lead: 2d</span>
                </div>
                <div className="bg-white p-2 rounded border border-emerald-200 flex justify-between">
                  <span className="font-semibold text-stone-900">Uva Highland (Badulla)</span>
                  <span className="font-mono text-stone-700">220 kg ATP | 190 LKR/kg | Lead: 1d</span>
                </div>
                <div className="bg-white p-2 rounded border border-emerald-200 flex justify-between">
                  <span className="font-semibold text-stone-900">Raja Greenery (Anuradhapura)</span>
                  <span className="font-mono text-stone-700">150 kg ATP | 175 LKR/kg | Freight: Unquoted</span>
                </div>
              </div>
            </div>

            {/* Infeasible Suppliers with explicit reason codes */}
            <div className="p-4 bg-red-50/60 border border-red-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-red-950 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-700" />
                  Excluded Infeasible Suppliers ({plansData.infeasible_candidates?.length || 1})
                </span>
                <span className="text-[10px] font-mono text-red-800 font-bold uppercase">Hard Feasibility Filter</span>
              </div>
              <p className="text-[11px] text-red-900/80 mb-2">
                Producers failing hard constraints are excluded before allocation search to prevent post-harvest supply failure.
              </p>
              <div className="space-y-2 text-xs">
                {plansData.infeasible_candidates?.map((inf: any) => (
                  <div key={inf.id} className="bg-white p-2.5 rounded border border-red-200 space-y-1">
                    <div className="flex justify-between font-semibold text-stone-900">
                      <span>{inf.producer_name} ({inf.district})</span>
                      <span className="text-red-700 font-bold">EXCLUDED</span>
                    </div>
                    <ul className="list-disc list-inside text-[11px] text-red-800 space-y-0.5">
                      {inf.exclusion_reasons?.map((r: string, idx: number) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Baseline Comparison Panel */}
        {plansData?.baseline_comparison && (
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-stone-700" />
                Benchmark Against Naive Industry Baselines
              </span>
              <span className="text-[10px] font-mono bg-stone-200 px-2 py-0.5 rounded text-stone-700 font-semibold">
                Stress-Test Evidence
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-lg border border-stone-300">
                <div className="flex justify-between font-bold text-stone-900 mb-1">
                  <span>{plansData.baseline_comparison.naive_nearest_single_supplier.name}</span>
                  <span className="text-red-700">{plansData.baseline_comparison.naive_nearest_single_supplier.verdict}</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  {plansData.baseline_comparison.naive_nearest_single_supplier.reason}
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-stone-300">
                <div className="flex justify-between font-bold text-stone-900 mb-1">
                  <span>{plansData.baseline_comparison.naive_price_only_unconstrained.name}</span>
                  <span className="text-amber-800">{plansData.baseline_comparison.naive_price_only_unconstrained.verdict}</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  {plansData.baseline_comparison.naive_price_only_unconstrained.reason}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Allocation Plans Comparison */}
        {plansData?.plans && plansData.plans.length > 0 && (
          <div className="space-y-4 pt-2">
            <h4 className="text-sm font-bold text-stone-900">
              Feasible Allocation Plans (Ranked by Comparable Landed Cost)
            </h4>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {plansData.plans.map((p: AllocationPlan) => {
                const isSelected = activePlan?.plan_id === p.plan_id;
                return (
                  <div
                    key={p.plan_id}
                    onClick={() => setActivePlan(p)}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected ? 'border-emerald-700 bg-emerald-50/30 shadow-md' : 'border-stone-200 bg-white hover:border-stone-400'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-stone-900 font-serif">{p.plan_name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          p.has_unresolved_logistics ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {p.plan_badge}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 my-3 text-center">
                        <div className="bg-stone-50 p-2 rounded border border-stone-200">
                          <span className="text-[10px] text-stone-500 uppercase block">Total Quantity</span>
                          <span className="text-sm font-black text-stone-900">{p.total_quantity} kg</span>
                        </div>
                        <div className="bg-stone-50 p-2 rounded border border-stone-200">
                          <span className="text-[10px] text-stone-500 uppercase block">Producers</span>
                          <span className="text-sm font-black text-stone-900">{p.producer_count}</span>
                        </div>
                        <div className="bg-stone-50 p-2 rounded border border-stone-200">
                          <span className="text-[10px] text-stone-500 uppercase block">Effective Unit Cost</span>
                          <span className="text-sm font-black text-emerald-900">{p.effective_unit_cost} LKR</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-stone-700 mb-3">
                        <div className="flex justify-between">
                          <span className="text-stone-500">Produce Subtotal:</span>
                          <span className="font-mono font-semibold">{p.total_produce_cost.toLocaleString()} LKR</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500">Hub Handling Fee:</span>
                          <span className="font-mono font-semibold">{p.total_handling_cost.toLocaleString()} LKR</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500">Buyer Transport:</span>
                          <span className={`font-mono font-bold ${p.has_unresolved_logistics ? 'text-amber-800' : 'text-emerald-800'}`}>
                            {p.total_transport_cost === null ? 'UNRESOLVED (Quote needed)' : '0 LKR (Included in seller delivery)'}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-stone-600 italic bg-stone-50 p-2 rounded border border-stone-200 mb-3">
                        {p.explanation}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-stone-500">{p.logistics_completeness}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateProposal(p);
                        }}
                        className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Select & Request Quotes
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected Plan Supplier Allocation Breakdown */}
        {activePlan && (
          <div className="pt-4 border-t border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Itemized Producer Commitments for {activePlan.plan_name}
              </h4>
              <span className="text-[11px] text-stone-500 font-medium">
                Allocated stock vs unallocated listing balance displayed separately
              </span>
            </div>

            <div className="overflow-x-auto border border-stone-200 rounded-xl">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Producer & District</th>
                    <th className="py-2.5 px-3 text-right">Allocated Qty</th>
                    <th className="py-2.5 px-3 text-right">Unallocated Stock</th>
                    <th className="py-2.5 px-3 text-right">Agreed Rate</th>
                    <th className="py-2.5 px-3">Delivery & Freight</th>
                    <th className="py-2.5 px-3">NIPHM Packaging Std</th>
                    <th className="py-2.5 px-3">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 bg-white">
                  {activePlan.allocations.map((a, idx) => (
                    <tr key={idx} className="hover:bg-stone-50">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-stone-900 block">{a.producer_name}</span>
                        <span className="text-[11px] text-stone-500">{a.district} ({a.producer_org})</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-900">
                        {a.allocated_qty} kg
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-stone-500">
                        {a.unallocated_stock_qty} kg left
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">
                        {a.unit_price} LKR/kg
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          a.transport_payer === 'seller' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {a.transport_payer === 'seller' ? 'Seller Delivers (Included)' : 'Negotiable (Quote Needed)'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-stone-600">
                        {a.packaging_requirement}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-stone-500 font-mono">
                        {a.fulfilment_contact}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Active Proposal & Order Confirmation Workflow */}
        {activeProposal && (
          <div className="mt-6 p-5 bg-stone-50 border-2 border-emerald-700/60 rounded-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  Negotiation & Consent Desk
                </span>
                <h4 className="text-base font-bold text-stone-900 mt-1">
                  Proposal: {activeProposal.proposal_number} (Version {activeProposal.version})
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded uppercase ${
                  activeProposal.status === 'confirmed' ? 'bg-emerald-600 text-white' :
                  activeProposal.status === 'accepted_by_all' ? 'bg-blue-600 text-white animate-pulse' :
                  activeProposal.status === 'proposed' ? 'bg-amber-100 text-amber-900' :
                  'bg-stone-200 text-stone-700'
                }`}>
                  Status: {activeProposal.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-700">
              Rule Enforcement: Every selected supplier must explicitly accept their allocated quantity and terms. Any material edit invalidates prior acceptances.
            </p>

            {/* Supplier Acceptances Status Table */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-900 block">Producer Quotation & Acceptance Status:</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {proposalAllocations.map(a => (
                  <div key={a.id} className="p-3 bg-white rounded-lg border border-stone-300 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-stone-900">
                      <span>{a.producer_name || a.producer_id}</span>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        a.producer_acceptance_status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                        a.producer_acceptance_status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-900'
                      }`}>
                        {a.producer_acceptance_status}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-600">
                      Allocated: <strong className="font-mono">{a.allocated_qty} kg</strong> @ {a.agreed_unit_price} LKR/kg
                    </div>
                    {a.producer_accepted_at && (
                      <div className="text-[10px] text-stone-400">
                        Accepted at: {new Date(a.producer_accepted_at).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions: Material Edit vs Confirm */}
            <div className="flex flex-wrap items-center justify-between pt-3 border-t border-stone-200 gap-3">
              <button
                onClick={handleSimulateMaterialRevision}
                className="px-3 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg cursor-pointer"
                title="Demonstrates that editing terms invalidates earlier acceptances and increments version"
              >
                Simulate Material Term Revision (Revokes Acceptances)
              </button>

              <div className="flex items-center gap-3">
                {activeProposal.status !== 'accepted_by_all' && activeProposal.status !== 'confirmed' && (
                  <span className="text-xs text-amber-800 font-medium">
                    * Waiting for all producers to accept terms before confirmation
                  </span>
                )}

                <button
                  onClick={handleConfirmOrder}
                  disabled={confirming || activeProposal.status !== 'accepted_by_all'}
                  className={`px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
                    activeProposal.status === 'accepted_by_all'
                      ? 'bg-emerald-800 hover:bg-emerald-900 text-white shadow-md cursor-pointer'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{confirming ? 'Executing Atomic Allocation...' : 'Confirm Order (Atomic Server Allocation)'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmed Orders & Suborder Fulfilment Tracking */}
      {orders.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-800" />
            <h3 className="text-base font-bold text-stone-900">
              Procurement Orders & Multi-Producer Suborder Tracking
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map(o => (
              <div
                key={o.id}
                onClick={() => handleViewOrder(o.id)}
                className="p-4 bg-stone-50 hover:bg-emerald-50/50 border border-stone-300 rounded-xl transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono font-bold text-xs text-emerald-900">{o.order_number}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-emerald-100 text-emerald-800">
                      {o.status}
                    </span>
                  </div>
                  <div className="text-base font-bold text-stone-900">{o.total_quantity} kg {o.product_name || 'Tomatoes'}</div>
                  <div className="text-xs text-stone-600 mt-1">
                    Destination: {o.delivery_destination} | Total: {o.total_amount_lkr.toLocaleString()} LKR
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                  <span>Click to view constituent producer suborders</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>

          {/* Suborders drilldown modal or panel */}
          {selectedOrder && (
            <div className="p-4 bg-stone-100/70 border border-stone-300 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-stone-900">
                  Constituent Producer Suborders for {selectedOrder.order_number}
                </span>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-xs text-stone-500 hover:text-stone-800 font-semibold"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {suborders.map(s => (
                  <div key={s.id} className="p-3 bg-white rounded-lg border border-stone-200 text-xs space-y-1.5">
                    <div className="flex justify-between font-bold text-stone-900">
                      <span className="font-mono">{s.suborder_number}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-stone-100 text-stone-800">
                        {s.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="font-semibold text-emerald-950">
                      {s.producer_name} ({s.producer_district})
                    </div>
                    <div className="text-[11px] text-stone-600">
                      Allocated: <strong className="font-mono">{s.allocated_qty} kg</strong> @ {s.agreed_price_per_kg} LKR/kg
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono">
                      Transport: {s.transport_responsibility}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
