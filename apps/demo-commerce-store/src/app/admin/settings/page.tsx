import { AdminShell } from "@/components/admin-shell";
import { DetailRow } from "@/components/ui/detail-row";

export default function AdminSettingsPage() {
  return (
    <AdminShell>
      <div className="page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Store settings</h1>
          <p className="muted">Lightweight V1 settings for the local Northstar demo store.</p>
        </div>
      </div>
      <section className="card">
        <DetailRow label="Store name" value="Northstar Outdoor Supply" />
        <DetailRow label="Mode" value="Local demo only" />
        <DetailRow label="Payments" value="Simulated checkout, no real processor" />
        <DetailRow label="Email" value="Preview-only receipt records" />
        <DetailRow label="AgentGate" value="Server-side API key, customer-safe prefix display" />
      </section>
    </AdminShell>
  );
}
