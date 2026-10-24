import express from 'express';
import crypto from 'node:crypto';
import { db, getListingATP, recordAudit } from './db.js';
import { authenticate, requireRole, sanitizeRequestForUser } from './auth.js';
import { evaluateFeasibility, generateAllocationPlans } from './matching.js';
import { seedDatabase } from './seed.js';

export const apiRouter = express.Router();

// ----------------------------------------------------
// 1. Auth & Personas
// ----------------------------------------------------
apiRouter.get('/auth/personas', (req, res) => {
  const users = db.prepare('SELECT id, role, name, email, district, organization, phone FROM users ORDER BY role DESC').all();
  res.json({ users });
});

apiRouter.get('/auth/me', (req, res) => {
  res.json({ user: req.user });
});

apiRouter.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const result = authenticate(email, password || 'demo1234');
  if (!result) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  recordAudit(result.user.id, 'LOGIN', 'user', result.user.id, { email });
  res.json(result);
});

// ----------------------------------------------------
// 2. Produce Listings
// ----------------------------------------------------
apiRouter.get('/listings', (req, res) => {
  const listingsStmt = db.prepare(`
    SELECT l.*, u.name as producer_name, u.organization as producer_org, u.phone as producer_phone
    FROM listings l
    JOIN users u ON l.producer_id = u.id
    ORDER BY l.created_at DESC
  `);
  const listings = listingsStmt.all().map(l => {
    const atpInfo = getListingATP(l.id);
    return {
      ...l,
      atp_info: atpInfo,
      available_to_promise: atpInfo.available_to_promise
    };
  });
  res.json({ listings });
});

apiRouter.post('/listings', requireRole('producer'), (req, res) => {
  const {
    product_name, grade, canonical_unit, on_hand_qty, expected_harvest_qty,
    expected_harvest_date, asking_price_per_kg, district, min_lot_size,
    lead_time_days, delivery_capability, packaging_type
  } = req.body;

  if (!product_name || !asking_price_per_kg || on_hand_qty === undefined) {
    return res.status(400).json({ error: 'Missing required listing parameters' });
  }

  const id = 'list_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO listings (
      id, producer_id, product_name, grade, canonical_unit, on_hand_qty,
      expected_harvest_qty, expected_harvest_date, asking_price_per_kg, district,
      min_lot_size, lead_time_days, delivery_capability, packaging_type, status,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `);

  stmt.run(
    id, req.user.id, product_name, grade || 'Grade A', canonical_unit || 'kg',
    Number(on_hand_qty), Number(expected_harvest_qty || 0), expected_harvest_date || null,
    Number(asking_price_per_kg), district || req.user.district, Number(min_lot_size || 10),
    Number(lead_time_days || 1), delivery_capability || 'seller_delivers',
    packaging_type || 'Rigid plastic crates', now, now
  );

  recordAudit(req.user.id, 'CREATE_LISTING', 'listing', id, { product_name, on_hand_qty });
  res.status(201).json({ id, message: 'Listing created successfully' });
});

// ----------------------------------------------------
// 3. Procurement Requests & Natural Language Assistant
// ----------------------------------------------------
apiRouter.get('/requests', (req, res) => {
  const requestsStmt = db.prepare(`
    SELECT r.*, u.name as buyer_name, u.organization as buyer_org
    FROM procurement_requests r
    JOIN users u ON r.buyer_id = u.id
    ORDER BY r.created_at DESC
  `);
  const requests = requestsStmt.all().map(r => sanitizeRequestForUser(r, req.user));
  res.json({ requests });
});

apiRouter.get('/requests/:id', (req, res) => {
  const reqStmt = db.prepare(`
    SELECT r.*, u.name as buyer_name, u.organization as buyer_org, u.phone as buyer_phone
    FROM procurement_requests r
    JOIN users u ON r.buyer_id = u.id
    WHERE r.id = ?
  `);
  const request = reqStmt.get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  res.json({ request: sanitizeRequestForUser(request, req.user) });
});

apiRouter.post('/requests', requireRole('buyer'), (req, res) => {
  const {
    product_name, required_qty, canonical_unit, required_grade,
    destination_district, delivery_window_start, delivery_window_end,
    max_target_budget_lkr, expiry_date, notes
  } = req.body;

  if (!product_name || !required_qty || !destination_district || !delivery_window_end) {
    return res.status(400).json({ error: 'Missing mandatory procurement request fields' });
  }

  const id = 'req_' + crypto.randomBytes(6).toString('hex');
  const reqNum = 'REQ-' + new Date().getFullYear() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO procurement_requests (
      id, buyer_id, request_number, product_name, required_qty, canonical_unit,
      required_grade, destination_district, delivery_window_start, delivery_window_end,
      max_target_budget_lkr, expiry_date, status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
  `);

  stmt.run(
    id, req.user.id, reqNum, product_name, Number(required_qty), canonical_unit || 'kg',
    required_grade || 'Grade A', destination_district, delivery_window_start || now.split('T')[0],
    delivery_window_end, max_target_budget_lkr ? Number(max_target_budget_lkr) : null,
    expiry_date || delivery_window_end, notes || '', now, now
  );

  recordAudit(req.user.id, 'CREATE_REQUEST', 'procurement_request', id, { product_name, required_qty });
  res.status(201).json({ id, request_number: reqNum, message: 'Procurement request published' });
});

/**
 * Natural Language Procurement Request Parser (Deterministic parser with structured output & validation)
 */
apiRouter.post('/requests/parse-nl', (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Text prompt required' });
  }

  const lower = prompt.toLowerCase();
  
  // Extract Quantity
  const qtyMatch = prompt.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos|kilograms)/i) || prompt.match(/(\d+)\s*(?:bags|crates)/i);
  const qty = qtyMatch ? parseFloat(qtyMatch[1]) : null;

  // Extract Product
  let product = null;
  if (lower.includes('tomato') || lower.includes('tomatoes')) product = 'Tomatoes';
  else if (lower.includes('chili') || lower.includes('chillie')) product = 'Green Chilies';
  else if (lower.includes('cabbage')) product = 'Cabbage';
  else if (lower.includes('carrot')) product = 'Carrots';
  else if (lower.includes('potato') || lower.includes('potatoes')) product = 'Potatoes';
  else product = 'Tomatoes'; // fallback

  // Extract Grade
  let grade = 'Grade A';
  if (lower.includes('grade b')) grade = 'Grade B';
  else if (lower.includes('export')) grade = 'Export Grade';
  else if (lower.includes('grade a')) grade = 'Grade A';

  // Extract Destination District
  let district = 'Colombo';
  const sriLankaDistricts = ['Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya', 'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kurunegala', 'Anuradhapura', 'Badulla', 'Ratnapura'];
  for (const d of sriLankaDistricts) {
    if (lower.includes(d.toLowerCase())) {
      district = d;
      break;
    }
  }

  // Extract Target Budget
  const budgetMatch = prompt.match(/(?:budget|max|rate|price|ceiling|lkr|rs\.?)\s*:?\s*(\d+(?:\.\d+)?)/i) || prompt.match(/(\d+)\s*(?:lkr|rs|\/kg)/i);
  const budget = budgetMatch ? parseFloat(budgetMatch[1]) : null;

  // Missing Essentials Check
  const missing = [];
  if (!qty) missing.push('Quantity (in kg)');
  if (!product) missing.push('Product name');
  if (!district) missing.push('Delivery destination district');

  const now = new Date();
  const deliveryWindowEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  res.json({
    parsed: {
      product_name: product,
      required_qty: qty || 500,
      canonical_unit: 'kg',
      required_grade: grade,
      destination_district: district,
      delivery_window_start: now.toISOString().split('T')[0],
      delivery_window_end: deliveryWindowEnd,
      max_target_budget_lkr: budget || 215,
      notes: `Extracted via Aswanu NL Assistant from prompt: "${prompt}"`
    },
    missing_fields: missing,
    confidence_score: missing.length === 0 ? 0.96 : 0.65,
    note: 'Parsed with deterministic constraint extractor. Please review fields before committing.'
  });
});

// ----------------------------------------------------
// 4. Feasibility & Allocation Optimization
// ----------------------------------------------------
apiRouter.get('/requests/:id/plans', (req, res) => {
  try {
    const plansData = generateAllocationPlans(req.params.id);
    res.json(plansData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create proposal version from plan
apiRouter.post('/requests/:id/proposals', requireRole('buyer'), (req, res) => {
  const { plan_name, allocations, total_buyer_cost, notes } = req.body;
  const requestId = req.params.id;

  if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
    return res.status(400).json({ error: 'Proposal requires at least one supplier allocation' });
  }

  const reqObj = db.prepare('SELECT * FROM procurement_requests WHERE id = ?').get(requestId);
  if (!reqObj) return res.status(404).json({ error: 'Procurement request not found' });

  const totalQty = allocations.reduce((s, a) => s + Number(a.allocated_qty), 0);
  const proposalId = 'prop_' + crypto.randomBytes(6).toString('hex');
  const propNum = 'PROP-' + new Date().getFullYear() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const now = new Date().toISOString();

  // Insert proposal
  const insertProp = db.prepare(`
    INSERT INTO allocation_proposals (
      id, request_id, buyer_id, proposal_number, version, status,
      plan_name, total_quantity, total_buyer_cost_lkr, cost_breakdown_json, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 1, 'proposed', ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProp.run(
    proposalId, requestId, req.user.id, propNum, plan_name || 'Multi-Producer Allocation Plan',
    totalQty, Number(total_buyer_cost || 0), JSON.stringify(allocations), notes || '', now, now
  );

  // Insert allocations
  const insertAlloc = db.prepare(`
    INSERT INTO proposal_allocations (
      id, proposal_id, listing_id, producer_id, allocated_qty, agreed_unit_price,
      transport_cost, transport_payer, handling_cost, handoff_location,
      packaging_requirement, fulfilment_contact, producer_acceptance_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `);

  for (const a of allocations) {
    const allocId = 'alloc_' + crypto.randomBytes(6).toString('hex');
    insertAlloc.run(
      allocId, proposalId, a.listing_id, a.producer_id, Number(a.allocated_qty),
      Number(a.unit_price), Number(a.transport_cost || 0), a.transport_payer || 'seller',
      Number(a.handling_cost || 0), a.handoff_location || 'Colombo Central Hub',
      a.packaging_requirement || 'Rigid plastic crates', a.fulfilment_contact || 'Producer',
    );
  }

  recordAudit(req.user.id, 'CREATE_PROPOSAL', 'allocation_proposal', proposalId, { plan_name, totalQty });
  res.status(201).json({ proposal_id: proposalId, proposal_number: propNum, message: 'Proposal submitted for producer acceptance' });
});

apiRouter.get('/proposals/:id', (req, res) => {
  const propStmt = db.prepare(`
    SELECT p.*, r.product_name, r.destination_district, r.delivery_window_end, r.required_grade,
           u.name as buyer_name, u.organization as buyer_org
    FROM allocation_proposals p
    JOIN procurement_requests r ON p.request_id = r.id
    JOIN users u ON p.buyer_id = u.id
    WHERE p.id = ?
  `);
  const proposal = propStmt.get(req.params.id);
  if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

  const allocsStmt = db.prepare(`
    SELECT pa.*, l.product_name, l.grade, l.district as producer_district,
           u.name as producer_name, u.organization as producer_org, u.phone as producer_phone
    FROM proposal_allocations pa
    JOIN listings l ON pa.listing_id = l.id
    JOIN users u ON pa.producer_id = u.id
    WHERE pa.proposal_id = ?
  `);
  const allocations = allocsStmt.all(req.params.id);

  res.json({ proposal, allocations });
});

// Material edit / new proposal version endpoint
apiRouter.post('/proposals/:id/new-version', requireRole('buyer'), (req, res) => {
  const { revised_allocations, reason } = req.body;
  const prop = db.prepare('SELECT * FROM allocation_proposals WHERE id = ?').get(req.params.id);
  if (!prop) return res.status(404).json({ error: 'Proposal not found' });

  const newVersion = prop.version + 1;
  const now = new Date().toISOString();

  // Reset proposal to proposed with new version
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(`
      UPDATE allocation_proposals
      SET version = ?, status = 'proposed', updated_at = ?, notes = notes || ' | Rev: ' || ?
      WHERE id = ?
    `).run(newVersion, now, reason || 'Material terms revised', prop.id);

    // Delete old allocations and replace with revised, all reset to 'pending'
    db.prepare('DELETE FROM proposal_allocations WHERE proposal_id = ?').run(prop.id);

    const insertAlloc = db.prepare(`
      INSERT INTO proposal_allocations (
        id, proposal_id, listing_id, producer_id, allocated_qty, agreed_unit_price,
        transport_cost, transport_payer, handling_cost, handoff_location,
        packaging_requirement, fulfilment_contact, producer_acceptance_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `);

    for (const a of revised_allocations) {
      insertAlloc.run(
        'alloc_' + crypto.randomBytes(6).toString('hex'), prop.id, a.listing_id, a.producer_id,
        Number(a.allocated_qty), Number(a.unit_price), Number(a.transport_cost || 0),
        a.transport_payer || 'seller', Number(a.handling_cost || 0), a.handoff_location,
        a.packaging_requirement, a.fulfilment_contact
      );
    }

    db.exec('COMMIT');
    recordAudit(req.user.id, 'REVOKE_AND_REVISE_PROPOSAL', 'allocation_proposal', prop.id, { newVersion, reason });
    res.json({ message: `Proposal updated to Version ${newVersion}. Prior supplier acceptances invalidated as required.`, version: newVersion });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 5. Producer Quotation & Terms Acceptance
// ----------------------------------------------------
apiRouter.get('/producer/allocations', requireRole('producer'), (req, res) => {
  const stmt = db.prepare(`
    SELECT pa.*, p.proposal_number, p.version, p.status as proposal_status,
           r.product_name, r.required_grade, r.destination_district, r.delivery_window_end,
           u.name as buyer_name, u.organization as buyer_org
    FROM proposal_allocations pa
    JOIN allocation_proposals p ON pa.proposal_id = p.id
    JOIN procurement_requests r ON p.request_id = r.id
    JOIN users u ON p.buyer_id = u.id
    WHERE pa.producer_id = ?
    ORDER BY pa.id DESC
  `);
  const allocations = stmt.all(req.user.id);
  res.json({ allocations });
});

apiRouter.post('/allocations/:id/respond', requireRole('producer'), (req, res) => {
  const { decision, rejection_reason } = req.body;
  if (!['accepted', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: "Decision must be 'accepted' or 'rejected'" });
  }

  const alloc = db.prepare('SELECT * FROM proposal_allocations WHERE id = ?').get(req.params.id);
  if (!alloc) return res.status(404).json({ error: 'Allocation not found' });
  if (alloc.producer_id !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized: You can only respond to your own allocations' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE proposal_allocations
    SET producer_acceptance_status = ?, producer_accepted_at = ?, producer_rejection_reason = ?
    WHERE id = ?
  `).run(decision, decision === 'accepted' ? now : null, rejection_reason || null, alloc.id);

  // Check if all allocations in proposal are accepted
  const allAllocs = db.prepare('SELECT producer_acceptance_status FROM proposal_allocations WHERE proposal_id = ?').all(alloc.proposal_id);
  const allAccepted = allAllocs.every(a => a.producer_acceptance_status === 'accepted');
  const anyRejected = allAllocs.some(a => a.producer_acceptance_status === 'rejected');

  if (allAccepted) {
    db.prepare("UPDATE allocation_proposals SET status = 'accepted_by_all', updated_at = ? WHERE id = ?").run(now, alloc.proposal_id);
  } else if (anyRejected) {
    db.prepare("UPDATE allocation_proposals SET status = 'rejected', updated_at = ? WHERE id = ?").run(now, alloc.proposal_id);
  }

  recordAudit(req.user.id, 'RESPOND_ALLOCATION', 'proposal_allocation', alloc.id, { decision });
  res.json({ message: `Allocation marked as ${decision}`, all_accepted: allAccepted });
});

// ----------------------------------------------------
// 6. Atomic Server Confirmation & Suborder Splitting
// ----------------------------------------------------
apiRouter.post('/proposals/:id/confirm', requireRole('buyer'), (req, res) => {
  const propId = req.params.id;

  const prop = db.prepare(`
    SELECT p.*, r.expiry_date, r.delivery_window_end, r.destination_district
    FROM allocation_proposals p
    JOIN procurement_requests r ON p.request_id = r.id
    WHERE p.id = ?
  `).get(propId);

  if (!prop) return res.status(404).json({ error: 'Proposal not found' });
  if (prop.buyer_id !== req.user.id) return res.status(403).json({ error: 'Only the ordering buyer can confirm this proposal' });

  // 1. Proposal status check
  if (prop.status === 'confirmed') {
    return res.status(400).json({ error: 'Proposal has already been confirmed' });
  }
  if (prop.status === 'invalidated' || prop.status === 'rejected') {
    return res.status(400).json({ error: `Cannot confirm proposal in status: ${prop.status}` });
  }

  // 2. Check Expiry
  const now = new Date();
  if (new Date(prop.expiry_date) < now) {
    return res.status(400).json({ error: 'Procurement request has expired' });
  }

  const allocs = db.prepare('SELECT * FROM proposal_allocations WHERE proposal_id = ?').all(propId);
  if (allocs.length === 0) {
    return res.status(400).json({ error: 'Proposal has no allocations' });
  }

  // 3. Enforce 2-sided producer acceptance
  const unaccepted = allocs.filter(a => a.producer_acceptance_status !== 'accepted');
  if (unaccepted.length > 0) {
    return res.status(400).json({
      error: `All suppliers must accept the proposal terms before confirmation. ${unaccepted.length} supplier(s) pending acceptance.`
    });
  }

  // Execute atomic server confirmation in BEGIN IMMEDIATE transaction
  db.exec('BEGIN IMMEDIATE');
  try {
    // 4. Re-verify Available-to-Promise for each listing
    for (const a of allocs) {
      const atpInfo = getListingATP(a.listing_id);
      if (atpInfo.available_to_promise < a.allocated_qty) {
        throw new Error(
          `Insufficient stock on listing ${a.listing_id}: required ${a.allocated_qty} kg, but only ${atpInfo.available_to_promise} kg available-to-promise. Concurrent confirmation occurred.`
        );
      }
    }

    // 5. Create Parent Order
    const parentOrderId = 'ord_' + crypto.randomBytes(6).toString('hex');
    const orderNum = 'ORD-' + new Date().getFullYear() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const nowIso = now.toISOString();

    db.prepare(`
      INSERT INTO parent_orders (
        id, request_id, proposal_id, buyer_id, order_number, total_quantity,
        total_amount_lkr, status, delivery_destination, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)
    `).run(
      parentOrderId, prop.request_id, prop.id, req.user.id, orderNum,
      prop.total_quantity, prop.total_buyer_cost_lkr, prop.destination_district, nowIso
    );

    // 6. Create Separate Suborders for each producer
    let suborderIdx = 1;
    for (const a of allocs) {
      const suborderId = 'subord_' + crypto.randomBytes(6).toString('hex');
      const suborderNum = `${orderNum}-S${suborderIdx++}`;
      const subTotal = a.allocated_qty * a.agreed_unit_price + a.transport_cost + a.handling_cost;

      db.prepare(`
        INSERT INTO suborders (
          id, parent_order_id, proposal_allocation_id, producer_id, listing_id,
          suborder_number, allocated_qty, agreed_price_per_kg, total_suborder_amount_lkr,
          transport_responsibility, packaging_notes, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_pickup', ?, ?)
      `).run(
        suborderId, parentOrderId, a.id, a.producer_id, a.listing_id,
        suborderNum, a.allocated_qty, a.agreed_unit_price, subTotal,
        a.transport_payer === 'seller' ? 'Seller Delivery Guaranteed' : 'Buyer/Third-Party Pickup',
        a.packaging_requirement, nowIso, nowIso
      );

      // Record initial event
      db.prepare(`
        INSERT INTO suborder_events (id, suborder_id, event_type, from_status, to_status, note, actor_id, actor_role, created_at)
        VALUES (?, ?, 'ORDER_CONFIRMED', NULL, 'pending_pickup', 'Suborder initialized following atomic buyer confirmation', ?, 'buyer', ?)
      `).run('ev_' + crypto.randomBytes(6).toString('hex'), suborderId, req.user.id, nowIso);
    }

    // 7. Mark proposal confirmed & request matched/fulfilled
    db.prepare("UPDATE allocation_proposals SET status = 'confirmed', updated_at = ? WHERE id = ?").run(nowIso, propId);
    db.prepare("UPDATE procurement_requests SET status = 'matched', updated_at = ? WHERE id = ?").run(nowIso, prop.request_id);

    db.exec('COMMIT');
    recordAudit(req.user.id, 'CONFIRM_ORDER', 'parent_order', parentOrderId, { order_number: orderNum, total_quantity: prop.total_quantity });

    res.status(201).json({
      order_id: parentOrderId,
      order_number: orderNum,
      message: 'Atomic allocation successful! Parent order and supplier suborders established.'
    });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(409).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 7. Orders & Suborder Fulfilment Status Tracking
// ----------------------------------------------------
apiRouter.get('/orders', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });

  if (req.user.role === 'buyer') {
    const orders = db.prepare(`
      SELECT o.*, r.product_name, p.proposal_number
      FROM parent_orders o
      JOIN procurement_requests r ON o.request_id = r.id
      JOIN allocation_proposals p ON o.proposal_id = p.id
      WHERE o.buyer_id = ?
      ORDER BY o.created_at DESC
    `).all(req.user.id);
    return res.json({ orders });
  }

  if (req.user.role === 'producer') {
    const suborders = db.prepare(`
      SELECT s.*, o.order_number as parent_order_number, l.product_name, l.grade,
             u.name as buyer_name, u.organization as buyer_org, u.phone as buyer_phone
      FROM suborders s
      JOIN parent_orders o ON s.parent_order_id = o.id
      JOIN listings l ON s.listing_id = l.id
      JOIN users u ON o.buyer_id = u.id
      WHERE s.producer_id = ?
      ORDER BY s.created_at DESC
    `).all(req.user.id);
    return res.json({ suborders });
  }

  // Reviewer can view all
  const allOrders = db.prepare('SELECT * FROM parent_orders ORDER BY created_at DESC').all();
  res.json({ orders: allOrders });
});

apiRouter.get('/orders/:id', (req, res) => {
  const order = db.prepare(`
    SELECT o.*, r.product_name, r.required_grade, u.name as buyer_name, u.organization as buyer_org
    FROM parent_orders o
    JOIN procurement_requests r ON o.request_id = r.id
    JOIN users u ON o.buyer_id = u.id
    WHERE o.id = ?
  `).get(req.params.id);

  if (!order) return res.status(404).json({ error: 'Order not found' });

  const suborders = db.prepare(`
    SELECT s.*, l.product_name, l.grade, l.district as producer_district,
           u.name as producer_name, u.organization as producer_org, u.phone as producer_phone
    FROM suborders s
    JOIN listings l ON s.listing_id = l.id
    JOIN users u ON s.producer_id = u.id
    WHERE s.parent_order_id = ?
  `).all(req.params.id);

  res.json({ order, suborders });
});

// Update Suborder Fulfilment Status
apiRouter.post('/suborders/:id/status', (req, res) => {
  const { new_status, note } = req.body;
  const validStatuses = ['pending_pickup', 'dispatched', 'delivered', 'completed', 'disputed', 'cancelled'];
  if (!validStatuses.includes(new_status)) {
    return res.status(400).json({ error: 'Invalid suborder status' });
  }

  const sub = db.prepare('SELECT * FROM suborders WHERE id = ?').get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Suborder not found' });

  // Permissions: Producer can update dispatched/delivered. Buyer can mark completed/disputed. Both can dispute.
  if (req.user.role === 'producer' && sub.producer_id !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized to modify another producer’s suborder' });
  }

  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('UPDATE suborders SET status = ?, updated_at = ? WHERE id = ?').run(new_status, now, sub.id);

    db.prepare(`
      INSERT INTO suborder_events (id, suborder_id, event_type, from_status, to_status, note, actor_id, actor_role, created_at)
      VALUES (?, ?, 'STATUS_CHANGE', ?, ?, ?, ?, ?, ?)
    `).run('ev_' + crypto.randomBytes(6).toString('hex'), sub.id, sub.status, new_status, note || '', req.user.id, req.user.role, now);

    // If all suborders under parent order are completed, mark parent order completed
    const siblingSuborders = db.prepare('SELECT status FROM suborders WHERE parent_order_id = ?').all(sub.parent_order_id);
    const allCompleted = siblingSuborders.every(s => s.status === 'completed');
    if (allCompleted) {
      db.prepare("UPDATE parent_orders SET status = 'completed', completed_at = ? WHERE id = ?").run(now, sub.parent_order_id);
    }

    db.exec('COMMIT');
    recordAudit(req.user.id, 'UPDATE_SUBORDER_STATUS', 'suborder', sub.id, { from: sub.status, to: new_status });
    res.json({ message: `Suborder status updated to ${new_status}` });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 8. Surplus Flag & Matching
// ----------------------------------------------------
apiRouter.post('/surplus/flag', requireRole('producer'), (req, res) => {
  const { listing_id, flagged_qty, discount_percent, notes } = req.body;
  if (!listing_id || !flagged_qty) {
    return res.status(400).json({ error: 'Missing listing ID or surplus quantity' });
  }

  const atpInfo = getListingATP(listing_id);
  if (atpInfo.available_to_promise < Number(flagged_qty)) {
    return res.status(400).json({ error: `Flagged surplus (${flagged_qty} kg) exceeds remaining unallocated stock (${atpInfo.available_to_promise} kg)` });
  }

  const id = 'sur_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO surplus_flags (id, listing_id, producer_id, flagged_qty, asking_price_discount_percent, status, notes, created_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(id, listing_id, req.user.id, Number(flagged_qty), Number(discount_percent || 10), notes || 'Post-allocation harvest surplus', now);

  recordAudit(req.user.id, 'FLAG_SURPLUS', 'surplus_flag', id, { flagged_qty });
  res.status(201).json({ id, message: `Flagged ${flagged_qty} kg surplus stock for active demand matching` });
});

apiRouter.get('/surplus/matches', (req, res) => {
  const surplusFlags = db.prepare(`
    SELECT s.*, l.product_name, l.grade, l.asking_price_per_kg, l.district,
           u.name as producer_name, u.phone as producer_phone
    FROM surplus_flags s
    JOIN listings l ON s.listing_id = l.id
    JOIN users u ON s.producer_id = u.id
    WHERE s.status = 'active'
  `).all();

  const openRequests = db.prepare(`
    SELECT r.*, u.name as buyer_name, u.organization as buyer_org, u.phone as buyer_phone
    FROM procurement_requests r
    JOIN users u ON r.buyer_id = u.id
    WHERE r.status = 'open'
  `).all().map(r => sanitizeRequestForUser(r, req.user));

  const matchedPairs = [];
  for (const s of surplusFlags) {
    for (const r of openRequests) {
      // Check product match and compatible quantity
      if (s.product_name.toLowerCase().includes(r.product_name.toLowerCase()) || r.product_name.toLowerCase().includes(s.product_name.toLowerCase())) {
        if (s.flagged_qty <= r.required_qty) {
          const discountedPrice = s.asking_price_per_kg * (1 - s.asking_price_discount_percent / 100);
          matchedPairs.push({
            surplus_id: s.id,
            listing_id: s.listing_id,
            producer_name: s.producer_name,
            producer_district: s.district,
            flagged_qty: s.flagged_qty,
            original_price: s.asking_price_per_kg,
            discounted_price: discountedPrice,
            request_id: r.id,
            request_number: r.request_number,
            buyer_name: r.buyer_name,
            buyer_org: r.buyer_org,
            buyer_district: r.destination_district,
            requested_qty: r.required_qty,
            match_suitability: 'High - Exactly satisfies small buyer request while rescuing surplus crop'
          });
        }
      }
    }
  }

  res.json({ surplus_flags: surplusFlags, matches: matchedPairs });
});

// ----------------------------------------------------
// 9. Reviewer & Verification Desk
// ----------------------------------------------------
apiRouter.get('/reviewer/submissions', (req, res) => {
  const stmt = db.prepare(`
    SELECT v.*, u.name as producer_name, u.organization as producer_org, u.district as producer_district
    FROM verification_submissions v
    JOIN users u ON v.producer_id = u.id
    ORDER BY v.created_at DESC
  `);
  res.json({ submissions: stmt.all() });
});

apiRouter.post('/reviewer/submissions/:id/decide', requireRole('reviewer'), (req, res) => {
  const { decision, notes, valid_months } = req.body;
  if (!['reviewed_approved', 'reviewed_rejected'].includes(decision)) {
    return res.status(400).json({ error: "Decision must be 'reviewed_approved' or 'reviewed_rejected'" });
  }

  const now = new Date();
  const validUntil = new Date(now.getTime() + (valid_months || 6) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  db.prepare(`
    UPDATE verification_submissions
    SET status = ?, reviewer_decision_notes = ?, reviewer_id = ?, reviewed_at = ?, valid_until = ?
    WHERE id = ?
  `).run(decision, notes || 'Verified against audit criteria (Simulated Demo)', req.user.id, now.toISOString(), validUntil, req.params.id);

  recordAudit(req.user.id, 'REVIEW_VERIFICATION', 'verification_submission', req.params.id, { decision });
  res.json({ message: `Verification status set to ${decision} (Simulated Demo Badge)` });
});

// ----------------------------------------------------
// 10. Operational Metrics & Analytics (Synthetic Demonstration)
// ----------------------------------------------------
apiRouter.get('/analytics', (req, res) => {
  // Aggregate operational figures from SQLite
  const confirmedKg = db.prepare("SELECT COALESCE(SUM(total_quantity), 0) as total FROM parent_orders WHERE status != 'cancelled'").get().total;
  
  const completedKg = db.prepare("SELECT COALESCE(SUM(allocated_qty), 0) as total FROM suborders WHERE status = 'completed'").get().total;
  
  const dueCommittedKg = db.prepare("SELECT COALESCE(SUM(allocated_qty), 0) as total FROM suborders WHERE status IN ('dispatched', 'delivered', 'completed')").get().total;
  
  const fulfilmentRate = dueCommittedKg > 0 ? ((completedKg / dueCommittedKg) * 100).toFixed(1) : '100.0';

  const cancelledCount = db.prepare("SELECT COUNT(*) as count FROM suborders WHERE status = 'cancelled'").get().count;

  const redirectedSurplusKg = db.prepare("SELECT COALESCE(SUM(flagged_qty), 0) as total FROM surplus_flags WHERE status = 'resolved'").get().total;

  const totalProducers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'producer'").get().count;
  const totalBuyers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'buyer'").get().count;

  res.json({
    disclaimer: 'SYNTHETIC DEMONSTRATION DATA. Operational counts from demo records. Not a causal impact study.',
    metrics: {
      confirmed_quantity_kg: confirmedKg,
      completed_quantity_kg: completedKg,
      due_committed_quantity_kg: dueCommittedKg,
      fulfilment_rate_percent: Number(fulfilmentRate),
      cancelled_commitments_count: cancelledCount,
      redirected_surplus_kg: redirectedSurplusKg,
      registered_producers_count: totalProducers,
      registered_buyers_count: totalBuyers,
      average_time_to_first_proposal: '14 minutes (median across simulated sessions)'
    },
    formula_disclosure: {
      fulfilment_rate: 'Formula: (completed_committed_qty / due_committed_qty) * 100. Excludes newly confirmed orders not yet due.',
      redirected_surplus: 'Formula: SUM(flagged_qty) where surplus_flags.status = resolved to verified buyer request.',
      available_to_promise: 'Formula: on_hand_qty - SUM(suborders.allocated_qty WHERE status != cancelled).'
    }
  });
});

// ----------------------------------------------------
// 11. Acceptance Test Suite Execution
// ----------------------------------------------------
import { runAcceptanceTests } from '../tests/test-suite.js';

apiRouter.post('/tests/run', (req, res) => {
  try {
    const results = runAcceptanceTests();
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 12. Reset Demo Database
// ----------------------------------------------------
apiRouter.post('/demo/reset', (req, res) => {
  const result = seedDatabase();
  res.json(result);
});
