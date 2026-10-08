"use client";

import React, { useState, useEffect } from "react";
import { EventItem } from "@/types";
import { formatCzechDate, EVENT_TYPE_CONFIG } from "@/lib/formatters";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
} from "lucide-react";

interface CalendarMonthViewProps {
  events: EventItem[];
  onSelectEvent: (event: EventItem) => void;
}

const CZ_MONTH_NAMES = [
  "Leden",
  "Únor",
  "Březen",
  "Duben",
  "Květen",
  "Červen",
  "Červenec",
  "Srpen",
  "Září",
  "Říjen",
  "Listopad",
  "Prosinec",
];

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  events,
  onSelectEvent,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(2026, 9, 1));
  const [todayStr, setTodayStr] = useState<string>("");

  useEffect(() => {
    const now = new Date();
    setCurrentDate(now);
    setTodayStr(now.toISOString().split("T")[0]);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Build grid days
  // First day of month (0 = Sun, 1 = Mon ... 6 = Sat)
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Convert to Mon=0 ... Sun=6
  let firstDayIndex = firstDay.getDay() - 1;
  if (firstDayIndex === -1) firstDayIndex = 6;

  const daysInMonth = lastDay.getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays: Array<{
    dayNumber: number;
    isCurrentMonth: boolean;
    dateStr: string;
    isToday: boolean;
  }> = [];

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonthDate = new Date(year, month - 1, d);
    const dateStr = prevMonthDate.toISOString().split("T")[0];
    calendarDays.push({
      dayNumber: d,
      isCurrentMonth: false,
      dateStr,
      isToday: dateStr === todayStr,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const thisDate = new Date(year, month, d);
    const dateStr = thisDate.toISOString().split("T")[0];
    calendarDays.push({
      dayNumber: d,
      isCurrentMonth: true,
      dateStr,
      isToday: dateStr === todayStr,
    });
  }

  // Next month leading days to complete grid (42 cells = 6 weeks)
  const remaining = 42 - calendarDays.length;
  for (let d = 1; d <= remaining; d++) {
    const nextMonthDate = new Date(year, month + 1, d);
    const dateStr = nextMonthDate.toISOString().split("T")[0];
    calendarDays.push({
      dayNumber: d,
      isCurrentMonth: false,
      dateStr,
      isToday: dateStr === todayStr,
    });
  }

  // Map events to date strings
  const eventsByDate: Record<string, EventItem[]> = {};
  for (const ev of events) {
    const dateKey = new Date(ev.date).toISOString().split("T")[0];
    if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
    eventsByDate[dateKey].push(ev);
  }

  const weekHeaders = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"];

  return (
    <div className="bg-white dark:bg-[#14183E] rounded-2xl border border-slate-200 dark:border-[#23295C] overflow-hidden shadow-xs">
      {/* Calendar Header Navigation */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#23295C] flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#14183E]">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-[#DDA300]/10 text-[#DDA300]">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {CZ_MONTH_NAMES[month]} {year}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Měsíční kalendář termínů</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-white bg-slate-100 dark:bg-[#0D0F26] hover:bg-slate-200 dark:hover:bg-[#1C2152] border border-slate-200 dark:border-[#2A316E] rounded-xl transition"
          >
            Dnes
          </button>
          <div className="flex items-center border border-slate-200 dark:border-[#2A316E] rounded-xl overflow-hidden bg-slate-50 dark:bg-[#0D0F26]">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-[#1C2152] text-slate-600 dark:text-slate-300 transition"
              title="Předchozí měsíc"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-[#1C2152] text-slate-600 dark:text-slate-300 transition"
              title="Další měsíc"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekday Names Header */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-[#23295C] bg-slate-50 dark:bg-[#0D0F26] text-center text-xs font-bold text-slate-600 dark:text-slate-300">
        {weekHeaders.map((dayName, idx) => (
          <div
            key={dayName}
            className={`py-2.5 px-1 ${idx >= 5 ? "text-slate-400 dark:text-slate-500 bg-slate-100/50 dark:bg-[#0A0C22]" : ""}`}
          >
            <span className="hidden sm:inline">{dayName}</span>
            <span className="sm:hidden">{dayName.slice(0, 2)}</span>
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-[#1F2554]">
        {calendarDays.map((cell, idx) => {
          const dayEvents = eventsByDate[cell.dateStr] || [];
          const isWeekend = idx % 7 === 5 || idx % 7 === 6;

          return (
            <div
              key={cell.dateStr + idx}
              className={`min-h-[90px] sm:min-h-[115px] p-1.5 sm:p-2 transition flex flex-col justify-between ${
                !cell.isCurrentMonth
                  ? "bg-slate-50/50 dark:bg-[#090B1E]/60 text-slate-300 dark:text-slate-600"
                  : isWeekend
                  ? "bg-slate-50/30 dark:bg-[#0E1231]/40 text-slate-600 dark:text-slate-300"
                  : "bg-white dark:bg-[#14183E] text-slate-800 dark:text-white"
              } ${cell.isToday ? "ring-2 ring-[#DDA300] ring-inset dark:bg-[#DDA300]/10" : ""}`}
            >
              {/* Day Number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-mono font-bold w-6 h-6 flex items-center justify-center rounded-lg ${
                    cell.isToday
                      ? "bg-[#DDA300] text-[#0D0F26] shadow-xs"
                      : cell.isCurrentMonth
                      ? "text-slate-800 dark:text-slate-200"
                      : "text-slate-400 dark:text-slate-600"
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 hidden sm:inline">
                    {dayEvents.length} {dayEvents.length === 1 ? "položka" : "položky"}
                  </span>
                )}
              </div>

              {/* Day Events Pills */}
              <div className="space-y-1 overflow-y-auto max-h-[70px] sm:max-h-[85px]">
                {dayEvents.slice(0, 3).map((ev) => {
                  const typeCfg = EVENT_TYPE_CONFIG[ev.type] || EVENT_TYPE_CONFIG.OTHER;
                  return (
                    <button
                      key={ev.id}
                      onClick={() => onSelectEvent(ev)}
                      title={`${ev.title} (${typeCfg.label})`}
                      className="w-full text-left p-1 rounded-md text-[10px] sm:text-xs font-medium border truncate block transition hover:scale-[1.01]"
                      style={{
                        backgroundColor: `${ev.subject?.color || typeCfg.colorHex}22`,
                        borderColor: `${ev.subject?.color || typeCfg.colorHex}55`,
                        color: ev.subject?.color || typeCfg.colorHex,
                      }}
                    >
                      <span className="font-extrabold mr-1 font-mono">
                        {ev.subject?.code || "📌"}
                      </span>
                      <span className="text-slate-800 dark:text-slate-200 truncate">{ev.title}</span>
                    </button>
                  );
                })}

                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-[#DDA300] font-semibold text-center py-0.5">
                    +{dayEvents.length - 3} další
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
