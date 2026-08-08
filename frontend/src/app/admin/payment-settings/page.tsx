import { redirect } from "next/navigation";

export default function AdminPaymentSettingsRedirect() {
  redirect("/admin/settings?section=payment");
}
