import { redirect } from "next/navigation";

export default function AdminYandexGptRedirect() {
  redirect("/admin/settings?section=ai-yandex-gpt");
}
