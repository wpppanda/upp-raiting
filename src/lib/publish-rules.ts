import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { reviews } from "@/db/schema";

export type BoostConfig = {
  smartQueueEnabled: boolean;
  neutralBoostPositive: boolean;
  negativeLookbackEnabled: boolean;
  negativeLookbackCount: number;
};

/**
 * Нужно ли сейчас публиковать следующий позитив немедленно:
 *  1) последним опубликован нейтральный отзыв (если включено «нейтрал → позитив сразу»);
 *  2) среди последних N (1–5) опубликованных отзывов есть негатив.
 * Правила работают в рамках умной очереди.
 */
export async function shouldBoostPositive(projectId: string, cfg: BoostConfig): Promise<boolean> {
  if (!cfg.smartQueueEnabled) return false;
  if (!cfg.neutralBoostPositive && !cfg.negativeLookbackEnabled) return false;

  const window = cfg.negativeLookbackEnabled ? Math.max(1, Math.min(5, cfg.negativeLookbackCount)) : 1;
  const last = await db
    .select({ sentiment: reviews.sentiment })
    .from(reviews)
    .where(and(eq(reviews.projectId, projectId), eq(reviews.status, "published"), isNotNull(reviews.publishedAt)))
    .orderBy(desc(reviews.publishedAt), desc(reviews.createdAt))
    .limit(window);

  if (last.length === 0) return false;
  if (cfg.neutralBoostPositive && last[0].sentiment === "neutral") return true;
  if (cfg.negativeLookbackEnabled && last.some((r) => r.sentiment === "negative")) return true;
  return false;
}

/** Публикует позитивы из очереди, пока действует условие компенсации (не более maxSteps за вызов). */
export async function releaseBoostedPositives(projectId: string, cfg: BoostConfig, maxSteps = 5): Promise<number> {
  let released = 0;
  for (let step = 0; step < maxSteps; step += 1) {
    if (!(await shouldBoostPositive(projectId, cfg))) break;
    const [next] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.projectId, projectId), eq(reviews.status, "queued"), eq(reviews.sentiment, "positive")))
      .orderBy(asc(reviews.scheduledAt), asc(reviews.createdAt))
      .limit(1);
    if (!next) break;
    await db
      .update(reviews)
      .set({ status: "published", publishedAt: new Date(), scheduledAt: null })
      .where(eq(reviews.id, next.id));
    released += 1;
  }
  return released;
}
