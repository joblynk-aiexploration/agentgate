import { AdminShell } from "@/components/admin-shell";
import { safeAdminConfig } from "@/lib/store";

export default async function AdminApiPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; cleared?: string; test?: string; risk?: string; error?: string }>;
}) {
  const config = safeAdminConfig();
  const params = await searchParams;

  return (
    <AdminShell>
      <div className="grid two">
        <section className="card">
          <h1>AgentGate API</h1>
          <p className="muted">
            Save the local-only commerce API key here. The full key is stored only in
            ignored server-side config and is never shown after save.
          </p>
          {params.saved ? <p className="badge">Configuration saved</p> : null}
          {params.cleared ? <p className="badge">Configuration cleared</p> : null}
          {params.test ? (
            <p className="badge">
              Test decision: {params.test} · Risk: {params.risk}
            </p>
          ) : null}
          {params.error ? <p style={{ color: "#991b1b" }}>Error: {params.error}</p> : null}
          <form className="form" method="post" action="/api/admin/config">
            <label>
              AgentGate Base URL
              <input className="input" name="agentGateBaseUrl" defaultValue={config.agentGateBaseUrl} />
            </label>
            <label>
              AgentGate API Key
              <input className="input" name="agentGateApiKey" type="password" placeholder={config.keyConfigured ? "Leave blank to keep saved key" : "ag_test_..."} />
            </label>
            <label>
              Agent ID
              <input className="input" name="agentId" defaultValue={config.agentId} />
            </label>
            <label>
              Environment
              <select className="select" name="environment" defaultValue={config.environment}>
                <option value="production">production</option>
                <option value="sandbox">sandbox</option>
              </select>
            </label>
            <button className="button" type="submit">
              Save configuration
            </button>
          </form>
        </section>
        <section className="card">
          <h2>Current safe view</h2>
          <p>
            <strong>Base URL:</strong> {config.agentGateBaseUrl}
          </p>
          <p>
            <strong>Agent:</strong> {config.agentId}
          </p>
          <p>
            <strong>Key:</strong> {config.keyConfigured ? `${config.keyPrefix}...` : "Not configured"}
          </p>
          <form method="post" action="/api/admin/config/test" style={{ marginTop: 16 }}>
            <button className="button" type="submit">
              Test connection
            </button>
          </form>
          <form method="post" action="/api/admin/config/demo" style={{ marginTop: 12 }}>
            <button className="button secondary" type="submit">
              Use local demo AgentGate config
            </button>
          </form>
          <form method="post" action="/api/admin/config/clear" style={{ marginTop: 12 }}>
            <button className="button secondary" type="submit">
              Clear configuration
            </button>
          </form>
        </section>
      </div>
    </AdminShell>
  );
}
