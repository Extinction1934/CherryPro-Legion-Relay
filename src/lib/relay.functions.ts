import { createServerFn } from "@tanstack/react-start";
import { aliasById } from "@/lib/z4/aliases";
import type { FusionBrief } from "@/lib/z4/worker";

const MAX_TEXT = 2000;
const MAX_HISTORY = 24;
const OPERATOR_ID = "operator";

type HistoryLine = {
  memberId: string;
  text: string;
};

type StoredLine = {
  id: string;
  memberId: string;
  text: string;
  at: number;
  status: "ok" | "error";
  prompt?: string;
};

type StoredRelay = {
  id: string;
  selectedId: string;
  lines: StoredLine[];
  createdAt: number;
};

function clip(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function readChamber(value: unknown): { activeId: string; conversations: StoredRelay[] } | null {
  let raw = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== "object") return null;
  const body = raw as { activeId?: unknown; conversations?: unknown };
  if (!Array.isArray(body.conversations)) return null;
  const conversations: StoredRelay[] = [];
  for (const item of body.conversations.slice(0, 80)) {
    if (!item || typeof item !== "object") continue;
    const row = item as { id?: unknown; selectedId?: unknown; lines?: unknown; createdAt?: unknown };
    if (typeof row.id !== "string") continue;
    const selected = aliasById(typeof row.selectedId === "string" ? row.selectedId : "");
    if (!selected) continue;
    const lines: StoredLine[] = [];
    if (Array.isArray(row.lines)) {
      for (const line of row.lines.slice(-80)) {
        if (!line || typeof line !== "object") continue;
        const entry = line as {
          id?: unknown;
          memberId?: unknown;
          text?: unknown;
          at?: unknown;
          status?: unknown;
          prompt?: unknown;
        };
        const memberId = typeof entry.memberId === "string" ? entry.memberId : "";
        const text = typeof entry.text === "string" ? entry.text : "";
        if (!text || (memberId !== OPERATOR_ID && !aliasById(memberId))) continue;
        if (entry.status === "pending") continue;
        lines.push({
          id: typeof entry.id === "string" ? entry.id : crypto.randomUUID(),
          memberId,
          text: clip(text, MAX_TEXT),
          at: typeof entry.at === "number" ? entry.at : Date.now(),
          status: entry.status === "error" ? "error" : "ok",
          prompt: typeof entry.prompt === "string" ? clip(entry.prompt, MAX_TEXT) : undefined,
        });
      }
    }
    conversations.push({
      id: row.id,
      selectedId: selected.id,
      lines,
      createdAt: typeof row.createdAt === "number" ? row.createdAt : Date.now(),
    });
  }
  if (conversations.length === 0) return { activeId: "", conversations };
  const activeId = conversations.some((item) => item.id === body.activeId)
    ? (body.activeId as string)
    : conversations[0]!.id;
  return { activeId, conversations };
}

function messageText(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part) {
        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      }
      return "";
    })
    .join("")
    .trim();
}

async function speak(brief: FusionBrief): Promise<string> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("The platform is hosting the aliases, but fusion has no model in this chamber.");
  const body = {
    model: "grok-4.5",
    temperature: brief.temperature,
    max_tokens: brief.maxTokens,
    messages: [
      { role: "system", content: brief.system },
      { role: "user", content: brief.user },
    ],
  };
  let lastStatus = 0;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    });
    lastStatus = response.status;
    if (response.ok) {
      const payload = (await response.json()) as {
        choices?: { message?: { content?: unknown } }[];
      };
      const reply = messageText(payload.choices?.[0]?.message?.content);
      if (!reply) throw new Error("That alias returned an empty reply.");
      return reply;
    }
    if (attempt === 0 && (response.status === 429 || response.status >= 500)) continue;
    break;
  }
  throw new Error(`Fusion could not speak for that alias (${lastStatus}).`);
}

export const lattice = createServerFn({ method: "POST" }).handler(async () => {
  const { latticeView } = await import("./z4/worker");
  return latticeView();
});

export const loadChamber = createServerFn({ method: "POST" }).handler(async () => {
  const { getSql } = await import("./db");
  const sql = await getSql();
  const rows = await sql<{ document: unknown }>`
    select document from legion_chamber where id = 'primary'
  `;
  const stored = readChamber(rows[0]?.document);
  return stored ?? { activeId: "", conversations: [] as StoredRelay[] };
});

export const saveChamber = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const stored = readChamber(input);
    if (!stored || stored.conversations.length === 0) {
      throw new Error("The chamber has no relay to host.");
    }
    return stored;
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("./db");
    const sql = await getSql();
    const document = JSON.stringify(data);
    await sql`
      insert into legion_chamber (id, document)
      values ('primary', ${document}::jsonb)
      on conflict (id) do update
      set document = excluded.document, updated_at = now()
    `;
    return { ok: true as const };
  });

export const transmit = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Missing relay payload.");
    const raw = input as { memberId?: unknown; text?: unknown; history?: unknown };
    const memberId = typeof raw.memberId === "string" ? raw.memberId : "";
    const text = typeof raw.text === "string" ? raw.text.trim() : "";
    if (!aliasById(memberId)) throw new Error("That alias is not hosted on this platform.");
    if (!text || text.length > MAX_TEXT) throw new Error("Write a message under 2000 characters.");
    const history: HistoryLine[] = [];
    if (Array.isArray(raw.history)) {
      for (const line of raw.history.slice(-MAX_HISTORY)) {
        if (!line || typeof line !== "object") continue;
        const row = line as { memberId?: unknown; text?: unknown };
        const id = typeof row.memberId === "string" ? row.memberId : "";
        const lineText = typeof row.text === "string" ? row.text.trim() : "";
        if (!lineText) continue;
        if (id !== OPERATOR_ID && !aliasById(id)) continue;
        history.push({ memberId: id, text: clip(lineText, MAX_TEXT) });
      }
    }
    return { memberId, text, history };
  })
  .handler(async ({ data }) => {
    const { fuse } = await import("./z4/worker");
    const brief = fuse(data.memberId, data.text, data.history);
    const reply = await speak(brief);
    return {
      memberId: data.memberId,
      reply,
      enlisted: brief.status.enlisted,
      cycle: brief.status.cycle,
      included: brief.status.included,
      fusionNs: brief.status.fusionNs,
    };
  });
