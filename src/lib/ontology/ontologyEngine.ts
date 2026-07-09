import type { OntologyDefinition } from "@/types/knowledge";

export const ONTOLOGY_DEFINITIONS: Record<string, OntologyDefinition> = {
  Movie: {
    name: "Movie",
    requiredFields: ["director", "cast", "composer", "themes", "awards", "reception", "legacy"],
    requiredEntities: ["Director", "Actor", "Composer"],
    timelineSchema: { minEvents: 5, maxEvents: 8 },
    documentaryBlueprint: ["Why It Was Made", "Building the World", "The Characters", "Behind the Camera", "Lasting Influence"],
    triviaStrategy: "Focus on production design challenges, casting choices, onset accidents, and budget constraints.",
    validationRules: [
      "Must not include box office numbers in the cast list.",
      "Director field must not be empty.",
      "composer must not contain actor names."
    ]
  },
  Country: {
    name: "Country",
    requiredFields: ["government", "geography", "economy", "culture", "population", "tourism"],
    requiredEntities: ["Capital", "Leader", "Currency"],
    timelineSchema: { minEvents: 6, maxEvents: 10 },
    documentaryBlueprint: ["Foundational Roots", "The Landscape", "Sovereign Rule", "Cultural Fabric", "Modern Challenges"],
    triviaStrategy: "Focus on unique geographical formations, cultural anomalies, administrative oddities, or historical sovereignty firsts.",
    validationRules: [
      "Population must contain numerical estimates or censuses.",
      "Government system must be categorized (e.g. Republic, Monarchy)."
    ]
  },
  "Historical Event": {
    name: "Historical Event",
    requiredFields: ["causes", "timeline", "participants", "turningPoints", "outcome", "impact"],
    requiredEntities: ["Leader", "Location", "Date"],
    timelineSchema: { minEvents: 6, maxEvents: 10 },
    documentaryBlueprint: ["The Spark", "Escalation", "Turning Point", "Resolution", "Legacy"],
    triviaStrategy: "Focus on overlooked turning points, weather factors, code-breaking, or strategic errors.",
    validationRules: [
      "Must have a clearly defined outcome.",
      "Timeline events must be chronologically ordered."
    ]
  },
  "Art Movement": {
    name: "Art Movement",
    requiredFields: ["origins", "artists", "techniques", "majorWorks", "influence"],
    requiredEntities: ["Artist", "Medium", "Era"],
    timelineSchema: { minEvents: 5, maxEvents: 8 },
    documentaryBlueprint: ["The Rebellion", "Defining Style", "Masterpieces", "Spreading the Vision", "The Echoes"],
    triviaStrategy: "Focus on manifestos, public reactions, materials used, and artist rivalries.",
    validationRules: [
      "Origins must cite the city or region of origin.",
      "Must list at least 3 major works."
    ]
  },
  Person: {
    name: "Person",
    requiredFields: ["birth", "death", "occupation", "majorWorks", "awards", "legacy", "controversies"],
    requiredEntities: ["Individual", "Date", "Field"],
    timelineSchema: { minEvents: 5, maxEvents: 8 },
    documentaryBlueprint: ["Early Sparks", "The Breakthrough", "Peak Contributions", "Friction & Obstacles", "Enduring Legacy"],
    triviaStrategy: "Focus on childhood quirks, key mentors, hidden talents, or unrecognized early contributions.",
    validationRules: [
      "Birth date must be specified.",
      "Occupation must be clearly defined."
    ]
  },
  Company: {
    name: "Company",
    requiredFields: ["founder", "industry", "headquarters", "products", "businessModel", "revenue", "leadership"],
    requiredEntities: ["Founder", "CEO", "Headquarters"],
    timelineSchema: { minEvents: 5, maxEvents: 8 },
    documentaryBlueprint: ["The Garage Spark", "Product Market Fit", "Scaling Up", "Market Domination", "Future Horizon"],
    triviaStrategy: "Focus on original brand names, failed pivot prototypes, pivotal acquisitions, or famous internal conflicts.",
    validationRules: [
      "Founder field must not be blank.",
      "Headquarters must state city and country."
    ]
  },
  Technology: {
    name: "Technology",
    requiredFields: ["inventor", "launchYear", "industry", "architecture", "competitors", "adoption"],
    requiredEntities: ["Inventor", "Standard", "Platform"],
    timelineSchema: { minEvents: 5, maxEvents: 8 },
    documentaryBlueprint: ["The Problem Statement", "Technical Architecture", "Early Adoption", "War of Standards", "Next Interface"],
    triviaStrategy: "Focus on naming origin, early syntax/design bugs, easter eggs, and major security breaches.",
    validationRules: [
      "Inventor or core developer must be named.",
      "Launch year must be a valid date or year string."
    ]
  },
  Science: {
    name: "Science",
    requiredFields: ["formula", "discovery", "discoverer", "applications", "limitations", "currentResearch"],
    requiredEntities: ["Discoverer", "Principle", "Observation"],
    timelineSchema: { minEvents: 5, maxEvents: 8 },
    documentaryBlueprint: ["The Anomaly", "Theoretical Breakthrough", "Experimental Proof", "Applications", "Unsolved Questions"],
    triviaStrategy: "Focus on accidental discoveries, initial skepticism by the establishment, and counter-intuitive behaviors.",
    validationRules: [
      "Applications must contain at least 2 real-world uses.",
      "Limitations must detail boundary conditions."
    ]
  },
  Organization: {
    name: "Organization",
    requiredFields: ["founder", "type", "headquarters", "members", "purpose", "history"],
    requiredEntities: ["Founder", "HQ", "Charter"],
    timelineSchema: { minEvents: 5, maxEvents: 8 },
    documentaryBlueprint: ["The Coalition", "Founding Charter", "Expansion & Growth", "Major Actions", "Modern Mission"],
    triviaStrategy: "Focus on founding disputes, symbolic logos, secret meetings, or bureaucratic challenges.",
    validationRules: [
      "Purpose must be a non-empty summary.",
      "Members count or member groups must be specified."
    ]
  }
};

// Maps any entityType (returned by Entity Resolver) to its canonical ontology definition
export function mapEntityTypeToOntology(entityType: string): OntologyDefinition {
  const type = entityType.trim();
  
  if (["Movie", "TV Series"].includes(type)) {
    return ONTOLOGY_DEFINITIONS.Movie;
  }
  if (["Person", "Musical Artist"].includes(type)) {
    return ONTOLOGY_DEFINITIONS.Person;
  }
  if (["Historical Event", "War", "Empire", "Civilization", "Space Mission"].includes(type)) {
    return ONTOLOGY_DEFINITIONS["Historical Event"];
  }
  if (["Artwork", "Art Movement", "Album", "Song", "Book", "Video Game", "Religion", "Philosophy"].includes(type)) {
    return ONTOLOGY_DEFINITIONS["Art Movement"];
  }
  if (["Country", "City"].includes(type)) {
    return ONTOLOGY_DEFINITIONS.Country;
  }
  if (["Company", "Brand"].includes(type)) {
    return ONTOLOGY_DEFINITIONS.Company;
  }
  if (["Organization"].includes(type)) {
    return ONTOLOGY_DEFINITIONS.Organization;
  }
  if (["Technology", "Programming Language"].includes(type)) {
    return ONTOLOGY_DEFINITIONS.Technology;
  }
  // Fallback default: Science
  return ONTOLOGY_DEFINITIONS.Science;
}

export function validateOntologyFields(ontologyName: string, compiledData: Record<string, any>): string[] {
  const definition = ONTOLOGY_DEFINITIONS[ontologyName] || ONTOLOGY_DEFINITIONS.Science;
  const errors: string[] = [];

  for (const field of definition.requiredFields) {
    if (compiledData[field] === undefined || compiledData[field] === null || compiledData[field] === "") {
      errors.push(`Missing required ontology field: "${field}" for ontology "${ontologyName}"`);
    } else if (Array.isArray(compiledData[field]) && compiledData[field].length === 0) {
      errors.push(`Required array field "${field}" is empty for ontology "${ontologyName}"`);
    }
  }

  return errors;
}
