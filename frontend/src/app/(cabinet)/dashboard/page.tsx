import { getMe } from "@/lib/auth-server";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";

export default async function DashboardPage() {
  const me = await getMe();

  return (
    <DashboardOverview
      userName={me?.user.name}
      workspaceName={me?.active_workspace?.name ?? me?.workspace?.name}
    />
  );
}
