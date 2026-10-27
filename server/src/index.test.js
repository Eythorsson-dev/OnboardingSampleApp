const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

// index.js only calls app.listen() when run directly (require.main === module),
// so requiring it here just gives us the configured Express app.
const app = require('./index');

describe('PATCH /api/customers/:id/onboarding/steps/:stepId', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const { port } = server.address();
    baseUrl = `http://localhost:${port}`;
  });

  after(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  async function patchStep(customerId, stepId, body) {
    const res = await fetch(`${baseUrl}/api/customers/${customerId}/onboarding/steps/${stepId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return { status: res.status, body: await res.json() };
  }

  it('updates a step and returns the recalculated onboarding state (200)', async () => {
    const { status, body } = await patchStep('cust_002', 'step_1', { status: 'completed' });

    assert.strictEqual(status, 200);
    assert.strictEqual(body.progressPercent, 25);
    assert.strictEqual(body.steps.find(s => s.id === 'step_1').status, 'completed');
  });

  it('rejects an invalid status enum value (400)', async () => {
    const { status, body } = await patchStep('cust_002', 'step_2', { status: 'done' });

    assert.strictEqual(status, 400);
    assert.ok(body.error);
  });

  it('returns 404 for an unknown customer id', async () => {
    const { status, body } = await patchStep('cust_unknown', 'step_1', { status: 'completed' });

    assert.strictEqual(status, 404);
    assert.ok(body.error);
  });

  it('returns 404 for an unknown step id', async () => {
    const { status, body } = await patchStep('cust_002', 'step_unknown', { status: 'completed' });

    assert.strictEqual(status, 404);
    assert.ok(body.error);
  });
});
