import { redirect } from "next/navigation";

export default function AdminMaxPlatformBotRedirect() {
  redirect("/admin/social-providers?provider=max");
}
