import { formatDate } from "@/lib/format";
import type { OrderEvent } from "@/lib/types";

export function Timeline({ events }: { events: OrderEvent[] }) {
  return (
    <div className="timeline">
      {events.map((event) => (
        <article className="timeline-item" key={event.id}>
          <div>
            <strong>{event.title ?? event.type}</strong>
            <p>{event.description ?? event.message}</p>
            <span className="muted">
              {formatDate(event.createdAt)} · {event.actorLabel ?? event.actorType ?? "Northstar"}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

export const TrackingTimeline = Timeline;
