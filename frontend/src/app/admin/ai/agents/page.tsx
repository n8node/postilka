import { redirect } from "next/navigation";

export default function AdminAgentsRedirect() {
  redirect("/admin/settings?section=ai-agents");
}
