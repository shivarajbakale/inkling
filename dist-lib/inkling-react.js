"use client";
import { forwardRef as e, useEffect as t, useImperativeHandle as n, useMemo as r, useRef as i, useState as a } from "react";
import { jsx as o, jsxs as s } from "react/jsx-runtime";
// \0rolldown/runtime.js
var c = Object.create, l = Object.defineProperty, u = Object.getOwnPropertyDescriptor, d = Object.getOwnPropertyNames, f = Object.getPrototypeOf, p = Object.prototype.hasOwnProperty, m = (e, t, n) => () => {
	if (n) throw n[0];
	try {
		return e && (t = e(e = 0)), t;
	} catch (e) {
		throw n = [e], e;
	}
}, h = (e, t) => () => (t || (e((t = { exports: {} }).exports, t, t.exports), e = null), t.exports), g = (e, t, n, r) => {
	if (t && typeof t == "object" || typeof t == "function") for (var i = d(t), a = 0, o = i.length, s; a < o; a++) s = i[a], !p.call(e, s) && s !== n && l(e, s, {
		get: ((e) => t[e]).bind(null, s),
		enumerable: !(r = u(t, s)) || r.enumerable
	});
	return e;
}, _ = (e, t, n) => (n = e == null ? {} : c(f(e)), g(t || !e || !e.__esModule || !p.call(e, "default") ? l(n, "default", {
	value: e,
	enumerable: !0
}) : n, e));
// node_modules/roughjs/bundled/rough.esm.js
function v(e, t, n) {
	if (e && e.length) {
		let [r, i] = t, a = Math.PI / 180 * n, o = Math.cos(a), s = Math.sin(a);
		for (let t of e) {
			let [e, n] = t;
			t[0] = (e - r) * o - (n - i) * s + r, t[1] = (e - r) * s + (n - i) * o + i;
		}
	}
}
function y(e, t) {
	return e[0] === t[0] && e[1] === t[1];
}
function b(e, t, n, r = 1) {
	let i = n, a = Math.max(t, .1), o = e[0] && e[0][0] && typeof e[0][0] == "number" ? [e] : e, s = [0, 0];
	if (i) for (let e of o) v(e, s, i);
	let c = function(e, t, n) {
		let r = [];
		for (let t of e) {
			let e = [...t];
			y(e[0], e[e.length - 1]) || e.push([e[0][0], e[0][1]]), e.length > 2 && r.push(e);
		}
		let i = [];
		t = Math.max(t, .1);
		let a = [];
		for (let e of r) for (let t = 0; t < e.length - 1; t++) {
			let n = e[t], r = e[t + 1];
			if (n[1] !== r[1]) {
				let e = Math.min(n[1], r[1]);
				a.push({
					ymin: e,
					ymax: Math.max(n[1], r[1]),
					x: e === n[1] ? n[0] : r[0],
					islope: (r[0] - n[0]) / (r[1] - n[1])
				});
			}
		}
		if (a.sort(((e, t) => e.ymin < t.ymin ? -1 : e.ymin > t.ymin ? 1 : e.x < t.x ? -1 : e.x > t.x ? 1 : e.ymax === t.ymax ? 0 : (e.ymax - t.ymax) / Math.abs(e.ymax - t.ymax))), !a.length) return i;
		let o = [], s = a[0].ymin, c = 0;
		for (; o.length || a.length;) {
			if (a.length) {
				let e = -1;
				for (let t = 0; t < a.length && !(a[t].ymin > s); t++) e = t;
				a.splice(0, e + 1).forEach(((e) => {
					o.push({
						s,
						edge: e
					});
				}));
			}
			if (o = o.filter(((e) => !(e.edge.ymax <= s))), o.sort(((e, t) => e.edge.x === t.edge.x ? 0 : (e.edge.x - t.edge.x) / Math.abs(e.edge.x - t.edge.x))), (n !== 1 || c % t == 0) && o.length > 1) for (let e = 0; e < o.length; e += 2) {
				let t = e + 1;
				if (t >= o.length) break;
				let n = o[e].edge, r = o[t].edge;
				i.push([[Math.round(n.x), s], [Math.round(r.x), s]]);
			}
			s += n, o.forEach(((e) => {
				e.edge.x = e.edge.x + n * e.edge.islope;
			})), c++;
		}
		return i;
	}(o, a, r);
	if (i) {
		for (let e of o) v(e, s, -i);
		(function(e, t, n) {
			let r = [];
			e.forEach(((e) => r.push(...e))), v(r, t, n);
		})(c, s, -i);
	}
	return c;
}
function x(e, t) {
	let n = t.hachureAngle + 90, r = t.hachureGap;
	r < 0 && (r = 4 * t.strokeWidth), r = Math.round(Math.max(r, .1));
	let i = 1;
	return t.roughness >= 1 && (t.randomizer?.next() || Math.random()) > .7 && (i = r), b(e, r, n, i || 1);
}
var S = class {
	constructor(e) {
		this.helper = e;
	}
	fillPolygons(e, t) {
		return this._fillPolygons(e, t);
	}
	_fillPolygons(e, t) {
		let n = x(e, t);
		return {
			type: "fillSketch",
			ops: this.renderLines(n, t)
		};
	}
	renderLines(e, t) {
		let n = [];
		for (let r of e) n.push(...this.helper.doubleLineOps(r[0][0], r[0][1], r[1][0], r[1][1], t));
		return n;
	}
};
function C(e) {
	let t = e[0], n = e[1];
	return Math.sqrt((t[0] - n[0]) ** 2 + (t[1] - n[1]) ** 2);
}
var w = class extends S {
	fillPolygons(e, t) {
		let n = t.hachureGap;
		n < 0 && (n = 4 * t.strokeWidth), n = Math.max(n, .1);
		let r = x(e, Object.assign({}, t, { hachureGap: n })), i = Math.PI / 180 * t.hachureAngle, a = [], o = .5 * n * Math.cos(i), s = .5 * n * Math.sin(i);
		for (let [e, t] of r) C([e, t]) && a.push([[e[0] - o, e[1] + s], [...t]], [[e[0] + o, e[1] - s], [...t]]);
		return {
			type: "fillSketch",
			ops: this.renderLines(a, t)
		};
	}
}, T = class extends S {
	fillPolygons(e, t) {
		let n = this._fillPolygons(e, t), r = Object.assign({}, t, { hachureAngle: t.hachureAngle + 90 }), i = this._fillPolygons(e, r);
		return n.ops = n.ops.concat(i.ops), n;
	}
}, E = class {
	constructor(e) {
		this.helper = e;
	}
	fillPolygons(e, t) {
		let n = x(e, t = Object.assign({}, t, { hachureAngle: 0 }));
		return this.dotsOnLines(n, t);
	}
	dotsOnLines(e, t) {
		let n = [], r = t.hachureGap;
		r < 0 && (r = 4 * t.strokeWidth), r = Math.max(r, .1);
		let i = t.fillWeight;
		i < 0 && (i = t.strokeWidth / 2);
		let a = r / 4;
		for (let o of e) {
			let e = C(o), s = e / r, c = Math.ceil(s) - 1, l = e - c * r, u = (o[0][0] + o[1][0]) / 2 - r / 4, d = Math.min(o[0][1], o[1][1]);
			for (let e = 0; e < c; e++) {
				let o = d + l + e * r, s = u - a + 2 * Math.random() * a, c = o - a + 2 * Math.random() * a, f = this.helper.ellipse(s, c, i, i, t);
				n.push(...f.ops);
			}
		}
		return {
			type: "fillSketch",
			ops: n
		};
	}
}, D = class {
	constructor(e) {
		this.helper = e;
	}
	fillPolygons(e, t) {
		let n = x(e, t);
		return {
			type: "fillSketch",
			ops: this.dashedLine(n, t)
		};
	}
	dashedLine(e, t) {
		let n = t.dashOffset < 0 ? t.hachureGap < 0 ? 4 * t.strokeWidth : t.hachureGap : t.dashOffset, r = t.dashGap < 0 ? t.hachureGap < 0 ? 4 * t.strokeWidth : t.hachureGap : t.dashGap, i = [];
		return e.forEach(((e) => {
			let a = C(e), o = Math.floor(a / (n + r)), s = (a + r - o * (n + r)) / 2, c = e[0], l = e[1];
			c[0] > l[0] && (c = e[1], l = e[0]);
			let u = Math.atan((l[1] - c[1]) / (l[0] - c[0]));
			for (let e = 0; e < o; e++) {
				let a = e * (n + r), o = a + n, l = [c[0] + a * Math.cos(u) + s * Math.cos(u), c[1] + a * Math.sin(u) + s * Math.sin(u)], d = [c[0] + o * Math.cos(u) + s * Math.cos(u), c[1] + o * Math.sin(u) + s * Math.sin(u)];
				i.push(...this.helper.doubleLineOps(l[0], l[1], d[0], d[1], t));
			}
		})), i;
	}
}, O = class {
	constructor(e) {
		this.helper = e;
	}
	fillPolygons(e, t) {
		let n = t.hachureGap < 0 ? 4 * t.strokeWidth : t.hachureGap, r = t.zigzagOffset < 0 ? n : t.zigzagOffset, i = x(e, t = Object.assign({}, t, { hachureGap: n + r }));
		return {
			type: "fillSketch",
			ops: this.zigzagLines(i, r, t)
		};
	}
	zigzagLines(e, t, n) {
		let r = [];
		return e.forEach(((e) => {
			let i = C(e), a = Math.round(i / (2 * t)), o = e[0], s = e[1];
			o[0] > s[0] && (o = e[1], s = e[0]);
			let c = Math.atan((s[1] - o[1]) / (s[0] - o[0]));
			for (let e = 0; e < a; e++) {
				let i = 2 * e * t, a = 2 * (e + 1) * t, s = Math.sqrt(2 * t ** 2), l = [o[0] + i * Math.cos(c), o[1] + i * Math.sin(c)], u = [o[0] + a * Math.cos(c), o[1] + a * Math.sin(c)], d = [l[0] + s * Math.cos(c + Math.PI / 4), l[1] + s * Math.sin(c + Math.PI / 4)];
				r.push(...this.helper.doubleLineOps(l[0], l[1], d[0], d[1], n), ...this.helper.doubleLineOps(d[0], d[1], u[0], u[1], n));
			}
		})), r;
	}
}, k = {}, A = class {
	constructor(e) {
		this.seed = e;
	}
	next() {
		return this.seed ? (2 ** 31 - 1 & (this.seed = Math.imul(48271, this.seed))) / 2 ** 31 : Math.random();
	}
}, j = 0, M = 1, N = 2, P = {
	A: 7,
	a: 7,
	C: 6,
	c: 6,
	H: 1,
	h: 1,
	L: 2,
	l: 2,
	M: 2,
	m: 2,
	Q: 4,
	q: 4,
	S: 4,
	s: 4,
	T: 2,
	t: 2,
	V: 1,
	v: 1,
	Z: 0,
	z: 0
};
function ee(e, t) {
	return e.type === t;
}
function te(e) {
	let t = [], n = function(e) {
		let t = [];
		for (; e !== "";) if (e.match(/^([ \t\r\n,]+)/)) e = e.substr(RegExp.$1.length);
		else if (e.match(/^([aAcChHlLmMqQsStTvVzZ])/)) t[t.length] = {
			type: j,
			text: RegExp.$1
		}, e = e.substr(RegExp.$1.length);
		else {
			if (!e.match(/^(([-+]?[0-9]+(\.[0-9]*)?|[-+]?\.[0-9]+)([eE][-+]?[0-9]+)?)/)) return [];
			t[t.length] = {
				type: M,
				text: `${parseFloat(RegExp.$1)}`
			}, e = e.substr(RegExp.$1.length);
		}
		return t[t.length] = {
			type: N,
			text: ""
		}, t;
	}(e), r = "BOD", i = 0, a = n[i];
	for (; !ee(a, N);) {
		let o = 0, s = [];
		if (r === "BOD") {
			if (a.text !== "M" && a.text !== "m") return te("M0,0" + e);
			i++, o = P[a.text], r = a.text;
		} else ee(a, M) ? o = P[r] : (i++, o = P[a.text], r = a.text);
		if (!(i + o < n.length)) throw Error("Path data ended short");
		for (let e = i; e < i + o; e++) {
			let t = n[e];
			if (!ee(t, M)) throw Error("Param not a number: " + r + "," + t.text);
			s[s.length] = +t.text;
		}
		if (typeof P[r] != "number") throw Error("Bad segment: " + r);
		{
			let e = {
				key: r,
				data: s
			};
			t.push(e), i += o, a = n[i], r === "M" && (r = "L"), r === "m" && (r = "l");
		}
	}
	return t;
}
function ne(e) {
	let t = 0, n = 0, r = 0, i = 0, a = [];
	for (let { key: o, data: s } of e) switch (o) {
		case "M":
			a.push({
				key: "M",
				data: [...s]
			}), [t, n] = s, [r, i] = s;
			break;
		case "m":
			t += s[0], n += s[1], a.push({
				key: "M",
				data: [t, n]
			}), r = t, i = n;
			break;
		case "L":
			a.push({
				key: "L",
				data: [...s]
			}), [t, n] = s;
			break;
		case "l":
			t += s[0], n += s[1], a.push({
				key: "L",
				data: [t, n]
			});
			break;
		case "C":
			a.push({
				key: "C",
				data: [...s]
			}), t = s[4], n = s[5];
			break;
		case "c": {
			let e = s.map(((e, r) => r % 2 ? e + n : e + t));
			a.push({
				key: "C",
				data: e
			}), t = e[4], n = e[5];
			break;
		}
		case "Q":
			a.push({
				key: "Q",
				data: [...s]
			}), t = s[2], n = s[3];
			break;
		case "q": {
			let e = s.map(((e, r) => r % 2 ? e + n : e + t));
			a.push({
				key: "Q",
				data: e
			}), t = e[2], n = e[3];
			break;
		}
		case "A":
			a.push({
				key: "A",
				data: [...s]
			}), t = s[5], n = s[6];
			break;
		case "a":
			t += s[5], n += s[6], a.push({
				key: "A",
				data: [
					s[0],
					s[1],
					s[2],
					s[3],
					s[4],
					t,
					n
				]
			});
			break;
		case "H":
			a.push({
				key: "H",
				data: [...s]
			}), t = s[0];
			break;
		case "h":
			t += s[0], a.push({
				key: "H",
				data: [t]
			});
			break;
		case "V":
			a.push({
				key: "V",
				data: [...s]
			}), n = s[0];
			break;
		case "v":
			n += s[0], a.push({
				key: "V",
				data: [n]
			});
			break;
		case "S":
			a.push({
				key: "S",
				data: [...s]
			}), t = s[2], n = s[3];
			break;
		case "s": {
			let e = s.map(((e, r) => r % 2 ? e + n : e + t));
			a.push({
				key: "S",
				data: e
			}), t = e[2], n = e[3];
			break;
		}
		case "T":
			a.push({
				key: "T",
				data: [...s]
			}), t = s[0], n = s[1];
			break;
		case "t":
			t += s[0], n += s[1], a.push({
				key: "T",
				data: [t, n]
			});
			break;
		case "Z":
		case "z": a.push({
			key: "Z",
			data: []
		}), t = r, n = i;
	}
	return a;
}
function re(e) {
	let t = [], n = "", r = 0, i = 0, a = 0, o = 0, s = 0, c = 0;
	for (let { key: l, data: u } of e) {
		switch (l) {
			case "M":
				t.push({
					key: "M",
					data: [...u]
				}), [r, i] = u, [a, o] = u;
				break;
			case "C":
				t.push({
					key: "C",
					data: [...u]
				}), r = u[4], i = u[5], s = u[2], c = u[3];
				break;
			case "L":
				t.push({
					key: "L",
					data: [...u]
				}), [r, i] = u;
				break;
			case "H":
				r = u[0], t.push({
					key: "L",
					data: [r, i]
				});
				break;
			case "V":
				i = u[0], t.push({
					key: "L",
					data: [r, i]
				});
				break;
			case "S": {
				let e = 0, a = 0;
				n === "C" || n === "S" ? (e = r + (r - s), a = i + (i - c)) : (e = r, a = i), t.push({
					key: "C",
					data: [
						e,
						a,
						...u
					]
				}), s = u[0], c = u[1], r = u[2], i = u[3];
				break;
			}
			case "T": {
				let [e, a] = u, o = 0, l = 0;
				n === "Q" || n === "T" ? (o = r + (r - s), l = i + (i - c)) : (o = r, l = i);
				let d = r + 2 * (o - r) / 3, f = i + 2 * (l - i) / 3, p = e + 2 * (o - e) / 3, m = a + 2 * (l - a) / 3;
				t.push({
					key: "C",
					data: [
						d,
						f,
						p,
						m,
						e,
						a
					]
				}), s = o, c = l, r = e, i = a;
				break;
			}
			case "Q": {
				let [e, n, a, o] = u, l = r + 2 * (e - r) / 3, d = i + 2 * (n - i) / 3, f = a + 2 * (e - a) / 3, p = o + 2 * (n - o) / 3;
				t.push({
					key: "C",
					data: [
						l,
						d,
						f,
						p,
						a,
						o
					]
				}), s = e, c = n, r = a, i = o;
				break;
			}
			case "A": {
				let e = Math.abs(u[0]), n = Math.abs(u[1]), a = u[2], o = u[3], s = u[4], c = u[5], l = u[6];
				e === 0 || n === 0 ? (t.push({
					key: "C",
					data: [
						r,
						i,
						c,
						l,
						c,
						l
					]
				}), r = c, i = l) : (r !== c || i !== l) && (ie(r, i, c, l, e, n, a, o, s).forEach((function(e) {
					t.push({
						key: "C",
						data: e
					});
				})), r = c, i = l);
				break;
			}
			case "Z": t.push({
				key: "Z",
				data: []
			}), r = a, i = o;
		}
		n = l;
	}
	return t;
}
function F(e, t, n) {
	return [e * Math.cos(n) - t * Math.sin(n), e * Math.sin(n) + t * Math.cos(n)];
}
function ie(e, t, n, r, i, a, o, s, c, l) {
	let u = (d = o, Math.PI * d / 180);
	var d;
	let f = [], p = 0, m = 0, h = 0, g = 0;
	if (l) [p, m, h, g] = l;
	else {
		[e, t] = F(e, t, -u), [n, r] = F(n, r, -u);
		let o = (e - n) / 2, l = (t - r) / 2, d = o * o / (i * i) + l * l / (a * a);
		d > 1 && (d = Math.sqrt(d), i *= d, a *= d);
		let f = i * i, _ = a * a, v = f * _ - f * l * l - _ * o * o, y = f * l * l + _ * o * o, b = (s === c ? -1 : 1) * Math.sqrt(Math.abs(v / y));
		h = b * i * l / a + (e + n) / 2, g = b * -a * o / i + (t + r) / 2, p = Math.asin(parseFloat(((t - g) / a).toFixed(9))), m = Math.asin(parseFloat(((r - g) / a).toFixed(9))), e < h && (p = Math.PI - p), n < h && (m = Math.PI - m), p < 0 && (p = 2 * Math.PI + p), m < 0 && (m = 2 * Math.PI + m), c && p > m && (p -= 2 * Math.PI), !c && m > p && (m -= 2 * Math.PI);
	}
	let _ = m - p;
	if (Math.abs(_) > 120 * Math.PI / 180) {
		let e = m, t = n, s = r;
		m = c && m > p ? p + 120 * Math.PI / 180 * 1 : p + 120 * Math.PI / 180 * -1, f = ie(n = h + i * Math.cos(m), r = g + a * Math.sin(m), t, s, i, a, o, 0, c, [
			m,
			e,
			h,
			g
		]);
	}
	_ = m - p;
	let v = Math.cos(p), y = Math.sin(p), b = Math.cos(m), x = Math.sin(m), S = Math.tan(_ / 4), C = 4 / 3 * i * S, w = 4 / 3 * a * S, T = [e, t], E = [e + C * y, t - w * v], D = [n + C * x, r - w * b], O = [n, r];
	if (E[0] = 2 * T[0] - E[0], E[1] = 2 * T[1] - E[1], l) return [
		E,
		D,
		O
	].concat(f);
	{
		f = [
			E,
			D,
			O
		].concat(f);
		let e = [];
		for (let t = 0; t < f.length; t += 3) {
			let n = F(f[t][0], f[t][1], u), r = F(f[t + 1][0], f[t + 1][1], u), i = F(f[t + 2][0], f[t + 2][1], u);
			e.push([
				n[0],
				n[1],
				r[0],
				r[1],
				i[0],
				i[1]
			]);
		}
		return e;
	}
}
var ae = {
	randOffset: function(e, t) {
		return I(e, t);
	},
	randOffsetWithRange: function(e, t, n) {
		return ve(e, t, n);
	},
	ellipse: function(e, t, n, r, i) {
		return de(e, t, i, ue(n, r, i)).opset;
	},
	doubleLineOps: function(e, t, n, r, i) {
		return L(e, t, n, r, i, !0);
	}
};
function oe(e, t, n, r, i) {
	return {
		type: "path",
		ops: L(e, t, n, r, i)
	};
}
function se(e, t, n) {
	let r = (e || []).length;
	if (r > 2) {
		let i = [];
		for (let t = 0; t < r - 1; t++) i.push(...L(e[t][0], e[t][1], e[t + 1][0], e[t + 1][1], n));
		return t && i.push(...L(e[r - 1][0], e[r - 1][1], e[0][0], e[0][1], n)), {
			type: "path",
			ops: i
		};
	}
	return r === 2 ? oe(e[0][0], e[0][1], e[1][0], e[1][1], n) : {
		type: "path",
		ops: []
	};
}
function ce(e, t, n, r, i) {
	return function(e, t) {
		return se(e, !0, t);
	}([
		[e, t],
		[e + n, t],
		[e + n, t + r],
		[e, t + r]
	], i);
}
function le(e, t) {
	if (e.length) {
		let n = typeof e[0][0] == "number" ? [e] : e, r = be(n[0], 1 * (1 + .2 * t.roughness), t), i = t.disableMultiStroke ? [] : be(n[0], 1.5 * (1 + .22 * t.roughness), ge(t));
		for (let e = 1; e < n.length; e++) {
			let a = n[e];
			if (a.length) {
				let e = be(a, 1 * (1 + .2 * t.roughness), t), n = t.disableMultiStroke ? [] : be(a, 1.5 * (1 + .22 * t.roughness), ge(t));
				for (let t of e) t.op !== "move" && r.push(t);
				for (let e of n) e.op !== "move" && i.push(e);
			}
		}
		return {
			type: "path",
			ops: r.concat(i)
		};
	}
	return {
		type: "path",
		ops: []
	};
}
function ue(e, t, n) {
	let r = Math.sqrt(2 * Math.PI * Math.sqrt(((e / 2) ** 2 + (t / 2) ** 2) / 2)), i = Math.ceil(Math.max(n.curveStepCount, n.curveStepCount / Math.sqrt(200) * r)), a = 2 * Math.PI / i, o = Math.abs(e / 2), s = Math.abs(t / 2), c = 1 - n.curveFitting;
	return o += I(o * c, n), s += I(s * c, n), {
		increment: a,
		rx: o,
		ry: s
	};
}
function de(e, t, n, r) {
	let [i, a] = Se(r.increment, e, t, r.rx, r.ry, 1, r.increment * ve(.1, ve(.4, 1, n), n), n), o = xe(i, null, n);
	if (!n.disableMultiStroke && n.roughness !== 0) {
		let [i] = Se(r.increment, e, t, r.rx, r.ry, 1.5, 0, n), a = xe(i, null, n);
		o = o.concat(a);
	}
	return {
		estimatedPoints: a,
		opset: {
			type: "path",
			ops: o
		}
	};
}
function fe(e, t, n, r, i, a, o, s, c) {
	let l = e, u = t, d = Math.abs(n / 2), f = Math.abs(r / 2);
	d += I(.01 * d, c), f += I(.01 * f, c);
	let p = i, m = a;
	for (; p < 0;) p += 2 * Math.PI, m += 2 * Math.PI;
	m - p > 2 * Math.PI && (p = 0, m = 2 * Math.PI);
	let h = 2 * Math.PI / c.curveStepCount, g = Math.min(h / 2, (m - p) / 2), _ = Ce(g, l, u, d, f, p, m, 1, c);
	if (!c.disableMultiStroke) {
		let e = Ce(g, l, u, d, f, p, m, 1.5, c);
		_.push(...e);
	}
	return o && (s ? _.push(...L(l, u, l + d * Math.cos(p), u + f * Math.sin(p), c), ...L(l, u, l + d * Math.cos(m), u + f * Math.sin(m), c)) : _.push({
		op: "lineTo",
		data: [l, u]
	}, {
		op: "lineTo",
		data: [l + d * Math.cos(p), u + f * Math.sin(p)]
	})), {
		type: "path",
		ops: _
	};
}
function pe(e, t) {
	let n = re(ne(te(e))), r = [], i = [0, 0], a = [0, 0];
	for (let { key: e, data: o } of n) switch (e) {
		case "M":
			a = [o[0], o[1]], i = [o[0], o[1]];
			break;
		case "L":
			r.push(...L(a[0], a[1], o[0], o[1], t)), a = [o[0], o[1]];
			break;
		case "C": {
			let [e, n, i, s, c, l] = o;
			r.push(...we(e, n, i, s, c, l, a, t)), a = [c, l];
			break;
		}
		case "Z": r.push(...L(a[0], a[1], i[0], i[1], t)), a = [i[0], i[1]];
	}
	return {
		type: "path",
		ops: r
	};
}
function me(e, t) {
	let n = [];
	for (let r of e) if (r.length) {
		let e = t.maxRandomnessOffset || 0, i = r.length;
		if (i > 2) {
			n.push({
				op: "move",
				data: [r[0][0] + I(e, t), r[0][1] + I(e, t)]
			});
			for (let a = 1; a < i; a++) n.push({
				op: "lineTo",
				data: [r[a][0] + I(e, t), r[a][1] + I(e, t)]
			});
		}
	}
	return {
		type: "fillPath",
		ops: n
	};
}
function he(e, t) {
	return function(e, t) {
		let n = e.fillStyle || "hachure";
		if (!k[n]) switch (n) {
			case "zigzag":
				k[n] || (k[n] = new w(t));
				break;
			case "cross-hatch":
				k[n] || (k[n] = new T(t));
				break;
			case "dots":
				k[n] || (k[n] = new E(t));
				break;
			case "dashed":
				k[n] || (k[n] = new D(t));
				break;
			case "zigzag-line":
				k[n] || (k[n] = new O(t));
				break;
			default: n = "hachure", k[n] || (k[n] = new S(t));
		}
		return k[n];
	}(t, ae).fillPolygons(e, t);
}
function ge(e) {
	let t = Object.assign({}, e);
	return t.randomizer = void 0, e.seed && (t.seed = e.seed + 1), t;
}
function _e(e) {
	return e.randomizer || (e.randomizer = new A(e.seed || 0)), e.randomizer.next();
}
function ve(e, t, n, r = 1) {
	return n.roughness * r * (_e(n) * (t - e) + e);
}
function I(e, t, n = 1) {
	return ve(-e, e, t, n);
}
function L(e, t, n, r, i, a = !1) {
	let o = a ? i.disableMultiStrokeFill : i.disableMultiStroke, s = ye(e, t, n, r, i, !0, !1);
	if (o) return s;
	let c = ye(e, t, n, r, i, !0, !0);
	return s.concat(c);
}
function ye(e, t, n, r, i, a, o) {
	let s = (e - n) ** 2 + (t - r) ** 2, c = Math.sqrt(s), l = 1;
	l = c < 200 ? 1 : c > 500 ? .4 : -.0016668 * c + 1.233334;
	let u = i.maxRandomnessOffset || 0;
	u * u * 100 > s && (u = c / 10);
	let d = u / 2, f = .2 + .2 * _e(i), p = i.bowing * i.maxRandomnessOffset * (r - t) / 200, m = i.bowing * i.maxRandomnessOffset * (e - n) / 200;
	p = I(p, i, l), m = I(m, i, l);
	let h = [], g = () => I(d, i, l), _ = () => I(u, i, l), v = i.preserveVertices;
	return a && (o ? h.push({
		op: "move",
		data: [e + (v ? 0 : g()), t + (v ? 0 : g())]
	}) : h.push({
		op: "move",
		data: [e + (v ? 0 : I(u, i, l)), t + (v ? 0 : I(u, i, l))]
	})), o ? h.push({
		op: "bcurveTo",
		data: [
			p + e + (n - e) * f + g(),
			m + t + (r - t) * f + g(),
			p + e + 2 * (n - e) * f + g(),
			m + t + 2 * (r - t) * f + g(),
			n + (v ? 0 : g()),
			r + (v ? 0 : g())
		]
	}) : h.push({
		op: "bcurveTo",
		data: [
			p + e + (n - e) * f + _(),
			m + t + (r - t) * f + _(),
			p + e + 2 * (n - e) * f + _(),
			m + t + 2 * (r - t) * f + _(),
			n + (v ? 0 : _()),
			r + (v ? 0 : _())
		]
	}), h;
}
function be(e, t, n) {
	if (!e.length) return [];
	let r = [];
	r.push([e[0][0] + I(t, n), e[0][1] + I(t, n)]), r.push([e[0][0] + I(t, n), e[0][1] + I(t, n)]);
	for (let i = 1; i < e.length; i++) r.push([e[i][0] + I(t, n), e[i][1] + I(t, n)]), i === e.length - 1 && r.push([e[i][0] + I(t, n), e[i][1] + I(t, n)]);
	return xe(r, null, n);
}
function xe(e, t, n) {
	let r = e.length, i = [];
	if (r > 3) {
		let a = [], o = 1 - n.curveTightness;
		i.push({
			op: "move",
			data: [e[1][0], e[1][1]]
		});
		for (let t = 1; t + 2 < r; t++) {
			let n = e[t];
			a[0] = [n[0], n[1]], a[1] = [n[0] + (o * e[t + 1][0] - o * e[t - 1][0]) / 6, n[1] + (o * e[t + 1][1] - o * e[t - 1][1]) / 6], a[2] = [e[t + 1][0] + (o * e[t][0] - o * e[t + 2][0]) / 6, e[t + 1][1] + (o * e[t][1] - o * e[t + 2][1]) / 6], a[3] = [e[t + 1][0], e[t + 1][1]], i.push({
				op: "bcurveTo",
				data: [
					a[1][0],
					a[1][1],
					a[2][0],
					a[2][1],
					a[3][0],
					a[3][1]
				]
			});
		}
		if (t && t.length === 2) {
			let e = n.maxRandomnessOffset;
			i.push({
				op: "lineTo",
				data: [t[0] + I(e, n), t[1] + I(e, n)]
			});
		}
	} else r === 3 ? (i.push({
		op: "move",
		data: [e[1][0], e[1][1]]
	}), i.push({
		op: "bcurveTo",
		data: [
			e[1][0],
			e[1][1],
			e[2][0],
			e[2][1],
			e[2][0],
			e[2][1]
		]
	})) : r === 2 && i.push(...ye(e[0][0], e[0][1], e[1][0], e[1][1], n, !0, !0));
	return i;
}
function Se(e, t, n, r, i, a, o, s) {
	let c = [], l = [];
	if (s.roughness === 0) {
		e /= 4, l.push([t + r * Math.cos(-e), n + i * Math.sin(-e)]);
		for (let a = 0; a <= 2 * Math.PI; a += e) {
			let e = [t + r * Math.cos(a), n + i * Math.sin(a)];
			c.push(e), l.push(e);
		}
		l.push([t + r * Math.cos(0), n + i * Math.sin(0)]), l.push([t + r * Math.cos(e), n + i * Math.sin(e)]);
	} else {
		let u = I(.5, s) - Math.PI / 2;
		l.push([I(a, s) + t + .9 * r * Math.cos(u - e), I(a, s) + n + .9 * i * Math.sin(u - e)]);
		let d = 2 * Math.PI + u - .01;
		for (let o = u; o < d; o += e) {
			let e = [I(a, s) + t + r * Math.cos(o), I(a, s) + n + i * Math.sin(o)];
			c.push(e), l.push(e);
		}
		l.push([I(a, s) + t + r * Math.cos(u + 2 * Math.PI + .5 * o), I(a, s) + n + i * Math.sin(u + 2 * Math.PI + .5 * o)]), l.push([I(a, s) + t + .98 * r * Math.cos(u + o), I(a, s) + n + .98 * i * Math.sin(u + o)]), l.push([I(a, s) + t + .9 * r * Math.cos(u + .5 * o), I(a, s) + n + .9 * i * Math.sin(u + .5 * o)]);
	}
	return [l, c];
}
function Ce(e, t, n, r, i, a, o, s, c) {
	let l = a + I(.1, c), u = [];
	u.push([I(s, c) + t + .9 * r * Math.cos(l - e), I(s, c) + n + .9 * i * Math.sin(l - e)]);
	for (let a = l; a <= o; a += e) u.push([I(s, c) + t + r * Math.cos(a), I(s, c) + n + i * Math.sin(a)]);
	return u.push([t + r * Math.cos(o), n + i * Math.sin(o)]), u.push([t + r * Math.cos(o), n + i * Math.sin(o)]), xe(u, null, c);
}
function we(e, t, n, r, i, a, o, s) {
	let c = [], l = [s.maxRandomnessOffset || 1, (s.maxRandomnessOffset || 1) + .3], u = [0, 0], d = s.disableMultiStroke ? 1 : 2, f = s.preserveVertices;
	for (let p = 0; p < d; p++) p === 0 ? c.push({
		op: "move",
		data: [o[0], o[1]]
	}) : c.push({
		op: "move",
		data: [o[0] + (f ? 0 : I(l[0], s)), o[1] + (f ? 0 : I(l[0], s))]
	}), u = f ? [i, a] : [i + I(l[p], s), a + I(l[p], s)], c.push({
		op: "bcurveTo",
		data: [
			e + I(l[p], s),
			t + I(l[p], s),
			n + I(l[p], s),
			r + I(l[p], s),
			u[0],
			u[1]
		]
	});
	return c;
}
function Te(e) {
	return [...e];
}
function Ee(e, t = 0) {
	let n = e.length;
	if (n < 3) throw Error("A curve must have at least three points.");
	let r = [];
	if (n === 3) r.push(Te(e[0]), Te(e[1]), Te(e[2]), Te(e[2]));
	else {
		let n = [];
		n.push(e[0], e[0]);
		for (let t = 1; t < e.length; t++) n.push(e[t]), t === e.length - 1 && n.push(e[t]);
		let i = [], a = 1 - t;
		r.push(Te(n[0]));
		for (let e = 1; e + 2 < n.length; e++) {
			let t = n[e];
			i[0] = [t[0], t[1]], i[1] = [t[0] + (a * n[e + 1][0] - a * n[e - 1][0]) / 6, t[1] + (a * n[e + 1][1] - a * n[e - 1][1]) / 6], i[2] = [n[e + 1][0] + (a * n[e][0] - a * n[e + 2][0]) / 6, n[e + 1][1] + (a * n[e][1] - a * n[e + 2][1]) / 6], i[3] = [n[e + 1][0], n[e + 1][1]], r.push(i[1], i[2], i[3]);
		}
	}
	return r;
}
function De(e, t) {
	return (e[0] - t[0]) ** 2 + (e[1] - t[1]) ** 2;
}
function Oe(e, t, n) {
	let r = De(t, n);
	if (r === 0) return De(e, t);
	let i = ((e[0] - t[0]) * (n[0] - t[0]) + (e[1] - t[1]) * (n[1] - t[1])) / r;
	return i = Math.max(0, Math.min(1, i)), De(e, R(t, n, i));
}
function R(e, t, n) {
	return [e[0] + (t[0] - e[0]) * n, e[1] + (t[1] - e[1]) * n];
}
function ke(e, t, n, r) {
	let i = r || [];
	if (function(e, t) {
		let n = e[t + 0], r = e[t + 1], i = e[t + 2], a = e[t + 3], o = 3 * r[0] - 2 * n[0] - a[0];
		o *= o;
		let s = 3 * r[1] - 2 * n[1] - a[1];
		s *= s;
		let c = 3 * i[0] - 2 * a[0] - n[0];
		c *= c;
		let l = 3 * i[1] - 2 * a[1] - n[1];
		return l *= l, o < c && (o = c), s < l && (s = l), o + s;
	}(e, t) < n) {
		let n = e[t + 0];
		i.length ? (a = i[i.length - 1], o = n, Math.sqrt(De(a, o)) > 1 && i.push(n)) : i.push(n), i.push(e[t + 3]);
	} else {
		let r = .5, a = e[t + 0], o = e[t + 1], s = e[t + 2], c = e[t + 3], l = R(a, o, r), u = R(o, s, r), d = R(s, c, r), f = R(l, u, r), p = R(u, d, r), m = R(f, p, r);
		ke([
			a,
			l,
			f,
			m
		], 0, n, i), ke([
			m,
			p,
			d,
			c
		], 0, n, i);
	}
	var a, o;
	return i;
}
function Ae(e, t) {
	return je(e, 0, e.length, t);
}
function je(e, t, n, r, i) {
	let a = i || [], o = e[t], s = e[n - 1], c = 0, l = 1;
	for (let r = t + 1; r < n - 1; ++r) {
		let t = Oe(e[r], o, s);
		t > c && (c = t, l = r);
	}
	return Math.sqrt(c) > r ? (je(e, t, l + 1, r, a), je(e, l, n, r, a)) : (a.length || a.push(o), a.push(s)), a;
}
function Me(e, t = .15, n) {
	let r = [], i = (e.length - 1) / 3;
	for (let n = 0; n < i; n++) ke(e, 3 * n, t, r);
	return n && n > 0 ? je(r, 0, r.length, n) : r;
}
var z = "none", Ne = class {
	constructor(e) {
		this.defaultOptions = {
			maxRandomnessOffset: 2,
			roughness: 1,
			bowing: 1,
			stroke: "#000",
			strokeWidth: 1,
			curveTightness: 0,
			curveFitting: .95,
			curveStepCount: 9,
			fillStyle: "hachure",
			fillWeight: -1,
			hachureAngle: -41,
			hachureGap: -1,
			dashOffset: -1,
			dashGap: -1,
			zigzagOffset: -1,
			seed: 0,
			disableMultiStroke: !1,
			disableMultiStrokeFill: !1,
			preserveVertices: !1,
			fillShapeRoughnessGain: .8
		}, this.config = e || {}, this.config.options && (this.defaultOptions = this._o(this.config.options));
	}
	static newSeed() {
		return Math.floor(Math.random() * 2 ** 31);
	}
	_o(e) {
		return e ? Object.assign({}, this.defaultOptions, e) : this.defaultOptions;
	}
	_d(e, t, n) {
		return {
			shape: e,
			sets: t || [],
			options: n || this.defaultOptions
		};
	}
	line(e, t, n, r, i) {
		let a = this._o(i);
		return this._d("line", [oe(e, t, n, r, a)], a);
	}
	rectangle(e, t, n, r, i) {
		let a = this._o(i), o = [], s = ce(e, t, n, r, a);
		if (a.fill) {
			let i = [
				[e, t],
				[e + n, t],
				[e + n, t + r],
				[e, t + r]
			];
			a.fillStyle === "solid" ? o.push(me([i], a)) : o.push(he([i], a));
		}
		return a.stroke !== z && o.push(s), this._d("rectangle", o, a);
	}
	ellipse(e, t, n, r, i) {
		let a = this._o(i), o = [], s = ue(n, r, a), c = de(e, t, a, s);
		if (a.fill) {
			if (a.fillStyle === "solid") {
				let n = de(e, t, a, s).opset;
				n.type = "fillPath", o.push(n);
			} else o.push(he([c.estimatedPoints], a));
		}
		return a.stroke !== z && o.push(c.opset), this._d("ellipse", o, a);
	}
	circle(e, t, n, r) {
		let i = this.ellipse(e, t, n, n, r);
		return i.shape = "circle", i;
	}
	linearPath(e, t) {
		let n = this._o(t);
		return this._d("linearPath", [se(e, !1, n)], n);
	}
	arc(e, t, n, r, i, a, o = !1, s) {
		let c = this._o(s), l = [], u = fe(e, t, n, r, i, a, o, !0, c);
		if (o && c.fill) {
			if (c.fillStyle === "solid") {
				let o = Object.assign({}, c);
				o.disableMultiStroke = !0;
				let s = fe(e, t, n, r, i, a, !0, !1, o);
				s.type = "fillPath", l.push(s);
			} else l.push(function(e, t, n, r, i, a, o) {
				let s = e, c = t, l = Math.abs(n / 2), u = Math.abs(r / 2);
				l += I(.01 * l, o), u += I(.01 * u, o);
				let d = i, f = a;
				for (; d < 0;) d += 2 * Math.PI, f += 2 * Math.PI;
				f - d > 2 * Math.PI && (d = 0, f = 2 * Math.PI);
				let p = (f - d) / o.curveStepCount, m = [];
				for (let e = d; e <= f; e += p) m.push([s + l * Math.cos(e), c + u * Math.sin(e)]);
				return m.push([s + l * Math.cos(f), c + u * Math.sin(f)]), m.push([s, c]), he([m], o);
			}(e, t, n, r, i, a, c));
		}
		return c.stroke !== z && l.push(u), this._d("arc", l, c);
	}
	curve(e, t) {
		let n = this._o(t), r = [], i = le(e, n);
		if (n.fill && n.fill !== z) {
			if (n.fillStyle === "solid") {
				let t = le(e, Object.assign(Object.assign({}, n), {
					disableMultiStroke: !0,
					roughness: n.roughness ? n.roughness + n.fillShapeRoughnessGain : 0
				}));
				r.push({
					type: "fillPath",
					ops: this._mergedShape(t.ops)
				});
			} else {
				let t = [], i = e;
				if (i.length) {
					let e = typeof i[0][0] == "number" ? [i] : i;
					for (let r of e) r.length < 3 ? t.push(...r) : r.length === 3 ? t.push(...Me(Ee([
						r[0],
						r[0],
						r[1],
						r[2]
					]), 10, (1 + n.roughness) / 2)) : t.push(...Me(Ee(r), 10, (1 + n.roughness) / 2));
				}
				t.length && r.push(he([t], n));
			}
		}
		return n.stroke !== z && r.push(i), this._d("curve", r, n);
	}
	polygon(e, t) {
		let n = this._o(t), r = [], i = se(e, !0, n);
		return n.fill && (n.fillStyle === "solid" ? r.push(me([e], n)) : r.push(he([e], n))), n.stroke !== z && r.push(i), this._d("polygon", r, n);
	}
	path(e, t) {
		let n = this._o(t), r = [];
		if (!e) return this._d("path", r, n);
		e = (e || "").replace(/\n/g, " ").replace(/(-\s)/g, "-").replace("/(ss)/g", " ");
		let i = n.fill && n.fill !== "transparent" && n.fill !== z, a = n.stroke !== z, o = !!(n.simplification && n.simplification < 1), s = function(e, t, n) {
			let r = re(ne(te(e))), i = [], a = [], o = [0, 0], s = [], c = () => {
				s.length >= 4 && a.push(...Me(s, t)), s = [];
			}, l = () => {
				c(), a.length && (i.push(a), a = []);
			};
			for (let { key: e, data: t } of r) switch (e) {
				case "M":
					l(), o = [t[0], t[1]], a.push(o);
					break;
				case "L":
					c(), a.push([t[0], t[1]]);
					break;
				case "C":
					if (!s.length) {
						let e = a.length ? a[a.length - 1] : o;
						s.push([e[0], e[1]]);
					}
					s.push([t[0], t[1]]), s.push([t[2], t[3]]), s.push([t[4], t[5]]);
					break;
				case "Z": c(), a.push([o[0], o[1]]);
			}
			if (l(), !n) return i;
			let u = [];
			for (let e of i) {
				let t = Ae(e, n);
				t.length && u.push(t);
			}
			return u;
		}(e, 1, o ? 4 - 4 * (n.simplification || 1) : (1 + n.roughness) / 2), c = pe(e, n);
		if (i) {
			if (n.fillStyle === "solid") {
				if (s.length === 1) {
					let t = pe(e, Object.assign(Object.assign({}, n), {
						disableMultiStroke: !0,
						roughness: n.roughness ? n.roughness + n.fillShapeRoughnessGain : 0
					}));
					r.push({
						type: "fillPath",
						ops: this._mergedShape(t.ops)
					});
				} else r.push(me(s, n));
			} else r.push(he(s, n));
		}
		return a && (o ? s.forEach(((e) => {
			r.push(se(e, !1, n));
		})) : r.push(c)), this._d("path", r, n);
	}
	opsToPath(e, t) {
		let n = "";
		for (let r of e.ops) {
			let e = typeof t == "number" && t >= 0 ? r.data.map(((e) => +e.toFixed(t))) : r.data;
			switch (r.op) {
				case "move":
					n += `M${e[0]} ${e[1]} `;
					break;
				case "bcurveTo":
					n += `C${e[0]} ${e[1]}, ${e[2]} ${e[3]}, ${e[4]} ${e[5]} `;
					break;
				case "lineTo": n += `L${e[0]} ${e[1]} `;
			}
		}
		return n.trim();
	}
	toPaths(e) {
		let t = e.sets || [], n = e.options || this.defaultOptions, r = [];
		for (let e of t) {
			let t = null;
			switch (e.type) {
				case "path":
					t = {
						d: this.opsToPath(e),
						stroke: n.stroke,
						strokeWidth: n.strokeWidth,
						fill: z
					};
					break;
				case "fillPath":
					t = {
						d: this.opsToPath(e),
						stroke: z,
						strokeWidth: 0,
						fill: n.fill || z
					};
					break;
				case "fillSketch": t = this.fillSketch(e, n);
			}
			t && r.push(t);
		}
		return r;
	}
	fillSketch(e, t) {
		let n = t.fillWeight;
		return n < 0 && (n = t.strokeWidth / 2), {
			d: this.opsToPath(e),
			stroke: t.fill || z,
			strokeWidth: n,
			fill: z
		};
	}
	_mergedShape(e) {
		return e.filter(((e, t) => t === 0 || e.op !== "move"));
	}
}, Pe = class {
	constructor(e, t) {
		this.canvas = e, this.ctx = this.canvas.getContext("2d"), this.gen = new Ne(t);
	}
	draw(e) {
		let t = e.sets || [], n = e.options || this.getDefaultOptions(), r = this.ctx, i = e.options.fixedDecimalPlaceDigits;
		for (let a of t) switch (a.type) {
			case "path":
				r.save(), r.strokeStyle = n.stroke === "none" ? "transparent" : n.stroke, r.lineWidth = n.strokeWidth, n.strokeLineDash && r.setLineDash(n.strokeLineDash), n.strokeLineDashOffset && (r.lineDashOffset = n.strokeLineDashOffset), this._drawToContext(r, a, i), r.restore();
				break;
			case "fillPath": {
				r.save(), r.fillStyle = n.fill || "";
				let t = e.shape === "curve" || e.shape === "polygon" || e.shape === "path" ? "evenodd" : "nonzero";
				this._drawToContext(r, a, i, t), r.restore();
				break;
			}
			case "fillSketch": this.fillSketch(r, a, n);
		}
	}
	fillSketch(e, t, n) {
		let r = n.fillWeight;
		r < 0 && (r = n.strokeWidth / 2), e.save(), n.fillLineDash && e.setLineDash(n.fillLineDash), n.fillLineDashOffset && (e.lineDashOffset = n.fillLineDashOffset), e.strokeStyle = n.fill || "", e.lineWidth = r, this._drawToContext(e, t, n.fixedDecimalPlaceDigits), e.restore();
	}
	_drawToContext(e, t, n, r = "nonzero") {
		e.beginPath();
		for (let r of t.ops) {
			let t = typeof n == "number" && n >= 0 ? r.data.map(((e) => +e.toFixed(n))) : r.data;
			switch (r.op) {
				case "move":
					e.moveTo(t[0], t[1]);
					break;
				case "bcurveTo":
					e.bezierCurveTo(t[0], t[1], t[2], t[3], t[4], t[5]);
					break;
				case "lineTo": e.lineTo(t[0], t[1]);
			}
		}
		t.type === "fillPath" ? e.fill(r) : e.stroke();
	}
	get generator() {
		return this.gen;
	}
	getDefaultOptions() {
		return this.gen.defaultOptions;
	}
	line(e, t, n, r, i) {
		let a = this.gen.line(e, t, n, r, i);
		return this.draw(a), a;
	}
	rectangle(e, t, n, r, i) {
		let a = this.gen.rectangle(e, t, n, r, i);
		return this.draw(a), a;
	}
	ellipse(e, t, n, r, i) {
		let a = this.gen.ellipse(e, t, n, r, i);
		return this.draw(a), a;
	}
	circle(e, t, n, r) {
		let i = this.gen.circle(e, t, n, r);
		return this.draw(i), i;
	}
	linearPath(e, t) {
		let n = this.gen.linearPath(e, t);
		return this.draw(n), n;
	}
	polygon(e, t) {
		let n = this.gen.polygon(e, t);
		return this.draw(n), n;
	}
	arc(e, t, n, r, i, a, o = !1, s) {
		let c = this.gen.arc(e, t, n, r, i, a, o, s);
		return this.draw(c), c;
	}
	curve(e, t) {
		let n = this.gen.curve(e, t);
		return this.draw(n), n;
	}
	path(e, t) {
		let n = this.gen.path(e, t);
		return this.draw(n), n;
	}
}, Fe = "http://www.w3.org/2000/svg", Ie = class {
	constructor(e, t) {
		this.svg = e, this.gen = new Ne(t);
	}
	draw(e) {
		let t = e.sets || [], n = e.options || this.getDefaultOptions(), r = this.svg.ownerDocument || window.document, i = r.createElementNS(Fe, "g"), a = e.options.fixedDecimalPlaceDigits;
		for (let o of t) {
			let t = null;
			switch (o.type) {
				case "path":
					t = r.createElementNS(Fe, "path"), t.setAttribute("d", this.opsToPath(o, a)), t.setAttribute("stroke", n.stroke), t.setAttribute("stroke-width", n.strokeWidth + ""), t.setAttribute("fill", "none"), n.strokeLineDash && t.setAttribute("stroke-dasharray", n.strokeLineDash.join(" ").trim()), n.strokeLineDashOffset && t.setAttribute("stroke-dashoffset", `${n.strokeLineDashOffset}`);
					break;
				case "fillPath":
					t = r.createElementNS(Fe, "path"), t.setAttribute("d", this.opsToPath(o, a)), t.setAttribute("stroke", "none"), t.setAttribute("stroke-width", "0"), t.setAttribute("fill", n.fill || ""), e.shape !== "curve" && e.shape !== "polygon" || t.setAttribute("fill-rule", "evenodd");
					break;
				case "fillSketch": t = this.fillSketch(r, o, n);
			}
			t && i.appendChild(t);
		}
		return i;
	}
	fillSketch(e, t, n) {
		let r = n.fillWeight;
		r < 0 && (r = n.strokeWidth / 2);
		let i = e.createElementNS(Fe, "path");
		return i.setAttribute("d", this.opsToPath(t, n.fixedDecimalPlaceDigits)), i.setAttribute("stroke", n.fill || ""), i.setAttribute("stroke-width", r + ""), i.setAttribute("fill", "none"), n.fillLineDash && i.setAttribute("stroke-dasharray", n.fillLineDash.join(" ").trim()), n.fillLineDashOffset && i.setAttribute("stroke-dashoffset", `${n.fillLineDashOffset}`), i;
	}
	get generator() {
		return this.gen;
	}
	getDefaultOptions() {
		return this.gen.defaultOptions;
	}
	opsToPath(e, t) {
		return this.gen.opsToPath(e, t);
	}
	line(e, t, n, r, i) {
		let a = this.gen.line(e, t, n, r, i);
		return this.draw(a);
	}
	rectangle(e, t, n, r, i) {
		let a = this.gen.rectangle(e, t, n, r, i);
		return this.draw(a);
	}
	ellipse(e, t, n, r, i) {
		let a = this.gen.ellipse(e, t, n, r, i);
		return this.draw(a);
	}
	circle(e, t, n, r) {
		let i = this.gen.circle(e, t, n, r);
		return this.draw(i);
	}
	linearPath(e, t) {
		let n = this.gen.linearPath(e, t);
		return this.draw(n);
	}
	polygon(e, t) {
		let n = this.gen.polygon(e, t);
		return this.draw(n);
	}
	arc(e, t, n, r, i, a, o = !1, s) {
		let c = this.gen.arc(e, t, n, r, i, a, o, s);
		return this.draw(c);
	}
	curve(e, t) {
		let n = this.gen.curve(e, t);
		return this.draw(n);
	}
	path(e, t) {
		let n = this.gen.path(e, t);
		return this.draw(n);
	}
}, Le = {
	canvas: (e, t) => new Pe(e, t),
	svg: (e, t) => new Ie(e, t),
	generator: (e) => new Ne(e),
	newSeed: () => Ne.newSeed()
};
// src/core/describe.ts
function Re(e) {
	let t = (t) => (e.nodes.find((e) => e.id === t)?.label ?? t).replace(/\n/g, " "), n = [];
	for (let r of e.groups) n.push(`${r.label} contains ${r.members.map(t).join(", ")}.`);
	for (let r of e.edges) {
		let e = r.both ? "↔" : "→";
		n.push(`${t(r.from)} ${e} ${t(r.to)}${r.label ? `: ${r.label.replace(/\n/g, " ")}` : ""}.`);
	}
	let r = new Set(e.edges.flatMap((e) => [e.from, e.to])), i = e.nodes.filter((e) => !r.has(e.id));
	i.length && n.push(`Also shown: ${i.map((e) => t(e.id)).join(", ")}.`);
	for (let r of e.annotations) r.kind === "note" && r.text && n.push(`Note on ${r.targetKind === "node" ? t(r.target) : r.target}: ${r.text.replace(/\n/g, " ")}.`);
	return n;
}
function ze(e) {
	return [e.title ? `${e.title}.` : "", ...Re(e)].filter(Boolean).join(" ");
}
// src/core/rng.ts
function Be(e) {
	let t = e >>> 0 || 1;
	return () => {
		t = t + 1831565813 | 0;
		let e = Math.imul(t ^ t >>> 15, 1 | t);
		return e = e + Math.imul(e ^ e >>> 7, 61 | e) ^ e, ((e ^ e >>> 14) >>> 0) / 4294967296;
	};
}
function Ve(e) {
	let t = 2166136261;
	for (let n = 0; n < e.length; n++) t ^= e.charCodeAt(n), t = Math.imul(t, 16777619);
	return t >>> 0;
}
// src/core/styles.ts
var He = {
	notebook: {
		label: "Notebook",
		ground: "#fbfaf5",
		dark: !1,
		mark: "#d23b2f"
	},
	graph: {
		label: "Graph paper",
		ground: "#f8fbfc",
		dark: !1,
		mark: "#d23b2f"
	},
	whiteboard: {
		label: "Whiteboard",
		ground: "#fdfdfd",
		dark: !1,
		mark: "#d6332a"
	},
	napkin: {
		label: "Napkin",
		ground: "#f4eee2",
		dark: !1,
		mark: "#c2412f"
	},
	blank: {
		label: "Blank",
		ground: "#ffffff",
		dark: !1,
		mark: "#d23b2f"
	},
	chalkboard: {
		label: "Chalkboard",
		ground: "#24312c",
		dark: !0,
		mark: "#ffd166"
	},
	blueprint: {
		label: "Blueprint",
		ground: "#1f4f8a",
		dark: !0,
		mark: "#ffe08a"
	}
}, Ue = {
	ballpoint: {
		label: "Blue ballpoint",
		ink: "#1f3a9e",
		inkOnDark: "#dfe8ff",
		width: 1.5,
		grain: 0,
		opacity: 1
	},
	marker: {
		label: "Black marker",
		ink: "#1d1d1f",
		inkOnDark: "#f6f4ee",
		width: 2.6,
		grain: -.1,
		opacity: 1
	},
	pencil: {
		label: "Pencil",
		ink: "#4a4e57",
		inkOnDark: "#d9d9d4",
		width: 1.2,
		grain: .5,
		opacity: .88
	},
	felt: {
		label: "Green felt tip",
		ink: "#126b57",
		inkOnDark: "#c6f2df",
		width: 2,
		grain: .1,
		opacity: 1
	},
	chalk: {
		label: "Chalk",
		ink: "#3a3a3a",
		inkOnDark: "#f3f0e4",
		width: 2.4,
		grain: .7,
		opacity: .92
	}
}, We = {
	caveat: {
		label: "Caveat (quick notes)",
		family: "Caveat",
		scale: 1.3,
		weight: 500
	},
	kalam: {
		label: "Kalam (neat print)",
		family: "Kalam",
		scale: 1,
		weight: 400
	},
	patrick: {
		label: "Patrick Hand (rounded)",
		family: "Patrick Hand",
		scale: 1.08,
		weight: 400
	},
	gochi: {
		label: "Gochi Hand (marker)",
		family: "Gochi Hand",
		scale: 1.06,
		weight: 400
	},
	architect: {
		label: "Architect's Daughter",
		family: "Architects Daughter",
		scale: .96,
		weight: 400
	}
}, B = {
	yellow: "#ffe14d",
	pink: "#ff8fc2",
	green: "#7fe0a0",
	blue: "#8cc8ff",
	orange: "#ffb35c",
	purple: "#c9a6ff",
	red: "#ff8a80",
	gray: "#c9c9c9"
}, Ge = {
	red: {
		light: "#c62828",
		dark: "#ff8a80"
	},
	blue: {
		light: "#1f4fbf",
		dark: "#9cc4ff"
	},
	green: {
		light: "#1b7a43",
		dark: "#8ce6a8"
	},
	orange: {
		light: "#c25e00",
		dark: "#ffc27a"
	},
	purple: {
		light: "#6a3fb5",
		dark: "#d0b3ff"
	},
	black: {
		light: "#1d1d1f",
		dark: "#f6f4ee"
	},
	gray: {
		light: "#6b6f76",
		dark: "#c9c9c9"
	},
	pink: {
		light: "#b8326e",
		dark: "#ff9fcf"
	}
}, Ke = {
	small: .8,
	normal: 1,
	large: 1.3
}, qe = {
	layout: "flow",
	direction: "right",
	paper: "notebook",
	pen: "ballpoint",
	hand: "caveat",
	mess: .45,
	seed: 7
}, Je = "https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=Kalam:wght@400;700&family=Patrick+Hand&family=Gochi+Hand&family=Architects+Daughter&display=swap", Ye = "http://www.w3.org/2000/svg", Xe;
function Ze(e) {
	Xe = e;
}
function V(e, t = {}, n) {
	let r = Xe.createElementNS(Ye, e);
	for (let [e, n] of Object.entries(t)) r.setAttribute(e, String(n));
	return n && n.appendChild(r), r;
}
// src/core/draw/geometry.ts
function Qe(e) {
	let t = 0;
	for (let n = 1; n < e.length; n++) t += Math.hypot(e[n][0] - e[n - 1][0], e[n][1] - e[n - 1][1]);
	return t;
}
function $e(e, t) {
	let n = 0;
	for (let r = 1; r < e.length; r++) {
		let i = e[r - 1], a = e[r], o = Math.hypot(a[0] - i[0], a[1] - i[1]);
		if (n + o >= t || r === e.length - 1) {
			let e = o ? Math.min(1, Math.max(0, (t - n) / o)) : 0;
			return {
				p: [i[0] + (a[0] - i[0]) * e, i[1] + (a[1] - i[1]) * e],
				dir: [(a[0] - i[0]) / (o || 1), (a[1] - i[1]) / (o || 1)]
			};
		}
		n += o;
	}
	return {
		p: e[0],
		dir: [1, 0]
	};
}
function et(e, t = 0) {
	return {
		x: e.cx - e.w / 2 - t,
		y: e.cy - e.h / 2 - t,
		w: e.w + t * 2,
		h: e.h + t * 2
	};
}
function tt(e) {
	return {
		x: e.cx - e.labelW / 2,
		y: e.cy + e.labelDy - e.labelH / 2,
		w: e.labelW,
		h: e.labelH
	};
}
// src/core/draw/pieces.ts
function H(e, t, n = !1) {
	let r = Array.from(e.querySelectorAll("path")), i = [], a = [];
	for (let e of r) {
		let r = e.getAttribute("stroke"), o = e.getAttribute("fill"), s = {
			el: e,
			mode: r && r !== "none" && (!o || o === "none") && !n ? "stroke" : "fade",
			len: 0
		};
		r === t ? i.push(s) : a.push(s);
	}
	return [...i, ...a];
}
// src/core/metrics.generated.ts
var nt = {
	Caveat: {
		500: {
			chars: "0123456789 !\"#$%&'()*+,-./:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\xA0¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ–—‘’“”•…→←↑↓✓✗€≈≠≤≥",
			widths: [
				45,
				45,
				45,
				45,
				45,
				44.5,
				45.7,
				44.9,
				45,
				44.6,
				24.2,
				21,
				23.7,
				55.9,
				45,
				60,
				56.4,
				11.7,
				33,
				33,
				36.3,
				44.6,
				19.8,
				32.6,
				19.8,
				33,
				19.8,
				19.8,
				44.6,
				44.6,
				44.6,
				37.4,
				64.3,
				50.5,
				52.1,
				47.4,
				58.1,
				53.1,
				45.8,
				48.9,
				56.7,
				40.3,
				30.9,
				50.1,
				42.6,
				72.3,
				60.6,
				49.9,
				46.5,
				49.9,
				53.9,
				48.9,
				45.8,
				48.2,
				49,
				72,
				52.4,
				50.4,
				52.2,
				33,
				33,
				33,
				44.6,
				44.6,
				35.3,
				44,
				43.8,
				35.8,
				39.6,
				32.8,
				29.4,
				35.8,
				46.7,
				19,
				20.7,
				36.8,
				17.2,
				56.3,
				45.3,
				35.6,
				37.8,
				37.7,
				36,
				34.4,
				33.1,
				37,
				33.1,
				51.7,
				34.3,
				34.1,
				31.5,
				33,
				33,
				33,
				44.6,
				24.2,
				21,
				45,
				45,
				45,
				45,
				33,
				38.5,
				35.3,
				49.6,
				35,
				64.6,
				46.5,
				0,
				49.6,
				35.3,
				28.3,
				44.6,
				32,
				32,
				35.3,
				37,
				42.4,
				18.7,
				35.3,
				32,
				28.3,
				70.8,
				80,
				80,
				80,
				37.4,
				50.2,
				50.2,
				50.2,
				50.2,
				50.2,
				50.2,
				78.4,
				48.2,
				54.8,
				54.8,
				54.8,
				54.8,
				40,
				40,
				40,
				40.3,
				57.8,
				56.6,
				49.6,
				49.6,
				49.6,
				49.6,
				49.6,
				44.6,
				49.6,
				48.2,
				48.2,
				48.2,
				48.2,
				50.4,
				47.2,
				39.8,
				43.7,
				43.7,
				43.7,
				43.7,
				43.7,
				43.7,
				57.4,
				35.5,
				32.5,
				32.5,
				32.5,
				32.5,
				18.7,
				18.7,
				18.7,
				18.7,
				34.9,
				45,
				35.3,
				35.3,
				35.3,
				35.3,
				35.3,
				44.6,
				35.3,
				37,
				37,
				37,
				37,
				34.1,
				37.8,
				34.1,
				44.6,
				56.6,
				11.7,
				11.7,
				26.7,
				26.7,
				18.7,
				59.4,
				100,
				100,
				72.3,
				72.3,
				76.4,
				57.1,
				45,
				55.6,
				55.6,
				55.6,
				55.6
			],
			ascent: 96,
			descent: 30
		},
		700: {
			chars: "0123456789 !\"#$%&'()*+,-./:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\xA0¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ–—‘’“”•…→←↑↓✓✗€≈≠≤≥",
			widths: [
				45,
				45,
				45,
				45,
				45,
				43.4,
				47.1,
				44.6,
				45,
				43.8,
				24.2,
				21,
				23.7,
				55.9,
				45,
				60,
				56.4,
				11.7,
				33,
				33,
				36.3,
				44.6,
				19.8,
				32.6,
				19.8,
				33,
				19.8,
				19.8,
				44.6,
				44.6,
				44.6,
				37.4,
				64.3,
				51.1,
				52.3,
				47.7,
				58.7,
				53.4,
				46.6,
				49.4,
				57.4,
				40.9,
				31.5,
				50.8,
				42.6,
				72.9,
				61.9,
				50.5,
				46.8,
				49.2,
				54.4,
				49.5,
				45.8,
				48.2,
				49,
				72,
				52.4,
				50.4,
				52.2,
				33,
				33,
				33,
				44.6,
				44.6,
				35.3,
				44.6,
				44.4,
				36.4,
				40.2,
				33.4,
				30,
				36.4,
				47.3,
				19.6,
				21.3,
				37.4,
				17.8,
				56.9,
				45.9,
				36.2,
				37.8,
				37.7,
				36,
				35,
				33.1,
				37,
				33.1,
				51.7,
				34.3,
				34.1,
				31.5,
				33,
				33,
				33,
				44.6,
				24.2,
				21,
				45,
				45,
				45,
				45,
				33,
				38.5,
				35.3,
				49.6,
				35,
				64.6,
				46.5,
				0,
				49.6,
				35.3,
				28.3,
				44.6,
				32,
				32,
				35.3,
				37,
				42.4,
				18.7,
				35.3,
				32,
				28.3,
				70.8,
				80,
				80,
				80,
				37.4,
				50.2,
				50.2,
				50.2,
				50.2,
				50.2,
				50.2,
				78.4,
				48.2,
				54.8,
				54.8,
				54.8,
				54.8,
				40,
				40,
				40,
				40.9,
				57.8,
				56.6,
				49.6,
				49.6,
				49.6,
				49.6,
				49.6,
				44.6,
				49.6,
				48.2,
				48.2,
				48.2,
				48.2,
				50.4,
				47.2,
				39.8,
				43.7,
				43.7,
				43.7,
				43.7,
				43.7,
				43.7,
				57.4,
				35.5,
				32.5,
				32.5,
				32.5,
				32.5,
				18.7,
				18.7,
				18.7,
				18.7,
				34.9,
				45,
				35.3,
				35.3,
				35.3,
				35.3,
				35.3,
				44.6,
				35.3,
				37,
				37,
				37,
				37,
				34.1,
				37.8,
				34.1,
				44.6,
				56.6,
				11.7,
				11.7,
				26.7,
				26.7,
				18.7,
				59.4,
				100,
				100,
				72.3,
				72.3,
				76.4,
				57.1,
				45,
				55.6,
				55.6,
				55.6,
				55.6
			],
			ascent: 96,
			descent: 30
		}
	},
	Kalam: {
		400: {
			chars: "0123456789 !\"#$%&'()*+,-./:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\xA0¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ–—‘’“”•…→←↑↓✓✗€≈≠≤≥",
			widths: [
				50,
				31.4,
				58.1,
				57.1,
				55.1,
				53.7,
				55.6,
				46.1,
				60.2,
				48.8,
				40.1,
				37.1,
				33.1,
				65.6,
				53.4,
				89,
				70.4,
				14.5,
				48.5,
				50.4,
				35.7,
				60,
				22.8,
				45.9,
				23.7,
				35.4,
				24.6,
				30.6,
				53.9,
				63.1,
				56.1,
				51.8,
				96.5,
				60.8,
				63.7,
				59.9,
				64.5,
				58.5,
				52.3,
				61.1,
				67,
				31,
				46.8,
				59.1,
				54.6,
				78.9,
				67.7,
				61.3,
				54.3,
				64.1,
				58.4,
				53.1,
				53.5,
				59.8,
				53.2,
				78.2,
				62.4,
				57.5,
				62,
				45.3,
				60,
				45,
				42.2,
				60.8,
				21.3,
				46.9,
				52.5,
				44.5,
				49.9,
				45,
				37.6,
				47.5,
				53.6,
				23.8,
				25.4,
				46.9,
				24.5,
				79.6,
				53.3,
				45.3,
				47.8,
				47.4,
				33.1,
				42.6,
				38.7,
				48.1,
				42.2,
				67.3,
				42.7,
				46.9,
				44,
				42.1,
				36.8,
				53.8,
				59.4,
				40.1,
				35.4,
				48.2,
				65.7,
				60,
				56.3,
				36.9,
				46.4,
				27.3,
				70.8,
				47.4,
				65.7,
				49.6,
				0,
				58.9,
				36.5,
				33.9,
				60,
				30.8,
				31.1,
				21.9,
				57.5,
				52.1,
				23.7,
				25.2,
				15.4,
				45.2,
				83.3,
				78.3,
				78.7,
				87.6,
				38,
				60.8,
				60.8,
				60.8,
				60.8,
				60.8,
				60.8,
				83.1,
				60.3,
				58.5,
				58.5,
				58.5,
				58.5,
				31,
				31,
				31,
				31,
				61.9,
				67.7,
				61.3,
				61.3,
				61.3,
				61.3,
				61.3,
				48.8,
				61.3,
				59.2,
				59.2,
				59.2,
				59.2,
				57.5,
				50.3,
				58.5,
				47.2,
				47.2,
				47.2,
				47.2,
				47.2,
				47.2,
				74.3,
				44.7,
				43.8,
				43.8,
				43.8,
				43.8,
				23.8,
				23.8,
				23.8,
				23.8,
				45.2,
				53.2,
				45.2,
				45.2,
				45.2,
				45.2,
				45.2,
				60,
				45.7,
				47.9,
				47.9,
				47.9,
				47.9,
				46.9,
				52.6,
				46.9,
				61,
				91.7,
				28.7,
				28.6,
				49.1,
				48.7,
				23.7,
				66.6,
				100,
				100,
				64.5,
				64.5,
				76.4,
				57.1,
				55.3,
				55.6,
				55.6,
				55.6,
				55.6
			],
			ascent: 106,
			descent: 53
		},
		600: {
			chars: "0123456789 !\"#$%&'()*+,-./:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\xA0¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ–—‘’“”•…→←↑↓✓✗€≈≠≤≥",
			widths: [
				51.3,
				30.2,
				58.3,
				54.7,
				54.5,
				50.6,
				54.2,
				47.2,
				59,
				50.6,
				38.5,
				47.8,
				48.4,
				78,
				59.2,
				99.1,
				78.6,
				22,
				47.8,
				53,
				37.5,
				60,
				26.2,
				53.1,
				23.7,
				28.2,
				24.6,
				30.6,
				47.5,
				67.2,
				61.6,
				60.8,
				107.8,
				63,
				62.4,
				61.7,
				66.6,
				55.1,
				54.2,
				59.7,
				65.1,
				30.9,
				48.6,
				60.2,
				54.6,
				75.6,
				63.1,
				61.9,
				54.9,
				65.9,
				60.1,
				55.2,
				54.4,
				59.5,
				53.2,
				78.5,
				58.5,
				56.1,
				64.6,
				46.3,
				60,
				52.1,
				42.2,
				61.9,
				25.8,
				51,
				56.7,
				48.9,
				53.9,
				48.8,
				43.5,
				48.1,
				56.3,
				26,
				26,
				49.3,
				26.6,
				81.9,
				55.4,
				45.6,
				53.8,
				51.9,
				36.2,
				46.7,
				45.1,
				48.6,
				42.2,
				71,
				47.4,
				52,
				48,
				46.2,
				45.6,
				62.6,
				58.6,
				38.5,
				42.5,
				54.5,
				73.2,
				60,
				61.5,
				45.5,
				52.9,
				33.5,
				70.8,
				53.6,
				42.6,
				49.6,
				0,
				67.1,
				37.7,
				42.1,
				60,
				33.5,
				30,
				26.6,
				43.9,
				59.2,
				23.7,
				30.1,
				16.1,
				45.2,
				83.3,
				82.3,
				85.8,
				96.2,
				39.6,
				63.1,
				63.1,
				63.1,
				63.1,
				63.1,
				63.1,
				89.9,
				62.9,
				55.1,
				55.1,
				55.1,
				55.1,
				30.9,
				30.9,
				30.9,
				30.9,
				64.9,
				63.1,
				61.9,
				61.9,
				61.9,
				61.9,
				61.9,
				43.3,
				61.9,
				57.8,
				57.8,
				57.8,
				57.8,
				56.1,
				53.5,
				59.9,
				51.8,
				51.8,
				51.8,
				51.8,
				51.8,
				51.8,
				77,
				49.3,
				45.4,
				45.4,
				45.4,
				45.4,
				26,
				26,
				26,
				26,
				45.2,
				55.2,
				45.2,
				45.2,
				45.2,
				45.2,
				45.2,
				60,
				45.2,
				47.9,
				47.9,
				47.9,
				47.9,
				52,
				52.6,
				52,
				62.4,
				96.8,
				35.2,
				35.2,
				60.6,
				59.5,
				23.7,
				79.5,
				100,
				100,
				72.3,
				72.3,
				76.4,
				57.1,
				63.4,
				55.6,
				55.6,
				55.6,
				55.6
			],
			ascent: 106,
			descent: 53
		}
	},
	"Patrick Hand": {
		400: {
			chars: "0123456789 !\"#$%&'()*+,-./:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\xA0¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ–—‘’“”•…→←↑↓✓✗€≈≠≤≥",
			widths: [
				44.8,
				36.3,
				46.8,
				44.8,
				37.5,
				42.3,
				39.9,
				49.5,
				43.3,
				36.7,
				23,
				24.7,
				30.3,
				45.7,
				50.7,
				64.3,
				53,
				16.4,
				33.4,
				36.4,
				40.4,
				48,
				20.2,
				40.4,
				21.4,
				42.3,
				23.2,
				23.2,
				39.6,
				57.2,
				40,
				36.8,
				55,
				48.8,
				50.7,
				54.8,
				47.5,
				44.2,
				37.5,
				48,
				46.8,
				23.5,
				37,
				52.3,
				37.2,
				59.5,
				53.2,
				55.6,
				48.1,
				65.5,
				45.4,
				45.9,
				46.8,
				55,
				56.2,
				61.6,
				60.1,
				44.2,
				50.7,
				30.3,
				42,
				29.6,
				37,
				57.1,
				22,
				39.2,
				41.2,
				38.8,
				39,
				39.8,
				35.9,
				44.5,
				42,
				22.4,
				23.5,
				41.5,
				26.6,
				68,
				45.2,
				40.3,
				42.8,
				46.3,
				38.5,
				38.5,
				34.4,
				40,
				40,
				46.3,
				44.8,
				42.3,
				42.8,
				33.9,
				17.6,
				32.8,
				52.9,
				23,
				21.4,
				42.4,
				55,
				69.2,
				46.4,
				17,
				38.4,
				40.4,
				75.9,
				28.9,
				47.8,
				48.4,
				0,
				76,
				40,
				23.2,
				47.5,
				23,
				22,
				24.7,
				51.7,
				50,
				20,
				40,
				20,
				29.9,
				50.8,
				53.5,
				58.6,
				53.6,
				37.5,
				48.8,
				48.8,
				48.8,
				48.8,
				48.8,
				48.8,
				66.1,
				54.8,
				44.2,
				44.2,
				44.2,
				44.2,
				23.5,
				23.5,
				23.5,
				23.5,
				58.9,
				53.2,
				55.6,
				55.6,
				55.6,
				55.6,
				55.6,
				49,
				56.8,
				55,
				55,
				55,
				55,
				44.2,
				49.2,
				52.9,
				39.2,
				39.2,
				39.2,
				39.2,
				39.2,
				39.2,
				68.2,
				38.8,
				39.8,
				39.8,
				39.8,
				39.8,
				22.4,
				22.4,
				22.4,
				22.4,
				46.3,
				45.2,
				40.3,
				40.3,
				40.3,
				40.3,
				40.3,
				51.9,
				42,
				40,
				40,
				40,
				40,
				42.3,
				45.4,
				42.3,
				42,
				64.8,
				19,
				22,
				31.5,
				30.3,
				35.2,
				57.1,
				100,
				100,
				64.5,
				64.5,
				76.4,
				57.1,
				48.1,
				55.6,
				55.6,
				55.6,
				55.6
			],
			ascent: 104,
			descent: 31
		},
		600: {
			chars: "0123456789 !\"#$%&'()*+,-./:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\xA0¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ–—‘’“”•…→←↑↓✓✗€≈≠≤≥",
			widths: [
				44.8,
				36.3,
				46.8,
				44.8,
				37.5,
				42.3,
				39.9,
				49.5,
				43.3,
				36.7,
				23,
				24.7,
				30.3,
				45.7,
				50.7,
				64.3,
				53,
				16.4,
				33.4,
				36.4,
				40.4,
				48,
				20.2,
				40.4,
				21.4,
				42.3,
				23.2,
				23.2,
				39.6,
				57.2,
				40,
				36.8,
				55,
				48.8,
				50.7,
				54.8,
				47.5,
				44.2,
				37.5,
				48,
				46.8,
				23.5,
				37,
				52.3,
				37.2,
				59.5,
				53.2,
				55.6,
				48.1,
				65.5,
				45.4,
				45.9,
				46.8,
				55,
				56.2,
				61.6,
				60.1,
				44.2,
				50.7,
				30.3,
				42,
				29.6,
				37,
				57.1,
				22,
				39.2,
				41.2,
				38.8,
				39,
				39.8,
				35.9,
				44.5,
				42,
				22.4,
				23.5,
				41.5,
				26.6,
				68,
				45.2,
				40.3,
				42.8,
				46.3,
				38.5,
				38.5,
				34.4,
				40,
				40,
				46.3,
				44.8,
				42.3,
				42.8,
				33.9,
				17.6,
				32.8,
				52.9,
				23,
				21.4,
				42.4,
				55,
				69.2,
				46.4,
				17,
				38.4,
				40.4,
				75.9,
				28.9,
				47.8,
				48.4,
				0,
				76,
				40,
				23.2,
				47.5,
				23,
				22,
				24.7,
				51.7,
				50,
				20,
				40,
				20,
				29.9,
				50.8,
				53.5,
				58.6,
				53.6,
				37.5,
				48.8,
				48.8,
				48.8,
				48.8,
				48.8,
				48.8,
				66.1,
				54.8,
				44.2,
				44.2,
				44.2,
				44.2,
				23.5,
				23.5,
				23.5,
				23.5,
				58.9,
				53.2,
				55.6,
				55.6,
				55.6,
				55.6,
				55.6,
				49,
				56.8,
				55,
				55,
				55,
				55,
				44.2,
				49.2,
				52.9,
				39.2,
				39.2,
				39.2,
				39.2,
				39.2,
				39.2,
				68.2,
				38.8,
				39.8,
				39.8,
				39.8,
				39.8,
				22.4,
				22.4,
				22.4,
				22.4,
				46.3,
				45.2,
				40.3,
				40.3,
				40.3,
				40.3,
				40.3,
				51.9,
				42,
				40,
				40,
				40,
				40,
				42.3,
				45.4,
				42.3,
				42,
				64.8,
				19,
				22,
				31.5,
				30.3,
				35.2,
				57.1,
				100,
				100,
				72.3,
				72.3,
				76.4,
				57.1,
				48.1,
				55.6,
				55.6,
				55.6,
				55.6
			],
			ascent: 104,
			descent: 31
		}
	},
	"Gochi Hand": {
		400: {
			chars: "0123456789 !\"#$%&'()*+,-./:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\xA0¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ–—‘’“”•…→←↑↓✓✗€≈≠≤≥",
			widths: [
				56.8,
				40.4,
				49,
				51.9,
				47.3,
				52.6,
				50.7,
				52,
				54.8,
				50.1,
				23.7,
				25.4,
				41.5,
				45.4,
				44.9,
				64.4,
				46.1,
				25.4,
				28.3,
				28.3,
				34.5,
				48.6,
				31.4,
				31.4,
				31.4,
				24,
				31.4,
				31.4,
				32.7,
				45.4,
				32.7,
				50.3,
				98.8,
				59,
				51.1,
				54.2,
				65.2,
				62.3,
				51.2,
				63.1,
				57.1,
				24,
				53,
				55.1,
				36.6,
				69.4,
				65.3,
				60.2,
				55.2,
				67.2,
				52.4,
				46.4,
				38.5,
				57.7,
				55.6,
				85,
				53,
				46.4,
				64.7,
				33.6,
				29.4,
				33.6,
				44.7,
				51.3,
				42.4,
				55.5,
				52.8,
				34,
				58.6,
				51.6,
				30.6,
				56.9,
				53.7,
				21.7,
				29.1,
				44.6,
				22,
				71,
				47.5,
				51.9,
				49.2,
				59.8,
				35.4,
				36.8,
				40.8,
				46.9,
				44.1,
				77.5,
				52.6,
				49.2,
				44.1,
				35.9,
				25,
				35.9,
				47.4,
				23.7,
				25.4,
				34,
				44.4,
				45,
				46.4,
				25,
				49.9,
				42.4,
				67,
				42.3,
				42.3,
				57.9,
				0,
				67,
				42.4,
				45,
				48.6,
				39.6,
				41.1,
				42.4,
				46.9,
				50.2,
				31.4,
				42.4,
				32.7,
				43.4,
				42.3,
				77.2,
				78.8,
				83.2,
				54,
				59,
				59,
				59,
				59,
				59,
				59,
				91.1,
				54.2,
				62.3,
				62.3,
				62.3,
				62.3,
				24,
				24,
				24,
				24,
				65.2,
				65.3,
				60.2,
				60.2,
				60.2,
				60.2,
				60.2,
				48.3,
				60.2,
				57.7,
				57.7,
				57.7,
				57.7,
				46.4,
				51.1,
				60.8,
				55.5,
				55.5,
				55.5,
				55.5,
				55.5,
				55.5,
				77.1,
				34,
				51.6,
				51.6,
				51.6,
				51.6,
				21.7,
				21.7,
				21.7,
				21.7,
				50.7,
				47.5,
				51.9,
				51.9,
				51.9,
				51.9,
				51.9,
				48.3,
				51.9,
				46.9,
				46.9,
				46.9,
				46.9,
				49.2,
				52.8,
				49.2,
				61.3,
				74.3,
				31.4,
				31.4,
				47.5,
				47.5,
				36.3,
				71.4,
				100,
				100,
				64.5,
				64.5,
				76.4,
				57.1,
				59.5,
				55.6,
				55.6,
				55.6,
				55.6
			],
			ascent: 77,
			descent: 41
		},
		600: {
			chars: "0123456789 !\"#$%&'()*+,-./:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\xA0¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ–—‘’“”•…→←↑↓✓✗€≈≠≤≥",
			widths: [
				56.8,
				40.4,
				49,
				51.9,
				47.3,
				52.6,
				50.7,
				52,
				54.8,
				50.1,
				23.7,
				25.4,
				41.5,
				45.4,
				44.9,
				64.4,
				46.1,
				25.4,
				28.3,
				28.3,
				34.5,
				48.6,
				31.4,
				31.4,
				31.4,
				24,
				31.4,
				31.4,
				32.7,
				45.4,
				32.7,
				50.3,
				98.8,
				59,
				51.1,
				54.2,
				65.2,
				62.3,
				51.2,
				63.1,
				57.1,
				24,
				53,
				55.1,
				36.6,
				69.4,
				65.3,
				60.2,
				55.2,
				67.2,
				52.4,
				46.4,
				38.5,
				57.7,
				55.6,
				85,
				53,
				46.4,
				64.7,
				33.6,
				29.4,
				33.6,
				44.7,
				51.3,
				42.4,
				55.5,
				52.8,
				34,
				58.6,
				51.6,
				30.6,
				56.9,
				53.7,
				21.7,
				29.1,
				44.6,
				22,
				71,
				47.5,
				51.9,
				49.2,
				59.8,
				35.4,
				36.8,
				40.8,
				46.9,
				44.1,
				77.5,
				52.6,
				49.2,
				44.1,
				35.9,
				25,
				35.9,
				47.4,
				23.7,
				25.4,
				34,
				44.4,
				45,
				46.4,
				25,
				49.9,
				42.4,
				67,
				42.3,
				42.3,
				57.9,
				0,
				67,
				42.4,
				45,
				48.6,
				39.6,
				41.1,
				42.4,
				46.9,
				50.2,
				31.4,
				42.4,
				32.7,
				43.4,
				42.3,
				77.2,
				78.8,
				83.2,
				54,
				59,
				59,
				59,
				59,
				59,
				59,
				91.1,
				54.2,
				62.3,
				62.3,
				62.3,
				62.3,
				24,
				24,
				24,
				24,
				65.2,
				65.3,
				60.2,
				60.2,
				60.2,
				60.2,
				60.2,
				48.3,
				60.2,
				57.7,
				57.7,
				57.7,
				57.7,
				46.4,
				51.1,
				60.8,
				55.5,
				55.5,
				55.5,
				55.5,
				55.5,
				55.5,
				77.1,
				34,
				51.6,
				51.6,
				51.6,
				51.6,
				21.7,
				21.7,
				21.7,
				21.7,
				50.7,
				47.5,
				51.9,
				51.9,
				51.9,
				51.9,
				51.9,
				48.3,
				51.9,
				46.9,
				46.9,
				46.9,
				46.9,
				49.2,
				52.8,
				49.2,
				61.3,
				74.3,
				31.4,
				31.4,
				47.5,
				47.5,
				36.3,
				71.4,
				100,
				100,
				72.3,
				72.3,
				76.4,
				57.1,
				59.5,
				55.6,
				55.6,
				55.6,
				55.6
			],
			ascent: 77,
			descent: 41
		}
	},
	"Architects Daughter": {
		400: {
			chars: "0123456789 !\"#$%&'()*+,-./:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\xA0¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ–—‘’“”•…→←↑↓✓✗€≈≠≤≥",
			widths: [
				63.1,
				12.8,
				57.2,
				50.9,
				68.1,
				70.8,
				62.7,
				61.5,
				64.8,
				56.9,
				40,
				13.5,
				23.6,
				63.8,
				55.7,
				51.9,
				67,
				16.2,
				29.8,
				35.2,
				50.8,
				52.4,
				17.8,
				31.1,
				14.1,
				45.5,
				16.7,
				12.4,
				47.6,
				49.2,
				47.2,
				50.6,
				104.3,
				64.1,
				71.1,
				70.8,
				64.8,
				59.2,
				69.2,
				69.2,
				60.5,
				15.1,
				52.9,
				60.5,
				69.2,
				82.7,
				62.7,
				67,
				63.8,
				71.3,
				71.3,
				64.3,
				62.3,
				56.2,
				62.7,
				94,
				60,
				53.4,
				78.4,
				42.5,
				50.2,
				54.1,
				30.7,
				68.7,
				17.2,
				50.9,
				56.2,
				63.3,
				51.3,
				54.1,
				59.4,
				51.6,
				49.5,
				15.1,
				17.8,
				61.4,
				15.7,
				77.8,
				50,
				56.3,
				55.7,
				51.4,
				55.2,
				50.2,
				40.4,
				50.8,
				51.9,
				80.9,
				47.1,
				54.9,
				49.5,
				35.3,
				14.6,
				47.9,
				44.4,
				40,
				13.5,
				63.3,
				53.9,
				56.3,
				53.4,
				12.8,
				50.2,
				37.1,
				63.1,
				24.9,
				70.1,
				60,
				0,
				63.1,
				31.1,
				22,
				52.4,
				37.5,
				32.8,
				17.2,
				49,
				37.9,
				14.1,
				26.7,
				11.2,
				27.1,
				65.4,
				62,
				64.8,
				86.2,
				48.4,
				64.1,
				64.1,
				64.1,
				64.1,
				64.1,
				64.1,
				87.7,
				70.8,
				59.2,
				59.2,
				59.2,
				59.2,
				15.1,
				15.1,
				15.1,
				15.1,
				68.2,
				62.7,
				67,
				67,
				67,
				67,
				67,
				47.1,
				67,
				56.2,
				56.2,
				56.2,
				56.2,
				53.4,
				50.6,
				71.1,
				50.9,
				50.9,
				50.9,
				50.9,
				50.9,
				50.9,
				92.4,
				63.3,
				54.1,
				54.1,
				54.1,
				54.1,
				15.1,
				15.1,
				15.1,
				15.1,
				58,
				50,
				56.3,
				56.3,
				56.3,
				56.3,
				56.3,
				34.4,
				56.3,
				50.8,
				50.8,
				50.8,
				50.8,
				54.9,
				51.9,
				54.9,
				31.1,
				41.1,
				16.2,
				16.2,
				23.6,
				23.6,
				19.2,
				42.3,
				100,
				100,
				64.5,
				64.5,
				76.4,
				57.1,
				79.5,
				55.6,
				55.6,
				55.6,
				55.6
			],
			ascent: 99,
			descent: 40
		},
		600: {
			chars: "0123456789 !\"#$%&'()*+,-./:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\xA0¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ–—‘’“”•…→←↑↓✓✗€≈≠≤≥",
			widths: [
				63.1,
				12.8,
				57.2,
				50.9,
				68.1,
				70.8,
				62.7,
				61.5,
				64.8,
				56.9,
				40,
				13.5,
				23.6,
				63.8,
				55.7,
				51.9,
				67,
				16.2,
				29.8,
				35.2,
				50.8,
				52.4,
				17.8,
				31.1,
				14.1,
				45.5,
				16.7,
				12.4,
				47.6,
				49.2,
				47.2,
				50.6,
				104.3,
				64.1,
				71.1,
				70.8,
				64.8,
				59.2,
				69.2,
				69.2,
				60.5,
				15.1,
				52.9,
				60.5,
				69.2,
				82.7,
				62.7,
				67,
				63.8,
				71.3,
				71.3,
				64.3,
				62.3,
				56.2,
				62.7,
				94,
				60,
				53.4,
				78.4,
				42.5,
				50.2,
				54.1,
				30.7,
				68.7,
				17.2,
				50.9,
				56.2,
				63.3,
				51.3,
				54.1,
				59.4,
				51.6,
				49.5,
				15.1,
				17.8,
				61.4,
				15.7,
				77.8,
				50,
				56.3,
				55.7,
				51.4,
				55.2,
				50.2,
				40.4,
				50.8,
				51.9,
				80.9,
				47.1,
				54.9,
				49.5,
				35.3,
				14.6,
				47.9,
				44.4,
				40,
				13.5,
				63.3,
				53.9,
				56.3,
				53.4,
				12.8,
				50.2,
				37.1,
				63.1,
				24.9,
				70.1,
				60,
				0,
				63.1,
				31.1,
				22,
				52.4,
				37.5,
				32.8,
				17.2,
				49,
				37.9,
				14.1,
				26.7,
				11.2,
				27.1,
				65.4,
				62,
				64.8,
				86.2,
				48.4,
				64.1,
				64.1,
				64.1,
				64.1,
				64.1,
				64.1,
				87.7,
				70.8,
				59.2,
				59.2,
				59.2,
				59.2,
				15.1,
				15.1,
				15.1,
				15.1,
				68.2,
				62.7,
				67,
				67,
				67,
				67,
				67,
				47.1,
				67,
				56.2,
				56.2,
				56.2,
				56.2,
				53.4,
				50.6,
				71.1,
				50.9,
				50.9,
				50.9,
				50.9,
				50.9,
				50.9,
				92.4,
				63.3,
				54.1,
				54.1,
				54.1,
				54.1,
				15.1,
				15.1,
				15.1,
				15.1,
				58,
				50,
				56.3,
				56.3,
				56.3,
				56.3,
				56.3,
				34.4,
				56.3,
				50.8,
				50.8,
				50.8,
				50.8,
				54.9,
				51.9,
				54.9,
				31.1,
				41.1,
				16.2,
				16.2,
				23.6,
				23.6,
				19.2,
				42.3,
				100,
				100,
				72.3,
				72.3,
				76.4,
				57.1,
				79.5,
				55.6,
				55.6,
				55.6,
				55.6
			],
			ascent: 99,
			descent: 40
		}
	}
}, rt = /* @__PURE__ */ new Map();
function it(e, t) {
	let n = `${e}|${t}`, r = rt.get(n);
	if (r) return r;
	let i = nt[e];
	if (!i) return null;
	let a = i[Object.keys(i).map(Number).reduce((e, n) => Math.abs(n - t) < Math.abs(e - t) ? n : e)], o = /* @__PURE__ */ new Map();
	Array.from(a.chars).forEach((e, t) => o.set(e, a.widths[t]));
	let s = "abcdefghijklmnopqrstuvwxyz".split("").map((e) => o.get(e) ?? 50), c = {
		widths: o,
		fallback: s.reduce((e, t) => e + t, 0) / s.length
	};
	return rt.set(n, c), c;
}
var at;
function ot() {
	if (at === void 0) try {
		at = typeof document < "u" ? document.createElement("canvas").getContext("2d") : null;
	} catch {
		at = null;
	}
	return at ?? null;
}
function st(e, t, n, r) {
	let i = it(n, r);
	if (!i) {
		let i = ot();
		return i ? (i.font = `${r} ${t}px '${n}', cursive`, i.measureText(e).width) : e.length * t * .5;
	}
	let a = 0;
	for (let t of e) {
		let e = i.widths.get(t);
		if (e !== void 0) a += e;
		else {
			let e = ot();
			e ? (e.font = `${r} 100px '${n}', cursive`, a += e.measureText(t).width || i.fallback) : a += /[⺀-￿]/.test(t) ? 100 : i.fallback;
		}
	}
	return a * t / 100;
}
function U(e, t, n, r) {
	let i = e.split("\n"), a = 0;
	for (let e of i) a = Math.max(a, st(e, t, n, r));
	return {
		w: a * 1.04 + 2,
		h: i.length * t * 1.12
	};
}
// src/core/draw/text.ts
function ct(e, t, n, r, i, a, o, s, c = "middle") {
	let l = t.split("\n"), u = i.px * 1.12, d = r - l.length * u / 2 + u / 2, f = [], p = .35 + i.mess;
	return l.forEach((t, r) => {
		let l = d + r * u, m = Array.from(t), h = [], g = [], _ = 0;
		for (let e of m) {
			let e = (a() - .5) * 2.4 * p;
			h.push(((a() - .5) * 9 * p).toFixed(1)), g.push((e - _).toFixed(2)), _ = e;
		}
		let v = V("g", { transform: `rotate(${((a() - .5) * 2.2 * p).toFixed(2)} ${n} ${l})` }, e), y = V("text", {
			x: n,
			y: l,
			"font-family": `'${i.family}', cursive`,
			"font-size": i.px,
			"font-weight": i.weight,
			fill: i.color,
			"text-anchor": c,
			"dominant-baseline": "central",
			rotate: h.join(" "),
			dy: g.join(" ")
		}, v);
		y.textContent = t;
		let { w: b } = U(t, i.px, i.family, i.weight), x = c === "middle" ? n - b / 2 - 4 : n - 4, S = `${s}-c${f.length}-${Math.round(a() * 1e6)}`, C = V("clipPath", { id: S }, o), w = V("rect", {
			x,
			y: l - u,
			width: 0,
			height: u * 2
		}, C);
		v.setAttribute("clip-path", `url(#${S})`), f.push({
			el: v,
			mode: "clip",
			len: b,
			clip: w,
			clipX: x,
			clipW: b + 10
		});
	}), f;
}
// src/core/draw/edges.ts
function lt(e) {
	let { doc: t, textStyle: n, lay: r, defs: i, rc: a, rand: o, base: s, paper: c, uid: l, roughness: u, stepOf: d, add: f, edgeLayer: p, inkFor: m } = e;
	t.edges.forEach((h, g) => {
		let _ = r.edges[g].points, v = V("g", {
			"data-ink-kind": "edge",
			"data-ink-id": `${h.from}->${h.to}`,
			"data-ink-index": g,
			"data-ink-line": h.span.line,
			"data-ink-from": h.span.from,
			"data-ink-to": h.span.to
		}, p), y = [], b = Qe(_), x = _, S = h.pen ? Ue[h.pen] : e.pen, C = h.color ? m(h.color) : h.pen ? c.dark ? S.inkOnDark : S.ink : e.ink, w = s(`e-${g}`, {
			stroke: C,
			strokeWidth: S.width,
			disableMultiStroke: t.mess < .3,
			roughness: u * .7
		});
		if (h.kind === "squiggle") {
			let e = [], t = Qe(x), n = o() * Math.PI * 2;
			for (let r = 0; r <= t; r += 2.5) {
				let { p: i, dir: a } = $e(x, r), o = 3.6 * Math.min(1, r / 14, (t - r) / 14) * Math.sin(r / 13 * Math.PI * 2 + n);
				e.push([i[0] - a[1] * o, i[1] + a[0] * o]);
			}
			let r = V("path", {
				d: "M " + e.map((e) => `${e[0].toFixed(1)} ${e[1].toFixed(1)}`).join(" L "),
				fill: "none",
				stroke: C,
				"stroke-width": S.width,
				"stroke-linecap": "round",
				"stroke-linejoin": "round",
				opacity: S.opacity
			}, v);
			y.push({
				el: r,
				mode: "stroke",
				len: 0
			});
		} else {
			let e = a.curve(x, h.kind === "dashed" ? {
				...w,
				strokeLineDash: [8, 7],
				disableMultiStroke: !0
			} : w);
			v.appendChild(e), y.push(...H(e, C, h.kind === "dashed"));
		}
		let T = (e, t, n) => {
			let r = e[0] - t[0], i = e[1] - t[1], c = Math.hypot(r, i) || 1, l = r / c, u = i / c, d = 10 + S.width * 1.6, f = (24 + o() * 9) * Math.PI / 180, p = (t, n) => {
				let r = Math.atan2(-u, -l) + t * f;
				return [e[0] + Math.cos(r) * d * n, e[1] + Math.sin(r) * d * n];
			}, m = a.linearPath([
				p(1, .9 + o() * .25),
				e,
				p(-1, 1 + o() * .2)
			], s(n, {
				stroke: C,
				strokeWidth: S.width,
				roughness: .4,
				disableMultiStroke: !0
			}));
			v.appendChild(m), y.push(...H(m, C));
		}, E = $e(x, Math.max(0, Qe(x) - 12)).p;
		T(x[x.length - 1], E, `h-${g}`), h.both && T(x[0], $e(x, 12).p, `h2-${g}`);
		let D = r.labels.get(`edge:${g}`);
		if (D) {
			let e = D.box.x + D.box.w / 2, t = D.box.y + D.box.h / 2;
			y.push(...ct(v, D.text, e, t, {
				...n,
				px: D.px,
				color: C
			}, o, i, l));
		}
		let O = Math.max(d.get(h.from), d.get(h.to));
		f(O, 1e3 + g, y, .35 + Math.min(.5, b / 900) + (h.label ? .25 : 0));
	});
}
// src/core/draw/groups.ts
function ut(e) {
	let { lay: t, rc: n, base: r, rand: i, defs: a, uid: o, textStyle: s, ink: c, groupLayer: l, add: u, stepOf: d } = e;
	t.groups.forEach((f, p) => {
		let { box: m, tab: h, def: g } = f, _ = V("g", {
			class: "group",
			"data-ink-kind": "group",
			"data-ink-id": g.id,
			"data-ink-line": g.span.line,
			"data-ink-from": g.span.from,
			"data-ink-to": g.span.to
		}, l), v = n.rectangle(m.x, m.y, m.w, m.h, r(`g-${g.id}`, {
			strokeLineDash: [7, 6],
			strokeWidth: Math.max(1, e.pen.width * .8),
			disableMultiStroke: !0,
			roughness: .8
		}));
		_.appendChild(v);
		let y = [...H(v, c, !0)], b = t.fontPx * .8;
		y.push(...ct(_, g.label, h.x, h.y + h.h / 2, {
			...s,
			px: b,
			weight: Math.min(700, s.weight + 200)
		}, i, a, o, "start"));
		let x = dt(e, g.id), S = x.length ? Math.min(...x.map((e) => d.get(e) ?? Infinity)) : 1;
		u(Number.isFinite(S) ? S : 1, -100 + p, y, .5);
	});
}
function dt(e, t) {
	let n = [...e.doc.groups.find((e) => e.id === t)?.members ?? []];
	for (let r of e.doc.groups.filter((e) => e.parent === t)) n.push(...dt(e, r.id));
	return n;
}
// src/core/arrange.ts
function ft(e, t, n) {
	if (t || n) {
		for (let r of e.nodes.values()) r.cx += t, r.cy += n;
		for (let r of e.edges) r.route = r.route.map(([e, r]) => [e + t, r + n]);
		for (let r of e.groups) r.box = {
			...r.box,
			x: r.box.x + t,
			y: r.box.y + n
		}, r.tab = {
			...r.tab,
			x: r.tab.x + t,
			y: r.tab.y + n
		};
	}
}
var pt = (e, t = 0) => ({
	x: e.cx - e.w / 2 - t,
	y: e.cy - e.h / 2 - t,
	w: e.w + t * 2,
	h: e.h + t * 2
});
function mt(e) {
	let t = Math.min(...e.map((e) => e.x)), n = Math.min(...e.map((e) => e.y)), r = Math.max(...e.map((e) => e.x + e.w)), i = Math.max(...e.map((e) => e.y + e.h));
	return {
		x: t,
		y: n,
		w: r - t,
		h: i - n
	};
}
function ht(e, t) {
	let n = e.fontPx * .8, r = Math.min(700, e.weight + 200), i = (e) => +!!t.groups.find((t) => t.id === e)?.parent, a = [...t.groups].sort((e, t) => i(t.id) - i(e.id)), o = /* @__PURE__ */ new Map();
	for (let i of a) {
		let a = i.members.map((t) => e.nodes.get(t)).filter((e) => !!e).map((e) => pt(e));
		for (let e of t.groups.filter((e) => e.parent === i.id)) {
			let t = o.get(e.id);
			t && a.push(t);
		}
		if (!a.length) continue;
		let s = mt(a), c = U(i.label, n, e.family, r), l = c.h + 4, u = {
			x: s.x - 14,
			y: s.y - 14 - l - 2,
			w: s.w + 28,
			h: s.h + 28 + l + 2
		};
		u.w < c.w + 28 && (u = {
			...u,
			x: u.x - (c.w + 28 - u.w) / 2,
			w: c.w + 28
		});
		let d = {
			x: u.x + 12,
			y: u.y + 6,
			w: c.w,
			h: c.h
		};
		o.set(i.id, u), e.groups.push({
			def: i,
			box: u,
			tab: d
		});
	}
	e.groups.sort((e, t) => i(e.def.id) - i(t.def.id));
}
function gt(e, t = 30) {
	let n = [...[...e.nodes.values()].map((e) => pt(e)), ...e.groups.map((e) => e.box)];
	if (!n.length) return;
	let r = mt(n), i = r.x < t ? t - r.x : 0, a = r.y < t ? t - r.y : 0;
	ft(e, i, a), e.width = Math.max(e.width + i, r.x + r.w + i + t), e.height = Math.max(e.height + a, r.y + r.h + a + t);
}
function _t(e, t) {
	if (!t.title) return;
	let n = e.fontPx * 1.55, { w: r } = U(t.title, n, e.family, Math.min(700, e.weight + 200));
	e.width = Math.max(e.width, r + 60), ft(e, 0, e.titleH), e.height += e.titleH;
	let i = e.width / 2, a = 22 + n / 2;
	e.titleBox = {
		x: i - r / 2 - 10,
		y: a - n / 2 - 4,
		w: r + 24,
		h: n + 14
	};
}
function vt(e, t) {
	if (t.targetKind === "node") return e.nodes.get(t.target);
	let n = (e, n, r) => ({
		def: {
			id: t.target,
			shape: "box",
			label: r,
			line: t.line,
			span: t.span,
			order: t.order
		},
		cx: e.x + e.w / 2,
		cy: e.y + e.h / 2,
		w: e.w,
		h: e.h,
		rotate: 0,
		labelDy: n.y + n.h / 2 - (e.y + e.h / 2),
		labelW: n.w,
		labelH: n.h
	});
	if (t.targetKind === "group") {
		let r = e.groups.find((e) => e.def.id === t.target);
		return r ? n(r.box, r.tab, r.def.label) : void 0;
	}
	let r = e.edges[t.edgeIndex ?? -1];
	if (!r) return;
	let i = e.labels.get(`edge:${r.index}`);
	if (i) return n(i.box, i.box, i.text);
	let a = yt(r.points), o = {
		x: a[0] - 9,
		y: a[1] - 9,
		w: 18,
		h: 18
	};
	return n(o, o, "");
}
function yt(e) {
	let t = 0;
	for (let n = 1; n < e.length; n++) t += Math.hypot(e[n][0] - e[n - 1][0], e[n][1] - e[n - 1][1]);
	let n = 0;
	for (let r = 1; r < e.length; r++) {
		let i = Math.hypot(e[r][0] - e[r - 1][0], e[r][1] - e[r - 1][1]);
		if (n + i >= t / 2) {
			let a = i ? (t / 2 - n) / i : 0;
			return [e[r - 1][0] + (e[r][0] - e[r - 1][0]) * a, e[r - 1][1] + (e[r][1] - e[r - 1][1]) * a];
		}
		n += i;
	}
	return e[0];
}
// src/core/scene.ts
function W(e, t, n, r = 7) {
	let i = t - e.cx, a = n - e.cy, o = Math.hypot(i, a) || 1, s = i / o, c = a / o, l = e.w / 2, u = e.h / 2, d;
	return d = e.def.shape === "circle" || e.def.shape === "cloud" ? 1 / Math.sqrt(s * s / (l * l) + c * c / (u * u)) : e.def.shape === "diamond" ? 1 / (Math.abs(s) / l + Math.abs(c) / u) : Math.min(s === 0 ? Infinity : l / Math.abs(s), c === 0 ? Infinity : u / Math.abs(c)), [e.cx + s * (d + r), e.cy + c * (d + r)];
}
// src/core/draw/marks.ts
function bt(e) {
	let { doc: t, textStyle: n, lay: r, defs: i, rc: a, rand: o, base: s, mark: c, good: l, paper: u, uid: d, add: f, markLayer: p, extra: m, stepOfTarget: h } = e;
	t.annotations.forEach((e, t) => {
		let g = vt(r, e);
		if (!g) return;
		let _ = V("g", {
			"data-ink-kind": "mark",
			"data-ink-id": e.target,
			"data-ink-index": t,
			"data-ink-line": e.span.line,
			"data-ink-from": e.span.from,
			"data-ink-to": e.span.to
		}, p), v = [], y = (e, t = {}) => s(e, {
			stroke: c,
			strokeWidth: 2,
			roughness: .55,
			bowing: .6,
			disableMultiStroke: !0,
			...t
		}), b = tt(g), x = e.color ? B[e.color] : void 0;
		switch (e.kind) {
			case "circle": {
				let e = g.w / 2 + 16, n = g.h / 2 + 13, r = o() * Math.PI * 2, i = Math.PI * 2 + .35 + o() * .35, s = (o() - .5) * .25, l = [];
				for (let t = 0; t <= 44; t++) {
					let a = r + t / 44 * i, o = 1 + .06 * Math.sin(a * 1.7 + r) + t / 44 * .05, c = Math.cos(a) * e * o, u = Math.sin(a) * n * o;
					l.push([g.cx + c * Math.cos(s) - u * Math.sin(s), g.cy + c * Math.sin(s) + u * Math.cos(s)]);
				}
				let u = a.curve(l, y(`a-${t}`, x ? {
					stroke: x,
					strokeWidth: 2.4
				} : {}));
				_.appendChild(u), v.push(...H(u, x ?? c)), m.push(et(g, 18));
				break;
			}
			case "underline":
			case "strike": {
				let n = e.kind === "underline" ? b.y + b.h + 3 : b.y + b.h / 2 + 1, r = b.x - 5, i = b.x + b.w + 7, s = x ?? c, l = a.curve([
					[r, n + 1.5],
					[(r + i) / 2, n + (o() - .5) * 3],
					[i, n - 2]
				], y(`u-${t}`, { stroke: s }));
				if (_.appendChild(l), v.push(...H(l, s)), e.kind === "underline") {
					let e = a.curve([
						[r + 8, n + 6],
						[(r + i) / 2, n + 5 + (o() - .5) * 2],
						[i - 6, n + 3.5]
					], y(`u2-${t}`, {
						stroke: s,
						strokeWidth: 1.6
					}));
					_.appendChild(e), v.push(...H(e, s));
				}
				break;
			}
			case "highlight": {
				let e = x ?? B.yellow, t = g.def.label.split("\n").length, n = b.h / t;
				for (let r = 0; r < t; r++) {
					let t = b.y + n * (r + .55), i = b.x - 6, a = b.x + b.w + 6, s = V("path", {
						d: `M ${i} ${t + (o() - .5) * 2} Q ${(i + a) / 2} ${t + (o() - .5) * 4} ${a} ${t + (o() - .5) * 3}`,
						fill: "none",
						stroke: e,
						"stroke-width": n * .95,
						"stroke-linecap": "round",
						opacity: u.dark ? .42 : .6,
						style: u.dark ? "" : "mix-blend-mode: multiply"
					}, _);
					v.push({
						el: s,
						mode: "stroke",
						len: 0
					}), s.setAttribute("transform", `rotate(${g.rotate.toFixed(2)} ${g.cx} ${g.cy})`);
				}
				break;
			}
			case "cross":
			case "check": {
				let n = e.targetKind === "node" ? 0 : 14, r = g.cx + g.w / 2 - 2 + n, i = g.cy - g.h / 2 + 2 - n / 2, o = e.kind === "cross" ? x ?? c : x ?? l;
				if (e.kind === "cross") {
					let e = a.line(r - 10, i - 10, r + 10, i + 10, y(`x1-${t}`, {
						stroke: o,
						strokeWidth: 2.6
					})), n = a.line(r + 10, i - 10, r - 10, i + 10, y(`x2-${t}`, {
						stroke: o,
						strokeWidth: 2.6
					}));
					_.append(e, n), v.push(...H(e, o), ...H(n, o));
				} else {
					let e = a.linearPath([
						[r - 11, i],
						[r - 3, i + 9],
						[r + 13, i - 13]
					], y(`ck-${t}`, {
						stroke: o,
						strokeWidth: 2.8
					}));
					_.appendChild(e), v.push(...H(e, o));
				}
				break;
			}
			case "note": {
				let e = r.labels.get(`note:${t}`);
				if (!e) break;
				let s = e.text, l = e.px, u = e.box;
				m.push(u);
				let f = u.x + u.w / 2, p = u.y + u.h / 2, h = ct(_, s, f, p, {
					...n,
					px: l,
					color: c
				}, o, i, d), b = Math.max(u.x - 4, Math.min(u.x + u.w + 4, g.cx)), x = Math.max(u.y - 4, Math.min(u.y + u.h + 4, g.cy)), S = [b === g.cx ? f + (g.cx - f) * .15 : b, x === g.cy ? p : x], C = W(g, S[0], S[1], 6), w = (S[0] + C[0]) / 2, T = (S[1] + C[1]) / 2, E = Math.hypot(C[0] - S[0], C[1] - S[1]), D = E * .22 * (o() > .5 ? 1 : -1), O = [w - (C[1] - S[1]) / (E || 1) * D, T + (C[0] - S[0]) / (E || 1) * D], k = a.curve([
					S,
					O,
					C
				], y(`na-${t}`, { strokeWidth: 1.6 }));
				_.appendChild(k);
				let A = [O[0] * .3 + C[0] * .7, O[1] * .3 + C[1] * .7], j = C[0] - A[0], M = C[1] - A[1], N = Math.atan2(-M, -j), P = a.linearPath([
					[C[0] + Math.cos(N + .5) * 9, C[1] + Math.sin(N + .5) * 9],
					C,
					[C[0] + Math.cos(N - .5) * 9, C[1] + Math.sin(N - .5) * 9]
				], y(`nh-${t}`, {
					strokeWidth: 1.6,
					roughness: .3
				}));
				_.appendChild(P), v.push(...h, ...H(k, c), ...H(P, c));
				break;
			}
		}
		let S = e.at ?? h(e);
		f(S, 5e3 + t, v, e.kind === "note" ? .9 : e.kind === "highlight" ? .45 : .55);
	});
}
// src/core/icons.ts
var G = (e) => ({
	t: "path",
	d: e
}), K = (e, t, n) => ({
	t: "circle",
	cx: e,
	cy: t,
	r: n
}), xt = (e, t, n, r) => ({
	t: "ellipse",
	cx: e,
	cy: t,
	w: n,
	h: r
}), q = (e, t, n, r) => ({
	t: "rect",
	x: e,
	y: t,
	w: n,
	h: r
}), J = (e, t, n, r) => ({
	t: "line",
	x1: e,
	y1: t,
	x2: n,
	y2: r
}), Y = (e, t = !1) => ({
	t: "poly",
	pts: e,
	closed: t
});
function St() {
	let e = [];
	for (let t = 0; t < 10; t++) {
		let n = -Math.PI / 2 + t * Math.PI / 5, r = t % 2 == 0 ? 10 : 4.2;
		e.push([12 + Math.cos(n) * r, 12.5 + Math.sin(n) * r]);
	}
	return Y(e, !0);
}
function Ct() {
	let e = [K(12, 12, 3.2), K(12, 12, 7)];
	for (let t = 0; t < 8; t++) {
		let n = t * Math.PI / 4;
		e.push(J(12 + Math.cos(n) * 7, 12 + Math.sin(n) * 7, 12 + Math.cos(n) * 10, 12 + Math.sin(n) * 10));
	}
	return e;
}
var wt = {
	person: [K(12, 7, 4), G("M4 21 C4 15.5 7.5 13 12 13 C16.5 13 20 15.5 20 21")],
	server: [
		q(3, 3, 18, 7),
		q(3, 14, 18, 7),
		J(6, 6.5, 9, 6.5),
		J(6, 17.5, 9, 17.5)
	],
	database: [
		xt(12, 5, 16, 5),
		J(4, 5, 4, 19),
		J(20, 5, 20, 19),
		G("M4 12 C4 15 20 15 20 12"),
		G("M4 19 C4 22 20 22 20 19")
	],
	cloud: [G("M7 18 H17 C20 18 22 16 22 13.5 C22 11 20 9.5 18 9.5 C17.5 6.5 15 4.5 12 4.5 C8.5 4.5 6.5 7 6.2 9.5 C3.8 9.8 2 11.5 2 14 C2 16.3 4 18 7 18 Z")],
	phone: [q(7, 2, 10, 20), J(11, 18.5, 13, 18.5)],
	laptop: [q(4, 5, 16, 11), J(2, 19, 22, 19)],
	lock: [q(5, 11, 14, 10), G("M8 11 V7.5 C8 5 9.8 3 12 3 C14.2 3 16 5 16 7.5 V11")],
	key: [
		K(7.5, 15.5, 4.5),
		J(10.7, 12.3, 20, 3),
		J(15.5, 7.5, 18.5, 10.5),
		J(18, 5, 20.5, 7.5)
	],
	mail: [q(2, 5, 20, 14), Y([
		[2, 6],
		[12, 13],
		[22, 6]
	])],
	file: [
		G("M6 2 H14 L19 7 V22 H6 Z"),
		Y([
			[14, 2],
			[14, 7],
			[19, 7]
		]),
		J(9, 12, 16, 12),
		J(9, 16, 16, 16)
	],
	folder: [G("M3 6 V19 H21 V8 H11 L9 6 Z")],
	gear: Ct(),
	chart: [
		J(3, 21, 21, 21),
		J(3, 21, 3, 3),
		q(6, 13, 3, 8),
		q(11, 8, 3, 13),
		q(16, 11, 3, 10)
	],
	globe: [
		K(12, 12, 9),
		xt(12, 12, 8, 18),
		J(3, 12, 21, 12)
	],
	clock: [K(12, 12, 9), Y([
		[12, 6.5],
		[12, 12],
		[15.5, 14]
	])],
	bell: [
		G("M6 16 V11 C6 7.5 8.5 5 12 5 C15.5 5 18 7.5 18 11 V16 L20 18 H4 Z"),
		G("M10 21 C10.5 22.2 13.5 22.2 14 21"),
		J(12, 3, 12, 5)
	],
	cart: [
		Y([
			[2, 3],
			[5, 3],
			[7.5, 15],
			[18, 15],
			[20.5, 7],
			[6, 7]
		]),
		K(9, 19.5, 1.6),
		K(17, 19.5, 1.6)
	],
	card: [
		q(2, 5, 20, 14),
		J(2, 10, 22, 10),
		J(5, 15, 10, 15)
	],
	chat: [G("M4 5 H20 V16 H10 L6 20 V16 H4 Z")],
	search: [K(10.5, 10.5, 6.5), J(15.3, 15.3, 21, 21)],
	star: [St()],
	heart: [G("M12 20 C5 15 3 12 3 8.5 C3 6 5 4 7.5 4 C9.5 4 11 5.2 12 7 C13 5.2 14.5 4 16.5 4 C19 4 21 6 21 8.5 C21 12 19 15 12 20 Z")],
	bolt: [Y([
		[13, 2],
		[4, 14],
		[11, 14],
		[10, 22],
		[20, 9],
		[13, 9]
	], !0)],
	bug: [
		xt(12, 14, 10, 13),
		K(12, 5.5, 2.6),
		J(12, 8, 12, 20),
		J(7, 11, 3, 9),
		J(7, 15, 3, 15),
		J(7.5, 18, 3.5, 20.5),
		J(17, 11, 21, 9),
		J(17, 15, 21, 15),
		J(16.5, 18, 20.5, 20.5)
	],
	rocket: [
		G("M12 2 C16 5 17 10 15 16 H9 C7 10 8 5 12 2 Z"),
		K(12, 9, 1.8),
		Y([
			[9, 12.5],
			[5.5, 17],
			[9, 16.5]
		]),
		Y([
			[15, 12.5],
			[18.5, 17],
			[15, 16.5]
		]),
		Y([
			[10.5, 18.5],
			[12, 22],
			[13.5, 18.5]
		])
	],
	book: [G("M4 4 H10 C11 4 12 5 12 6 V20 C12 19 11 18 10 18 H4 Z"), G("M20 4 H14 C13 4 12 5 12 6 V20 C12 19 13 18 14 18 H20 Z")],
	camera: [
		q(2, 7, 20, 13),
		K(12, 13.5, 4),
		Y([
			[8, 7],
			[9.5, 4],
			[14.5, 4],
			[16, 7]
		])
	],
	code: [
		Y([
			[8, 7],
			[3, 12],
			[8, 17]
		]),
		Y([
			[16, 7],
			[21, 12],
			[16, 17]
		]),
		J(14, 4, 10, 20)
	],
	link: [
		J(9.5, 14.5, 14.5, 9.5),
		G("M9 7.5 L11 5.5 C13 3.5 16.5 3.5 18.5 5.5 C20.5 7.5 20.5 11 18.5 13 L16.5 15"),
		G("M15 16.5 L13 18.5 C11 20.5 7.5 20.5 5.5 18.5 C3.5 16.5 3.5 13 5.5 11 L7.5 9")
	],
	check: [Y([
		[4, 12.5],
		[9, 17.5],
		[20, 6.5]
	])]
}, Tt = Object.keys(wt);
// src/core/draw/nodes.ts
function Et(e) {
	let { doc: t, textStyle: n, defs: r, rc: i, rand: a, base: o, ink: s, paper: c, uid: l, lay: u, stepOf: d, rankInStep: f, add: p, nodeLayer: m, inkFor: h } = e;
	for (let g of t.nodes) {
		let t = u.nodes.get(g.id), _ = g.pen ? Ue[g.pen] : void 0, v = g.color ? h(g.color) : _ ? c.dark ? _.inkOnDark : _.ink : s, y = {
			stroke: v,
			..._ ? { strokeWidth: _.width } : {}
		}, b = Ke[g.size ?? "normal"] ?? 1, x = V("g", {
			transform: `translate(${t.cx.toFixed(1)} ${t.cy.toFixed(1)}) rotate(${t.rotate.toFixed(2)})`,
			"data-ink-kind": "node",
			"data-ink-id": g.id,
			"data-ink-line": g.span.line,
			"data-ink-from": g.span.from,
			"data-ink-to": g.span.to
		}, m), S = -t.w / 2, C = -t.h / 2, w = g.fill ? B[g.fill] : void 0, T = o(`n-${g.id}`, {
			...y,
			...w ? {
				fill: w,
				fillStyle: "hachure",
				hachureGap: 7.5
			} : {}
		}), E = null, D = v;
		switch (g.shape) {
			case "box":
				E = i.rectangle(S, C, t.w, t.h, T);
				break;
			case "round": {
				let e = Math.min(t.h / 2, 22), n = `M ${S + e} ${C} L ${S + t.w - e} ${C} Q ${S + t.w} ${C} ${S + t.w} ${C + e} L ${S + t.w} ${C + t.h - e} Q ${S + t.w} ${C + t.h} ${S + t.w - e} ${C + t.h} L ${S + e} ${C + t.h} Q ${S} ${C + t.h} ${S} ${C + t.h - e} L ${S} ${C + e} Q ${S} ${C} ${S + e} ${C} Z`;
				E = i.path(n, T);
				break;
			}
			case "circle":
				E = i.ellipse(0, 0, t.w, t.h, T);
				break;
			case "diamond":
				E = i.polygon([
					[0, C],
					[t.w / 2, 0],
					[0, -C],
					[-t.w / 2, 0]
				], T);
				break;
			case "cloud": {
				let e = t.w / 2 - 6, n = t.h / 2 - 6, r = a() * Math.PI, o = "";
				for (let t = 0; t <= 9; t++) {
					let i = r + t / 9 * Math.PI * 2, s = Math.cos(i) * e, c = Math.sin(i) * n;
					if (t === 0) o += `M ${s.toFixed(1)} ${c.toFixed(1)}`;
					else {
						let t = 2 * Math.PI / 9 * Math.max(e, n) * (.42 + a() * .12);
						o += ` A ${t.toFixed(1)} ${t.toFixed(1)} 0 0 1 ${s.toFixed(1)} ${c.toFixed(1)}`;
					}
				}
				E = i.path(o, T);
				break;
			}
			case "db": {
				let e = V("g", {});
				e.appendChild(i.ellipse(0, C + 10, t.w, 20, T)), e.appendChild(i.path(`M ${S} ${C + 10} L ${S} ${C + t.h - 10} A ${t.w / 2} 10 0 0 0 ${S + t.w} ${C + t.h - 10} L ${S + t.w} ${C + 10}`, o(`n-${g.id}-b`, w ? {
					fill: w,
					fillStyle: "hachure"
				} : {}))), E = e;
				break;
			}
			case "sticky": {
				let e = V("g", {});
				V("rect", {
					x: S + 4,
					y: C + 5,
					width: t.w,
					height: t.h,
					fill: "rgba(0,0,0,0.12)",
					rx: 2
				}, e), e.appendChild(i.polygon([
					[S, C],
					[S + t.w, C],
					[S + t.w, C + t.h - 16],
					[S + t.w - 16, C + t.h],
					[S, C + t.h]
				], o(`n-${g.id}`, {
					fill: w ?? "#fff2a1",
					fillStyle: "solid",
					stroke: "#c9b44a",
					strokeWidth: 1,
					roughness: .6
				}))), e.appendChild(i.linearPath([
					[S + t.w, C + t.h - 16],
					[S + t.w - 16 + 2, C + t.h - 16 + 2],
					[S + t.w - 16, C + t.h]
				], o(`n-${g.id}-f`, {
					stroke: "#b9a33c",
					strokeWidth: 1,
					roughness: .5
				}))), E = e, D = "#2b2a26";
				break;
			}
			case "person": {
				let e = V("g", {}), t = C;
				e.appendChild(i.circle(0, t + 11 + 1, 22, T)), e.appendChild(i.line(0, t + 22 + 1, 0, t + 44, T)), e.appendChild(i.line(-16, t + 30, 16, t + 28, T)), e.appendChild(i.line(0, t + 44, -13, t + 64, T)), e.appendChild(i.line(0, t + 44, 13, t + 64, T)), E = e;
				break;
			}
			case "icon": {
				let t = wt[g.icon ?? ""] ?? [], n = 40 * b, r = n / 24, a = -n / 2, s = C + 2 * b, c = o(`i-${g.id}`, {
					...y,
					roughness: Math.min(1, T.roughness ?? 1) * .6,
					strokeWidth: (_ ?? e.pen).width * .95
				}), l = (e, t) => [a + e * r, s + t * r], u = V("g", {});
				for (let e of t) {
					let t;
					switch (e.t) {
						case "circle":
							t = i.circle(...l(e.cx, e.cy), e.r * 2 * r, c);
							break;
						case "ellipse":
							t = i.ellipse(...l(e.cx, e.cy), e.w * r, e.h * r, c);
							break;
						case "rect":
							t = i.rectangle(...l(e.x, e.y), e.w * r, e.h * r, c);
							break;
						case "line":
							t = i.line(...l(e.x1, e.y1), ...l(e.x2, e.y2), c);
							break;
						case "poly":
							t = e.closed ? i.polygon(e.pts.map(([e, t]) => l(e, t)), c) : i.linearPath(e.pts.map(([e, t]) => l(e, t)), c);
							break;
						case "path": {
							let n = V("g", { transform: `translate(${a} ${s}) scale(${r})` }), o = i.path(e.d, {
								...c,
								strokeWidth: (c.strokeWidth ?? 1.5) / r
							});
							n.appendChild(o), t = n;
							break;
						}
					}
					u.appendChild(t);
				}
				E = u;
				break;
			}
		}
		let O = [];
		E && w && g.shape !== "sticky" && E.querySelectorAll("path").forEach((e) => {
			e.getAttribute("stroke") === w && e.setAttribute("stroke-opacity", c.dark ? "0.5" : "0.65");
		}), E && (x.appendChild(E), O.push(...H(E, g.shape === "sticky" ? "#__none" : v, g.shape === "sticky"))), O.push(...ct(x, g.label, 0, t.labelDy, {
			...n,
			px: n.px * b,
			color: D
		}, a, r, l));
		let k = g.label.length;
		p(d.get(g.id), f.get(g.id), O, .5 + Math.min(.6, k * .025));
	}
}
// src/core/draw/paper.ts
function Dt(e, t, n, r, i) {
	let a = He[n];
	V("rect", {
		x: r.x,
		y: r.y,
		width: r.w,
		height: r.h,
		fill: a.ground
	}, e);
	let o = (e, n, a) => V("pattern", {
		id: `${i}-${e}`,
		width: n,
		height: a,
		patternUnits: "userSpaceOnUse",
		x: r.x,
		y: r.y
	}, t), s = (n, a) => {
		let o = V("filter", {
			id: `${i}-noise`,
			x: 0,
			y: 0,
			width: "100%",
			height: "100%"
		}, t);
		V("feTurbulence", {
			type: "fractalNoise",
			baseFrequency: .85,
			numOctaves: 2,
			stitchTiles: "stitch",
			result: "n"
		}, o), V("feColorMatrix", {
			type: "matrix",
			values: `0 0 0 0 ${a} 0 0 0 0 ${a} 0 0 0 0 ${a} 0 0 0 ${n} 0`
		}, o), V("rect", {
			x: r.x,
			y: r.y,
			width: r.w,
			height: r.h,
			filter: `url(#${i}-noise)`
		}, e);
	};
	switch (n) {
		case "notebook":
			V("line", {
				x1: 0,
				y1: 29.5,
				x2: 8,
				y2: 29.5,
				stroke: "#c7d6ec",
				"stroke-width": 1
			}, o("lines", 8, 30)), V("rect", {
				x: r.x,
				y: r.y + 50,
				width: r.w,
				height: r.h - 50,
				fill: `url(#${i}-lines)`
			}, e), V("line", {
				x1: r.x + 18,
				y1: r.y,
				x2: r.x + 18,
				y2: r.y + r.h,
				stroke: "#eeb0ad",
				"stroke-width": 1.2
			}, e);
			break;
		case "graph":
		case "blueprint": {
			let t = n === "graph" ? "#e2ebf1" : "rgba(255,255,255,0.10)", a = n === "graph" ? "#cbdbe6" : "rgba(255,255,255,0.22)", c = o("grid", 100, 100);
			for (let e = 0; e <= 100; e += 20) {
				let n = e % 100 == 0 ? a : t;
				V("line", {
					x1: e,
					y1: 0,
					x2: e,
					y2: 100,
					stroke: n,
					"stroke-width": 1
				}, c), V("line", {
					x1: 0,
					y1: e,
					x2: 100,
					y2: e,
					stroke: n,
					"stroke-width": 1
				}, c);
			}
			V("rect", {
				x: r.x,
				y: r.y,
				width: r.w,
				height: r.h,
				fill: `url(#${i}-grid)`
			}, e), n === "blueprint" && s(.05, "1");
			break;
		}
		case "napkin":
			s(.07, "0.35"), V("circle", {
				cx: 8,
				cy: 8,
				r: 1.1,
				fill: "rgba(120,96,60,0.10)"
			}, o("emboss", 16, 16)), V("rect", {
				x: r.x,
				y: r.y,
				width: r.w,
				height: r.h,
				fill: `url(#${i}-emboss)`
			}, e);
			break;
		case "chalkboard":
			s(.07, "1");
			break;
		case "whiteboard": {
			let n = V("linearGradient", {
				id: `${i}-sheen`,
				x1: 0,
				y1: 0,
				x2: 1,
				y2: 1
			}, t);
			V("stop", {
				offset: 0,
				"stop-color": "#ffffff",
				"stop-opacity": 0
			}, n), V("stop", {
				offset: .5,
				"stop-color": "#e9eef3",
				"stop-opacity": .5
			}, n), V("stop", {
				offset: 1,
				"stop-color": "#ffffff",
				"stop-opacity": 0
			}, n), V("rect", {
				x: r.x,
				y: r.y,
				width: r.w,
				height: r.h,
				fill: `url(#${i}-sheen)`
			}, e);
			break;
		}
	}
}
// src/core/draw/schedule.ts
function Ot(e, t) {
	e.sort((e, t) => e.step - t.step || e.rank - t.rank);
	let n = Array.from(new Set(e.filter((e) => e.step >= 0).map((e) => e.step))).sort((e, t) => e - t), r = [], i = 0, a = 0;
	e.length && e[0].step < 0 && (e[0].start = 0, i = e[0].dur * .85, a = 1);
	for (let o of n) {
		let n = i, s = i;
		for (; a < e.length && e[a].step === o;) e[a].start = i, s = Math.max(s, i + e[a].dur), i += e[a].dur * .78, a++;
		i = s + .3, r.push({
			index: o,
			caption: t.steps.find((e) => e.index === o)?.caption,
			start: n,
			end: s
		});
	}
	return {
		steps: r,
		duration: e.reduce((e, t) => Math.max(e, t.start + t.dur), 0)
	};
}
// src/core/draw/title.ts
function kt(e) {
	let { doc: t, textStyle: n, lay: r, defs: i, rc: a, rand: o, base: s, mark: c, uid: l, add: u, content: d } = e;
	if (t.title) {
		let e = V("g", { class: "title" }, d), f = r.fontPx * 1.55, { w: p } = U(t.title, f, r.family, Math.min(700, r.weight + 200)), m = r.width / 2, h = 22 + f / 2, g = ct(e, t.title, m, h, {
			...n,
			px: f,
			weight: Math.min(700, r.weight + 200)
		}, o, i, l), _ = h + f * .62, v = a.curve([
			[m - p / 2 - 6, _ + 2],
			[m, _ - 1 + (o() - .5) * 3],
			[m + p / 2 + 10, _ - 3]
		], s("title-ul", {
			stroke: c,
			strokeWidth: 2,
			roughness: .6,
			disableMultiStroke: !0
		}));
		e.appendChild(v), u(-1, 0, [...g, ...H(v, c)], .9);
	}
}
// src/core/draw/index.ts
var At = 0;
function jt(e) {
	let t = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Map(), r = (t) => {
		let n = e.groups.find((e) => e.id === t);
		return n ? [...n.members, ...e.groups.filter((e) => e.parent === t).flatMap((e) => r(e.id))] : [];
	};
	e.steps.length ? e.steps.forEach((i) => i.items.forEach((a, o) => {
		for (let s of e.groups.some((e) => e.id === a) ? r(a) : [a]) t.has(s) || (t.set(s, i.index), n.set(s, o));
	})) : e.autoSteps && [...e.nodes].sort((e, t) => e.order - t.order).forEach((e, r) => {
		t.set(e.id, r + 1), n.set(e.id, 0);
	});
	let i = e.steps.length ? e.steps[0].index : 1;
	return e.nodes.forEach((e, r) => {
		t.has(e.id) || t.set(e.id, i), n.has(e.id) || n.set(e.id, 100 + r);
	}), {
		stepOf: t,
		rankInStep: n
	};
}
function Mt(e, t, n = {}) {
	Ze(n.document ?? globalThis.document);
	let r = n.idPrefix ?? `ink${++At}`, i = He[e.paper], a = Ue[e.pen], o = i.dark ? a.inkOnDark : a.ink, s = i.mark, c = i.dark ? "#8ce6a8" : "#2f8f55", l = V("svg", {
		xmlns: Ye,
		class: "inkling-svg",
		role: "img"
	}), u = V("defs", {}, l);
	V("style", {}, u).textContent = `@import url('${Je}');`, e.title && (V("title", {}, l).textContent = e.title), V("desc", {}, l).textContent = ze(e);
	let d = Math.max(.25, .3 + e.mess * 1.6 + a.grain), f = (t, n = {}) => ({
		stroke: o,
		strokeWidth: a.width,
		roughness: d,
		bowing: .4 + e.mess * 2,
		seed: (Ve(t) + e.seed * 31) % 2147483646 + 1,
		fillWeight: Math.max(.8, a.width * .55),
		hachureGap: 5.5,
		hachureAngle: -41,
		...n
	}), { stepOf: p, rankInStep: m } = jt(e), h = [], g = V("g", { class: "content" }), _ = {
		doc: e,
		lay: t,
		uid: r,
		svg: l,
		defs: u,
		rc: Le.svg(l),
		rand: Be(e.seed * 104729 + 7),
		base: f,
		roughness: d,
		textStyle: {
			px: t.fontPx,
			family: t.family,
			weight: t.weight,
			color: o,
			mess: e.mess
		},
		paper: i,
		pen: a,
		ink: o,
		mark: s,
		good: c,
		inkFor: (e) => Ge[e] ? Ge[e][i.dark ? "dark" : "light"] : o,
		stepOf: p,
		rankInStep: m,
		stepOfTarget: (t) => {
			if (t.targetKind === "edge") {
				let n = e.edges[t.edgeIndex ?? 0];
				return Math.max(p.get(n.from) ?? 1, p.get(n.to) ?? 1);
			}
			if (t.targetKind === "group") {
				let e = dt(_, t.target);
				return e.length ? Math.max(...e.map((e) => p.get(e) ?? 1)) : 1;
			}
			return p.get(t.target) ?? 1;
		},
		add: (e, t, n, r) => h.push({
			step: e,
			rank: t,
			pieces: n,
			dur: r,
			start: 0
		}),
		content: g,
		groupLayer: V("g", { class: "groups" }, g),
		edgeLayer: V("g", { class: "edges" }, g),
		nodeLayer: V("g", { class: "nodes" }, g),
		markLayer: V("g", { class: "marks" }, g),
		extra: [...t.labels.values()].map((e) => e.box)
	};
	kt(_), ut(_), Et(_), lt(_), bt(_);
	let v = [{
		x: 0,
		y: 0,
		w: t.width,
		h: t.height
	}, ..._.extra], y = Infinity, b = Infinity, x = -Infinity, S = -Infinity;
	for (let e of v) y = Math.min(y, e.x), b = Math.min(b, e.y), x = Math.max(x, e.x + e.w), S = Math.max(S, e.y + e.h);
	let C = {
		x: y - 20,
		y: b - 16,
		w: x - y + 40,
		h: S - b + 32
	};
	if (l.setAttribute("viewBox", `${C.x.toFixed(0)} ${C.y.toFixed(0)} ${C.w.toFixed(0)} ${C.h.toFixed(0)}`), l.setAttribute("width", C.w.toFixed(0)), l.setAttribute("height", C.h.toFixed(0)), Dt(l, u, e.paper, C, r), a.opacity < 1 && g.setAttribute("opacity", String(a.opacity)), l.appendChild(g), n.still) {
		for (let e of h) e.start = 0, e.dur = .001;
		return {
			svg: l,
			items: h,
			steps: [{
				index: 1,
				start: 0,
				end: .001
			}],
			duration: .001
		};
	}
	let { steps: w, duration: T } = Ot(h, e);
	return {
		svg: l,
		items: h,
		steps: w,
		duration: T
	};
}
// src/core/humanise.ts
function Nt(e, t, n) {
	let r = t.mess, i = e.humanise;
	for (let a of t.nodes) {
		let t = e.nodes.get(a.id);
		t && (t.rotate = a.shape === "sticky" ? (n() - .5) * i.stickyTilt : (n() - .5) * i.tilt * r, t.cx += (n() - .5) * i.jitterX * r, t.cy += (n() - .5) * i.jitterY * r);
	}
}
function Pt(e, t, n) {
	let r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map(), a = (e, t) => e < t ? `${e}\u0000${t}` : `${t}\u0000${e}`;
	for (let t of e.edges) r.set(a(t.def.from, t.def.to), (r.get(a(t.def.from, t.def.to)) ?? 0) + 1);
	for (let o of e.edges) {
		let s = o.def, c = e.nodes.get(s.from), l = e.nodes.get(s.to), u = o.route;
		if (s.from === s.to) {
			let e = Math.max(c.w, c.h) * .45;
			o.points = [
				W(c, c.cx + c.w, c.cy - c.h * 2),
				[c.cx + c.w / 2 + e, c.cy - c.h / 2 - e],
				W(c, c.cx + c.w * 2, c.cy - c.h * .2)
			];
		} else if (u.length === 0) {
			let u = a(s.from, s.to), d = r.get(u), f = i.get(u) ?? 0;
			i.set(u, f + 1);
			let p = Math.hypot(l.cx - c.cx, l.cy - c.cy) || 1;
			if (d > 1) {
				let t = s.from < s.to ? 1 : -1, n = e.edges.some((e) => e.def.label && a(e.def.from, e.def.to) === u);
				o.bend = (f - (d - 1) / 2) * (n ? 56 : 40) * t;
			} else o.bend = (n() - .5) * p * .08 * (.4 + t.mess);
			let m = (l.cx - c.cx) / p, h = (l.cy - c.cy) / p, g = [(c.cx + l.cx) / 2 - h * o.bend, (c.cy + l.cy) / 2 + m * o.bend], _ = d === 1 ? Ft(e, c, l, g) : void 0;
			if (_) {
				let e = -h, t = m, n = (_.cx - c.cx) * e + (_.cy - c.cy) * t > 0 ? -1 : 1, r = Math.abs(e) * (_.w / 2) + Math.abs(t) * (_.h / 2) + 26;
				g = [_.cx + e * n * r, _.cy + t * n * r], o.bend = (g[0] - (c.cx + l.cx) / 2) * e + (g[1] - (c.cy + l.cy) / 2) * t || n;
			}
			o.points = [
				W(c, g[0], g[1]),
				g,
				W(l, g[0], g[1], 9)
			];
		} else o.points = [
			W(c, u[0][0], u[0][1]),
			...u,
			W(l, u[u.length - 1][0], u[u.length - 1][1], 9)
		];
	}
}
function Ft(e, t, n, r) {
	let i = [[[t.cx, t.cy], r], [r, [n.cx, n.cy]]], a, o = Infinity;
	for (let r of e.nodes.values()) {
		if (r === t || r === n) continue;
		let e = {
			x: r.cx - r.w / 2 - 6,
			y: r.cy - r.h / 2 - 6,
			w: r.w + 12,
			h: r.h + 12
		};
		if (i.some(([t, n]) => It(t, n, e))) {
			let e = Math.hypot(r.cx - t.cx, r.cy - t.cy);
			e < o && (o = e, a = r);
		}
	}
	return a;
}
function It(e, t, n) {
	let r = t[0] - e[0], i = t[1] - e[1], a = 0, o = 1, s = [
		[-r, e[0] - n.x],
		[r, n.x + n.w - e[0]],
		[-i, e[1] - n.y],
		[i, n.y + n.h - e[1]]
	];
	for (let [e, t] of s) if (e === 0) {
		if (t < 0) return !1;
	} else {
		let n = t / e;
		if (e < 0 ? a = Math.max(a, n) : o = Math.min(o, n), a > o) return !1;
	}
	return !0;
}
// src/core/labels.ts
function Lt(e, t) {
	let n = Math.min(e.x + e.w, t.x + t.w) - Math.max(e.x, t.x), r = Math.min(e.y + e.h, t.y + t.h) - Math.max(e.y, t.y);
	return n > 0 && r > 0 ? n * r : 0;
}
function Rt(e, t) {
	let n = 0;
	for (let r = 1; r < e.length; r++) {
		let i = e[r - 1], a = e[r], o = Math.hypot(a[0] - i[0], a[1] - i[1]);
		if (n + o >= t || r === e.length - 1) {
			let e = o ? Math.min(1, Math.max(0, (t - n) / o)) : 0;
			return {
				p: [i[0] + (a[0] - i[0]) * e, i[1] + (a[1] - i[1]) * e],
				dir: [(a[0] - i[0]) / (o || 1), (a[1] - i[1]) / (o || 1)]
			};
		}
		n += o;
	}
	return {
		p: e[0],
		dir: [1, 0]
	};
}
function zt(e) {
	let t = 0;
	for (let n = 1; n < e.length; n++) t += Math.hypot(e[n][0] - e[n - 1][0], e[n][1] - e[n - 1][1]);
	return t;
}
function Bt(e, t = 24) {
	return e.split("\n").map((e) => {
		let n = [], r = "";
		for (let i of e.split(" ")) (r + " " + i).trim().length > t && r ? (n.push(r), r = i) : r = (r + " " + i).trim();
		return r && n.push(r), n.join("\n");
	}).join("\n");
}
function Vt(e, t, n) {
	let r = e.edges[t], i = r.points, a = e.fontPx * .82, o = U(n, a, e.family, e.weight), s = zt(i), { dir: c } = Rt(i, s / 2), l = Math.abs(c[0]) >= Math.abs(c[1]), u = -c[1], d = c[0];
	(Math.abs(r.bend) > 10 ? r.bend < 0 : l ? d > 0 : u < 0) && (u = -u, d = -d);
	let f = [];
	return [
		.5,
		.36,
		.64,
		.25,
		.75
	].forEach((e, t) => {
		for (let [n, r] of [
			[1, 0],
			[-1, 0],
			[1, 12],
			[-1, 12]
		]) {
			let a = Rt(i, s * e), c = -a.dir[1], l = a.dir[0];
			c * u + l * d < 0 && (c = -c, l = -l);
			let p = c * n, m = l * n, h = (Math.abs(m) >= Math.abs(p) ? o.h / 2 + 5 : o.w / 2 + 8) + r, g = a.p[0] + p * h, _ = a.p[1] + m * h;
			f.push({
				box: {
					x: g - o.w / 2,
					y: _ - o.h / 2,
					w: o.w,
					h: o.h
				},
				base: t * 6 + (n === 1 ? 0 : 3) + r / 3
			});
		}
	}), {
		key: `edge:${t}`,
		text: n,
		px: a,
		candidates: f,
		ownEdge: t,
		note: !1
	};
}
function Ht(e, t, n, r) {
	let i = e.fontPx * .86, a = Bt(n), o = U(a, i, e.family, e.weight), s = r;
	return {
		key: t,
		text: a,
		px: i,
		candidates: [
			[s.x + s.w + 34, s.y - o.h * .6],
			[s.x + s.w * .55, s.y - o.h - 34],
			[s.x + s.w / 2 - o.w / 2, s.y + s.h + 34],
			[s.x + s.w + 34, s.y + s.h * .6],
			[s.x + s.w / 2 - o.w / 2, s.y - o.h - 34],
			[s.x - 34 - o.w, s.y - o.h * .4],
			[s.x - o.w * .6, s.y + s.h + 34],
			[s.x - 34 - o.w, s.y + s.h * .5],
			[s.x + s.w + 68, s.y + s.h / 2 - o.h / 2],
			[s.x + s.w / 2 - o.w / 2, s.y + s.h + 68],
			[s.x + s.w * .55, s.y - o.h - 68],
			[s.x + s.w / 2 - o.w / 2, s.y - o.h - 68]
		].map(([e, t], n) => ({
			box: {
				x: e,
				y: t,
				w: o.w,
				h: o.h
			},
			base: n * 30
		})),
		note: !0
	};
}
function Ut(e, t) {
	let n = [...e.nodes.values()].map((e) => pt(e, 4));
	for (let t of e.groups) n.push(t.tab);
	e.titleBox && n.push(e.titleBox), t.annotations.forEach((t) => {
		if (t.kind !== "circle") return;
		let r = vt(e, t);
		r && n.push(pt(r, 18));
	});
	let r = [];
	for (let t of e.edges) {
		let e = zt(t.points);
		for (let n = 0; n < e; n += 10) r.push({
			p: Rt(t.points, n).p,
			edge: t.index
		});
	}
	for (let t of e.groups) {
		let { x: e, y: n, w: i, h: a } = t.box, o = [
			[e, n],
			[e + i, n],
			[e + i, n + a],
			[e, n + a],
			[e, n]
		], s = zt(o);
		for (let e = 0; e < s; e += 10) r.push({
			p: Rt(o, e).p,
			edge: -1
		});
	}
	let i = /* @__PURE__ */ new Map(), a = (t, a, o) => {
		let s = t.note ? 6 : 3, c = {
			x: a.box.x - s,
			y: a.box.y - s,
			w: a.box.w + s * 2,
			h: a.box.h + s * 2
		}, l = a.base;
		for (let e of n) l += Lt(c, e) * 4;
		for (let [e, t] of i) e !== o && (l += Lt(c, t) * 6);
		for (let { p: e, edge: n } of r) e[0] > c.x && e[0] < c.x + c.w && e[1] > c.y && e[1] < c.y + c.h && (l += n === t.ownEdge ? 40 : t.note ? 400 : 120);
		(c.x < 4 || c.y < 4) && (l += 500);
		let u = e.titleBox;
		return u && c.y < u.y + u.h && c.x < u.x + u.w && c.x + c.w > u.x && (l += 2e3), l;
	}, o = (e, t) => {
		let n = e.candidates[0], r = Infinity;
		for (let i of e.candidates) {
			let o = a(e, i, t);
			o < r && (r = o, n = i);
		}
		return n;
	}, s = (t) => {
		let n = (e) => e.candidates.filter((t) => a(e, t) - t.base < 1).length, r = [...t].sort((e, t) => n(e) - n(t));
		for (let e of r) i.set(e.key, o(e).box);
		for (let e of r) i.set(e.key, o(e, e.key).box);
		for (let n of t) e.labels.set(n.key, {
			key: n.key,
			text: n.text,
			px: n.px,
			box: i.get(n.key)
		});
	};
	s(e.edges.filter((e) => e.def.label).map((t) => Vt(e, t.index, t.def.label)));
	let c = [];
	t.annotations.forEach((t, n) => {
		if (t.kind !== "note" || !t.text) return;
		let r = vt(e, t);
		r && c.push(Ht(e, `note:${n}`, t.text, pt(r, 4)));
	}), s(c);
}
// \0@oxc-project+runtime@0.156.0/helpers/esm/typeof.js
function Wt(e) {
	"@babel/helpers - typeof";
	return Wt = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
		return typeof e;
	} : function(e) {
		return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
	}, Wt(e);
}
var Gt = m((() => {}));
// \0@oxc-project+runtime@0.156.0/helpers/esm/toPrimitive.js
function Kt(e, t) {
	if (Wt(e) != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (Wt(r) != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var qt = m((() => {
	Gt();
}));
// \0@oxc-project+runtime@0.156.0/helpers/esm/toPropertyKey.js
function Jt(e) {
	var t = Kt(e, "string");
	return Wt(t) == "symbol" ? t : t + "";
}
var Yt = m((() => {
	Gt(), qt();
}));
// \0@oxc-project+runtime@0.156.0/helpers/esm/defineProperty.js
function X(e, t, n) {
	return (t = Jt(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
var Xt = m((() => {
	Yt();
})), Zt = /* @__PURE__ */ h(((e, t) => {
	Xt();
	var n = "\0", r = "\0", i = "", a = class {
		constructor(e) {
			X(this, "_isDirected", !0), X(this, "_isMultigraph", !1), X(this, "_isCompound", !1), X(this, "_label", void 0), X(this, "_defaultNodeLabelFn", () => void 0), X(this, "_defaultEdgeLabelFn", () => void 0), X(this, "_nodes", {}), X(this, "_in", {}), X(this, "_preds", {}), X(this, "_out", {}), X(this, "_sucs", {}), X(this, "_edgeObjs", {}), X(this, "_edgeLabels", {}), X(this, "_nodeCount", 0), X(this, "_edgeCount", 0), X(this, "_parent", void 0), X(this, "_children", void 0), e && (this._isDirected = !Object.hasOwn(e, "directed") || e.directed, this._isMultigraph = Object.hasOwn(e, "multigraph") ? e.multigraph : !1, this._isCompound = Object.hasOwn(e, "compound") ? e.compound : !1), this._isCompound && (this._parent = {}, this._children = {}, this._children[r] = {});
		}
		isDirected() {
			return this._isDirected;
		}
		isMultigraph() {
			return this._isMultigraph;
		}
		isCompound() {
			return this._isCompound;
		}
		setGraph(e) {
			return this._label = e, this;
		}
		graph() {
			return this._label;
		}
		setDefaultNodeLabel(e) {
			return this._defaultNodeLabelFn = e, typeof e != "function" && (this._defaultNodeLabelFn = () => e), this;
		}
		nodeCount() {
			return this._nodeCount;
		}
		nodes() {
			return Object.keys(this._nodes);
		}
		sources() {
			var e = this;
			return this.nodes().filter((t) => Object.keys(e._in[t]).length === 0);
		}
		sinks() {
			var e = this;
			return this.nodes().filter((t) => Object.keys(e._out[t]).length === 0);
		}
		setNodes(e, t) {
			var n = arguments, r = this;
			return e.forEach(function(e) {
				n.length > 1 ? r.setNode(e, t) : r.setNode(e);
			}), this;
		}
		setNode(e, t) {
			return Object.hasOwn(this._nodes, e) ? (arguments.length > 1 && (this._nodes[e] = t), this) : (this._nodes[e] = arguments.length > 1 ? t : this._defaultNodeLabelFn(e), this._isCompound && (this._parent[e] = r, this._children[e] = {}, this._children[r][e] = !0), this._in[e] = {}, this._preds[e] = {}, this._out[e] = {}, this._sucs[e] = {}, ++this._nodeCount, this);
		}
		node(e) {
			return this._nodes[e];
		}
		hasNode(e) {
			return Object.hasOwn(this._nodes, e);
		}
		removeNode(e) {
			var t = this;
			if (Object.hasOwn(this._nodes, e)) {
				var n = (e) => t.removeEdge(t._edgeObjs[e]);
				delete this._nodes[e], this._isCompound && (this._removeFromParentsChildList(e), delete this._parent[e], this.children(e).forEach(function(e) {
					t.setParent(e);
				}), delete this._children[e]), Object.keys(this._in[e]).forEach(n), delete this._in[e], delete this._preds[e], Object.keys(this._out[e]).forEach(n), delete this._out[e], delete this._sucs[e], --this._nodeCount;
			}
			return this;
		}
		setParent(e, t) {
			if (!this._isCompound) throw Error("Cannot set parent in a non-compound graph");
			if (t === void 0) t = r;
			else {
				t += "";
				for (var n = t; n !== void 0; n = this.parent(n)) if (n === e) throw Error("Setting " + t + " as parent of " + e + " would create a cycle");
				this.setNode(t);
			}
			return this.setNode(e), this._removeFromParentsChildList(e), this._parent[e] = t, this._children[t][e] = !0, this;
		}
		_removeFromParentsChildList(e) {
			delete this._children[this._parent[e]][e];
		}
		parent(e) {
			if (this._isCompound) {
				var t = this._parent[e];
				if (t !== r) return t;
			}
		}
		children(e = r) {
			if (this._isCompound) {
				var t = this._children[e];
				if (t) return Object.keys(t);
			} else if (e === r) return this.nodes();
			else if (this.hasNode(e)) return [];
		}
		predecessors(e) {
			var t = this._preds[e];
			if (t) return Object.keys(t);
		}
		successors(e) {
			var t = this._sucs[e];
			if (t) return Object.keys(t);
		}
		neighbors(e) {
			var t = this.predecessors(e);
			if (t) {
				let r = new Set(t);
				for (var n of this.successors(e)) r.add(n);
				return Array.from(r.values());
			}
		}
		isLeaf(e) {
			return (this.isDirected() ? this.successors(e) : this.neighbors(e)).length === 0;
		}
		filterNodes(e) {
			var t = new this.constructor({
				directed: this._isDirected,
				multigraph: this._isMultigraph,
				compound: this._isCompound
			});
			t.setGraph(this.graph());
			var n = this;
			Object.entries(this._nodes).forEach(function([n, r]) {
				e(n) && t.setNode(n, r);
			}), Object.values(this._edgeObjs).forEach(function(e) {
				t.hasNode(e.v) && t.hasNode(e.w) && t.setEdge(e, n.edge(e));
			});
			var r = {};
			function i(e) {
				var a = n.parent(e);
				return a === void 0 || t.hasNode(a) ? (r[e] = a, a) : a in r ? r[a] : i(a);
			}
			return this._isCompound && t.nodes().forEach((e) => t.setParent(e, i(e))), t;
		}
		setDefaultEdgeLabel(e) {
			return this._defaultEdgeLabelFn = e, typeof e != "function" && (this._defaultEdgeLabelFn = () => e), this;
		}
		edgeCount() {
			return this._edgeCount;
		}
		edges() {
			return Object.values(this._edgeObjs);
		}
		setPath(e, t) {
			var n = this, r = arguments;
			return e.reduce(function(e, i) {
				return r.length > 1 ? n.setEdge(e, i, t) : n.setEdge(e, i), i;
			}), this;
		}
		setEdge() {
			var e, t, n, r, i = !1, a = arguments[0];
			typeof a == "object" && a && "v" in a ? (e = a.v, t = a.w, n = a.name, arguments.length === 2 && (r = arguments[1], i = !0)) : (e = a, t = arguments[1], n = arguments[3], arguments.length > 2 && (r = arguments[2], i = !0)), e = "" + e, t = "" + t, n !== void 0 && (n = "" + n);
			var s = c(this._isDirected, e, t, n);
			if (Object.hasOwn(this._edgeLabels, s)) return i && (this._edgeLabels[s] = r), this;
			if (n !== void 0 && !this._isMultigraph) throw Error("Cannot set a named edge when isMultigraph = false");
			this.setNode(e), this.setNode(t), this._edgeLabels[s] = i ? r : this._defaultEdgeLabelFn(e, t, n);
			var u = l(this._isDirected, e, t, n);
			return e = u.v, t = u.w, Object.freeze(u), this._edgeObjs[s] = u, o(this._preds[t], e), o(this._sucs[e], t), this._in[t][s] = u, this._out[e][s] = u, this._edgeCount++, this;
		}
		edge(e, t, n) {
			var r = arguments.length === 1 ? u(this._isDirected, arguments[0]) : c(this._isDirected, e, t, n);
			return this._edgeLabels[r];
		}
		edgeAsObj() {
			let e = this.edge(...arguments);
			return typeof e == "object" ? e : { label: e };
		}
		hasEdge(e, t, n) {
			var r = arguments.length === 1 ? u(this._isDirected, arguments[0]) : c(this._isDirected, e, t, n);
			return Object.hasOwn(this._edgeLabels, r);
		}
		removeEdge(e, t, n) {
			var r = arguments.length === 1 ? u(this._isDirected, arguments[0]) : c(this._isDirected, e, t, n), i = this._edgeObjs[r];
			return i && (e = i.v, t = i.w, delete this._edgeLabels[r], delete this._edgeObjs[r], s(this._preds[t], e), s(this._sucs[e], t), delete this._in[t][r], delete this._out[e][r], this._edgeCount--), this;
		}
		inEdges(e, t) {
			var n = this._in[e];
			if (n) {
				var r = Object.values(n);
				return t ? r.filter((e) => e.v === t) : r;
			}
		}
		outEdges(e, t) {
			var n = this._out[e];
			if (n) {
				var r = Object.values(n);
				return t ? r.filter((e) => e.w === t) : r;
			}
		}
		nodeEdges(e, t) {
			var n = this.inEdges(e, t);
			if (n) return n.concat(this.outEdges(e, t));
		}
	};
	function o(e, t) {
		e[t] ? e[t]++ : e[t] = 1;
	}
	function s(e, t) {
		--e[t] || delete e[t];
	}
	function c(e, t, r, a) {
		var o = "" + t, s = "" + r;
		if (!e && o > s) {
			var c = o;
			o = s, s = c;
		}
		return o + i + s + i + (a === void 0 ? n : a);
	}
	function l(e, t, n, r) {
		var i = "" + t, a = "" + n;
		if (!e && i > a) {
			var o = i;
			i = a, a = o;
		}
		var s = {
			v: i,
			w: a
		};
		return r && (s.name = r), s;
	}
	function u(e, t) {
		return c(e, t.v, t.w, t.name);
	}
	t.exports = a;
})), Qt = /* @__PURE__ */ h(((e, t) => {
	t.exports = "2.2.4";
})), $t = /* @__PURE__ */ h(((e, t) => {
	t.exports = {
		Graph: Zt(),
		version: Qt()
	};
})), en = /* @__PURE__ */ h(((e, t) => {
	var n = Zt();
	t.exports = {
		write: r,
		read: o
	};
	function r(e) {
		var t = {
			options: {
				directed: e.isDirected(),
				multigraph: e.isMultigraph(),
				compound: e.isCompound()
			},
			nodes: i(e),
			edges: a(e)
		};
		return e.graph() !== void 0 && (t.value = structuredClone(e.graph())), t;
	}
	function i(e) {
		return e.nodes().map(function(t) {
			var n = e.node(t), r = e.parent(t), i = { v: t };
			return n !== void 0 && (i.value = n), r !== void 0 && (i.parent = r), i;
		});
	}
	function a(e) {
		return e.edges().map(function(t) {
			var n = e.edge(t), r = {
				v: t.v,
				w: t.w
			};
			return t.name !== void 0 && (r.name = t.name), n !== void 0 && (r.value = n), r;
		});
	}
	function o(e) {
		var t = new n(e.options).setGraph(e.value);
		return e.nodes.forEach(function(e) {
			t.setNode(e.v, e.value), e.parent && t.setParent(e.v, e.parent);
		}), e.edges.forEach(function(e) {
			t.setEdge({
				v: e.v,
				w: e.w,
				name: e.name
			}, e.value);
		}), t;
	}
})), tn = /* @__PURE__ */ h(((e, t) => {
	t.exports = n;
	function n(e) {
		var t = {}, n = [], r;
		function i(n) {
			Object.hasOwn(t, n) || (t[n] = !0, r.push(n), e.successors(n).forEach(i), e.predecessors(n).forEach(i));
		}
		return e.nodes().forEach(function(e) {
			r = [], i(e), r.length && n.push(r);
		}), n;
	}
})), nn = /* @__PURE__ */ h(((e, t) => {
	Xt(), t.exports = class {
		constructor() {
			X(this, "_arr", []), X(this, "_keyIndices", {});
		}
		size() {
			return this._arr.length;
		}
		keys() {
			return this._arr.map(function(e) {
				return e.key;
			});
		}
		has(e) {
			return Object.hasOwn(this._keyIndices, e);
		}
		priority(e) {
			var t = this._keyIndices[e];
			if (t !== void 0) return this._arr[t].priority;
		}
		min() {
			if (this.size() === 0) throw Error("Queue underflow");
			return this._arr[0].key;
		}
		add(e, t) {
			var n = this._keyIndices;
			if (e = String(e), !Object.hasOwn(n, e)) {
				var r = this._arr, i = r.length;
				return n[e] = i, r.push({
					key: e,
					priority: t
				}), this._decrease(i), !0;
			}
			return !1;
		}
		removeMin() {
			this._swap(0, this._arr.length - 1);
			var e = this._arr.pop();
			return delete this._keyIndices[e.key], this._heapify(0), e.key;
		}
		decrease(e, t) {
			var n = this._keyIndices[e];
			if (t > this._arr[n].priority) throw Error("New priority is greater than current priority. Key: " + e + " Old: " + this._arr[n].priority + " New: " + t);
			this._arr[n].priority = t, this._decrease(n);
		}
		_heapify(e) {
			var t = this._arr, n = 2 * e, r = n + 1, i = e;
			n < t.length && (i = t[n].priority < t[i].priority ? n : i, r < t.length && (i = t[r].priority < t[i].priority ? r : i), i !== e && (this._swap(e, i), this._heapify(i)));
		}
		_decrease(e) {
			for (var t = this._arr, n = t[e].priority, r; e !== 0 && (r = e >> 1, !(t[r].priority < n));) this._swap(e, r), e = r;
		}
		_swap(e, t) {
			var n = this._arr, r = this._keyIndices, i = n[e], a = n[t];
			n[e] = a, n[t] = i, r[a.key] = e, r[i.key] = t;
		}
	};
})), rn = /* @__PURE__ */ h(((e, t) => {
	var n = nn();
	t.exports = i;
	var r = () => 1;
	function i(e, t, n, i) {
		return a(e, String(t), n || r, i || function(t) {
			return e.outEdges(t);
		});
	}
	function a(e, t, r, i) {
		var a = {}, o = new n(), s, c, l = function(e) {
			var t = e.v === s ? e.w : e.v, n = a[t], i = r(e), l = c.distance + i;
			if (i < 0) throw Error("dijkstra does not allow negative edge weights. Bad edge: " + e + " Weight: " + i);
			l < n.distance && (n.distance = l, n.predecessor = s, o.decrease(t, l));
		};
		for (e.nodes().forEach(function(e) {
			var n = e === t ? 0 : Infinity;
			a[e] = { distance: n }, o.add(e, n);
		}); o.size() > 0 && (s = o.removeMin(), c = a[s], c.distance !== Infinity);) i(s).forEach(l);
		return a;
	}
})), an = /* @__PURE__ */ h(((e, t) => {
	var n = rn();
	t.exports = r;
	function r(e, t, r) {
		return e.nodes().reduce(function(i, a) {
			return i[a] = n(e, a, t, r), i;
		}, {});
	}
})), on = /* @__PURE__ */ h(((e, t) => {
	t.exports = n;
	function n(e) {
		var t = 0, n = [], r = {}, i = [];
		function a(o) {
			var s = r[o] = {
				onStack: !0,
				lowlink: t,
				index: t++
			};
			if (n.push(o), e.successors(o).forEach(function(e) {
				Object.hasOwn(r, e) ? r[e].onStack && (s.lowlink = Math.min(s.lowlink, r[e].index)) : (a(e), s.lowlink = Math.min(s.lowlink, r[e].lowlink));
			}), s.lowlink === s.index) {
				var c = [], l;
				do
					l = n.pop(), r[l].onStack = !1, c.push(l);
				while (o !== l);
				i.push(c);
			}
		}
		return e.nodes().forEach(function(e) {
			Object.hasOwn(r, e) || a(e);
		}), i;
	}
})), sn = /* @__PURE__ */ h(((e, t) => {
	var n = on();
	t.exports = r;
	function r(e) {
		return n(e).filter(function(t) {
			return t.length > 1 || t.length === 1 && e.hasEdge(t[0], t[0]);
		});
	}
})), cn = /* @__PURE__ */ h(((e, t) => {
	t.exports = r;
	var n = () => 1;
	function r(e, t, r) {
		return i(e, t || n, r || function(t) {
			return e.outEdges(t);
		});
	}
	function i(e, t, n) {
		var r = {}, i = e.nodes();
		return i.forEach(function(e) {
			r[e] = {}, r[e][e] = { distance: 0 }, i.forEach(function(t) {
				e !== t && (r[e][t] = { distance: Infinity });
			}), n(e).forEach(function(n) {
				var i = n.v === e ? n.w : n.v, a = t(n);
				r[e][i] = {
					distance: a,
					predecessor: e
				};
			});
		}), i.forEach(function(e) {
			var t = r[e];
			i.forEach(function(n) {
				var a = r[n];
				i.forEach(function(n) {
					var r = a[e], i = t[n], o = a[n], s = r.distance + i.distance;
					s < o.distance && (o.distance = s, o.predecessor = i.predecessor);
				});
			});
		}), r;
	}
})), ln = /* @__PURE__ */ h(((e, t) => {
	function n(e) {
		var t = {}, n = {}, i = [];
		function a(o) {
			if (Object.hasOwn(n, o)) throw new r();
			Object.hasOwn(t, o) || (n[o] = !0, t[o] = !0, e.predecessors(o).forEach(a), delete n[o], i.push(o));
		}
		if (e.sinks().forEach(a), Object.keys(t).length !== e.nodeCount()) throw new r();
		return i;
	}
	var r = class extends Error {
		constructor() {
			super(...arguments);
		}
	};
	t.exports = n, n.CycleException = r;
})), un = /* @__PURE__ */ h(((e, t) => {
	var n = ln();
	t.exports = r;
	function r(e) {
		try {
			n(e);
		} catch (e) {
			if (e instanceof n.CycleException) return !1;
			throw e;
		}
		return !0;
	}
})), dn = /* @__PURE__ */ h(((e, t) => {
	t.exports = n;
	function n(e, t, n) {
		Array.isArray(t) || (t = [t]);
		var a = e.isDirected() ? (t) => e.successors(t) : (t) => e.neighbors(t), o = n === "post" ? r : i, s = [], c = {};
		return t.forEach((t) => {
			if (!e.hasNode(t)) throw Error("Graph does not have node: " + t);
			o(t, a, c, s);
		}), s;
	}
	function r(e, t, n, r) {
		for (var i = [[e, !1]]; i.length > 0;) {
			var o = i.pop();
			o[1] ? r.push(o[0]) : Object.hasOwn(n, o[0]) || (n[o[0]] = !0, i.push([o[0], !0]), a(t(o[0]), (e) => i.push([e, !1])));
		}
	}
	function i(e, t, n, r) {
		for (var i = [e]; i.length > 0;) {
			var o = i.pop();
			Object.hasOwn(n, o) || (n[o] = !0, r.push(o), a(t(o), (e) => i.push(e)));
		}
	}
	function a(e, t) {
		for (var n = e.length; n--;) t(e[n], n, e);
		return e;
	}
})), fn = /* @__PURE__ */ h(((e, t) => {
	var n = dn();
	t.exports = r;
	function r(e, t) {
		return n(e, t, "post");
	}
})), pn = /* @__PURE__ */ h(((e, t) => {
	var n = dn();
	t.exports = r;
	function r(e, t) {
		return n(e, t, "pre");
	}
})), mn = /* @__PURE__ */ h(((e, t) => {
	var n = Zt(), r = nn();
	t.exports = i;
	function i(e, t) {
		var i = new n(), a = {}, o = new r(), s;
		function c(e) {
			var n = e.v === s ? e.w : e.v, r = o.priority(n);
			if (r !== void 0) {
				var i = t(e);
				i < r && (a[n] = s, o.decrease(n, i));
			}
		}
		if (e.nodeCount() === 0) return i;
		e.nodes().forEach(function(e) {
			o.add(e, Infinity), i.setNode(e);
		}), o.decrease(e.nodes()[0], 0);
		for (var l = !1; o.size() > 0;) {
			if (s = o.removeMin(), Object.hasOwn(a, s)) i.setEdge(s, a[s]);
			else if (l) throw Error("Input graph is not connected: " + e);
			else l = !0;
			e.nodeEdges(s).forEach(c);
		}
		return i;
	}
})), hn = /* @__PURE__ */ h(((e, t) => {
	t.exports = {
		components: tn(),
		dijkstra: rn(),
		dijkstraAll: an(),
		findCycles: sn(),
		floydWarshall: cn(),
		isAcyclic: un(),
		postorder: fn(),
		preorder: pn(),
		prim: mn(),
		tarjan: on(),
		topsort: ln()
	};
})), Z = /* @__PURE__ */ h(((e, t) => {
	var n = $t();
	t.exports = {
		Graph: n.Graph,
		json: en(),
		alg: hn(),
		version: n.version
	};
})), gn = /* @__PURE__ */ h(((e, t) => {
	var n = class {
		constructor() {
			let e = {};
			e._next = e._prev = e, this._sentinel = e;
		}
		dequeue() {
			let e = this._sentinel, t = e._prev;
			if (t !== e) return r(t), t;
		}
		enqueue(e) {
			let t = this._sentinel;
			e._prev && e._next && r(e), e._next = t._next, t._next._prev = e, t._next = e, e._prev = t;
		}
		toString() {
			let e = [], t = this._sentinel, n = t._prev;
			for (; n !== t;) e.push(JSON.stringify(n, i)), n = n._prev;
			return "[" + e.join(", ") + "]";
		}
	};
	function r(e) {
		e._prev._next = e._next, e._next._prev = e._prev, delete e._next, delete e._prev;
	}
	function i(e, t) {
		if (e !== "_next" && e !== "_prev") return t;
	}
	t.exports = n;
})), _n = /* @__PURE__ */ h(((e, t) => {
	var n = Z().Graph, r = gn();
	t.exports = a;
	var i = () => 1;
	function a(e, t) {
		if (e.nodeCount() <= 1) return [];
		let n = c(e, t || i);
		return o(n.graph, n.buckets, n.zeroIdx).flatMap((t) => e.outEdges(t.v, t.w));
	}
	function o(e, t, n) {
		let r = [], i = t[t.length - 1], a = t[0], o;
		for (; e.nodeCount();) {
			for (; o = a.dequeue();) s(e, t, n, o);
			for (; o = i.dequeue();) s(e, t, n, o);
			if (e.nodeCount()) {
				for (let i = t.length - 2; i > 0; --i) if (o = t[i].dequeue(), o) {
					r = r.concat(s(e, t, n, o, !0));
					break;
				}
			}
		}
		return r;
	}
	function s(e, t, n, r, i) {
		let a = i ? [] : void 0;
		return e.inEdges(r.v).forEach((r) => {
			let o = e.edge(r), s = e.node(r.v);
			i && a.push({
				v: r.v,
				w: r.w
			}), s.out -= o, l(t, n, s);
		}), e.outEdges(r.v).forEach((r) => {
			let i = e.edge(r), a = r.w, o = e.node(a);
			o.in -= i, l(t, n, o);
		}), e.removeNode(r.v), a;
	}
	function c(e, t) {
		let i = new n(), a = 0, o = 0;
		e.nodes().forEach((e) => {
			i.setNode(e, {
				v: e,
				in: 0,
				out: 0
			});
		}), e.edges().forEach((e) => {
			let n = i.edge(e.v, e.w) || 0, r = t(e), s = n + r;
			i.setEdge(e.v, e.w, s), o = Math.max(o, i.node(e.v).out += r), a = Math.max(a, i.node(e.w).in += r);
		});
		let s = u(o + a + 3).map(() => new r()), c = a + 1;
		return i.nodes().forEach((e) => {
			l(s, c, i.node(e));
		}), {
			graph: i,
			buckets: s,
			zeroIdx: c
		};
	}
	function l(e, t, n) {
		n.out ? n.in ? e[n.out - n.in + t].enqueue(n) : e[e.length - 1].enqueue(n) : e[0].enqueue(n);
	}
	function u(e) {
		let t = [];
		for (let n = 0; n < e; n++) t.push(n);
		return t;
	}
})), Q = /* @__PURE__ */ h(((e, t) => {
	var n = Z().Graph;
	t.exports = {
		addBorderNode: f,
		addDummyNode: r,
		applyWithChunking: h,
		asNonCompoundGraph: a,
		buildLayerMatrix: l,
		intersectRect: c,
		mapValues: w,
		maxRank: g,
		normalizeRanks: u,
		notime: y,
		partition: _,
		pick: C,
		predecessorWeights: s,
		range: S,
		removeEmptyRanks: d,
		simplify: i,
		successorWeights: o,
		time: v,
		uniqueId: x,
		zipObject: T
	};
	function r(e, t, n, r) {
		for (var i = r; e.hasNode(i);) i = x(r);
		return n.dummy = t, e.setNode(i, n), i;
	}
	function i(e) {
		let t = new n().setGraph(e.graph());
		return e.nodes().forEach((n) => t.setNode(n, e.node(n))), e.edges().forEach((n) => {
			let r = t.edge(n.v, n.w) || {
				weight: 0,
				minlen: 1
			}, i = e.edge(n);
			t.setEdge(n.v, n.w, {
				weight: r.weight + i.weight,
				minlen: Math.max(r.minlen, i.minlen)
			});
		}), t;
	}
	function a(e) {
		let t = new n({ multigraph: e.isMultigraph() }).setGraph(e.graph());
		return e.nodes().forEach((n) => {
			e.children(n).length || t.setNode(n, e.node(n));
		}), e.edges().forEach((n) => {
			t.setEdge(n, e.edge(n));
		}), t;
	}
	function o(e) {
		let t = e.nodes().map((t) => {
			let n = {};
			return e.outEdges(t).forEach((t) => {
				n[t.w] = (n[t.w] || 0) + e.edge(t).weight;
			}), n;
		});
		return T(e.nodes(), t);
	}
	function s(e) {
		let t = e.nodes().map((t) => {
			let n = {};
			return e.inEdges(t).forEach((t) => {
				n[t.v] = (n[t.v] || 0) + e.edge(t).weight;
			}), n;
		});
		return T(e.nodes(), t);
	}
	function c(e, t) {
		let n = e.x, r = e.y, i = t.x - n, a = t.y - r, o = e.width / 2, s = e.height / 2;
		if (!i && !a) throw Error("Not possible to find intersection inside of the rectangle");
		let c, l;
		return Math.abs(a) * o > Math.abs(i) * s ? (a < 0 && (s = -s), c = s * i / a, l = s) : (i < 0 && (o = -o), c = o, l = o * a / i), {
			x: n + c,
			y: r + l
		};
	}
	function l(e) {
		let t = S(g(e) + 1).map(() => []);
		return e.nodes().forEach((n) => {
			let r = e.node(n), i = r.rank;
			i !== void 0 && (t[i][r.order] = n);
		}), t;
	}
	function u(e) {
		let t = e.nodes().map((t) => {
			let n = e.node(t).rank;
			return n === void 0 ? Number.MAX_VALUE : n;
		}), n = h(Math.min, t);
		e.nodes().forEach((t) => {
			let r = e.node(t);
			Object.hasOwn(r, "rank") && (r.rank -= n);
		});
	}
	function d(e) {
		let t = e.nodes().map((t) => e.node(t).rank), n = h(Math.min, t), r = [];
		e.nodes().forEach((t) => {
			let i = e.node(t).rank - n;
			r[i] || (r[i] = []), r[i].push(t);
		});
		let i = 0, a = e.graph().nodeRankFactor;
		Array.from(r).forEach((t, n) => {
			t === void 0 && n % a !== 0 ? --i : t !== void 0 && i && t.forEach((t) => e.node(t).rank += i);
		});
	}
	function f(e, t, n, i) {
		let a = {
			width: 0,
			height: 0
		};
		return arguments.length >= 4 && (a.rank = n, a.order = i), r(e, "border", a, t);
	}
	function p(e, t = m) {
		let n = [];
		for (let r = 0; r < e.length; r += t) {
			let i = e.slice(r, r + t);
			n.push(i);
		}
		return n;
	}
	var m = 65535;
	function h(e, t) {
		if (t.length > m) {
			let n = p(t);
			return e.apply(null, n.map((t) => e.apply(null, t)));
		}
		return e.apply(null, t);
	}
	function g(e) {
		let t = e.nodes().map((t) => {
			let n = e.node(t).rank;
			return n === void 0 ? Number.MIN_VALUE : n;
		});
		return h(Math.max, t);
	}
	function _(e, t) {
		let n = {
			lhs: [],
			rhs: []
		};
		return e.forEach((e) => {
			t(e) ? n.lhs.push(e) : n.rhs.push(e);
		}), n;
	}
	function v(e, t) {
		let n = Date.now();
		try {
			return t();
		} finally {
			console.log(e + " time: " + (Date.now() - n) + "ms");
		}
	}
	function y(e, t) {
		return t();
	}
	var b = 0;
	function x(e) {
		return e + ("" + ++b);
	}
	function S(e, t, n = 1) {
		t ?? (t = e, e = 0);
		let r = (e) => e < t;
		n < 0 && (r = (e) => t < e);
		let i = [];
		for (let t = e; r(t); t += n) i.push(t);
		return i;
	}
	function C(e, t) {
		let n = {};
		for (let r of t) e[r] !== void 0 && (n[r] = e[r]);
		return n;
	}
	function w(e, t) {
		let n = t;
		return typeof t == "string" && (n = (e) => e[t]), Object.entries(e).reduce((e, [t, r]) => (e[t] = n(r, t), e), {});
	}
	function T(e, t) {
		return e.reduce((e, n, r) => (e[n] = t[r], e), {});
	}
})), vn = /* @__PURE__ */ h(((e, t) => {
	var n = _n(), r = Q().uniqueId;
	t.exports = {
		run: i,
		undo: o
	};
	function i(e) {
		(e.graph().acyclicer === "greedy" ? n(e, t(e)) : a(e)).forEach((t) => {
			let n = e.edge(t);
			e.removeEdge(t), n.forwardName = t.name, n.reversed = !0, e.setEdge(t.w, t.v, n, r("rev"));
		});
		function t(e) {
			return (t) => e.edge(t).weight;
		}
	}
	function a(e) {
		let t = [], n = {}, r = {};
		function i(a) {
			Object.hasOwn(r, a) || (r[a] = !0, n[a] = !0, e.outEdges(a).forEach((e) => {
				Object.hasOwn(n, e.w) ? t.push(e) : i(e.w);
			}), delete n[a]);
		}
		return e.nodes().forEach(i), t;
	}
	function o(e) {
		e.edges().forEach((t) => {
			let n = e.edge(t);
			if (n.reversed) {
				e.removeEdge(t);
				let r = n.forwardName;
				delete n.reversed, delete n.forwardName, e.setEdge(t.w, t.v, n, r);
			}
		});
	}
})), yn = /* @__PURE__ */ h(((e, t) => {
	var n = Q();
	t.exports = {
		run: r,
		undo: a
	};
	function r(e) {
		e.graph().dummyChains = [], e.edges().forEach((t) => i(e, t));
	}
	function i(e, t) {
		let r = t.v, i = e.node(r).rank, a = t.w, o = e.node(a).rank, s = t.name, c = e.edge(t), l = c.labelRank;
		if (o === i + 1) return;
		e.removeEdge(t);
		let u, d, f = 0;
		for (++i; i < o; ++f, ++i) c.points = [], d = {
			width: 0,
			height: 0,
			edgeLabel: c,
			edgeObj: t,
			rank: i
		}, u = n.addDummyNode(e, "edge", d, "_d"), i === l && (d.width = c.width, d.height = c.height, d.dummy = "edge-label", d.labelpos = c.labelpos), e.setEdge(r, u, { weight: c.weight }, s), f === 0 && e.graph().dummyChains.push(u), r = u;
		e.setEdge(r, a, { weight: c.weight }, s);
	}
	function a(e) {
		e.graph().dummyChains.forEach((t) => {
			let n = e.node(t), r = n.edgeLabel, i;
			for (e.setEdge(n.edgeObj, r); n.dummy;) i = e.successors(t)[0], e.removeNode(t), r.points.push({
				x: n.x,
				y: n.y
			}), n.dummy === "edge-label" && (r.x = n.x, r.y = n.y, r.width = n.width, r.height = n.height), t = i, n = e.node(t);
		});
	}
})), bn = /* @__PURE__ */ h(((e, t) => {
	var { applyWithChunking: n } = Q();
	t.exports = {
		longestPath: r,
		slack: i
	};
	function r(e) {
		var t = {};
		function r(i) {
			var a = e.node(i);
			if (Object.hasOwn(t, i)) return a.rank;
			t[i] = !0;
			let o = e.outEdges(i).map((t) => t == null ? Infinity : r(t.w) - e.edge(t).minlen);
			var s = n(Math.min, o);
			return s === Infinity && (s = 0), a.rank = s;
		}
		e.sources().forEach(r);
	}
	function i(e, t) {
		return e.node(t.w).rank - e.node(t.v).rank - e.edge(t).minlen;
	}
})), xn = /* @__PURE__ */ h(((e, t) => {
	var n = Z().Graph, r = bn().slack;
	t.exports = i;
	function i(e) {
		var t = new n({ directed: !1 }), i = e.nodes()[0], c = e.nodeCount();
		t.setNode(i, {});
		for (var l, u; a(t, e) < c;) l = o(t, e), u = t.hasNode(l.v) ? r(e, l) : -r(e, l), s(t, e, u);
		return t;
	}
	function a(e, t) {
		function n(i) {
			t.nodeEdges(i).forEach((a) => {
				var o = a.v, s = i === o ? a.w : o;
				!e.hasNode(s) && !r(t, a) && (e.setNode(s, {}), e.setEdge(i, s, {}), n(s));
			});
		}
		return e.nodes().forEach(n), e.nodeCount();
	}
	function o(e, t) {
		return t.edges().reduce((n, i) => {
			let a = Infinity;
			return e.hasNode(i.v) !== e.hasNode(i.w) && (a = r(t, i)), a < n[0] ? [a, i] : n;
		}, [Infinity, null])[1];
	}
	function s(e, t, n) {
		e.nodes().forEach((e) => t.node(e).rank += n);
	}
})), Sn = /* @__PURE__ */ h(((e, t) => {
	var n = xn(), r = bn().slack, i = bn().longestPath, a = Z().alg.preorder, o = Z().alg.postorder, s = Q().simplify;
	t.exports = c, c.initLowLimValues = f, c.initCutValues = l, c.calcCutValue = d, c.leaveEdge = m, c.enterEdge = h, c.exchangeEdges = g;
	function c(e) {
		e = s(e), i(e);
		var t = n(e);
		f(t), l(t, e);
		for (var r, a; r = m(t);) a = h(t, e, r), g(t, e, r, a);
	}
	function l(e, t) {
		var n = o(e, e.nodes());
		n = n.slice(0, n.length - 1), n.forEach((n) => u(e, t, n));
	}
	function u(e, t, n) {
		var r = e.node(n).parent;
		e.edge(n, r).cutvalue = d(e, t, n);
	}
	function d(e, t, n) {
		var r = e.node(n).parent, i = !0, a = t.edge(n, r), o = 0;
		return a || (i = !1, a = t.edge(r, n)), o = a.weight, t.nodeEdges(n).forEach((a) => {
			var s = a.v === n, c = s ? a.w : a.v;
			if (c !== r) {
				var l = s === i, u = t.edge(a).weight;
				if (o += l ? u : -u, v(e, n, c)) {
					var d = e.edge(n, c).cutvalue;
					o += l ? -d : d;
				}
			}
		}), o;
	}
	function f(e, t) {
		arguments.length < 2 && (t = e.nodes()[0]), p(e, {}, 1, t);
	}
	function p(e, t, n, r, i) {
		var a = n, o = e.node(r);
		return t[r] = !0, e.neighbors(r).forEach((i) => {
			Object.hasOwn(t, i) || (n = p(e, t, n, i, r));
		}), o.low = a, o.lim = n++, i ? o.parent = i : delete o.parent, n;
	}
	function m(e) {
		return e.edges().find((t) => e.edge(t).cutvalue < 0);
	}
	function h(e, t, n) {
		var i = n.v, a = n.w;
		t.hasEdge(i, a) || (i = n.w, a = n.v);
		var o = e.node(i), s = e.node(a), c = o, l = !1;
		return o.lim > s.lim && (c = s, l = !0), t.edges().filter((t) => l === y(e, e.node(t.v), c) && l !== y(e, e.node(t.w), c)).reduce((e, n) => r(t, n) < r(t, e) ? n : e);
	}
	function g(e, t, n, r) {
		var i = n.v, a = n.w;
		e.removeEdge(i, a), e.setEdge(r.v, r.w, {}), f(e), l(e, t), _(e, t);
	}
	function _(e, t) {
		var n = a(e, e.nodes().find((e) => !t.node(e).parent));
		n = n.slice(1), n.forEach((n) => {
			var r = e.node(n).parent, i = t.edge(n, r), a = !1;
			i || (i = t.edge(r, n), a = !0), t.node(n).rank = t.node(r).rank + (a ? i.minlen : -i.minlen);
		});
	}
	function v(e, t, n) {
		return e.hasEdge(t, n);
	}
	function y(e, t, n) {
		return n.low <= t.lim && t.lim <= n.lim;
	}
})), Cn = /* @__PURE__ */ h(((e, t) => {
	var n = bn().longestPath, r = xn(), i = Sn();
	t.exports = a;
	function a(e) {
		var t = e.graph().ranker;
		if (t instanceof Function) return t(e);
		switch (e.graph().ranker) {
			case "network-simplex":
				c(e);
				break;
			case "tight-tree":
				s(e);
				break;
			case "longest-path":
				o(e);
				break;
			case "none": break;
			default: c(e);
		}
	}
	var o = n;
	function s(e) {
		n(e), r(e);
	}
	function c(e) {
		i(e);
	}
})), wn = /* @__PURE__ */ h(((e, t) => {
	t.exports = n;
	function n(e) {
		let t = i(e);
		e.graph().dummyChains.forEach((n) => {
			let i = e.node(n), a = i.edgeObj, o = r(e, t, a.v, a.w), s = o.path, c = o.lca, l = 0, u = s[l], d = !0;
			for (; n !== a.w;) {
				if (i = e.node(n), d) {
					for (; (u = s[l]) !== c && e.node(u).maxRank < i.rank;) l++;
					u === c && (d = !1);
				}
				if (!d) {
					for (; l < s.length - 1 && e.node(u = s[l + 1]).minRank <= i.rank;) l++;
					u = s[l];
				}
				e.setParent(n, u), n = e.successors(n)[0];
			}
		});
	}
	function r(e, t, n, r) {
		let i = [], a = [], o = Math.min(t[n].low, t[r].low), s = Math.max(t[n].lim, t[r].lim), c, l;
		c = n;
		do
			c = e.parent(c), i.push(c);
		while (c && (t[c].low > o || s > t[c].lim));
		for (l = c, c = r; (c = e.parent(c)) !== l;) a.push(c);
		return {
			path: i.concat(a.reverse()),
			lca: l
		};
	}
	function i(e) {
		let t = {}, n = 0;
		function r(i) {
			let a = n;
			e.children(i).forEach(r), t[i] = {
				low: a,
				lim: n++
			};
		}
		return e.children().forEach(r), t;
	}
})), Tn = /* @__PURE__ */ h(((e, t) => {
	var n = Q();
	t.exports = {
		run: r,
		cleanup: s
	};
	function r(e) {
		let t = n.addDummyNode(e, "root", {}, "_root"), r = a(e), s = Object.values(r), c = n.applyWithChunking(Math.max, s) - 1, l = 2 * c + 1;
		e.graph().nestingRoot = t, e.edges().forEach((t) => e.edge(t).minlen *= l);
		let u = o(e) + 1;
		e.children().forEach((n) => i(e, t, l, u, c, r, n)), e.graph().nodeRankFactor = l;
	}
	function i(e, t, r, a, o, s, c) {
		let l = e.children(c);
		if (!l.length) {
			c !== t && e.setEdge(t, c, {
				weight: 0,
				minlen: r
			});
			return;
		}
		let u = n.addBorderNode(e, "_bt"), d = n.addBorderNode(e, "_bb"), f = e.node(c);
		e.setParent(u, c), f.borderTop = u, e.setParent(d, c), f.borderBottom = d, l.forEach((n) => {
			i(e, t, r, a, o, s, n);
			let l = e.node(n), f = l.borderTop ? l.borderTop : n, p = l.borderBottom ? l.borderBottom : n, m = l.borderTop ? a : 2 * a, h = f === p ? o - s[c] + 1 : 1;
			e.setEdge(u, f, {
				weight: m,
				minlen: h,
				nestingEdge: !0
			}), e.setEdge(p, d, {
				weight: m,
				minlen: h,
				nestingEdge: !0
			});
		}), e.parent(c) || e.setEdge(t, u, {
			weight: 0,
			minlen: o + s[c]
		});
	}
	function a(e) {
		var t = {};
		function n(r, i) {
			var a = e.children(r);
			a && a.length && a.forEach((e) => n(e, i + 1)), t[r] = i;
		}
		return e.children().forEach((e) => n(e, 1)), t;
	}
	function o(e) {
		return e.edges().reduce((t, n) => t + e.edge(n).weight, 0);
	}
	function s(e) {
		var t = e.graph();
		e.removeNode(t.nestingRoot), delete t.nestingRoot, e.edges().forEach((t) => {
			e.edge(t).nestingEdge && e.removeEdge(t);
		});
	}
})), En = /* @__PURE__ */ h(((e, t) => {
	var n = Q();
	t.exports = r;
	function r(e) {
		function t(n) {
			let r = e.children(n), a = e.node(n);
			if (r.length && r.forEach(t), Object.hasOwn(a, "minRank")) {
				a.borderLeft = [], a.borderRight = [];
				for (let t = a.minRank, r = a.maxRank + 1; t < r; ++t) i(e, "borderLeft", "_bl", n, a, t), i(e, "borderRight", "_br", n, a, t);
			}
		}
		e.children().forEach(t);
	}
	function i(e, t, r, i, a, o) {
		let s = {
			width: 0,
			height: 0,
			rank: o,
			borderType: t
		}, c = a[t][o - 1], l = n.addDummyNode(e, "border", s, r);
		a[t][o] = l, e.setParent(l, i), c && e.setEdge(c, l, { weight: 1 });
	}
})), Dn = /* @__PURE__ */ h(((e, t) => {
	t.exports = {
		adjust: n,
		undo: r
	};
	function n(e) {
		let t = e.graph().rankdir.toLowerCase();
		(t === "lr" || t === "rl") && i(e);
	}
	function r(e) {
		let t = e.graph().rankdir.toLowerCase();
		(t === "bt" || t === "rl") && o(e), (t === "lr" || t === "rl") && (c(e), i(e));
	}
	function i(e) {
		e.nodes().forEach((t) => a(e.node(t))), e.edges().forEach((t) => a(e.edge(t)));
	}
	function a(e) {
		let t = e.width;
		e.width = e.height, e.height = t;
	}
	function o(e) {
		e.nodes().forEach((t) => s(e.node(t))), e.edges().forEach((t) => {
			let n = e.edge(t);
			n.points.forEach(s), Object.hasOwn(n, "y") && s(n);
		});
	}
	function s(e) {
		e.y = -e.y;
	}
	function c(e) {
		e.nodes().forEach((t) => l(e.node(t))), e.edges().forEach((t) => {
			let n = e.edge(t);
			n.points.forEach(l), Object.hasOwn(n, "x") && l(n);
		});
	}
	function l(e) {
		let t = e.x;
		e.x = e.y, e.y = t;
	}
})), On = /* @__PURE__ */ h(((e, t) => {
	var n = Q();
	t.exports = r;
	function r(e) {
		let t = {}, r = e.nodes().filter((t) => !e.children(t).length), i = r.map((t) => e.node(t).rank), a = n.applyWithChunking(Math.max, i), o = n.range(a + 1).map(() => []);
		function s(n) {
			if (t[n]) return;
			t[n] = !0;
			let r = e.node(n);
			o[r.rank].push(n), e.successors(n).forEach(s);
		}
		return r.sort((t, n) => e.node(t).rank - e.node(n).rank).forEach(s), o;
	}
})), kn = /* @__PURE__ */ h(((e, t) => {
	var n = Q().zipObject;
	t.exports = r;
	function r(e, t) {
		let n = 0;
		for (let r = 1; r < t.length; ++r) n += i(e, t[r - 1], t[r]);
		return n;
	}
	function i(e, t, r) {
		let i = n(r, r.map((e, t) => t)), a = t.flatMap((t) => e.outEdges(t).map((t) => ({
			pos: i[t.w],
			weight: e.edge(t).weight
		})).sort((e, t) => e.pos - t.pos)), o = 1;
		for (; o < r.length;) o <<= 1;
		let s = 2 * o - 1;
		--o;
		let c = Array(s).fill(0), l = 0;
		return a.forEach((e) => {
			let t = e.pos + o;
			c[t] += e.weight;
			let n = 0;
			for (; t > 0;) t % 2 && (n += c[t + 1]), t = t - 1 >> 1, c[t] += e.weight;
			l += e.weight * n;
		}), l;
	}
})), An = /* @__PURE__ */ h(((e, t) => {
	t.exports = n;
	function n(e, t = []) {
		return t.map((t) => {
			let n = e.inEdges(t);
			if (n.length) {
				let r = n.reduce((t, n) => {
					let r = e.edge(n), i = e.node(n.v);
					return {
						sum: t.sum + r.weight * i.order,
						weight: t.weight + r.weight
					};
				}, {
					sum: 0,
					weight: 0
				});
				return {
					v: t,
					barycenter: r.sum / r.weight,
					weight: r.weight
				};
			}
			return { v: t };
		});
	}
})), jn = /* @__PURE__ */ h(((e, t) => {
	var n = Q();
	t.exports = r;
	function r(e, t) {
		let n = {};
		return e.forEach((e, t) => {
			let r = n[e.v] = {
				indegree: 0,
				in: [],
				out: [],
				vs: [e.v],
				i: t
			};
			e.barycenter !== void 0 && (r.barycenter = e.barycenter, r.weight = e.weight);
		}), t.edges().forEach((e) => {
			let t = n[e.v], r = n[e.w];
			t !== void 0 && r !== void 0 && (r.indegree++, t.out.push(n[e.w]));
		}), i(Object.values(n).filter((e) => !e.indegree));
	}
	function i(e) {
		let t = [];
		function r(e) {
			return (t) => {
				t.merged || (t.barycenter === void 0 || e.barycenter === void 0 || t.barycenter >= e.barycenter) && a(e, t);
			};
		}
		function i(t) {
			return (n) => {
				n.in.push(t), --n.indegree === 0 && e.push(n);
			};
		}
		for (; e.length;) {
			let n = e.pop();
			t.push(n), n.in.reverse().forEach(r(n)), n.out.forEach(i(n));
		}
		return t.filter((e) => !e.merged).map((e) => n.pick(e, [
			"vs",
			"i",
			"barycenter",
			"weight"
		]));
	}
	function a(e, t) {
		let n = 0, r = 0;
		e.weight && (n += e.barycenter * e.weight, r += e.weight), t.weight && (n += t.barycenter * t.weight, r += t.weight), e.vs = t.vs.concat(e.vs), e.barycenter = n / r, e.weight = r, e.i = Math.min(t.i, e.i), t.merged = !0;
	}
})), Mn = /* @__PURE__ */ h(((e, t) => {
	var n = Q();
	t.exports = r;
	function r(e, t) {
		let r = n.partition(e, (e) => Object.hasOwn(e, "barycenter")), o = r.lhs, s = r.rhs.sort((e, t) => t.i - e.i), c = [], l = 0, u = 0, d = 0;
		o.sort(a(!!t)), d = i(c, s, d), o.forEach((e) => {
			d += e.vs.length, c.push(e.vs), l += e.barycenter * e.weight, u += e.weight, d = i(c, s, d);
		});
		let f = { vs: c.flat(!0) };
		return u && (f.barycenter = l / u, f.weight = u), f;
	}
	function i(e, t, n) {
		let r;
		for (; t.length && (r = t[t.length - 1]).i <= n;) t.pop(), e.push(r.vs), n++;
		return n;
	}
	function a(e) {
		return (t, n) => t.barycenter < n.barycenter ? -1 : t.barycenter > n.barycenter ? 1 : e ? n.i - t.i : t.i - n.i;
	}
})), Nn = /* @__PURE__ */ h(((e, t) => {
	var n = An(), r = jn(), i = Mn();
	t.exports = a;
	function a(e, t, c, l) {
		let u = e.children(t), d = e.node(t), f = d ? d.borderLeft : void 0, p = d ? d.borderRight : void 0, m = {};
		f && (u = u.filter((e) => e !== f && e !== p));
		let h = n(e, u);
		h.forEach((t) => {
			if (e.children(t.v).length) {
				let n = a(e, t.v, c, l);
				m[t.v] = n, Object.hasOwn(n, "barycenter") && s(t, n);
			}
		});
		let g = r(h, c);
		o(g, m);
		let _ = i(g, l);
		if (f && (_.vs = [
			f,
			_.vs,
			p
		].flat(!0), e.predecessors(f).length)) {
			let t = e.node(e.predecessors(f)[0]), n = e.node(e.predecessors(p)[0]);
			Object.hasOwn(_, "barycenter") || (_.barycenter = 0, _.weight = 0), _.barycenter = (_.barycenter * _.weight + t.order + n.order) / (_.weight + 2), _.weight += 2;
		}
		return _;
	}
	function o(e, t) {
		e.forEach((e) => {
			e.vs = e.vs.flatMap((e) => t[e] ? t[e].vs : e);
		});
	}
	function s(e, t) {
		e.barycenter === void 0 ? (e.barycenter = t.barycenter, e.weight = t.weight) : (e.barycenter = (e.barycenter * e.weight + t.barycenter * t.weight) / (e.weight + t.weight), e.weight += t.weight);
	}
})), Pn = /* @__PURE__ */ h(((e, t) => {
	var n = Z().Graph, r = Q();
	t.exports = i;
	function i(e, t, r, i) {
		i || (i = e.nodes());
		let o = a(e), s = new n({ compound: !0 }).setGraph({ root: o }).setDefaultNodeLabel((t) => e.node(t));
		return i.forEach((n) => {
			let i = e.node(n), a = e.parent(n);
			(i.rank === t || i.minRank <= t && t <= i.maxRank) && (s.setNode(n), s.setParent(n, a || o), e[r](n).forEach((t) => {
				let r = t.v === n ? t.w : t.v, i = s.edge(r, n), a = i === void 0 ? 0 : i.weight;
				s.setEdge(r, n, { weight: e.edge(t).weight + a });
			}), Object.hasOwn(i, "minRank") && s.setNode(n, {
				borderLeft: i.borderLeft[t],
				borderRight: i.borderRight[t]
			}));
		}), s;
	}
	function a(e) {
		for (var t; e.hasNode(t = r.uniqueId("_root")););
		return t;
	}
})), Fn = /* @__PURE__ */ h(((e, t) => {
	t.exports = n;
	function n(e, t, n) {
		let r = {}, i;
		n.forEach((n) => {
			let a = e.parent(n), o, s;
			for (; a;) {
				if (o = e.parent(a), o ? (s = r[o], r[o] = a) : (s = i, i = a), s && s !== a) {
					t.setEdge(s, a);
					return;
				}
				a = o;
			}
		});
	}
})), In = /* @__PURE__ */ h(((e, t) => {
	var n = On(), r = kn(), i = Nn(), a = Pn(), o = Fn(), s = Z().Graph, c = Q();
	t.exports = l;
	function l(e, t) {
		if (t && typeof t.customOrder == "function") {
			t.customOrder(e, l);
			return;
		}
		let i = c.maxRank(e), a = u(e, c.range(1, i + 1), "inEdges"), o = u(e, c.range(i - 1, -1, -1), "outEdges"), s = n(e);
		if (f(e, s), t && t.disableOptimalOrderHeuristic) return;
		let p = Infinity, m;
		for (let t = 0, n = 0; n < 4; ++t, ++n) {
			d(t % 2 ? a : o, t % 4 >= 2), s = c.buildLayerMatrix(e);
			let i = r(e, s);
			i < p && (n = 0, m = Object.assign({}, s), p = i);
		}
		f(e, m);
	}
	function u(e, t, n) {
		let r = /* @__PURE__ */ new Map(), i = (e, t) => {
			r.has(e) || r.set(e, []), r.get(e).push(t);
		};
		for (let t of e.nodes()) {
			let n = e.node(t);
			if (typeof n.rank == "number" && i(n.rank, t), typeof n.minRank == "number" && typeof n.maxRank == "number") for (let e = n.minRank; e <= n.maxRank; e++) e !== n.rank && i(e, t);
		}
		return t.map(function(t) {
			return a(e, t, n, r.get(t) || []);
		});
	}
	function d(e, t) {
		let n = new s();
		e.forEach(function(e) {
			let r = e.graph().root, a = i(e, r, n, t);
			a.vs.forEach((t, n) => e.node(t).order = n), o(e, n, a.vs);
		});
	}
	function f(e, t) {
		Object.values(t).forEach((t) => t.forEach((t, n) => e.node(t).order = n));
	}
})), Ln = /* @__PURE__ */ h(((e, t) => {
	var n = Z().Graph, r = Q();
	t.exports = {
		positionX: h,
		findType1Conflicts: i,
		findType2Conflicts: a,
		addConflict: s,
		hasConflict: c,
		verticalAlignment: l,
		horizontalCompaction: u,
		alignCoordinates: p,
		findSmallestWidthAlignment: f,
		balance: m
	};
	function i(e, t) {
		let n = {};
		function r(t, r) {
			let i = 0, a = 0, c = t.length, l = r[r.length - 1];
			return r.forEach((t, u) => {
				let d = o(e, t), f = d ? e.node(d).order : c;
				(d || t === l) && (r.slice(a, u + 1).forEach((t) => {
					e.predecessors(t).forEach((r) => {
						let a = e.node(r), o = a.order;
						(o < i || f < o) && !(a.dummy && e.node(t).dummy) && s(n, r, t);
					});
				}), a = u + 1, i = f);
			}), r;
		}
		return t.length && t.reduce(r), n;
	}
	function a(e, t) {
		let n = {};
		function i(t, i, a, o, c) {
			let l;
			r.range(i, a).forEach((r) => {
				l = t[r], e.node(l).dummy && e.predecessors(l).forEach((t) => {
					let r = e.node(t);
					r.dummy && (r.order < o || r.order > c) && s(n, t, l);
				});
			});
		}
		function a(t, n) {
			let r = -1, a, o = 0;
			return n.forEach((s, c) => {
				if (e.node(s).dummy === "border") {
					let t = e.predecessors(s);
					t.length && (a = e.node(t[0]).order, i(n, o, c, r, a), o = c, r = a);
				}
				i(n, o, n.length, a, t.length);
			}), n;
		}
		return t.length && t.reduce(a), n;
	}
	function o(e, t) {
		if (e.node(t).dummy) return e.predecessors(t).find((t) => e.node(t).dummy);
	}
	function s(e, t, n) {
		if (t > n) {
			let e = t;
			t = n, n = e;
		}
		let r = e[t];
		r || (e[t] = r = {}), r[n] = !0;
	}
	function c(e, t, n) {
		if (t > n) {
			let e = t;
			t = n, n = e;
		}
		return !!e[t] && Object.hasOwn(e[t], n);
	}
	function l(e, t, n, r) {
		let i = {}, a = {}, o = {};
		return t.forEach((e) => {
			e.forEach((e, t) => {
				i[e] = e, a[e] = e, o[e] = t;
			});
		}), t.forEach((e) => {
			let t = -1;
			e.forEach((e) => {
				let s = r(e);
				if (s.length) {
					s = s.sort((e, t) => o[e] - o[t]);
					let r = (s.length - 1) / 2;
					for (let l = Math.floor(r), u = Math.ceil(r); l <= u; ++l) {
						let r = s[l];
						a[e] === e && t < o[r] && !c(n, e, r) && (a[r] = e, a[e] = i[e] = i[r], t = o[r]);
					}
				}
			});
		}), {
			root: i,
			align: a
		};
	}
	function u(e, t, n, r, i) {
		let a = {}, o = d(e, t, n, i), s = i ? "borderLeft" : "borderRight";
		function c(e, t) {
			let n = o.nodes(), r = n.pop(), i = {};
			for (; r;) i[r] ? e(r) : (i[r] = !0, n.push(r), n = n.concat(t(r))), r = n.pop();
		}
		function l(e) {
			a[e] = o.inEdges(e).reduce((e, t) => Math.max(e, a[t.v] + o.edge(t)), 0);
		}
		function u(t) {
			let n = o.outEdges(t).reduce((e, t) => Math.min(e, a[t.w] - o.edge(t)), Infinity), r = e.node(t);
			n !== Infinity && r.borderType !== s && (a[t] = Math.max(a[t], n));
		}
		return c(l, o.predecessors.bind(o)), c(u, o.successors.bind(o)), Object.keys(r).forEach((e) => a[e] = a[n[e]]), a;
	}
	function d(e, t, r, i) {
		let a = new n(), o = e.graph(), s = g(o.nodesep, o.edgesep, i);
		return t.forEach((t) => {
			let n;
			t.forEach((t) => {
				let i = r[t];
				if (a.setNode(i), n) {
					var o = r[n], c = a.edge(o, i);
					a.setEdge(o, i, Math.max(s(e, t, n), c || 0));
				}
				n = t;
			});
		}), a;
	}
	function f(e, t) {
		return Object.values(t).reduce((t, n) => {
			let r = -Infinity, i = Infinity;
			Object.entries(n).forEach(([t, n]) => {
				let a = _(e, t) / 2;
				r = Math.max(n + a, r), i = Math.min(n - a, i);
			});
			let a = r - i;
			return a < t[0] && (t = [a, n]), t;
		}, [Infinity, null])[1];
	}
	function p(e, t) {
		let n = Object.values(t), i = r.applyWithChunking(Math.min, n), a = r.applyWithChunking(Math.max, n);
		["u", "d"].forEach((n) => {
			["l", "r"].forEach((o) => {
				let s = n + o, c = e[s];
				if (c === t) return;
				let l = Object.values(c), u = i - r.applyWithChunking(Math.min, l);
				o !== "l" && (u = a - r.applyWithChunking(Math.max, l)), u && (e[s] = r.mapValues(c, (e) => e + u));
			});
		});
	}
	function m(e, t) {
		return r.mapValues(e.ul, (n, r) => {
			if (t) return e[t.toLowerCase()][r];
			{
				let t = Object.values(e).map((e) => e[r]).sort((e, t) => e - t);
				return (t[1] + t[2]) / 2;
			}
		});
	}
	function h(e) {
		let t = r.buildLayerMatrix(e), n = Object.assign(i(e, t), a(e, t)), o = {}, s;
		return ["u", "d"].forEach((i) => {
			s = i === "u" ? t : Object.values(t).reverse(), ["l", "r"].forEach((t) => {
				t === "r" && (s = s.map((e) => Object.values(e).reverse()));
				let a = (i === "u" ? e.predecessors : e.successors).bind(e), c = l(e, s, n, a), d = u(e, s, c.root, c.align, t === "r");
				t === "r" && (d = r.mapValues(d, (e) => -e)), o[i + t] = d;
			});
		}), p(o, f(e, o)), m(o, e.graph().align);
	}
	function g(e, t, n) {
		return (r, i, a) => {
			let o = r.node(i), s = r.node(a), c = 0, l;
			if (c += o.width / 2, Object.hasOwn(o, "labelpos")) switch (o.labelpos.toLowerCase()) {
				case "l":
					l = -o.width / 2;
					break;
				case "r": l = o.width / 2;
			}
			if (l && (c += n ? l : -l), l = 0, c += (o.dummy ? t : e) / 2, c += (s.dummy ? t : e) / 2, c += s.width / 2, Object.hasOwn(s, "labelpos")) switch (s.labelpos.toLowerCase()) {
				case "l":
					l = s.width / 2;
					break;
				case "r": l = -s.width / 2;
			}
			return l && (c += n ? l : -l), l = 0, c;
		};
	}
	function _(e, t) {
		return e.node(t).width;
	}
})), Rn = /* @__PURE__ */ h(((e, t) => {
	var n = Q(), r = Ln().positionX;
	t.exports = i;
	function i(e) {
		e = n.asNonCompoundGraph(e), a(e), Object.entries(r(e)).forEach(([t, n]) => e.node(t).x = n);
	}
	function a(e) {
		let t = n.buildLayerMatrix(e), r = e.graph().ranksep, i = 0;
		t.forEach((t) => {
			let n = t.reduce((t, n) => {
				let r = e.node(n).height;
				return t > r ? t : r;
			}, 0);
			t.forEach((t) => e.node(t).y = i + n / 2), i += n + r;
		});
	}
})), zn = /* @__PURE__ */ h(((e, t) => {
	var n = vn(), r = yn(), i = Cn(), a = Q().normalizeRanks, o = wn(), s = Q().removeEmptyRanks, c = Tn(), l = En(), u = Dn(), d = In(), f = Rn(), p = Q(), m = Z().Graph;
	t.exports = h;
	function h(e, t) {
		let n = t && t.debugTiming ? p.time : p.notime;
		n("layout", () => {
			let r = n("  buildLayoutGraph", () => E(e));
			n("  runLayout", () => g(r, n, t)), n("  updateInputGraph", () => _(e, r));
		});
	}
	function g(e, t, m) {
		t("    makeSpaceForEdgeLabels", () => D(e)), t("    removeSelfEdges", () => te(e)), t("    acyclic", () => n.run(e)), t("    nestingGraph.run", () => c.run(e)), t("    rank", () => i(p.asNonCompoundGraph(e))), t("    injectEdgeLabelProxies", () => O(e)), t("    removeEmptyRanks", () => s(e)), t("    nestingGraph.cleanup", () => c.cleanup(e)), t("    normalizeRanks", () => a(e)), t("    assignRankMinMax", () => k(e)), t("    removeEdgeLabelProxies", () => A(e)), t("    normalize.run", () => r.run(e)), t("    parentDummyChains", () => o(e)), t("    addBorderSegments", () => l(e)), t("    order", () => d(e, m)), t("    insertSelfEdges", () => ne(e)), t("    adjustCoordinateSystem", () => u.adjust(e)), t("    position", () => f(e)), t("    positionSelfEdges", () => re(e)), t("    removeBorderNodes", () => ee(e)), t("    normalize.undo", () => r.undo(e)), t("    fixupEdgeLabelCoords", () => N(e)), t("    undoCoordinateSystem", () => u.undo(e)), t("    translateGraph", () => j(e)), t("    assignNodeIntersects", () => M(e)), t("    reversePoints", () => P(e)), t("    acyclic.undo", () => n.undo(e));
	}
	function _(e, t) {
		e.nodes().forEach((n) => {
			let r = e.node(n), i = t.node(n);
			r && (r.x = i.x, r.y = i.y, r.rank = i.rank, t.children(n).length && (r.width = i.width, r.height = i.height));
		}), e.edges().forEach((n) => {
			let r = e.edge(n), i = t.edge(n);
			r.points = i.points, Object.hasOwn(i, "x") && (r.x = i.x, r.y = i.y);
		}), e.graph().width = t.graph().width, e.graph().height = t.graph().height;
	}
	var v = [
		"nodesep",
		"edgesep",
		"ranksep",
		"marginx",
		"marginy"
	], y = {
		ranksep: 50,
		edgesep: 20,
		nodesep: 50,
		rankdir: "tb"
	}, b = [
		"acyclicer",
		"ranker",
		"rankdir",
		"align"
	], x = [
		"width",
		"height",
		"rank"
	], S = {
		width: 0,
		height: 0
	}, C = [
		"minlen",
		"weight",
		"width",
		"height",
		"labeloffset"
	], w = {
		minlen: 1,
		weight: 1,
		width: 0,
		height: 0,
		labeloffset: 10,
		labelpos: "r"
	}, T = ["labelpos"];
	function E(e) {
		let t = new m({
			multigraph: !0,
			compound: !0
		}), n = ie(e.graph());
		return t.setGraph(Object.assign({}, y, F(n, v), p.pick(n, b))), e.nodes().forEach((n) => {
			let r = F(ie(e.node(n)), x);
			Object.keys(S).forEach((e) => {
				r[e] === void 0 && (r[e] = S[e]);
			}), t.setNode(n, r), t.setParent(n, e.parent(n));
		}), e.edges().forEach((n) => {
			let r = ie(e.edge(n));
			t.setEdge(n, Object.assign({}, w, F(r, C), p.pick(r, T)));
		}), t;
	}
	function D(e) {
		let t = e.graph();
		t.ranksep /= 2, e.edges().forEach((n) => {
			let r = e.edge(n);
			r.minlen *= 2, r.labelpos.toLowerCase() !== "c" && (t.rankdir === "TB" || t.rankdir === "BT" ? r.width += r.labeloffset : r.height += r.labeloffset);
		});
	}
	function O(e) {
		e.edges().forEach((t) => {
			let n = e.edge(t);
			if (n.width && n.height) {
				let n = e.node(t.v), r = {
					rank: (e.node(t.w).rank - n.rank) / 2 + n.rank,
					e: t
				};
				p.addDummyNode(e, "edge-proxy", r, "_ep");
			}
		});
	}
	function k(e) {
		let t = 0;
		e.nodes().forEach((n) => {
			let r = e.node(n);
			r.borderTop && (r.minRank = e.node(r.borderTop).rank, r.maxRank = e.node(r.borderBottom).rank, t = Math.max(t, r.maxRank));
		}), e.graph().maxRank = t;
	}
	function A(e) {
		e.nodes().forEach((t) => {
			let n = e.node(t);
			n.dummy === "edge-proxy" && (e.edge(n.e).labelRank = n.rank, e.removeNode(t));
		});
	}
	function j(e) {
		let t = Infinity, n = 0, r = Infinity, i = 0, a = e.graph(), o = a.marginx || 0, s = a.marginy || 0;
		function c(e) {
			let a = e.x, o = e.y, s = e.width, c = e.height;
			t = Math.min(t, a - s / 2), n = Math.max(n, a + s / 2), r = Math.min(r, o - c / 2), i = Math.max(i, o + c / 2);
		}
		e.nodes().forEach((t) => c(e.node(t))), e.edges().forEach((t) => {
			let n = e.edge(t);
			Object.hasOwn(n, "x") && c(n);
		}), t -= o, r -= s, e.nodes().forEach((n) => {
			let i = e.node(n);
			i.x -= t, i.y -= r;
		}), e.edges().forEach((n) => {
			let i = e.edge(n);
			i.points.forEach((e) => {
				e.x -= t, e.y -= r;
			}), Object.hasOwn(i, "x") && (i.x -= t), Object.hasOwn(i, "y") && (i.y -= r);
		}), a.width = n - t + o, a.height = i - r + s;
	}
	function M(e) {
		e.edges().forEach((t) => {
			let n = e.edge(t), r = e.node(t.v), i = e.node(t.w), a, o;
			n.points ? (a = n.points[0], o = n.points[n.points.length - 1]) : (n.points = [], a = i, o = r), n.points.unshift(p.intersectRect(r, a)), n.points.push(p.intersectRect(i, o));
		});
	}
	function N(e) {
		e.edges().forEach((t) => {
			let n = e.edge(t);
			if (Object.hasOwn(n, "x")) switch ((n.labelpos === "l" || n.labelpos === "r") && (n.width -= n.labeloffset), n.labelpos) {
				case "l":
					n.x -= n.width / 2 + n.labeloffset;
					break;
				case "r": n.x += n.width / 2 + n.labeloffset;
			}
		});
	}
	function P(e) {
		e.edges().forEach((t) => {
			let n = e.edge(t);
			n.reversed && n.points.reverse();
		});
	}
	function ee(e) {
		e.nodes().forEach((t) => {
			if (e.children(t).length) {
				let n = e.node(t), r = e.node(n.borderTop), i = e.node(n.borderBottom), a = e.node(n.borderLeft[n.borderLeft.length - 1]), o = e.node(n.borderRight[n.borderRight.length - 1]);
				n.width = Math.abs(o.x - a.x), n.height = Math.abs(i.y - r.y), n.x = a.x + n.width / 2, n.y = r.y + n.height / 2;
			}
		}), e.nodes().forEach((t) => {
			e.node(t).dummy === "border" && e.removeNode(t);
		});
	}
	function te(e) {
		e.edges().forEach((t) => {
			if (t.v === t.w) {
				var n = e.node(t.v);
				n.selfEdges || (n.selfEdges = []), n.selfEdges.push({
					e: t,
					label: e.edge(t)
				}), e.removeEdge(t);
			}
		});
	}
	function ne(e) {
		p.buildLayerMatrix(e).forEach((t) => {
			var n = 0;
			t.forEach((t, r) => {
				var i = e.node(t);
				i.order = r + n, (i.selfEdges || []).forEach((t) => {
					p.addDummyNode(e, "selfedge", {
						width: t.label.width,
						height: t.label.height,
						rank: i.rank,
						order: r + ++n,
						e: t.e,
						label: t.label
					}, "_se");
				}), delete i.selfEdges;
			});
		});
	}
	function re(e) {
		e.nodes().forEach((t) => {
			var n = e.node(t);
			if (n.dummy === "selfedge") {
				var r = e.node(n.e.v), i = r.x + r.width / 2, a = r.y, o = n.x - i, s = r.height / 2;
				e.setEdge(n.e, n.label), e.removeNode(t), n.label.points = [
					{
						x: i + 2 * o / 3,
						y: a - s
					},
					{
						x: i + 5 * o / 6,
						y: a - s
					},
					{
						x: i + o,
						y: a
					},
					{
						x: i + 5 * o / 6,
						y: a + s
					},
					{
						x: i + 2 * o / 3,
						y: a + s
					}
				], n.label.x = n.x, n.label.y = n.y;
			}
		});
	}
	function F(e, t) {
		return p.mapValues(p.pick(e, t), Number);
	}
	function ie(e) {
		var t = {};
		return e && Object.entries(e).forEach(([e, n]) => {
			typeof e == "string" && (e = e.toLowerCase()), t[e] = n;
		}), t;
	}
})), Bn = /* @__PURE__ */ h(((e, t) => {
	var n = Q(), r = Z().Graph;
	t.exports = { debugOrdering: i };
	/* istanbul ignore next */
	function i(e) {
		let t = n.buildLayerMatrix(e), i = new r({
			compound: !0,
			multigraph: !0
		}).setGraph({});
		return e.nodes().forEach((t) => {
			i.setNode(t, { label: t }), i.setParent(t, "layer" + e.node(t).rank);
		}), e.edges().forEach((e) => i.setEdge(e.v, e.w, {}, e.name)), t.forEach((e, t) => {
			let n = "layer" + t;
			i.setNode(n, { rank: "same" }), e.reduce((e, t) => (i.setEdge(e, t, { style: "invis" }), t));
		}), i;
	}
})), Vn = /* @__PURE__ */ h(((e, t) => {
	t.exports = "1.1.8";
})), Hn = /* @__PURE__ */ _((/* @__PURE__ */ h(((e, t) => {
	t.exports = {
		graphlib: Z(),
		layout: zn(),
		debug: Bn(),
		util: {
			time: Q().time,
			notime: Q().notime
		},
		version: Vn()
	};
})))(), 1);
function Un(e) {
	let t = We[e.hand];
	return {
		px: 19 * t.scale,
		family: t.family,
		weight: t.weight
	};
}
function Wn(e, t, n) {
	switch (e.shape) {
		case "circle": {
			let e = Math.max(t * 1.35 + 26, n * 1.4 + 30, 72);
			return {
				w: e,
				h: Math.max(n * 1.5 + 26, e * .62),
				labelDy: 0
			};
		}
		case "diamond": return {
			w: t * 1.6 + 40,
			h: Math.max(n * 2 + 34, 70),
			labelDy: 0
		};
		case "cloud": return {
			w: t * 1.3 + 64,
			h: n + 66,
			labelDy: 2
		};
		case "db": return {
			w: Math.max(t + 44, 80),
			h: n + 62,
			labelDy: 8
		};
		case "sticky": return {
			w: Math.max(t + 34, 116),
			h: Math.max(n + 36, 96),
			labelDy: 0
		};
		case "icon": return {
			w: Math.max(t + 8, 54),
			h: 44 + n + 6,
			labelDy: 26
		};
		case "person": return {
			w: Math.max(t + 8, 54),
			h: 66 + n + 4,
			labelDy: 37
		};
		case "text": return {
			w: t + 10,
			h: n + 8,
			labelDy: 0
		};
		case "round": return {
			w: t + 48,
			h: n + 28,
			labelDy: 0
		};
		default: return {
			w: t + 40,
			h: n + 28,
			labelDy: 0
		};
	}
}
function Gn(e) {
	let { px: t, family: n, weight: r } = Un(e), i = /* @__PURE__ */ new Map();
	for (let a of e.nodes) {
		let e = Ke[a.size ?? "normal"] ?? 1, { w: o, h: s } = U(a.label, t * e, n, r), c = Wn(a, o / e, s / e);
		i.set(a.id, {
			lw: o,
			lh: s,
			w: c.w * e,
			h: c.h * e,
			labelDy: c.labelDy * e
		});
	}
	return i;
}
function Kn(e) {
	return e.title ? Un(e).px * 1.7 + 30 : 0;
}
// src/core/layouts/flow.ts
function qn(e) {
	let { px: t, family: n, weight: r } = Un(e), i = e.edges.map((e) => e.label ? U(e.label, t * .82, n, r) : null), a = Math.max(0, ...i.map((e) => e ? e.w : 0)), o = Math.max(0, ...i.map((e) => e ? e.h : 0)), s = e.direction === "down";
	return {
		rankdir: s ? "TB" : "LR",
		nodesep: s ? 56 : 40,
		ranksep: s ? Math.max(62, o * 2 + 36) : Math.min(240, Math.max(78, a + 40))
	};
}
function Jn(e, t) {
	let n = new Set(t.map((e) => Math.round(e / 10)));
	return e.direction === "down" || n.size <= 7 || !e.nodes.length ? [] : [{
		code: "W-WIDE",
		severity: "warning",
		message: `This drawing is ${n.size} columns wide, which gets small on narrow screens.`,
		hint: "Try  layout down  to stack it instead.",
		span: {
			line: 1,
			from: 0,
			to: 0
		}
	}];
}
var Yn = (e) => {
	let { px: t, family: n, weight: r } = Un(e), i = qn(e), a = Gn(e), o = {
		layout: "flow",
		decorations: [],
		groups: [],
		labels: /* @__PURE__ */ new Map(),
		titleH: Kn(e),
		fontPx: t,
		family: n,
		weight: r,
		humanise: {
			tilt: 3.2,
			stickyTilt: 7,
			jitterX: 16,
			jitterY: 12
		}
	};
	if (e.groups.length) return {
		...o,
		...Xn(e, a, i)
	};
	let s = new Hn.default.graphlib.Graph({ multigraph: !0 });
	s.setGraph({
		...i,
		edgesep: 24,
		marginx: 36,
		marginy: 36
	}), s.setDefaultEdgeLabel(() => ({}));
	for (let t of e.nodes) {
		let e = a.get(t.id);
		s.setNode(t.id, {
			width: e.w,
			height: e.h
		});
	}
	e.edges.forEach((e, t) => s.setEdge(e.from, e.to, {
		width: 0,
		height: 0
	}, `e${t}`)), Hn.default.layout(s);
	let c = /* @__PURE__ */ new Map();
	for (let t of e.nodes) {
		let e = s.node(t.id), n = a.get(t.id);
		c.set(t.id, {
			def: t,
			cx: e.x,
			cy: e.y,
			w: n.w,
			h: n.h,
			rotate: 0,
			labelDy: n.labelDy,
			labelW: n.lw,
			labelH: n.lh
		});
	}
	let l = e.edges.map((e, t) => {
		let n = s.edge({
			v: e.from,
			w: e.to,
			name: `e${t}`
		}).points.slice(1, -1).map((e) => [e.x, e.y]);
		return {
			index: t,
			def: e,
			route: n.length <= 1 ? [] : n,
			points: [],
			bend: 0
		};
	}), u = s.graph();
	return {
		...o,
		nodes: c,
		edges: l,
		width: u.width ?? 200,
		height: u.height ?? 120,
		warnings: Jn(e, e.nodes.map((e) => s.node(e.id).x))
	};
};
function Xn(e, t, n) {
	let { px: r, family: i, weight: a } = Un(e), o = U("Hg", r * .8, i, Math.min(700, a + 200)).h + 6, s = /* @__PURE__ */ new Map();
	for (let t of e.nodes) s.set(t.id, t.group);
	for (let t of e.groups) s.set(t.id, t.parent);
	let c = new Set(e.groups.map((e) => e.id)), l = (e, t) => {
		let n = e;
		for (; n !== void 0;) {
			let e = s.get(n);
			if (e === t) return n;
			n = e;
		}
	}, u = /* @__PURE__ */ new Map(), d = (f) => {
		let p = u.get(f);
		if (p) return p;
		let m = [...e.nodes.map((e) => e.id), ...e.groups.map((e) => e.id)].filter((e) => s.get(e) === f), h = new Hn.default.graphlib.Graph({ multigraph: !0 });
		h.setGraph({
			...n,
			edgesep: 24,
			marginx: 0,
			marginy: 0
		}), h.setDefaultEdgeLabel(() => ({}));
		let g = /* @__PURE__ */ new Map();
		for (let n of m) {
			if (c.has(n)) {
				let t = d(n), s = e.groups.find((e) => e.id === n).label, c = U(s, r * .8, i, Math.min(700, a + 200)).w + 28;
				g.set(n, {
					w: Math.max(t.w + 28, c),
					h: t.h + 28 + o
				});
			} else {
				let e = t.get(n);
				g.set(n, {
					w: e.w,
					h: e.h
				});
			}
			h.setNode(n, {
				width: g.get(n).w,
				height: g.get(n).h
			});
		}
		e.edges.forEach((e, t) => {
			let n = l(e.from, f), r = l(e.to, f);
			n && r && n !== r && h.setEdge(n, r, {}, `e${t}`);
		}), Hn.default.layout(h);
		let _ = /* @__PURE__ */ new Map();
		for (let e of m) {
			let t = h.node(e);
			if (c.has(e)) {
				let n = d(e), r = g.get(e), i = t.x - n.w / 2, a = t.y - r.h / 2 + 14 + o;
				for (let [e, [t, r]] of n.pos) _.set(e, [i + t, a + r]);
			} else _.set(e, [t.x, t.y]);
		}
		let v = h.graph(), y = {
			w: v.width ?? 0,
			h: v.height ?? 0,
			pos: _
		};
		return u.set(f, y), y;
	}, f = d(void 0), p = /* @__PURE__ */ new Map();
	for (let n of e.nodes) {
		let [e, r] = f.pos.get(n.id) ?? [0, 0], i = t.get(n.id);
		p.set(n.id, {
			def: n,
			cx: e + 36,
			cy: r + 36,
			w: i.w,
			h: i.h,
			rotate: 0,
			labelDy: i.labelDy,
			labelW: i.lw,
			labelH: i.lh
		});
	}
	return {
		nodes: p,
		edges: e.edges.map((e, t) => ({
			index: t,
			def: e,
			route: [],
			points: [],
			bend: 0
		})),
		width: f.w + 72,
		height: f.h + 72,
		warnings: Jn(e, [...p.values()].map((e) => e.cx))
	};
}
// src/core/layouts/index.ts
var Zn = { flow: Yn };
function Qn(e) {
	let t = (Zn[e.layout] ?? Yn)(e), n = Be(e.seed * 7919 + 13);
	return Nt(t, e, n), ht(t, e), gt(t), _t(t, e), Pt(t, e, n), Ut(t, e), t;
}
// src/core/syntax/suggest.ts
function $n(e, t) {
	let n = e.length, r = t.length, i = Array.from({ length: r + 1 }, (e, t) => t);
	for (let a = 1; a <= n; a++) {
		let n = i[0];
		i[0] = a;
		for (let o = 1; o <= r; o++) {
			let r = i[o];
			i[o] = Math.min(i[o] + 1, i[o - 1] + 1, n + (e[a - 1] === t[o - 1] ? 0 : 1)), n = r;
		}
	}
	return i[r];
}
function er(e, t) {
	let n = e.toLowerCase(), r, i = Infinity;
	for (let e of t) {
		let t = $n(n, e.toLowerCase());
		t < i && (i = t, r = e);
	}
	let a = n.length <= 3 ? 1 : n.length <= 6 ? 2 : 3;
	return i > 0 && i <= a ? r : void 0;
}
function tr(e, t) {
	let n = er(e, t);
	return n ? `Did you mean "${n}"?` : void 0;
}
// src/core/syntax/tokens.ts
var nr = [
	"<~>",
	"<->",
	"-->",
	"->",
	"~>"
], rr = /^[A-Za-z_][\w]*(?:-[\w]+)*/, ir = /^\d+(?:\.\d+)?(?![A-Za-z_])/, ar = /^[^\s:,="{}@]+/;
function or(e) {
	return e.replace(/\\(.)/g, (e, t) => t === "n" ? "\n" : t);
}
function sr(e, t, n = 0) {
	let r = [], i = 0, a = (i, a, o, s, c) => {
		let l = e.slice(a, o);
		r.push({
			type: i,
			text: l,
			value: s ?? l,
			from: n + a,
			to: n + o,
			line: t,
			error: c
		});
	}, o = e.search(/\S/);
	for (; i < e.length;) {
		let t = e[i];
		if (t === " " || t === "	" || t === "\r") {
			i++;
			continue;
		}
		if (t === "#" && (i === 0 || /\s/.test(e[i - 1]))) {
			a("comment", i, e.length);
			break;
		}
		if (t === "\"") {
			let t = i + 1;
			for (; t < e.length && e[t] !== "\"";) t += e[t] === "\\" ? 2 : 1;
			if (t >= e.length) {
				a("string", i, e.length, or(e.slice(i + 1)), "This text is missing its closing quote.");
				break;
			}
			a("string", i, t + 1, or(e.slice(i + 1, t))), i = t + 1;
			continue;
		}
		let n = nr.find((t) => e.startsWith(t, i));
		if (n) {
			a("arrow", i, i + n.length), i += n.length;
			continue;
		}
		if (t === "-" && i === o && /\s/.test(e[i + 1] ?? "")) {
			a("bullet", i, i + 1), i++;
			continue;
		}
		let r = {
			":": "colon",
			",": "comma",
			"=": "equals",
			"{": "lbrace",
			"}": "rbrace"
		};
		if (r[t]) {
			a(r[t], i, i + 1), i++;
			continue;
		}
		let s = e.slice(i), c;
		if (t === "@" && (c = s.match(/^@(\d+)/))) {
			a("at", i, i + c[0].length, c[1]), i += c[0].length;
			continue;
		}
		if (c = s.match(ir)) {
			a("number", i, i + c[0].length), i += c[0].length;
			continue;
		}
		if (c = s.match(rr)) {
			a("ident", i, i + c[0].length), i += c[0].length;
			continue;
		}
		c = s.match(ar);
		let l = c ? c[0].length : 1;
		a("word", i, i + l), i += l;
	}
	return r;
}
function cr(e) {
	let t = e.split("\n"), n = [], r = 0;
	return t.forEach((e, t) => {
		n.push(sr(e, t + 1, r)), r += e.length + 1;
	}), n;
}
// src/core/syntax/parser.ts
var lr = [
	"box",
	"round",
	"circle",
	"diamond",
	"cloud",
	"db",
	"sticky",
	"person",
	"icon",
	"text"
], ur = {
	rect: "box",
	rectangle: "box",
	square: "box",
	pill: "round",
	oval: "circle",
	ellipse: "circle",
	decision: "diamond",
	database: "db",
	cylinder: "db",
	note: "sticky",
	stick: "person",
	user: "person",
	label: "text"
}, dr = [
	"circle",
	"underline",
	"strike",
	"highlight",
	"note",
	"cross",
	"check"
], fr = [
	"title",
	"layout",
	"direction",
	"paper",
	"pen",
	"hand",
	"mess",
	"seed",
	"steps",
	"inkling"
], pr = [
	...fr,
	"step",
	"group",
	...dr
], mr = [
	"color",
	"fill",
	"pen",
	"size",
	"icon"
], hr = ["color", "pen"], $ = (e) => !!e && (e.type === "ident" || e.type === "string"), gr = (e) => e.replace(/[-_]+/g, " "), _r = [...lr, ...Object.keys(ur)];
function vr(e) {
	let t = {
		...qe,
		nodes: [],
		edges: [],
		annotations: [],
		steps: [],
		groups: [],
		autoSteps: !1,
		diagnostics: []
	}, n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map(), i = [], a = e.split("\n"), o = 0, s = (e, n, r, i, a, o) => t.diagnostics.push({
		code: n,
		severity: e,
		message: r,
		span: i,
		hint: a,
		fix: o === void 0 ? void 0 : {
			span: i,
			text: o
		}
	}), c = (e) => ({
		line: e.line,
		from: e.from,
		to: e.to
	}), l = (e, t) => {
		let n = er(e.value, t);
		return n ? {
			hint: `Did you mean "${n}"?`,
			fix: n
		} : {
			hint: void 0,
			fix: void 0
		};
	}, u = () => i[i.length - 1]?.group, d = (e, i, a) => {
		if (!i) return;
		let o = t.nodes[n.get(e)];
		if (!o.group || o.group === i.id || a) {
			if (o.group && o.group !== i.id) {
				let t = r.get(o.group);
				t && (t.members = t.members.filter((t) => t !== e));
			}
			o.group = i.id, i.members.includes(e) || i.members.push(e);
		}
	}, f = (e, r, i) => {
		n.has(e) || (n.set(e, t.nodes.length), t.nodes.push({
			id: e,
			shape: "box",
			label: gr(e),
			line: i,
			span: r,
			order: o,
			implicit: !0
		}), d(e, u(), !1));
	};
	cr(e).forEach((e, p) => {
		let m = p + 1, h = a[p], g = e.find((e) => e.type === "comment"), _ = e.filter((e) => e.type !== "comment");
		if (!_.length) return;
		let v = {
			line: m,
			from: _[0].from,
			to: _[_.length - 1].to
		}, y = (e, t, n = v, r, i) => s("error", e, t, n, r, i), b = (e, t, n = v, r) => s("warning", e, t, n, r), x = _.find((e) => e.error);
		if (x) {
			y("E-UNCLOSED-STRING", x.error, c(x), "Add a \" at the end of the text.");
			return;
		}
		let S = _[0].from - h.search(/\S/), C = (e) => h.slice(e.to - S, g ? g.from - S : h.length).trim(), w = (e) => {
			let t = e.trim();
			return (t.length >= 2 && t.startsWith("\"") && t.endsWith("\"") ? t.slice(1, -1) : t).replace(/\\(.)/g, (e, t) => t === "n" ? "\n" : t);
		}, T = (e, t) => {
			let n = {}, r = e.length;
			for (; r >= 3 && e[r - 2].type === "equals";) {
				let i = e[r - 3], a = e[r - 1];
				if (i.type !== "ident") break;
				if (!t.includes(i.value)) {
					let e = l(i, t);
					return y("E-UNKNOWN-OPTION", `There is no "${i.value}" option here.`, c(i), e.hint ?? `Options: ${t.join(", ")}.`, e.fix), null;
				}
				n[i.value] = a, r -= 3;
			}
			return {
				opts: n,
				rest: e.slice(0, r)
			};
		}, E = (e, t) => {
			let n = {
				color: Object.keys(Ge),
				fill: Object.keys(B),
				pen: Object.keys(Ue),
				size: Object.keys(Ke),
				icon: Tt
			}[e];
			if (n && !n.includes(t.value)) {
				let r = l(t, n);
				return y("E-BAD-OPTION", `"${t.value}" is not a ${e}.`, c(t), r.hint ?? `Try: ${n.join(", ")}.`, r.fix), !1;
			}
			return !0;
		};
		if (_[0].type === "rbrace") {
			i.length ? i.pop() : y("E-UNEXPECTED", "This } does not close a group.", v), _.length > 1 && y("E-UNEXPECTED", "Put anything after } on its own line.", {
				line: m,
				from: _[1].from,
				to: v.to
			});
			return;
		}
		let [D, O] = _, k = D.type === "ident", A = !O || O.type !== "colon" && O.type !== "arrow";
		if (k && D.value === "group" && A) {
			if (o++, !$(O)) {
				y("E-BAD-GROUP", "Write a group as  group name \"Label\" {", v);
				return;
			}
			let e = 2, n = _[e]?.type === "string" ? _[e++] : void 0;
			if (_[e]?.type !== "lbrace") {
				y("E-BAD-GROUP", "A group needs a { after its name, then its members, then a } line.", v);
				return;
			}
			if (e++, r.has(O.value)) {
				y("E-DUPLICATE-GROUP", `There is already a group called "${O.value}".`, c(O));
				return;
			}
			let a = u();
			if (a?.parent) {
				y("E-GROUP-TOO-DEEP", "Groups can sit inside one other group, not deeper.", v);
				return;
			}
			let s = {
				id: O.value,
				label: n ? n.value : gr(O.value),
				members: [],
				parent: a?.id,
				line: m,
				span: v,
				order: o
			};
			r.set(s.id, s), t.groups.push(s);
			let l = _.slice(e);
			if (l.length && l[l.length - 1].type === "rbrace") {
				for (let e of l.slice(0, -1)) if (e.type !== "comma") {
					if (!$(e)) {
						y("E-UNEXPECTED", `I don't understand "${e.text}" in a group. List names separated by commas.`, c(e));
						return;
					}
					f(e.value, v, m), d(e.value, s, !0);
				}
			} else l.length ? y("E-UNEXPECTED", "After { either list members and close with } on the same line, or start the next line.", c(l[0])) : i.push({
				group: s,
				span: v
			});
			return;
		}
		if (k && fr.includes(D.value) && A) {
			o++;
			let e = D.value;
			if (!O) {
				y("E-MISSING-VALUE", `"${e}" needs a value.`, v);
				return;
			}
			if (e === "title") {
				t.title = w(C(D));
				return;
			}
			let n = _[2];
			n && y("E-UNEXPECTED", `"${e}" takes one value. I don't understand "${n.text}" here.`, {
				line: m,
				from: n.from,
				to: v.to
			});
			let r = O.value;
			if (e === "steps") {
				r === "auto" ? t.autoSteps = !0 : y("E-BAD-STEPS", "Write  steps auto  to make each node its own step.", c(O));
				return;
			}
			if (e === "inkling") {
				t.version = Number(r), r !== "1" && b("W-VERSION", `This file says Inkling ${r}; this renderer reads version 1.`, c(O));
				return;
			}
			let i = {
				layout: ["right", "down"],
				direction: ["right", "down"],
				paper: Object.keys(He),
				pen: Object.keys(Ue),
				hand: Object.keys(We)
			};
			if (i[e]) {
				if (!i[e].includes(r)) {
					let t = l(O, i[e]), n = e === "layout" || e === "direction" ? `Layout can be "right" or "down", not "${r}".` : `No ${e === "hand" ? "handwriting" : e} called "${r}".`;
					y(`E-UNKNOWN-${e === "direction" ? "LAYOUT" : e.toUpperCase()}`, n, c(O), t.hint ?? `Try: ${i[e].join(", ")}.`, t.fix);
					return;
				}
				e === "layout" || e === "direction" ? t.direction = r : t[e] = r;
				return;
			}
			let a = Number(r);
			if (e === "mess") {
				O.type === "number" && a >= 0 && a <= 1 ? t.mess = a : y("E-BAD-MESS", "Mess is a number from 0 (tidy) to 1 (chaotic).", c(O));
				return;
			}
			if (e === "seed") {
				O.type === "number" && Number.isInteger(a) ? t.seed = a : y("E-BAD-SEED", "Seed is a whole number, such as 7.", c(O));
				return;
			}
		}
		if (k && D.value === "step" && O?.type === "number") {
			o++;
			let e = 2;
			_[e]?.type === "colon" && e++;
			let n = [], r;
			for (; e < _.length; e++) {
				let t = _[e];
				if (t.type !== "comma") {
					if (t.type === "string" && e === _.length - 1) r = t.value;
					else if (t.type === "ident" || t.type === "string") n.push(t.value);
					else {
						y("E-UNEXPECTED", `I don't understand "${t.text}" in a step. List names separated by commas, then an optional "caption".`, c(t));
						return;
					}
				}
			}
			t.steps.push({
				index: Number(O.value),
				items: n,
				caption: r,
				line: m,
				span: v
			});
			return;
		}
		let j = _[2]?.type === "arrow" && $(_[3]);
		if (k && dr.includes(D.value) && $(O) && A && (_[2]?.type !== "arrow" || j)) {
			o++;
			let e = D.value, n = j ? `${O.value}->${_[3].value}` : O.value, r, i, a;
			for (let e of _.slice(j ? 4 : 2)) if (e.type === "string" && r === void 0) r = e.value;
			else if (e.type === "at") i = Number(e.value);
			else if (e.type === "ident" && B[e.value]) a = e.value;
			else {
				let t = e.type === "ident" ? l(e, Object.keys(B)) : {
					hint: void 0,
					fix: void 0
				};
				y("E-UNEXPECTED", `I don't understand "${e.text}" here.`, c(e), t.hint, t.fix);
				return;
			}
			if (e === "note" && !r) {
				y("E-NOTE-NEEDS-TEXT", `A note needs text, like  note ${n} "remember this"`, v);
				return;
			}
			t.annotations.push({
				kind: e,
				target: n,
				targetKind: j ? "edge" : "node",
				text: r,
				color: a,
				at: i,
				line: m,
				span: v,
				order: o
			});
			return;
		}
		let M = _.findIndex((e) => e.type === "colon"), N = M === -1 ? _ : _.slice(0, M);
		if (N.some((e) => e.type === "arrow")) {
			o++;
			let e = T(N, hr);
			if (!e) return;
			let n = e.rest, r = e.opts;
			if (!(n.length >= 3 && n.length % 2 == 1 && n.every((e, t) => t % 2 == 0 ? $(e) : e.type === "arrow"))) {
				let e = n.find((e, t) => t % 2 == 0 ? !$(e) : e.type !== "arrow");
				e && e.type === "word" ? y("E-BAD-NAME", `"${e.text}" is not a valid name. Use letters, digits, - or _, or put it in quotes.`, c(e)) : y("E-ARROW-NEEDS-ENDS", "An arrow needs a name on both sides, like \"a -> b\".", v);
				return;
			}
			let i;
			if (M !== -1) {
				let e = _.slice(M + 1);
				if (e[0]?.type === "string") {
					i = e[0].value;
					let t = T(e.slice(1), hr);
					if (!t) return;
					if (t.rest.length) {
						y("E-UNEXPECTED", `I don't understand "${t.rest[0].text}" after the label.`, c(t.rest[0]));
						return;
					}
					r = {
						...r,
						...t.opts
					};
				} else {
					let t = e.length;
					for (; t >= 3 && e[t - 2].type === "equals" && e[t - 3].type === "ident" && hr.includes(e[t - 3].value);) t -= 3;
					let n = T(e.slice(t), hr);
					if (!n) return;
					r = {
						...r,
						...n.opts
					};
					let a = _[M].to - S, o = t < e.length ? e[t].from - S : g ? g.from - S : h.length;
					i = w(h.slice(a, o)) || void 0;
				}
			}
			for (let [e, t] of Object.entries(r)) if (!E(e, t)) return;
			for (let e = 0; e + 2 < n.length; e += 2) {
				let a = n[e].value, s = n[e + 1].value, c = n[e + 2].value;
				f(a, v, m), f(c, v, m);
				let l = s.includes("~") ? "squiggle" : s === "-->" ? "dashed" : "solid";
				t.edges.push({
					from: a,
					to: c,
					kind: l,
					both: s.startsWith("<"),
					label: e + 2 === n.length - 1 && i ? i : void 0,
					color: r.color?.value,
					pen: r.pen?.value,
					line: m,
					span: v,
					order: o
				});
			}
		} else if ($(D) && O?.type === "colon") {
			o++;
			let e = D.value, r = T(_.slice(2), mr);
			if (!r) return;
			let { opts: i } = r, a = r.rest, s = 0, f, p, h, g;
			if (a[s]?.type === "ident" && (f = a[s++]), f?.value === "icon" && a[s]?.type === "ident" && (p = a[s++]), a[s]?.type === "string" && (h = a[s++]), a[s]?.type === "ident" && (g = a[s++]), s < a.length) {
				y("E-BAD-NODE", `Write a node as  ${e}: box "Label"`, v, `I don't understand "${a[s].text}" here.`);
				return;
			}
			if (f && !_r.includes(f.value)) {
				if (!h && !g && B[f.value]) g = f, f = void 0;
				else {
					let e = l(f, _r);
					y("E-UNKNOWN-SHAPE", `No shape called "${f.value}".`, c(f), e.hint ?? `Try: ${lr.join(", ")}.`, e.fix);
					return;
				}
			}
			if (g && !B[g.value]) {
				let e = l(g, Object.keys(B));
				y("E-UNKNOWN-COLOR", `No colour called "${g.value}".`, c(g), e.hint ?? `Try: ${Object.keys(B).join(", ")}.`, e.fix);
				return;
			}
			if (f?.value === "icon" && p && !Tt.includes(p.value)) {
				let e = l(p, Tt);
				y("E-UNKNOWN-ICON", `No icon called "${p.value}".`, c(p), e.hint ?? `Icons: ${Tt.join(", ")}.`, e.fix);
				return;
			}
			for (let [e, t] of Object.entries(i)) if (!E(e, t)) return;
			let b = f ? ur[f.value] ?? f.value : "box";
			i.icon && !f && (b = "icon");
			let x = b === "icon" ? p?.value ?? i.icon?.value : void 0;
			if (b === "icon" && !x) {
				y("E-ICON-NEEDS-NAME", `Name the icon, like  ${e}: icon server "Label"`, v, `Icons: ${Tt.join(", ")}.`);
				return;
			}
			let S = {
				id: e,
				shape: b,
				label: h ? h.value : gr(e),
				fill: g?.value ?? i.fill?.value,
				color: i.color?.value,
				pen: i.pen?.value,
				size: i.size?.value,
				icon: x,
				line: m,
				span: v,
				order: o
			}, C = n.get(e);
			if (C !== void 0) {
				let n = t.nodes[C];
				n.implicit || y("E-DUPLICATE-NODE", `"${e}" is already defined on line ${n.line}.`, c(D), "Rename one of them, or delete this line."), S.group = n.group, t.nodes[C] = S;
			} else n.set(e, t.nodes.length), t.nodes.push(S);
			d(e, u(), !0);
		} else y("E-UNKNOWN-LINE", "I don't understand this line.", v, k ? tr(D.value, pr) : void 0);
	});
	for (let { group: e, span: t } of i) s("error", "E-UNCLOSED-GROUP", `Group "${e.id}" is never closed.`, t, "Add a line with just } after its last member.");
	let p = /* @__PURE__ */ new Set();
	if (t.groups = t.groups.filter((e) => {
		if (n.has(e.id)) return s("error", "E-GROUP-NAME-TAKEN", `"${e.id}" is both a node and a group. Give the group another name.`, e.span), p.add(e.id), !1;
		let r = t.groups.some((t) => t.parent === e.id);
		return !e.members.length && !r ? (s("warning", "W-EMPTY-GROUP", `Group "${e.id}" has nothing in it.`, e.span), p.add(e.id), !1) : !0;
	}), p.size) {
		let e = new Map(t.groups.map((e) => [e.id, e.parent]));
		for (let e of t.nodes) e.group && p.has(e.group) && (e.group = void 0);
		for (let n of t.groups) n.parent && p.has(n.parent) && (n.parent = e.get(n.parent));
	}
	let m = new Set(t.groups.map((e) => e.id)), h = () => [...n.keys(), ...m];
	t.annotations = t.annotations.filter((e) => {
		if (e.targetKind === "edge") {
			let [n, r] = e.target.split("->"), i = t.edges.findIndex((e) => e.from === n && e.to === r);
			return i === -1 && (i = t.edges.findIndex((e) => e.from === r && e.to === n)), i === -1 ? (s("error", "E-UNKNOWN-TARGET", `There is no arrow between "${n}" and "${r}".`, e.span), !1) : (e.edgeIndex = i, (e.kind === "underline" || e.kind === "strike") && !t.edges[i].label ? (s("warning", "W-NO-LABEL", `That arrow has no label to ${e.kind}.`, e.span), !1) : !0);
		}
		if (m.has(e.target) && !n.has(e.target)) return e.targetKind = "group", !0;
		if (n.has(e.target)) return !0;
		let r = er(e.target, h());
		return s("error", "E-UNKNOWN-TARGET", `There is no node called "${e.target}".`, e.span, r ? `Did you mean "${r}"?` : void 0), !1;
	});
	for (let e of t.steps) {
		for (let t of e.items.filter((e) => !n.has(e) && !m.has(e))) {
			let n = er(t, h());
			s("warning", "W-STEP-UNKNOWN", `Step ${e.index} names "${t}", which is not a node.`, e.span, n ? `Did you mean "${n}"?` : void 0);
		}
		e.items = e.items.filter((e) => n.has(e) || m.has(e));
	}
	return t.autoSteps && t.steps.length && s("warning", "W-STEPS-IGNORED", "\"steps auto\" is ignored because this file also has step lines.", t.steps[0].span), t.steps.sort((e, t) => e.index - t.index), t.diagnostics.sort((e, t) => e.span.from - t.span.from), t;
}
// src/core/index.ts
Xt();
var yr = (e) => e < .5 ? 2 * e * e : 1 - (-2 * e + 2) ** 2 / 2;
function br(e) {
	for (let t of e) {
		let e = 0;
		for (let n of t.pieces) {
			if (n.mode === "stroke") {
				let e = n.el;
				n.len = typeof e.getTotalLength == "function" ? e.getTotalLength() : 0, n.len || (n.mode = "fade");
			}
			n.mode === "fade" && (n.len = 24), n.mode === "clip" && (n.len = (n.clipW ?? 60) * 1.4), e += n.len;
		}
		t.total = e || 1;
	}
}
function xr(e, t) {
	for (let n of e) {
		let e = n.total, r = Math.min(1, Math.max(0, (t - n.start) / n.dur)), i = 0;
		for (let t of n.pieces) {
			let n = i / e, a = (i + t.len) / e;
			i += t.len;
			let o = r >= a ? 1 : r <= n ? 0 : yr((r - n) / (a - n)), s = t.el.style;
			t.mode === "stroke" ? o >= 1 ? (s.strokeDasharray = "", s.strokeDashoffset = "", s.visibility = "") : (s.strokeDasharray = `${t.len} ${t.len}`, s.strokeDashoffset = String(t.len * (1 - o)), s.visibility = o <= 0 ? "hidden" : "") : t.mode === "fade" ? s.opacity = o >= 1 ? "" : String(o) : t.clip && t.clip.setAttribute("width", String((t.clipW ?? 0) * o + (o >= 1 ? 40 : 0)));
		}
	}
}
function Sr(e, t = {}, n = {}) {
	let r = {
		...vr(e),
		...t
	}, i = {
		line: 1,
		from: 0,
		to: 0
	}, a = r.nodes.length > Cr.nodes || r.edges.length > Cr.edges || e.length > Cr.chars;
	a && r.diagnostics.push({
		code: "W-TOO-BIG",
		severity: "warning",
		message: `This drawing is very large (${r.nodes.length} nodes, ${r.edges.length} arrows), so it is drawn without animation.`,
		span: i
	});
	try {
		let e = Qn(r);
		return r.diagnostics.push(...e.warnings), {
			doc: r,
			drawing: Mt(r, e, {
				...n,
				still: n.still || a
			})
		};
	} catch (e) {
		r.diagnostics.push({
			code: "E-INTERNAL",
			severity: "error",
			message: `Inkling could not draw this: ${e.message}. This is a bug; please report it with the source.`,
			span: i
		});
		let t = {
			...vr(""),
			paper: r.paper,
			pen: r.pen,
			hand: r.hand
		};
		return {
			doc: r,
			drawing: Mt(t, Qn(t), n)
		};
	}
}
var Cr = {
	nodes: 300,
	edges: 600,
	chars: 2e4
};
function wr(e, t, n = {}) {
	let { doc: r, drawing: i } = Sr(t, n);
	return e.replaceChildren(i.svg), br(i.items), xr(i.items, Infinity), {
		doc: r,
		svg: i.svg,
		steps: i.steps,
		duration: i.duration,
		seek: (e) => xr(i.items, e),
		toSVG: () => {
			let e = i.svg.cloneNode(!0);
			return e.querySelectorAll("[style]").forEach((e) => {
				e.style.strokeDasharray = "", e.style.strokeDashoffset = "", e.style.opacity = "", e.style.visibility = "";
			}), e.querySelectorAll("clipPath rect").forEach((e) => e.setAttribute("width", "9999")), new XMLSerializer().serializeToString(e);
		},
		destroy: () => i.svg.remove()
	};
}
var Tr = class {
	constructor(e, t = () => {}) {
		X(this, "t", 0), X(this, "playing", !1), X(this, "speed", 1), X(this, "raf", 0), X(this, "last", 0), X(this, "holdUntil", 0), X(this, "stopAt", null), X(this, "diagram", void 0), X(this, "onTick", void 0), X(this, "frame", (e) => {
			if (!this.playing) return;
			let t = Math.min(.1, (e - this.last) / 1e3) * this.speed;
			if (this.last = e, e < this.holdUntil) {
				this.raf = requestAnimationFrame(this.frame);
				return;
			}
			let n = this.stepIndex, r = this.t + t;
			if (this.stopAt !== null && r >= this.stopAt) {
				this.seek(this.stopAt), this.pause();
				return;
			}
			let i = this.diagram.steps[n];
			i && this.t < i.end && r >= i.end && n < this.diagram.steps.length - 1 && (r = i.end, this.holdUntil = e + 900 / this.speed), this.seek(r), this.t >= this.diagram.duration ? this.pause() : this.raf = requestAnimationFrame(this.frame);
		}), this.diagram = e, this.onTick = t;
	}
	get stepIndex() {
		let e = this.diagram.steps;
		for (let t = e.length - 1; t >= 0; t--) if (this.t >= e[t].start - .001) return t;
		return 0;
	}
	seek(e) {
		this.t = Math.max(0, Math.min(this.diagram.duration, e)), this.diagram.seek(this.t), this.onTick(this);
	}
	play(e = !1) {
		(e || this.t >= this.diagram.duration - .01) && this.seek(0), this.playing = !0, this.stopAt = null, this.last = performance.now(), cancelAnimationFrame(this.raf), this.raf = requestAnimationFrame(this.frame), this.onTick(this);
	}
	playStep(e) {
		let t = this.diagram.steps[e];
		t && (this.seek(t.start), this.playing = !0, this.stopAt = t.end, this.last = performance.now(), cancelAnimationFrame(this.raf), this.raf = requestAnimationFrame(this.frame), this.onTick(this));
	}
	next() {
		let e = this.stepIndex, t = this.diagram.steps[e];
		t && this.t < t.end - .01 ? this.playStep(e) : this.playStep(Math.min(e + 1, this.diagram.steps.length - 1));
	}
	prev() {
		let e = this.stepIndex, t = Math.max(0, e - 1);
		this.pause(), this.seek(t === 0 && e === 0 ? 0 : this.diagram.steps[t].end);
	}
	pause() {
		this.playing = !1, cancelAnimationFrame(this.raf), this.onTick(this);
	}
	finish() {
		this.pause(), this.seek(this.diagram.duration);
	}
	destroy() {
		cancelAnimationFrame(this.raf);
	}
}, Er = [
	"paper",
	"pen",
	"hand",
	"mess",
	"seed",
	"layout",
	"direction"
];
function Dr(e) {
	return Er.includes(e);
}
var Or = /* @__PURE__ */ new Set([
	"title",
	"version",
	"autoSteps",
	"diagnostics",
	"nodes",
	"edges",
	"annotations",
	"steps",
	"groups"
]);
function kr(e) {
	let t = vr(""), n = {}, r = [];
	for (let [i, a] of Object.entries(e)) {
		if (a == null || a === "") continue;
		let e = String(a).trim();
		if (!Dr(i)) {
			r.push({
				key: i,
				value: e,
				message: `"${i}" is not a setting. Settings are ${Er.join(", ")}.`
			});
			continue;
		}
		if (/\s/.test(e)) {
			r.push({
				key: i,
				value: e,
				message: `The ${i} "${e}" has a space in it.`
			});
			continue;
		}
		let o = vr(`${i} ${e}`), s = o.diagnostics.filter((e) => e.severity === "error");
		if (s.length) {
			let t = s[0];
			r.push({
				key: i,
				value: e,
				message: `${t.message}${t.hint ? ` ${t.hint}` : ""}`
			});
			continue;
		}
		let c = o;
		i in c && (n[i] = c[i]);
		for (let [e, r] of Object.entries(c)) Or.has(e) || typeof r == "object" && r || r !== t[e] && (n[e] = r);
	}
	return {
		overrides: n,
		problems: r
	};
}
// src/react/fonts.ts
var Ar = /* @__PURE__ */ new Map();
function jr(e) {
	return document.querySelector("link[data-inkling-fonts]") || Array.from(document.querySelectorAll("link[rel=\"stylesheet\"]")).some((t) => t.href === e || t.href.includes("family=Caveat")) ? Promise.resolve() : new Promise((t) => {
		let n = document.createElement("link");
		n.rel = "stylesheet", n.href = e, n.dataset.inklingFonts = "", n.onload = () => t(), n.onerror = () => t(), document.head.appendChild(n), setTimeout(t, 3e3);
	});
}
function Mr(e = Je) {
	let t = e ?? "", n = Ar.get(t);
	return n || (n = (e ? jr(e) : Promise.resolve()).then(() => {
		let e = document.fonts;
		if (e?.load) return Promise.all(Object.values(We).flatMap((t) => [e.load(`${t.weight} 20px '${t.family}'`), e.load(`700 20px '${t.family}'`)]));
	}).catch(() => void 0), Ar.set(t, n)), n;
}
// src/react/index.tsx
var Nr = (e) => Object.fromEntries(Er.map((t) => [t, e[t]]));
function Pr() {
	return typeof window < "u" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
function Fr(e, n = {}) {
	let o = i(null), [s, c] = a(null), [l, u] = a(null), [d, f] = a({
		playing: !1,
		step: 0,
		done: !0,
		started: !0
	}), p = i(n);
	t(() => {
		p.current = n;
	});
	let m = JSON.stringify(Nr(n)), { overrides: h, problems: g } = r(() => kr(Nr(n)), [m]), _ = r(() => g.map((e) => ({
		code: "E-BAD-OVERRIDE",
		severity: "error",
		message: `${e.key}="${e.value}": ${e.message}`,
		span: {
			line: 1,
			from: 0,
			to: 0
		}
	})), [g]), v = r(() => ({
		...vr(e),
		...h
	}), [e, h]), [y, b] = a(() => [..._, ...v.diagnostics]);
	t(() => {
		let t = o.current;
		if (!t) return;
		let n = !1, r = null, i = null, a;
		return Mr(p.current.fontCss).then(() => {
			if (n) return;
			let o = wr(t, e, h), s = !0, l = "", d = -1, m = new Tr(o, (e) => {
				let t = {
					playing: e.playing,
					step: e.stepIndex,
					done: e.t >= o.duration - .01,
					started: e.t > 0
				}, n = `${t.playing}${t.step}${t.done}${t.started}`;
				n !== l && (l = n, f(t)), !s && t.step !== d && p.current.onStepChange?.(t.step), d = t.step;
			});
			r = m;
			let { step: g, autoplay: v } = p.current;
			g !== void 0 && o.steps.length ? m.seek(o.steps[Math.max(0, Math.min(o.steps.length - 1, g))].end) : v && !Pr() ? (m.seek(0), typeof IntersectionObserver > "u" ? m.play(!0) : (i = new IntersectionObserver((e) => {
				e.some((e) => e.isIntersecting) && (m.play(!0), i?.disconnect());
			}), i.observe(t), a = setTimeout(() => {
				m.t === 0 && !m.playing && m.finish();
			}, 6e3))) : m.finish(), s = !1;
			let y = [..._, ...o.doc.diagnostics];
			c(o), u(m), b(y), p.current.onReady?.(o), p.current.onDiagnostics?.(y);
		}), () => {
			n = !0, i?.disconnect(), clearTimeout(a), r?.destroy();
		};
	}, [
		e,
		h,
		_
	]), t(() => {
		let e = o.current;
		return () => e?.replaceChildren();
	}, []);
	let x = n.step;
	return t(() => {
		if (!l || x === void 0 || !l.diagram.steps.length) return;
		let e = Math.max(0, Math.min(l.diagram.steps.length - 1, x));
		l.stepIndex !== e && (Pr() ? (l.pause(), l.seek(l.diagram.steps[e].end)) : l.playStep(e));
	}, [l, x]), {
		ref: o,
		diagram: s,
		diagnostics: y,
		player: l,
		state: d,
		doc: v
	};
}
var Ir = "\n.inkling{position:relative;border-radius:var(--inkling-radius,14px);overflow:hidden;background:var(--inkling-chrome,transparent);color:var(--inkling-text,inherit)}\n.inkling:focus-visible{outline:2px solid var(--inkling-accent,#4d7c0f);outline-offset:2px}\n.inkling-stage{line-height:0;overflow-x:auto}\n.inkling-stage svg,.inkling-ssr svg{display:block;max-width:100%;height:auto;margin:0 auto}\n.inkling-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;margin:0;padding:0}\n.inkling-controls{display:flex;align-items:center;gap:10px;padding:8px 12px;min-height:40px;box-sizing:border-box}\n.inkling-controls button{all:unset;cursor:pointer;display:inline-grid;place-items:center;width:28px;height:28px;border-radius:8px}\n.inkling-controls button:focus-visible{outline:2px solid var(--inkling-accent,#4d7c0f)}\n.inkling-dots{display:flex;gap:5px}\n.inkling-controls .inkling-dot{width:8px;height:8px;border-radius:50%;background:var(--inkling-dot,color-mix(in oklab,currentColor 22%,transparent))}\n.inkling-controls .inkling-dot[data-on]{background:var(--inkling-accent,#4d7c0f)}\n.inkling-caption{flex:1;min-width:0;color:var(--inkling-dim,inherit);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.inkling-error{margin:0;padding:12px 14px;color:var(--inkling-error,#c02626);font:13px/1.5 ui-monospace,monospace;white-space:pre-wrap}\n", Lr = ({ d: e }) => /* @__PURE__ */ o("svg", {
	width: "14",
	height: "14",
	viewBox: "0 0 14 14",
	"aria-hidden": "true",
	children: /* @__PURE__ */ o("path", {
		d: e,
		fill: "currentColor"
	})
}), Rr = "M3 1.5v11l9-5.5z", zr = "M3 1.5h3v11H3zM8 1.5h3v11H8z", Br = "M7 2a5 5 0 1 0 5 5h-1.6A3.4 3.4 0 1 1 7 3.6V6l3.2-3.2L7 -.4z";
function Vr(e) {
	try {
		let t = Qn(e);
		if (t.width > 0 && t.height > 0) return `${Math.round(t.width + 40)} / ${Math.round(t.height + 32)}`;
	} catch {}
}
var Hr = e(function(e, t) {
	let { source: a, controls: c = !0, ssrSvg: l, className: u, style: d, "aria-label": f, ...p } = e, m = Fr(a, p), { diagram: h, player: g, state: _, doc: v, diagnostics: y } = m, b = i(null);
	n(t, () => ({
		play: () => g?.play(),
		pause: () => g?.pause(),
		next: () => g?.next(),
		prev: () => g?.prev(),
		finish: () => g?.finish(),
		seek: (e) => g?.seek(e),
		playStep: (e) => g?.playStep(e),
		toSVG: () => h?.toSVG() ?? "",
		get diagram() {
			return h;
		},
		get player() {
			return g;
		},
		get element() {
			return b.current;
		}
	}), [h, g]);
	let x = r(() => Re(v), [v]), S = r(() => l ? void 0 : Vr(v), [v, l]), C = y.filter((e) => e.severity === "error"), w = h?.steps ?? [], T = w[_.step], E = T?.caption ? `${T.index}. ${T.caption}` : v.title ?? "", D = () => g?.playing ? g.pause() : g?.play();
	return /* @__PURE__ */ s("div", {
		ref: b,
		className: u ? `inkling ${u}` : "inkling",
		style: d,
		role: "group",
		tabIndex: 0,
		"aria-label": `${f ?? v.title ?? "Diagram"}. Space plays, arrow keys step.`,
		onKeyDown: (e) => {
			if (e.target === e.currentTarget && g) {
				if (e.key === " ") D();
				else if (e.key === "ArrowRight") g.next();
				else if (e.key === "ArrowLeft") g.prev();
				else return;
				e.preventDefault();
			}
		},
		"data-ready": h ? "" : void 0,
		children: [
			/* @__PURE__ */ o("style", { children: Ir }),
			/* @__PURE__ */ o("div", {
				ref: m.ref,
				className: "inkling-stage",
				style: {
					background: He[v.paper]?.ground,
					aspectRatio: h ? void 0 : S
				}
			}),
			!h && l ? /* @__PURE__ */ o("div", {
				className: "inkling-ssr",
				dangerouslySetInnerHTML: { __html: l }
			}) : null,
			/* @__PURE__ */ o("ul", {
				className: "inkling-sr",
				children: x.map((e, t) => /* @__PURE__ */ o("li", { children: e }, t))
			}),
			C.length ? /* @__PURE__ */ o("pre", {
				className: "inkling-error",
				role: "alert",
				children: C.map((e) => `${e.code === "E-BAD-OVERRIDE" ? "" : `Line ${e.span.line}: `}${e.message}${e.hint ? ` ${e.hint}` : ""}`).join("\n")
			}) : null,
			c ? /* @__PURE__ */ s("div", {
				className: "inkling-controls",
				children: [
					/* @__PURE__ */ o("button", {
						type: "button",
						className: "inkling-play",
						disabled: !g,
						"aria-label": _.playing ? "Pause" : _.done ? "Replay" : "Play",
						onClick: D,
						children: /* @__PURE__ */ o(Lr, { d: _.playing ? zr : _.done ? Br : Rr })
					}),
					w.length > 1 ? /* @__PURE__ */ o("div", {
						className: "inkling-dots",
						children: w.map((e, t) => /* @__PURE__ */ o("button", {
							type: "button",
							className: "inkling-dot",
							"data-on": t <= _.step && _.started ? "" : void 0,
							"aria-label": `Step ${e.index}${e.caption ? `: ${e.caption}` : ""}`,
							"aria-current": t === _.step ? "step" : void 0,
							onClick: () => g?.playStep(t)
						}, t))
					}) : null,
					/* @__PURE__ */ o("div", {
						className: "inkling-caption",
						children: E
					})
				]
			}) : null
		]
	});
});
export { Hr as Inkling, Tr as Player, Fr as useInkling };

//# sourceMappingURL=inkling-react.js.map