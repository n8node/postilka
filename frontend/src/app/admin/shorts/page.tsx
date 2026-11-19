import Link from "next/link";

export default function AdminShortsPage() {
  return (
    <section className="space-y-5">
      <div><h1 className="text-2xl font-semibold text-slate-900">Shorts Studio</h1><p className="mt-1 text-sm text-slate-500">Мониторинг проектов и очереди обработки Shorts.</p></div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Проекты Shorts обрабатываются maintenance-worker. Для подробной диагностики используйте журнал worker и раздел «Текущие генерации».</p>
        <Link href="/admin/generations" className="mt-4 inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Открыть очередь генераций</Link>
      </div>
    </section>
  );
}