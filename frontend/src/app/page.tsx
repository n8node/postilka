import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth-server";

export default async function HomePage() {
  const me = await getMe();

  redirect(me ? "/dashboard" : "/auth/login");
}
