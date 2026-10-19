"use client";

import React, { useCallback, useEffect, useState } from "react";
import { X, Bot, Copy, Check, Trash2, KeyRound } from "lucide-react";

interface ApiTokenItem {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface AiAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("cs-CZ", { dateStyle: "medium", timeStyle: "short" }) : "nikdy";

export const AiAccessModal: React.FC<AiAccessModalProps> = ({ isOpen, onClose }) => {
  const [tokens, setTokens] = useState<ApiTokenItem[]>([]);
  const [name, setName] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/tokens");
    if (res.ok) setTokens((await res.json()).tokens);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/tokens")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setTokens(data.tokens));
  }, [isOpen]);

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const handleClose = () => {
    setNewToken(null);
    setError("");
    onClose();
  };
  const mcpUrl = `${origin}/api/mcp`;
  const tokenForCmd = newToken || "<VÁŠ_TOKEN>";
  const claudeCodeCmd = `claude mcp add --transport http terminovka ${mcpUrl} --header "Authorization: Bearer ${tokenForCmd}"`;

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const createToken = async () => {
    setError("");
    const res = await fetch("/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Token se nepodařilo vytvořit");
      return;
    }
    setNewToken(data.token);
    setName("");
    load();
  };

  const revoke = async (id: string) => {
    if (!confirm("Zrušit tento token? AI, která ho používá, přestane fungovat.")) return;
    await fetch(`/api/tokens/${id}`, { method: "DELETE" });
    load();
  };

  const codeBox =
    "relative p-3 pr-10 rounded-lg bg-slate-100 dark:bg-[#0D0F26] border border-slate-200 dark:border-[#23295C] text-xs font-mono break-all text-slate-800 dark:text-slate-200";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#131738] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-[#23295C] overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#1F2554] flex items-center justify-between bg-slate-50 dark:bg-[#0D0F26] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-[#DDA300]/10 text-[#DDA300]">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Přístup pro AI (MCP)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nech Clauda číst a spravovat termíny jako ty
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#1C2152] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-sm text-slate-700 dark:text-slate-300">
          <p>
            AI se připojí přes osobní token a má <strong>stejná oprávnění jako ty</strong> – zakládá a upravuje
            události pod tvým jménem a platí stejná pravidla jako ve webu (např. test jen v den výuky).
            Token nikomu nesdílej.
          </p>

          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">1. Vytvoř token</div>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder="Název (např. Claude Code na notebooku)"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-[#222752] bg-white dark:bg-[#0D0F26] text-sm"
              />
              <button
                onClick={createToken}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#0D0F26] dark:bg-white text-white dark:text-[#0D0F26] text-xs sm:text-sm font-bold hover:opacity-90 transition"
              >
                <KeyRound className="w-4 h-4" />
                <span>Vytvořit</span>
              </button>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            {newToken && (
              <div className="space-y-1">
                <p className="text-xs text-amber-600 dark:text-[#DDA300] font-bold">
                  Zkopíruj si ho hned – znovu se už nezobrazí.
                </p>
                <div className={codeBox}>
                  {newToken}
                  <button onClick={() => copy(newToken, "token")} className="absolute top-2.5 right-2.5 text-slate-500 hover:text-[#DDA300]">
                    {copied === "token" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">2. Připoj Clauda</div>
            <p className="text-xs">Adresa MCP serveru (Streamable HTTP, hlavička <code>Authorization: Bearer …</code>):</p>
            <div className={codeBox}>
              {mcpUrl}
              <button onClick={() => copy(mcpUrl, "url")} className="absolute top-2.5 right-2.5 text-slate-500 hover:text-[#DDA300]">
                {copied === "url" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs">Claude Code:</p>
            <div className={codeBox}>
              {claudeCodeCmd}
              <button onClick={() => copy(claudeCodeCmd, "cmd")} className="absolute top-2.5 right-2.5 text-slate-500 hover:text-[#DDA300]">
                {copied === "cmd" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Tvoje tokeny</div>
            {tokens.length === 0 ? (
              <p className="text-xs text-slate-500">Zatím žádné.</p>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-[#1F2554] border border-slate-200 dark:border-[#23295C] rounded-lg">
                {tokens.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="font-bold truncate">{t.name}</div>
                      <div className="text-xs text-slate-500">
                        {t.prefix}… · vytvořen {formatDate(t.createdAt)} · naposledy {formatDate(t.lastUsedAt)}
                      </div>
                    </div>
                    <button onClick={() => revoke(t.id)} title="Zrušit token" className="p-1.5 text-slate-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
