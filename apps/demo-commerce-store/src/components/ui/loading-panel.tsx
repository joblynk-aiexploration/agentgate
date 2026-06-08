export function LoadingPanel({ label = "Loading" }: { label?: string }) {
  return <div className="loading-panel">{label}</div>;
}
