import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Listing, ProposalAllocationRecord, Suborder, User, SurplusMatch } from '../types';
import {
  Package, CheckCircle2, XCircle, Truck, AlertCircle,
  Tag, ArrowRight, ShieldCheck, RefreshCw, Send
} from 'lucide-react';

interface ProducerPortalProps {
  currentUser: User | null;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ProducerPortal: React.FC<ProducerPortalProps> = ({ currentUser, onNotify }) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [allocations, setAllocations] = useState<ProposalAllocationRecord[]>([]);
  const [suborders, setSuborders] = useState<Suborder[]>([]);
  const [surplusMatches, setSurplusMatches] = useState<SurplusMatch[]>([]);
  const [loading, setLoading] = useState(false);

  // Surplus modal / state
  const [selectedListingForSurplus, setSelectedListingForSurplus] = useState<string>('');
  const [surplusQty, setSurplusQty] = useState<number>(30);
  const [surplusDiscount, setSurplusDiscount] = useState<number>(10);
  const [surplusNotes, setSurplusNotes] = useState<string>('Post-allocation remaining harvest stock');

  const fetchProducerData = async () => {
    setLoading(true);
    try {
      // 1. Listings
      const listRes = await api.getListings();
      // Filter for current producer if producer user, else show all
      const myLists = currentUser?.role === 'producer'
        ? listRes.listings.filter(l => l.producer_id === currentUser.id)
        : listRes.listings;
      setListings(myLists);

      if (myLists.length > 0 && !selectedListingForSurplus) {
        setSelectedListingForSurplus(myLists[0].id);
      }

      // 2. Allocations
      if (currentUser?.role === 'producer') {
        const allocRes = await api.getProducerAllocations();
        setAllocations(allocRes.allocations);

        // 3. Suborders
        const orderRes = await api.getOrders();
        if (orderRes.suborders) {
          setSuborders(orderRes.suborders);
        }
      }

      // 4. Surplus matches
      const surplusRes = await api.getSurplusMatches();
      setSurplusMatches(surplusRes.matches);
    } catch (err: any) {
      onNotify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducerData();
  }, [currentUser]);

  const handleRespondAllocation = async (allocationId: string, decision: 'accepted' | 'rejected') => {
    try {
      const res = await api.respondToAllocation(allocationId, decision);
      onNotify(res.message, decision === 'accepted' ? 'success' : 'info');
      await fetchProducerData();
    } catch (err: any) {
      onNotify(err.message, 'error');
    }
  };

  const handleUpdateSuborderStatus = async (suborderId: string, newStatus: string) => {
    try {
      const res = await api.updateSuborderStatus(suborderId, newStatus, `Producer marked ${newStatus}`);
      onNotify(res.message, 'success');
      await fetchProducerData();
    } catch (err: any) {
      onNotify(err.message, 'error');
    }
  };

  const handleFlagSurplus = async () => {
    if (!selectedListingForSurplus || !surplusQty) return;
    try {
      const res = await api.flagSurplus({
        listing_id: selectedListingForSurplus,
        flagged_qty: Number(surplusQty),
        discount_percent: Number(surplusDiscount),
        notes: surplusNotes
      });
      onNotify(res.message, 'success');
      await fetchProducerData();
    } catch (err: any) {
      onNotify(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Producer Portal Header */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Producer Portal & Stock Manager
          </span>
          <h2 className="text-xl font-bold text-stone-900 mt-1">
            {currentUser?.organization || currentUser?.name || 'Producer Stock & Fulfilment Desk'}
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            District: <strong>{currentUser?.district || 'Central Sri Lanka'}</strong> | Role: Independent Producer
          </p>
        </div>

        <button
          onClick={fetchProducerData}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Stock & Quotes</span>
        </button>
      </div>

      {/* Produce Listings & Real-time Available-to-Promise */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-800" />
            <h3 className="text-base font-bold text-stone-900">
              Produce Inventory & Available-to-Promise (ATP)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-stone-500">
            Rule: ATP = On-hand qty minus confirmed uncancelled allocations
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map(l => (
            <div key={l.id} className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">{l.product_name}</h4>
                  <span className="text-xs text-stone-500">{l.district} • {l.grade}</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded">
                  {l.asking_price_per_kg} LKR/kg
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded border border-stone-200">
                  <span className="text-[10px] text-stone-500 uppercase block">On-Hand Total</span>
                  <span className="font-bold text-stone-900">{l.on_hand_qty} {l.canonical_unit}</span>
                </div>
                <div className="bg-white p-2 rounded border border-emerald-300">
                  <span className="text-[10px] text-emerald-800 uppercase block font-semibold">Available to Promise</span>
                  <span className="font-black text-emerald-950 font-mono text-sm">
                    {l.available_to_promise} {l.canonical_unit}
                  </span>
                </div>
              </div>

              {l.expected_harvest_qty > 0 && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-900">
                  <strong>Expected Harvest:</strong> {l.expected_harvest_qty} kg (due {l.expected_harvest_date || 'in 4 days'})
                  <span className="block text-[10px] text-blue-700 italic mt-0.5">
                    * Not counted as ATP until physically harvested to prevent over-commitment
                  </span>
                </div>
              )}

              <div className="text-[11px] text-stone-600 space-y-1">
                <div>Lead Time: <strong className="text-stone-900">{l.lead_time_days} day(s)</strong> | Min Lot: <strong className="text-stone-900">{l.min_lot_size} kg</strong></div>
                <div>Logistics: <strong className="text-stone-900">{l.delivery_capability.replace(/_/g, ' ')}</strong></div>
                <div>Packaging: <span className="text-stone-700">{l.packaging_type}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Allocation Proposals & Two-Sided Consent Actions */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-800" />
            <h3 className="text-base font-bold text-stone-900">
              Procurement Quotes & Allocation Terms Acceptance
            </h3>
          </div>
          <span className="text-[11px] font-mono text-stone-500">
            Rule: Buyer cannot commit stock without producer explicit acceptance
          </span>
        </div>

        {allocations.length === 0 ? (
          <div className="p-6 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-stone-200">
            No pending allocation requests for this producer. When a buyer selects an allocation plan involving your stock, quotation terms will appear here for review.
          </div>
        ) : (
          <div className="space-y-3">
            {allocations.map(a => (
              <div
                key={a.id}
                className="p-4 bg-stone-50 border border-stone-300 rounded-xl flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-stone-800">{a.proposal_number} (v{a.version})</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      a.producer_acceptance_status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                      a.producer_acceptance_status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-900'
                    }`}>
                      {a.producer_acceptance_status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-stone-900">
                    Allocated Quantity: <span className="text-emerald-900 font-mono">{a.allocated_qty} kg</span> of {a.product_name || 'Tomatoes'}
                  </h4>
                  <div className="text-xs text-stone-600 mt-1 space-y-0.5">
                    <div>Buyer: <strong>{a.buyer_name} ({a.buyer_org})</strong></div>
                    <div>Rate: <strong className="font-mono">{a.agreed_unit_price} LKR/kg</strong> | Total Crop Proceeds: <strong className="font-mono text-stone-900">{(a.allocated_qty * a.agreed_unit_price).toLocaleString()} LKR</strong></div>
                    <div>Handoff: {a.handoff_location} | Delivery: {a.transport_payer === 'seller' ? 'Seller delivery agreed' : 'Buyer pickup'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {a.producer_acceptance_status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleRespondAllocation(a.id, 'rejected')}
                        className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleRespondAllocation(a.id, 'accepted')}
                        className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Accept Allocation Terms</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-xs font-medium text-stone-500">
                      Response recorded at {a.producer_accepted_at ? new Date(a.producer_accepted_at).toLocaleTimeString() : 'N/A'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suborders & Fulfilment Dispatch */}
      {suborders.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
            <Truck className="w-5 h-5 text-emerald-800" />
            <h3 className="text-base font-bold text-stone-900">
              Assigned Suborders & Fulfilment Workflow
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suborders.map(s => (
              <div key={s.id} className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-xs text-stone-700">{s.suborder_number}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    s.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                    s.status === 'dispatched' ? 'bg-blue-100 text-blue-800' :
                    s.status === 'delivered' ? 'bg-purple-100 text-purple-800' :
                    'bg-amber-100 text-amber-900'
                  }`}>
                    {s.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-stone-900">{s.allocated_qty} kg {s.product_name || 'Tomatoes'}</h4>
                  <div className="text-xs text-stone-600 mt-1">
                    Buyer: {s.buyer_name} ({s.buyer_org}) | Value: {s.total_suborder_amount_lkr.toLocaleString()} LKR
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-stone-200">
                  {s.status === 'pending_pickup' && (
                    <button
                      onClick={() => handleUpdateSuborderStatus(s.id, 'dispatched')}
                      className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Mark Dispatched
                    </button>
                  )}
                  {s.status === 'dispatched' && (
                    <button
                      onClick={() => handleUpdateSuborderStatus(s.id, 'delivered')}
                      className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Mark Delivered at Hub
                    </button>
                  )}
                  {s.status === 'delivered' && (
                    <span className="text-xs text-stone-500 font-medium italic">
                      Awaiting buyer quality inspection & confirmation
                    </span>
                  )}
                  {s.status === 'completed' && (
                    <span className="text-xs text-emerald-800 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Suborder Completed & Settled
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Surplus Flagging Desk & Instant Demand Matching */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-800" />
            <h3 className="text-base font-bold text-stone-900">
              Post-Harvest Surplus Flagging & Direct Buyer Matching
            </h3>
          </div>
          <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
            Food Waste Mitigation Feature
          </span>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          National Institute of Post Harvest Management (NIPHM) data reveals that uncoordinated surplus left at farm gates accounts for extensive loss. Flag your remaining unallocated harvest stock to instantly match with restaurants, juice bars, or aggregators.
        </p>

        {/* Flag Surplus Form */}
        <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
          <span className="text-xs font-bold text-stone-900 block">Flag Remaining Stock as Surplus:</span>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-[11px] text-stone-600 block mb-1">Select Listing</label>
              <select
                value={selectedListingForSurplus}
                onChange={(e) => setSelectedListingForSurplus(e.target.value)}
                className="w-full border border-stone-300 rounded p-1.5 bg-white font-medium"
              >
                {listings.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.product_name} ({l.available_to_promise} kg available)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-stone-600 block mb-1">Surplus Quantity (kg)</label>
              <input
                type="number"
                value={surplusQty}
                onChange={(e) => setSurplusQty(Number(e.target.value))}
                className="w-full border border-stone-300 rounded p-1.5 bg-white font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-stone-600 block mb-1">Discount Incentive (%)</label>
              <input
                type="number"
                value={surplusDiscount}
                onChange={(e) => setSurplusDiscount(Number(e.target.value))}
                className="w-full border border-stone-300 rounded p-1.5 bg-white font-mono"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleFlagSurplus}
                className="w-full py-1.5 px-3 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publish Surplus Flag</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active Surplus Matches */}
        {surplusMatches.length > 0 && (
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold text-stone-900 block">
              Active Surplus Matches Found ({surplusMatches.length}):
            </span>
            <div className="space-y-2">
              {surplusMatches.map((m, idx) => (
                <div key={idx} className="p-3 bg-emerald-50/70 border border-emerald-300 rounded-lg text-xs flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900">{m.producer_name} ({m.producer_district})</span>
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="font-bold text-stone-900">{m.buyer_name} ({m.buyer_org})</span>
                    </div>
                    <div className="text-[11px] text-stone-600 mt-1">
                      Matched: <strong className="font-mono text-emerald-900">{m.flagged_qty} kg</strong> | Discounted Price: <strong className="font-mono">{m.discounted_price} LKR/kg</strong> (Original: {m.original_price} LKR)
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-1 rounded border border-emerald-200">
                    {m.match_suitability}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
