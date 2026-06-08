import { AdminShell } from "@/components/admin-shell";
import { formatDate } from "@/lib/format";
import { readStore } from "@/lib/store";

export default function AdminAgentLogsPage() {
  const logs = readStore().agentLogs;

  return (
    <AdminShell>
      <h1>Agent logs</h1>
      <p className="muted">Full AgentGate API keys are never stored in these transcripts.</p>
      <table className="table card">
        <thead>
          <tr>
            <th>Time</th>
            <th>Session</th>
            <th>Message</th>
            <th>Intent</th>
            <th>Customer/order</th>
            <th>Decision</th>
            <th>Risk</th>
            <th>Action IDs</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{formatDate(log.timestamp)}</td>
              <td>{log.sessionId.slice(0, 18)}...</td>
              <td>{log.message}</td>
              <td>{log.intent}</td>
              <td>
                {log.customerEmail ?? "anonymous"}
                <br />
                <span className="muted">{log.orderNumber ?? "no order"}</span>
              </td>
              <td>{log.decision ?? "none"}</td>
              <td>
                {log.riskLevel ?? "n/a"} {log.riskScore ? `(${log.riskScore})` : ""}
              </td>
              <td>
                {log.actionRequestId ?? "none"}
                <br />
                {log.approvalRequestId ?? ""}
              </td>
              <td>{log.result}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  );
}
