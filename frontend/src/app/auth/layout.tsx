import { AuthGasBackground } from "@/components/auth/AuthGasBackground";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-bg">
      <AuthGasBackground />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
