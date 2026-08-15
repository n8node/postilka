import { redirect } from "next/navigation";

// Hidden until agents return: import { NewMissionPage } from "@/components/missions/NewMissionPage";

export default function Page() {
  redirect("/dashboard");
}
