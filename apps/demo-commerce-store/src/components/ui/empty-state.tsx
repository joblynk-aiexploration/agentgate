import { Button } from "@/components/ui/button";

export function EmptyState({
  actionHref,
  actionLabel,
  description,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  title: string;
}) {
  return (
    <section className="empty-state">
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      {actionHref && actionLabel ? <Button href={actionHref}>{actionLabel}</Button> : null}
    </section>
  );
}
