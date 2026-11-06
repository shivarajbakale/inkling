import { isSettingKey, parse, readOverrides, renderDiagram, setDirective } from "./inkling-node.js";
// src/markdown/info.ts
/**
* Reads a fence's info string:
*
*   ```inkling paper=chalkboard autoplay height=320 alt="The water cycle"
*
* Values may be bare (`paper=napkin`) or quoted with " or '. A word with no
* value is a flag (`autoplay`).
*/
/** Splits `a=1 b="x y" c` into pairs. Unquoted values end at whitespace. */
function tokenizeInfo(meta) {
	const out = [];
	const re = /([^\s=]+)(?:=(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(\S*)))?/g;
	let m;
	while (m = re.exec(meta)) {
		const [whole, key, dq, sq, bare] = m;
		const value = !whole.includes("=") ? null : (dq ?? sq)?.replace(/\\(.)/g, "$1") ?? bare ?? "";
		out.push({
			key,
			value
		});
	}
	return out;
}
/** The language word a fence must start with. */
var LANG = "inkling";
/** True when an info string (`inkling paper=x`) is an Inkling fence. */
function isInklingInfo(info) {
	return (info ?? "").trim().split(/\s+/)[0] === LANG;
}
function parseInfo(meta) {
	const info = {
		settings: {},
		autoplay: false,
		controls: true,
		problems: []
	};
	for (const { key, value } of tokenizeInfo(meta ?? "")) {
		const k = key.toLowerCase();
		if (isSettingKey(k)) {
			if (value === null || value === "") info.problems.push(`"${k}" needs a value, like ${k}=…`);
			else info.settings[k] = value;
		} else if (k === "autoplay") info.autoplay = value === null || !/^(false|no|0|off)$/i.test(value);
		else if (k === "controls") info.controls = !(value !== null && /^(none|false|no|0|off)$/i.test(value));
		else if (k === "height") {
			const n = Number(String(value ?? "").replace(/px$/, ""));
			if (!value || !Number.isFinite(n) || n <= 0) info.problems.push(`height should be a number of pixels, like height=320, not "${value ?? ""}".`);
			else info.height = n;
		} else if (k === "alt") info.alt = value ?? "";
		else if (k === "mode") {
			if (value === "client" || value === "svg") info.mode = value;
			else info.problems.push(`mode can be "client" or "svg", not "${value ?? ""}".`);
		} else info.problems.push(`Unknown fence option "${key}". Options are any setting (paper, pen, hand, mess, seed, layout), autoplay, controls=none, height, alt and mode.`);
	}
	return info;
}
// src/markdown/fence.ts
/**
* One ```inkling fence → one element tree. Shared by the remark and
* markdown-it plugins: remark hands the tree to rehype as hast, markdown-it
* prints it with `toHTML`. Both modes and the error box are built here.
*/
var el = (tagName, properties = {}, children = []) => ({
	type: "element",
	tagName,
	properties,
	children
});
var text = (value) => ({
	type: "text",
	value
});
function fromSVGTree(t) {
	return el(t.tagName, { ...t.attributes }, t.children.map((c) => typeof c === "string" ? text(c) : fromSVGTree(c)));
}
/** Inkling attributes `<inkling-diagram>` understands. Other settings go into the source. */
var ELEMENT_ATTRS = /* @__PURE__ */ new Set([
	"paper",
	"pen",
	"hand",
	"mess",
	"seed"
]);
function where(ctx, sourceLine) {
	const line = (ctx.line ?? 0) + sourceLine;
	return `${ctx.file ?? "markdown"}:${line}`;
}
function renderFence(source, meta, options, ctx = {}) {
	const info = parseInfo(meta);
	const mode = info.mode ?? options.mode ?? "client";
	const cls = options.className ?? "inkling";
	const errors = info.problems.map((p) => `${where(ctx, 0)}: ${p}`);
	const { problems } = readOverrides(info.settings);
	for (const p of problems) errors.push(`${where(ctx, 0)}: ${p.key}=${p.value}: ${p.message}`);
	const clean = Object.fromEntries(Object.entries(info.settings).filter(([k]) => !problems.some((p) => p.key === k)));
	let diagnostics;
	let node;
	let svg;
	if (mode === "svg") {
		const r = renderDiagram(source, {
			...clean,
			fontCss: options.fontCss
		});
		diagnostics = r.doc.diagnostics;
		svg = r.svg;
		const tree = fromSVGTree(r.tree);
		const style = [`max-width:100%`, info.height ? `height:${info.height}px;width:auto` : `height:auto`].join(";");
		tree.properties.style = style;
		if (info.alt !== void 0) tree.properties["aria-label"] = info.alt;
		else if (r.doc.title) tree.properties["aria-label"] = r.doc.title;
		const props = { class: cls };
		if (options.hydrate) {
			props["data-inkling-source"] = source;
			for (const [k, v] of Object.entries(clean)) props[`data-inkling-${k}`] = v;
			if (info.autoplay) props["data-inkling-autoplay"] = "";
			if (!info.controls) props["data-inkling-controls"] = "none";
		}
		const children = [tree];
		if (r.doc.title) children.push(el("figcaption", {}, [text(r.doc.title)]));
		node = el("figure", props, children);
	} else {
		diagnostics = parse(source).diagnostics;
		let body = source;
		const props = {};
		for (const [k, v] of Object.entries(clean)) if (ELEMENT_ATTRS.has(k)) props[k] = v;
		else body = setDirective(body, k, v);
		if (info.autoplay) props.autoplay = true;
		if (!info.controls) props.controls = "none";
		if (info.height) props.style = `display:block;min-height:${info.height}px`;
		if (info.alt !== void 0) props["aria-label"] = info.alt;
		node = el("inkling-diagram", props, [text(`\n${body.replace(/\n+$/, "")}\n`)]);
	}
	for (const d of diagnostics) if (d.severity === "error") errors.push(`${where(ctx, d.span.line)}: ${d.message}${d.hint ? ` ${d.hint}` : ""} [${d.code}]`);
	if (errors.length && options.strict) throw new Error(`Inkling diagram has errors:\n${errors.join("\n")}`);
	if (errors.length) {
		(options.warn ?? console.warn)(`Inkling: ${errors.join("\n")}`);
		if (mode === "svg") {
			node = el("div", {
				class: `${cls}-error`,
				role: "alert"
			}, [el("pre", {}, [text(errors.join("\n"))])]);
			svg = void 0;
		}
	}
	return {
		node,
		mode,
		needsScript: mode === "client" || mode === "svg" && !!options.hydrate && !!svg,
		diagnostics,
		errors,
		svg
	};
}
/**
* Turns static, hydratable figures into live `<inkling-diagram>` elements
* once inkling.iife.js has loaded. Added to the page with `hydrate` and
* `injectScript`.
*/
var HYDRATE_SCRIPT = `(function(){function up(){if(!window.customElements||!customElements.get('inkling-diagram'))return;document.querySelectorAll('figure[data-inkling-source]').forEach(function(f){var d=document.createElement('inkling-diagram');for(var i=0;i<f.attributes.length;i++){var a=f.attributes[i];if(a.name.indexOf('data-inkling-')===0&&a.name!=='data-inkling-source')d.setAttribute(a.name.slice(13),a.value)}d.setAttribute('source',f.getAttribute('data-inkling-source'));f.replaceWith(d)})}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',up);else up()})();`;
/** The script tags a page with diagrams needs, as trees. */
function scriptNodes(options, hydrated) {
	if (!options.injectScript) return [];
	const out = [el("script", { src: options.injectScript }, [])];
	if (hydrated) out.push(el("script", {}, [text(HYDRATE_SCRIPT)]));
	return out;
}
var escText = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
var escAttr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
var VOID = /* @__PURE__ */ new Set([
	"br",
	"hr",
	"img",
	"input",
	"meta",
	"link"
]);
/** Elements whose text the HTML parser takes literally. */
var RAW = /* @__PURE__ */ new Set(["script", "style"]);
/** Prints a tree as HTML. Text and attributes are escaped, so no source can break out of its element. */
function toHTML(node, parentTag = "", inSvg = false) {
	if (node.type === "text") {
		if (RAW.has(parentTag) && !inSvg) return node.value.replace(/<\/(script|style)/gi, "<\\/$1");
		return escText(node.value);
	}
	const svg = inSvg || node.tagName === "svg";
	const attrs = Object.entries(node.properties).filter(([, v]) => v !== false).map(([k, v]) => v === true ? ` ${k}` : ` ${k}="${escAttr(String(v))}"`).join("");
	if (svg && !node.children.length) return `<${node.tagName}${attrs}/>`;
	if (VOID.has(node.tagName)) return `<${node.tagName}${attrs}>`;
	return `<${node.tagName}${attrs}>${node.children.map((c) => toHTML(c, node.tagName, svg)).join("")}</${node.tagName}>`;
}
// src/markdown/markdown-it.ts
/**
* markdown-it plugin: turns ```inkling fences into diagrams. For VitePress
* and any other markdown-it setup.
*
*   import inklingMarkdownIt from './vendor/inkling/inkling-markdown-it.js';
*   md.use(inklingMarkdownIt, { mode: 'svg' });
*
* markdown-it renders synchronously, so `embedFonts` is not available here;
* use `fontCss` to point the SVGs at a stylesheet instead.
*/
function inklingMarkdownIt(instance, options = {}) {
	const md = instance;
	const previous = md.renderer.rules.fence;
	md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
		const token = tokens[idx];
		if (!isInklingInfo(token.info)) return previous ? previous(tokens, idx, opts, env, self) : "";
		const meta = token.info.trim().replace(/^\S+\s*/, "");
		const file = env?.relativePath ?? env?.path ?? env?.file;
		const result = renderFence(token.content.replace(/\n$/, ""), meta, options, {
			file,
			line: token.map ? token.map[0] + 1 : void 0
		});
		if (options.vue) result.node.properties["v-pre"] = true;
		return toHTML(result.node) + "\n";
	};
	if (options.injectScript) md.core.ruler.push("inkling_script", (state) => {
		let client = false;
		let hydrated = false;
		for (const t of state.tokens) {
			if (t.type !== "fence" || !isInklingInfo(t.info)) continue;
			if ((/(?:^|\s)mode=(svg|client)\b/.exec(t.info)?.[1] ?? options.mode ?? "client") === "client") client = true;
			else if (options.hydrate) hydrated = true;
		}
		if (!client && !hydrated) return;
		const tok = new state.Token("html_block", "", 0);
		tok.content = scriptNodes(options, hydrated).map((n) => toHTML(n)).join("\n") + "\n";
		state.tokens.push(tok);
	});
}
export { inklingMarkdownIt as default, inklingMarkdownIt, parseInfo };
