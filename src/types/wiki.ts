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
  entityType: string;
  ontologyLabels: string[];
  common: {
    title: string;
    description: string;
    category: string;
    summaryFacts: string[];
    timeline: { year: string; event: string }[];
    surprisingFacts: string[];
    relatedTopics: string[];
    sourceSections: { title: string; content: string }[];
  };
  historyData?: {
    timeline: { year: string; event: string }[];
    causes: string[];
    majorEvents: string[];
    consequences: string[];
    importantPeople: string[];
    geography: string[];
    legacy: string[];
  };
  movieData?: {
    director: string;
    producer: string;
    cast: string[];
    genre: string;
    runtime: string;
    releaseDate: string;
    boxOffice: string;
    budget: string;
    awards: string;
    themes: string[];
    plot: string;
    music: string;
    cinematography: string;
    ratings?: string;
  };
  personData?: {
    birth: string;
    death: string;
    occupation: string;
    majorWorks: string[];
    timeline: { year: string; event: string }[];
    awards: string[];
    legacy: string[];
    controversies: string[];
  };
  technologyData?: {
    inventor: string;
    launchYear: string;
    industry?: string;
    architecture: string[];
    competitors: string[];
    evolution: string[];
    future: string[];
    adoption?: string[];
  };
  countryData?: {
    capital: string;
    population: string;
    gdp: string;
    language: string;
    government: string;
    economy: string;
    bordering: string[];
    mapLocation?: string;
  };
  companyData?: {
    founder: string;
    industry: string;
    headquarters: string;
    products: string[];
    businessModel: string;
    revenue: string;
    history: string[];
    competitors: string[];
    leadership?: string[];
  };
  bookData?: {
    author: string;
    genre: string;
    publisher: string;
    releaseDate: string;
    themes: string[];
    plotSummary: string;
    pages?: string;
  };
  scienceData?: {
    formula?: string;
    discovery: string;
    discoverer?: string;
    applications: string[];
    limitations: string[];
    currentResearch: string[];
    visualDiagramDesc?: string;
  };
  organizationData?: {
    founder: string;
    type: string;
    headquarters: string;
    members: string[];
    purpose: string;
    history: string[];
  };
}