import { redirect } from "next/navigation";

export default function AdminAdStudioRedirect() {
  redirect("/admin/settings?section=ai-ad-studio");
}
