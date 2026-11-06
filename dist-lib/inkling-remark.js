import { embedFonts, isSettingKey, parse, readOverrides, renderDiagram, setDirective } from "./inkling-node.js";
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
// src/markdown/remark.ts
function asMdast(node) {
	return {
		type: "inklingDiagram",
		data: {
			hName: node.tagName,
			hProperties: node.properties,
			hChildren: node.children
		}
	};
}
function findStyle(node) {
	if (node.type !== "element") return null;
	if (node.tagName === "style") return node;
	for (const c of node.children) {
		const s = findStyle(c);
		if (s) return s;
	}
	return null;
}
function remarkInkling(options = {}) {
	return function transform(root, file) {
		const tree = root;
		const path = file?.path ?? file?.history?.[0];
		const warn = options.warn ?? ((m) => {
			file?.message?.(m);
			console.warn(m);
		});
		let needsScript = false;
		let hydrated = false;
		const pending = [];
		const visit = (parent) => {
			const kids = parent.children;
			if (!kids) return;
			for (let i = 0; i < kids.length; i++) {
				const node = kids[i];
				if (node.type === "code" && isInklingInfo(node.lang)) {
					const result = renderFence(node.value ?? "", node.meta, {
						...options,
						warn
					}, {
						file: path,
						line: node.position?.start.line
					});
					needsScript ||= result.needsScript;
					hydrated ||= result.mode === "svg" && !!options.hydrate && !!result.svg;
					if (options.embedFonts && result.svg) {
						const svgNode = result.node.children.find((c) => c.type === "element" && c.tagName === "svg");
						pending.push(embedFonts(result.svg).then((embedded) => {
							const css = embedded.match(/<style>([\s\S]*?)<\/style>/)?.[1];
							const style = svgNode && findStyle(svgNode);
							if (css !== void 0 && style) style.children = [{
								type: "text",
								value: css
							}];
						}));
					}
					kids[i] = asMdast(result.node);
				} else visit(node);
			}
		};
		visit(tree);
		const finish = () => {
			if (needsScript && tree.children) for (const s of scriptNodes(options, hydrated)) tree.children.push(asMdast(s));
		};
		if (!pending.length) {
			finish();
			return root;
		}
		return Promise.all(pending).then(() => {
			finish();
			return root;
		});
	};
}
export { remarkInkling as default, remarkInkling, parseInfo };
