export type PreviewEventType = "ready" | "deck:updated" | "deck:error";

export interface PreviewEvent {
  type: PreviewEventType;
  slug: string;
  data?: unknown;
}

export interface PreviewEventHub {
  publish(event: PreviewEvent): void;
  drain(slug: string): PreviewEvent[];
  subscribe?(slug: string, listener: (event: PreviewEvent) => void): () => void;
}

export function createPreviewEventHub(): PreviewEventHub {
  const events: PreviewEvent[] = [];
  const listeners = new Map<string, Set<(event: PreviewEvent) => void>>();

  return {
    publish(event) {
      const slugListeners = listeners.get(event.slug);
      if (!slugListeners || slugListeners.size === 0) {
        events.push(event);
        return;
      }

      for (const listener of slugListeners) {
        listener(event);
      }
    },

    drain(slug) {
      const matching = events.filter((event) => event.slug === slug);
      for (let index = events.length - 1; index >= 0; index -= 1) {
        if (events[index].slug === slug) events.splice(index, 1);
      }
      return matching;
    },

    subscribe(slug, listener) {
      const slugListeners = listeners.get(slug) ?? new Set<(event: PreviewEvent) => void>();
      slugListeners.add(listener);
      listeners.set(slug, slugListeners);
      return () => {
        slugListeners.delete(listener);
        if (slugListeners.size === 0) listeners.delete(slug);
      };
    },
  };
}
