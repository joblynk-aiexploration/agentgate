import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ClipboardCheck, FileClock, ShieldCheck } from "lucide-react";
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
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-6 py-10 text-[#16181d]">
      <section className="grid w-full max-w-5xl overflow-hidden border border-[#d9dee8] bg-white shadow-sm lg:grid-cols-[0.95fr_1.05fr]">
        <div className="bg-[#172326] p-8 text-white sm:p-10">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-[#8fc7bd]" aria-hidden />
            <span className="text-lg font-semibold">AgentGate</span>
          </div>
          <h1 className="mt-10 text-3xl font-semibold leading-tight">
            Sign in to the AI agent control plane
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#c8d6d8]">
            Review high-risk agent actions, manage policies, and inspect audit
            trails from one protected workspace.
          </p>
          <div className="mt-8 grid gap-3 border border-[#31464b] bg-[#203236] p-4 text-sm">
            <p className="font-semibold text-[#d8eeee]">Final demo credentials</p>
            <div className="grid gap-2 text-[#c8d6d8]">
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
                <span className="font-semibold text-white">Platform:</span>{" "}
                platform@agentgate.dev / Password123!
              </p>
            </div>
            <div className="grid gap-2 border-t border-[#31464b] pt-3 text-[#c8d6d8]">
              <p className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-[#8fc7bd]" aria-hidden />
                Use reviewer to approve the $1,200 refund.
              </p>
              <p className="flex items-center gap-2">
                <FileClock className="h-4 w-4 text-[#8fc7bd]" aria-hidden />
                Use auditor to inspect the trail.
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <div>
            <p className="text-sm font-semibold uppercase text-[#4c6f68]">
              Secure login
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Welcome back</h2>
          </div>

          {error ? (
            <div className="mt-6 border border-[#e6c6b7] bg-[#fff4ef] px-4 py-3 text-sm text-[#9d3f1f]">
              {error === "membership"
                ? "Finish onboarding to create your first organization."
                : "Email or password was not accepted."}
            </div>
          ) : null}

          <form action={loginAction} className="mt-8 flex flex-col gap-5">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Email
              <input
                className="border border-[#cbd3df] px-3 py-3 font-normal outline-none transition focus:border-[#2d6f7f] focus:ring-2 focus:ring-[#d9ecef]"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="owner@agentgate.dev"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Password
              <input
                className="border border-[#cbd3df] px-3 py-3 font-normal outline-none transition focus:border-[#2d6f7f] focus:ring-2 focus:ring-[#d9ecef]"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Password123!"
                required
              />
            </label>
            <button
              className="bg-[#172326] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#22363b]"
              type="submit"
            >
              Sign in
            </button>
          </form>

          <p className="mt-6 text-sm text-[#5c6470]">
            New workspace?{" "}
            <Link className="font-semibold text-[#2d6f7f]" href="/register">
              Create an organization
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
