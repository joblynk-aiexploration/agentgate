import { AdminShell } from "@/components/admin-shell";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { DetailRow } from "@/components/ui/detail-row";
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
      <div className="page-header">
        <div>
          <p className="eyebrow">AI support</p>
          <h1>AgentGate API connection</h1>
          <p className="muted">The support agent uses this server-side connection before any business-changing action. Customers never receive the full API key.</p>
        </div>
        <Badge tone={config.keyConfigured ? "success" : "danger"}>{config.keyConfigured ? "Configured" : "Missing key"}</Badge>
      </div>
      <div className="grid two">
        <section className="card">
          <h2>Connection settings</h2>
          <Alert>The API key is stored server-side for this local demo and never exposed to customers. After save, only the prefix is visible.</Alert>
          {params.saved ? <Alert tone="success">Configuration saved.</Alert> : null}
          {params.cleared ? <Alert tone="success">Local demo defaults restored.</Alert> : null}
          {params.test ? <Alert tone="success">Test decision: {params.test}. Risk: {params.risk}.</Alert> : null}
          {params.error ? <Alert tone="danger">Error: {params.error}</Alert> : null}
          <form className="form" method="post" action="/api/admin/config">
            <label>AgentGate Base URL<input className="input" name="agentGateBaseUrl" defaultValue={config.agentGateBaseUrl} /></label>
            <label>AgentGate API Key<input className="input" name="agentGateApiKey" type="password" placeholder={config.keyConfigured ? "Leave blank to keep saved key" : "ag_test_..."} /></label>
            <label>Agent ID<input className="input" name="agentId" defaultValue={config.agentId} /></label>
            <label>Environment<select className="select" name="environment" defaultValue={config.environment}><option value="production">production</option><option value="sandbox">sandbox</option></select></label>
            <button className="button" type="submit">Save configuration</button>
          </form>
        </section>
        <section className="card">
          <h2>Current safe view</h2>
          <DetailRow label="Base URL" value={config.agentGateBaseUrl} />
          <DetailRow label="Agent" value={config.agentId} />
          <DetailRow label="Environment" value={config.environment} />
          <DetailRow label="Key prefix" value={config.keyConfigured ? `${config.keyPrefix}...` : "Not configured"} />
          <div className="button-row">
            <form method="post" action="/api/admin/config/test"><button className="button" type="submit">Test connection</button></form>
            <form method="post" action="/api/admin/config/demo"><button className="button secondary" type="submit">Use local demo AgentGate config</button></form>
            <form method="post" action="/api/admin/config/clear"><button className="button secondary" type="submit">Restore local demo defaults</button></form>
          </div>
          <p className="muted">Test connection creates a sandbox `integration.test` gateway check in AgentGate. No external tool is called.</p>
        </section>
      </div>
    </AdminShell>
  );
}
