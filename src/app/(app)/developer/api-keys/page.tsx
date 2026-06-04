import { ProtectedPage } from "@/app/(app)/_components/protected-page";

export default function ApiKeysPage() {
  return (
    <ProtectedPage
      title="API Keys"
      description="Manage hashed agent API keys. Full keys are never exposed after creation."
    />
  );
}
