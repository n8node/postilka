import { AuthGasBackground } from "@/components/auth/AuthGasBackground";
import { AuthScreenShell } from "@/components/auth/AuthScreenShell";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-bg">
      <AuthGasBackground />
      <div className="relative z-10">
        <AuthScreenShell>{children}</AuthScreenShell>
      </div>
    </div>
  );
}
