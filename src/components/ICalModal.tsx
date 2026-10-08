"use client";

import React, { useState, useEffect } from "react";
import { StudentGroup } from "@/types";
import {
  X,
  CalendarCheck,
  Copy,
  Check,
  Download,
  ExternalLink,
  Smartphone,
  Laptop,
  CheckSquare,
  Square,
  Sparkles,
} from "lucide-react";

interface ICalModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: StudentGroup[];
  selectedGroupIds: string[];
  onOpenGroupModal: () => void;
}

export const ICalModal: React.FC<ICalModalProps> = ({
  isOpen,
  onClose,
  groups,
  selectedGroupIds,
  onOpenGroupModal,
}) => {
  // Only divided/specific groups (whole class is always automatically included)
  const dividedGroups = groups.filter((g) => !g.isDefaultAll);

  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Selected divided groups according to the user's global settings
  const userDividedGroupIds = selectedGroupIds.filter((id) =>
    dividedGroups.some((dg) => dg.id === id)
  );

  // Build the iCal query string from global selectedGroupIds:
  // If user selected some divided groups, pass them.
  const groupQuery =
    userDividedGroupIds.length > 0 ? `groups=${userDividedGroupIds.join(",")}` : "";
  const feedPath = `/api/ical${groupQuery ? `?${groupQuery}` : ""}`;
  const absoluteHttpUrl = `${origin}${feedPath}`;
  const webcalUrl = absoluteHttpUrl.replace(/^https?:\/\//, "webcal://");
  const googleCalendarUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(
    webcalUrl
  )}`;
  const downloadUrl = `${origin}/api/ical?download=1${
    groupQuery ? `&${groupQuery}` : ""
  }`;

  const handleCopy = () => {
    navigator.clipboard.writeText(absoluteHttpUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Find human-readable names of currently chosen groups
  const chosenGroupNames = dividedGroups
    .filter((g) => userDividedGroupIds.includes(g.id))
    .map((g) => g.name);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#131738] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-[#23295C] overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header (Sticky top) */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#1F2554] flex items-center justify-between bg-slate-50 dark:bg-[#0D0F26] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-[#DDA300]/10 text-[#DDA300]">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Přidat kalendář do mobilu (iCal)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Živý kalendář s automatickou synchronizací termínů
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

        {/* Content (Scrollable) */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Group Status Info based on user's central preferences */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0D0F26] border border-slate-200 dark:border-[#23295C] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                <span className="text-[#DDA300] font-black text-sm">✓</span>
                <span>Zahrnuté skupiny ve vašem exportu:</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {userDividedGroupIds.length === 0 ? (
                  <span>Pouze společné termíny pro celou třídu</span>
                ) : userDividedGroupIds.length === dividedGroups.length ? (
                  <span>Celá třída + všechny dělené skupiny ({userDividedGroupIds.length})</span>
                ) : (
                  <span>
                    Celá třída + vybrané skupiny:{" "}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {chosenGroupNames.join(", ")}
                    </strong>
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenGroupModal();
              }}
              className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#DDA300]/40 bg-[#DDA300]/10 hover:bg-[#DDA300]/20 text-[#DDA300] text-xs font-bold transition shrink-0 self-start sm:self-center"
            >
              <span>Změnit skupiny v menu</span>
            </button>
          </div>

          {/* Step 2: Instant Subscription Buttons */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
              2. Přidat odběr jedním kliknutím:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Apple Calendar (iOS / Mac) */}
              <a
                href={webcalUrl}
                className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-[#0D0F26] hover:bg-[#181D46] border border-[#23295C] text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-[0.98]"
              >
                <Smartphone className="w-4 h-4 text-[#DDA300]" />
                <span>Apple Kalendář (iPhone / Mac)</span>
              </a>

              {/* Google Calendar */}
              <a
                href={googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-[0.98]"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Google Kalendář</span>
              </a>
            </div>
          </div>

          {/* Step 3: Copy Feed URL or Download */}
          <div className="bg-slate-50 dark:bg-[#0D0F26] p-4 rounded-2xl border border-slate-200 dark:border-[#23295C] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Osobní URL odkaz kalendáře:
              </span>
              <a
                href={downloadUrl}
                download="terminovka_1b_ssps.ics"
                className="inline-flex items-center space-x-1 text-xs text-[#DDA300] hover:underline font-bold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Stáhnout .ICS</span>
              </a>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={absoluteHttpUrl}
                className="w-full bg-white dark:bg-[#131738] px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2A316E] text-xs font-mono text-slate-600 dark:text-slate-300 truncate focus:outline-hidden"
              />
              <button
                onClick={handleCopy}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shrink-0 ${
                  copied
                    ? "bg-emerald-500 text-white"
                    : "bg-[#DDA300] hover:bg-[#c99500] text-[#0D0F26]"
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Zkopírováno!" : "Kopírovat"}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              💡 Kalendář se přidá jako automaticky synchronizovaný odběr. Kdykoliv editor přidá nový test, objeví se vám v mobilu i s upozorněním předem.
            </p>
          </div>
        </div>

        {/* Footer (Sticky bottom) */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-[#1F2554] flex justify-end bg-slate-50 dark:bg-[#0D0F26] shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs sm:text-sm font-bold bg-[#DDA300] hover:bg-[#c99500] text-[#0D0F26] rounded-xl shadow-xs transition"
          >
            Hotovo, zavřít
          </button>
        </div>
      </div>
    </div>
  );
};
