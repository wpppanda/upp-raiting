import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reviews, type ReviewAuthorKind, type ReviewSentiment, type ReviewStatus } from "@/db/schema";
import { ensureProject } from "@/lib/dashboard-data";
import { sanitizePhotos } from "@/lib/photo-upload";
import { buildFollowUp } from "@/lib/follow-up";
import { encryptEmail } from "@/lib/pii";
import { releaseBoostedPositives, shouldBoostPositive } from "@/lib/publish-rules";

export const dynamic = "force-dynamic";

const requestWindows = new Map<string, { startedAt: number; count: number }>();

function resolveStatus(
  sentiment: ReviewSentiment,
  project: Awaited<ReturnType<typeof ensureProject>>,
  content: string,
  boost: boolean,
): { status: ReviewStatus; delay: number } {
  const mode =
    sentiment === "positive"
      ? project.positivePublishMode
      : sentiment === "neutral"
        ? project.neutralPublishMode
        : project.negativePublishMode;
  const delay =
    sentiment === "positive"
      ? project.positiveDelayMinutes
      : sentiment === "neutral"
        ? project.neutralDelayMinutes
        : project.negativeDelayMinutes;

  const stopWords = project.stopWords
    .split(",")
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);
  const lower = content.toLowerCase();
  const hitStopWord = stopWords.some((w) => w && lower.includes(w));

  if (mode === "manual" || hitStopWord) return { status: "pending", delay };
  if (mode === "instant") return { status: "published", delay: 0 };
  // Компенсация: после нейтрала / негатива в последних N следующий позитив выходит сразу
  if (boost && sentiment === "positive") return { status: "published", delay: 0 };
  // delayed (and any unknown legacy value): wait for the configured delay, or publish at once when it is 0
  return delay > 0 ? { status: "queued", delay } : { status: "published", delay: 0 };
}

export async function POST(request: Request) {
  const now = Date.now();
  const clientKey = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown-client";
  const window = requestWindows.get(clientKey);
  if (window && now - window.startedAt < 60 * 60 * 1000 && window.count >= 8) {
    return Response.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }
  if (!window || now - window.startedAt >= 60 * 60 * 1000) {
    requestWindows.set(clientKey, { startedAt: now, count: 1 });
  } else {
    window.count += 1;
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const authorName = typeof body.authorName === "string" ? body.authorName.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const rating = Number(body.rating);
  const authorEmail = typeof body.authorEmail === "string" ? body.authorEmail.trim().slice(0, 254) : "";
  const authorCity = typeof body.authorCity === "string" ? body.authorCity.trim().slice(0, 120) : "";
  const isAnonymous = body.isAnonymous === true;
  // An employee of the company can enter a review manually — as themselves or on behalf of a customer.
  const authorKind: ReviewAuthorKind = body.authorKind === "employee" ? "employee" : "customer";
  const addedBy = typeof body.addedBy === "string" ? body.addedBy.trim().slice(0, 120) : "";

  if (authorName.length < 2 || authorName.length > 120) {
    return Response.json({ error: "Author name must contain 2 to 120 characters." }, { status: 400 });
  }
  if (!Number.isInteger(rating)) {
    return Response.json({ error: "Choose a whole-number rating." }, { status: 400 });
  }
  if (authorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorEmail)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    const project = await ensureProject();
    const maxRating = project.ratingScale === "nps" ? 10 : project.ratingScale === "binary" ? 1 : 5;
    const minRating = project.ratingScale === "nps" || project.ratingScale === "binary" ? 0 : 1;
    if (rating < minRating || rating > maxRating) {
      return Response.json({ error: `Rating must be between ${minRating} and ${maxRating}` }, { status: 400 });
    }
    if (isAnonymous && !project.allowAnonymousReviews) {
      return Response.json({ error: "Anonymous reviews are not available for this project." }, { status: 400 });
    }
    const minLen = project.minReviewLength ?? 10;
    if (content.length > 2000 || (project.reviewTextRequired && content.length < minLen) || (!project.reviewTextRequired && content.length > 0 && content.length < minLen)) {
      return Response.json({ error: project.reviewTextRequired ? `Review text must contain between ${minLen} and 2,000 characters.` : `If you add a comment, it must contain at least ${minLen} characters.` }, { status: 400 });
    }
    const sentiment: ReviewSentiment =
      rating >= project.positiveThreshold ? "positive" : rating >= project.neutralThreshold ? "neutral" : "negative";

    const photoCheck = sanitizePhotos(body.photos, {
      allowPhotos: project.allowPhotos,
      maxPhotos: project.maxPhotos,
      maxPhotoSizeKb: project.maxPhotoSizeKb,
    });
    if (photoCheck.error) return Response.json({ error: photoCheck.error }, { status: 400 });

    const boost = sentiment === "positive" ? await shouldBoostPositive(project.id, project) : false;
    const { status, delay } = resolveStatus(sentiment, project, content, boost);
    const createdAt = new Date();
    const [created] = await db
      .insert(reviews)
      .values({
        projectId: project.id,
        authorName,
        authorEmail: encryptEmail(authorEmail),
        authorCity: authorCity || null,
        isAnonymous,
        rating,
        sentiment,
        content,
        source: authorKind === "employee" || addedBy ? "Added manually" : "Review form",
        status,
        createdAt,
        scheduledAt: status === "queued" ? new Date(createdAt.getTime() + delay * 60 * 1000) : null,
        publishedAt: status === "published" ? createdAt : null,
        photos: photoCheck.photos,
        authorKind,
        addedBy: addedBy || null,
      })
      .returning();

    // Автоответ по правилам категории
    const autoOn =
      sentiment === "positive"
        ? project.positiveAutoReplyEnabled
        : sentiment === "neutral"
          ? project.neutralAutoReplyEnabled
          : project.negativeAutoReplyEnabled;
    if (autoOn && status === "published") {
      const tpl =
        sentiment === "positive"
          ? project.positiveAutoReplyTemplate
          : sentiment === "neutral"
            ? project.neutralAutoReplyTemplate
            : project.negativeAutoReplyTemplate;
      const text = tpl.replaceAll("{name}", authorName);
      if (text.trim()) {
        await db
          .update(reviews)
          .set({ companyReply: text.trim().slice(0, 2000), replyAt: new Date() })
          .where(eq(reviews.id, created.id));
      }
    }

    // Нейтрал / негатив вышли сразу → следующий позитив из очереди публикуем без задержки
    if (status === "published" && sentiment !== "positive") {
      await releaseBoostedPositives(project.id, project);
    }

    return Response.json({ review: created, followUp: buildFollowUp(project, sentiment) }, { status: 201 });
  } catch (error) {
    console.error("Review creation error:", error);
    return Response.json({ error: "Unable to save the review." }, { status: 500 });
  }
}
