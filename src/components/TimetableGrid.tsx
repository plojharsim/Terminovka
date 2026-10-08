"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ScheduleSlot, Subject, StudentGroup, UserSession } from "@/types";
import {
  PERIOD_TIMES,
  DAY_NAMES,
  getISOWeekNumber,
  getWeekType,
} from "@/lib/timetable";
import { Users, Trash2, Clock, Filter, CalendarDays } from "lucide-react";

interface TimetableGridProps {
  slots: ScheduleSlot[];
  subjects: Subject[];
  groups: StudentGroup[];
  currentUser: UserSession | null;
  selectedGroupIds: string[];
  onOpenGroupModal: () => void;
  onDeleteSlot?: (slotId: string) => void;
  onAddSlotClick?: (day: number, period: number) => void;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  slots,
  subjects,
  groups,
  currentUser,
  selectedGroupIds,
  onOpenGroupModal,
  onDeleteSlot,
  onAddSlotClick,
}) => {
  const [weekFilter, setWeekFilter] = useState<"CURRENT" | "EVEN" | "ODD" | "ALL">("CURRENT");
  const [mounted, setMounted] = useState(false);
  const [todayDate, setTodayDate] = useState<Date>(new Date());

  useEffect(() => {
    setMounted(true);
    setTodayDate(new Date());
  }, []);

  const currentWeekNum = mounted ? getISOWeekNumber(todayDate) : 41;
  const currentWeekType = mounted ? getWeekType(todayDate) : "ODD";

  const days = [1, 2, 3, 4, 5]; // Po, Út, St, Čt, Pá
  // Periods 1 to 10 (as seen in Bakalari schedule)
  const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Active parity filter
  const activeParity =
    weekFilter === "CURRENT" ? currentWeekType : weekFilter;

  // Filter slots by group and week parity
  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      // Group filter (whole-class slots always shown; divided slots shown if in selectedGroupIds)
      if (slot.groupId && !slot.group?.isDefaultAll) {
        if (!selectedGroupIds.includes(slot.groupId)) {
          return false;
        }
      }

      // Week parity filter
      if (activeParity !== "ALL") {
        const slotWeek = slot.weekType || "ALL";
        if (slotWeek !== "ALL" && slotWeek !== "SELF_STUDY" && slotWeek !== activeParity) {
          return false;
        }
      }

      return true;
    });
  }, [slots, selectedGroupIds, activeParity]);

  return (
    <div className="space-y-4">
      {/* Top Filter & Legend bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#131738] p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-[#222752] shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-[#DDA300]" />
            <h2 className="text-base sm:text-lg font-bold text-[#0D0F26] dark:text-white">
              Rozvrh hodin
            </h2>
          </div>

          {/* Current Week Badge */}
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
            <CalendarDays className="w-3.5 h-3.5 text-[#DDA300]" />
            <span>
              {currentWeekNum}. týden (
              <strong className={currentWeekType === "EVEN" ? "text-purple-600 dark:text-purple-400" : "text-teal-600 dark:text-teal-400"}>
                {currentWeekType === "EVEN" ? "Sudý týden" : "Lichý týden"}
              </strong>
              )
            </span>
          </div>
        </div>

        {/* Filters: Week Parity & Group */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Week Parity Toggle */}
          <div className="inline-flex items-center rounded-lg border border-slate-300 dark:border-[#222752] p-0.5 bg-slate-50 dark:bg-[#0D0F26]">
            <button
              onClick={() => setWeekFilter("CURRENT")}
              className={`px-2.5 py-1 rounded-md font-bold transition text-xs ${
                weekFilter === "CURRENT"
                  ? "bg-[#DDA300] text-[#0D0F26] shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Aktuální ({currentWeekType === "EVEN" ? "Sudý" : "Lichý"})
            </button>
            <button
              onClick={() => setWeekFilter("EVEN")}
              className={`px-2 py-1 rounded-md font-bold transition text-xs ${
                weekFilter === "EVEN"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-purple-600"
              }`}
            >
              Sudý (S)
            </button>
            <button
              onClick={() => setWeekFilter("ODD")}
              className={`px-2 py-1 rounded-md font-bold transition text-xs ${
                weekFilter === "ODD"
                  ? "bg-teal-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-teal-600"
              }`}
            >
              Lichý (L)
            </button>
            <button
              onClick={() => setWeekFilter("ALL")}
              className={`px-2 py-1 rounded-md font-bold transition text-xs ${
                weekFilter === "ALL"
                  ? "bg-[#0D0F26] dark:bg-white text-white dark:text-[#0D0F26] shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Všechny
            </button>
          </div>

          {/* Group filter button opening modal */}
          <button
            type="button"
            onClick={onOpenGroupModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-[#222752] bg-slate-50 dark:bg-[#0D0F26] hover:bg-slate-100 dark:hover:bg-[#1C2152] text-slate-800 dark:text-white font-medium text-xs transition"
            title="Nastavit mé studijní skupiny"
          >
            <Users className="w-3.5 h-3.5 text-[#DDA300]" />
            <span>Skupiny:</span>
            <span className="font-bold text-[#DDA300]">
              {selectedGroupIds.length === 0
                ? "Jen třída"
                : selectedGroupIds.length === groups.filter((g) => !g.isDefaultAll).length
                ? "Všechny"
                : `${selectedGroupIds.length} vybr.`}
            </span>
          </button>
        </div>
      </div>

      {/* Timetable Grid: Days as Rows (Po–Pá), Periods 1–10 as Columns — exactly matching Bakaláři format */}
      <div className="bg-white dark:bg-[#131738] rounded-2xl border border-slate-200 dark:border-[#222752] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
            {/* Header: Period Numbers & Times */}
            <div className="grid grid-cols-[100px_repeat(10,minmax(90px,1fr))] border-b border-slate-200 dark:border-[#222752] bg-slate-50 dark:bg-[#0D0F26] text-xs font-bold divide-x divide-slate-200 dark:divide-[#222752]">
              <div className="p-3 text-center text-slate-400 font-mono flex items-center justify-center">
                Den
              </div>
              {periods.map((p) => {
                const t = PERIOD_TIMES[p] || { startTime: "", endTime: "" };
                return (
                  <div key={p} className="p-2 text-center flex flex-col items-center justify-center">
                    <span className="font-extrabold text-[#0D0F26] dark:text-white text-sm font-mono">
                      {p}.
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono leading-tight">
                      {t.startTime} – {t.endTime}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Day Rows: Po až Pá */}
            <div className="divide-y divide-slate-100 dark:divide-[#1E2348]">
              {days.map((day) => (
                <div
                  key={day}
                  className="grid grid-cols-[100px_repeat(10,minmax(90px,1fr))] divide-x divide-slate-100 dark:divide-[#1E2348] min-h-[92px] hover:bg-slate-50/40 dark:hover:bg-white/[0.01] transition"
                >
                  {/* Day label column */}
                  <div className="p-3 bg-slate-50/50 dark:bg-[#0D0F26]/60 flex flex-col items-center justify-center text-center">
                    <span className="font-extrabold text-sm text-[#0D0F26] dark:text-white">
                      {DAY_NAMES[day]}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                      {day === 1 ? "Po" : day === 2 ? "Út" : day === 3 ? "St" : day === 4 ? "Čt" : "Pá"}
                    </span>
                  </div>

                  {/* Period Columns 1 to 10 */}
                  {periods.map((periodNum) => {
                    const daySlots = filteredSlots.filter(
                      (s) => s.dayOfWeek === day && s.period === periodNum
                    );

                    return (
                      <div
                        key={periodNum}
                        className="p-1 flex flex-col gap-1 justify-center relative group/cell"
                      >
                        {daySlots.length === 0 ? (
                          <div className="h-full min-h-[64px] flex items-center justify-center">
                            {currentUser?.role === "ADMIN" && onAddSlotClick && (
                              <button
                                onClick={() => onAddSlotClick(day, periodNum)}
                                className="opacity-0 group-hover/cell:opacity-100 text-[10px] text-[#DDA300] font-semibold px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 transition"
                              >
                                +
                              </button>
                            )}
                          </div>
                        ) : (
                          daySlots.map((slot) => {
                            const isEven = slot.weekType === "EVEN";
                            const isOdd = slot.weekType === "ODD";
                            const isSelfStudy = slot.weekType === "SELF_STUDY";

                            return (
                              <div
                                key={slot.id}
                                className="p-1.5 rounded-lg text-xs relative group/slot border transition-all duration-150 flex flex-col justify-between"
                                style={{
                                  backgroundColor: `${slot.subject.color}15`,
                                  borderColor: `${slot.subject.color}40`,
                                }}
                              >
                                {/* Top row: Code + Room + Parity */}
                                <div className="flex items-center justify-between gap-1 leading-none">
                                  <span
                                    className="font-black font-mono text-xs"
                                    style={{ color: slot.subject.color }}
                                  >
                                    {slot.subject.code}
                                  </span>

                                  <div className="flex items-center space-x-1 shrink-0">
                                    {isSelfStudy && (
                                      <span
                                        className="px-1 py-0.5 rounded text-[8px] font-black uppercase bg-amber-500 text-[#0D0F26] leading-none"
                                        title="Samostudium"
                                      >
                                        S
                                      </span>
                                    )}
                                    {isEven && (
                                      <span
                                        className="px-1 py-0.5 rounded text-[8px] font-black uppercase bg-purple-600 text-white leading-none"
                                        title="Sudý týden"
                                      >
                                        S
                                      </span>
                                    )}
                                    {isOdd && (
                                      <span
                                        className="px-1 py-0.5 rounded text-[8px] font-black uppercase bg-teal-600 text-white leading-none"
                                        title="Lichý týden"
                                      >
                                        L
                                      </span>
                                    )}
                                    {slot.room && (
                                      <span className="text-[9px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-white/90 dark:bg-[#0D0F26]/90 px-1 py-0.5 rounded leading-none border border-black/5 dark:border-white/10">
                                        {slot.room}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Subject Name (truncated) */}
                                <div className="text-[10px] font-semibold text-slate-800 dark:text-slate-200 truncate mt-1 leading-tight">
                                  {slot.subject.name}
                                </div>

                                {/* Bottom: Teacher & Group (shortened) */}
                                <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400 mt-1 leading-none">
                                  <span className="font-mono truncate">
                                    {slot.subject.teacher || ""}
                                  </span>
                                  {slot.group && !slot.group.isDefaultAll && (
                                    <span className="text-[#DDA300] font-bold truncate ml-1">
                                      {slot.group.code}
                                    </span>
                                  )}
                                </div>

                                {currentUser?.role === "ADMIN" && onDeleteSlot && (
                                  <button
                                    onClick={() => onDeleteSlot(slot.id)}
                                    title="Smazat tuto hodinu"
                                    className="absolute top-0.5 right-0.5 p-0.5 bg-white dark:bg-[#0D0F26] text-rose-500 hover:text-rose-400 rounded opacity-0 group-hover/slot:opacity-100 transition shadow-xs"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
