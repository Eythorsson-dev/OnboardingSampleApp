const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

// store.js seeds data at require-time and holds it in module-level state,
// so re-require fresh per test via the module cache to get a clean store.
function freshStore() {
  delete require.cache[require.resolve('./store')];
  return require('./store');
}

describe('Data Store', () => {
  let store;

  beforeEach(() => {
    store = freshStore();
  });

  describe('seedData', () => {
    it('seeds exactly 4 customers', () => {
      const customers = store.getCustomers();
      assert.strictEqual(customers.length, 4);
    });

    it('seeds the expected customer names', () => {
      const names = store.getCustomers().map(c => c.name).sort();
      assert.deepStrictEqual(names, [
        'ABC Accounting',
        'Acme Corporation',
        'Premier Bookkeeping',
        'XYZ Financial Services'
      ]);
    });

    it('seeds 4 onboarding states, each with progressPercent 0 and 4 pending steps', () => {
      const states = store.getAllOnboardingStates();
      assert.strictEqual(states.length, 4);
      for (const state of states) {
        assert.strictEqual(state.progressPercent, 0);
        assert.strictEqual(state.steps.length, 4);
        assert.ok(state.steps.every(s => s.status === 'pending'));
      }
    });

    it('seeds a pending tenant with distinct ids for each customer', () => {
      const tenants = store.getTenants();
      assert.strictEqual(tenants.length, 4);
      const ids = tenants.map(t => t.id);
      assert.strictEqual(new Set(ids).size, 4);
      assert.ok(tenants.every(t => t.status === 'pending'));
    });
  });

  describe('updateOnboardingStepStatus', () => {
    it('updates the step status and recalculates progressPercent (1/4 completed = 25)', () => {
      const outcome = store.updateOnboardingStepStatus('cust_001', 'step_1', 'completed');

      assert.strictEqual(outcome.result, 'ok');
      assert.strictEqual(outcome.state.progressPercent, 25);
      const updatedStep = outcome.state.steps.find(s => s.id === 'step_1');
      assert.strictEqual(updatedStep.status, 'completed');
    });

    it('persists the change in the store', () => {
      store.updateOnboardingStepStatus('cust_001', 'step_1', 'completed');

      const reloaded = store.getOnboardingState('cust_001');
      assert.strictEqual(reloaded.progressPercent, 25);
      assert.strictEqual(reloaded.steps.find(s => s.id === 'step_1').status, 'completed');
    });

    it('recalculates progress down when a completed step is reverted (2/4 -> 1/4 = 25)', () => {
      store.updateOnboardingStepStatus('cust_001', 'step_1', 'completed');
      store.updateOnboardingStepStatus('cust_001', 'step_2', 'completed');
      let state = store.getOnboardingState('cust_001');
      assert.strictEqual(state.progressPercent, 50);

      store.updateOnboardingStepStatus('cust_001', 'step_2', 'pending');
      state = store.getOnboardingState('cust_001');
      assert.strictEqual(state.progressPercent, 25);
    });

    it('returns customer_not_found for an unknown customer id', () => {
      const outcome = store.updateOnboardingStepStatus('cust_unknown', 'step_1', 'completed');
      assert.strictEqual(outcome.result, 'customer_not_found');
    });

    it('returns step_not_found for an unknown step id on a known customer', () => {
      const outcome = store.updateOnboardingStepStatus('cust_001', 'step_unknown', 'completed');
      assert.strictEqual(outcome.result, 'step_not_found');
    });
  });

  describe('live reference protection (issue #3)', () => {
    it('getCustomerById returns a copy, not the live store object', () => {
      const customer = store.getCustomerById('cust_001');
      customer.name = 'Mutated Name';

      const reloaded = store.getCustomerById('cust_001');
      assert.strictEqual(reloaded.name, 'Acme Corporation');
    });

    it('getTenantByCustomerId returns a copy, not the live store object', () => {
      const tenant = store.getTenantByCustomerId('cust_001');
      tenant.status = 'active';

      const reloaded = store.getTenantByCustomerId('cust_001');
      assert.strictEqual(reloaded.status, 'pending');
    });

    it('getOnboardingState returns a copy, not the live store object', () => {
      const state = store.getOnboardingState('cust_001');
      state.progressPercent = 999;
      state.steps[0].status = 'completed';

      const reloaded = store.getOnboardingState('cust_001');
      assert.strictEqual(reloaded.progressPercent, 0);
      assert.strictEqual(reloaded.steps[0].status, 'pending');
    });
  });
});
