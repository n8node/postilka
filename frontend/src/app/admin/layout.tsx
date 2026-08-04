import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminMe, getMe } from "@/lib/auth-server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getMe();
  if (!me) {
    redirect("/auth/login?next=/admin/users");
  }

  const admin = await getAdminMe();
  if (!admin) {
    redirect("/dashboard");
  }

  return (
    <AdminShell adminEmail={admin.user.email} adminName={admin.user.name}>
      {children}
    </AdminShell>
  );
}
