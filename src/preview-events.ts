export type PreviewEventType = "ready" | "deck:updated" | "deck:error";

export interface PreviewEvent {
  type: PreviewEventType;
  slug: string;
  data?: unknown;
}

export interface PreviewEventHub {
  publish(event: PreviewEvent): void;
  drain(slug: string): PreviewEvent[];
}

export function createPreviewEventHub(): PreviewEventHub {
  const events: PreviewEvent[] = [];

  return {
    publish(event) {
      events.push(event);
    },

    drain(slug) {
      const matching = events.filter((event) => event.slug === slug);
      for (let index = events.length - 1; index >= 0; index -= 1) {
        if (events[index].slug === slug) events.splice(index, 1);
      }
      return matching;
    },
  };
}
