import { redirect } from "next/navigation";

export default function InvitesPage() {
  redirect("/settings?section=invites");
}
