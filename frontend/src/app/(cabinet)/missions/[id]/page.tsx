import { redirect } from "next/navigation";

// Hidden until agents return: import { MissionWorkspace } from "@/components/missions/MissionWorkspace";

export default async function Page() {
  redirect("/dashboard");
}
