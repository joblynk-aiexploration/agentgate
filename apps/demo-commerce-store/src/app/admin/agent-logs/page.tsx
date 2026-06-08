import { AdminShell } from "@/components/admin-shell";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/format";
import { readStore } from "@/lib/store";
import type { AgentLog } from "@/lib/types";

export default function AdminAgentLogsPage() {
  const logs = readStore().agentLogs;
  const columns: DataTableColumn<AgentLog>[] = [
    { header: "Time", cell: (log) => formatDate(log.timestamp) },
    { header: "Customer", cell: (log) => <>{log.customerEmail ?? "anonymous"}<br /><span className="muted">{log.sessionId.slice(0, 18)}...</span></> },
    { header: "Message", cell: (log) => log.message },
    { header: "Intent", cell: (log) => log.intent },
    { header: "Order", cell: (log) => log.orderNumber ?? "none" },
    { header: "Decision", cell: (log) => log.decision ? <StatusBadge status={log.decision} /> : "none" },
    { header: "Risk", cell: (log) => log.riskLevel ? `${log.riskLevel} (${log.riskScore ?? "n/a"})` : "n/a" },
    { header: "Action IDs", cell: (log) => <><span className="muted">{log.actionRequestId ?? "none"}</span><br /><span className="muted">{log.approvalRequestId ?? ""}</span></> },
    { header: "Result", cell: (log) => log.result },
  ];

  return (
    <AdminShell>
      <div className="page-header">
        <div>
          <p className="eyebrow">AI support</p>
          <h1>Agent logs</h1>
          <p className="muted">Professional transcript table for customer messages, intents, AgentGate decisions, risk, IDs, and local results. Full API keys are never stored here.</p>
        </div>
      </div>
      <DataTable columns={columns} rows={logs} />
    </AdminShell>
  );
}
