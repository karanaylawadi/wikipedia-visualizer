import fs from "fs";
import path from "path";
import { getArticleIntelligence, searchWikipedia } from "../src/lib/editorial/wikipedia";
import { processKnowledgeDAG } from "../src/lib/knowledge/dag";
import { lintArtifact } from "../src/lib/knowledge/linter";

// Simple helper to load .env.local file properties into process.env
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    }
    console.log("[Benchmarks] Loaded env variables from .env.local");
  }
}

const BENCHMARK_TOPICS = [
  { topic: "Inception", expectedOntology: "Movie" },
  { topic: "Interstellar", expectedOntology: "Movie" },
  { topic: "Albert Einstein", expectedOntology: "Person" },
  { topic: "Christopher Nolan", expectedOntology: "Person" },
  { topic: "Apple Inc.", expectedOntology: "Company" },
  { topic: "NVIDIA", expectedOntology: "Company" },
  { topic: "Japan", expectedOntology: "Country" },
  { topic: "United Arab Emirates", expectedOntology: "Country" },
  { topic: "World War II", expectedOntology: "Historical Event" },
  { topic: "Space Race", expectedOntology: "Historical Event" },
  { topic: "Renaissance", expectedOntology: "Art Movement" },
  { topic: "Mona Lisa", expectedOntology: "Art Movement" },
  { topic: "Python (programming language)", expectedOntology: "Technology" },
  { topic: "Kubernetes", expectedOntology: "Technology" },
  { topic: "DNA", expectedOntology: "Science" },
  { topic: "Photosynthesis", expectedOntology: "Science" }
];

async function runBenchmarks() {
  loadEnvLocal();

  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not defined. Cannot run benchmarks.");
    process.exit(1);
  }

  console.log("\n=======================================================");
  console.log("Visualizer.wiki V15 Benchmark Suite");
  console.log("=======================================================\n");

  let passes = 0;
  let failures = 0;

  for (const item of BENCHMARK_TOPICS) {
    console.log(`Testing topic: "${item.topic}" (Expected: ${item.expectedOntology})...`);
    try {
      // 1. Fetch Wikipedia data
      let articleSource = await getArticleIntelligence(item.topic);
      if (!articleSource) {
        const searchResult = await searchWikipedia(item.topic);
        if (!searchResult) {
          throw new Error(`Could not find Wikipedia article for: ${item.topic}`);
        }
        articleSource = {
          ...searchResult,
          lead: searchResult.extract.split(".")[0] + ".",
          sectionHeadings: [],
          wikitext: "",
          links: [],
          categories: []
        };
      }

      // 2. Process DAG compilation
      const artifact = await processKnowledgeDAG(item.topic, articleSource);

      // 3. Validation checks
      const lintReport = lintArtifact(artifact);
      
      const ontologyName = artifact.ontology.name;
      const isOntologyCorrect = ontologyName === item.expectedOntology;
      
      console.log(`  - Mapped Ontology: ${ontologyName} [${isOntologyCorrect ? "PASS" : "FAIL"}]`);
      console.log(`  - Linter Status: ${lintReport.passed ? "PASS" : "FAIL"}`);
      console.log(`    V16 Documentary Metrics:`);
      console.log(`      * Sentence Provenance Check: ${lintReport.checkedRules["sentence_provenance_ok"] ? "PASS" : "FAIL"}`);
      console.log(`      * Fact Density Check: ${lintReport.checkedRules["fact_density_met"] ? "PASS" : "FAIL"}`);
      console.log(`      * Generic Wording Check: ${lintReport.checkedRules["generic_wording_check"] ? "PASS" : "FAIL"}`);
      console.log(`      * Documentary Alternating Rule: ${lintReport.checkedRules["documentary_alternating_rule"] ? "PASS" : "FAIL"}`);
      console.log(`      * Documentary Score Check: ${lintReport.checkedRules["documentary_score_ok"] ? "PASS" : "FAIL"}`);
      if (!lintReport.passed) {
        console.log(`    Linter Errors:`, lintReport.errors);
      }

      if (isOntologyCorrect && lintReport.passed) {
        console.log(`✔️ Topic "${item.topic}" PASSED all checks.\n`);
        passes++;
      } else {
        console.log(`❌ Topic "${item.topic}" FAILED validation.\n`);
        failures++;
      }
    } catch (error: any) {
      console.error(`❌ Exception running topic "${item.topic}":`, error.message || error);
      failures++;
    }
  }

  console.log("=======================================================");
  console.log(`Benchmark Results: ${passes} passed, ${failures} failed.`);
  console.log("=======================================================");
  
  if (failures > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runBenchmarks();
