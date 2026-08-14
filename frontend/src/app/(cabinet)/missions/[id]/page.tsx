import { MissionWorkspace } from "@/components/missions/MissionWorkspace";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MissionWorkspace missionId={id} />;
}
