import { ProtectedPage } from "@/app/(app)/_components/protected-page";

export default function AgentsPage() {
  return (
    <ProtectedPage
      title="Agents"
      description="Manage organization-owned AI agents, status, departments, and allowed tool scopes."
    />
  );
}
