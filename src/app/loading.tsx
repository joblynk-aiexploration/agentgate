import { LoadingPanel } from "@/components/ui/loading-panel";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f7f8fb] px-6 py-10 text-[#16181d]">
      <section className="mx-auto grid w-full max-w-6xl gap-5">
        <LoadingPanel label="Loading AgentGate" />
        <div className="grid gap-5 md:grid-cols-3">
          <LoadingPanel label="Loading demo metric" />
          <LoadingPanel label="Loading demo metric" />
          <LoadingPanel label="Loading demo metric" />
        </div>
      </section>
    </main>
  );
}
