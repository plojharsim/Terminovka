import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ANON_SUB, CORS_HEADERS, corsPreflight, getAccessClaims, getOrigin } from "@/lib/oauth";
import { GET as eventsGET, POST as eventsPOST } from "@/app/api/events/route";
import { PUT as eventPUT, DELETE as eventDELETE } from "@/app/api/events/[id]/route";
import { GET as metaGET } from "@/app/api/meta/route";
import { validateEventAgainstTimetable } from "@/lib/timetable";
import { GET as checkGET } from "@/app/api/timetable/check/route";

// MCP server (Streamable HTTP, bezstavový, JSON odpovědi).
// Nástroje volají existující API handlery, takže platí stejná oprávnění
// a validace (kontrola rozvrhu u testů, práva autora/admina) jako ve webu.

export const dynamic = "force-dynamic";

const PROTOCOL_VERSION = "2025-03-26";
const ORIGIN = "http://internal";

type Json = Record<string, unknown>;
// Kontext tokenu: skupiny, které si uživatel vybral, a zda je nepřihlášený (jen čtení).
type Ctx = { groupIds: string[]; anonymous: boolean };

// Stejné pravidlo jako na webu: položka bez skupiny / pro celou třídu je vidět vždy,
// položka pro dělenou skupinu jen tomu, kdo v ní je.
const visible = (item: { groupId?: unknown; group?: Json | null }, ctx: Ctx) =>
  !item.groupId || Boolean(item.group?.isDefaultAll) || ctx.groupIds.includes(String(item.groupId));

const eventFields = {
  title: { type: "string", description: "Název události" },
  type: { type: "string", enum: ["TEST", "HOMEWORK", "DEADLINE", "OTHER"], description: "TEST = písemka (jen v den výuky předmětu), HOMEWORK = úkol, DEADLINE = termín odevzdání, OTHER = ostatní" },
  date: { type: "string", description: "Datum ve formátu YYYY-MM-DD" },
  subjectId: { type: "string", description: "ID předmětu (z get_overview), nebo vynechat" },
  groupId: { type: "string", description: "ID skupiny (z get_overview); vynechat nebo 'ALL' = celá třída" },
  period: { type: "number", description: "Vyučovací hodina 1–10. U TEST POVINNÁ: musí to být hodina, kdy se předmět ten den učí (viz check_timetable). Nikdy ji nehádej – zeptej se uživatele." },
  hasSpecificTime: { type: "boolean" },
  startTime: { type: "string", description: "HH:MM" },
  endTime: { type: "string", description: "HH:MM" },
  weight: { type: "number", description: "Předpokládaná váha známky 1–10" },
  description: { type: "string" },
  attachmentUrl: { type: "string", description: "Odkaz (např. Microsoft Teams)" },
  attachmentName: { type: "string" },
};

const TOOLS = [
  {
    name: "get_overview",
    description: "Přehled aplikace: předměty (s ID), skupiny uživatele (s ID), jeho rozvrh hodin, časy zvonění a aktuální typ týdne (sudý/lichý). Zavolej jako první, abys znal ID předmětů a skupin.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_events",
    description: "Vypíše události (testy, úkoly, termíny, akce), seřazené podle data. Vidíš jen události pro celou třídu a pro skupiny, které si uživatel při připojení vybral. Filtrovat lze podle období, typu, předmětu a textu.",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Od data YYYY-MM-DD (včetně)" },
        to: { type: "string", description: "Do data YYYY-MM-DD (včetně)" },
        type: { type: "string", enum: ["TEST", "HOMEWORK", "DEADLINE", "OTHER"] },
        subjectId: { type: "string" },
        search: { type: "string" },
      },
    },
  },
  {
    name: "check_timetable",
    description: "Ověří, zda se předmět (a skupina) v daný den podle rozvrhu vyučuje, a vrátí dostupné hodiny (slots). Použij před vytvořením testu a nabídni uživateli hodiny, ať jednu vybere.",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD" },
        subjectId: { type: "string" },
        groupId: { type: "string" },
      },
      required: ["date", "subjectId"],
    },
  },
  {
    name: "create_event",
    description: "Vytvoří událost jménem přihlášeného uživatele (u nepřihlášeného selže). Postup u TEST: zjisti předmět, datum a skupinu, zavolej check_timetable, nech UŽIVATELE vybrat konkrétní hodinu a teprve pak vytvoř; hodinu ani skupinu nikdy nevybírej za něj. Lze nastavit opakování (série se sdílí přes recurringId).",
    inputSchema: {
      type: "object",
      properties: {
        ...eventFields,
        recurrenceType: { type: "string", enum: ["NONE", "WEEKLY", "BIWEEKLY", "MONTHLY"] },
        recurrenceCount: { type: "number", description: "Počet výskytů (max 40)" },
        untilEndOfSchoolYear: { type: "boolean", description: "Opakovat do 30. 6." },
      },
      required: ["title", "type", "date"],
    },
  },
  {
    name: "update_event",
    description: "Upraví existující událost (nahradí všechna pole – předej celou událost, jak ji vrací list_events). Smí autor události nebo admin.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" }, ...eventFields },
      required: ["id", "title", "type", "date"],
    },
  },
  {
    name: "delete_event",
    description: "Smaže událost. U opakovaných událostí určuje scope: single (jen tuto), following (tuto a budoucí), all (celou sérii). Smí autor události nebo admin. Před smazáním se vždy zeptej uživatele.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        scope: { type: "string", enum: ["single", "following", "all"] },
      },
      required: ["id"],
    },
  },
];

type TimetableSlot = {
  period: number; startTime: string; endTime: string; room?: string | null;
  groupId: string | null; groupName?: string | null;
};

const describeSlots = (slots: TimetableSlot[]) =>
  slots
    .map((s) => `${s.period}. hodina (${s.startTime}–${s.endTime}${s.room ? `, ${s.room}` : ""}${s.groupName ? `, skupina ${s.groupName}` : ""})`)
    .join("; ");

// Stejně jako ve webovém formuláři musí být událost svázaná s konkrétní hodinou z rozvrhu.
// Web první hodinu předvybere, AI ale nesmí hádat – musí hodinu zvolit (a zeptat se uživatele).
// U testu je hodina povinná; u ostatních typů se ověří jen tehdy, když ji AI zadá.
async function prepareEventArgs(args: Json): Promise<Json> {
  const type = String(args.type || "");
  const date = String(args.date || "");
  const subjectId = typeof args.subjectId === "string" && args.subjectId !== "none" ? args.subjectId : null;
  const groupId = typeof args.groupId === "string" && args.groupId !== "ALL" ? args.groupId : null;
  const period = args.period != null && args.period !== "" ? Number(args.period) : null;

  if (type === "TEST" && !subjectId) {
    throw new Error("Test musí mít předmět (subjectId z get_overview). Zeptej se uživatele, z jakého předmětu test je.");
  }
  if (!subjectId || !date || (type !== "TEST" && period === null)) return args;

  const check = await validateEventAgainstTimetable(date, subjectId, groupId);
  if (!check.valid) {
    if (type === "TEST") throw new Error(check.message || "V tento den se předmět nevyučuje.");
    return args; // úkoly a ostatní lze uložit i mimo hodinu
  }
  const slots = check.slots as unknown as TimetableSlot[];

  if (period === null) {
    throw new Error(
      `Test musí být navázaný na konkrétní vyučovací hodinu. Zeptej se uživatele, na kterou, a zadej ji v poli period. Dostupné hodiny dne ${date}: ${describeSlots(slots)}.`
    );
  }

  const chosen = slots.filter((sl) => sl.period === period);
  if (chosen.length === 0) {
    throw new Error(`V den ${date} se předmět v ${period}. hodině nevyučuje. Dostupné hodiny: ${describeSlots(slots)}. Zeptej se uživatele, kterou zvolit.`);
  }

  // Předmět se tu učí po skupinách – bez zvolené skupiny nelze poznat, které se událost týká.
  const groupsInPeriod = new Set(chosen.map((sl) => sl.groupId).filter(Boolean));
  if (!groupId && groupsInPeriod.size > 1) {
    throw new Error(`V ${period}. hodině se předmět učí po skupinách (${describeSlots(chosen)}). Zeptej se uživatele, pro kterou skupinu událost je, a zadej groupId.`);
  }

  return { ...args, period, hasSpecificTime: true, startTime: chosen[0].startTime, endTime: chosen[0].endTime };
}

function req(path: string, method = "GET", body?: unknown, search?: Record<string, string | undefined>) {
  const url = new URL(path, ORIGIN);
  for (const [k, v] of Object.entries(search || {})) if (v) url.searchParams.set(k, v);
  return new NextRequest(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function unwrap(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as Json).error as string || (data as Json).message as string || `Chyba ${res.status}`);
  return data;
}

async function callTool(name: string, args: Json, ctx: Ctx) {
  if (ctx.anonymous && ["create_event", "update_event", "delete_event"].includes(name)) {
    throw new Error("Uživatel je připojen bez přihlášení, takže může termíny jen číst. Pro úpravy je nutné konektor odpojit a znovu připojit s přihlášením.");
  }
  const str = (k: string) => (typeof args[k] === "string" ? (args[k] as string) : undefined);
  switch (name) {
    case "get_overview": {
      const d = (await unwrap(await metaGET())) as Json;
      return {
        subjects: (d.subjects as Json[]).map((s) => ({ id: s.id, name: s.name, code: s.code, teacher: s.teacher })),
        groups: (d.groups as Json[])
          .filter((g) => g.isDefaultAll || ctx.groupIds.includes(String(g.id)))
          .map((g) => ({ id: g.id, name: g.name, code: g.code, isWholeClass: g.isDefaultAll })),
        loggedIn: !ctx.anonymous,
        scheduleSlots: (d.scheduleSlots as Json[]).filter((s) => visible(s as { groupId?: unknown; group?: Json | null }, ctx)).map((s) => ({
          day: s.dayOfWeek, period: s.period, start: s.startTime, end: s.endTime, room: s.room,
          weekType: s.weekType, subject: (s.subject as Json)?.code, group: (s.group as Json)?.code ?? null,
        })),
        periodTimes: d.periodTimes,
        currentWeekNumber: d.currentWeekNumber,
        currentWeekType: d.currentWeekType,
      };
    }
    case "list_events": {
      const d = (await unwrap(
        await eventsGET(req("/api/events", "GET", undefined, { type: str("type"), subjectId: str("subjectId"), search: str("search") }))
      )) as { events: Json[] };
      const from = str("from");
      const to = str("to");
      const events = d.events
        .filter((e) => visible(e as { groupId?: unknown; group?: Json | null }, ctx))
        .filter((e) => {
          const day = String(e.date).slice(0, 10);
          return (!from || day >= from) && (!to || day <= to);
        })
        .map((e) => ({
          id: e.id, title: e.title, type: e.type, date: String(e.date).slice(0, 10),
          period: e.period, startTime: e.startTime, endTime: e.endTime, weight: e.weight,
          subject: (e.subject as Json)?.name ?? null, subjectId: e.subjectId,
          group: (e.group as Json)?.name ?? null, groupId: e.groupId,
          description: e.description, attachmentUrl: e.attachmentUrl,
          recurringId: e.recurringId, createdBy: (e.createdBy as Json)?.name,
        }));
      return { count: events.length, events };
    }
    case "check_timetable":
      return unwrap(await checkGET(req("/api/timetable/check", "GET", undefined, { date: str("date"), subjectId: str("subjectId"), groupId: str("groupId") })));
    case "create_event": {
      const d = (await unwrap(await eventsPOST(req("/api/events", "POST", await prepareEventArgs(args))))) as Json;
      const ev = d.event as Json;
      return { created: d.count, id: ev.id, title: ev.title, date: String(ev.date).slice(0, 10), recurringId: ev.recurringId };
    }
    case "update_event": {
      const { id, ...rawBody } = args;
      const body = await prepareEventArgs(rawBody);
      const d = (await unwrap(await eventPUT(req(`/api/events/${id}`, "PUT", body), { params: Promise.resolve({ id: String(id) }) }))) as Json;
      const ev = d.event as Json;
      return { updated: true, id: ev.id, title: ev.title, date: String(ev.date).slice(0, 10) };
    }
    case "delete_event":
      await unwrap(await eventDELETE(req(`/api/events/${args.id}`, "DELETE", undefined, { scope: str("scope") }), { params: Promise.resolve({ id: String(args.id) }) }));
      return { deleted: true };
    default:
      throw new Error(`Neznámý nástroj: ${name}`);
  }
}

const rpcError = (id: unknown, code: number, message: string) =>
  ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

async function handle(msg: Json, ctx: Ctx) {
  const { id, method, params } = msg as { id?: unknown; method?: string; params?: Json };
  if (id === undefined) return null; // notifikace (např. notifications/initialized)

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0", id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: "terminovka", version: "1.0.0" },
          instructions: "Termínovka – školní systém písemek, úkolů a rozvrhu třídy 1.B SSPŠ. Začni get_overview. Data zadávej jako YYYY-MM-DD. Test lze uložit jen v den výuky předmětu a vždy s konkrétní hodinou, kterou vybral uživatel.",
        },
      };
    case "ping":
      return { jsonrpc: "2.0", id, result: {} };
    case "tools/list":
      return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
    case "tools/call": {
      try {
        const out = await callTool(String(params?.name), (params?.arguments as Json) || {}, ctx);
        return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] } };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Chyba";
        return { jsonrpc: "2.0", id, result: { isError: true, content: [{ type: "text", text: message }] } };
      }
    }
    default:
      return rpcError(id, -32601, `Metoda nenalezena: ${method}`);
  }
}

export async function POST(request: NextRequest) {
  // MCP vyžaduje OAuth access token (Authorization: Bearer …), ne cookie relaci.
  // Token může být i anonymní (nepřihlášený uživatel, jen čtení).
  const claims = await getAccessClaims(request);
  const authorized = claims && (claims.sub === ANON_SUB || (await getCurrentUser()));
  if (!claims || !authorized) {
    return NextResponse.json(rpcError(null, -32001, "Neautorizováno – použijte hlavičku Authorization: Bearer <access token>"), {
      status: 401,
      headers: {
        "WWW-Authenticate": `Bearer resource_metadata="${getOrigin(request)}/.well-known/oauth-protected-resource"`,
        ...CORS_HEADERS,
      },
    });
  }

  const ctx: Ctx = { groupIds: claims.groupIds, anonymous: claims.sub === ANON_SUB };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(rpcError(null, -32700, "Neplatný JSON"), { status: 400 });
  }

  if (Array.isArray(body)) {
    const results = (await Promise.all(body.map((m) => handle(m as Json, ctx)))).filter(Boolean);
    return results.length ? NextResponse.json(results) : new NextResponse(null, { status: 202 });
  }
  const result = await handle(body as Json, ctx);
  return result ? NextResponse.json(result) : new NextResponse(null, { status: 202 });
}

export async function GET() {
  return new NextResponse("MCP endpoint – použijte POST (Streamable HTTP).", { status: 405, headers: { Allow: "POST" } });
}

export const OPTIONS = corsPreflight;
