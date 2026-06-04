import { ProtectedPage } from "@/app/(app)/_components/protected-page";

export default function BillingPage() {
  return (
    <ProtectedPage
      title="Billing"
      description="Review the current plan and lightweight V1 subscription state."
    />
  );
}
