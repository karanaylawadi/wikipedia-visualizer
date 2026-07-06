export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function pageview(url: string) {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") {
    return;
  }

  window.gtag?.("config", GA_MEASUREMENT_ID, {
    page_path: url,
  });
}

type EventParams = {
  action: string;
  category?: string;
  label?: string;
  value?: number;
};

export function trackEvent({ action, category, label, value }: EventParams) {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") {
    return;
  }

  window.gtag?.("event", action, {
    event_category: category,
    event_label: label,
    value,
  });
}

export function trackSearch(query: string) {
  trackEvent({
    action: "search",
    category: "engagement",
    label: query,
  });
}

export function trackTopicOpened(topic: string) {
  trackEvent({
    action: "topic_opened",
    category: "engagement",
    label: topic,
  });
}

export function trackTimelineCardClicked(title: string) {
  trackEvent({
    action: "timeline_card_clicked",
    category: "engagement",
    label: title,
  });
}

export function trackRelatedTopicClicked(title: string) {
  trackEvent({
    action: "related_topic_clicked",
    category: "engagement",
    label: title,
  });
}

export function trackCarouselCardClicked(title: string) {
  trackEvent({
    action: "carousel_card_clicked",
    category: "engagement",
    label: title,
  });
}

