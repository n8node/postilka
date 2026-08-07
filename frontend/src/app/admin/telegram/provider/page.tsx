import { redirect } from "next/navigation";

export default function AdminTelegramProviderRedirect() {
  redirect("/admin/social-providers?provider=telegram");
}
