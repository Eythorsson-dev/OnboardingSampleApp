import React, { useState, useEffect } from 'react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'customer-info', label: 'Customer Info' },
  { id: 'data-mapping', label: 'Data Mapping' },
  { id: 'tenant-setup', label: 'Tenant Setup' },
  { id: 'import', label: 'Import' }
];

const STEP_STATUSES = ['pending', 'in_progress', 'completed', 'failed'];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [onboardingData, setOnboardingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/onboarding')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Invalid response format');
        return data;
      })
      .then(data => {
        setOnboardingData(data);
        setError(null);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch onboarding data:', err);
        setError(err.message);
        setOnboardingData([]);
        setLoading(false);
      });
  }, []);

  const handleStepUpdate = (customerId, updated) => {
    setOnboardingData(prev =>
      prev.map(item =>
        item.customerId === customerId
          ? { ...item, steps: updated.steps, progressPercent: updated.progressPercent }
          : item
      )
    );
  };

  return (
    <div className="app">
      <header>
        <h1>Onboarding Dashboard</h1>
        <p>Customer Success Team - Internal Tool</p>
      </header>

      <nav className="tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {activeTab === 'dashboard' && (
          <DashboardTab
            data={onboardingData}
            loading={loading}
            error={error}
            onStepUpdate={handleStepUpdate}
          />
        )}
        {activeTab === 'customer-info' && (
          <PlaceholderTab title="Customer Info" description="Collect and validate customer information" />
        )}
        {activeTab === 'data-mapping' && (
          <PlaceholderTab title="Data Mapping" description="Map customer data to platform configuration" />
        )}
        {activeTab === 'tenant-setup' && (
          <PlaceholderTab title="Tenant Setup" description="Provision and configure customer tenant" />
        )}
        {activeTab === 'import' && (
          <PlaceholderTab title="Import" description="Import customer data into the platform" />
        )}
      </main>
    </div>
  );
}

function DashboardTab({ data, loading, error, onStepUpdate }) {
  if (loading) {
    return <div className="placeholder"><p>Loading...</p></div>;
  }

  if (error) {
    return (
      <div className="placeholder">
        <p style={{ color: '#dc2626' }}>⚠️ Failed to load onboarding data</p>
        <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="placeholder"><p>No customers in the onboarding queue</p></div>;
  }

  return (
    <div>
      <h2>Onboarding Queue</h2>
      <p style={{ color: '#6b7280', marginBottom: '20px' }}>
        {data.length} customer(s) awaiting onboarding
      </p>

      {data.map(item => (
        <CustomerCard key={item.customerId} item={item} onStepUpdate={onStepUpdate} />
      ))}
    </div>
  );
}

function CustomerCard({ item, onStepUpdate }) {
  const [updateError, setUpdateError] = useState(null);

  const handleStatusChange = async (stepId, status) => {
    setUpdateError(null);
    try {
      const res = await fetch(`/api/customers/${item.customerId}/onboarding/steps/${stepId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      onStepUpdate(item.customerId, body);
    } catch (err) {
      setUpdateError(err.message);
    }
  };

  return (
    <div className="customer-card">
      <h3>{item.customerName}</h3>
      <div className="customer-meta">
        <span>📍 {item.customerRegion}</span>
        <span>🏭 {item.customerIndustry}</span>
      </div>

      <div className="progress-section">
        <ProgressBar percent={item.progressPercent} />
        <Checklist steps={item.steps} onStatusChange={handleStatusChange} />
      </div>

      {updateError && <p className="update-error">⚠️ {updateError}</p>}
    </div>
  );
}

function ProgressBar({ percent }) {
  return (
    <div className="progress-bar-container">
      <div 
        className="progress-bar" 
        style={{ width: `${Math.max(percent, 0)}%` }}
      >
        {percent > 0 ? `${percent}%` : ''}
      </div>
    </div>
  );
}

function Checklist({ steps, onStatusChange }) {
  return (
    <ul className="checklist">
      {steps.map(step => (
        <li key={step.id}>
          <span className={`step-status ${step.status}`}>
            {step.status === 'completed' ? '✓' : step.order}
          </span>
          <span>{step.name}</span>
          <select
            className="step-status-select"
            value={step.status}
            aria-label={`Status for ${step.name}`}
            onChange={(e) => onStatusChange(step.id, e.target.value)}
          >
            {STEP_STATUSES.map(status => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>
        </li>
      ))}
    </ul>
  );
}

function PlaceholderTab({ title, description }) {
  return (
    <div className="placeholder">
      <h2>{title}</h2>
      <p>{description}</p>
      <p style={{ marginTop: '20px', fontSize: '0.9rem' }}>
        🚧 This section is ready to be built
      </p>
    </div>
  );
}

export default App;
