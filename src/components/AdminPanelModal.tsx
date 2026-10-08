"use client";

import React, { useState, useEffect } from "react";
import { Subject, StudentGroup, ScheduleSlot } from "@/types";
import { DAY_NAMES, PERIOD_TIMES } from "@/lib/timetable";
import {
  X,
  Users,
  Clock,
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  Shield,
  Loader2,
  UserCheck,
  UserX,
} from "lucide-react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    events: number;
  };
}

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  groups: StudentGroup[];
  slots: ScheduleSlot[];
  onDataRefresh: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  subjects,
  groups,
  slots,
  onDataRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<"users" | "timetable" | "subjects">("users");

  // Users state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("EDITOR");
  const [userMsg, setUserMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Timetable slot form state
  const [slotDay, setSlotDay] = useState(1);
  const [slotPeriod, setSlotPeriod] = useState(1);
  const [slotSubjectId, setSlotSubjectId] = useState("");
  const [slotGroupId, setSlotGroupId] = useState("ALL");
  const [slotRoom, setSlotRoom] = useState("");
  const [slotWeekType, setSlotWeekType] = useState<"ALL" | "EVEN" | "ODD" | "SELF_STUDY">("ALL");
  const [slotMsg, setSlotMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Subject form & edit state
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [newSubName, setNewSubName] = useState("");
  const [newSubCode, setNewSubCode] = useState("");
  const [newSubColor, setNewSubColor] = useState("#2563EB");
  const [newSubTeacher, setNewSubTeacher] = useState("");
  const [newSubRoom, setNewSubRoom] = useState("");
  const [subMsg, setSubMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Group form state
  const [newGrpName, setNewGrpName] = useState("");
  const [newGrpCode, setNewGrpCode] = useState("");

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      if (subjects.length > 0 && !slotSubjectId) {
        setSlotSubjectId(subjects[0].id);
      }
    }
  }, [isOpen, subjects, slotSubjectId]);

  if (!isOpen) return null;

  // Handle Create Editor
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserMsg(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUserMsg({ type: "error", text: data.error || "Chyba při vytváření uživatele" });
        return;
      }

      setUserMsg({ type: "success", text: `Editor ${data.user.name} byl úspěšně vytvořen!` });
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      loadUsers();
    } catch {
      setUserMsg({ type: "error", text: "Chyba komunikace se serverem" });
    }
  };

  // Toggle user active status
  const handleToggleActive = async (u: AdminUser) => {
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      if (res.ok) {
        loadUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete User
  const handleDeleteUser = async (id: string) => {
    if (!confirm("Opravdu chcete smazat tento účet editora?")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Add Schedule Slot
  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlotMsg(null);
    try {
      const defaultTimes = PERIOD_TIMES[slotPeriod] || { startTime: "08:00", endTime: "08:45" };
      const res = await fetch("/api/admin/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayOfWeek: slotDay,
          period: slotPeriod,
          subjectId: slotSubjectId,
          groupId: slotGroupId,
          room: slotRoom,
          weekType: slotWeekType,
          startTime: defaultTimes.startTime,
          endTime: defaultTimes.endTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSlotMsg({ type: "error", text: data.error || "Chyba při ukládání hodiny" });
        return;
      }

      setSlotMsg({ type: "success", text: "Hodina byla úspěšně přidána do rozvrhu!" });
      setSlotRoom("");
      onDataRefresh();
    } catch {
      setSlotMsg({ type: "error", text: "Chyba spojení se serverem" });
    }
  };

  // Delete Timetable Slot
  const handleDeleteSlot = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/timetable/${id}`, { method: "DELETE" });
      if (res.ok) {
        onDataRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Subject handlers (Create / Edit / Delete)
  const startEditSubject = (s: Subject) => {
    setEditingSubject(s);
    setNewSubName(s.name);
    setNewSubCode(s.code);
    setNewSubColor(s.color || "#2563EB");
    setNewSubTeacher(s.teacher || "");
    setNewSubRoom(s.defaultRoom || "");
    setSubMsg(null);
  };

  const cancelEditSubject = () => {
    setEditingSubject(null);
    setNewSubName("");
    setNewSubCode("");
    setNewSubColor("#2563EB");
    setNewSubTeacher("");
    setNewSubRoom("");
    setSubMsg(null);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubMsg(null);
    try {
      const isEditing = !!editingSubject;
      const url = isEditing
        ? `/api/admin/subjects/${editingSubject.id}`
        : "/api/admin/subjects";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSubName,
          code: newSubCode,
          color: newSubColor,
          teacher: newSubTeacher,
          defaultRoom: newSubRoom,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubMsg({ type: "error", text: data.error || "Chyba při ukládání předmětu" });
        return;
      }

      setSubMsg({
        type: "success",
        text: isEditing
          ? `Předmět "${newSubName}" byl úspěšně upraven!`
          : `Předmět "${newSubName}" byl úspěšně vytvořen!`,
      });
      cancelEditSubject();
      onDataRefresh();
    } catch {
      setSubMsg({ type: "error", text: "Chyba spojení se serverem" });
    }
  };

  const handleDeleteSubject = async (s: Subject) => {
    if (
      !confirm(
        `Opravdu chcete smazat předmět "${s.name}" (${s.code})?\n\nBudou odebrány i související hodiny z rozvrhu!`
      )
    ) {
      return;
    }
    setSubMsg(null);
    try {
      const res = await fetch(`/api/admin/subjects/${s.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setSubMsg({ type: "error", text: data.error || "Předmět se nepodařilo smazat" });
        return;
      }
      setSubMsg({ type: "success", text: `Předmět "${s.name}" byl smazán.` });
      if (editingSubject?.id === s.id) {
        cancelEditSubject();
      }
      onDataRefresh();
    } catch {
      setSubMsg({ type: "error", text: "Chyba spojení se serverem" });
    }
  };

  // Group handlers (Create / Delete)
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubMsg(null);
    try {
      const res = await fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGrpName,
          code: newGrpCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubMsg({ type: "error", text: data.error || "Chyba při vytváření skupiny" });
        return;
      }

      setSubMsg({ type: "success", text: "Skupina byla úspěšně přidána!" });
      setNewGrpName("");
      setNewGrpCode("");
      onDataRefresh();
    } catch {
      setSubMsg({ type: "error", text: "Chyba spojení se serverem" });
    }
  };

  const handleDeleteGroup = async (g: StudentGroup) => {
    if (g.isDefaultAll) {
      alert("Výchozí skupinu 'Celá třída' nelze smazat.");
      return;
    }
    if (!confirm(`Opravdu chcete smazat skupinu "${g.name}" (${g.code})?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/groups/${g.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Skupinu se nepodařilo smazat");
        return;
      }
      onDataRefresh();
    } catch {
      alert("Chyba spojení se serverem");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#131738] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#23295C] overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1F2554] flex items-center justify-between bg-slate-50 dark:bg-[#0D0F26] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-400/15 text-amber-300 border border-amber-400/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Správa třídy 1.B & Rozvrh
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nastavení editorů, rozvrhu hodin, předmětů a skupin pro 1.B
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

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 dark:border-[#1F2554] bg-white dark:bg-[#0D0F26] flex space-x-6 shrink-0 text-xs sm:text-sm font-bold">
          <button
            onClick={() => setActiveTab("users")}
            className={`py-3.5 border-b-2 flex items-center space-x-2 transition ${
              activeTab === "users"
                ? "border-[#DDA300] text-[#DDA300]"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Editoři ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("timetable")}
            className={`py-3.5 border-b-2 flex items-center space-x-2 transition ${
              activeTab === "timetable"
                ? "border-[#DDA300] text-[#DDA300]"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Rozvrh hodin ({slots.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("subjects")}
            className={`py-3.5 border-b-2 flex items-center space-x-2 transition ${
              activeTab === "subjects"
                ? "border-[#DDA300] text-[#DDA300]"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Předměty & Skupiny</span>
          </button>
        </div>

        {/* Tab Content Body (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-900 dark:text-white">
          {/* TAB 1: USERS & EDITORS */}
          {activeTab === "users" && (
            <div className="space-y-6">
              {/* Add New Editor Form */}
              <div className="bg-slate-50 dark:bg-[#0D0F26]/70 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#23295C]">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center space-x-1.5">
                  <Plus className="w-4 h-4 text-[#DDA300]" />
                  <span>Vytvořit nový účet editora</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Spolužák se s tímto e-mailem a heslem přihlásí a bude moct přidávat a upravovat termíny.
                </p>

                {userMsg && (
                  <div
                    className={`p-3 rounded-xl mb-4 text-xs font-medium flex items-center space-x-2 ${
                      userMsg.type === "success"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {userMsg.type === "success" ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span>{userMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                      Jméno a příjmení
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="např. Petr Svoboda"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2A316E] bg-white dark:bg-[#14183E] text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                      E-mail (přihlašovací)
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="petr@skola.cz"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2A316E] bg-white dark:bg-[#14183E] text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                      Počáteční heslo
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="heslo123"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2A316E] bg-white dark:bg-[#14183E] text-xs text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full py-2 px-4 rounded-xl bg-[#DDA300] hover:bg-[#c99500] text-[#0D0F26] font-bold text-xs transition shadow-xs flex items-center justify-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Vytvořit účet</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Users List */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                  Existující účty ve třídě
                </h3>

                {isLoadingUsers ? (
                  <div className="p-8 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#DDA300]" />
                    <span>Načítám uživatele...</span>
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-[#23295C] rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-[#1F2554]">
                    {users.map((u) => (
                      <div
                        key={u.id}
                        className="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#0D0F26] border border-slate-200 dark:border-[#23295C] flex items-center justify-center font-bold text-slate-600 dark:text-[#DDA300] text-xs font-mono">
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">{u.name}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  u.role === "ADMIN"
                                    ? "bg-amber-400/15 text-amber-300 border border-amber-400/30"
                                    : "bg-[#DDA300]/10 text-[#DDA300] border border-[#DDA300]/30"
                                }`}
                              >
                                {u.role === "ADMIN" ? "Admin" : "Editor"}
                              </span>
                              {!u.isActive && (
                                <span className="text-[10px] bg-rose-500/15 text-rose-400 font-bold px-1.5 py-0.5 rounded-sm">
                                  Neaktivní
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{u.email}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleToggleActive(u)}
                            className={`p-1.5 rounded-xl text-xs font-semibold border flex items-center space-x-1 ${
                              u.isActive
                                ? "border-slate-300 dark:border-[#2A316E] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1C2152]"
                                : "border-emerald-500/30 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20"
                            }`}
                            title={u.isActive ? "Deaktivovat účet" : "Aktivovat účet"}
                          >
                            {u.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">
                              {u.isActive ? "Pozastavit" : "Aktivovat"}
                            </span>
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                            title="Smazat uživatele"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TIMETABLE CONFIG */}
          {activeTab === "timetable" && (
            <div className="space-y-6">
              {/* Add Slot Form */}
              <div className="bg-slate-50 dark:bg-[#0D0F26]/70 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#23295C]">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center space-x-1.5">
                  <Plus className="w-4 h-4 text-[#DDA300]" />
                  <span>Přidat vyučovací hodinu do rozvrhu</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Nastavte den v týdnu, hodinu a předmět. Podle těchto hodin systém ověřuje zadávání písemek!
                </p>

                {slotMsg && (
                  <div
                    className={`p-3 rounded-xl mb-4 text-xs font-medium flex items-center space-x-2 ${
                      slotMsg.type === "success"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {slotMsg.type === "success" ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span>{slotMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleAddSlot} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                      Den v týdnu
                    </label>
                    <select
                      value={slotDay}
                      onChange={(e) => setSlotDay(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2A316E] text-xs bg-white dark:bg-[#14183E] text-slate-900 dark:text-white"
                    >
                      <option value={1}>Pondělí</option>
                      <option value={2}>Úterý</option>
                      <option value={3}>Středa</option>
                      <option value={4}>Čtvrtek</option>
                      <option value={5}>Pátek</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                      Vyučovací hodina
                    </label>
                    <select
                      value={slotPeriod}
                      onChange={(e) => setSlotPeriod(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2A316E] text-xs bg-white dark:bg-[#14183E] text-slate-900 dark:text-white font-mono"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => {
                        const t = PERIOD_TIMES[p] || { startTime: "", endTime: "" };
                        return (
                          <option key={p} value={p}>
                            {p}. hodina ({t.startTime} - {t.endTime})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                      Platnost týdne
                    </label>
                    <select
                      value={slotWeekType}
                      onChange={(e) => setSlotWeekType(e.target.value as "ALL" | "EVEN" | "ODD" | "SELF_STUDY")}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2A316E] text-xs bg-white dark:bg-[#14183E] text-slate-900 dark:text-white font-semibold"
                    >
                      <option value="ALL">Každý týden</option>
                      <option value="SELF_STUDY">Samostudium (S)</option>
                      <option value="EVEN">Pouze sudý týden</option>
                      <option value="ODD">Pouze lichý týden</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                      Předmět
                    </label>
                    <select
                      value={slotSubjectId}
                      onChange={(e) => setSlotSubjectId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2A316E] text-xs bg-white dark:bg-[#14183E] text-slate-900 dark:text-white"
                    >
                      {subjects.length === 0 ? (
                        <option value="">Nejprve přidejte předmět</option>
                      ) : (
                        subjects.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name} ({sub.code})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                      Skupina (volitelně)
                    </label>
                    <select
                      value={slotGroupId}
                      onChange={(e) => setSlotGroupId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2A316E] text-xs bg-white dark:bg-[#14183E] text-slate-900 dark:text-white"
                    >
                      <option value="ALL">Celá třída</option>
                      {groups
                        .filter((g) => !g.isDefaultAll)
                        .map((grp) => (
                          <option key={grp.id} value={grp.id}>
                            {grp.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex items-end space-x-2">
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                        Učebna
                      </label>
                      <input
                        type="text"
                        placeholder="204"
                        value={slotRoom}
                        onChange={(e) => setSlotRoom(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2A316E] text-xs text-slate-900 dark:text-white bg-white dark:bg-[#14183E]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="py-2 px-3.5 rounded-xl bg-[#DDA300] hover:bg-[#c99500] text-[#0D0F26] font-bold text-xs transition shadow-xs shrink-0"
                    >
                      Přidat
                    </button>
                  </div>
                </form>
              </div>

              {/* Slots List By Day */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                  Přehled všech zapsaných hodin
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map((dayNum) => {
                    const daySlots = slots.filter((s) => s.dayOfWeek === dayNum);
                    return (
                      <div key={dayNum} className="border border-slate-200 dark:border-[#23295C] rounded-2xl p-3 bg-white dark:bg-[#14183E]">
                        <div className="font-bold text-xs text-slate-800 dark:text-white pb-2 border-b border-slate-100 dark:border-[#1F2554] flex justify-between">
                          <span>{DAY_NAMES[dayNum]}</span>
                          <span className="text-slate-400 font-mono text-[11px]">{daySlots.length} hod.</span>
                        </div>
                        <div className="mt-2 space-y-1.5">
                          {daySlots.length === 0 ? (
                            <span className="text-[11px] text-slate-400 italic">Žádné hodiny</span>
                          ) : (
                            daySlots.map((s) => (
                              <div
                                key={s.id}
                                className="flex items-center justify-between p-1.5 rounded-xl border text-xs"
                                style={{
                                  backgroundColor: `${s.subject.color}15`,
                                  borderColor: `${s.subject.color}35`,
                                }}
                              >
                                <div className="truncate">
                                  <strong className="text-slate-800 dark:text-white mr-1 font-mono">{s.period}.</strong>
                                  <span className="font-bold font-mono" style={{ color: s.subject.color }}>
                                    {s.subject.code}
                                  </span>
                                  {s.weekType === "SELF_STUDY" && (
                                    <span className="text-[9px] font-black uppercase px-1 py-0.2 rounded bg-amber-500 text-[#0D0F26] ml-1" title="Samostudium">
                                      S (Samostudium)
                                    </span>
                                  )}
                                  {s.weekType === "EVEN" && (
                                    <span className="text-[9px] font-black uppercase px-1 py-0.2 rounded bg-purple-600 text-white ml-1" title="Sudý týden">
                                      Sudý
                                    </span>
                                  )}
                                  {s.weekType === "ODD" && (
                                    <span className="text-[9px] font-black uppercase px-1 py-0.2 rounded bg-teal-600 text-white ml-1" title="Lichý týden">
                                      Lichý
                                    </span>
                                  )}
                                  {s.room && (
                                    <span className="text-[10px] text-slate-400 font-mono ml-1">
                                      [{s.room}]
                                    </span>
                                  )}
                                  {s.group && !s.group.isDefaultAll && (
                                    <span className="text-[10px] text-[#DDA300] ml-1">
                                      ({s.group.name})
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleDeleteSlot(s.id)}
                                  className="text-slate-400 hover:text-rose-400 p-0.5 ml-1 transition"
                                  title="Odebrat z rozvrhu"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SUBJECTS & GROUPS */}
          {activeTab === "subjects" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Add / Edit Subject */}
              <div className="bg-slate-50 dark:bg-[#0D0F26]/70 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#23295C]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <BookOpen className="w-4 h-4 text-[#DDA300]" />
                    <span>{editingSubject ? `Upravit: ${editingSubject.name}` : "Přidat nový předmět"}</span>
                  </h3>
                  {editingSubject && (
                    <button
                      type="button"
                      onClick={cancelEditSubject}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                    >
                      Zrušit úpravy
                    </button>
                  )}
                </div>

                {subMsg && (
                  <div
                    className={`p-3 rounded-xl mb-3 text-xs font-medium ${
                      subMsg.type === "success"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {subMsg.text}
                  </div>
                )}

                <form onSubmit={handleSaveSubject} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                      Celý název předmětu
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="např. Francouzský jazyk"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2A316E] text-xs text-slate-900 dark:text-white bg-white dark:bg-[#14183E]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                        Zkratka předmětu
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="FJ"
                        value={newSubCode}
                        onChange={(e) => setNewSubCode(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2A316E] text-xs text-slate-900 dark:text-white bg-white dark:bg-[#14183E] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                        Barva předmětu
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={newSubColor}
                          onChange={(e) => setNewSubColor(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-[#2A316E] p-0.5 bg-transparent"
                        />
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{newSubColor}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                        Vyučující
                      </label>
                      <input
                        type="text"
                        placeholder="Mgr. Nováková"
                        value={newSubTeacher}
                        onChange={(e) => setNewSubTeacher(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2A316E] text-xs text-slate-900 dark:text-white bg-white dark:bg-[#14183E]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                        Výchozí učebna
                      </label>
                      <input
                        type="text"
                        placeholder="Učebna 102"
                        value={newSubRoom}
                        onChange={(e) => setNewSubRoom(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2A316E] text-xs text-slate-900 dark:text-white bg-white dark:bg-[#14183E]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-2 px-4 rounded-xl bg-[#DDA300] hover:bg-[#c99500] text-[#0D0F26] font-bold text-xs transition shadow-xs"
                    >
                      {editingSubject ? "Uložit změny předmětu" : "Vytvořit předmět"}
                    </button>
                    {editingSubject && (
                      <button
                        type="button"
                        onClick={cancelEditSubject}
                        className="py-2 px-3 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-800 dark:text-white font-bold text-xs transition"
                      >
                        Zrušit
                      </button>
                    )}
                  </div>
                </form>

                {/* List existing subjects with edit & delete controls */}
                <div className="mt-5 pt-4 border-t border-slate-200 dark:border-[#1F2554]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Stávající předměty ({subjects.length}):
                    </span>
                    {editingSubject && (
                      <button
                        type="button"
                        onClick={cancelEditSubject}
                        className="text-[11px] text-[#DDA300] hover:underline font-bold"
                      >
                        + Přidat nový místo úpravy
                      </button>
                    )}
                  </div>

                  {subjects.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Zatím nebyly přidány žádné předměty.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {subjects.map((s) => {
                        const isBeingEdited = editingSubject?.id === s.id;
                        return (
                          <div
                            key={s.id}
                            className={`p-2.5 rounded-xl border flex items-center justify-between transition text-xs ${
                              isBeingEdited
                                ? "bg-[#DDA300]/15 border-[#DDA300] ring-1 ring-[#DDA300]"
                                : "bg-white dark:bg-[#14183E] border-slate-200 dark:border-[#23295C] hover:border-slate-300 dark:hover:border-slate-600"
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: s.color }}
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-white truncate">
                                  {s.name}{" "}
                                  <span className="font-mono text-slate-400 font-normal">({s.code})</span>
                                </div>
                                {(s.teacher || s.defaultRoom) && (
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                    {s.teacher} {s.defaultRoom && `· uč. ${s.defaultRoom}`}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-1 shrink-0 ml-2">
                              <button
                                type="button"
                                onClick={() => startEditSubject(s)}
                                title="Upravit předmět"
                                className="p-1.5 text-slate-400 hover:text-[#DDA300] hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSubject(s)}
                                title="Smazat předmět"
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Add Student Group */}
              <div className="bg-slate-50 dark:bg-[#0D0F26]/70 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#23295C]">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center space-x-1.5">
                  <Users className="w-4 h-4 text-[#DDA300]" />
                  <span>Přidat novou studijní skupinu</span>
                </h3>

                <form onSubmit={handleCreateGroup} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                      Název skupiny
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="např. Seminář z matematiky"
                      value={newGrpName}
                      onChange={(e) => setNewGrpName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2A316E] text-xs text-slate-900 dark:text-white bg-white dark:bg-[#14183E]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                      Kód / Zkratka
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="SEM-M"
                      value={newGrpCode}
                      onChange={(e) => setNewGrpCode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2A316E] text-xs text-slate-900 dark:text-white bg-white dark:bg-[#14183E] font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 px-4 rounded-xl bg-[#DDA300] hover:bg-[#c99500] text-[#0D0F26] font-bold text-xs transition shadow-xs"
                  >
                    Vytvořit skupinu
                  </button>
                </form>

                {/* List existing groups */}
                <div className="mt-5 pt-4 border-t border-slate-200 dark:border-[#1F2554]">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Stávající skupiny ({groups.length}):
                  </div>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {groups.map((g) => (
                      <div
                        key={g.id}
                        className="p-2.5 rounded-xl border bg-white dark:bg-[#14183E] border-slate-200 dark:border-[#23295C] flex items-center justify-between text-xs"
                      >
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {g.name}{" "}
                          <span className="font-mono text-slate-400 font-normal">
                            {g.isDefaultAll ? "(Celá třída)" : `(${g.code})`}
                          </span>
                        </div>
                        {!g.isDefaultAll && (
                          <button
                            type="button"
                            onClick={() => handleDeleteGroup(g)}
                            title="Smazat skupinu"
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition shrink-0 ml-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-[#1F2554] flex justify-end bg-slate-50 dark:bg-[#0D0F26] shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#1C2152] rounded-xl transition"
          >
            Zavřít administraci
          </button>
        </div>
      </div>
    </div>
  );
};
