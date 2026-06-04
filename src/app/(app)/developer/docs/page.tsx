import { ProtectedPage } from "@/app/(app)/_components/protected-page";

export default function DeveloperDocsPage() {
  return (
    <ProtectedPage
      title="Developer Docs"
      description="Integrate agents with the gateway check endpoint and local policy decision model."
    />
  );
}
