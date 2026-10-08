"use client";

import React, { useState, useEffect } from "react";
import { EventItem, Subject, StudentGroup, EventType, ScheduleSlot } from "@/types";
import { toLocalDateString, getEventDateString } from "@/lib/formatters";
import {
  X,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Link as LinkIcon,
  Users,
  Loader2,
  Repeat,
  Paperclip,
  UploadCloud,
  FileCheck,
} from "lucide-react";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  subjects: Subject[];
  groups: StudentGroup[];
  slots?: ScheduleSlot[];
  selectedGroupIds?: string[];
  editEvent?: EventItem | null;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  subjects,
  groups,
  slots = [],
  selectedGroupIds = [],
  editEvent,
}) => {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("TEST");
  const [date, setDate] = useState("");
  const [subjectId, setSubjectId] = useState<string>("none");
  const [groupId, setGroupId] = useState<string>("ALL");
  const [hasSpecificTime, setHasSpecificTime] = useState(true);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("08:45");
  const [period, setPeriod] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [recurrenceType, setRecurrenceType] = useState<"NONE" | "WEEKLY" | "BIWEEKLY" | "MONTHLY">("NONE");
  const [recurrenceCount, setRecurrenceCount] = useState<number>(4);
  const [untilEndOfSchoolYear, setUntilEndOfSchoolYear] = useState<boolean>(true);
  const [weight, setWeight] = useState<number | string>("");

  // Validation state
  const [isCheckingTimetable, setIsCheckingTimetable] = useState(false);
  const [timetableError, setTimetableError] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<
    Array<{
      id: string;
      period: number;
      startTime: string;
      endTime: string;
      room?: string | null;
      groupName?: string;
    }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Helper to format initial date
  const getInitialDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toLocalDateString(d);
  };

  // Helper to intelligently resolve default group for a chosen subject:
  // - If user has a matching group for this subject in the timetable, choose it.
  // - If user has none or multiple groups in that hour, default to "ALL" (Celá třída).
  const resolveDefaultGroupForSubject = (subjId: string): string => {
    if (!subjId || subjId === "none") return "ALL";

    // Find slots where this subject is taught and which belong to a divided group
    const subjectSlots = slots.filter((s) => s.subjectId === subjId && s.groupId);
    const subjectDividedGroupIds = Array.from(new Set(subjectSlots.map((s) => s.groupId as string)));

    // Intersect with user's configured groups
    const matchingUserGroupIds = subjectDividedGroupIds.filter((gid) =>
      selectedGroupIds.includes(gid)
    );

    // If exactly 1 matching group, select it!
    if (matchingUserGroupIds.length === 1) {
      return matchingUserGroupIds[0];
    }

    // Otherwise (0 or multiple groups), default to "ALL" (Celá třída)
    return "ALL";
  };

  const handleSubjectChange = (newSubjId: string) => {
    setSubjectId(newSubjId);
    if (!editEvent) {
      const autoGrp = resolveDefaultGroupForSubject(newSubjId);
      setGroupId(autoGrp);
    }
  };

  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title);
      setType(editEvent.type);
      setDate(getEventDateString(editEvent.date));
      setSubjectId(editEvent.subjectId || "none");
      setGroupId(editEvent.groupId || "ALL");
      setHasSpecificTime(editEvent.hasSpecificTime);
      setStartTime(editEvent.startTime || "08:00");
      setEndTime(editEvent.endTime || "08:45");
      setPeriod(editEvent.period || null);
      setDescription(editEvent.description || "");
      setAttachmentUrl(editEvent.attachmentUrl || "");
      setAttachmentName(editEvent.attachmentName || "");
      setRecurrenceType("NONE");
      setRecurrenceCount(4);
      setUntilEndOfSchoolYear(true);
      setWeight(editEvent.weight != null ? editEvent.weight : "");
    } else {
      const initialSubj = subjects.length > 0 ? subjects[0].id : "none";
      setTitle("");
      setType("TEST");
      setDate(getInitialDate());
      setSubjectId(initialSubj);
      setGroupId(resolveDefaultGroupForSubject(initialSubj));
      setHasSpecificTime(true);
      setPeriod(null);
      setDescription("");
      setAttachmentUrl("");
      setAttachmentName("");
      setRecurrenceType("NONE");
      setRecurrenceCount(4);
      setUntilEndOfSchoolYear(true);
      setWeight("");
    }
    setUploadError(null);
    setTimetableError(null);
    setFormError(null);
  }, [editEvent, isOpen, subjects, slots, selectedGroupIds]);

  // Timetable check effect
  useEffect(() => {
    if (!isOpen || !date) return;

    if (!subjectId || subjectId === "none") {
      setTimetableError(null);
      setAvailableSlots([]);
      return;
    }

    let isMounted = true;
    setIsCheckingTimetable(true);
    setTimetableError(null);

    const checkUrl = `/api/timetable/check?date=${encodeURIComponent(
      date
    )}&subjectId=${encodeURIComponent(subjectId)}${
      groupId && groupId !== "ALL" ? `&groupId=${encodeURIComponent(groupId)}` : ""
    }`;

    fetch(checkUrl)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        setIsCheckingTimetable(false);

        if (!data.valid) {
          setTimetableError(
            data.message ||
              "V tento den se daný předmět podle školního rozvrhu nevyučuje!"
          );
          setAvailableSlots([]);
        } else {
          setTimetableError(null);
          setAvailableSlots(data.slots || []);

          // Auto-select first slot if available
          if (data.slots && data.slots.length > 0) {
            const currentMatchingSlot = data.slots.find(
              (s: any) => s.period === period
            );
            const chosen = currentMatchingSlot || data.slots[0];
            setPeriod(chosen.period);
            setStartTime(chosen.startTime);
            setEndTime(chosen.endTime);
            setHasSpecificTime(true);
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setIsCheckingTimetable(false);
        console.error("Timetable check failed", err);
      });

    return () => {
      isMounted = false;
    };
  }, [date, subjectId, groupId, isOpen, period]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setUploadError("Soubor je příliš velký (maximum je 50 MB).");
      return;
    }

    setIsUploadingFile(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || "Nahrávání souboru selhalo.");
      } else {
        setAttachmentUrl(data.url);
        setAttachmentName(data.name || file.name);
      }
    } catch (err: any) {
      setUploadError(err?.message || "Chyba při komunikaci se serverem.");
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeAttachment = () => {
    setAttachmentUrl("");
    setAttachmentName("");
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError("Vyplňte prosím název události.");
      return;
    }

    const requiresTimetableLesson = type === "TEST";

    if (subjectId !== "none" && requiresTimetableLesson && timetableError) {
      setFormError("Nelze uložit: Test/písemka musí být v den, kdy se předmět vyučuje v rozvrhu.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        title: title.trim(),
        type,
        date,
        subjectId: subjectId === "none" ? null : subjectId,
        groupId: groupId === "ALL" ? null : groupId,
        hasSpecificTime,
        startTime: hasSpecificTime ? startTime : null,
        endTime: hasSpecificTime ? endTime : null,
        period: subjectId !== "none" && period ? period : null,
        description: description.trim() || null,
        attachmentUrl: attachmentUrl.trim() || null,
        attachmentName: attachmentName.trim() || null,
        weight: weight !== "" && !isNaN(Number(weight)) ? Number(weight) : null,
      };

      if (!editEvent && recurrenceType !== "NONE") {
        payload.recurrenceType = recurrenceType;
        payload.untilEndOfSchoolYear = untilEndOfSchoolYear;
        payload.recurrenceCount = recurrenceCount;
      }

      const url = editEvent ? `/api/events/${editEvent.id}` : "/api/events";
      const method = editEvent ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Při ukládání došlo k chybě.");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onSaved();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setFormError(err?.message || "Chyba připojení k serveru.");
    }
  };

  const isTestBlocked = type === "TEST" && subjectId !== "none" && !!timetableError;
  const isSaveDisabled = isSubmitting || isCheckingTimetable || isTestBlocked;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-white dark:bg-[#131738] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-[#23295C] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header (Sticky top) */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#1F2554] flex items-center justify-between bg-slate-50 dark:bg-[#0D0F26] shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {editEvent ? "Upravit školní událost" : "Přidat novou událost"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Písemka, domácí úkol, deadline projektu nebo třídní akce
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#1C2152] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Event Type Switcher */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Typ události
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType("TEST")}
                className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center space-x-1.5 transition ${
                  type === "TEST"
                    ? "bg-rose-500/15 border-rose-500 text-rose-500 dark:text-rose-400 ring-2 ring-rose-500/30"
                    : "bg-white dark:bg-[#0D0F26] border-slate-200 dark:border-[#23295C] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1C2152]"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Písemka</span>
              </button>
              <button
                type="button"
                onClick={() => setType("HOMEWORK")}
                className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center space-x-1.5 transition ${
                  type === "HOMEWORK" || type === "DEADLINE"
                    ? "bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/30"
                    : "bg-white dark:bg-[#0D0F26] border-slate-200 dark:border-[#23295C] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1C2152]"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Úkol</span>
              </button>
              <button
                type="button"
                onClick={() => setType("OTHER")}
                className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center space-x-1.5 transition ${
                  type === "OTHER"
                    ? "bg-violet-500/15 border-violet-500 text-violet-700 dark:text-violet-400 ring-2 ring-violet-500/30"
                    : "bg-white dark:bg-[#0D0F26] border-slate-200 dark:border-[#23295C] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1C2152]"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                <span>Ostatní</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Název události *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="např. Čtvrtletní práce ze stereometrie, Referát..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-[#2A316E] bg-white dark:bg-[#0D0F26] text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DDA300]"
            />
          </div>

          {/* Grade Weight (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Předpokládaná váha známky <span className="font-normal lowercase text-slate-400 dark:text-slate-500">(volitelné)</span>
              </label>
              {weight !== "" && (
                <button
                  type="button"
                  onClick={() => setWeight("")}
                  className="text-[11px] text-slate-400 hover:text-rose-500 transition"
                >
                  Zrušit váhu
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max="100"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="např. 5 nebo 10"
                className="w-32 px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2A316E] bg-white dark:bg-[#0D0F26] text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DDA300]"
              />
              <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                {[1, 2, 3, 5, 8, 10].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWeight(w)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
                      Number(weight) === w
                        ? "bg-[#DDA300] border-[#DDA300] text-[#0D0F26] font-bold"
                        : "bg-slate-100 dark:bg-[#0D0F26] border-slate-200 dark:border-[#2A316E] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#1C2152]"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Subject & Group Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Předmět
              </label>
              <select
                value={subjectId}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-[#2A316E] bg-white dark:bg-[#0D0F26] text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DDA300]"
              >
                <option value="none">Bez předmětu (např. exkurze, volno)</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Skupina studentů
              </label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-[#2A316E] bg-white dark:bg-[#0D0F26] text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DDA300]"
              >
                <option value="ALL">Celá třída (všichni)</option>
                {groups
                  .filter((g) => !g.isDefaultAll)
                  .map((grp) => (
                    <option key={grp.id} value={grp.id}>
                      {grp.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Date Picker & Recurrence Row */}
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Datum události *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-[#2A316E] bg-white dark:bg-[#0D0F26] text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DDA300]"
                />
              </div>

              {/* Recurrence Option (Only for new events) */}
              {!editEvent ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                    <Repeat className="w-3.5 h-3.5 text-[#DDA300]" />
                    <span>Opakování události</span>
                  </label>
                  <select
                    value={recurrenceType}
                    onChange={(e) => setRecurrenceType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-[#2A316E] bg-white dark:bg-[#0D0F26] text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DDA300]"
                  >
                    <option value="NONE">Neopakovat (jednorázově)</option>
                    <option value="WEEKLY">Každý týden</option>
                    <option value="BIWEEKLY">Každé 2 týdny (ob týden)</option>
                    <option value="MONTHLY">Každý měsíc</option>
                  </select>
                </div>
              ) : (
                <div />
              )}
            </div>

            {/* Recurrence count options if active */}
            {!editEvent && recurrenceType !== "NONE" && (
              <div className="mt-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-amber-800 dark:text-amber-300 font-bold">
                    Trvání opakování:
                  </span>
                  <div className="inline-flex items-center rounded-lg border border-amber-500/30 p-0.5 bg-white dark:bg-[#0D0F26]">
                    <button
                      type="button"
                      onClick={() => setUntilEndOfSchoolYear(true)}
                      className={`px-2.5 py-1 rounded-md font-bold transition text-xs ${
                        untilEndOfSchoolYear
                          ? "bg-[#DDA300] text-[#0D0F26] shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      ♾️ Nekonečně (do konce šk. roku)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUntilEndOfSchoolYear(false)}
                      className={`px-2.5 py-1 rounded-md font-bold transition text-xs ${
                        !untilEndOfSchoolYear
                          ? "bg-[#DDA300] text-[#0D0F26] shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      Zvolit počet termínů
                    </button>
                  </div>
                </div>

                {!untilEndOfSchoolYear ? (
                  <div className="flex items-center justify-between pt-1 border-t border-amber-500/20">
                    <span className="text-slate-600 dark:text-slate-400">Přesný počet opakování:</span>
                    <select
                      value={recurrenceCount}
                      onChange={(e) => setRecurrenceCount(Number(e.target.value))}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#0D0F26] border border-amber-500/30 text-slate-900 dark:text-white font-bold"
                    >
                      <option value={2}>2× (původní + 1 opakování)</option>
                      <option value={3}>3× (celkem 3 termíny)</option>
                      <option value={4}>4× (celkem 4 termíny)</option>
                      <option value={5}>5× (celkem 5 termínů)</option>
                      <option value={6}>6× (celkem 6 termínů)</option>
                      <option value={8}>8× (celkem 8 termínů)</option>
                      <option value={10}>10× (celkem 10 termínů)</option>
                      <option value={15}>15× (celkem 15 termínů)</option>
                      <option value={20}>20× (celkem 20 termínů)</option>
                    </select>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300/80">
                    💡 Událost se automaticky vygeneruje pro každý příslušný týden až do konce školního roku (do 30. června).
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Timetable Validation Notice / Slot Selector */}
          {subjectId !== "none" && (
            <div className="rounded-2xl border border-slate-200 dark:border-[#23295C] p-3.5 text-xs sm:text-sm bg-slate-50 dark:bg-[#0D0F26]/70 transition-all">
              {isCheckingTimetable ? (
                <div className="flex items-center space-x-2 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-[#DDA300]" />
                  <span>Ověřuji rozvrh hodin pro vybraný den...</span>
                </div>
              ) : timetableError ? (
                type === "TEST" ? (
                  <div className="text-rose-600 dark:text-rose-400 -m-3.5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold block">
                          Test nelze naplánovat na tento den:
                        </strong>
                        <span>{timetableError}</span>
                        <p className="mt-1 text-[11px] text-rose-500/80">
                          Písemky a testy lze vkládat pouze v dny, kdy má třída / skupina tento předmět v rozvrhu.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-amber-700 dark:text-amber-400 -m-3.5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold block">
                          Předmět v tento den nemá vyučovací hodinu
                        </strong>
                        <span>{timetableError}</span>
                        <p className="mt-1 text-[11px] text-amber-700/80 dark:text-amber-400/80">
                          Protože jde o <strong>{type === "OTHER" ? "událost" : "úkol"}</strong>, můžete jej bez problému uložit (např. odevzdání o půlnoci nebo o víkendu). Čas a učebna se nebudou zobrazovat.
                        </p>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Předmět nalezen v rozvrhu! Vyberte vyučovací hodinu:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {availableSlots.map((slot) => {
                      const isSelected = period === slot.period;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => {
                            setPeriod(slot.period);
                            setStartTime(slot.startTime);
                            setEndTime(slot.endTime);
                            setHasSpecificTime(true);
                          }}
                          className={`p-2.5 rounded-xl text-left border text-xs transition ${
                            isSelected
                              ? "bg-[#DDA300]/15 border-[#DDA300] text-[#0D0F26] dark:text-white ring-2 ring-[#DDA300]/30"
                              : "bg-white dark:bg-[#131738] border-slate-200 dark:border-[#23295C] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1C2152]"
                          }`}
                        >
                          <div className="font-extrabold flex items-center justify-between">
                            <span>{slot.period}. hodina</span>
                            <span className="font-mono text-slate-500 dark:text-slate-400 font-normal">
                              {slot.startTime} - {slot.endTime}
                            </span>
                          </div>
                          {slot.room && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Učebna: {slot.room}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom Time Options (if Bez předmětu) */}
          {subjectId === "none" && (
            <div className="bg-slate-50 dark:bg-[#0D0F26]/70 p-3.5 rounded-2xl border border-slate-200 dark:border-[#23295C] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Přesný čas události
                </span>
                <label className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasSpecificTime}
                    onChange={(e) => setHasSpecificTime(e.target.checked)}
                    className="rounded-sm text-[#DDA300] focus:ring-[#DDA300] w-4 h-4"
                  />
                  <span>Určit čas (jinak celodenní)</span>
                </label>
              </div>

              {hasSpecificTime && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                      Od (hh:mm)
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-[#2A316E] bg-white dark:bg-[#131738] text-slate-900 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                      Do (hh:mm)
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-[#2A316E] bg-white dark:bg-[#131738] text-slate-900 dark:text-white text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Description / Topics */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Popis, rozsah látky a pokyny
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="např. Kapitola 4, strany 50-65. Vzorečky povoleny. Nezapomenout pravítko."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-[#2A316E] bg-white dark:bg-[#0D0F26] text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DDA300]"
            />
          </div>

          {/* Attachments & Links (File upload or Teams / Web link) */}
          <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-[#23295C]">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-[#DDA300]" />
                  <span>Příloha souboru</span>
                </span>
                <span className="text-[11px] lowercase font-normal text-slate-400">
                  (PDF, Word, obrázky do 50 MB)
                </span>
              </label>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
              />

              {attachmentUrl && (attachmentName || attachmentUrl.startsWith("/api/uploads/")) ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
                  <div className="flex items-center space-x-2.5 truncate mr-2">
                    <FileCheck className="w-5 h-5 text-[#DDA300] shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-slate-900 dark:text-white truncate block">
                        {attachmentName || "Nahraný soubor"}
                      </span>
                      <a
                        href={attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[#DDA300] hover:underline"
                      >
                        Zkontrolovat / otevřít soubor
                      </a>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeAttachment}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition shrink-0 cursor-pointer"
                    title="Odebrat přílohu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isUploadingFile}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 px-4 border border-dashed border-slate-300 dark:border-[#2A316E] hover:border-[#DDA300] dark:hover:border-[#DDA300] rounded-xl flex items-center justify-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1C2152]/50 transition group cursor-pointer"
                >
                  {isUploadingFile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#DDA300]" />
                      <span>Nahrávám soubor na server...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4 text-slate-400 group-hover:text-[#DDA300] transition" />
                      <span>Klikněte pro nahrání souboru ze zařízení</span>
                    </>
                  )}
                </button>
              )}

              {uploadError && (
                <p className="mt-1.5 text-xs text-rose-500 flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{uploadError}</span>
                </p>
              )}
            </div>

            {/* Microsoft Teams or Web link */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-blue-500" />
                <span>Odkaz na materiály / Microsoft Teams</span>
              </label>
              <input
                type="url"
                value={attachmentName ? "" : attachmentUrl}
                disabled={!!attachmentName && attachmentUrl.startsWith("/api/uploads/")}
                onChange={(e) => {
                  setAttachmentUrl(e.target.value);
                  setAttachmentName("");
                }}
                placeholder="https://teams.microsoft.com/l/... nebo webový odkaz"
                className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-[#2A316E] bg-white dark:bg-[#0D0F26] text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DDA300] ${
                  attachmentName && attachmentUrl.startsWith("/api/uploads/")
                    ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900"
                    : ""
                }`}
              />
              {attachmentName && attachmentUrl.startsWith("/api/uploads/") && (
                <p className="text-[11px] text-slate-400 mt-1">
                  (Aktuálně je přiložen nahraný soubor výše. Pro zadání odkazu na Teams nejdříve odeberte nahraný soubor.)
                </p>
              )}
            </div>
          </div>

          </div>

          {/* Action buttons (Sticky footer) */}
          <div className="p-4 sm:px-6 bg-slate-50 dark:bg-[#0D0F26] border-t border-slate-200 dark:border-[#1F2554] flex items-center justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1C2152] rounded-xl transition"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={isSaveDisabled}
              className={`px-5 py-2.5 text-sm font-bold rounded-xl shadow-md transition flex items-center space-x-1.5 ${
                isSaveDisabled
                  ? "bg-slate-300 dark:bg-[#1F2554] cursor-not-allowed text-slate-500 shadow-none"
                  : "bg-[#DDA300] hover:bg-[#c99500] text-[#0D0F26] active:scale-[0.98]"
              }`}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin text-[#0D0F26]" />}
              <span>{editEvent ? "Uložit změny" : "Vytvořit událost"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
