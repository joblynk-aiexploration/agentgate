export function LoadingPanel({ label = "Loading" }: { label?: string }) {
  return (
    <div className="border border-[#d9dee8] bg-white p-6 shadow-sm">
      <div className="h-4 w-32 animate-pulse bg-[#e5e9ef]" />
      <div className="mt-4 grid gap-3">
        <div className="h-3 animate-pulse bg-[#edf1f6]" />
        <div className="h-3 w-5/6 animate-pulse bg-[#edf1f6]" />
        <div className="h-3 w-2/3 animate-pulse bg-[#edf1f6]" />
      </div>
      <p className="sr-only">{label}</p>
    </div>
  );
}
