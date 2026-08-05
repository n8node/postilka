import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/context/AuthContext";
import { getMe } from "@/lib/auth-server";

export default async function CabinetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getMe();
  if (!me) {
    redirect("/auth/login");
  }

  return (
    <AuthProvider initial={me}>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
