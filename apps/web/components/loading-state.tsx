export function LoadingState({ label = "Loading your Sia…" }: { label?: string }) {
  return <div className="loading-block" role="status"><div><div className="loading-dot" /><span>{label}</span></div></div>;
}
