import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import crypto from 'node:crypto';

const DB_PATH = path.resolve(process.cwd(), 'aswanu.db');

export const db = new DatabaseSync(DB_PATH);

// Configure WAL mode and foreign keys
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
`);

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK(role IN ('producer', 'buyer', 'reviewer', 'admin')),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      district TEXT NOT NULL,
      phone TEXT,
      organization TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      producer_id TEXT NOT NULL REFERENCES users(id),
      product_name TEXT NOT NULL,
      grade TEXT NOT NULL CHECK(grade IN ('Grade A', 'Grade B', 'Export Grade')),
      canonical_unit TEXT NOT NULL DEFAULT 'kg',
      on_hand_qty REAL NOT NULL DEFAULT 0,
      expected_harvest_qty REAL NOT NULL DEFAULT 0,
      expected_harvest_date TEXT,
      asking_price_per_kg REAL NOT NULL,
      district TEXT NOT NULL,
      min_lot_size REAL NOT NULL DEFAULT 10,
      lead_time_days INTEGER NOT NULL DEFAULT 1,
      delivery_capability TEXT NOT NULL CHECK(delivery_capability IN ('seller_delivers', 'buyer_pickup', 'negotiable')),
      packaging_type TEXT NOT NULL DEFAULT 'Plastic crates (NIPHM standard)',
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'depleted')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS procurement_requests (
      id TEXT PRIMARY KEY,
      buyer_id TEXT NOT NULL REFERENCES users(id),
      request_number TEXT UNIQUE NOT NULL,
      product_name TEXT NOT NULL,
      required_qty REAL NOT NULL,
      canonical_unit TEXT NOT NULL DEFAULT 'kg',
      required_grade TEXT NOT NULL CHECK(required_grade IN ('Grade A', 'Grade B', 'Export Grade')),
      destination_district TEXT NOT NULL,
      delivery_window_start TEXT NOT NULL,
      delivery_window_end TEXT NOT NULL,
      max_target_budget_lkr REAL,
      expiry_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'matched', 'closed', 'expired', 'fulfilled')),
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS allocation_proposals (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL REFERENCES procurement_requests(id),
      buyer_id TEXT NOT NULL REFERENCES users(id),
      proposal_number TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'proposed', 'accepted_by_all', 'confirmed', 'invalidated', 'rejected', 'expired')),
      plan_name TEXT NOT NULL,
      total_quantity REAL NOT NULL,
      total_buyer_cost_lkr REAL NOT NULL,
      cost_breakdown_json TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS proposal_allocations (
      id TEXT PRIMARY KEY,
      proposal_id TEXT NOT NULL REFERENCES allocation_proposals(id) ON DELETE CASCADE,
      listing_id TEXT NOT NULL REFERENCES listings(id),
      producer_id TEXT NOT NULL REFERENCES users(id),
      allocated_qty REAL NOT NULL,
      agreed_unit_price REAL NOT NULL,
      transport_cost REAL NOT NULL DEFAULT 0,
      transport_payer TEXT NOT NULL DEFAULT 'seller' CHECK(transport_payer IN ('seller', 'buyer', 'unresolved')),
      handling_cost REAL NOT NULL DEFAULT 0,
      handoff_location TEXT NOT NULL,
      packaging_requirement TEXT NOT NULL,
      fulfilment_contact TEXT NOT NULL,
      producer_acceptance_status TEXT NOT NULL DEFAULT 'pending' CHECK(producer_acceptance_status IN ('pending', 'accepted', 'rejected')),
      producer_accepted_at TEXT,
      producer_rejection_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS parent_orders (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL REFERENCES procurement_requests(id),
      proposal_id TEXT NOT NULL REFERENCES allocation_proposals(id),
      buyer_id TEXT NOT NULL REFERENCES users(id),
      order_number TEXT UNIQUE NOT NULL,
      total_quantity REAL NOT NULL,
      total_amount_lkr REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'in_fulfilment', 'completed', 'disputed', 'cancelled')),
      delivery_destination TEXT NOT NULL,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS suborders (
      id TEXT PRIMARY KEY,
      parent_order_id TEXT NOT NULL REFERENCES parent_orders(id) ON DELETE CASCADE,
      proposal_allocation_id TEXT NOT NULL REFERENCES proposal_allocations(id),
      producer_id TEXT NOT NULL REFERENCES users(id),
      listing_id TEXT NOT NULL REFERENCES listings(id),
      suborder_number TEXT UNIQUE NOT NULL,
      allocated_qty REAL NOT NULL,
      agreed_price_per_kg REAL NOT NULL,
      total_suborder_amount_lkr REAL NOT NULL,
      transport_responsibility TEXT NOT NULL,
      packaging_notes TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_pickup' CHECK(status IN ('pending_pickup', 'dispatched', 'delivered', 'completed', 'disputed', 'cancelled')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS suborder_events (
      id TEXT PRIMARY KEY,
      suborder_id TEXT NOT NULL REFERENCES suborders(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      note TEXT,
      actor_id TEXT NOT NULL REFERENCES users(id),
      actor_role TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS surplus_flags (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL REFERENCES listings(id),
      producer_id TEXT NOT NULL REFERENCES users(id),
      flagged_qty REAL NOT NULL,
      asking_price_discount_percent REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'matched', 'resolved', 'cancelled')),
      matched_request_id TEXT REFERENCES procurement_requests(id),
      notes TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS verification_submissions (
      id TEXT PRIMARY KEY,
      producer_id TEXT NOT NULL REFERENCES users(id),
      evidence_type TEXT NOT NULL CHECK(evidence_type IN ('business_reg', 'gap_cert', 'pesticide_test', 'land_deed', 'coop_membership')),
      document_name TEXT NOT NULL,
      document_url TEXT NOT NULL,
      submission_notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed_approved', 'reviewed_rejected')),
      reviewer_decision_notes TEXT,
      reviewer_id TEXT REFERENCES users(id),
      reviewed_at TEXT,
      valid_until TEXT,
      is_simulated_demo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      details_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_listings_producer ON listings(producer_id);
    CREATE INDEX IF NOT EXISTS idx_requests_buyer ON procurement_requests(buyer_id);
    CREATE INDEX IF NOT EXISTS idx_proposals_request ON allocation_proposals(request_id);
    CREATE INDEX IF NOT EXISTS idx_suborders_parent ON suborders(parent_order_id);
    CREATE INDEX IF NOT EXISTS idx_suborders_producer ON suborders(producer_id);
  `);
}

/**
 * Computes Available-To-Promise (ATP) for a given listing.
 * ATP = on_hand_qty - confirmed uncancelled allocations
 */
export function getListingATP(listingId) {
  const listingStmt = db.prepare('SELECT id, on_hand_qty, expected_harvest_qty, status FROM listings WHERE id = ?');
  const listing = listingStmt.get(listingId);
  if (!listing) return 0;
  if (listing.status !== 'active') return 0;

  const committedStmt = db.prepare(`
    SELECT COALESCE(SUM(s.allocated_qty), 0) AS committed_qty
    FROM suborders s
    WHERE s.listing_id = ? AND s.status != 'cancelled'
  `);
  const result = committedStmt.get(listingId);
  const committed = Number(result?.committed_qty || 0);

  const atp = Math.max(0, Number(listing.on_hand_qty) - committed);
  return {
    listing_id: listingId,
    on_hand_qty: Number(listing.on_hand_qty),
    expected_harvest_qty: Number(listing.expected_harvest_qty),
    committed_qty: committed,
    available_to_promise: atp
  };
}

/**
 * Audit log helper
 */
export function recordAudit(userId, action, resourceType, resourceId, details) {
  const id = 'aud_' + crypto.randomBytes(8).toString('hex');
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, userId || 'system', action, resourceType, resourceId || null, JSON.stringify(details || {}), now);
  return id;
}
