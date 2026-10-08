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
import { Navbar } from "@/components/Navbar";
import { EventCard } from "@/components/EventCard";
import { EventModal } from "@/components/EventModal";
import { ICalModal } from "@/components/ICalModal";
import { LoginModal } from "@/components/LoginModal";
import { TimetableGrid } from "@/components/TimetableGrid";
import { CalendarMonthView } from "@/components/CalendarMonthView";
import { AdminPanelModal } from "@/components/AdminPanelModal";
import { DashboardView } from "@/components/DashboardView";
import { GroupSelectionModal } from "@/components/GroupSelectionModal";
import { DeleteRecurringModal } from "@/components/DeleteRecurringModal";
import { formatCzechDate, getEventDateString, toLocalDateString, computeEventCounts } from "@/lib/formatters";
import {
  Search,
  Plus,
  CalendarCheck,
  CheckCircle2,
  Calendar,
  Users,
} from "lucide-react";

export default function HomePage() {
  const [currentTab, setCurrentTab] = useState<"dashboard" | "list" | "calendar" | "timetable">("dashboard");

  // Metadata & App data
  const [events, setEvents] = useState<EventItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [groupFilter, setGroupFilter] = useState<string>("ALL");
  const [subjectFilter, setSubjectFilter] = useState<string>("ALL");
  const [timeframeFilter, setTimeframeFilter] = useState<"upcoming" | "this_week" | "all">("upcoming");

  // Persistent student group preferences (localStorage multi-group array)
  // By default, if nothing saved, include all divided group IDs so fresh visitors see everything
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("terminovka_user_groups");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSelectedGroupIds(parsed);
          return;
        }
      }
    } catch (e) {
      // ignore SSR or JSON parse error
    }
  }, []);

  // When groups are loaded, if user had never saved a preference, initialize with all divided groups
  useEffect(() => {
    if (groups.length > 0) {
      try {
        const saved = localStorage.getItem("terminovka_user_groups");
        if (!saved) {
          const allDivided = groups.filter((g) => !g.isDefaultAll).map((g) => g.id);
          setSelectedGroupIds(allDivided);
          localStorage.setItem("terminovka_user_groups", JSON.stringify(allDivided));
        }
      } catch (e) {
        // ignore
      }
    }
  }, [groups]);

  const handleToggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) => {
      const next = prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId];
      try {
        localStorage.setItem("terminovka_user_groups", JSON.stringify(next));
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  const handleSelectAllGroups = () => {
    const allDivided = groups.filter((g) => !g.isDefaultAll).map((g) => g.id);
    setSelectedGroupIds(allDivided);
    try {
      localStorage.setItem("terminovka_user_groups", JSON.stringify(allDivided));
    } catch (e) {
      // ignore
    }
  };

  const handleClearDividedGroups = () => {
    setSelectedGroupIds([]);
    try {
      localStorage.setItem("terminovka_user_groups", JSON.stringify([]));
    } catch (e) {
      // ignore
    }
  };

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [isIcalModalOpen, setIsIcalModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // Load User, Metadata & Events
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [authRes, metaRes, eventsRes] = await Promise.all([
        fetch("/api/auth/me").then((r) => r.json()),
        fetch("/api/meta").then((r) => r.json()),
        fetch("/api/events").then((r) => r.json()),
      ]);

      if (authRes?.user) setCurrentUser(authRes.user);
      if (metaRes?.subjects) setSubjects(metaRes.subjects);
      if (metaRes?.groups) setGroups(metaRes.groups);
      if (metaRes?.scheduleSlots) setSlots(metaRes.scheduleSlots);
      if (eventsRes?.events) setEvents(eventsRes.events);
    } catch (e) {
      console.error("Error loading app data", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
  };

  const [deletingRecurringEvent, setDeletingRecurringEvent] = useState<EventItem | null>(null);

  const handleDeleteEvent = async (id: string) => {
    const targetEvent = events.find((ev) => ev.id === id);
    if (targetEvent?.recurringId) {
      setDeletingRecurringEvent(targetEvent);
      return;
    }

    if (!confirm("Opravdu chcete smazat tuto událost?")) return;
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (res.ok) {
        setEvents((prev) => prev.filter((ev) => ev.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmDeleteRecurring = async (scope: "single" | "following" | "all") => {
    if (!deletingRecurringEvent) return;
    try {
      const res = await fetch(`/api/events/${deletingRecurringEvent.id}?scope=${scope}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditEvent = (event: EventItem) => {
    setEditingEvent(event);
    setIsEventModalOpen(true);
  };

  const handleCreateNewEvent = () => {
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const handleDeleteTimetableSlot = async (slotId: string) => {
    if (!confirm("Odebrat tuto hodinu z rozvrhu?")) return;
    try {
      const res = await fetch(`/api/admin/timetable/${slotId}`, { method: "DELETE" });
      if (res.ok) {
        setSlots((prev) => prev.filter((s) => s.id !== slotId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleNavigateTab = (tab: "list" | "calendar" | "timetable", filterType?: string) => {
    if (filterType) {
      setTypeFilter(filterType);
    }
    setCurrentTab(tab);
  };

  // Client date state to ensure stable prerender
  const [clientToday, setClientToday] = useState<Date | null>(null);

  useEffect(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setClientToday(d);
  }, []);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    const todayStr = clientToday ? toLocalDateString(clientToday) : "";

    return events.filter((ev) => {
      const evDateStr = getEventDateString(ev.date);

      // Timeframe filter
      if (timeframeFilter === "upcoming") {
        if (todayStr && evDateStr < todayStr) return false;
      } else if (timeframeFilter === "this_week") {
        if (clientToday) {
          const nextWeek = new Date(clientToday);
          nextWeek.setDate(clientToday.getDate() + 7);
          const nextWeekStr = toLocalDateString(nextWeek);
          if (evDateStr < todayStr || evDateStr > nextWeekStr) return false;
        }
      }

      // Type filter
      if (typeFilter !== "ALL") {
        if (typeFilter === "HOMEWORK") {
          if (ev.type !== "HOMEWORK" && ev.type !== "DEADLINE") return false;
        } else if (ev.type !== typeFilter) {
          return false;
        }
      }

      // Multi-group filter (whole-class always visible; divided groups checked against student's selectedGroupIds)
      if (ev.groupId && !ev.group?.isDefaultAll) {
        if (!selectedGroupIds.includes(ev.groupId)) {
          return false;
        }
      }

      // Subject filter
      if (subjectFilter !== "ALL") {
        if (subjectFilter === "none") {
          if (ev.subjectId !== null) return false;
        } else if (ev.subjectId !== subjectFilter) {
          return false;
        }
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = ev.title.toLowerCase().includes(q);
        const matchesDesc = ev.description?.toLowerCase().includes(q) || false;
        const matchesSubject = ev.subject?.name.toLowerCase().includes(q) || false;
        if (!matchesTitle && !matchesDesc && !matchesSubject) return false;
      }

      return true;
    });
  }, [events, search, typeFilter, selectedGroupIds, subjectFilter, timeframeFilter, clientToday]);

  // Group events by date for chronological agenda view
  const groupedEvents = useMemo(() => {
    const groupsMap: Record<string, EventItem[]> = {};
    for (const ev of filteredEvents) {
      const dateKey = getEventDateString(ev.date);
      if (!groupsMap[dateKey]) groupsMap[dateKey] = [];
      groupsMap[dateKey].push(ev);
    }
    return Object.entries(groupsMap).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredEvents]);

  // Counts for summary pills
  const stats = useMemo(() => {
    const todayStr = clientToday ? toLocalDateString(clientToday) : "";
    const upcoming = todayStr
      ? events.filter((e) => getEventDateString(e.date) >= todayStr)
      : events;

    return {
      tests: computeEventCounts(upcoming.filter((e) => e.type === "TEST")),
      homeworks: computeEventCounts(upcoming.filter((e) => e.type === "HOMEWORK" || e.type === "DEADLINE")),
      other: computeEventCounts(upcoming.filter((e) => e.type === "OTHER")),
      total: computeEventCounts(upcoming),
    };
  }, [events, clientToday]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0D0F26] text-[#0D0F26] dark:text-white flex flex-col font-sans transition-colors duration-150">
      {/* Authentic SSPŠ Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        currentUser={currentUser}
        groups={groups}
        selectedGroupIds={selectedGroupIds}
        onOpenGroupModal={() => setIsGroupModalOpen(true)}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenCreateEvent={handleCreateNewEvent}
        onOpenIcalModal={() => setIsIcalModalOpen(true)}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className={`flex-1 w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 ${
        currentTab === "timetable" ? "max-w-[1400px] space-y-4" : "max-w-7xl space-y-6"
      }`}>
        {/* TAB 0: DASHBOARD VIEW (HLAVNÍ STRÁNKA) */}
        {currentTab === "dashboard" && (
          <DashboardView
            events={events}
            subjects={subjects}
            groups={groups}
            slots={slots}
            currentUser={currentUser}
            selectedGroupIds={selectedGroupIds}
            onOpenGroupModal={() => setIsGroupModalOpen(true)}
            onNavigateTab={handleNavigateTab}
            onOpenCreateEvent={handleCreateNewEvent}
            onOpenIcalModal={() => setIsIcalModalOpen(true)}
            onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
            onEditEvent={handleEditEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        )}

        {/* Title Header for non-dashboard tabs */}
        {currentTab !== "dashboard" && currentTab !== "timetable" && (
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E2348]">
            <div>
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-[#DDA300] font-black text-base">|</span>
                <span>
                  {currentTab === "list"
                    ? "Agenda a termíny"
                    : "Měsíční kalendář"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-[#0D0F26] dark:text-white tracking-tight">
                {currentTab === "list"
                  ? "Agenda termínů"
                  : "Kalendář termínů"}
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                {currentTab === "list"
                  ? "Kompletní přehled písemek a úkolů s možností vyhledávání a filtrace."
                  : "Měsíční kalendářní zobrazení pro snadnou orientaci v nadcházejících zkouškách a projektech."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={() => setIsIcalModalOpen(true)}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-[#222752] bg-white dark:bg-[#131738] text-[#0D0F26] dark:text-white text-xs sm:text-sm font-bold hover:bg-slate-50 dark:hover:bg-[#1A1F4C] transition"
              >
                <CalendarCheck className="w-4 h-4 text-[#DDA300]" />
                <span>Odebírat do mobilu</span>
              </button>

              {currentUser && (
                <button
                  onClick={handleCreateNewEvent}
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-lg bg-[#0D0F26] dark:bg-white text-white dark:text-[#0D0F26] text-xs sm:text-sm font-bold hover:opacity-90 transition active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Přidat termín</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filters and Controls (Clean, minimal, no AI-slop) - only for Agenda */}
        {currentTab === "list" && (
          <div className="space-y-4">
            {/* Top row: Minimalist Type Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-[#1E2348] pb-3">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                <button
                  onClick={() => setTypeFilter("ALL")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition flex items-center space-x-1 ${
                    typeFilter === "ALL"
                      ? "bg-[#0D0F26] dark:bg-white text-white dark:text-[#0D0F26]"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span>Vše ({stats.total.primaryCount}</span>
                  {stats.total.recurringExtraCount > 0 && (
                    <span className="opacity-80 text-[11px] font-semibold">
                      +{stats.total.recurringExtraCount}
                    </span>
                  )}
                  <span>)</span>
                </button>
                <button
                  onClick={() => setTypeFilter("TEST")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition flex items-center space-x-1 ${
                    typeFilter === "TEST"
                      ? "bg-rose-600 text-white"
                      : "text-slate-600 dark:text-slate-400 hover:text-rose-600"
                  }`}
                >
                  <span>Písemky ({stats.tests.primaryCount}</span>
                  {stats.tests.recurringExtraCount > 0 && (
                    <span className="opacity-80 text-[11px] font-semibold">
                      +{stats.tests.recurringExtraCount}
                    </span>
                  )}
                  <span>)</span>
                </button>
                <button
                  onClick={() => setTypeFilter("HOMEWORK")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition flex items-center space-x-1 ${
                    typeFilter === "HOMEWORK"
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 dark:text-slate-400 hover:text-blue-600"
                  }`}
                >
                  <span>Úkoly ({stats.homeworks.primaryCount}</span>
                  {stats.homeworks.recurringExtraCount > 0 && (
                    <span className="opacity-80 text-[11px] font-semibold">
                      +{stats.homeworks.recurringExtraCount}
                    </span>
                  )}
                  <span>)</span>
                </button>
                <button
                  onClick={() => setTypeFilter("OTHER")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition flex items-center space-x-1 ${
                    typeFilter === "OTHER"
                      ? "bg-slate-700 text-white"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <span>Ostatní ({stats.other.primaryCount}</span>
                  {stats.other.recurringExtraCount > 0 && (
                    <span className="opacity-80 text-[11px] font-semibold">
                      +{stats.other.recurringExtraCount}
                    </span>
                  )}
                  <span>)</span>
                </button>
              </div>

              {/* Timeframe selector */}
              <div className="flex items-center space-x-1 text-xs font-semibold">
                <button
                  onClick={() => setTimeframeFilter("upcoming")}
                  className={`px-2.5 py-1 rounded transition ${
                    timeframeFilter === "upcoming"
                      ? "bg-slate-200 dark:bg-white/10 text-[#0D0F26] dark:text-white font-bold"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                  }`}
                >
                  Budoucí
                </button>
                <button
                  onClick={() => setTimeframeFilter("this_week")}
                  className={`px-2.5 py-1 rounded transition ${
                    timeframeFilter === "this_week"
                      ? "bg-slate-200 dark:bg-white/10 text-[#0D0F26] dark:text-white font-bold"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                  }`}
                >
                  Tento týden
                </button>
                <button
                  onClick={() => setTimeframeFilter("all")}
                  className={`px-2.5 py-1 rounded transition ${
                    timeframeFilter === "all"
                      ? "bg-slate-200 dark:bg-white/10 text-[#0D0F26] dark:text-white font-bold"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                  }`}
                >
                  Vše
                </button>
              </div>
            </div>

            {/* Bottom Row: Search & Subject Filter (Groups managed globally in top menu) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Hledat v názvu nebo popisu..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-[#222752] bg-white dark:bg-[#131738] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-[#DDA300]"
                />
              </div>

              <div>
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-[#222752] bg-white dark:bg-[#131738] text-slate-900 dark:text-white focus:outline-hidden focus:border-[#DDA300]"
                >
                  <option value="ALL">Všechny předměty</option>
                  <option value="none">Bez předmětu</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: AGENDA LIST VIEW */}
        {currentTab === "list" && (
          <div className="space-y-8">
            {isLoading ? (
              <div className="p-16 text-center text-slate-400">
                <div className="w-8 h-8 border-2 border-[#DDA300] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm">Načítám termíny třídy...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="bg-white dark:bg-[#131738] rounded-xl p-12 text-center border border-slate-200 dark:border-[#222752]">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6 text-[#DDA300]" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#0D0F26] dark:text-white">
                  Žádné události neodpovídají filtrům
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Zkuste resetovat vybrané filtry nebo jako editor přidejte nový termín.
                </p>
                {currentUser && (
                  <button
                    onClick={handleCreateNewEvent}
                    className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#0D0F26] dark:bg-white text-white dark:text-[#0D0F26] text-xs sm:text-sm font-bold hover:opacity-90 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Přidat termín</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-8 sm:space-y-10">
                {groupedEvents.map(([dateKey, dayEvents]) => (
                  <div key={dateKey} className="space-y-4">
                    {/* Date Section Header with signature SSPŠ gold indicator */}
                    <div className="flex items-center space-x-2 text-sm sm:text-base font-bold text-[#0D0F26] dark:text-white pb-2 border-b border-slate-200 dark:border-[#1E2348]">
                      <span className="text-[#DDA300] font-black text-lg">|</span>
                      <span>{formatCzechDate(dateKey)}</span>
                      <span className="text-xs font-mono font-normal text-slate-500 dark:text-slate-400 ml-2">
                        ({dayEvents.length} {dayEvents.length === 1 ? "událost" : "události"})
                      </span>
                    </div>

                    {/* Cards Grid: Clean, spacious 1 to 3 columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {dayEvents.map((ev) => (
                        <EventCard
                          key={ev.id}
                          event={ev}
                          currentUser={currentUser}
                          onEdit={handleEditEvent}
                          onDelete={handleDeleteEvent}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MONTHLY CALENDAR VIEW */}
        {currentTab === "calendar" && (
          <CalendarMonthView
            events={filteredEvents}
            onSelectEvent={(ev) => {
              setSearch(ev.title);
              setCurrentTab("list");
            }}
          />
        )}

        {/* TAB 3: TIMETABLE GRID */}
        {currentTab === "timetable" && (
          <TimetableGrid
            slots={slots}
            subjects={subjects}
            groups={groups}
            currentUser={currentUser}
            selectedGroupIds={selectedGroupIds}
            onOpenGroupModal={() => setIsGroupModalOpen(true)}
            onDeleteSlot={handleDeleteTimetableSlot}
            onAddSlotClick={() => setIsAdminPanelOpen(true)}
          />
        )}
      </main>

      {/* Simplified, elegant Footer */}
      <footer className="mt-auto bg-[#0D0F26] border-t border-[#1E2348] text-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <span className="text-[#DDA300] font-black">|</span>
              <span className="font-bold text-white">Termínovka</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400">pro studenty 1.B SSPŠ</span>
            </div>

            <div className="text-slate-400 text-center sm:text-right">
              Vytvořil{" "}
              <a
                href="https://plojharsim.cz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#DDA300] hover:underline font-bold"
              >
                plojharsim
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <GroupSelectionModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        groups={groups}
        selectedGroupIds={selectedGroupIds}
        onToggleGroup={handleToggleGroup}
        onSelectAll={handleSelectAllGroups}
        onClearDivided={handleClearDividedGroups}
      />

      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSaved={loadAllData}
        subjects={subjects}
        groups={groups}
        slots={slots}
        selectedGroupIds={selectedGroupIds}
        editEvent={editingEvent}
      />

      <ICalModal
        isOpen={isIcalModalOpen}
        onClose={() => setIsIcalModalOpen(false)}
        groups={groups}
        selectedGroupIds={selectedGroupIds}
        onOpenGroupModal={() => setIsGroupModalOpen(true)}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(u) => {
          setCurrentUser(u);
          loadAllData();
        }}
      />

      {currentUser?.role === "ADMIN" && (
        <AdminPanelModal
          isOpen={isAdminPanelOpen}
          onClose={() => setIsAdminPanelOpen(false)}
          subjects={subjects}
          groups={groups}
          slots={slots}
          onDataRefresh={loadAllData}
        />
      )}

      <DeleteRecurringModal
        isOpen={!!deletingRecurringEvent}
        event={deletingRecurringEvent}
        onClose={() => setDeletingRecurringEvent(null)}
        onConfirm={handleConfirmDeleteRecurring}
      />
    </div>
  );
}
