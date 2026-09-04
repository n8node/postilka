import { redirect } from "next/navigation";

export default function AdminAdTrendsRedirect() {
  redirect("/admin/settings?section=ai-ad-trends");
}
