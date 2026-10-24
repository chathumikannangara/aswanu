import crypto from 'node:crypto';
import { db, initSchema } from './db.js';

export function hashPassword(password) {
  // Simple deterministic hash for demo accounts
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function seedDatabase(options = {}) {
  initSchema();

  // Clear existing demo tables if resetting
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM verification_submissions;
    DELETE FROM surplus_flags;
    DELETE FROM suborder_events;
    DELETE FROM suborders;
    DELETE FROM parent_orders;
    DELETE FROM proposal_allocations;
    DELETE FROM allocation_proposals;
    DELETE FROM procurement_requests;
    DELETE FROM listings;
    DELETE FROM users;
  `);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const datePlusDays = (days) => {
    const d = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  };

  const defaultPasswordHash = hashPassword('demo1234');

  // Insert Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, role, name, email, password_hash, district, phone, organization, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const users = [
    {
      id: 'usr_buyer_colombo',
      role: 'buyer',
      name: 'Nalin Perera (Procurement Manager)',
      email: 'buyer@colombofresh.lk',
      district: 'Colombo',
      phone: '+94 77 123 4567',
      organization: 'Colombo Central Kitchens Ltd'
    },
    {
      id: 'usr_buyer_pettah',
      role: 'buyer',
      name: 'Fathima Rizwan (Operations)',
      email: 'buyer2@pettahjuice.lk',
      district: 'Colombo',
      phone: '+94 71 987 6543',
      organization: 'Pettah Fresh Juices & Smoothies'
    },
    {
      id: 'usr_prod_sunil',
      role: 'producer',
      name: 'Sunil Bandara',
      email: 'sunil@dambullafarms.lk',
      district: 'Matale',
      phone: '+94 78 234 5678',
      organization: 'Sunil Organic Farms (Dambulla)'
    },
    {
      id: 'usr_prod_kandy',
      role: 'producer',
      name: 'Kavinda Jayasuriya',
      email: 'kandy@nefresh.lk',
      district: 'Nuwara Eliya',
      phone: '+94 76 345 6789',
      organization: 'Kandy-NE Agro Cooperative'
    },
    {
      id: 'usr_prod_raja',
      role: 'producer',
      name: 'Rajaratnam Sivakumar',
      email: 'raja@anuradhapura.lk',
      district: 'Anuradhapura',
      phone: '+94 72 456 7890',
      organization: 'Raja Greenery Farms'
    },
    {
      id: 'usr_prod_uva',
      role: 'producer',
      name: 'Anula Wijesinghe',
      email: 'uva@highland.lk',
      district: 'Badulla',
      phone: '+94 75 567 8901',
      organization: 'Uva Highland Produce'
    },
    {
      id: 'usr_prod_ruhuna',
      role: 'producer',
      name: 'Gamini Dissanayake',
      email: 'ruhuna@hambantota.lk',
      district: 'Hambantota',
      phone: '+94 70 678 9012',
      organization: 'Ruhuna Lowland Farms'
    },
    {
      id: 'usr_reviewer_compliance',
      role: 'reviewer',
      name: 'Dr. Chathurika Senaratne',
      email: 'reviewer@aswanu-demo.gov.lk',
      district: 'Colombo',
      phone: '+94 11 234 0099',
      organization: 'Sri Lanka Agri-Standard simulated audit desk'
    }
  ];

  for (const u of users) {
    insertUser.run(u.id, u.role, u.name, u.email, defaultPasswordHash, u.district, u.phone, u.organization, now.toISOString());
  }

  // Insert Produce Listings
  const insertListing = db.prepare(`
    INSERT INTO listings (
      id, producer_id, product_name, grade, canonical_unit, on_hand_qty, expected_harvest_qty,
      expected_harvest_date, asking_price_per_kg, district, min_lot_size, lead_time_days,
      delivery_capability, packaging_type, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const listings = [
    // 4 Seeded Eligible Suppliers
    {
      id: 'list_sunil_tomatoes',
      producer_id: 'usr_prod_sunil',
      product_name: 'Tomatoes (Thalathuoya/Hybrid)',
      grade: 'Grade A',
      canonical_unit: 'kg',
      on_hand_qty: 200,
      expected_harvest_qty: 50,
      expected_harvest_date: datePlusDays(4),
      asking_price_per_kg: 180,
      district: 'Matale', // Dambulla hub
      min_lot_size: 50,
      lead_time_days: 1,
      delivery_capability: 'seller_delivers',
      packaging_type: 'Rigid ventilated plastic crates (NIPHM Post-Harvest std)',
      status: 'active'
    },
    {
      id: 'list_kandy_tomatoes',
      producer_id: 'usr_prod_kandy',
      product_name: 'Tomatoes (Highland Salad)',
      grade: 'Grade A',
      canonical_unit: 'kg',
      on_hand_qty: 180,
      expected_harvest_qty: 40,
      expected_harvest_date: datePlusDays(5),
      asking_price_per_kg: 195,
      district: 'Nuwara Eliya',
      min_lot_size: 60,
      lead_time_days: 2,
      delivery_capability: 'seller_delivers',
      packaging_type: 'Stackable crates with foam dividers',
      status: 'active'
    },
    {
      id: 'list_raja_tomatoes',
      producer_id: 'usr_prod_raja',
      product_name: 'Tomatoes (Dry Zone Beefsteak)',
      grade: 'Grade A',
      canonical_unit: 'kg',
      on_hand_qty: 150,
      expected_harvest_qty: 0,
      expected_harvest_date: null,
      asking_price_per_kg: 175,
      district: 'Anuradhapura',
      min_lot_size: 50,
      lead_time_days: 2,
      delivery_capability: 'negotiable', // Logistics quote needed!
      packaging_type: 'Plastic field crates',
      status: 'active'
    },
    {
      id: 'list_uva_tomatoes',
      producer_id: 'usr_prod_uva',
      product_name: 'Tomatoes (Uva Crimson)',
      grade: 'Grade A',
      canonical_unit: 'kg',
      on_hand_qty: 220,
      expected_harvest_qty: 80,
      expected_harvest_date: datePlusDays(3),
      asking_price_per_kg: 190,
      district: 'Badulla',
      min_lot_size: 50,
      lead_time_days: 1,
      delivery_capability: 'seller_delivers',
      packaging_type: 'Reinforced plastic lugs',
      status: 'active'
    },
    // Infeasible Supplier: Hambantota Grade B / Long lead time
    {
      id: 'list_ruhuna_tomatoes',
      producer_id: 'usr_prod_ruhuna',
      product_name: 'Tomatoes (Cooking Grade)',
      grade: 'Grade B', // INFEASIBLE: Grade mismatch for Grade A
      canonical_unit: 'kg',
      on_hand_qty: 300,
      expected_harvest_qty: 100,
      expected_harvest_date: datePlusDays(7),
      asking_price_per_kg: 140,
      district: 'Hambantota',
      min_lot_size: 100,
      lead_time_days: 5, // INFEASIBLE: Exceeds 3-day delivery window
      delivery_capability: 'buyer_pickup',
      packaging_type: 'Jute sacks (unapproved high-bruise)',
      status: 'active'
    }
  ];

  for (const l of listings) {
    insertListing.run(
      l.id, l.producer_id, l.product_name, l.grade, l.canonical_unit,
      l.on_hand_qty, l.expected_harvest_qty, l.expected_harvest_date,
      l.asking_price_per_kg, l.district, l.min_lot_size, l.lead_time_days,
      l.delivery_capability, l.packaging_type, l.status,
      now.toISOString(), now.toISOString()
    );
  }

  // Insert Buyer Procurement Requests
  const insertReq = db.prepare(`
    INSERT INTO procurement_requests (
      id, buyer_id, request_number, product_name, required_qty, canonical_unit,
      required_grade, destination_district, delivery_window_start, delivery_window_end,
      max_target_budget_lkr, expiry_date, status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const requests = [
    {
      id: 'req_colombo_500kg',
      buyer_id: 'usr_buyer_colombo',
      request_number: 'REQ-2026-COL-001',
      product_name: 'Tomatoes',
      required_qty: 500,
      canonical_unit: 'kg',
      required_grade: 'Grade A',
      destination_district: 'Colombo',
      delivery_window_start: todayStr,
      delivery_window_end: datePlusDays(3),
      max_target_budget_lkr: 215, // PRIVATE ceiling: 215 LKR/kg
      expiry_date: datePlusDays(2),
      status: 'open',
      notes: 'For multi-branch central catering prep. Requires rigid crates to prevent post-harvest crushing. NIPHM packaging standard enforced.'
    },
    {
      id: 'req_pettah_30kg',
      buyer_id: 'usr_buyer_pettah',
      request_number: 'REQ-2026-PET-002',
      product_name: 'Tomatoes',
      required_qty: 30,
      canonical_unit: 'kg',
      required_grade: 'Grade A',
      destination_district: 'Colombo',
      delivery_window_start: todayStr,
      delivery_window_end: datePlusDays(2),
      max_target_budget_lkr: 190,
      expiry_date: datePlusDays(2),
      status: 'open',
      notes: 'Need 30 kg for daily cold press juice and soup prep at Pettah shop. Ideal match for post-allocation remaining surplus stock.'
    }
  ];

  for (const r of requests) {
    insertReq.run(
      r.id, r.buyer_id, r.request_number, r.product_name, r.required_qty, r.canonical_unit,
      r.required_grade, r.destination_district, r.delivery_window_start, r.delivery_window_end,
      r.max_target_budget_lkr, r.expiry_date, r.status, r.notes, now.toISOString(), now.toISOString()
    );
  }

  // Insert Verification Submissions
  const insertVerif = db.prepare(`
    INSERT INTO verification_submissions (
      id, producer_id, evidence_type, document_name, document_url, submission_notes,
      status, reviewer_decision_notes, reviewer_id, reviewed_at, valid_until, is_simulated_demo, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const verifications = [
    {
      id: 'verif_sunil_gap',
      producer_id: 'usr_prod_sunil',
      evidence_type: 'gap_cert',
      document_name: 'SL-GAP-Matale-Cert-2026-089.pdf',
      document_url: '/demo-evidence/slgap_sunil_farms.pdf',
      submission_notes: 'Sri Lanka Good Agricultural Practices renewal audit by Dept of Agriculture.',
      status: 'reviewed_approved',
      reviewer_decision_notes: 'Simulated Demo Audit: Verified against simulated DOA registry database. Physical farm audit passed.',
      reviewer_id: 'usr_reviewer_compliance',
      reviewed_at: datePlusDays(-5),
      valid_until: datePlusDays(180),
      is_simulated_demo: 1
    },
    {
      id: 'verif_raja_pesticide',
      producer_id: 'usr_prod_raja',
      evidence_type: 'pesticide_test',
      document_name: 'Lab-Report-Residue-Screen-Anuradhapura-441.pdf',
      document_url: '/demo-evidence/residue_raja.pdf',
      submission_notes: 'Industrial Technology Institute (ITI) simulated multi-residue test screen report.',
      status: 'pending',
      reviewer_decision_notes: null,
      reviewer_id: null,
      reviewed_at: null,
      valid_until: null,
      is_simulated_demo: 1
    }
  ];

  for (const v of verifications) {
    insertVerif.run(
      v.id, v.producer_id, v.evidence_type, v.document_name, v.document_url,
      v.submission_notes, v.status, v.reviewer_decision_notes, v.reviewer_id,
      v.reviewed_at, v.valid_until, v.is_simulated_demo, now.toISOString()
    );
  }

  return { message: 'Database seeded successfully with deterministic test dataset' };
}
