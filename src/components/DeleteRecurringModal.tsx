"use client";

import React, { useState } from "react";
import { EventItem } from "@/types";
import { formatCzechDate } from "@/lib/formatters";
import { X, Trash2, Repeat, Calendar, AlertTriangle, Loader2 } from "lucide-react";

interface DeleteRecurringModalProps {
  isOpen: boolean;
  event: EventItem | null;
  onClose: () => void;
  onConfirm: (scope: "single" | "following" | "all") => Promise<void>;
}

export const DeleteRecurringModal: React.FC<DeleteRecurringModalProps> = ({
  isOpen,
  event,
  onClose,
  onConfirm,
}) => {
  const [scope, setScope] = useState<"single" | "following" | "all">("single");
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !event) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(scope);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#131738] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#23295C] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#1F2554] flex items-center justify-between bg-slate-50 dark:bg-[#0D0F26]">
          <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
            <Trash2 className="w-5 h-5 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Smazat opakovanou událost
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#1C2152] transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0D0F26] border border-slate-200 dark:border-[#23295C]">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              <Repeat className="w-3.5 h-3.5 text-[#DDA300]" />
              <span>Opakovaná série</span>
              <span>·</span>
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatCzechDate(event.date)}</span>
            </div>
            <h3 className="font-extrabold text-sm sm:text-base text-[#0D0F26] dark:text-white">
              {event.title}
            </h3>
            {event.subject && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Předmět: {event.subject.name} ({event.subject.code})
              </p>
            )}
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            Tato událost je součástí opakující se série. Zvolte rozsah smazání:
          </p>

          <div className="space-y-2.5">
            {/* Option 1: Just this one */}
            <label
              onClick={() => setScope("single")}
              className={`flex items-start p-3.5 rounded-xl border cursor-pointer transition ${
                scope === "single"
                  ? "border-[#DDA300] bg-amber-500/10 dark:bg-[#DDA300]/10"
                  : "border-slate-200 dark:border-[#23295C] hover:bg-slate-50 dark:hover:bg-[#1A1F4C]"
              }`}
            >
              <input
                type="radio"
                name="deleteScope"
                checked={scope === "single"}
                onChange={() => setScope("single")}
                className="mt-0.5 text-[#DDA300] focus:ring-[#DDA300]"
              />
              <div className="ml-3">
                <span className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Pouze tuto událost
                </span>
                <span className="block text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Smaže pouze termín dne {formatCzechDate(event.date)}. Ostatní termíny v sérii zůstanou zachovány.
                </span>
              </div>
            </label>

            {/* Option 2: This and following */}
            <label
              onClick={() => setScope("following")}
              className={`flex items-start p-3.5 rounded-xl border cursor-pointer transition ${
                scope === "following"
                  ? "border-[#DDA300] bg-amber-500/10 dark:bg-[#DDA300]/10"
                  : "border-slate-200 dark:border-[#23295C] hover:bg-slate-50 dark:hover:bg-[#1A1F4C]"
              }`}
            >
              <input
                type="radio"
                name="deleteScope"
                checked={scope === "following"}
                onChange={() => setScope("following")}
                className="mt-0.5 text-[#DDA300] focus:ring-[#DDA300]"
              />
              <div className="ml-3">
                <span className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Tuto a všechny budoucí události
                </span>
                <span className="block text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Smaže tento termín a všechny po něm následující. Dřívější termíny v minulosti zůstanou.
                </span>
              </div>
            </label>

            {/* Option 3: All */}
            <label
              onClick={() => setScope("all")}
              className={`flex items-start p-3.5 rounded-xl border cursor-pointer transition ${
                scope === "all"
                  ? "border-[#DDA300] bg-amber-500/10 dark:bg-[#DDA300]/10"
                  : "border-slate-200 dark:border-[#23295C] hover:bg-slate-50 dark:hover:bg-[#1A1F4C]"
              }`}
            >
              <input
                type="radio"
                name="deleteScope"
                checked={scope === "all"}
                onChange={() => setScope("all")}
                className="mt-0.5 text-[#DDA300] focus:ring-[#DDA300]"
              />
              <div className="ml-3">
                <span className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Všechny události v celé sérii
                </span>
                <span className="block text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Smaže úplně všechny události z této série (minulé i budoucí).
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-[#1F2554] flex items-center justify-end space-x-2.5 bg-slate-50 dark:bg-[#0D0F26]">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-[#2A316E] bg-white dark:bg-[#131738] text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1C2152] transition disabled:opacity-50"
          >
            Zrušit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-xs transition active:scale-[0.98] disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mazání...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Smazat</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
