import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { projects, reviews } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const origin = request.headers.get("origin");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return Response.json({ error: "Project not found." }, { status: 404 });
  }

  try {
    const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
    if (origin) {
      try {
        const hostname = new URL(origin).hostname.toLowerCase();
        const configured = project.domain.toLowerCase();
        const root = configured.startsWith("*.") ? configured.slice(2) : configured;
        const allowed = configured.startsWith("*.")
          ? hostname === root || hostname.endsWith(`.${root}`)
          : hostname === root;
        if (!allowed) return Response.json({ error: "This domain is not connected to the project." }, { status: 403 });
      } catch {
        return Response.json({ error: "Invalid request origin." }, { status: 403 });
      }
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
