import { redirect } from "next/navigation";

export default function AdminTelegramNotificationsRedirect() {
  redirect("/admin/settings?section=telegram-notifications");
}
