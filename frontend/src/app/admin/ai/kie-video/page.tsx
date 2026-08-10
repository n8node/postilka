import { redirect } from "next/navigation";

export default function AdminKieVideoRedirect() {
  redirect("/admin/settings?section=ai-kie-video");
}
