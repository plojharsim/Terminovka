"use client";

import React from "react";
import { StudentGroup } from "@/types";
import { X, Users, Check, ShieldCheck, Sparkles } from "lucide-react";

interface GroupSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: StudentGroup[];
  selectedGroupIds: string[];
  onToggleGroup: (groupId: string) => void;
  onSelectAll: () => void;
  onClearDivided: () => void;
}

export const GroupSelectionModal: React.FC<GroupSelectionModalProps> = ({
  isOpen,
  onClose,
  groups,
  selectedGroupIds,
  onToggleGroup,
  onSelectAll,
  onClearDivided,
}) => {
  if (!isOpen) return null;

  const dividedGroups = groups.filter((g) => !g.isDefaultAll);
  const isAllDividedSelected =
    dividedGroups.length > 0 &&
    dividedGroups.every((g) => selectedGroupIds.includes(g.id));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-md bg-white dark:bg-[#131738] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-[#23295C] overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#1F2554] flex items-center justify-between bg-slate-50 dark:bg-[#0D0F26] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#DDA300]/15 flex items-center justify-center text-[#DDA300]">
              <Users className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Moje studijní skupiny
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Nastavení zobrazení rozvrhu a termínů
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#1C2152] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Zaškrtněte všechny skupiny, do kterých chodíte (např. své jazykové nebo tělocvičné skupiny).
            Společné hodiny celé třídy uvidíte vždy.
          </p>

          {/* Quick presets */}
          <div className="flex items-center justify-between text-xs pt-1 border-b border-slate-100 dark:border-[#1F2554] pb-2.5">
            <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
              Dělené skupiny
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onSelectAll}
                className="text-xs font-bold text-[#DDA300] hover:underline"
              >
                Všechny
              </button>
              <span className="text-slate-400">·</span>
              <button
                type="button"
                onClick={onClearDivided}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Jen celá třída
              </button>
            </div>
          </div>

          {/* Groups list by category */}
          <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
            {/* Whole class - always active */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-[#222752] bg-slate-50/70 dark:bg-white/[0.03] flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Celá třída
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Společné předměty a celotřídní termíny
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Vždy aktivní
              </span>
            </div>

            {/* Helper to render a group of options */}
            {[
              {
                title: "1. Poloviny třídy (Hardware, Dílny, TEV)",
                filter: (g: StudentGroup) => ["SK1", "SK2"].includes(g.code),
              },
              {
                title: "2. Matematické skupiny (M)",
                filter: (g: StudentGroup) => ["1ITK", "2ITK", "3ITK", "4ITK", "5ITK"].includes(g.code),
              },
              {
                title: "3. Druhý cizí jazyk",
                filter: (g: StudentGroup) => ["NEM", "FRJ1"].includes(g.code),
              },
              {
                title: "4. Programování a vývoj (PCV, PVA)",
                filter: (g: StudentGroup) => g.code.startsWith("PCV") || g.code.startsWith("PVA"),
              },
              {
                title: "5. Anglický jazyk (skupiny dle vyučujícího)",
                filter: (g: StudentGroup) => g.code.startsWith("ANG_"),
              },
              {
                title: "Ostatní skupiny",
                filter: (g: StudentGroup) =>
                  !["SK1", "SK2", "1ITK", "2ITK", "3ITK", "4ITK", "5ITK", "NEM", "FRJ1"].includes(g.code) &&
                  !g.code.startsWith("PCV") &&
                  !g.code.startsWith("PVA") &&
                  !g.code.startsWith("ANG_") &&
                  !g.isDefaultAll,
              },
            ]
              .filter((cat) => dividedGroups.some(cat.filter))
              .map((cat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="text-[11px] font-bold text-[#DDA300] tracking-wide uppercase px-0.5">
                    {cat.title}
                  </div>
                  <div className="space-y-1.5">
                    {dividedGroups.filter(cat.filter).map((grp) => {
                      const isChecked = selectedGroupIds.includes(grp.id);
                      return (
                        <label
                          key={grp.id}
                          onClick={() => onToggleGroup(grp.id)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
                            isChecked
                              ? "bg-[#DDA300]/10 border-[#DDA300] dark:bg-[#DDA300]/15"
                              : "bg-white dark:bg-[#0D0F26] border-slate-200 dark:border-[#222752] hover:border-slate-300 dark:hover:border-slate-600"
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <div
                              className={`w-4 h-4 rounded-md flex items-center justify-center transition shrink-0 ${
                                isChecked
                                  ? "bg-[#DDA300] text-[#0D0F26]"
                                  : "border border-slate-300 dark:border-slate-600 bg-transparent"
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                {grp.name}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                Kód: {grp.code}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                              isChecked
                                ? "bg-[#DDA300]/20 text-[#DDA300]"
                                : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {isChecked ? "Zvoleno" : "Nezvoleno"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>

          <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-300 flex items-start space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-[#DDA300] shrink-0 mt-0.5" />
            <span>
              Vaše nastavení se automaticky ukládá do tohoto prohlížeče. Není nutné se přihlašovat ani volbu opakovat na jiných stránkách.
            </span>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="p-4 bg-slate-50 dark:bg-[#0D0F26] border-t border-slate-200 dark:border-[#1F2554] flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#DDA300] hover:bg-[#c99500] text-[#0D0F26] font-bold text-xs shadow-md transition"
          >
            Hotovo, uložit
          </button>
        </div>
      </div>
    </div>
  );
};
