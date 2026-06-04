import { ProtectedPage } from "@/app/(app)/_components/protected-page";

export default function SettingsPage() {
  return (
    <ProtectedPage
      title="Settings"
      description="Manage organization profile, memberships, role assignments, and security defaults."
    />
  );
}
