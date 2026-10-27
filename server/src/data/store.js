/**
 * In-Memory Data Store
 * Simple storage for the training exercise - no database needed
 */

const { createCustomer, createTenant, createDefaultOnboardingSteps, calculateProgress } = require('../models');

// In-memory storage
const store = {
  customers: [],
  tenants: [],
  onboardingStates: []
};

// Seed with example data
function seedData() {
  // Example customer - Acme Corporation
  const exampleCustomer = createCustomer({
    id: 'cust_001',
    name: 'Acme Corporation',
    industry: 'Manufacturing',
    region: 'North America',
    contactEmail: 'onboarding@acme.example.com',
    createdAt: '2025-01-15T10:00:00Z'
  });

  // Example tenant for Acme
  const exampleTenant = createTenant({
    id: 'tenant_001',
    customerId: 'cust_001',
    status: 'pending',
    plan: 'professional',
    createdAt: '2025-01-15T10:00:00Z'
  });

  // Example onboarding state - just started, nothing completed
  const exampleOnboardingState = {
    customerId: 'cust_001',
    steps: createDefaultOnboardingSteps(),
    progressPercent: 0
  };

  store.customers.push(exampleCustomer);
  store.tenants.push(exampleTenant);
  store.onboardingStates.push(exampleOnboardingState);

  // Additional seed customers, matching later-slice sample-data folders:
  // CustomerA_ABCAccounting, CustomerB_XYZFinancialServices, CustomerC_PremierBookkeeping
  const seedDefinitions = [
    {
      customer: {
        id: 'cust_002',
        name: 'ABC Accounting',
        industry: 'Accounting',
        region: 'North America',
        contactEmail: 'onboarding@abcaccounting.example.com',
        createdAt: '2025-02-01T09:00:00Z'
      },
      tenant: { id: 'tenant_002', customerId: 'cust_002', status: 'pending', plan: 'starter', createdAt: '2025-02-01T09:00:00Z' }
    },
    {
      customer: {
        id: 'cust_003',
        name: 'XYZ Financial Services',
        industry: 'Financial Services',
        region: 'North America',
        contactEmail: 'onboarding@xyzfinancial.example.com',
        createdAt: '2025-02-05T09:00:00Z'
      },
      tenant: { id: 'tenant_003', customerId: 'cust_003', status: 'pending', plan: 'starter', createdAt: '2025-02-05T09:00:00Z' }
    },
    {
      customer: {
        id: 'cust_004',
        name: 'Premier Bookkeeping',
        industry: 'Bookkeeping',
        region: 'North America',
        contactEmail: 'onboarding@premierbookkeeping.example.com',
        createdAt: '2025-02-10T09:00:00Z'
      },
      tenant: { id: 'tenant_004', customerId: 'cust_004', status: 'pending', plan: 'starter', createdAt: '2025-02-10T09:00:00Z' }
    }
  ];

  for (const { customer, tenant } of seedDefinitions) {
    store.customers.push(createCustomer(customer));
    store.tenants.push(createTenant(tenant));
    store.onboardingStates.push({
      customerId: customer.id,
      steps: createDefaultOnboardingSteps(),
      progressPercent: 0
    });
  }
}

// Initialize with seed data
seedData();

// Store access functions
function getCustomers() {
  return [...store.customers];
}

function getCustomerById(id) {
  const customer = store.customers.find(c => c.id === id);
  return customer ? structuredClone(customer) : undefined;
}

function addCustomer(customer) {
  store.customers.push(customer);
  return customer;
}

function getTenants() {
  return [...store.tenants];
}

function getTenantByCustomerId(customerId) {
  const tenant = store.tenants.find(t => t.customerId === customerId);
  return tenant ? structuredClone(tenant) : undefined;
}

function addTenant(tenant) {
  store.tenants.push(tenant);
  return tenant;
}

function getOnboardingState(customerId) {
  const state = store.onboardingStates.find(s => s.customerId === customerId);
  return state ? structuredClone(state) : undefined;
}

function getAllOnboardingStates() {
  return [...store.onboardingStates];
}

function addOnboardingState(state) {
  store.onboardingStates.push(state);
  return state;
}

function updateOnboardingState(customerId, updates) {
  const index = store.onboardingStates.findIndex(s => s.customerId === customerId);
  if (index === -1) {
    return null;
  }
  const merged = { ...store.onboardingStates[index], ...updates };
  // Progress is always derived from the steps array, never set directly.
  merged.progressPercent = calculateProgress(merged.steps);
  store.onboardingStates[index] = merged;
  return structuredClone(merged);
}

/**
 * Updates a single onboarding step's status for a customer and recalculates progress.
 * @param {string} customerId
 * @param {string} stepId
 * @param {string} status
 * @returns {{ result: 'ok', state: object } | { result: 'customer_not_found' } | { result: 'step_not_found' }}
 */
function updateOnboardingStepStatus(customerId, stepId, status) {
  const index = store.onboardingStates.findIndex(s => s.customerId === customerId);
  if (index === -1) {
    return { result: 'customer_not_found' };
  }
  const state = store.onboardingStates[index];
  const stepExists = state.steps.some(s => s.id === stepId);
  if (!stepExists) {
    return { result: 'step_not_found' };
  }
  const updatedSteps = state.steps.map(s => (s.id === stepId ? { ...s, status } : s));
  const updatedState = updateOnboardingState(customerId, { steps: updatedSteps });
  return { result: 'ok', state: updatedState };
}

module.exports = {
  getCustomers,
  getCustomerById,
  addCustomer,
  getTenants,
  getTenantByCustomerId,
  addTenant,
  getOnboardingState,
  getAllOnboardingStates,
  addOnboardingState,
  updateOnboardingState,
  updateOnboardingStepStatus
};
