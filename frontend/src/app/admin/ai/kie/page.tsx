import { redirect } from "next/navigation";

export default function AdminKieRedirect() {
  redirect("/admin/settings?section=ai-kie");
}
