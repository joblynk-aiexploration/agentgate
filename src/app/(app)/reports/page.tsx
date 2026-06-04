import { ProtectedPage } from "@/app/(app)/_components/protected-page";

export default function ReportsPage() {
  return (
    <ProtectedPage
      title="Reports"
      description="Track agent activity, blocked actions, approval volume, and organization risk posture."
    />
  );
}
