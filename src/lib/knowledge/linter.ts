import type { LintReport, KnowledgeArtifact } from "@/types/knowledge";
import { validateOntologyFields, mapEntityTypeToOntology } from "../ontology/ontologyEngine";
import { isFactWeak } from "./factEvaluator";
import { containsPlaceholder, scanForPlaceholders } from "./placeholderDetector";

export function lintArtifact(artifact: Omit<KnowledgeArtifact, "validationStatus">): LintReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checkedRules: Record<string, boolean> = {};

  const registerCheck = (name: string, passed: boolean, msg: string, isWarning = false) => {
    checkedRules[name] = passed;
    if (!passed) {
      if (isWarning) {
        warnings.push(msg);
      } else {
        errors.push(msg);
      }
    }
  };

  // 1. Check Ontology and Required Fields
  const ontologyName = artifact.ontology.name;
  const ontologyDef = mapEntityTypeToOntology(artifact.ontology.labels[0] || ontologyName);
  registerCheck("ontology_match", ontologyDef.name === ontologyName, `Ontology match mismatch: expected ${ontologyDef.name}, got ${ontologyName}`);
  
  const fieldErrors = validateOntologyFields(ontologyName, artifact.structuredFacts);
  registerCheck("required_fields_exist", fieldErrors.length === 0, fieldErrors.join("; "));

  // 2. Check Timeline completeness & order
  const timeline = artifact.timeline || [];
  registerCheck("timeline_non_empty", timeline.length > 0, "Timeline has zero events");
  registerCheck(
    "timeline_count_bounds",
    timeline.length >= ontologyDef.timelineSchema.minEvents && timeline.length <= ontologyDef.timelineSchema.maxEvents,
    `Timeline size (${timeline.length}) is outside the ontology boundary of [${ontologyDef.timelineSchema.minEvents}, ${ontologyDef.timelineSchema.maxEvents}]`
  );

  // Check timeline chronological order
  let yearsAreOrdered = true;
  let lastYear = -Infinity;
  for (const t of timeline) {
    const yrInt = parseInt(t.year.replace(/\D/g, ""), 10);
    if (!isNaN(yrInt)) {
      if (yrInt < lastYear) {
        yearsAreOrdered = false;
      }
      lastYear = yrInt;
    }
  }
  // Promoted from a warning to a hard error: this is the one rule the V17
  // forensic audit found correctly detecting a real defect in practice
  // (Inception's and Japan's timelines were genuinely out of order), but it
  // could not affect `passed` while routed to warnings
  // (V17_FORENSIC_AUDIT.md, Bug #18).
  registerCheck("timeline_chronological", yearsAreOrdered, "Timeline is not in strict chronological order");

  // 3. Knowledge Graph Connectivity
  const graph = artifact.knowledgeGraph || [];
  registerCheck("graph_has_triples", graph.length >= 5, `Knowledge graph is too sparse: got ${graph.length} triples, expected >= 5`);

  // Check if subject/object names match named entities or topic title
  let connectedTriples = 0;
  const entityNames = new Set(artifact.namedEntities.map(e => e.name.toLowerCase()));
  entityNames.add(artifact.ontology.labels[1]?.toLowerCase());
  entityNames.add(artifact.structuredFacts.title?.toLowerCase());

  for (const triple of graph) {
    const sub = triple.subject.toLowerCase();
    const obj = triple.object.toLowerCase();
    if (entityNames.has(sub) || entityNames.has(obj)) {
      connectedTriples++;
    }
  }
  registerCheck("graph_connected", graph.length === 0 || connectedTriples > 0, "Knowledge graph triples are completely disconnected from the named entities");

  // Graph synthetic/placeholder node check — defense in depth. The graph
  // builder (knowledgeGraph.ts) already rejects these before they can enter
  // `artifact.knowledgeGraph`; this check exists so a regression there is
  // still caught here rather than silently shipping (V17_FORENSIC_AUDIT.md,
  // Bug #2: placeholder structured-fact values propagating into the graph
  // as if they were real entities, e.g. "Compiled detail for director"
  // DIRECTED Inception).
  const syntheticOrPlaceholderTriples = graph.filter(
    (t) =>
      containsPlaceholder(t.subject) ||
      containsPlaceholder(t.object) ||
      (t.predicate === "HAS_PROPERTY" && /^Detail_Aspect_\d+$/i.test(t.object))
  );
  registerCheck(
    "graph_no_synthetic_nodes",
    syntheticOrPlaceholderTriples.length === 0,
    `Knowledge graph contains ${syntheticOrPlaceholderTriples.length} placeholder or synthetic filler triple(s)`
  );

  // 4. Named Entities Valid
  registerCheck("named_entities_non_empty", artifact.namedEntities.length > 0, "No named entities resolved in the artifact");

  // 5. No Weak/Robotic Facts or Sentences
  let weakFactCount = 0;
  for (const fact of artifact.rankedFacts) {
    if (isFactWeak(fact.fact)) {
      weakFactCount++;
    }
  }
  registerCheck("no_weak_facts", weakFactCount === 0, `Artifact contains ${weakFactCount} evaluated facts that have weak, generic, or robotic phrasing`);

  // 6. No Duplicate Facts/Sentences
  const normalizedFacts = artifact.rankedFacts.map(f => f.fact.toLowerCase().trim());
  const uniqueFacts = new Set(normalizedFacts);
  registerCheck("no_duplicate_facts", uniqueFacts.size === normalizedFacts.length, "Artifact contains duplicate facts in rankedFacts");

  // Check duplicate sentences
  const allSentences: string[] = [];
  const sentenceDuplicated = (sentence: string) => {
    const clean = sentence.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
    if (clean.length < 15 || clean.split(/\s+/).length < 4) return false;
    if (allSentences.includes(clean)) return true;
    allSentences.push(clean);
    return false;
  };

  let duplicateSentenceFound = false;
  artifact.rankedFacts.forEach(rf => {
    const sentences = rf.fact.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    sentences.forEach(s => {
      if (sentenceDuplicated(s)) {
        duplicateSentenceFound = true;
      }
    });
  });
  registerCheck("no_duplicate_sentences", !duplicateSentenceFound, "Artifact contains duplicate sentences across different facts");

  // 7. No Placeholder Wording — routed through the shared placeholderDetector
  // (src/lib/knowledge/placeholderDetector.ts) instead of a narrow inline
  // substring list. The old list here matched only "placeholder"/"tbd"/
  // "n/a"/"unknown director"/"unknown founder" and missed the fallback
  // compiler's actual placeholder text, "Compiled detail for {field}"
  // (V17_FORENSIC_AUDIT.md, Bugs #9 and #13).
  const placeholderHits = scanForPlaceholders(artifact.structuredFacts);
  registerCheck(
    "no_placeholder_wording",
    placeholderHits.length === 0,
    `Artifact contains placeholder wording at: ${placeholderHits.slice(0, 5).join(", ")}${placeholderHits.length > 5 ? ", ..." : ""}`
  );

  // 8. V17 Editorial & Linter Validation rules
  const BANNED_AI_WORDS_PHRASES = [
    "framework", "ecosystem", "protocol", "stakeholder", "leveraged", "methodology", "optimization",
    "selected markers", "our team", "compiled data", "industry practitioners", "validation",
    "implementation", "deployment", "core parameters", "utilize", "accelerating adoption",
    "secondary adaptations", "systematic approach", "comprehensive analysis", "critical infrastructure",
    "dynamic environment", "best practices", "played an important role", "served as a foundation",
    "marked a turning point", "helped shape", "widely recognized", "continues to influence",
    "significant milestone", "over time", "throughout history", "across industries",
    "centering upon", "these observations", "compiled data reveals", "this establishes", "mechanism", "therefore", "collectively"
  ];

  let genericWordingScore = 0;
  const checkBannedWords = (text: string) => {
    const lower = text.toLowerCase();
    for (const phrase of BANNED_AI_WORDS_PHRASES) {
      if (lower.includes(phrase)) {
        genericWordingScore++;
      }
    }
  };
  checkBannedWords(artifact.structuredFacts.briefSummary || "");
  // V19: the editorial brief is user-facing prose and gets the same
  // banned-word scan as the summary and cards. Only checked when present —
  // an absent brief is a legitimate outcome (the writer never fabricates
  // one), not a lint failure.
  checkBannedWords(artifact.structuredFacts.editorialBrief || "");
  (artifact.structuredFacts.cards || []).forEach((c: any) => {
    checkBannedWords(c.summary || "");
  });
  registerCheck("generic_wording_check", genericWordingScore === 0, `Artifact contains generic AI wording / banned phrases: ${genericWordingScore} occurrences`);

  // Paragraph length limit: fail if any paragraph exceeds 130 words
  let paragraphTooLong = false;
  const briefSummaryWords = (artifact.structuredFacts.briefSummary || "").split(/\s+/).filter(Boolean).length;
  if (briefSummaryWords > 130) {
    paragraphTooLong = true;
  }
  // V19: the editorial brief is multi-paragraph by contract (paragraphs
  // separated by blank lines), so the 130-word rule applies per paragraph,
  // not to the whole article.
  (artifact.structuredFacts.editorialBrief || "")
    .split(/\n\s*\n/)
    .forEach((paragraph: string) => {
      if (paragraph.split(/\s+/).filter(Boolean).length > 130) {
        paragraphTooLong = true;
      }
    });
  (artifact.structuredFacts.cards || []).forEach((c: any) => {
    const cardWords = (c.summary || "").split(/\s+/).filter(Boolean).length;
    if (cardWords > 130) {
      paragraphTooLong = true;
    }
  });
  registerCheck("paragraph_length_limit", !paragraphTooLong, "Artifact contains a paragraph exceeding 130 words");

  // Generic chapter title check
  const genericTitles = [
    "origins", "history", "government", "culture", "modern nation", "problem", "discovery",
    "mechanism", "evidence", "applications", "causes", "early battles", "turning point",
    "outcome", "legacy", "early life", "rise", "peak", "challenges", "need", "invention",
    "adoption", "impact", "future", "founding", "growth", "competition", "key characteristics",
    "masterpieces", "spread", "purpose", "structure", "major campaigns", "future vision",
    "story", "production", "release", "reception", "introduction", "conclusion", "summary",
    "overview"
  ];
  let genericTitleFound = false;
  (artifact.structuredFacts.cards || []).forEach((c: any) => {
    if (c.title && genericTitles.includes(c.title.toLowerCase().trim())) {
      genericTitleFound = true;
    }
  });
  registerCheck("unique_chapter_titles", !genericTitleFound, "Chapter title must be a specific headline, not generic");

  // Concrete names or dates presence: check if dates or capitalised named entities appear in the card texts
  let lacksConcreteNounsOrDates = false;
  (artifact.structuredFacts.cards || []).forEach((c: any) => {
    const summary = c.summary || "";
    const hasYear = /\b(1\d{3}|2\d{3})\b/.test(summary);
    const capitalizedMatches = summary.match(/\b[A-Z][a-z]+\b/g) || [];
    // Filter out common sentence starters
    const cleanCapitalized = capitalizedMatches.filter((word: string) => !["First", "This", "The", "Under", "Subsequent", "Because", "Modern", "These", "During"].includes(word));
    if (!hasYear && cleanCapitalized.length === 0) {
      lacksConcreteNounsOrDates = true;
    }
  });
  registerCheck("concrete_dates_names_present", !lacksConcreteNounsOrDates, "Every card must contain at least one date or concrete named entity");

  // Repeated phrases check
  let hasRepeatedPhrases = false;
  const phrasesSet = new Set<string>();
  (artifact.structuredFacts.cards || []).forEach((c: any) => {
    const summary = c.summary || "";
    const words = summary.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length - 3; i++) {
      const phrase = words.slice(i, i + 4).join(" ");
      if (phrasesSet.has(phrase)) {
        hasRepeatedPhrases = true;
      }
      phrasesSet.add(phrase);
    }
  });
  registerCheck("no_repeated_phrases", !hasRepeatedPhrases, "Identical 4-word phrases must not repeat across chapters");

  // Timeline contains placeholder milestone check — previously matched only
  // the substring "significant milestone" and missed the fallback
  // timeline's actual text, "Pivotal era in {year}" / "underwent core
  // changes and reached major development" (V17_FORENSIC_AUDIT.md, Bug
  // #12), both of which are the literal banned examples in CLAUDE.md.
  let timelineMilestonePlaceholder = false;
  (artifact.timeline || []).forEach((e: any) => {
    if (containsPlaceholder(e.description) || containsPlaceholder(e.headline)) {
      timelineMilestonePlaceholder = true;
    }
  });
  registerCheck("no_timeline_milestone_placeholder", !timelineMilestonePlaceholder, "Timeline must not contain generic or placeholder milestone descriptions");

  // Reader question quality check — previously readerQuestion was never
  // scanned at all, so the fallback narrative planner's literal
  // CLAUDE.md bad-example sentence ("What represents the starting
  // motivation behind Causes?") passed validation every time
  // (V17_FORENSIC_AUDIT.md, Bug #14).
  let readerQuestionIssues = 0;
  (artifact.narrativePlan?.chapters || []).forEach((c: any) => {
    if (containsPlaceholder(c.readerQuestion)) readerQuestionIssues++;
  });
  (artifact.structuredFacts.cards || []).forEach((c: any) => {
    if (containsPlaceholder(c.readerQuestion)) readerQuestionIssues++;
  });
  registerCheck(
    "reader_question_quality",
    readerQuestionIssues === 0,
    `${readerQuestionIssues} chapter reader question(s) are placeholder-shaped or malformed`
  );

  // Did You Know <= 3 sentences check
  let didYouKnowTooLong = false;
  (artifact.triviaCandidates || []).forEach((insight: any) => {
    const factText = typeof insight === "string" ? insight : (insight.fact || "");
    const sentenceCount = factText.split(/[.!?]+/).map((s: string) => s.trim()).filter(Boolean).length;
    if (sentenceCount > 3) {
      didYouKnowTooLong = true;
    }
  });
  registerCheck("did_you_know_length_ok", !didYouKnowTooLong, "Did You Know insights must be max 3 sentences long");

  // Sentence Provenance Check
  let provenanceValid = true;
  let totalSentencesChecked = 0;
  let validProvenanceCount = 0;

  const cleanSentenceForCompare = (str: string) => {
    return str.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"\s]/g, "").trim();
  };

  const checkProvenance = (text: string, provenanceList: any[]) => {
    const cleanText = cleanSentenceForCompare(text);
    let combinedCleanSentences = "";

    (provenanceList || []).forEach(p => {
      totalSentencesChecked++;
      const cleanP = cleanSentenceForCompare(p.sentence);
      combinedCleanSentences += cleanP;

      if (cleanText.includes(cleanP) && p.fact) {
        validProvenanceCount++;
      } else {
        provenanceValid = false;
      }
    });

    if (Math.abs(cleanText.length - combinedCleanSentences.length) > 15) {
      provenanceValid = false;
    }
  };

  checkProvenance(artifact.structuredFacts.briefSummary || "", artifact.briefSummaryProvenance || []);
  // V19: the editorial brief carries the same sentence-level provenance
  // contract as the summary and cards. Checked only when the brief exists.
  if (artifact.structuredFacts.editorialBrief) {
    checkProvenance(artifact.structuredFacts.editorialBrief, artifact.editorialBriefProvenance || []);
  }
  (artifact.structuredFacts.cards || []).forEach((c: any) => {
    checkProvenance(c.summary || "", c.provenance || []);
  });

  const provenanceRatio = totalSentencesChecked > 0 ? (validProvenanceCount / totalSentencesChecked) : 0;
  registerCheck("sentence_provenance_ok", provenanceValid && provenanceRatio === 1.0, `Sentence provenance is incomplete: only ${Math.round(provenanceRatio * 100)}% of sentences are mapped to facts`);

  // No Abstract Writing Check
  const abstractWords = ["importance", "impact", "legacy", "framework", "system", "process", "development", "mechanism", "structure"];
  let abstractWritingErrors = 0;

  const checkAbstractWriting = (text: string, anchors: string[]) => {
    const paragraphs = text.split(/\n+/).filter(Boolean);
    paragraphs.forEach(para => {
      const lower = para.toLowerCase();
      for (const word of abstractWords) {
        if (lower.includes(word)) {
          const hasAnchor = anchors.some(a => lower.includes(a.toLowerCase()));
          const hasYear = /\b(1\d{3}|2\d{3})\b/.test(para);
          const hasCapitalWord = /[A-Z][a-z]+/.test(para.substring(1)); 
          if (!hasAnchor && !hasYear && !hasCapitalWord) {
            abstractWritingErrors++;
          }
        }
      }
    });
  };

  (artifact.structuredFacts.cards || []).forEach((c: any) => {
    const anchors = c.provenance ? c.provenance.map((p: any) => p.fact) : [];
    checkAbstractWriting(c.summary || "", anchors);
  });
  registerCheck("no_abstract_writing", abstractWritingErrors === 0, `Artifact contains abstract writing without concrete nouns: ${abstractWritingErrors} occurrences`);

  // Documentary Alternating Rule (exactly 6 sentences per card summary)
  let alternatingPatternViolations = 0;
  (artifact.structuredFacts.cards || []).forEach((c: any) => {
    const sentences = c.summary.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (sentences.length !== 6) {
      alternatingPatternViolations++;
    }
  });
  registerCheck("documentary_alternating_rule", alternatingPatternViolations === 0, `Card summaries must follow the alternating pattern: exactly 6 sentences per card summary. Violations: ${alternatingPatternViolations}`);

  // Fact Density Check
  let factDensityViolations = 0;
  (artifact.structuredFacts.cards || []).forEach((c: any) => {
    const summary = c.summary || "";
    const capitalizedMatches = summary.match(/\b[A-Z][a-z]+\b/g) || [];
    const uniqueCaps = new Set(capitalizedMatches);
    const namedEntitiesCount = uniqueCaps.size;
    const uniqueFacts = new Set((c.provenance || []).map((p: any) => p.fact.toLowerCase())).size;

    if (namedEntitiesCount < 4 || uniqueFacts < 3) {
      factDensityViolations++;
    }
  });
  registerCheck("fact_density_met", factDensityViolations === 0, `Chapter cards do not meet the minimum fact density requirements (Named Entities >= 4, Unique Facts >= 3). Violations: ${factDensityViolations}`);

  // Curiosity Check
  let curiosityViolations = 0;
  (artifact.structuredFacts.cards || []).forEach((c: any) => {
    const lower = (c.summary || "").toLowerCase();
    if (lower.includes("this is important") || lower.includes("it is important") || lower.includes("remains significant")) {
      curiosityViolations++;
    }
  });
  registerCheck("curiosity_score_ok", curiosityViolations === 0, `Chapter cards must explain significance without saying 'This is important'. Violations: ${curiosityViolations}`);

  // Documentary Score Calculation with V17 penalties
  let documentaryScore = 100;
  if (genericWordingScore > 0) documentaryScore -= 15;
  if (!provenanceValid) documentaryScore -= 15;
  if (abstractWritingErrors > 0) documentaryScore -= 15;
  if (alternatingPatternViolations > 0) documentaryScore -= 15;
  if (factDensityViolations > 0) documentaryScore -= 10;
  if (curiosityViolations > 0) documentaryScore -= 10;
  if (paragraphTooLong) documentaryScore -= 10;
  if (genericTitleFound) documentaryScore -= 10;
  if (lacksConcreteNounsOrDates) documentaryScore -= 10;
  if (hasRepeatedPhrases) documentaryScore -= 5;
  if (timelineMilestonePlaceholder) documentaryScore -= 5;
  if (didYouKnowTooLong) documentaryScore -= 5;

  registerCheck("documentary_score_ok", documentaryScore >= 80, `Documentary score is too low: ${documentaryScore}/100`);

  // 9. Confidence Thresholds Met
  const resolverConfidence = artifact.confidenceScores.resolver;
  const compilerConfidence = artifact.confidenceScores.compiler;
  const overallConfidence = artifact.confidenceScores.overall;
  registerCheck("resolver_confidence_ok", resolverConfidence >= 0.70, `Entity resolver confidence is too low: ${resolverConfidence}`);
  registerCheck("compiler_confidence_ok", compilerConfidence >= 0.70, `Knowledge compiler confidence is too low: ${compilerConfidence}`);
  registerCheck("overall_confidence_ok", overallConfidence >= 0.70, `Overall confidence is too low: ${overallConfidence}`);

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    checkedRules,
    timestamp: new Date().toISOString()
  };
}
