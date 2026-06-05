import { LoadingPanel } from "@/components/ui/loading-panel";

export default function AppLoading() {
  return (
    <section className="mx-auto grid w-full max-w-7xl gap-5">
      <LoadingPanel label="Loading workspace" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <LoadingPanel label="Loading metric" />
        <LoadingPanel label="Loading metric" />
        <LoadingPanel label="Loading metric" />
        <LoadingPanel label="Loading metric" />
      </div>
      <LoadingPanel label="Loading table" />
    </section>
  );
}
