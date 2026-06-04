import { hash } from "bcryptjs";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserStatus } from "@/generated/prisma/client";
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
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-6 py-10 text-[#16181d]">
      <section className="w-full max-w-xl border border-[#d9dee8] bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase text-[#4c6f68]">
          AgentGate
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Create your account</h1>
        <p className="mt-3 text-sm leading-6 text-[#5c6470]">
          Set up a secure human login first. You will create the organization,
          first AI agent, and first API key in the next steps.
        </p>

        {error ? (
          <div className="mt-6 border border-[#e6c6b7] bg-[#fff4ef] px-4 py-3 text-sm text-[#9d3f1f]">
            {error === "email"
              ? "An account already exists for that email."
              : "Check the form and try again."}
          </div>
        ) : null}

        <form action={registerAction} className="mt-8 flex flex-col gap-5">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Name
            <input
              className="border border-[#cbd3df] px-3 py-3 font-normal outline-none transition focus:border-[#2d6f7f]"
              name="name"
              autoComplete="name"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Email
            <input
              className="border border-[#cbd3df] px-3 py-3 font-normal outline-none transition focus:border-[#2d6f7f]"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Password
            <input
              className="border border-[#cbd3df] px-3 py-3 font-normal outline-none transition focus:border-[#2d6f7f]"
              name="password"
              type="password"
              autoComplete="new-password"
              required
            />
          </label>
          <button
            className="bg-[#172326] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#22363b]"
            type="submit"
          >
            Continue to onboarding
          </button>
        </form>

        <p className="mt-6 text-sm text-[#5c6470]">
          Already have an account?{" "}
          <Link className="font-semibold text-[#2d6f7f]" href="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
