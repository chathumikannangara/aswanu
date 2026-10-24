import {
  User, Listing, ProcurementRequest, AllocationPlan, AllocationProposal,
  ProposalAllocationRecord, ParentOrder, Suborder, VerificationSubmission,
  SurplusMatch, AnalyticsData, AcceptanceTestReport
} from './types';

let currentPersonaId = 'usr_buyer_colombo';

export function setActivePersonaId(id: string) {
  currentPersonaId = id;
}

export function getActivePersonaId(): string {
  return currentPersonaId;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (currentPersonaId) {
    headers.set('x-persona-id', currentPersonaId);
  }

  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers
  });

  if (!res.ok) {
    let errMessage = `Error ${res.status}: ${res.statusText}`;
    try {
      const json = await res.json();
      if (json.error) errMessage = json.error;
    } catch (_) {}
    throw new Error(errMessage);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Personas
  getPersonas: () => request<{ users: User[] }>('/auth/personas'),
  getCurrentUser: () => request<{ user: User }>('/auth/me'),

  // Listings
  getListings: () => request<{ listings: Listing[] }>('/listings'),
  createListing: (data: Partial<Listing>) => request<{ id: string; message: string }>('/listings', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Requests
  getRequests: () => request<{ requests: ProcurementRequest[] }>('/requests'),
  getRequest: (id: string) => request<{ request: ProcurementRequest }>(`/requests/${id}`),
  createRequest: (data: Partial<ProcurementRequest>) => request<{ id: string; request_number: string; message: string }>('/requests', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  parseNLRequest: (prompt: string) => request<{
    parsed: Partial<ProcurementRequest>;
    missing_fields: string[];
    confidence_score: number;
    note: string;
  }>('/requests/parse-nl', {
    method: 'POST',
    body: JSON.stringify({ prompt })
  }),

  // Matching & Proposals
  getPlans: (requestId: string) => request<{
    request: ProcurementRequest;
    target_quantity: number;
    is_full_match_feasible: boolean;
    capacity_shortfall_kg: number;
    plans: AllocationPlan[];
    infeasible_candidates: any[];
    baseline_comparison: any;
    message?: string;
  }>(`/requests/${requestId}/plans`),

  createProposal: (requestId: string, plan: Partial<AllocationPlan>) => request<{ proposal_id: string; proposal_number: string; message: string }>(`/requests/${requestId}/proposals`, {
    method: 'POST',
    body: JSON.stringify(plan)
  }),

  getProposal: (id: string) => request<{ proposal: AllocationProposal; allocations: ProposalAllocationRecord[] }>(`/proposals/${id}`),

  createProposalVersion: (id: string, revisedAllocations: any[], reason: string) => request<{ message: string; version: number }>(`/proposals/${id}/new-version`, {
    method: 'POST',
    body: JSON.stringify({ revised_allocations: revisedAllocations, reason })
  }),

  // Producer Quotation Actions
  getProducerAllocations: () => request<{ allocations: ProposalAllocationRecord[] }>('/producer/allocations'),
  respondToAllocation: (allocationId: string, decision: 'accepted' | 'rejected', reason?: string) => request<{ message: string; all_accepted: boolean }>(`/allocations/${allocationId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ decision, rejection_reason: reason })
  }),

  // Atomic Confirmation
  confirmProposal: (proposalId: string) => request<{ order_id: string; order_number: string; message: string }>(`/proposals/${proposalId}/confirm`, {
    method: 'POST'
  }),

  // Orders & Suborders
  getOrders: () => request<{ orders?: ParentOrder[]; suborders?: Suborder[] }>('/orders'),
  getOrder: (id: string) => request<{ order: ParentOrder; suborders: Suborder[] }>(`/orders/${id}`),
  updateSuborderStatus: (suborderId: string, newStatus: string, note?: string) => request<{ message: string }>(`/suborders/${suborderId}/status`, {
    method: 'POST',
    body: JSON.stringify({ new_status: newStatus, note })
  }),

  // Surplus
  flagSurplus: (data: { listing_id: string; flagged_qty: number; discount_percent: number; notes?: string }) => request<{ id: string; message: string }>('/surplus/flag', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getSurplusMatches: () => request<{ surplus_flags: any[]; matches: SurplusMatch[] }>('/surplus/matches'),

  // Reviewer
  getVerifications: () => request<{ submissions: VerificationSubmission[] }>('/reviewer/submissions'),
  decideVerification: (id: string, decision: 'reviewed_approved' | 'reviewed_rejected', notes: string) => request<{ message: string }>(`/reviewer/submissions/${id}/decide`, {
    method: 'POST',
    body: JSON.stringify({ decision, notes })
  }),

  // Analytics
  getAnalytics: () => request<AnalyticsData>('/analytics'),

  // Acceptance Tests
  runTests: () => request<AcceptanceTestReport>('/tests/run', { method: 'POST' }),

  // Reset Demo
  resetDemo: () => request<{ message: string }>('/demo/reset', { method: 'POST' })
};
