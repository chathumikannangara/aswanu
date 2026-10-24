# Aswanu (අස්වනු / அறுவடை)
### Multi-Producer Agricultural Procurement & Landed Cost Coordination Platform
*Sri Lanka Prototype & Hackathon Reference Implementation*

---

## 1. Brand Status & Legal Clearance Notice
> [!WARNING]
> **PROVISIONAL HACKATHON WORKING NAME ONLY — NOT A CLEARED BRAND**
> An established Sri Lankan agricultural marketplace already operates as **[Asvanu.lk](https://asvanu.lk/) (අස්වනු.lk)**, serving local farmers and buyers. The sound, spelling, Sinhala rendering, sector, and audience overlap.
> Treating “Aswanu” as a legally cleared brand for public launch would be a high-risk mistake. Do not register a commercial domain, publish a mobile app, or claim exclusive trademark rights under this name without a formal search and legal availability clearance with the **National Intellectual Property Office (NIPO)**. Be prepared to rebrand prior to public launch.

### Typographic Lockup Brief
- **Primary Script (English):** `Aswanu` (Clean, authoritative serif typography)
- **Supporting Script (Sinhala):** `අස්වනු` (Exact Sinhala word for harvest/yield)
- **Supporting Script (Tamil):** `அறுவடை` (Accurate Tamil translation of the *harvest* concept from the Cambridge English-Tamil dictionary, *not* a phonetic transliteration of the English word)
- **Glyph Integrity:** All three scripts are rendered with equal dignity and intentional hierarchy. Glyphs from different writing systems are **never spliced** into one word.
- **Harvest Symbol:** Interlocking geometric grain sheaves and logistics nodes representing multi-producer aggregation, deliberately avoiding the generic "leaf-and-circuit" trope. Variants include Horizontal, Stacked, Icon-only, and Monochrome High-Contrast.

---

## 2. Evidence-Based Stress Test & Loopholes Fixed

| Original Claim / Idea | Verdict | Better Move Implemented in Aswanu |
| :--- | :--- | :--- |
| **“A farmer–buyer marketplace is novel in Sri Lanka.”** | **Wrong.** Asvanu.lk and GoviNet already operate marketplaces. | Positioned around **buyer-led multi-producer aggregation, explicit allocations, itemized landed cost, and consent-based two-sided fulfilment**. |
| **“AI matching alone makes us different.”** | **Weak.** GoviHub Spices advertises multi-parameter matching engines. | Implemented a **provable constrained optimization engine** enforcing hard feasibility, full-order fulfillment, NIPHM packaging standards, and landed cost disclosure. Naive baselines are proven to fail order feasibility. |
| **“Matching surplus will substantially reduce food waste.”** | **Unsupported as a causal claim.** Per the National Institute of Post Harvest Management (NIPHM), transport and packaging cause the vast bulk of fruit losses. | Tracks **actual redirected volume to verified buyers**, enforces rigid plastic crates over poly-sacks, and records pickup/delivery accountability rather than equating an on-screen match with saved food. |
| **“A polished app proves market demand.”** | **Unproven.** | Formalized a **Pre-Launch Field Validation Protocol** targeting interviews with 5 commercial buyers, 10 producers, and 2 freight operators before capital deployment. |
| **Single-seller order model with 3 example suppliers (530 kg for 500 kg order)** | **Flawed demo math.** All 3 were mandatory, preventing meaningful plan comparison. | Seeded **4 eligible tomato suppliers (200 + 180 + 150 + 220 = 750 kg)** and generated at least **2 distinct feasible allocation plans** (Plan 1: Lowest Landed Cost; Plan 2: Unresolved Freight). |
| **Listing quantity treated as freely available during chat.** | **Overselling risk.** | Available-to-Promise (ATP) computed dynamically: `on_hand_qty - committed_suborders`. Atomic confirmation executed in server SQLite `BEGIN IMMEDIATE` transactions. Stale proposals fail with clear recovery paths. |
| **Material term edits during negotiation.** | **Lack of consent.** | Any material change to quantity, price, or logistics creates a **new proposal version** and revokes prior producer acceptances back to `pending`. |
| **Private ceiling budget leaked to suppliers.** | **Privacy violation.** | Access matrix strictly enforced: server **redacts `max_target_budget_lkr`** from all queries executed by producers or non-owners. |
| **Unverified certification badges.** | **Regulatory risk.** | Verification records audit evidence type, reviewer ID, timestamp, and expiry. All prototype approvals are explicitly labeled **“Simulated Demonstration Review”**. |

---

## 3. System Architecture & Tech Stack

```
   ┌─────────────────────────────────────────────────────────────┐
   │             React 19 + TypeScript + Vite SPA                │
   │  (BrandHeader | BuyerDesk | ProducerPortal | ReviewerDesk)  │
   └──────────────────────────────┬──────────────────────────────┘
                                  │ HTTP / JSON API
   ┌──────────────────────────────▼──────────────────────────────┐
   │             Express 5 REST API Server (Node v26)            │
   │  - authMiddleware (RBAC & Persona Switcher)                 │
   │  - Constrained Multi-Producer Matching Engine               │
   │  - Natural Language Procurement Assistant (Structured JSON)│
   │  - Atomic Order Confirmation Transaction Manager            │
   └──────────────────────────────┬──────────────────────────────┘
                                  │ Direct native sync driver
   ┌──────────────────────────────▼──────────────────────────────┐
   │             Node.js Native `node:sqlite` Database           │
   │  - Persistent `aswanu.db` with WAL Journaling Mode          │
   │  - PRAGMA foreign_keys = ON; BEGIN IMMEDIATE transactions   │
   │  - Normalized schema: users, listings, requests, proposals, │
   │    proposal_allocations, parent_orders, suborders, events   │
   └─────────────────────────────────────────────────────────────┘
```

- **Runtime & Persistence:** Node.js v26 using built-in `node:sqlite` (`DatabaseSync`). Pure native execution with zero native binary compilation issues on Windows.
- **Transactions:** High-concurrency Write-Ahead Logging (`PRAGMA journal_mode = WAL`) and `BEGIN IMMEDIATE` transactions to prevent race conditions and overselling.
- **Frontend:** React 19, TypeScript, Lucide Icons, and responsive design supporting mobile and desktop form factors.
- **Localization Foundation:** Custom typographic support with Google Fonts (`Noto Sans Sinhala`, `Noto Sans Tamil`, `Inter`, `Merriweather`).

---

## 4. Automated Acceptance Test Suite (10/10 PASS)

The test suite programmatically tests all 10 hard criteria specified in the brief against live database transactions:

```
[PASS] Test (a): Full allocation sums exactly to 500 kg
       Details: Plan 1 allocates Sunil: 200kg + Kandy-NE: 180kg + Uva: 120kg = 500 kg
[PASS] Test (b): Incompatible grade, date, unit, and min lot excluded with clear reasons
       Details: Hambantota excluded: Grade mismatch (Grade B vs Grade A) & Lead time (5d > 3d)
[PASS] Test (c): Two plans with known costs rank reproducibly
       Details: Plan 1 (190.30 LKR/kg) ranks above Plan 2 (184.00 LKR/kg + Freight)
[PASS] Test (d): Missing logistics cost is explicitly surfaced and marked conditional
       Details: Plan 2 surfaces Raja Greenery transport_cost as null (UNRESOLVED)
[PASS] Test (e): Changing terms increments version and revokes earlier acceptance
       Details: Material terms edit increments to v2 and resets status to 'pending'
[PASS] Test (f): Concurrent requests cannot oversell stock (atomic server transaction rollback)
       Details: Oversell attempt blocked atomically; ATP correctly reflects committed stock
[PASS] Test (g): Producers cannot access buyer's private ceiling budget or confidential records
       Details: max_target_budget_lkr redacted from producer query views
[PASS] Test (h): Only authorized users change suborder and fulfilment status
       Details: Producer cannot modify another producer's suborder
[PASS] Test (i): Refresh and sign-in retain records in persistent SQLite database
       Details: Validated against persistent aswanu.db file
[PASS] Test (j): Entire buyer-producer-reviewer walkthrough succeeds end-to-end
       Details: Request -> Plan -> Proposal -> Accept -> Confirm -> Suborder -> Surplus -> Review
```

---

## 5. Seeded Walkthrough Dataset

All dates are generated dynamically relative to the seed/reset timestamp so the demo never expires:

1. **Sunil Bandara (Sunil Organic Farms, Matale / Dambulla Hub):**
   - 200 kg Grade A tomatoes on hand | 180 LKR/kg | Lead: 1 day | Seller delivers in NIPHM rigid crates.
2. **Kavinda Jayasuriya (Kandy-NE Agro Cooperative, Nuwara Eliya):**
   - 180 kg Grade A tomatoes on hand | 195 LKR/kg | Lead: 2 days | Seller delivers in foam-divider crates.
3. **Rajaratnam Sivakumar (Raja Greenery Farms, Anuradhapura):**
   - 150 kg Grade A tomatoes on hand | 175 LKR/kg | Lead: 2 days | Logistics negotiable (Surfaces unquoted freight!).
4. **Anula Wijesinghe (Uva Highland Produce, Badulla):**
   - 220 kg Grade A tomatoes on hand | 190 LKR/kg | Lead: 1 day | Seller delivers in reinforced lugs.
5. **Gamini Dissanayake (Ruhuna Lowland Farms, Hambantota) [INFEASIBLE]:**
   - 300 kg Grade B tomatoes | Lead: 5 days | Excluded by feasibility filter (grade mismatch & lead time).
6. **Colombo Central Kitchens (Buyer 1):**
   - 500 kg Grade A tomatoes request to Colombo within 3 days. Private ceiling: 215 LKR/kg.
7. **Pettah Fresh Juices (Buyer 2):**
   - 30 kg tomato request. Instantly matches with post-allocation surplus stock.

---

## 6. How to Run Locally

### Prerequisites
- Node.js v22+ (tested on Node.js v26.3.0)
- npm v10+

### Installation & Build
```powershell
# Navigate to the project directory
cd C:\Users\LOQ\.gemini\antigravity\scratch\aswanu

# Install dependencies (if not already installed)
npm install

# Seed the persistent SQLite database
npm run seed

# Run the 10 automated acceptance tests
npm test

# Build the production frontend assets
npm run build

# Start the full-stack server (Serves REST API + built SPA on port 3001)
npm start
```

### Accessing the Web Interface
Open your browser at:
`http://localhost:3001`

Use the **Active Persona** selector in the top-right header to instantly switch roles between Buyer, Producers, and Reviewer. Click **“Reset Demo”** at any time to restore the database to its initial deterministic state.
