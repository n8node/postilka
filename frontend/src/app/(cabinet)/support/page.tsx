"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { NewTicketModal } from "@/components/support/NewTicketModal";
import { SupportInbox } from "@/components/support/SupportInbox";
import {
  createSupportTicket,
  fetchSupportThemes,
  fetchSupportTickets,
  sendSupportTicketMessage,
  updateSupportTicketStatus,
  type SupportTicket,
  type SupportTicketTheme,
  type TicketPriority,
} from "@/lib/api";

export default function SupportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted" />
        </div>
      }
    >
      <SupportPageInner />
    </Suspense>
  );
}

function SupportPageInner() {
  const searchParams = useSearchParams();
  const ticketIdFromUrl = searchParams.get("ticket");

  const [themes, setThemes] = useState<SupportTicketTheme[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");

  const loadThemes = useCallback(() => {
    fetchSupportThemes()
      .then(setThemes)
      .catch(() => setThemes([]));
  }, []);

  const loadTickets = useCallback(() => {
    return fetchSupportTickets()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setTickets(list);
        setSelectedTicket((current) => {
          const fromUrl = ticketIdFromUrl ? list.find((x) => x.id === ticketIdFromUrl) : undefined;
          if (fromUrl) return fromUrl;
          if (current) return list.find((x) => x.id === current.id) ?? current;
          return current;
        });
      })
      .catch(() => setTickets([]));
  }, [ticketIdFromUrl]);

  useEffect(() => {
    setLoading(true);
    loadThemes();
    loadTickets().finally(() => setLoading(false));
  }, [loadThemes, loadTickets]);

  async function handleCreate(input: {
    theme_id: string;
    subject: string;
    priority: TicketPriority;
    body: string;
    files: File[];
  }) {
    if (!input.theme_id || (!input.body.trim() && input.files.length === 0)) {
      setCreateError("Выберите категорию и опишите вопрос");
      return;
    }
    if (!input.subject.trim()) {
      setCreateError("Укажите тему обращения");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const ticket = await createSupportTicket({
        theme_id: input.theme_id,
        body: input.body,
        subject: input.subject,
        priority: input.priority,
        files: input.files,
      });
      setShowCreate(false);
      await loadTickets();
      setSelectedTicket(ticket);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Ошибка создания");
    } finally {
      setCreating(false);
    }
  }

  async function handleReply(body: string, files: File[]) {
    if (!selectedTicket) return;
    setSending(true);
    setError("");
    try {
      const updated = await sendSupportTicketMessage(selectedTicket.id, body, files);
      setSelectedTicket(updated);
      await loadTickets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка отправки");
    } finally {
      setSending(false);
    }
  }

  async function handleStatus(status: "resolved" | "closed") {
    if (!selectedTicket) return;
    try {
      const updated = await updateSupportTicketStatus(selectedTicket.id, status);
      setSelectedTicket(updated);
      await loadTickets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось обновить статус");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Поддержка"
        description="Переписка с командой Postilka по вашим обращениям."
        className="mb-0"
        actions={
          <button
            type="button"
            onClick={() => {
              setCreateError("");
              setShowCreate(true);
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
          >
            <Plus className="h-4 w-4" />
            Новый тикет
          </button>
        }
      />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <SupportInbox
        mode="user"
        tickets={tickets}
        selected={selectedTicket}
        sending={sending}
        onSelect={setSelectedTicket}
        onSend={handleReply}
        onResolve={() => handleStatus("resolved")}
        onCloseTicket={() => handleStatus("closed")}
        onCreate={() => {
          setCreateError("");
          setShowCreate(true);
        }}
      />

      <NewTicketModal
        open={showCreate}
        themes={themes}
        creating={creating}
        error={createError}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
