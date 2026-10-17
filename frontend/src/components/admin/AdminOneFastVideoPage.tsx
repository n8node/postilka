"use client";
import { AdminOneFastPage } from "@/components/admin/AdminOneFastPage";
export function AdminOneFastVideoPage({ embedded = false }: { embedded?: boolean }) { return <AdminOneFastPage embedded={embedded} video />; }