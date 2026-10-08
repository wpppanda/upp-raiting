import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, reviews, type ReviewSentiment } from "@/db/schema";
import { releaseBoostedPositives } from "@/lib/publish-rules";

export const dynamic = "force-dynamic";

type ReviewAction =
  | "approve"
  | "reject"
  | "spam"
  | "reply"
  | "publish"
  | "unpublish"
  | "delay"
  | "hide"
  | "show"
  | "pin"
  | "unpin"
  | "change_rating";

const ACTIONS = [
  "approve",
  "reject",
  "spam",
  "reply",
  "publish",
  "unpublish",
  "delay",
  "hide",
  "show",
  "pin",
  "unpin",
  "change_rating",
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return Response.json({ error: "Invalid review ID." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const action = String(body.action ?? "") as ReviewAction;
  if (!ACTIONS.includes(action)) {
    return Response.json({ error: "Unknown review action." }, { status: 400 });
  }

  const [review] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
  if (!review) return Response.json({ error: "Review not found." }, { status: 404 });
  const [project] = await db.select().from(projects).where(eq(projects.id, review.projectId)).limit(1);

  const now = new Date();
  let values: Partial<typeof reviews.$inferInsert>;

  switch (action) {
    case "reply": {
      const reply = typeof body.reply === "string" ? body.reply.trim() : "";
      if (reply.length < 2 || reply.length > 2000) {
        return Response.json({ error: "Reply must contain 2 to 2,000 characters." }, { status: 400 });
      }
      values = { companyReply: reply, replyAt: now };
      break;
    }
    case "reject":
      values = { status: "rejected", scheduledAt: null };
      break;
    case "spam":
      values = { status: "spam", scheduledAt: null };
      break;
    case "publish":
      values = { status: "published", publishedAt: now, scheduledAt: null };
      break;
    case "unpublish":
      values = { status: "pending", publishedAt: null, scheduledAt: null };
      break;
    case "delay": {
      const minutes = Number(body.minutes);
      if (!Number.isInteger(minutes) || minutes < 5 || minutes > 20160) {
        return Response.json({ error: "Delay must be between 5 and 20,160 minutes." }, { status: 400 });
      }
      values = { status: "queued", scheduledAt: new Date(now.getTime() + minutes * 60 * 1000), publishedAt: null };
      break;
    }
    case "hide":
      values = { hiddenText: true };
      break;
    case "show":
      values = { hiddenText: false };
      break;
    case "pin":
      values = { pinned: true };
      break;
    case "unpin":
      values = { pinned: false };
      break;
    case "change_rating": {
      const rating = Number(body.rating);
      const scale = project?.ratingScale ?? "stars";
      const max = scale === "nps" ? 10 : scale === "binary" ? 1 : 5;
      const min = scale === "nps" || scale === "binary" ? 0 : 1;
      if (!Number.isInteger(rating) || rating < min || rating > max) {
        return Response.json({ error: `Rating must be between ${min} and ${max}` }, { status: 400 });
      }
      const positive = project?.positiveThreshold ?? 5;
      const neutral = project?.neutralThreshold ?? 4;
      const sentiment: ReviewSentiment =
        rating >= positive ? "positive" : rating >= neutral ? "neutral" : "negative";
      values = { rating, sentiment };
      break;
    }
    default: {
      // approve
      const mode =
        review.sentiment === "positive"
          ? project?.positivePublishMode
          : review.sentiment === "neutral"
            ? project?.neutralPublishMode
            : project?.negativePublishMode;
      const categoryDelay =
        review.sentiment === "positive"
          ? project?.positiveDelayMinutes
          : review.sentiment === "neutral"
            ? project?.neutralDelayMinutes
            : project?.negativeDelayMinutes;
      // Only "With a delay" categories wait after approval; manual approval publishes right away.
      const delay = mode === "delayed" ? (categoryDelay ?? 0) : 0;
      values =
        delay > 0
          ? { status: "queued", scheduledAt: new Date(now.getTime() + delay * 60 * 1000), publishedAt: null }
          : { status: "published", publishedAt: now, scheduledAt: null };
    }
  }

  const [updated] = await db.update(reviews).set(values).where(eq(reviews.id, id)).returning();

  // Умная очередь: после публикации негатива ускоряем позитивные отзывы из очереди
  if (
    review.sentiment === "negative" &&
    (action === "approve" || action === "publish") &&
    updated.status === "published" &&
    project?.smartQueueEnabled &&
    !project.negativeLookbackEnabled
  ) {
    const queuedPositives = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(
          eq(reviews.projectId, review.projectId),
          eq(reviews.status, "queued"),
          eq(reviews.sentiment, "positive"),
        ),
      )
      .orderBy(asc(reviews.scheduledAt), asc(reviews.createdAt))
      .limit(8);
    for (const [index, queued] of queuedPositives.entries()) {
      if (index === 0) {
        await db
          .update(reviews)
          .set({ status: "published", publishedAt: now, scheduledAt: null })
          .where(eq(reviews.id, queued.id));
      } else {
        await db
          .update(reviews)
          .set({ scheduledAt: new Date(now.getTime() + index * 15 * 60 * 1000) })
          .where(eq(reviews.id, queued.id));
      }
    }
  }

  // Опубликован нейтрал / негатив → следующий позитив(ы) из очереди выходят сразу по правилам компенсации
  if (project && updated.status === "published" && review.status !== "published" && review.sentiment !== "positive") {
    await releaseBoostedPositives(review.projectId, project);
  }

  return Response.json({ review: updated });
}
