"use client";

import { useEffect, useState } from "react";
import type { TokenPackage } from "@/lib/api";
import { centsToRubValue, parseRubToCentsOrZero } from "@/lib/money";

export type TokenPackageFormValues = {
  id: string;
  name: string;
  tokens: number;
  price_rub: string;
  sort_order: number;
  is_active: boolean;
};

function packageToFormValues(pkg?: TokenPackage): TokenPackageFormValues {
  if (!pkg) {
    return {
      id: "",
      name: "",
      tokens: 100,
      price_rub: "",
      sort_order: 0,
      is_active: true,
    };
  }
  return {
    id: pkg.id,
    name: pkg.name,
    tokens: pkg.tokens,
    price_rub: centsToRubValue(pkg.price_cents),
    sort_order: pkg.sort_order,
    is_active: pkg.is_active,
  };
}

export { packageToFormValues };

export function TokenPackageEditorModal({
  open,
  mode,
  initial,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial?: TokenPackage;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: TokenPackageFormValues) => void;
}) {
  const [values, setValues] = useState<TokenPackageFormValues>(() => packageToFormValues(initial));

  useEffect(() => {
    if (open) setValues(packageToFormValues(initial));
  }, [open, initial]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-text">
          {mode === "create" ? "Новый пакет" : "Редактировать пакет"}
        </h2>
        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="text-muted">ID (slug)</span>
            <input
              value={values.id}
              disabled={mode === "edit"}
              onChange={(e) => setValues((v) => ({ ...v, id: e.target.value }))}
              className="mt-1 w-full rounded-md border border-border px-3 py-2"
              placeholder="pack_150"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Название</span>
            <input
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              className="mt-1 w-full rounded-md border border-border px-3 py-2"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-muted">Токены</span>
              <input
                type="number"
                min={1}
                value={values.tokens}
                onChange={(e) => setValues((v) => ({ ...v, tokens: Number(e.target.value) }))}
                className="mt-1 w-full rounded-md border border-border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Цена, ₽</span>
              <input
                type="number"
                min={1}
                step={1}
                value={values.price_rub}
                onChange={(e) => setValues((v) => ({ ...v, price_rub: e.target.value }))}
                className="mt-1 w-full rounded-md border border-border px-3 py-2"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-muted">Порядок сортировки</span>
            <input
              type="number"
              value={values.sort_order}
              onChange={(e) => setValues((v) => ({ ...v, sort_order: Number(e.target.value) }))}
              className="mt-1 w-full rounded-md border border-border px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.is_active}
              onChange={(e) => setValues((v) => ({ ...v, is_active: e.target.checked }))}
            />
            Активен (виден пользователям)
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-zinc-50"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onSubmit(values)}
            className="rounded-md bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
