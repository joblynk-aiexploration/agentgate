import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ClipboardCheck, FileClock, ShieldCheck } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { createAuditLog } from "@/server/audit/audit-service";
import { getMembershipForUser, verifyPasswordCredentials } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/validators";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

async function loginAction(formData: FormData) {
  "use server";

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect("/login?error=invalid");
  }

  const user = await verifyPasswordCredentials(
    parsed.data.email,
    parsed.data.password,
  );

  if (!user) {
    redirect("/login?error=credentials");
  }

  await createSession(user.id);
  const membership = await getMembershipForUser(user.id);

  const headerStore = await headers();
  const ipAddress =
    headerStore.get("x-forwarded-for")?.split(",").at(0)?.trim() ??
    headerStore.get("x-real-ip");

  await createAuditLog({
    organizationId: membership?.organizationId ?? null,
    actorType: "user",
    actorId: user.id,
    eventType: "auth.login",
    targetType: "User",
    targetId: user.id,
    metadataJson: {
      email: user.email,
      organizationSlug: membership?.organization.slug ?? null,
      role: membership?.role ?? null,
    },
    ipAddress,
    userAgent: headerStore.get("user-agent"),
  });

  if (!membership) {
    redirect("/onboarding");
  }

  redirect("/dashboard");
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 text-slate-950">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl shadow-slate-950/50 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="bg-slate-950 p-8 text-white sm:p-10">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-950/40">
              <ShieldCheck className="h-6 w-6 text-white" aria-hidden />
            </span>
            <span className="text-lg font-semibold">AgentGate</span>
          </div>
          <h1 className="mt-10 text-3xl font-semibold leading-tight">
            Sign in to the AI agent control plane
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Review high-risk agent actions, manage policies, and inspect audit
            trails from one protected workspace.
          </p>
          <div className="mt-8 grid gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm">
            <p className="font-semibold text-white">Final demo credentials</p>
            <div className="grid gap-2 text-slate-300">
              <p>
                <span className="font-semibold text-white">Owner:</span>{" "}
                owner@agentgate.dev / Password123!
              </p>
              <p>
                <span className="font-semibold text-white">Reviewer:</span>{" "}
                reviewer@agentgate.dev / Password123!
              </p>
              <p>
                <span className="font-semibold text-white">Auditor:</span>{" "}
                auditor@agentgate.dev / Password123!
              </p>
              <p>
                <span className="font-semibold text-white">Developer:</span>{" "}
                developer@agentgate.dev / Password123!
              </p>
              <p>
                <span className="font-semibold text-white">Platform:</span>{" "}
                platform@agentgate.dev / Password123!
              </p>
            </div>
            <div className="grid gap-2 border-t border-white/10 pt-3 text-slate-300">
              <p className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-blue-300" aria-hidden />
                Use reviewer to approve the $1,200 refund.
              </p>
              <p className="flex items-center gap-2">
                <FileClock className="h-4 w-4 text-blue-300" aria-hidden />
                Use auditor to inspect the trail.
              </p>
              <p className="text-xs text-slate-400">
                Local demo only. V1 uses local rules and simulated integrations.
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <div>
            <p className="text-sm font-semibold uppercase text-blue-700">
              Secure login
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Welcome back</h2>
          </div>

          {error ? (
            <Alert className="mt-6" tone="danger">
              {error === "membership"
                ? "Finish onboarding to create your first organization."
                : "Email or password was not accepted."}
            </Alert>
          ) : null}

          <form action={loginAction} className="mt-8 flex flex-col gap-5">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Email
              <Input
                className="h-12"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="owner@agentgate.dev"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Password
              <Input
                className="h-12"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Password123!"
                required
              />
            </label>
            <button
              className="rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              type="submit"
            >
              Sign in
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-600">
            New workspace?{" "}
            <Link className="font-semibold text-blue-700" href="/register">
              Create an organization
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
