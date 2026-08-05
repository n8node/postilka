"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { UserInvitesBlock } from "@/components/settings/UserInvitesBlock";

export default function InvitesPage() {
  return (
    <div>
      <PageHeader
        title="Инвайты"
        description="Ключи для приглашения новых пользователей на платформу."
      />
      <div className="max-w-xl">
        <UserInvitesBlock />
      </div>
    </div>
  );
}
