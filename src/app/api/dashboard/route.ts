import { getDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getDashboardData());
  } catch (error) {
    console.error("Dashboard data error:", error);
    return Response.json({ error: "Unable to load project data." }, { status: 500 });
  }
}
