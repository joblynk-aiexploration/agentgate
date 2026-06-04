import { requireMembership } from "@/lib/auth";

type ProtectedPageProps = {
  title: string;
  description: string;
  children?: React.ReactNode;
};

export async function ProtectedPage({
  title,
  description,
  children,
}: ProtectedPageProps) {
  const membership = await requireMembership();

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase text-[#4c6f68]">
          {membership.organization.slug}
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5c6470]">
          {description}
        </p>
      </div>
      {children ?? (
        <div className="border border-[#d9dee8] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#5c6470]">
            This protected V1 workspace view is ready for the next feature pass.
          </p>
        </div>
      )}
    </section>
  );
}
