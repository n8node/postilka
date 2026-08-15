import { redirect } from "next/navigation";

export default function AdminAgentsRedirect() {
  // Hidden until agents return: redirect("/admin/settings?section=ai-agents");
  redirect("/admin/settings");
}
