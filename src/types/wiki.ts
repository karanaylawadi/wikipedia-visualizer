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