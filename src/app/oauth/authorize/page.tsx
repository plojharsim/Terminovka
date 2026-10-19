"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bot } from "lucide-react";

interface ConsentInfo {
  client: { name: string; host: string };
  user: { name: string; email: string } | null;
  groups: { id: string; name: string; code: string }[];
}

function AuthorizeForm() {
  const params = useSearchParams();
  const [info, setInfo] = useState<ConsentInfo | null>(null);
  const [fatal, setFatal] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [showLogin, setShowLogin] = useState(false);

  const redirectUri = params.get("redirect_uri") || "";

  useEffect(() => {
    const q = new URLSearchParams({
      client_id: params.get("client_id") || "",
      redirect_uri: redirectUri,
    });
    fetch(`/api/oauth/authorize?${q}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Neplatný požadavek");
        setInfo(data);
        // Předvyplníme skupiny, které má uživatel zvolené přímo na webu Termínovky
        try {
          const saved = JSON.parse(localStorage.getItem("terminovka_selected_groups") || "[]");
          if (Array.isArray(saved)) {
            setSelected(saved.filter((id: string) => data.groups.some((g: { id: string }) => g.id === id)));
          }
        } catch {}
      })
      .catch((e) => setFatal(e.message));
  }, [params, redirectUri]);

  const approve = async (mode: "session" | "credentials" | "anonymous") => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/oauth/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: params.get("client_id"),
          redirect_uri: redirectUri,
          response_type: params.get("response_type"),
          code_challenge: params.get("code_challenge"),
          code_challenge_method: params.get("code_challenge_method"),
          state: params.get("state"),
          groups: selected,
          ...(mode === "credentials" ? { email, password } : {}),
          ...(mode === "anonymous" ? { anonymous: true } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chyba");
      window.location.href = data.redirect;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba");
      setBusy(false);
    }
  };

  const deny = () => {
    const url = new URL(redirectUri);
    url.searchParams.set("error", "access_denied");
    const state = params.get("state");
    if (state) url.searchParams.set("state", state);
    window.location.href = url.toString();
  };

  const input =
    "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-[#222752] bg-white dark:bg-[#0D0F26] text-sm text-slate-900 dark:text-white";

  return (
    <div className="w-full max-w-md bg-white dark:bg-[#131738] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#23295C] overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 dark:border-[#1F2554] bg-slate-50 dark:bg-[#0D0F26] flex items-center space-x-2.5">
        <div className="p-2 rounded-xl bg-amber-50 dark:bg-[#DDA300]/10 text-[#DDA300]">
          <Bot className="w-5 h-5" />
        </div>
        <h1 className="text-base font-bold text-slate-900 dark:text-white">Termínovka – povolit přístup</h1>
      </div>

      <div className="p-5 space-y-4 text-sm text-slate-700 dark:text-slate-300">
        {fatal ? (
          <p className="text-red-500">{fatal}</p>
        ) : !info ? (
          <p>Načítání…</p>
        ) : (
          <>
            <p>
              Aplikace <strong>{info.client.name}</strong> ({info.client.host}) chce přistupovat k termínům
              v Termínovce. Přihlášený uživatel má stejná oprávnění jako na webu.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Moje skupiny</span>
                <span className="text-xs space-x-2">
                  <button type="button" className="text-[#DDA300] hover:underline" onClick={() => setSelected(info.groups.map((g) => g.id))}>vše</button>
                  <button type="button" className="text-[#DDA300] hover:underline" onClick={() => setSelected([])}>žádné</button>
                </span>
              </div>
              <p className="text-xs text-slate-500">
                AI uvidí události a rozvrh pro celou třídu a pro vybrané skupiny, nic dalšího.
              </p>
              <div className="max-h-44 overflow-y-auto grid grid-cols-2 gap-1.5 p-2 rounded-lg border border-slate-200 dark:border-[#23295C]">
                {info.groups.map((g) => (
                  <label key={g.id} className="flex items-center space-x-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.includes(g.id)}
                      onChange={(e) =>
                        setSelected((cur) => (e.target.checked ? [...cur, g.id] : cur.filter((id) => id !== g.id)))
                      }
                    />
                    <span>{g.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {info.user ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Přihlášen jako <strong>{info.user.name}</strong> ({info.user.email})
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={busy}
                    onClick={() => approve("session")}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-[#0D0F26] dark:bg-white text-white dark:text-[#0D0F26] text-sm font-bold hover:opacity-90 disabled:opacity-50"
                  >
                    Povolit
                  </button>
                  <button
                    disabled={busy}
                    onClick={deny}
                    className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-[#222752] text-sm font-bold"
                  >
                    Zamítnout
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => approve("anonymous")}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-[#0D0F26] dark:bg-white text-white dark:text-[#0D0F26] text-sm font-bold hover:opacity-90 disabled:opacity-50"
                  >
                    Pokračovat bez přihlášení
                  </button>
                  <button type="button" disabled={busy} onClick={deny} className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-[#222752] text-sm font-bold">
                    Zamítnout
                  </button>
                </div>
                <p className="text-xs text-slate-500">Bez přihlášení může AI termíny jen číst.</p>

                {!showLogin ? (
                  <button type="button" onClick={() => setShowLogin(true)} className="text-xs text-[#DDA300] hover:underline font-bold">
                    Přihlásit se, aby AI mohla termíny i zakládat a upravovat
                  </button>
                ) : (
                  <form
                    className="space-y-3 pt-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      approve("credentials");
                    }}
                  >
                    <input className={input} type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
                    <input className={input} type="password" placeholder="Heslo" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full px-4 py-2.5 rounded-lg border border-[#DDA300] text-[#DDA300] text-sm font-bold hover:bg-[#DDA300]/10 disabled:opacity-50"
                    >
                      Přihlásit a povolit
                    </button>
                  </form>
                )}
              </div>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
            <p className="text-xs text-slate-500">Přístup můžeš kdykoliv odebrat odpojením konektoru v Claude.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthorizePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100 dark:bg-[#0D0F26]">
      <Suspense fallback={null}>
        <AuthorizeForm />
      </Suspense>
    </div>
  );
}
