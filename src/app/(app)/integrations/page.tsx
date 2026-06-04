import { ProtectedPage } from "@/app/(app)/_components/protected-page";

export default function IntegrationsPage() {
  return (
    <ProtectedPage
      title="Integrations"
      description="View demo tool connections for Slack, Stripe, Email Preview, CRM, GitHub, and Postgres."
    />
  );
}
