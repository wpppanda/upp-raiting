import { getDashboardData } from "@/lib/dashboard-data";
import Dashboard, { type DashboardData } from "./dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getDashboardData();
  const initialData = JSON.parse(JSON.stringify(data)) as DashboardData;
  return <Dashboard initialData={initialData} />;
}
