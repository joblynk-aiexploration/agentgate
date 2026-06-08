import { hash } from "bcryptjs";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { UserStatus } from "@/generated/prisma/client";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { createAuditLog } from "@/server/audit/audit-service";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { registerSchema } from "@/lib/validators";

type RegisterPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

async function registerAction(formData: FormData) {
  "use server";

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect("/register?error=invalid");
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: parsed.data.email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    redirect("/register?error=email");
  }

  const passwordHash = await hash(parsed.data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
      status: UserStatus.ACTIVE,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  await createSession(user.id);

  const headerStore = await headers();
  const ipAddress =
    headerStore.get("x-forwarded-for")?.split(",").at(0)?.trim() ??
    headerStore.get("x-real-ip");

  await createAuditLog({
    organizationId: null,
    actorType: "user",
    actorId: user.id,
    eventType: "user.registered",
    targetType: "User",
    targetId: user.id,
    metadataJson: {
      email: user.email,
    },
    ipAddress,
    userAgent: headerStore.get("user-agent"),
  });

  redirect("/onboarding");
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 text-slate-950">
      <section className="w-full max-w-xl rounded-2xl border border-white/10 bg-white p-8 shadow-2xl shadow-slate-950/50 sm:p-10">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </span>
          <p className="text-sm font-semibold uppercase text-blue-700">AgentGate</p>
        </div>
        <h1 className="mt-6 text-3xl font-semibold text-slate-950">Create your account</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Set up a secure human login first. You will create the organization,
          first AI agent, and first API key in the next steps.
        </p>

        {error ? (
          <Alert className="mt-6" tone="danger">
            {error === "email"
              ? "An account already exists for that email."
              : "Check the form and try again."}
          </Alert>
        ) : null}

        <form action={registerAction} className="mt-8 flex flex-col gap-5">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Name
            <Input
              className="h-12"
              name="name"
              autoComplete="name"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Email
            <Input
              className="h-12"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Password
            <Input
              className="h-12"
              name="password"
              type="password"
              autoComplete="new-password"
              required
            />
          </label>
          <button
            className="rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            type="submit"
          >
            Continue to onboarding
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Already have an account?{" "}
          <Link className="font-semibold text-blue-700" href="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
