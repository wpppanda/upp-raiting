import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { projects, reviews } from "@/db/schema";
import { originAllowed } from "@/lib/widget-domains";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const origin = request.headers.get("origin");
  const [project] = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ? await db.select().from(projects).where(eq(projects.id, id)).limit(1)
    : [];
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
  if (!originAllowed(project, origin)) return Response.json({ error: "This domain is not connected to the project." }, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin ?? "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    },
  });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const origin = request.headers.get("origin");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return Response.json({ error: "Project not found." }, { status: 404 });
  }

  try {
    const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
    if (!originAllowed(project, origin)) {
      return Response.json({ error: "This domain is not connected to the project." }, { status: 403 });
    }

    const [summary] = await db
      .select({
        total: sql<number>`count(*)::int`,
        average: sql<number>`coalesce(avg(${reviews.rating}), 0)::float`,
      })
      .from(reviews)
      .where(and(eq(reviews.projectId, project.id), eq(reviews.status, "published")));
    return Response.json({
      project: { id: project.id, name: project.name, ratingScale: project.ratingScale },
      rating: { average: Math.round(Number(summary?.average ?? 0) * 10) / 10, count: summary?.total ?? 0 },
    }, {
      headers: {
        "Access-Control-Allow-Origin": origin ?? "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
        Vary: "Origin",
      },
    });
  } catch (error) {
    console.error("Public rating error:", error);
    return Response.json({ error: "Unable to load the rating." }, { status: 500 });
  }
}
