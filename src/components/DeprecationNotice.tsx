"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import { NEW_APP_NAME, NEW_APP_URL, OPEN_DEPRECATION_EVENT } from "@/lib/deprecation";

const STORAGE_KEY = "terminovka_deprecation_dismissed";
const CHANGE_EVENT = "terminovka:deprecation-changed";

function subscribe(cb: () => void) {
  window.addEventListener(CHANGE_EVENT, cb);
  return () => window.removeEventListener(CHANGE_EVENT, cb);
}
function readDismissed() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

// Zelený „čmouhový“ podtržený text jako v nové aplikaci
const Squiggle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="relative inline-block">
    {children}
    <svg
      aria-hidden
      viewBox="0 0 120 10"
      preserveAspectRatio="none"
      className="absolute left-0 -bottom-1.5 w-full h-2 text-[#1F8A5B] dark:text-[#6EDFA6]"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    >
      <path d="M2 6 C 20 1, 40 1, 60 5 S 100 9, 118 3" />
    </svg>
  </span>
);

const MiniPreview: React.FC = () => (
  <div
    aria-hidden
    className="rounded-[26px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#0c0c0d] shadow-2xl shadow-black/10 dark:shadow-black/50 overflow-hidden text-left select-none"
  >
    <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-black/5 dark:border-white/10 bg-neutral-50 dark:bg-[#161617]">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-white/15" />
        <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-white/15" />
        <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-white/15" />
        <span className="ml-2 px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
          skola.plojharsim.cz
        </span>
      </div>
      <div className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
        <span className="px-2.5 py-1 rounded-full bg-white dark:bg-black text-neutral-900 dark:text-white shadow-xs">Dnes</span>
        <span className="px-2.5 py-1">Rozvrh</span>
        <span className="px-2.5 py-1">Kalendář</span>
      </div>
    </div>

    <div className="p-4 sm:p-5">
      <div className="text-[11px] text-neutral-500 dark:text-neutral-400">Čtvrtek 22. října</div>
      <div className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
        Dobré ráno, <Squiggle>Jano</Squiggle>
      </div>

      <div className="mt-4 rounded-2xl bg-[#d6f1e3] dark:bg-[#1b3a2c] px-4 py-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[11px] text-neutral-600 dark:text-neutral-400">Právě probíhá</div>
            <div className="text-base font-bold text-neutral-900 dark:text-white">Fyzika</div>
          </div>
          <div className="text-xs font-semibold text-[#1F8A5B] dark:text-[#6EDFA6]">Zbývá 17 min</div>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div className="h-full w-2/3 rounded-full bg-[#1F8A5B] dark:bg-[#6EDFA6]" />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-3">
        <div className="col-span-5 sm:col-span-3 rounded-2xl border border-black/5 dark:border-white/10 divide-y divide-black/5 dark:divide-white/10">
          {[
            ["1. hodina", "Matematika", "S202", "#6B8BA4"],
            ["2. hodina", "Fyzika", "S105", "#E0A92B"],
            ["3. hodina", "Dějepis", "R405", "#9B6FD0"],
          ].map(([h, s, r, c]) => (
            <div key={h} className="flex items-center gap-3 px-3 py-2">
              <span className="w-0.5 h-7 rounded-full" style={{ background: c }} />
              <div className="w-16 text-[11px] text-neutral-500 dark:text-neutral-400">{h}</div>
              <div>
                <div className="text-xs font-semibold text-neutral-900 dark:text-white">{s}</div>
                <div className="text-[10px] text-neutral-500 dark:text-neutral-400">{r}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden sm:block col-span-2 rounded-2xl border border-black/5 dark:border-white/10 p-3">
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-2">Nejbližší testy</div>
          {[
            ["29", "Fyzika", "za 7 dní"],
            ["5", "Matematika", "za 14 dní"],
          ].map(([d, s, w]) => (
            <div key={s} className="flex items-center gap-2 mb-2 last:mb-0">
              <span className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-white/10 text-xs font-bold flex items-center justify-center text-neutral-900 dark:text-white">{d}</span>
              <div>
                <div className="text-xs font-semibold text-neutral-900 dark:text-white">{s}</div>
                <div className="text-[10px] text-neutral-500 dark:text-neutral-400">{w}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const DeprecationNotice: React.FC = () => {
  const pathname = usePathname();
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true);
  const [forceOpen, setForceOpen] = useState(false);
  // Na přihlašovací stránce AI konektoru popup nezobrazujeme, ať neblokuje autorizaci
  const enabled = !pathname.startsWith("/oauth");
  const open = enabled && (!dismissed || forceOpen);

  useEffect(() => {
    const onOpen = () => setForceOpen(true);
    window.addEventListener(OPEN_DEPRECATION_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_DEPRECATION_EVENT, onOpen);
  }, []);

  const close = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setForceOpen(false);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!enabled) return null;

  return (
    <>
      <div className="w-full bg-[#d6f1e3] dark:bg-[#1b3a2c] text-neutral-900 dark:text-white text-xs sm:text-sm px-4 py-2 text-center">
        <span className="font-semibold">Termínovka je zastaralá</span>
        <span className="hidden sm:inline"> a nové události v ní nelze přidávat</span> – nástupce:{" "}
        <a href={NEW_APP_URL} className="font-bold underline underline-offset-2 decoration-[#1F8A5B] dark:decoration-[#6EDFA6]">
          {NEW_APP_NAME}
        </a>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="deprecation-title"
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-6"
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div className="relative w-full max-w-4xl my-auto rounded-[32px] bg-[#f4f3ef] dark:bg-[#0a0a0b] text-neutral-900 dark:text-white shadow-2xl border border-black/5 dark:border-white/10 p-6 sm:p-10">
            <button
              onClick={close}
              aria-label="Zavřít a pokračovat jen pro čtení"
              className="absolute top-4 right-4 sm:top-5 sm:right-5 w-10 h-10 rounded-full bg-white dark:bg-white/10 border border-black/5 dark:border-white/10 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-center">
              <div>
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 text-xs sm:text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#1F8A5B] dark:bg-[#6EDFA6]" />
                  Termínovka je zastaralá
                </span>

                <h2
                  id="deprecation-title"
                  className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.04em] leading-[0.98]"
                >
                  Vaše třída.
                  <br />
                  Nový <Squiggle>domov</Squiggle>.
                </h2>

                <p className="mt-6 text-base sm:text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Termínovka se už nevyvíjí a <strong className="text-neutral-900 dark:text-white">nové události v ní nelze přidávat</strong>.
                  Její nástupce <strong className="text-neutral-900 dark:text-white">{NEW_APP_NAME}</strong> přináší rozvrh z Bakalářů,
                  společné úkoly a testy, kalendář, známky i poznámky z hodin na jednom místě.
                </p>

                <div className="mt-7 flex flex-col sm:flex-row gap-3">
                  <a
                    href={NEW_APP_URL}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-bold text-base hover:opacity-90 transition"
                  >
                    Přejít na Školu
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <button
                    onClick={close}
                    className="inline-flex items-center justify-center px-6 py-3.5 rounded-full border border-black/15 dark:border-white/20 bg-white/60 dark:bg-transparent font-bold text-base hover:bg-white dark:hover:bg-white/10 transition"
                  >
                    Pokračovat jen pro čtení
                  </button>
                </div>
                <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-500">
                  Stávající termíny si tu můžete dál prohlížet.
                </p>
              </div>

              <MiniPreview />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
