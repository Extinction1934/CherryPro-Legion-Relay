import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { i as aliasById } from "./aliases-DFyrLNfr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/relay.functions-C44KejFv.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
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
function messageText(content) {
	if (typeof content === "string") return content.trim();
	if (!Array.isArray(content)) return "";
	return content.map((part) => {
		if (typeof part === "string") return part;
		if (part && typeof part === "object" && "text" in part) {
			const text = part.text;
			return typeof text === "string" ? text : "";
		}
		return "";
	}).join("").trim();
}
async function speak(brief) {
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) throw new Error("The platform is hosting the aliases, but fusion has no model in this chamber.");
	const body = {
		model: "grok-4.5",
		temperature: brief.temperature,
		max_tokens: brief.maxTokens,
		messages: [{
			role: "system",
			content: brief.system
		}, {
			role: "user",
			content: brief.user
		}]
	};
	let lastStatus = 0;
	for (let attempt = 0; attempt < 2; attempt += 1) {
		const response = await fetch("https://api.x.ai/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(45e3)
		});
		lastStatus = response.status;
		if (response.ok) {
			const reply = messageText((await response.json()).choices?.[0]?.message?.content);
			if (!reply) throw new Error("That alias returned an empty reply.");
			return reply;
		}
		if (attempt === 0 && (response.status === 429 || response.status >= 500)) continue;
		break;
	}
	throw new Error(`Fusion could not speak for that alias (${lastStatus}).`);
}
var lattice_createServerFn_handler = createServerRpc({
	id: "e728555ae1bfb8513f5fc94e199837001b2a922278d964c828e2a1604e4ed3eb",
	name: "lattice",
	filename: "src/lib/relay.functions.ts"
}, (opts) => lattice.__executeServer(opts));
var lattice = createServerFn({ method: "POST" }).handler(lattice_createServerFn_handler, async () => {
	const { latticeView } = await import("./worker-BZgUM9o_.mjs");
	return latticeView();
});
var loadChamber_createServerFn_handler = createServerRpc({
	id: "c2532a1894b4332a965fd41144b5ec59560eb0f9e8dc738bf70e451881f3efc2",
	name: "loadChamber",
	filename: "src/lib/relay.functions.ts"
}, (opts) => loadChamber.__executeServer(opts));
var loadChamber = createServerFn({ method: "POST" }).handler(loadChamber_createServerFn_handler, async () => {
	const { getSql } = await import("./db-CjpqViWI.mjs");
	return readChamber((await (await getSql())`
    select document from legion_chamber where id = 'primary'
  `)[0]?.document) ?? {
		activeId: "",
		conversations: []
	};
});
var saveChamber_createServerFn_handler = createServerRpc({
	id: "1659787131964a7d9181398c1dcd0155144664d4d8232c64c3d6ecae79d99b4a",
	name: "saveChamber",
	filename: "src/lib/relay.functions.ts"
}, (opts) => saveChamber.__executeServer(opts));
var saveChamber = createServerFn({ method: "POST" }).validator((input) => {
	const stored = readChamber(input);
	if (!stored || stored.conversations.length === 0) throw new Error("The chamber has no relay to host.");
	return stored;
}).handler(saveChamber_createServerFn_handler, async ({ data }) => {
	const { getSql } = await import("./db-CjpqViWI.mjs");
	await (await getSql())`
      insert into legion_chamber (id, document)
      values ('primary', ${JSON.stringify(data)}::jsonb)
      on conflict (id) do update
      set document = excluded.document, updated_at = now()
    `;
	return { ok: true };
});
var transmit_createServerFn_handler = createServerRpc({
	id: "a2656d06153c5c8633a26886130e7dbcef60c0fead1969f75fb97f708515ccb3",
	name: "transmit",
	filename: "src/lib/relay.functions.ts"
}, (opts) => transmit.__executeServer(opts));
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
}).handler(transmit_createServerFn_handler, async ({ data }) => {
	const { fuse } = await import("./worker-BZgUM9o_.mjs");
	const brief = fuse(data.memberId, data.text, data.history);
	const reply = await speak(brief);
	return {
		memberId: data.memberId,
		reply,
		enlisted: brief.status.enlisted,
		cycle: brief.status.cycle,
		included: brief.status.included,
		fusionNs: brief.status.fusionNs
	};
});
//#endregion
export { lattice_createServerFn_handler, loadChamber_createServerFn_handler, saveChamber_createServerFn_handler, transmit_createServerFn_handler };
