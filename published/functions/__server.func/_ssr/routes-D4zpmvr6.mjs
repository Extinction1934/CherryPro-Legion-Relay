import { o as __toESM } from "../_runtime.mjs";
import { U as isRedirect, b as require_jsx_runtime, q as require_react, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { i as aliasById, n as HOSTED, r as HOST_COUNTS } from "./aliases-DFyrLNfr.mjs";
import { a as Radio, c as Eraser, i as RotateCw, n as Trash2, o as Plus, r as Send, s as Minus } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-D4zpmvr6.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function useServerFn(serverFn) {
	const router = useRouter();
	return import_react.useCallback(async (...args) => {
		try {
			const res = await serverFn(...args);
			if (isRedirect(res)) throw res;
			return res;
		} catch (err) {
			if (isRedirect(err)) {
				err.options._fromLocation = router.stores.location.get();
				return router.navigate(router.resolveRedirect(err).options);
			}
			throw err;
		}
	}, [router, serverFn]);
}
var OPERATOR = {
	id: "operator",
	name: "Operator",
	alias: "ZK-SS-ZETA-119",
	creed: "You, at the console"
};
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var MAX_TEXT = 2e3;
var OPERATOR_ID = "operator";
function clip(value, max) {
	const trimmed = value.trim();
	if (trimmed.length <= max) return trimmed;
	return `${trimmed.slice(0, max - 1)}…`;
}
function readChamber(value) {
	let raw = value;
	if (typeof raw === "string") try {
		raw = JSON.parse(raw);
	} catch {
		return null;
	}
	if (!raw || typeof raw !== "object") return null;
	const body = raw;
	if (!Array.isArray(body.conversations)) return null;
	const conversations = [];
	for (const item of body.conversations.slice(0, 80)) {
		if (!item || typeof item !== "object") continue;
		const row = item;
		if (typeof row.id !== "string") continue;
		const selected = aliasById(typeof row.selectedId === "string" ? row.selectedId : "");
		if (!selected) continue;
		const lines = [];
		if (Array.isArray(row.lines)) for (const line of row.lines.slice(-80)) {
			if (!line || typeof line !== "object") continue;
			const entry = line;
			const memberId = typeof entry.memberId === "string" ? entry.memberId : "";
			const text = typeof entry.text === "string" ? entry.text : "";
			if (!text || memberId !== OPERATOR_ID && !aliasById(memberId)) continue;
			if (entry.status === "pending") continue;
			lines.push({
				id: typeof entry.id === "string" ? entry.id : crypto.randomUUID(),
				memberId,
				text: clip(text, MAX_TEXT),
				at: typeof entry.at === "number" ? entry.at : Date.now(),
				status: entry.status === "error" ? "error" : "ok",
				prompt: typeof entry.prompt === "string" ? clip(entry.prompt, MAX_TEXT) : void 0
			});
		}
		conversations.push({
			id: row.id,
			selectedId: selected.id,
			lines,
			createdAt: typeof row.createdAt === "number" ? row.createdAt : Date.now()
		});
	}
	if (conversations.length === 0) return {
		activeId: "",
		conversations
	};
	return {
		activeId: conversations.some((item) => item.id === body.activeId) ? body.activeId : conversations[0].id,
		conversations
	};
}
var lattice = createServerFn({ method: "POST" }).handler(createSsrRpc("e728555ae1bfb8513f5fc94e199837001b2a922278d964c828e2a1604e4ed3eb"));
var loadChamber = createServerFn({ method: "POST" }).handler(createSsrRpc("c2532a1894b4332a965fd41144b5ec59560eb0f9e8dc738bf70e451881f3efc2"));
var saveChamber = createServerFn({ method: "POST" }).validator((input) => {
	const stored = readChamber(input);
	if (!stored || stored.conversations.length === 0) throw new Error("The chamber has no relay to host.");
	return stored;
}).handler(createSsrRpc("1659787131964a7d9181398c1dcd0155144664d4d8232c64c3d6ecae79d99b4a"));
var transmit = createServerFn({ method: "POST" }).validator((input) => {
	if (!input || typeof input !== "object") throw new Error("Missing relay payload.");
	const raw = input;
	const memberId = typeof raw.memberId === "string" ? raw.memberId : "";
	const text = typeof raw.text === "string" ? raw.text.trim() : "";
	if (!aliasById(memberId)) throw new Error("That alias is not hosted on this platform.");
	if (!text || text.length > MAX_TEXT) throw new Error("Write a message under 2000 characters.");
	const history = [];
	if (Array.isArray(raw.history)) for (const line of raw.history.slice(-24)) {
		if (!line || typeof line !== "object") continue;
		const row = line;
		const id = typeof row.memberId === "string" ? row.memberId : "";
		const lineText = typeof row.text === "string" ? row.text.trim() : "";
		if (!lineText) continue;
		if (id !== OPERATOR_ID && !aliasById(id)) continue;
		history.push({
			memberId: id,
			text: clip(lineText, MAX_TEXT)
		});
	}
	return {
		memberId,
		text,
		history
	};
}).handler(createSsrRpc("a2656d06153c5c8633a26886130e7dbcef60c0fead1969f75fb97f708515ccb3"));
var STORAGE_KEY = "cherrypro-legion-v3";
var LEGACY_KEY = "cherrypro-legion-v2";
function sanitizeLines(value) {
	if (!Array.isArray(value)) return [];
	return value.filter((line) => line && typeof line.id === "string" && typeof line.text === "string" && (line.memberId === OPERATOR.id || aliasById(line.memberId)) && line.status !== "pending").slice(-80);
}
function blankRelay(selectedId = HOSTED[0].id) {
	return {
		id: crypto.randomUUID(),
		selectedId: aliasById(selectedId)?.id ?? HOSTED[0].id,
		lines: [],
		createdAt: Date.now()
	};
}
function loadStore() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			const conversations = Array.isArray(parsed.conversations) ? parsed.conversations.map((item) => {
				if (!item || typeof item !== "object") return null;
				const row = item;
				if (typeof row.id !== "string") return null;
				return {
					id: row.id,
					selectedId: aliasById(row.selectedId ?? "")?.id ?? HOSTED[0].id,
					lines: sanitizeLines(row.lines),
					createdAt: typeof row.createdAt === "number" ? row.createdAt : Date.now()
				};
			}).filter((item) => item !== null) : [];
			if (conversations.length > 0) return {
				activeId: conversations.some((item) => item.id === parsed.activeId) ? parsed.activeId : conversations[0].id,
				conversations
			};
		}
		const legacy = localStorage.getItem(LEGACY_KEY);
		if (legacy) {
			const parsed = JSON.parse(legacy);
			const relay = blankRelay(typeof parsed.selectedId === "string" ? parsed.selectedId : void 0);
			relay.lines = sanitizeLines(parsed.lines);
			return {
				activeId: relay.id,
				conversations: [relay]
			};
		}
	} catch {}
	const relay = blankRelay();
	return {
		activeId: relay.id,
		conversations: [relay]
	};
}
function relayTitle(relay, index) {
	const first = relay.lines.find((line) => line.memberId === OPERATOR.id && line.text.trim());
	if (first) {
		const text = first.text.replace(/\s+/g, " ").trim();
		return text.length > 42 ? `${text.slice(0, 41)}…` : text;
	}
	return `Relay ${index + 1}`;
}
function persistable(activeId, conversations) {
	return {
		activeId,
		conversations: conversations.map((relay) => ({
			...relay,
			lines: relay.lines.filter((line) => line.status !== "pending").slice(-80)
		}))
	};
}
function clock(at) {
	return new Date(at).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit"
	});
}
function Chamber() {
	const send = useServerFn(transmit);
	const [conversations, setConversations] = (0, import_react.useState)([]);
	const [activeId, setActiveId] = (0, import_react.useState)("");
	const [draft, setDraft] = (0, import_react.useState)("");
	const [query, setQuery] = (0, import_react.useState)("");
	const [ready, setReady] = (0, import_react.useState)(false);
	const [hosted, setHosted] = (0, import_react.useState)("opening");
	const [aliasesOpen, setAliasesOpen] = (0, import_react.useState)(false);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [worker, setWorker] = (0, import_react.useState)(null);
	const [workerError, setWorkerError] = (0, import_react.useState)(null);
	const [typing, setTyping] = (0, import_react.useState)(false);
	const scroller = (0, import_react.useRef)(null);
	const field = (0, import_react.useRef)(null);
	const shell = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
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
		const onFocusIn = (event) => {
			if (!(event.target instanceof HTMLTextAreaElement)) return;
			if (window.matchMedia("(max-width: 767px)").matches) setTyping(true);
			window.setTimeout(place, 50);
			window.setTimeout(place, 320);
		};
		const onFocusOut = (event) => {
			if (!(event.target instanceof HTMLTextAreaElement)) return;
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
	(0, import_react.useEffect)(() => {
		if (window.matchMedia("(min-width: 768px)").matches) setAliasesOpen(true);
	}, []);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		const local = loadStore();
		setActiveId(local.activeId);
		setConversations(local.conversations);
		loadChamber().then((remote) => {
			if (cancelled) return;
			if (remote.conversations.length > 0) {
				setActiveId(remote.activeId);
				setConversations(remote.conversations);
			}
			setHosted("platform");
			setReady(true);
		}).catch(() => {
			if (cancelled) return;
			setHosted("device");
			setReady(true);
		});
		return () => {
			cancelled = true;
		};
	}, []);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		lattice().then((view) => {
			if (cancelled) return;
			setWorker(view.status);
		}).catch((error) => {
			if (!cancelled) setWorkerError(error instanceof Error ? error.message : "The platform did not boot.");
		});
		return () => {
			cancelled = true;
		};
	}, []);
	(0, import_react.useEffect)(() => {
		if (!ready) return;
		const snapshot = persistable(activeId, conversations);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
		if (hosted !== "platform" || snapshot.conversations.length === 0) return;
		const handle = window.setTimeout(() => {
			saveChamber({ data: snapshot }).then(() => setHosted("platform")).catch(() => setHosted("device"));
		}, 400);
		return () => window.clearTimeout(handle);
	}, [
		ready,
		activeId,
		conversations,
		hosted
	]);
	const active = conversations.find((relay) => relay.id === activeId) ?? conversations[0];
	const lines = active?.lines ?? [];
	const selected = aliasById(active?.selectedId ?? "") ?? HOSTED[0];
	(0, import_react.useEffect)(() => {
		const node = scroller.current;
		if (!node) return;
		node.scrollTop = node.scrollHeight;
	}, [
		lines,
		busy,
		activeId
	]);
	const visible = (0, import_react.useMemo)(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return HOSTED;
		return HOSTED.filter((alias) => `${alias.label} ${alias.host} ${alias.domainLabel}`.toLowerCase().includes(needle));
	}, [query]);
	const groups = (0, import_react.useMemo)(() => {
		return [
			"IPAWS",
			"TRACS",
			"Post-fusion"
		].map((host) => ({
			host,
			rows: visible.filter((alias) => alias.host === host)
		})).filter((group) => group.rows.length > 0);
	}, [visible]);
	function patchRelay(id, patch) {
		setConversations((current) => current.map((relay) => relay.id === id ? patch(relay) : relay));
	}
	function chooseAlias(id) {
		if (!active) return;
		patchRelay(active.id, (relay) => ({
			...relay,
			selectedId: id
		}));
	}
	function addRelay() {
		const relay = blankRelay(selected.id);
		setConversations((current) => [...current, relay]);
		setActiveId(relay.id);
		setDraft("");
	}
	function deleteRelay(id) {
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
			if (id === active?.id) setActiveId(remaining[0].id);
		}
		setDraft("");
	}
	function cycle() {
		if (!active || visible.length === 0) return;
		const index = visible.findIndex((alias) => alias.id === selected.id);
		const next = visible[(index + 1) % visible.length];
		chooseAlias(next.id);
	}
	async function deliver(relayId, memberId, text, history) {
		const pendingId = crypto.randomUUID();
		patchRelay(relayId, (relay) => ({
			...relay,
			lines: [...relay.lines, {
				id: pendingId,
				memberId,
				text: "",
				at: Date.now(),
				status: "pending",
				prompt: text
			}]
		}));
		setBusy(true);
		try {
			const result = await send({ data: {
				memberId,
				text,
				history
			} });
			patchRelay(relayId, (relay) => ({
				...relay,
				lines: relay.lines.map((line) => line.id === pendingId ? {
					...line,
					text: result.reply,
					status: "ok",
					at: Date.now()
				} : line)
			}));
			setWorker((current) => current ? {
				...current,
				cycle: result.cycle,
				enlisted: result.enlisted,
				included: result.included
			} : current);
		} catch (error) {
			const message = error instanceof Error ? error.message : "The relay dropped the reply.";
			patchRelay(relayId, (relay) => ({
				...relay,
				lines: relay.lines.map((line) => line.id === pendingId ? {
					...line,
					text: message,
					status: "error"
				} : line)
			}));
		} finally {
			setBusy(false);
		}
	}
	async function transmitDraft() {
		const text = draft.trim();
		if (!text || busy || !active) return;
		const history = lines.filter((line) => line.status === "ok").map((line) => ({
			memberId: line.memberId,
			text: line.text
		}));
		const operatorLine = {
			id: crypto.randomUUID(),
			memberId: OPERATOR.id,
			text,
			at: Date.now(),
			status: "ok"
		};
		const relayId = active.id;
		patchRelay(relayId, (relay) => ({
			...relay,
			lines: [...relay.lines, operatorLine]
		}));
		setDraft("");
		await deliver(relayId, selected.id, text, history);
	}
	async function retry(line) {
		if (!line.prompt || busy || !active) return;
		const history = lines.filter((item) => item.status === "ok" && item.at <= line.at && item.id !== line.id).map((item) => ({
			memberId: item.memberId,
			text: item.text
		}));
		const relayId = active.id;
		patchRelay(relayId, (relay) => ({
			...relay,
			lines: relay.lines.filter((item) => item.id !== line.id)
		}));
		await deliver(relayId, line.memberId, line.prompt, history);
	}
	function focusComposer() {
		if (window.matchMedia("(max-width: 767px)").matches) setTyping(true);
	}
	function blurComposer(event) {
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
		patchRelay(active.id, (relay) => ({
			...relay,
			lines: []
		}));
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref: shell,
		className: "fixed inset-x-0 top-0 flex h-dvh flex-col bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3 md:px-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-xs tracking-widest text-cherry",
						children: "FEDERATED PLATFORM"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "truncate text-lg font-semibold tracking-tight text-balance",
						children: "Legion Relay"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hidden text-right sm:block",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-xs text-faint",
							children: "ON PLATFORM"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-mono text-sm text-sage tabular-nums",
							children: [HOST_COUNTS.total, " aliases"]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-left font-mono text-xs leading-tight text-sage",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, {
							className: "size-3.5 shrink-0 text-cherry",
							"aria-hidden": "true"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block",
							children: "Federated"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block text-faint",
							children: "engine-sealed"
						})] })]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-4 py-2 font-mono text-xs text-muted md:px-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["IPAWS ", HOST_COUNTS.ipaws] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["TRACS ", HOST_COUNTS.tracs] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Post-fusion ", HOST_COUNTS.post] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-sage",
						children: [HOST_COUNTS.total, " aliases"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sage",
						children: "Engine-sealed"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-faint",
						children: "Source on platform"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: worker ? "text-sage" : "text-faint",
						children: worker ? "ns fusion on" : workerError ? "fusion down" : "ns fusion"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-0 flex-1 flex-col md:flex-row",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
					className: "w-full shrink-0 flex-col border-b border-line bg-surface md:flex md:h-auto md:min-h-0 md:w-80 md:flex-none md:border-r md:border-b-0 " + (typing ? "hidden " : "flex ") + (aliasesOpen ? "h-96 " : "h-auto "),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex shrink-0 items-center gap-1 overflow-x-auto border-b border-line px-2 py-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: addRelay,
								className: "inline-flex h-11 shrink-0 items-center gap-1 rounded-md border border-line px-3 text-xs font-medium text-sage",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
									className: "size-3.5",
									"aria-hidden": "true"
								}), "Add"]
							}), conversations.map((relay, index) => {
								const title = relayTitle(relay, index);
								const on = relay.id === active?.id;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex shrink-0 items-center rounded-md border " + (on ? "border-cherry bg-raised" : "border-line"),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-pressed": on,
										onClick: () => {
											setActiveId(relay.id);
											setDraft("");
										},
										className: "h-11 max-w-40 truncate px-3 text-left text-sm",
										children: title
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-label": `Delete ${title}`,
										onClick: () => deleteRelay(relay.id),
										className: "inline-flex size-11 items-center justify-center text-faint hover:text-cherry",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {
											className: "size-4",
											"aria-hidden": "true"
										})
									})]
								}, relay.id);
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-2 border-b border-line px-4 py-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "font-mono text-xs tracking-widest text-faint",
								children: ["HOSTED ALIASES · ", HOST_COUNTS.total]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-expanded": aliasesOpen,
								"aria-label": aliasesOpen ? "Collapse hosted aliases" : "Expand hosted aliases",
								onClick: () => setAliasesOpen((open) => !open),
								className: "inline-flex size-11 items-center justify-center rounded-md border border-line text-sage",
								children: aliasesOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, {
									className: "size-4",
									"aria-hidden": "true"
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
									className: "size-4",
									"aria-hidden": "true"
								})
							})]
						}),
						aliasesOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "border-b border-line px-4 py-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "sr-only",
										children: "Filter aliases"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: query,
										onChange: (event) => setQuery(event.target.value),
										placeholder: "Filter aliases",
										className: "w-full rounded-sm border border-line bg-bg px-3 py-2 text-sm text-fg outline-none placeholder:text-faint focus:border-cherry"
									})]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-h-0 flex-1 overflow-y-auto p-2",
								children: [groups.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mb-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "px-2 py-1 font-mono text-xs tracking-widest text-faint",
										children: [
											group.host,
											" · ",
											group.rows.length
										]
									}), group.rows.map((alias) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AliasButton, {
										active: alias.id === selected.id,
										alias,
										onSelect: () => chooseAlias(alias.id)
									}, alias.id))]
								}, group.host)), visible.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "px-2 py-6 text-sm text-muted",
									children: "No hosted alias matches that filter."
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "border-t border-line px-4 py-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-mono text-xs text-faint",
									children: "OPERATOR"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-sm",
									children: OPERATOR.alias
								})]
							})
						] })
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "flex min-h-0 min-w-0 flex-1 flex-col bg-bg",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						ref: scroller,
						className: "min-h-0 flex-1 overflow-y-auto px-4 py-4 md:block md:px-6 " + (typing ? "hidden" : ""),
						"aria-live": "polite",
						children: lines.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { alias: selected }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mx-auto flex max-w-3xl flex-col gap-3",
							children: lines.map((line) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bubble, {
								line,
								busy,
								onRetry: () => retry(line)
							}, line.id))
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("form", {
						className: "shrink-0 border-t border-line bg-surface px-3 py-3 md:order-none md:px-5",
						onSubmit: (event) => {
							event.preventDefault();
							transmitDraft();
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mx-auto flex max-w-3xl flex-col gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "min-w-0 truncate font-mono text-xs text-muted",
										children: [
											"Addressing ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-fg",
												children: selected.label
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-faint",
												children: [" · ", selected.host]
											})
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: clearChamber,
										className: "inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-faint hover:text-fg",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eraser, {
											className: "size-3.5",
											"aria-hidden": "true"
										}), "Clear"]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-end gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "min-w-0 flex-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "sr-only",
												children: "Message"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
												ref: field,
												value: draft,
												rows: 2,
												maxLength: 2e3,
												placeholder: `Message ${selected.label}…`,
												onChange: (event) => setDraft(event.target.value),
												onFocus: focusComposer,
												onBlur: blurComposer,
												onKeyDown: (event) => {
													if (event.key === "Enter" && !event.shiftKey) {
														event.preventDefault();
														transmitDraft();
													}
												},
												className: "max-h-40 min-h-12 w-full resize-none rounded-md border border-line bg-bg px-3 py-3 text-sm leading-relaxed text-fg outline-none placeholder:text-faint focus:border-cherry"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onPointerDown: (event) => event.preventDefault(),
											onClick: cycle,
											"aria-label": "Cycle to the next alias",
											className: "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-line text-sage hover:border-sage",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCw, {
												className: "size-4",
												"aria-hidden": "true"
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "submit",
											onPointerDown: (event) => event.preventDefault(),
											disabled: busy || !draft.trim(),
											"aria-label": busy ? "Sending" : "Transmit",
											className: "inline-flex h-12 items-center gap-2 rounded-md bg-cherry px-4 text-sm font-semibold text-fg disabled:opacity-40",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, {
												className: "size-4",
												"aria-hidden": "true"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "hidden sm:inline",
												children: busy ? "Sending" : "Transmit"
											})]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-mono text-xs text-faint",
									children: "Federated platform · ns fusion · Enter to send"
								})
							]
						})
					})]
				})]
			})
		]
	});
}
function AliasButton({ active, alias, onSelect }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		"aria-pressed": active,
		onClick: onSelect,
		className: "mb-1 flex min-h-11 w-full items-center rounded-md px-2 py-2 text-left " + (active ? "bg-raised ring-1 ring-cherry" : "hover:bg-raised"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "min-w-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "block truncate text-sm font-medium",
				children: alias.label
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "block truncate font-mono text-xs text-muted",
				children: alias.domainLabel
			})]
		})
	});
}
function EmptyState({ alias, compact = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: compact ? "flex flex-col gap-3" : "mx-auto flex min-h-full max-w-lg flex-col justify-center gap-3 py-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-xs tracking-widest text-cherry",
				children: "CHAMBER OPEN"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-semibold tracking-tight text-balance " + (compact ? "text-xl" : "text-2xl"),
				children: "Federated multi-channel bio-frame relay"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm leading-relaxed text-pretty text-muted",
				children: [HOST_COUNTS.total, " bio-frames federate across IPAWS, TRACS, and post-fusion. A frame is one hosted alias on one domain channel."]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: "grid grid-cols-2 gap-x-4 gap-y-2 text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "font-mono text-xs text-faint",
						children: "Frame"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "truncate text-fg",
						children: alias.label
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "font-mono text-xs text-faint",
						children: "Surface"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: alias.host })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "font-mono text-xs text-faint",
						children: "Channel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "truncate",
						children: alias.domainLabel
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "font-mono text-xs text-faint",
						children: "Relay"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Shared transcript" })] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm leading-relaxed text-pretty text-faint",
				children: "Transmit binds the operator line to this frame. The reply returns on the same transcript."
			})
		]
	});
}
function Bubble({ line, busy, onRetry }) {
	const mine = line.memberId === OPERATOR.id;
	const alias = mine ? null : aliasById(line.memberId);
	const who = mine ? OPERATOR.name : alias?.label ?? "Alias";
	const host = mine ? OPERATOR.alias : alias ? `${alias.host} · ${alias.domainLabel}` : "";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "max-w-xl rounded-md border px-3 py-3 " + (mine ? "ml-auto border-line bg-raised" : line.status === "error" ? "border-cherry bg-cherry-ink" : "border-line bg-surface"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mb-1.5 flex items-baseline justify-between gap-3 font-mono text-xs",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: mine ? "text-cherry" : "text-sage",
					children: [who, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-faint",
						children: [" · ", host]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("time", {
					className: "shrink-0 text-faint tabular-nums",
					dateTime: new Date(line.at).toISOString(),
					children: clock(line.at)
				})]
			}),
			line.status === "pending" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "flex items-center gap-1 text-sm text-muted",
				"aria-label": `${who} is answering`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "think-dot inline-block size-1.5 rounded-full bg-sage" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "think-dot inline-block size-1.5 rounded-full bg-sage" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "think-dot inline-block size-1.5 rounded-full bg-sage" })
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm leading-relaxed whitespace-pre-wrap text-pretty",
				children: line.text
			}),
			line.status === "error" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				disabled: busy,
				onClick: onRetry,
				className: "mt-2 text-xs font-medium text-fg underline decoration-cherry underline-offset-2 disabled:opacity-40",
				children: "Retry this alias"
			})
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chamber, {});
}
//#endregion
export { Home as component };
