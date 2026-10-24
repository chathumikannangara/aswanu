export interface User {
  id: string;
  role: 'producer' | 'buyer' | 'reviewer' | 'admin';
  name: string;
  email: string;
  district: string;
  phone?: string;
  organization?: string;
}

export interface Listing {
  id: string;
  producer_id: string;
  producer_name?: string;
  producer_org?: string;
  producer_phone?: string;
  product_name: string;
  grade: 'Grade A' | 'Grade B' | 'Export Grade';
  canonical_unit: string;
  on_hand_qty: number;
  expected_harvest_qty: number;
  expected_harvest_date?: string | null;
  asking_price_per_kg: number;
  district: string;
  min_lot_size: number;
  lead_time_days: number;
  delivery_capability: 'seller_delivers' | 'buyer_pickup' | 'negotiable';
  packaging_type: string;
  status: 'active' | 'paused' | 'depleted';
  available_to_promise: number;
  atp_info?: {
    on_hand_qty: number;
    committed_qty: number;
    available_to_promise: number;
  };
}

export interface ProcurementRequest {
  id: string;
  buyer_id: string;
  buyer_name?: string;
  buyer_org?: string;
  buyer_phone?: string;
  request_number: string;
  product_name: string;
  required_qty: number;
  canonical_unit: string;
  required_grade: 'Grade A' | 'Grade B' | 'Export Grade';
  destination_district: string;
  delivery_window_start: string;
  delivery_window_end: string;
  max_target_budget_lkr?: number | null;
  is_budget_private?: boolean;
  expiry_date: string;
  status: 'open' | 'matched' | 'closed' | 'expired' | 'fulfilled';
  notes?: string;
  created_at: string;
}

export interface PlanAllocation {
  listing_id: string;
  producer_id: string;
  producer_name: string;
  producer_org: string;
  district: string;
  allocated_qty: number;
  unallocated_stock_qty: number;
  unit_price: number;
  produce_cost: number;
  transport_cost: number | null;
  transport_payer: 'seller' | 'buyer' | 'unresolved';
  handling_cost: number;
  logistics_status: string;
  handoff_location: string;
  packaging_requirement: string;
  lead_time_days: number;
  fulfilment_contact: string;
}

export interface AllocationPlan {
  plan_id: string;
  plan_name: string;
  plan_badge: string;
  total_quantity: number;
  producer_count: number;
  total_produce_cost: number;
  total_handling_cost: number;
  total_transport_cost: number | null;
  total_buyer_cost: number;
  effective_unit_cost: string;
  logistics_completeness: string;
  has_unresolved_logistics: boolean;
  allocations: PlanAllocation[];
  explanation: string;
  tradeoffs: string;
}

export interface AllocationProposal {
  id: string;
  request_id: string;
  buyer_id: string;
  buyer_name?: string;
  buyer_org?: string;
  proposal_number: string;
  version: number;
  status: 'draft' | 'proposed' | 'accepted_by_all' | 'confirmed' | 'invalidated' | 'rejected' | 'expired';
  plan_name: string;
  total_quantity: number;
  total_buyer_cost_lkr: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProposalAllocationRecord {
  id: string;
  proposal_id: string;
  listing_id: string;
  producer_id: string;
  allocated_qty: number;
  agreed_unit_price: number;
  transport_cost: number;
  transport_payer: string;
  handling_cost: number;
  handoff_location: string;
  packaging_requirement: string;
  fulfilment_contact: string;
  producer_acceptance_status: 'pending' | 'accepted' | 'rejected';
  producer_accepted_at?: string;
  producer_rejection_reason?: string;
  product_name?: string;
  grade?: string;
  producer_district?: string;
  producer_name?: string;
  producer_org?: string;
  producer_phone?: string;
  proposal_number?: string;
  version?: number;
  proposal_status?: string;
}

export interface ParentOrder {
  id: string;
  request_id: string;
  proposal_id: string;
  buyer_id: string;
  order_number: string;
  total_quantity: number;
  total_amount_lkr: number;
  status: 'confirmed' | 'in_fulfilment' | 'completed' | 'disputed' | 'cancelled';
  delivery_destination: string;
  product_name?: string;
  created_at: string;
  completed_at?: string;
}

export interface Suborder {
  id: string;
  parent_order_id: string;
  proposal_allocation_id: string;
  producer_id: string;
  listing_id: string;
  suborder_number: string;
  allocated_qty: number;
  agreed_price_per_kg: number;
  total_suborder_amount_lkr: number;
  transport_responsibility: string;
  packaging_notes: string;
  status: 'pending_pickup' | 'dispatched' | 'delivered' | 'completed' | 'disputed' | 'cancelled';
  product_name?: string;
  grade?: string;
  producer_name?: string;
  producer_org?: string;
  producer_district?: string;
  buyer_name?: string;
  buyer_org?: string;
  created_at: string;
}

export interface VerificationSubmission {
  id: string;
  producer_id: string;
  producer_name?: string;
  producer_org?: string;
  producer_district?: string;
  evidence_type: 'business_reg' | 'gap_cert' | 'pesticide_test' | 'land_deed' | 'coop_membership';
  document_name: string;
  document_url: string;
  submission_notes?: string;
  status: 'pending' | 'reviewed_approved' | 'reviewed_rejected';
  reviewer_decision_notes?: string;
  reviewer_id?: string;
  reviewed_at?: string;
  valid_until?: string;
  is_simulated_demo: number;
  created_at: string;
}

export interface SurplusMatch {
  surplus_id: string;
  listing_id: string;
  producer_name: string;
  producer_district: string;
  flagged_qty: number;
  original_price: number;
  discounted_price: number;
  request_id: string;
  request_number: string;
  buyer_name: string;
  buyer_org: string;
  buyer_district: string;
  requested_qty: number;
  match_suitability: string;
}

export interface AnalyticsData {
  disclaimer: string;
  metrics: {
    confirmed_quantity_kg: number;
    completed_quantity_kg: number;
    due_committed_quantity_kg: number;
    fulfilment_rate_percent: number;
    cancelled_commitments_count: number;
    redirected_surplus_kg: number;
    registered_producers_count: number;
    registered_buyers_count: number;
    average_time_to_first_proposal: string;
  };
  formula_disclosure: {
    fulfilment_rate: string;
    redirected_surplus: string;
    available_to_promise: string;
  };
}

export interface AcceptanceTestReport {
  total_tests: number;
  passed_count: number;
  failed_count: number;
  all_passed: boolean;
  results: Array<{
    code: string;
    title: string;
    passed: boolean;
    details: any;
    timestamp: string;
  }>;
}
