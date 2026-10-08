"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  EventItem,
  Subject,
  StudentGroup,
  ScheduleSlot,
  UserSession,
  EventType,
} from "@/types";
import {
  formatCzechDate,
  formatCzechDateShort,
  getRelativeTimeCzech,
  EVENT_TYPE_CONFIG,
  getCzechVocative,
  formatHoursCount,
  formatActiveEventsSentence,
  formatUpcomingTermsCount,
} from "@/lib/formatters";
import {
  PERIOD_TIMES,
  DAY_NAMES,
  CZECH_DAYS,
  getISOWeekNumber,
  getWeekType,
} from "@/lib/timetable";
import {
  Clock,
  CalendarCheck,
  Plus,
  ArrowRight,
  Flame,
  CheckCircle2,
  Calendar,
  BookOpen,
  Users,
  Settings,
  Sparkles,
  ChevronRight,
  ListTodo,
  ExternalLink,
  Edit2,
  Trash2,
} from "lucide-react";

interface DashboardViewProps {
  events: EventItem[];
  subjects: Subject[];
  groups: StudentGroup[];
  slots: ScheduleSlot[];
  currentUser: UserSession | null;
  selectedGroupIds: string[];
  onOpenGroupModal: () => void;
  onNavigateTab: (tab: "list" | "calendar" | "timetable", filterType?: string) => void;
  onOpenCreateEvent: () => void;
  onOpenIcalModal: () => void;
  onOpenAdminPanel: () => void;
  onEditEvent: (event: EventItem) => void;
  onDeleteEvent: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  events,
  subjects,
  groups,
  slots,
  currentUser,
  selectedGroupIds,
  onOpenGroupModal,
  onNavigateTab,
  onOpenCreateEvent,
  onOpenIcalModal,
  onOpenAdminPanel,
  onEditEvent,
  onDeleteEvent,
}) => {
  // Client-side date to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  const [todayDate, setTodayDate] = useState<Date>(new Date());

  useEffect(() => {
    setMounted(true);
    setTodayDate(new Date());
  }, []);

  // Today Day of week (0 = Sunday, 1 = Monday, ... 6 = Saturday)
  const dayOfWeekJs = mounted ? todayDate.getDay() : 1;
  const isWeekend = dayOfWeekJs === 0 || dayOfWeekJs === 6;

  // For timetable display on weekend, show Monday (1)
  const timetableDayToShow = isWeekend ? 1 : dayOfWeekJs;

  // Week parity calculation
  const currentWeekNum = mounted ? getISOWeekNumber(todayDate) : 1;
  const currentWeekType = mounted ? getWeekType(todayDate) : "ODD";

  // Filter today's timetable slots (taking week parity and multi-group selection into account)
  const todaySlots = useMemo(() => {
    return slots
      .filter((s) => s.dayOfWeek === timetableDayToShow)
      .filter((s) => {
        const slotWeek = s.weekType || "ALL";
        return slotWeek === "ALL" || slotWeek === "SELF_STUDY" || slotWeek === currentWeekType;
      })
      .filter((s) => {
        // Whole-class slots are always shown
        if (!s.groupId || s.group?.isDefaultAll) return true;
        // Divided group slots: shown only if student is in that group
        return selectedGroupIds.includes(s.groupId);
      })
      .sort((a, b) => a.period - b.period);
  }, [slots, timetableDayToShow, currentWeekType, selectedGroupIds]);

  // Upcoming events sorted by date
  const upcomingEvents = useMemo(() => {
    if (!mounted) return [];
    const startOfToday = new Date(todayDate);
    startOfToday.setHours(0, 0, 0, 0);

    return events
      .filter((ev) => {
        const evDate = new Date(ev.date);
        evDate.setHours(0, 0, 0, 0);
        return evDate >= startOfToday;
      })
      .filter((ev) => {
        if (!ev.groupId || ev.group?.isDefaultAll) return true;
        return selectedGroupIds.includes(ev.groupId);
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, todayDate, selectedGroupIds, mounted]);

  // Next urgent events (up to 5)
  const nextEvents = useMemo(() => {
    return upcomingEvents.slice(0, 5);
  }, [upcomingEvents]);

  // Today's events specifically
  const todayEvents = useMemo(() => {
    if (!mounted) return [];
    const todayStr = todayDate.toISOString().split("T")[0];
    return events.filter((ev) => {
      const evDate = new Date(ev.date).toISOString().split("T")[0];
      return evDate === todayStr;
    });
  }, [events, todayDate, mounted]);

  // Current School Week days (Monday to Friday)
  const weekDays = useMemo(() => {
    if (!mounted) return [];
    const curr = new Date(todayDate);
    // Find Monday of current week
    const currentDay = curr.getDay(); // 0 is Sunday
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const daysList = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];

      // Find events for this day
      const dayEvs = events.filter((e) => {
        const eStr = new Date(e.date).toISOString().split("T")[0];
        return eStr === dateStr;
      });

      // Find timetable slot count
      const slotCount = slots.filter((s) => s.dayOfWeek === i + 1).length;

      const isCurrentDay =
        mounted &&
        d.getDate() === todayDate.getDate() &&
        d.getMonth() === todayDate.getMonth() &&
        d.getFullYear() === todayDate.getFullYear();

      daysList.push({
        date: d,
        dateStr,
        dayNumber: i + 1,
        dayName: DAY_NAMES[i + 1],
        shortName: ["Po", "Út", "St", "Čt", "Pá"][i],
        events: dayEvs,
        slotCount,
        isToday: isCurrentDay,
      });
    }
    return daysList;
  }, [todayDate, events, slots, mounted]);

  // Stats
  const stats = useMemo(() => {
    return {
      tests: upcomingEvents.filter((e) => e.type === "TEST").length,
      homeworks: upcomingEvents.filter((e) => e.type === "HOMEWORK" || e.type === "DEADLINE").length,
      other: upcomingEvents.filter((e) => e.type === "OTHER").length,
      total: upcomingEvents.length,
    };
  }, [upcomingEvents]);

  // Find if a timetable slot has an event on the active day
  const getSlotEventWarning = (periodNum: number, subjectId: string) => {
    if (!mounted) return null;
    const activeDate = isWeekend
      ? weekDays[0]?.dateStr // Monday if weekend
      : todayDate.toISOString().split("T")[0];

    const slotEvents = events.filter((e) => {
      const eDate = new Date(e.date).toISOString().split("T")[0];
      if (eDate !== activeDate) return false;
      if (e.period === periodNum) return true;
      if (e.subjectId === subjectId) return true;
      return false;
    });

    if (slotEvents.length === 0) return null;

    const testEvent = slotEvents.find((e) => e.type === "TEST");
    if (testEvent) return { type: "TEST", title: testEvent.title };

    const hwEvent = slotEvents.find((e) => e.type === "HOMEWORK");
    if (hwEvent) return { type: "HOMEWORK", title: hwEvent.title };

    return { type: slotEvents[0].type, title: slotEvents[0].title };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. HERO GREETING & DATE BAR */}
      <div className="bg-white dark:bg-[#131738] rounded-2xl border border-slate-200 dark:border-[#222752] p-6 sm:p-8 shadow-xs relative overflow-hidden">
        {/* Subtle decorative gold glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#DDA300]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span className="text-[#DDA300] font-black text-base">|</span>
              <span>
                {mounted
                  ? `${CZECH_DAYS[dayOfWeekJs]}, ${formatCzechDate(todayDate)}`
                  : "Dnešní přehled třídy"}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-[10px] tracking-normal normal-case">
                {currentWeekNum}. týden ({currentWeekType === "EVEN" ? "Sudý" : "Lichý"})
              </span>
              {isWeekend && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] normal-case">
                  Víkendové volno
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0D0F26] dark:text-white tracking-tight">
              {currentUser ? `Ahoj, ${getCzechVocative(currentUser.name)}!` : "Přehled třídy"}
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              {isWeekend ? (
                <>
                  Dnes škola není. V pondělí vás čeká{" "}
                  <strong className="text-[#0D0F26] dark:text-white">
                    {formatHoursCount(slots.filter((s) => s.dayOfWeek === 1).length)}
                  </strong>{" "}
                  a celkem{" "}
                  <strong className="text-[#0D0F26] dark:text-white">
                    {formatUpcomingTermsCount(stats.total)}
                  </strong>
                  .
                </>
              ) : (
                <>
                  Dnes máte v rozvrhu{" "}
                  <strong className="text-[#0D0F26] dark:text-white">
                    {formatHoursCount(todaySlots.length)}
                  </strong>
                  {todayEvents.length > 0 ? (
                    <>
                      {" "}
                      a{" "}
                      <strong className="text-rose-600 dark:text-rose-400">
                        {formatActiveEventsSentence(todayEvents.length)}
                      </strong>
                    </>
                  ) : (
                    <> a na dnešek nejsou nahlášeny žádné písemky ani úkoly</>
                  )}
                  .
                </>
              )}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Multi-group manager button */}
            {groups.length > 1 && (
              <button
                type="button"
                onClick={onOpenGroupModal}
                className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-[#222752] bg-slate-50 dark:bg-[#0D0F26] text-slate-800 dark:text-white text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-[#1E2348] transition shadow-xs"
                title="Upravit mé skupiny"
              >
                <Users className="w-4 h-4 text-[#DDA300]" />
                <span>Moje skupiny:</span>
                <span className="font-bold text-[#DDA300]">
                  {selectedGroupIds.length === 0
                    ? "Celá třída"
                    : selectedGroupIds.length === groups.filter((g) => !g.isDefaultAll).length
                    ? "Všechny"
                    : `${selectedGroupIds.length} vybr.`}
                </span>
              </button>
            )}

            <button
              onClick={onOpenIcalModal}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-[#222752] bg-white dark:bg-[#131738] text-slate-800 dark:text-white text-xs sm:text-sm font-bold hover:bg-slate-50 dark:hover:bg-[#1A1F4C] transition shadow-xs"
            >
              <CalendarCheck className="w-4 h-4 text-[#DDA300]" />
              <span>Odebírat iCal</span>
            </button>

            {currentUser && (
              <button
                onClick={onOpenCreateEvent}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#0D0F26] dark:bg-white text-white dark:text-[#0D0F26] text-xs sm:text-sm font-bold hover:opacity-90 transition active:scale-[0.98] shadow-xs"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Přidat termín</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. STATS TILES (Clickable quick filters) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Tests Tile */}
        <div
          onClick={() => onNavigateTab("list", "TEST")}
          className="cursor-pointer group bg-white dark:bg-[#131738] rounded-xl border border-slate-200 dark:border-[#222752] p-4 sm:p-5 hover:border-rose-500/50 dark:hover:border-rose-500/50 transition-all duration-150 shadow-xs hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-rose-600 transition">
              Nadcházející písemky
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
              {stats.tests}
            </span>
            <span className="text-[11px] font-semibold text-slate-400 flex items-center group-hover:text-rose-600 transition">
              Zobrazit <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>

        {/* Homework Tile */}
        <div
          onClick={() => onNavigateTab("list", "HOMEWORK")}
          className="cursor-pointer group bg-white dark:bg-[#131738] rounded-xl border border-slate-200 dark:border-[#222752] p-4 sm:p-5 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all duration-150 shadow-xs hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 transition">
              Úkoly
            </span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
              {stats.homeworks}
            </span>
            <span className="text-[11px] font-semibold text-slate-400 flex items-center group-hover:text-blue-600 transition">
              Zobrazit <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>

        {/* Total Upcoming Tile */}
        <div
          onClick={() => onNavigateTab("list", "ALL")}
          className="cursor-pointer group bg-white dark:bg-[#131738] rounded-xl border border-slate-200 dark:border-[#222752] p-4 sm:p-5 hover:border-slate-400 dark:hover:border-slate-400 transition-all duration-150 shadow-xs hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-[#0D0F26] dark:group-hover:text-white transition">
              Celkem v agendě
            </span>
            <ListTodo className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-[#0D0F26] dark:text-white">
              {stats.total}
            </span>
            <span className="text-[11px] font-semibold text-slate-400 flex items-center group-hover:text-[#0D0F26] dark:group-hover:text-white transition">
              Agenda <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>
      </div>

      {/* 3. MAIN TWO-COLUMN SECTION: (Left: Today Schedule / Right: Urgent Events) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* LEFT COLUMN: TODAY'S TIMETABLE (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#1E2348]">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#DDA300]" />
              <h3 className="font-bold text-base text-[#0D0F26] dark:text-white">
                {isWeekend ? "Pondělní rozvrh" : "Dnešní rozvrh"}
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab("timetable")}
              className="text-xs font-bold text-[#DDA300] hover:underline flex items-center"
            >
              Celý rozvrh <ChevronRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>

          <div className="bg-white dark:bg-[#131738] rounded-xl border border-slate-200 dark:border-[#222752] divide-y divide-slate-100 dark:divide-[#1E2348] overflow-hidden shadow-xs">
            {todaySlots.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto text-slate-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0D0F26] dark:text-white">
                    Žádné hodiny v rozvrhu
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                    {slots.length === 0
                      ? "Rozvrh třídy 1.B zatím nebyl v administraci nastaven."
                      : "Na tento den nemá třída zadanou žádnou výuku."}
                  </p>
                </div>
                {currentUser?.role === "ADMIN" && (
                  <button
                    onClick={onOpenAdminPanel}
                    className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-xs font-bold text-[#0D0F26] dark:text-white hover:bg-slate-200 transition"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#DDA300]" />
                    <span>Nastavit rozvrh</span>
                  </button>
                )}
              </div>
            ) : (
              todaySlots.map((slot) => {
                const time = PERIOD_TIMES[slot.period] || {
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                };
                const warning = getSlotEventWarning(slot.period, slot.subjectId);

                return (
                  <div
                    key={slot.id}
                    className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-white/5 transition"
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      {/* Period Badge */}
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10 flex flex-col items-center justify-center shrink-0">
                        <span className="font-mono font-bold text-xs text-[#0D0F26] dark:text-white">
                          {slot.period}.
                        </span>
                      </div>

                      {/* Subject & Classroom */}
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: slot.subject.color }}
                          />
                          <span className="font-bold text-xs sm:text-sm text-[#0D0F26] dark:text-white truncate">
                            {slot.subject.name}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400 shrink-0">
                            ({slot.subject.code})
                          </span>
                          {slot.weekType === "SELF_STUDY" && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                              Samostudium
                            </span>
                          )}
                          {slot.weekType === "EVEN" && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                              Sudý
                            </span>
                          )}
                          {slot.weekType === "ODD" && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                              Lichý
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {slot.room && (
                            <span className="font-mono bg-slate-100 dark:bg-white/10 px-1.5 py-0.2 rounded text-[10px]">
                              uč. {slot.room}
                            </span>
                          )}
                          {slot.group && !slot.group.isDefaultAll && (
                            <span className="text-[#DDA300] font-medium">
                              {slot.group.name}
                            </span>
                          )}
                          {slot.subject.teacher && (
                            <span className="truncate">{slot.subject.teacher}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Time & Potential Test Warning */}
                    <div className="text-right shrink-0 pl-2">
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {time.startTime} – {time.endTime}
                      </div>

                      {warning && (
                        <div className="mt-1">
                          <span
                            className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              warning.type === "TEST"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                            }`}
                          >
                            <Flame className="w-2.5 h-2.5" />
                            <span>
                              {warning.type === "TEST" ? "Písemka!" : "Úkol"}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CO HOŘÍ & NEJBLIŽŠÍ TERMÍNY (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#1E2348]">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-rose-500" />
              <h3 className="font-bold text-base text-[#0D0F26] dark:text-white">
                Co se blíží & deadliny
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab("list")}
              className="text-xs font-bold text-[#DDA300] hover:underline flex items-center"
            >
              Vše v Agendě ({upcomingEvents.length}){" "}
              <ChevronRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>

          <div className="space-y-3">
            {nextEvents.length === 0 ? (
              <div className="bg-white dark:bg-[#131738] rounded-xl border border-slate-200 dark:border-[#222752] p-8 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-[#DDA300]" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#0D0F26] dark:text-white">
                    Žádné blížící se termíny
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    Všechny zadané písemky a úkoly jsou hotové nebo zatím nebyly přidány.
                  </p>
                </div>
                {currentUser && (
                  <button
                    onClick={onOpenCreateEvent}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#0D0F26] dark:bg-white text-white dark:text-[#0D0F26] text-xs font-bold hover:opacity-90 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Zadat nový termín</span>
                  </button>
                )}
              </div>
            ) : (
              nextEvents.map((ev) => {
                const typeConfig =
                  EVENT_TYPE_CONFIG[ev.type] || EVENT_TYPE_CONFIG.OTHER;
                const relative = getRelativeTimeCzech(ev.date);
                const canManage =
                  currentUser &&
                  (currentUser.role === "ADMIN" ||
                    currentUser.userId === ev.createdById);

                return (
                  <div
                    key={ev.id}
                    className="bg-white dark:bg-[#131738] rounded-xl border border-slate-200 dark:border-[#222752] p-4 sm:p-5 hover:border-slate-400 dark:hover:border-[#DDA300]/60 transition-all duration-150 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Subject */}
                        {ev.subject ? (
                          <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: ev.subject.color }}
                            />
                            <span>{ev.subject.name}</span>
                            <span className="font-mono text-slate-400 text-[10px]">
                              ({ev.subject.code})
                            </span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                            Bez předmětu
                          </span>
                        )}

                        {/* Type Badge */}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                            ev.type === "TEST"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                              : ev.type === "HOMEWORK"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                              : ev.type === "DEADLINE"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {typeConfig.label}
                        </span>

                        {/* Group badge if not whole class */}
                        {ev.group && !ev.group.isDefaultAll && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                            <Users className="w-2.5 h-2.5 text-[#DDA300]" />
                            <span>{ev.group.name}</span>
                          </span>
                        )}

                        {/* Weight badge if set */}
                        {ev.weight != null && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300">
                            Váha {ev.weight}
                          </span>
                        )}
                      </div>

                      {/* Event Title */}
                      <h4 className="font-extrabold text-sm sm:text-base text-[#0D0F26] dark:text-white tracking-tight">
                        {ev.title}
                      </h4>

                      {/* Description preview */}
                      {ev.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                          {ev.description}
                        </p>
                      )}
                    </div>

                    {/* Right Meta: Date & Urgency Countdown */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-[#1E2348]">
                      <span
                        className={`text-xs font-black ${
                          relative.isUrgent
                            ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded"
                            : "text-[#0D0F26] dark:text-white font-bold"
                        }`}
                      >
                        {relative.text}
                      </span>

                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                        {formatCzechDateShort(ev.date)}
                        {ev.period && ` · ${ev.period}. hod.`}
                      </span>

                      {/* Quick action buttons for authorized users */}
                      {canManage && (
                        <div className="flex items-center space-x-2 mt-1 sm:mt-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => onEditEvent(ev)}
                            title="Upravit termín"
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteEvent(ev.id)}
                            title="Smazat termín"
                            className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-white/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 4. TÝDENNÍ PŘEHLED 1.B (Pondělí - Pátek) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#1E2348]">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-[#DDA300]" />
            <h3 className="font-bold text-base text-[#0D0F26] dark:text-white">
              Tento týden
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab("calendar")}
            className="text-xs font-bold text-[#DDA300] hover:underline flex items-center"
          >
            Měsíční kalendář <ChevronRight className="w-3 h-3 ml-0.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {weekDays.map((day) => {
            return (
              <div
                key={day.dayNumber}
                onClick={() => onNavigateTab("calendar")}
                className={`cursor-pointer rounded-xl p-4 border transition-all duration-150 flex flex-col justify-between min-h-[140px] shadow-xs hover:shadow-md ${
                  day.isToday
                    ? "bg-white dark:bg-[#161A42] border-[#DDA300] ring-1 ring-[#DDA300]"
                    : "bg-white dark:bg-[#131738] border-slate-200 dark:border-[#222752] hover:border-slate-400 dark:hover:border-slate-500"
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {day.dayName}
                    </span>
                    <div className="text-base font-extrabold text-[#0D0F26] dark:text-white font-mono mt-0.5">
                      {day.date.getDate()}. {day.date.getMonth() + 1}.
                    </div>
                  </div>

                  {day.isToday && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#DDA300] text-[#0D0F26]">
                      Dnes
                    </span>
                  )}
                </div>

                {/* Day Content: Events pills */}
                <div className="my-3 space-y-1.5">
                  {day.events.length === 0 ? (
                    <div className="text-[11px] text-slate-400 italic">
                      Bez termínů
                    </div>
                  ) : (
                    day.events.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        className="text-[11px] truncate flex items-center space-x-1 font-semibold text-slate-700 dark:text-slate-200"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            e.type === "TEST"
                              ? "bg-rose-500"
                              : e.type === "HOMEWORK"
                              ? "bg-blue-500"
                              : e.type === "DEADLINE"
                              ? "bg-[#DDA300]"
                              : "bg-slate-400"
                          }`}
                        />
                        <span className="truncate">{e.title}</span>
                      </div>
                    ))
                  )}

                  {day.events.length > 3 && (
                    <div className="text-[10px] text-slate-400 font-semibold">
                      +{day.events.length - 3} další
                    </div>
                  )}
                </div>

                {/* Day Footer: Timetable slot count */}
                <div className="pt-2 border-t border-slate-100 dark:border-[#1E2348] text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>{day.slotCount} hod. v rozvrhu</span>
                  <span className="text-[#DDA300] font-bold">
                    {day.events.length} {day.events.length === 1 ? "termín" : "termíny"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. BOTTOM CARDS: iCal Sync & Administration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2">
        {/* iCal Subscription Card */}
        <div className="bg-white dark:bg-[#131738] rounded-xl border border-slate-200 dark:border-[#222752] p-5 sm:p-6 flex flex-col justify-between shadow-xs">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-lg bg-[#DDA300]/10 text-[#DDA300] flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-base text-[#0D0F26] dark:text-white">
              Mobilní kalendář (iCal feed)
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Měj všechny písemky a úkoly synchronizované přímo v iPhonu (Apple Kalendář), Google Kalendáři nebo Outlooku. Vše se aktualizuje samo.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-[#1E2348]">
            <button
              onClick={onOpenIcalModal}
              className="inline-flex items-center space-x-1.5 text-xs sm:text-sm font-bold text-[#DDA300] hover:underline"
            >
              <span>Nastavit synchronizaci pro tvé skupiny</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>

        {/* Class Portal & Timetable Card */}
        <div className="bg-white dark:bg-[#131738] rounded-xl border border-slate-200 dark:border-[#222752] p-5 sm:p-6 flex flex-col justify-between shadow-xs">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-base text-[#0D0F26] dark:text-white">
              Rozvrh hodin & Agenda
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Při zadávání nových písemek systém automaticky kontroluje školní rozvrh hodin a nepovolí zadat písemku v den, kdy se předmět nevyučuje.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-[#1E2348] flex items-center justify-between">
            <button
              onClick={() => onNavigateTab("timetable")}
              className="inline-flex items-center space-x-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-white hover:text-[#DDA300] transition"
            >
              <span>Otevřít rozvrh</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {currentUser?.role === "ADMIN" && (
              <button
                onClick={onOpenAdminPanel}
                className="inline-flex items-center space-x-1 text-xs font-bold text-[#DDA300] hover:underline"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Správa třídy</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
