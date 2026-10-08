import { EventType } from "@/types";

export const EVENT_TYPE_CONFIG: Record<
  EventType,
  {
    label: string;
    pluralLabel: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    colorHex: string;
    dotBg: string;
  }
> = {
  TEST: {
    label: "Písemka / Test",
    pluralLabel: "Písemky a testy",
    badgeBg: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
    badgeText: "text-rose-700",
    badgeBorder: "border-rose-200 dark:border-rose-900/60",
    colorHex: "#e11d48",
    dotBg: "bg-rose-500",
  },
  HOMEWORK: {
    label: "Úkol",
    pluralLabel: "Úkoly",
    badgeBg: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    badgeText: "text-blue-700",
    badgeBorder: "border-blue-200 dark:border-blue-900/60",
    colorHex: "#2563eb",
    dotBg: "bg-blue-500",
  },
  DEADLINE: {
    label: "Úkol",
    pluralLabel: "Úkoly",
    badgeBg: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    badgeText: "text-blue-700",
    badgeBorder: "border-blue-200 dark:border-blue-900/60",
    colorHex: "#2563eb",
    dotBg: "bg-blue-500",
  },
  OTHER: {
    label: "Ostatní událost",
    pluralLabel: "Ostatní události",
    badgeBg: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
    badgeText: "text-violet-700",
    badgeBorder: "border-violet-200 dark:border-violet-900/60",
    colorHex: "#7c3aed",
    dotBg: "bg-violet-500",
  },
};

const CZ_MONTHS = [
  "ledna",
  "února",
  "března",
  "dubna",
  "května",
  "června",
  "července",
  "srpna",
  "září",
  "října",
  "listopadu",
  "prosince",
];

const CZ_DAYS_SHORT = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
const CZ_DAYS_LONG = [
  "Neděle",
  "Pondělí",
  "Úterý",
  "Středa",
  "Čtvrtek",
  "Pátek",
  "Sobota",
];

export function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getEventDateString(dateInput: string | Date): string {
  if (typeof dateInput === "string") {
    return dateInput.slice(0, 10);
  }
  return toLocalDateString(dateInput);
}

export function formatCzechDate(dateInput: string | Date): string {
  if (typeof dateInput === "string" && dateInput.length >= 10) {
    const [year, month, day] = dateInput.slice(0, 10).split("-").map(Number);
    return `${day}. ${CZ_MONTHS[month - 1]} ${year}`;
  }
  const d = new Date(dateInput);
  return `${d.getDate()}. ${CZ_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatCzechDateShort(dateInput: string | Date): string {
  if (typeof dateInput === "string" && dateInput.length >= 10) {
    const [year, month, day] = dateInput.slice(0, 10).split("-").map(Number);
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    return `${CZ_DAYS_SHORT[dayOfWeek]} ${day}. ${month}.`;
  }
  const d = new Date(dateInput);
  return `${CZ_DAYS_SHORT[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}.`;
}

export function getDayNameLong(dayOfWeekIndex: number): string {
  return CZ_DAYS_LONG[dayOfWeekIndex] || "";
}

export function getRelativeTimeCzech(dateInput: string | Date): {
  text: string;
  isUrgent: boolean;
  isPast: boolean;
} {
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();
  const nowDay = now.getDate();

  let targetYear: number;
  let targetMonth: number;
  let targetDay: number;

  if (typeof dateInput === "string" && dateInput.length >= 10) {
    const parts = dateInput.slice(0, 10).split("-").map(Number);
    targetYear = parts[0];
    targetMonth = parts[1] - 1;
    targetDay = parts[2];
  } else {
    const d = new Date(dateInput);
    targetYear = d.getFullYear();
    targetMonth = d.getMonth();
    targetDay = d.getDate();
  }

  // Calculate calendar day difference purely using UTC midnights
  const msPerDay = 86400000;
  const utcNow = Date.UTC(nowYear, nowMonth, nowDay);
  const utcTarget = Date.UTC(targetYear, targetMonth, targetDay);
  const diffDays = Math.round((utcTarget - utcNow) / msPerDay);

  if (diffDays < 0) {
    if (diffDays === -1) return { text: "Včera", isUrgent: false, isPast: true };
    return { text: `Před ${Math.abs(diffDays)} dny`, isUrgent: false, isPast: true };
  }

  if (diffDays === 0) {
    return { text: "Dnes!", isUrgent: true, isPast: false };
  }
  if (diffDays === 1) {
    return { text: "Zítra", isUrgent: true, isPast: false };
  }
  if (diffDays === 2) {
    return { text: "Pozítří", isUrgent: false, isPast: false };
  }
  if (diffDays <= 4) {
    return { text: `Za ${diffDays} dny`, isUrgent: false, isPast: false };
  }
  return { text: `Za ${diffDays} dní`, isUrgent: false, isPast: false };
}

/**
 * Czech inflection helper for count of lessons (hodina, hodiny, hodin)
 */
export function formatHoursCount(count: number): string {
  if (count === 1) return "1 vyučovací hodina";
  if (count >= 2 && count <= 4) return `${count} vyučovací hodiny`;
  return `${count} vyučovacích hodin`;
}

/**
 * Czech inflection helper for count of events (probíhá 1 zadaná událost, probíhají 2 zadané události, probíhá 5 zadaných událostí)
 */
export function formatActiveEventsSentence(count: number): string {
  if (count === 1) return "dnes probíhá 1 zadaná událost";
  if (count >= 2 && count <= 4) return `dnes probíhají ${count} zadané události`;
  return `dnes probíhá ${count} zadaných událostí`;
}

/**
 * Czech inflection helper for count of upcoming events (termín, termíny, termínů)
 */
export function formatUpcomingTermsCount(count: number): string {
  if (count === 1) return "1 nadcházející termín";
  if (count >= 2 && count <= 4) return `${count} nadcházející termíny`;
  return `${count} nadcházejících termínů`;
}

/**
 * Czech vocative (5. pád - oslovení) for common Czech first names.
 */
const KNOWN_VOCATIVES: Record<string, string> = {
  // Mužská jména
  "šimon": "Šimone",
  "simon": "Simone",
  "jan": "Jane",
  "honza": "Honzo",
  "jakub": "Jakube",
  "tomáš": "Tomáši",
  "tomas": "Tomasi",
  "matěj": "Matěji",
  "matej": "Mateji",
  "lukáš": "Lukáši",
  "lukas": "Lukasi",
  "filip": "Filipe",
  "vojtěch": "Vojtěchu",
  "vojta": "Vojto",
  "ondřej": "Ondřeji",
  "ondra": "Ondro",
  "petr": "Petře",
  "martin": "Martine",
  "david": "Davide",
  "michal": "Michale",
  "adam": "Adame",
  "daniel": "Danieli",
  "dan": "Dane",
  "jiří": "Jiří",
  "jiri": "Jiri",
  "marek": "Marku",
  "patrik": "Patriku",
  "dominik": "Dominiku",
  "pavel": "Pavle",
  "václav": "Václave",
  "vaclav": "Vaclave",
  "vašek": "Vašku",
  "štěpán": "Štěpáne",
  "stepan": "Stepane",
  "antonín": "Antoníne",
  "františek": "Františku",
  "franta": "Franto",
  "josef": "Josefe",
  "pepa": "Pepo",
  "richard": "Richarde",
  "robin": "Robine",
  "samuel": "Samueli",
  "sam": "Same",
  "alexandr": "Alexandře",
  "alex": "Alexi",
  "max": "Maxi",
  "maxim": "Maxime",
  "oliver": "Olivere",
  "teodor": "Teodore",
  "tobiáš": "Tobiáši",
  "viktor": "Viktore",
  "vít": "Víte",
  "vítek": "Vítku",
  "karel": "Karle",
  "krištof": "Krištofe",
  "kryštof": "Kryštofe",
  "mikuláš": "Mikuláši",
  "miky": "Miky",
  "prokop": "Prokope",
  "denis": "Denisi",
  "tadeáš": "Tadeáši",
  "albert": "Alberte",
  "eduard": "Eduarde",
  "erik": "Eriku",
  "igor": "Igore",
  "ivan": "Ivane",
  "radim": "Radime",
  "radek": "Radku",
  "roman": "Romane",
  "stanislav": "Stanislave",
  "stáňa": "Stáňo",
  "zdeněk": "Zdeňku",
  "zdenda": "Zdendo",

  // Ženská jména
  "anna": "Anno",
  "eliška": "Eliško",
  "tereza": "Terezo",
  "terka": "Terko",
  "adéla": "Adélo",
  "adela": "Adelo",
  "natálie": "Natálie",
  "kristýna": "Kristýno",
  "lucie": "Lucie",
  "lucka": "Lucko",
  "karolína": "Karolíno",
  "kára": "Káro",
  "viktorie": "Viktorie",
  "viky": "Viky",
  "sofie": "Sofie",
  "soňa": "Soňo",
  "ema": "Emo",
  "emma": "Emmo",
  "klára": "Kláro",
  "marie": "Marie",
  "máša": "Mášo",
  "veronika": "Veroniko",
  "verča": "Verčo",
  "barbora": "Barboro",
  "bára": "Báro",
  "kateřina": "Kateřino",
  "katka": "Katko",
  "michaela": "Michaelo",
  "míša": "Míšo",
  "nikola": "Nikolo",
  "nikča": "Nikčo",
  "anežka": "Anežko",
  "alena": "Aleno",
  "zuzana": "Zuzano",
  "zuzka": "Zuzko",
  "jana": "Jano",
  "eva": "Evo",
  "hana": "Hano",
  "lenka": "Lenko",
  "petra": "Petro",
  "monika": "Moniko",
  "sára": "Sáro",
  "laura": "Lauro",
  "nina": "Nino",
  "stela": "Stelo",
  "magdaléna": "Magdaléno",
  "magda": "Magdo",
  "nela": "Nelo",
  "julie": "Julie",
  "amálie": "Amálie",
};

/**
 * Returns the Czech vocative (5. pád) for a given first name or full name.
 * e.g. "Šimon Plojhar" -> "Šimone"
 * e.g. "Honza" -> "Honzo"
 * e.g. "Eliška" -> "Eliško"
 */
export function getCzechVocative(fullNameOrFirstName: string): string {
  if (!fullNameOrFirstName) return "";

  // Get only first name
  const rawFirstName = fullNameOrFirstName.trim().split(/\s+/)[0];
  if (!rawFirstName) return "";

  const lower = rawFirstName.toLowerCase();

  // 1. Direct dictionary match
  if (KNOWN_VOCATIVES[lower]) {
    // Preserve original casing of the first letter
    const voc = KNOWN_VOCATIVES[lower];
    return rawFirstName[0] === rawFirstName[0].toUpperCase()
      ? voc.charAt(0).toUpperCase() + voc.slice(1)
      : voc.toLowerCase();
  }

  // 2. Czech inflection heuristics for unknown names
  // Jména končící na -a (Honza, Jirka, Bára, Eliška, Eva) -> -o
  if (lower.endsWith("a")) {
    return rawFirstName.slice(0, -1) + "o";
  }

  // Jména končící na -e / -i / -í / -y / -ý zůstávají stejná (Jiří, Lucie, Julie, Miky)
  if (
    lower.endsWith("e") ||
    lower.endsWith("i") ||
    lower.endsWith("í") ||
    lower.endsWith("y") ||
    lower.endsWith("ý")
  ) {
    return rawFirstName;
  }

  // Jména končící na -ek (Radek, Vítek, Vašek, Mirek) -> -ku
  if (lower.endsWith("ek")) {
    return rawFirstName.slice(0, -2) + "ku";
  }

  // Jména končící na -el (Karel, Pavel) -> -le
  if (lower.endsWith("el")) {
    return rawFirstName.slice(0, -2) + "le";
  }

  // Jména končící na -k, -g, -h, -ch (Marek, Erik, Oleg) -> -u
  if (
    lower.endsWith("ch") ||
    lower.endsWith("k") ||
    lower.endsWith("g") ||
    lower.endsWith("h")
  ) {
    return rawFirstName + "u";
  }

  // Měkké souhlásky -š, -ž, -č, -ř, -c, -j, -ň (Tomáš, Lukáš, Matěj, Ondřej) -> -i
  if (
    lower.endsWith("š") ||
    lower.endsWith("ž") ||
    lower.endsWith("č") ||
    lower.endsWith("ř") ||
    lower.endsWith("c") ||
    lower.endsWith("j") ||
    lower.endsWith("ň")
  ) {
    return rawFirstName + "i";
  }

  // Standardní tvrdé souhlásky -n, -m, -p, -b, -v, -d, -t, -r, -s (Šimon, Jan, Jakub, Petr, Filip) -> -e
  if (
    lower.endsWith("n") ||
    lower.endsWith("m") ||
    lower.endsWith("p") ||
    lower.endsWith("b") ||
    lower.endsWith("v") ||
    lower.endsWith("d") ||
    lower.endsWith("t") ||
    lower.endsWith("r") ||
    lower.endsWith("s") ||
    lower.endsWith("l")
  ) {
    return rawFirstName + "e";
  }

  // Fallback
  return rawFirstName;
}

