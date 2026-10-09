import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { projects, reviews, type ReviewSentiment, type ReviewStatus } from "@/db/schema";
import { publishDueReviews } from "@/lib/dashboard-data";
import { buildCustomAnswers } from "@/lib/custom-fields";
import { sanitizePhotos } from "@/lib/photo-upload";
import { encryptEmail } from "@/lib/pii";
import { buildFollowUp } from "@/lib/follow-up";
import { releaseBoostedPositives, shouldBoostPositive } from "@/lib/publish-rules";
import { originAllowed } from "@/lib/widget-domains";

export const dynamic = "force-dynamic";

function jsonResponse(body: unknown, origin: string | null, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": origin ?? "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "600",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
      Vary: "Origin",
    },
  });
}

async function getProject(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return project ?? null;
}

export async function OPTIONS(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const origin = request.headers.get("origin");
  const project = await getProject(id);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
  if (!originAllowed(project, origin)) return Response.json({ error: "Domain not allowed." }, { status: 403 });
  return new Response(null, { status: 204, headers: {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  } });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const origin = request.headers.get("origin");
  try {
    const project = await getProject(id);
    if (!project) return jsonResponse({ error: "Project not found." }, origin, 404);
    if (!originAllowed(project, origin)) return jsonResponse({ error: "This domain is not connected to the project." }, null, 403);

    await publishDueReviews(project.id);
    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get("limit") ?? 10);
    const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(50, requestedLimit)) : 10;
    const [summary] = await db
      .select({
        total: sql<number>`count(*)::int`,
        average: sql<number>`coalesce(avg(${reviews.rating}), 0)::float`,
      })
      .from(reviews)
      .where(and(eq(reviews.projectId, project.id), eq(reviews.status, "published")));
    const rows = await db
      .select({
        id: reviews.id,
        authorName: reviews.authorName,
        authorCity: reviews.authorCity,
        customFields: reviews.customFields,
        isAnonymous: reviews.isAnonymous,
        rating: reviews.rating,
        sentiment: reviews.sentiment,
        content: reviews.content,
        hiddenText: reviews.hiddenText,
        companyReply: reviews.companyReply,
        photos: reviews.photos,
        publishedAt: reviews.publishedAt,
      })
      .from(reviews)
      .where(and(eq(reviews.projectId, project.id), eq(reviews.status, "published")))
      .orderBy(desc(reviews.pinned), desc(reviews.publishedAt), desc(reviews.createdAt))
      .limit(limit);

    return jsonResponse({
      project: {
        name: project.name,
        brandColor: project.brandColor,
        ratingScale: "stars",
        form: {
          allowAnonymousReviews: project.allowAnonymousReviews,
          reviewTextRequired: project.reviewTextRequired,
          minReviewLength: project.minReviewLength,
          allowPhotos: project.allowPhotos,
          maxPhotos: project.maxPhotos,
          maxPhotoSizeKb: project.maxPhotoSizeKb,
          showEmail: project.formShowEmail,
          showCity: project.formShowCity,
          showComment: project.formShowComment,
          customFields: (project.formFields ?? []).map((field) => ({
            id: field.id, label: field.label, type: field.type, options: field.options, required: field.required,
          })),
        },
        badge: { format: project.badgeFormat },
        display: {
          city: project.publicShowCity,
          date: project.publicShowDate,
          name: project.publicShowName,
          text: project.publicShowText,
          avatar: project.publicShowAvatar,
        },
      },
      metrics: { total: summary?.total ?? 0, averageRating: Math.round(Number(summary?.average ?? 0) * 10) / 10 },
      reviews: rows.map((review) => {
        const showText = project.publicShowText && !review.hiddenText;
        return {
          id: review.id,
          authorName: review.isAnonymous ? "Anonymous" : project.publicShowName ? review.authorName : null,
          authorCity: project.publicShowCity && !review.isAnonymous ? review.authorCity : null,
          isAnonymous: review.isAnonymous,
          rating: review.rating,
          sentiment: review.sentiment,
          content: showText ? review.content : "",
          showText: project.publicShowText,
          hiddenText: review.hiddenText,
          companyReply: review.companyReply,
          photos: review.photos ?? [],
          customFields: (review.customFields ?? []).filter((field) => field.showPublic).map((field) => ({ label: field.label, value: field.value })),
          publishedAt: project.publicShowDate ? review.publishedAt : null,
          showAvatar: project.publicShowAvatar,
        };
      }),
    }, origin);
  } catch (error) {
    console.error("Public review feed error:", error);
    return jsonResponse({ error: "Unable to load reviews." }, origin, 500);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const origin = request.headers.get("origin");
  const project = await getProject(id);
  if (!project) return jsonResponse({ error: "Project not found." }, origin, 404);
  if (!originAllowed(project, origin)) return jsonResponse({ error: "This domain is not connected to the project." }, null, 403);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Invalid request body." }, origin, 400);
  }
  const authorName = typeof body.authorName === "string" ? body.authorName.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const authorEmail = typeof body.authorEmail === "string" ? body.authorEmail.trim().slice(0, 254) : "";
  const authorCity = typeof body.authorCity === "string" ? body.authorCity.trim().slice(0, 120) : "";
  const isAnonymous = body.isAnonymous === true;
  const rating = Number(body.rating);
  if (authorName.length < 2 || authorName.length > 120) return jsonResponse({ error: "Author name must contain 2 to 120 characters." }, origin, 400);
  if (!Number.isInteger(rating)) return jsonResponse({ error: "Choose a whole-number rating." }, origin, 400);
  const maxRating = project.ratingScale === "nps" ? 10 : project.ratingScale === "binary" ? 1 : 5;
  const minRating = project.ratingScale === "nps" || project.ratingScale === "binary" ? 0 : 1;
  if (rating < minRating || rating > maxRating) return jsonResponse({ error: `Rating must be between ${minRating} and ${maxRating}` }, origin, 400);
  if (isAnonymous && !project.allowAnonymousReviews) return jsonResponse({ error: "Anonymous reviews are not available for this project." }, origin, 400);
  const minReviewLength = project.minReviewLength;
  if (content.length > 2000 || (project.reviewTextRequired && content.length < minReviewLength) || (!project.reviewTextRequired && content.length > 0 && content.length < minReviewLength)) {
    return jsonResponse({ error: project.reviewTextRequired ? `Review text must contain between ${minReviewLength} and 2,000 characters.` : `If you add a comment, it must contain at least ${minReviewLength} characters.` }, origin, 400);
  }
  if (authorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorEmail)) return jsonResponse({ error: "Enter a valid email address." }, origin, 400);

  const photoCheck = sanitizePhotos(body.photos, {
    allowPhotos: project.allowPhotos,
    maxPhotos: project.maxPhotos,
    maxPhotoSizeKb: project.maxPhotoSizeKb,
  });
  if (photoCheck.error) return jsonResponse({ error: photoCheck.error }, origin, 400);
  const customCheck = buildCustomAnswers(body.customFields, project.formFields ?? []);
  if (customCheck.error) return jsonResponse({ error: customCheck.error }, origin, 400);

  const sentiment: ReviewSentiment = rating >= project.positiveThreshold
    ? "positive"
    : rating >= project.neutralThreshold
      ? "neutral"
      : "negative";
  const cfg = project as unknown as Record<string, unknown>;
  const mode =
    sentiment === "positive"
      ? String(cfg.positivePublishMode ?? "delayed")
      : sentiment === "neutral"
        ? String(cfg.neutralPublishMode ?? "manual")
        : String(cfg.negativePublishMode ?? "manual");
  const delay =
    sentiment === "positive"
      ? project.positiveDelayMinutes
      : sentiment === "neutral"
        ? Number(cfg.neutralDelayMinutes ?? 360)
        : Number(cfg.negativeDelayMinutes ?? 0);
  const stopWords = String(cfg.stopWords ?? "")
    .split(",")
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);
  const hitStop = stopWords.some((w) => w && content.toLowerCase().includes(w));
  const boost = sentiment === "positive" ? await shouldBoostPositive(project.id, project) : false;
  const status: ReviewStatus =
    mode === "manual" || hitStop
      ? "pending"
      : mode === "instant" || (boost && sentiment === "positive")
        ? "published"
        : delay > 0
          ? "queued"
          : "published";
  const createdAt = new Date();
  try {
    const [created] = await db.insert(reviews).values({
      projectId: project.id,
      authorName,
      authorEmail: encryptEmail(authorEmail),
      authorCity: authorCity || null,
      isAnonymous,
      rating,
      sentiment,
      content,
      source: "Website widget",
      status,
      createdAt,
      photos: photoCheck.photos,
      scheduledAt: status === "queued" ? new Date(createdAt.getTime() + delay * 60 * 1000) : null,
      publishedAt: status === "published" ? createdAt : null,
    }).returning({ id: reviews.id, status: reviews.status });
    if (status === "published" && sentiment !== "positive") {
      await releaseBoostedPositives(project.id, project);
    }
    return jsonResponse(
      {
        ok: true,
        review: created,
        message: status === "pending" ? "Your review has been submitted for moderation." : "Thank you for your review!",
        followUp: buildFollowUp(project, sentiment),
      },
      origin,
      201,
    );
  } catch (error) {
    console.error("Public review submission error:", error);
    return jsonResponse({ error: "Unable to save the review." }, origin, 500);
  }
}
