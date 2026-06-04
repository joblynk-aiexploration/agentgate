import Link from "next/link";
import { ProtectedPage } from "@/app/(app)/_components/protected-page";

export default function DeveloperPage() {
  return (
    <ProtectedPage
      title="Developer"
      description="Access API key management and implementation docs for the AgentGate gateway."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          className="border border-[#d9dee8] bg-white p-6 shadow-sm transition hover:border-[#2d6f7f]"
          href="/developer/api-keys"
        >
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="mt-2 text-sm leading-6 text-[#5c6470]">
            Create and revoke hashed agent API keys.
          </p>
        </Link>
        <Link
          className="border border-[#d9dee8] bg-white p-6 shadow-sm transition hover:border-[#2d6f7f]"
          href="/developer/docs"
        >
          <h2 className="text-lg font-semibold">Docs</h2>
          <p className="mt-2 text-sm leading-6 text-[#5c6470]">
            Review gateway request and policy decision conventions.
          </p>
        </Link>
      </div>
    </ProtectedPage>
  );
}
