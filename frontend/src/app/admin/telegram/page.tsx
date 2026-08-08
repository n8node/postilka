import { redirect } from "next/navigation";

export default function AdminTelegramIndexRoute() {
  redirect("/admin/settings?section=telegram-notifications");
}
