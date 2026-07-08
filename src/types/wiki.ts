export type WikiResult = {
  title: string;
  extract: string;
  description?: string;
  thumbnail?: {
    source: string;
  };
  content_urls?: {
    desktop?: {
      page: string;
    };
  };
  timestamp?: string;
  lang?: string;
};

export type RelatedArticle = {
  title: string;
  description?: string;
  thumbnail?: {
    source: string;
  };
};

export interface TopicKnowledge {
  title: string;
  description: string;
  category: string;
  summaryFacts: string[];
  timeline: { year: string; event: string }[];
  people: string[];
  places: string[];
  organizations: string[];
  events: string[];
  dates: string[];
  numbers: string[];
  works: string[];
  inventions: string[];
  themes: string[];
  relationships: string[];
  surprisingFacts: string[];
  relatedTopics: string[];
  sourceSections: { title: string; content: string }[];
}