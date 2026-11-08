import { useEffect, useMemo, useRef, useState, type FocusEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Eraser, Minus, Plus, Radio, RotateCw, Send, Trash2 } from "lucide-react";
import { OPERATOR } from "@/lib/legion";
import { lattice, loadChamber, saveChamber, transmit } from "@/lib/relay.functions";
import { HOSTED, HOST_COUNTS, aliasById, type HostedAlias } from "@/lib/z4/aliases";
import type { WorkerStatus } from "@/lib/z4/worker";

type ChatLine = {
  id: string;
  memberId: string;
  text: string;
  at: number;
  status: "ok" | "pending" | "error";
  prompt?: string;
};

const STORAGE_KEY = "cherrypro-legion-v3";
const LEGACY_KEY = "cherrypro-legion-v2";

type Conversation = {
  id: string;
  selectedId: string;
  lines: ChatLine[];
  createdAt: number;
};

function sanitizeLines(value: unknown): ChatLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (line) =>
        line &&
        typeof line.id === "string" &&
        typeof line.text === "string" &&
        (line.memberId === OPERATOR.id || aliasById(line.memberId)) &&
        line.status !== "pending",
    )
    .slice(-80) as ChatLine[];
}

function blankRelay(selectedId = HOSTED[0]!.id): Conversation {
  return {
    id: crypto.randomUUID(),
    selectedId: aliasById(selectedId)?.id ?? HOSTED[0]!.id,
    lines: [],
    createdAt: Date.now(),
  };
}

function loadStore(): { activeId: string; conversations: Conversation[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { activeId?: string; conversations?: unknown };
      const conversations = Array.isArray(parsed.conversations)
        ? parsed.conversations
            .map((item) => {
              if (!item || typeof item !== "object") return null;
              const row = item as Partial<Conversation>;
              if (typeof row.id !== "string") return null;
              return {
                id: row.id,
                selectedId: aliasById(row.selectedId ?? "")?.id ?? HOSTED[0]!.id,
                lines: sanitizeLines(row.lines),
                createdAt: typeof row.createdAt === "number" ? row.createdAt : Date.now(),
              };
            })
            .filter((item): item is Conversation => item !== null)
        : [];
      if (conversations.length > 0) {
        const activeId = conversations.some((item) => item.id === parsed.activeId)
          ? parsed.activeId!
          : conversations[0]!.id;
        return { activeId, conversations };
      }
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as { selectedId?: string; lines?: unknown };
      const relay = blankRelay(typeof parsed.selectedId === "string" ? parsed.selectedId : undefined);
      relay.lines = sanitizeLines(parsed.lines);
      return { activeId: relay.id, conversations: [relay] };
    }
  } catch {
    /* start a fresh relay */
  }
  const relay = blankRelay();
  return { activeId: relay.id, conversations: [relay] };
}

function relayTitle(relay: Conversation, index: number): string {
  const first = relay.lines.find((line) => line.memberId === OPERATOR.id && line.text.trim());
  if (first) {
    const text = first.text.replace(/\s+/g, " ").trim();
    return text.length > 42 ? `${text.slice(0, 41)}…` : text;
  }
  return `Relay ${index + 1}`;
}

function persistable(activeId: string, conversations: Conversation[]) {
  return {
    activeId,
    conversations: conversations.map((relay) => ({
      ...relay,
      lines: relay.lines.filter((line) => line.status !== "pending").slice(-80),
    })),
  };
}

function clock(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function Chamber() {
  const send = useServerFn(transmit);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(false);
  const [hosted, setHosted] = useState<"opening" | "platform" | "device">("opening");
  const [aliasesOpen, setAliasesOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [worker, setWorker] = useState<WorkerStatus | null>(null);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const shell = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = shell.current;
    const viewport = window.visualViewport;
    if (!node) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const place = () => {
      if (!viewport) return;
      node.style.top = `${viewport.offsetTop}px`;
      node.style.height = `${viewport.height}px`;
    };
    place();
    viewport?.addEventListener("resize", place);
    viewport?.addEventListener("scroll", place);
    const onFocusIn = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLTextAreaElement)) return;
      if (window.matchMedia("(max-width: 767px)").matches) setTyping(true);
      window.setTimeout(place, 50);
      window.setTimeout(place, 320);
    };
    const onFocusOut = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLTextAreaElement)) return;
      window.setTimeout(() => {
        if (document.activeElement instanceof HTMLTextAreaElement) return;
        setTyping(false);
      }, 180);
    };
    node.addEventListener("focusin", onFocusIn);
    node.addEventListener("focusout", onFocusOut);
    return () => {
      document.body.style.overflow = previousOverflow;
      viewport?.removeEventListener("resize", place);
      viewport?.removeEventListener("scroll", place);
      node.removeEventListener("focusin", onFocusIn);
      node.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) setAliasesOpen(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const local = loadStore();
    setActiveId(local.activeId);
    setConversations(local.conversations);
    void loadChamber()
      .then((remote) => {
        if (cancelled) return;
        if (remote.conversations.length > 0) {
          setActiveId(remote.activeId);
          setConversations(remote.conversations as Conversation[]);
        }
        setHosted("platform");
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setHosted("device");
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void lattice()
      .then((view) => {
        if (cancelled) return;
        setWorker(view.status);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setWorkerError(error instanceof Error ? error.message : "The platform did not boot.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const snapshot = persistable(activeId, conversations);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    if (hosted !== "platform" || snapshot.conversations.length === 0) return;
    const handle = window.setTimeout(() => {
      void saveChamber({ data: snapshot })
        .then(() => setHosted("platform"))
        .catch(() => setHosted("device"));
    }, 400);
    return () => window.clearTimeout(handle);
  }, [ready, activeId, conversations, hosted]);

  const active = conversations.find((relay) => relay.id === activeId) ?? conversations[0];
  const lines = active?.lines ?? [];
  const selected = aliasById(active?.selectedId ?? "") ?? HOSTED[0]!;

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [lines, busy, activeId]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return HOSTED;
    return HOSTED.filter((alias) =>
      `${alias.label} ${alias.host} ${alias.domainLabel}`.toLowerCase().includes(needle),
    );
  }, [query]);
  const groups = useMemo(() => {
    const order = ["IPAWS", "TRACS", "Post-fusion"] as const;
    return order
      .map((host) => ({ host, rows: visible.filter((alias) => alias.host === host) }))
      .filter((group) => group.rows.length > 0);
  }, [visible]);

  function patchRelay(id: string, patch: (relay: Conversation) => Conversation) {
    setConversations((current) => current.map((relay) => (relay.id === id ? patch(relay) : relay)));
  }

  function chooseAlias(id: string) {
    if (!active) return;
    patchRelay(active.id, (relay) => ({ ...relay, selectedId: id }));
  }

  function addRelay() {
    const relay = blankRelay(selected.id);
    setConversations((current) => [...current, relay]);
    setActiveId(relay.id);
    setDraft("");
  }

  function deleteRelay(id: string) {
    const relay = conversations.find((item) => item.id === id);
    if (!relay) return;
    const index = conversations.findIndex((item) => item.id === id);
    if (relay.lines.length > 0 && !window.confirm(`Delete “${relayTitle(relay, index)}”?`)) return;
    const remaining = conversations.filter((item) => item.id !== id);
    if (remaining.length === 0) {
      const fresh = blankRelay(relay.selectedId);
      setConversations([fresh]);
      setActiveId(fresh.id);
    } else {
      setConversations(remaining);
      if (id === active?.id) setActiveId(remaining[0]!.id);
    }
    setDraft("");
  }

  function cycle() {
    if (!active || visible.length === 0) return;
    const index = visible.findIndex((alias) => alias.id === selected.id);
    const next = visible[(index + 1) % visible.length]!;
    chooseAlias(next.id);
  }

  async function deliver(
    relayId: string,
    memberId: string,
    text: string,
    history: { memberId: string; text: string }[],
  ) {
    const pendingId = crypto.randomUUID();
    patchRelay(relayId, (relay) => ({
      ...relay,
      lines: [
        ...relay.lines,
        { id: pendingId, memberId, text: "", at: Date.now(), status: "pending", prompt: text },
      ],
    }));
    setBusy(true);
    try {
      const result = await send({ data: { memberId, text, history } });
      patchRelay(relayId, (relay) => ({
        ...relay,
        lines: relay.lines.map((line) =>
          line.id === pendingId ? { ...line, text: result.reply, status: "ok", at: Date.now() } : line,
        ),
      }));
      setWorker((current) =>
        current
          ? { ...current, cycle: result.cycle, enlisted: result.enlisted, included: result.included }
          : current,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "The relay dropped the reply.";
      patchRelay(relayId, (relay) => ({
        ...relay,
        lines: relay.lines.map((line) =>
          line.id === pendingId ? { ...line, text: message, status: "error" } : line,
        ),
      }));
    } finally {
      setBusy(false);
    }
  }

  async function transmitDraft() {
    const text = draft.trim();
    if (!text || busy || !active) return;
    const history = lines
      .filter((line) => line.status === "ok")
      .map((line) => ({ memberId: line.memberId, text: line.text }));
    const operatorLine: ChatLine = {
      id: crypto.randomUUID(),
      memberId: OPERATOR.id,
      text,
      at: Date.now(),
      status: "ok",
    };
    const relayId = active.id;
    patchRelay(relayId, (relay) => ({ ...relay, lines: [...relay.lines, operatorLine] }));
    setDraft("");
    await deliver(relayId, selected.id, text, history);
  }

  async function retry(line: ChatLine) {
    if (!line.prompt || busy || !active) return;
    const history = lines
      .filter((item) => item.status === "ok" && item.at <= line.at && item.id !== line.id)
      .map((item) => ({ memberId: item.memberId, text: item.text }));
    const relayId = active.id;
    patchRelay(relayId, (relay) => ({
      ...relay,
      lines: relay.lines.filter((item) => item.id !== line.id),
    }));
    await deliver(relayId, line.memberId, line.prompt, history);
  }

  function focusComposer() {
    if (window.matchMedia("(max-width: 767px)").matches) setTyping(true);
  }

  function blurComposer(event: FocusEvent<HTMLTextAreaElement>) {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.form?.contains(next)) return;
    window.setTimeout(() => {
      const focused = document.activeElement;
      if (focused instanceof Node && field.current?.form?.contains(focused)) return;
      setTyping(false);
    }, 180);
  }

  function clearChamber() {
    if (!active || !lines.length) return;
    if (!window.confirm("Clear this relay’s transcript on this device?")) return;
    patchRelay(active.id, (relay) => ({ ...relay, lines: [] }));
  }

  return (
    <div ref={shell} className="fixed inset-x-0 top-0 flex h-dvh flex-col bg-bg text-fg">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3 md:px-5">
        <div className="min-w-0">
          <p className="font-mono text-xs tracking-widest text-cherry">FEDERATED PLATFORM</p>
          <h1 className="truncate text-lg font-semibold tracking-tight text-balance">Legion Relay</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="font-mono text-xs text-faint">ON PLATFORM</p>
            <p className="font-mono text-sm text-sage tabular-nums">{HOST_COUNTS.total} aliases</p>
          </div>
          <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-left font-mono text-xs leading-tight text-sage">
            <Radio className="size-3.5 shrink-0 text-cherry" aria-hidden="true" />
            <span>
              <span className="block">Federated</span>
              <span className="block text-faint">engine-sealed</span>
            </span>
          </span>
        </div>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-4 py-2 font-mono text-xs text-muted md:px-5">
        <span>IPAWS {HOST_COUNTS.ipaws}</span>
        <span>TRACS {HOST_COUNTS.tracs}</span>
        <span>Post-fusion {HOST_COUNTS.post}</span>
        <span className="text-sage">{HOST_COUNTS.total} aliases</span>
        <span className="text-sage">Engine-sealed</span>
        <span className="text-faint">Source on platform</span>
        <span className={worker ? "text-sage" : "text-faint"}>
          {worker ? "ns fusion on" : workerError ? "fusion down" : "ns fusion"}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside
          className={
            "w-full shrink-0 flex-col border-b border-line bg-surface md:flex md:h-auto md:min-h-0 md:w-80 md:flex-none md:border-r md:border-b-0 " +
            (typing ? "hidden " : "flex ") +
            (aliasesOpen ? "h-96 " : "h-auto ")
          }
        >
          <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-line px-2 py-1">
            <button
              type="button"
              onClick={addRelay}
              className="inline-flex h-11 shrink-0 items-center gap-1 rounded-md border border-line px-3 text-xs font-medium text-sage"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Add
            </button>
            {conversations.map((relay, index) => {
              const title = relayTitle(relay, index);
              const on = relay.id === active?.id;
              return (
                <div
                  key={relay.id}
                  className={
                    "flex shrink-0 items-center rounded-md border " +
                    (on ? "border-cherry bg-raised" : "border-line")
                  }
                >
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setActiveId(relay.id);
                      setDraft("");
                    }}
                    className="h-11 max-w-40 truncate px-3 text-left text-sm"
                  >
                    {title}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${title}`}
                    onClick={() => deleteRelay(relay.id)}
                    className="inline-flex size-11 items-center justify-center text-faint hover:text-cherry"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
            <p className="font-mono text-xs tracking-widest text-faint">
              HOSTED ALIASES · {HOST_COUNTS.total}
            </p>
            <button
              type="button"
              aria-expanded={aliasesOpen}
              aria-label={aliasesOpen ? "Collapse hosted aliases" : "Expand hosted aliases"}
              onClick={() => setAliasesOpen((open) => !open)}
              className="inline-flex size-11 items-center justify-center rounded-md border border-line text-sage"
            >
              {aliasesOpen ? <Minus className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
            </button>
          </div>
          {aliasesOpen && (
            <>
          <div className="border-b border-line px-4 py-3">
            <label className="block">
              <span className="sr-only">Filter aliases</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter aliases"
                className="w-full rounded-sm border border-line bg-bg px-3 py-2 text-sm text-fg outline-none placeholder:text-faint focus:border-cherry"
              />
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {groups.map((group) => (
              <div key={group.host} className="mb-2">
                <p className="px-2 py-1 font-mono text-xs tracking-widest text-faint">
                  {group.host} · {group.rows.length}
                </p>
                {group.rows.map((alias) => (
                  <AliasButton
                    key={alias.id}
                    active={alias.id === selected.id}
                    alias={alias}
                    onSelect={() => chooseAlias(alias.id)}
                  />
                ))}
              </div>
            ))}
            {visible.length === 0 && (
              <p className="px-2 py-6 text-sm text-muted">No hosted alias matches that filter.</p>
            )}
          </div>
          <div className="border-t border-line px-4 py-3">
            <p className="font-mono text-xs text-faint">OPERATOR</p>
            <p className="mt-1 text-sm">{OPERATOR.alias}</p>
          </div>
            </>
          )}
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-bg">
          <div
            ref={scroller}
            className={
              "min-h-0 flex-1 overflow-y-auto px-4 py-4 md:block md:px-6 " + (typing ? "hidden" : "")
            }
            aria-live="polite"
          >
            {lines.length === 0 ? (
              <EmptyState alias={selected} />
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-3">
                {lines.map((line) => (
                  <Bubble key={line.id} line={line} busy={busy} onRetry={() => retry(line)} />
                ))}
              </div>
            )}
          </div>

          <form
            className="shrink-0 border-t border-line bg-surface px-3 py-3 md:order-none md:px-5"
            onSubmit={(event) => {
              event.preventDefault();
              void transmitDraft();
            }}
          >
            <div className="mx-auto flex max-w-3xl flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate font-mono text-xs text-muted">
                  Addressing <span className="text-fg">{selected.label}</span>
                  <span className="text-faint"> · {selected.host}</span>
                </p>
                <button
                  type="button"
                  onClick={clearChamber}
                  className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-faint hover:text-fg"
                >
                  <Eraser className="size-3.5" aria-hidden="true" />
                  Clear
                </button>
              </div>
              <div className="flex items-end gap-2">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Message</span>
                  <textarea
                    ref={field}
                    value={draft}
                    rows={2}
                    maxLength={2000}
                    placeholder={`Message ${selected.label}…`}
                    onChange={(event) => setDraft(event.target.value)}
                    onFocus={focusComposer}
                    onBlur={blurComposer}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void transmitDraft();
                      }
                    }}
                    className="max-h-40 min-h-12 w-full resize-none rounded-md border border-line bg-bg px-3 py-3 text-sm leading-relaxed text-fg outline-none placeholder:text-faint focus:border-cherry"
                  />
                </label>
                <button
                  type="button"
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={cycle}
                  aria-label="Cycle to the next alias"
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-line text-sage hover:border-sage"
                >
                  <RotateCw className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="submit"
                  onPointerDown={(event) => event.preventDefault()}
                  disabled={busy || !draft.trim()}
                  aria-label={busy ? "Sending" : "Transmit"}
                  className="inline-flex h-12 items-center gap-2 rounded-md bg-cherry px-4 text-sm font-semibold text-fg disabled:opacity-40"
                >
                  <Send className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{busy ? "Sending" : "Transmit"}</span>
                </button>
              </div>
              <p className="font-mono text-xs text-faint">Federated platform · ns fusion · Enter to send</p>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function AliasButton({
  active,
  alias,
  onSelect,
}: {
  active: boolean;
  alias: HostedAlias;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={
        "mb-1 flex min-h-11 w-full items-center rounded-md px-2 py-2 text-left " +
        (active ? "bg-raised ring-1 ring-cherry" : "hover:bg-raised")
      }
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{alias.label}</span>
        <span className="block truncate font-mono text-xs text-muted">{alias.domainLabel}</span>
      </span>
    </button>
  );
}

function EmptyState({ alias, compact = false }: { alias: HostedAlias; compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "flex flex-col gap-3"
          : "mx-auto flex min-h-full max-w-lg flex-col justify-center gap-3 py-2"
      }
    >
      <p className="font-mono text-xs tracking-widest text-cherry">CHAMBER OPEN</p>
      <h2 className={"font-semibold tracking-tight text-balance " + (compact ? "text-xl" : "text-2xl")}>
        Federated multi-channel bio-frame relay
      </h2>
      <p className="text-sm leading-relaxed text-pretty text-muted">
        {HOST_COUNTS.total} bio-frames federate across IPAWS, TRACS, and post-fusion. A frame is one
        hosted alias on one domain channel.
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="font-mono text-xs text-faint">Frame</dt>
          <dd className="truncate text-fg">{alias.label}</dd>
        </div>
        <div>
          <dt className="font-mono text-xs text-faint">Surface</dt>
          <dd>{alias.host}</dd>
        </div>
        <div>
          <dt className="font-mono text-xs text-faint">Channel</dt>
          <dd className="truncate">{alias.domainLabel}</dd>
        </div>
        <div>
          <dt className="font-mono text-xs text-faint">Relay</dt>
          <dd>Shared transcript</dd>
        </div>
      </dl>
      <p className="text-sm leading-relaxed text-pretty text-faint">
        Transmit binds the operator line to this frame. The reply returns on the same transcript.
      </p>
    </div>
  );
}

function Bubble({
  line,
  busy,
  onRetry,
}: {
  line: ChatLine;
  busy: boolean;
  onRetry: () => void;
}) {
  const mine = line.memberId === OPERATOR.id;
  const alias = mine ? null : aliasById(line.memberId);
  const who = mine ? OPERATOR.name : (alias?.label ?? "Alias");
  const host = mine ? OPERATOR.alias : alias ? `${alias.host} · ${alias.domainLabel}` : "";

  return (
    <article
      className={
        "max-w-xl rounded-md border px-3 py-3 " +
        (mine
          ? "ml-auto border-line bg-raised"
          : line.status === "error"
            ? "border-cherry bg-cherry-ink"
            : "border-line bg-surface")
      }
    >
      <header className="mb-1.5 flex items-baseline justify-between gap-3 font-mono text-xs">
        <span className={mine ? "text-cherry" : "text-sage"}>
          {who}
          <span className="text-faint"> · {host}</span>
        </span>
        <time className="shrink-0 text-faint tabular-nums" dateTime={new Date(line.at).toISOString()}>
          {clock(line.at)}
        </time>
      </header>
      {line.status === "pending" ? (
        <p className="flex items-center gap-1 text-sm text-muted" aria-label={`${who} is answering`}>
          <span className="think-dot inline-block size-1.5 rounded-full bg-sage" />
          <span className="think-dot inline-block size-1.5 rounded-full bg-sage" />
          <span className="think-dot inline-block size-1.5 rounded-full bg-sage" />
        </p>
      ) : (
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-pretty">{line.text}</p>
      )}
      {line.status === "error" && (
        <button
          type="button"
          disabled={busy}
          onClick={onRetry}
          className="mt-2 text-xs font-medium text-fg underline decoration-cherry underline-offset-2 disabled:opacity-40"
        >
          Retry this alias
        </button>
      )}
    </article>
  );
}
