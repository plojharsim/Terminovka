"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bot } from "lucide-react";

interface ConsentInfo {
  client: { name: string; host: string };
  user: { name: string; email: string } | null;
}

function AuthorizeForm() {
  const params = useSearchParams();
  const [info, setInfo] = useState<ConsentInfo | null>(null);
  const [fatal, setFatal] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
      })
      .catch((e) => setFatal(e.message));
  }, [params, redirectUri]);

  const approve = async (useCredentials: boolean) => {
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
          ...(useCredentials ? { email, password } : {}),
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
              Aplikace <strong>{info.client.name}</strong> ({info.client.host}) chce číst a spravovat termíny
              v Termínovce <strong>jako ty</strong> – se stejnými oprávněními jako máš na webu.
            </p>

            {info.user ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Přihlášen jako <strong>{info.user.name}</strong> ({info.user.email})
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={busy}
                    onClick={() => approve(false)}
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
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  approve(true);
                }}
              >
                <input className={input} type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
                <input className={input} type="password" placeholder="Heslo" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-[#0D0F26] dark:bg-white text-white dark:text-[#0D0F26] text-sm font-bold hover:opacity-90 disabled:opacity-50"
                  >
                    Přihlásit a povolit
                  </button>
                  <button type="button" disabled={busy} onClick={deny} className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-[#222752] text-sm font-bold">
                    Zamítnout
                  </button>
                </div>
              </form>
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
