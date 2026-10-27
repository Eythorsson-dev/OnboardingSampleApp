# What to Build — Slice Plan

## Goal

Customer Success (CS) has a backlog of signed customers who can't use the product until they're set up, and **we only get paid once a customer is fully set up.** This app needs to help CS clear that queue faster.

The tool has to work after every slice, and each slice should make it more useful than the last.

## Where we start

| Tab | State today |
|-----|-------------|
| Dashboard | Works: lists the onboarding queue with a progress bar and checklist. Data is read-only, with one seeded customer (Acme) |
| Customer Info | Placeholder |
| Data Mapping | Placeholder |
| Tenant Setup | Placeholder |
| Import | Placeholder |

- **Server:** `server/src/index.js` (Express on :3001, GET endpoints only). `server/src/data/store.js` holds data in memory and already has the unused helpers `addCustomer`, `addTenant`, `addOnboardingState` and `updateOnboardingState`. `server/src/models/index.js` contains the domain models and `calculateProgress()`.
- **Client:** everything is in `client/src/App.jsx` (React 18 + Vite on :5173; `/api` is proxied to :3001).
- **Onboarding steps (fixed):** `step_1` Customer Info → `step_2` Data Mapping → `step_3` Tenant Setup → `step_4` Import.
- **Sample data:** `sample-data/` has three customers, each exporting Clients, Contacts, Chart of Accounts and Transactions with a different schema (see `sample-data/README.md`).

## Decision needed: target schema

The repo doesn't define the platform's target data model. **Proposal:** use the "Field Concept" column from `sample-data/README.md` as the target for Clients:

| Target field | Type | Customer A | Customer B | Customer C |
|--------------|------|------------|------------|------------|
| `id` | string | Client ID | clientCode | customer_id |
| `name` | string | Client Name | companyName | business_name |
| `entityType` | enum | Business Type | entityType | legal_structure |
| `status` | enum `active` / `inactive` / `pending` | Status | clientStatus | account_status |
| `startDate` | ISO date | Date Onboarded | startDate | registration_date |
| `taxId` | string | Tax ID | federalTaxId | tax_reference |
| `revenue` | number | Annual Revenue | yearlyRevenue | gross_revenue |
| `industry` | string | Industry | sectorCode | industry_sector |
| `paymentTerms` | string | Payment Terms | billingTerms | credit_terms |

The value mappings for picklists (status, entity type, dates and so on) are already listed in `sample-data/README.md`.

---

## Slice 0: a real queue CS can update

**Why first:** this is the smallest useful step. CS can track the whole backlog in the tool right away, even while every task is still done by hand.

**Build:**
- Seed ABC Accounting, XYZ Financial Services and Premier Bookkeeping next to Acme (`store.js` `seedData()`).
- Add an endpoint: `PATCH /api/customers/:id/onboarding/steps/:stepId` with body `{ "status": "completed" }` (or `pending`, `in_progress` or `failed`).
- Recalculate `progressPercent` with `calculateProgress()` inside `updateOnboardingState`.
- UI: a status control on each checklist item in the Dashboard.

**Done when:**
- The Dashboard shows 4 customers.
- Marking a step `completed` updates the checkmark and the progress bar (1 of 4 = 25%) without a page reload.
- An e2e test covers marking a step done.

---

## Slice 1: Customer Info

**Why:** new signings reach the queue without anyone editing code.

**Build:**
- Add an endpoint: `POST /api/customers` with body `{ name, industry, region, contactEmail }`. It creates the customer, a `pending` tenant and an onboarding state with 4 pending steps.
- Validation: `name` is required and `contactEmail` must be a valid email. Invalid input returns `400` with a message.
- UI: a form in the Customer Info tab. After saving, `step_1` is `completed` and the customer appears in the Dashboard.

**Done when:**
- Adding a customer through the form shows it in the queue at 25%.
- Invalid input shows an error, and nothing is created.

---

## Slice 2: Data Mapping (clients first)

**Why:** this is the step that takes CS longest by hand, so a guided UI saves the most time.

**Build, thinnest first:**
1. **Column mapping:** upload `clients.csv` (or choose a sample folder). The tool shows the source columns next to the target fields, auto-suggests matches from the table above, and lets CS change any of them. Save the mapping per customer.
2. **Date format:** detect `MM/DD/YYYY`, `YYYY-MM-DD` or `DD-MM-YYYY` from the data, and let CS confirm.
3. **Value mapping:** for picklist fields, list the distinct source values and map each one to a target value (e.g. `A` / `ACTIVE` / `Active` → `active`).
4. Then do the same for Contacts, Chart of Accounts and Transactions.

**Watch out:** `sample-data/CustomerB_XYZFinancialServices/clients.csv` contains unquoted commas in every row, and `CustomerA_ABCAccounting/chart_of_accounts.csv` has one (line 33). Use a real CSV parser, and fix or flag those rows rather than silently misreading columns.

**Done when:**
- For each of the three sample customers, the saved client mapping covers every target field, and `step_2` is `completed`.

---

## Slice 3: Tenant Setup

**Why:** CS can see and control provisioning instead of chasing it elsewhere.

**Build:**
- UI: pick a plan (`starter` / `professional` / `enterprise`) and press "Provision".
- Add an endpoint: `POST /api/tenants/:customerId/provision`. Simulate the work: status moves `pending` → `provisioning` → `active` (or `failed`, with a retry button).
- When the tenant becomes `active`, `step_3` is marked `completed`.

**Done when:**
- Provisioning a tenant shows its status change in the UI, and the Dashboard shows the step as done.

---

## Slice 4: Import

**Why:** this finishes onboarding, which is the point where we get paid.

**Build:**
- Apply the saved mapping to the uploaded file. Normalize dates to ISO, map picklist values, and parse numbers.
- Preview the first rows after mapping, and list the rows that fail validation with the reason.
- An "Import" button stores the valid records in memory and reports the result (e.g. *12 imported, 0 rejected*).
- After a successful import, `step_4` is `completed`, and the customer reaches 100%.

**Done when:**
- Each of the three sample customers' clients can be imported end to end, with rejected rows reported.

---

## Suggested sprint plan (5 × 8 minutes)

| Sprint | Slice | What CS gets |
|--------|-------|--------------|
| 1 | Slice 0 | A real queue they can update |
| 2 | Slice 1 | Add new customers themselves |
| 3 | Slice 2.1 (column mapping, clients only) | Guided mapping for the hardest step |
| 4 | Slice 4 (clients only) | One customer's clients go all the way through the flow |
| 5 | Slice 2.2–2.3 or Slice 3 | Whichever CS needs most |

**Principle:** get one entity (clients) for one customer all the way through the flow before going wide. Five tabs that each half-work are worth less than one path that works end to end.

## Out of scope (for now)

Authentication, a persistent database, real tenant provisioning, multiple users and visual polish. Add them only when CS asks for them.
