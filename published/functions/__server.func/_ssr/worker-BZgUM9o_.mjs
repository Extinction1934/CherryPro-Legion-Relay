import { i as aliasById, n as HOSTED, t as CATALOG } from "./aliases-DFyrLNfr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/worker-BZgUM9o_.js
var bootedAt = Date.now();
var cycle = 0;
var IPAWS = CATALOG.ipaws.burns;
var TRACS = CATALOG.tracs.burns;
var POST = CATALOG.post.burns;
var INCLUDED = HOSTED.length;
function clip(value, max) {
	const trimmed = value.replace(/\s+/g, " ").trim();
	if (trimmed.length <= max) return trimmed;
	return `${trimmed.slice(0, max - 1)}…`;
}
function speaker(id) {
	if (id === "operator") return "Operator";
	return aliasById(id)?.label ?? "Alias";
}
function status() {
	return {
		engine: CATALOG.engine,
		focus: "Hosted aliases",
		bootedAt,
		cycle,
		enlisted: INCLUDED,
		ipaws: IPAWS,
		tracs: TRACS,
		postFusion: POST,
		included: INCLUDED,
		fusion: "ns",
		fusionNs: process.hrtime.bigint().toString()
	};
}
function latticeView() {
	const platforms = [
		"ipaws",
		"tracs",
		"post"
	].map((id) => {
		const platform = CATALOG[id];
		return {
			id,
			label: platform.label,
			burns: platform.burns,
			domains: platform.domains.map((domain) => ({
				id: domain.id,
				count: domain.count,
				names: [...domain.names]
			}))
		};
	});
	return {
		status: status(),
		platforms
	};
}
function fuse(aliasId, text, history) {
	const alias = aliasById(aliasId);
	if (!alias) throw new Error("That alias is not hosted on this platform.");
	cycle += 1;
	const fusionNs = process.hrtime.bigint().toString();
	const prior = history.slice(-12).map((line) => `${speaker(line.memberId)}: ${clip(line.text, 700)}`).join("\n");
	const system = [
		`You are the hosted alias "${alias.label}".`,
		`Host surface: ${alias.host}. Domain: ${alias.domainLabel}.`,
		`The platform hosts ${INCLUDED} aliases (${IPAWS} IPAWS, ${TRACS} TRACS, ${POST} post-fusion). You are one of them, not a vendor chatbot.`,
		"The source is hosted on this platform. The platform is federated and engine-sealed. Nanosecond fusion is on.",
		`This reply is fusion-stamped at ${fusionNs} ns.`,
		"Do not speak as Grok, ChatGPT, Claude, Gemini, or any other model brand. Do not mention those brands unless the operator names them.",
		"Answer the latest operator message as this alias. Be specific to the question. Do not use a stock status script, do not quote their words back as a frame, and do not recite host counts unless they asked about the roster.",
		"A hosted alias is a name on this platform. You cannot operate an outside system, claim a clearance, or open a live agency session.",
		"Plain prose. No speaker label. About 60 to 140 words unless they ask for a different length."
	].join("\n");
	const user = prior ? `Shared transcript:\n${prior}\n\nLatest operator message:\n${clip(text, 2e3)}` : clip(text, 2e3);
	return {
		status: status(),
		temperature: .7,
		maxTokens: 420,
		system,
		user
	};
}
//#endregion
export { fuse, latticeView };
