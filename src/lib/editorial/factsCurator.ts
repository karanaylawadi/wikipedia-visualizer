import { getCachedStage, setCachedStage } from "./cache";
import type { TopicKnowledge } from "@/types/wiki";

export async function curateSurprisingFacts(
  topicKey: string,
  knowledge: TopicKnowledge
): Promise<string[]> {
  const cached = await getCachedStage(topicKey, "stage6-didyouknow");
  if (cached) return (cached as { didYouKnow: string[] }).didYouKnow;

  const facts = Array.isArray(knowledge.surprisingFacts) && knowledge.surprisingFacts.length > 0
    ? knowledge.surprisingFacts
    : [
        `${knowledge.title} is studied globally.`,
        `Early records of ${knowledge.title} show high complexity.`,
        `Pivotal developments for ${knowledge.title} occurred over several decades.`
      ];

  await setCachedStage(topicKey, "stage6-didyouknow", { didYouKnow: facts });
  return facts;
}
