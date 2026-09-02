import { i as __toESM } from "../_runtime.mjs";
import { a as useThree, c as Vector3, d as require_react, i as useFrame, o as Mesh, r as Canvas, s as PerspectiveCamera, t as Html, u as require_jsx_runtime } from "../_libs/@react-three/drei+[...].mjs";
import { i as Camera, n as Volume2, t as VolumeX } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DLpCBXdk.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function loadImg(src) {
	return new Promise((resolve) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = () => resolve(null);
		img.src = src;
	});
}
async function loadImages() {
	const [dirt, grass, money, nitro, title] = await Promise.all([
		loadImg("/game/dirt.jpg"),
		loadImg("/game/grass.jpg"),
		loadImg("/game/money.png"),
		loadImg("/game/nitro.png"),
		loadImg("/game/title.jpg")
	]);
	return {
		dirt,
		grass,
		money,
		nitro,
		title
	};
}
var AudioSys = class {
	ctx = null;
	master = null;
	sfx = null;
	muted = false;
	engine = null;
	engineGain = null;
	engineFilter = null;
	noise = null;
	noiseGain = null;
	unlock() {
		if (this.ctx) {
			if (this.ctx.state === "suspended") this.ctx.resume();
			return;
		}
		const Ctx = window.AudioContext || window.webkitAudioContext;
		this.ctx = new Ctx({ latencyHint: "interactive" });
		this.master = this.ctx.createGain();
		this.sfx = this.ctx.createGain();
		this.sfx.gain.value = .7;
		this.master.gain.value = this.muted ? 0 : .55;
		this.sfx.connect(this.master);
		this.master.connect(this.ctx.destination);
		this.startEngine();
	}
	setMuted(m) {
		this.muted = m;
		if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : .55, this.ctx.currentTime, .03);
	}
	startEngine() {
		if (!this.ctx || !this.master || this.engine) return;
		const osc = this.ctx.createOscillator();
		osc.type = "sawtooth";
		osc.frequency.value = 42;
		const filter = this.ctx.createBiquadFilter();
		filter.type = "lowpass";
		filter.frequency.value = 420;
		const g = this.ctx.createGain();
		g.gain.value = 0;
		osc.connect(filter);
		filter.connect(g);
		g.connect(this.master);
		osc.start();
		this.engine = osc;
		this.engineGain = g;
		this.engineFilter = filter;
		const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * .4, this.ctx.sampleRate);
		const data = buf.getChannelData(0);
		for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
		const src = this.ctx.createBufferSource();
		src.buffer = buf;
		src.loop = true;
		const ng = this.ctx.createGain();
		ng.gain.value = 0;
		const nf = this.ctx.createBiquadFilter();
		nf.type = "bandpass";
		nf.frequency.value = 900;
		src.connect(nf);
		nf.connect(ng);
		ng.connect(this.master);
		src.start();
		this.noise = src;
		this.noiseGain = ng;
	}
	engineTo(speed, nitro, racing) {
		if (!this.ctx || !this.engine || !this.engineGain || !this.engineFilter) return;
		const t = this.ctx.currentTime;
		const on = racing && speed > 2;
		const freq = 38 + speed * 1.15 + (nitro ? 40 : 0);
		this.engine.frequency.setTargetAtTime(freq, t, .05);
		this.engineFilter.frequency.setTargetAtTime(380 + speed * 4 + (nitro ? 500 : 0), t, .05);
		this.engineGain.gain.setTargetAtTime(on ? .05 + Math.min(.12, speed / 1400) : 0, t, .08);
		this.noiseGain?.gain.setTargetAtTime(on ? .015 + speed / 8e3 : 0, t, .08);
	}
	beep(freq, dur = .12, type = "square", vol = .12) {
		if (!this.ctx || !this.sfx) return;
		const t = this.ctx.currentTime;
		const o = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		o.type = type;
		o.frequency.value = freq;
		g.gain.setValueAtTime(vol, t);
		g.gain.exponentialRampToValueAtTime(.001, t + dur);
		o.connect(g);
		g.connect(this.sfx);
		o.start(t);
		o.stop(t + dur + .02);
	}
	countdown(n) {
		if (n <= 0) this.beep(880, .28, "square", .16);
		else this.beep(440, .16, "square", .12);
	}
	bump() {
		this.beep(90, .1, "triangle", .18);
	}
	land() {
		this.beep(70, .14, "sine", .14);
	}
	pickup() {
		this.beep(720, .08, "square", .1);
		setTimeout(() => this.beep(980, .1, "square", .1), 60);
	}
	nitro() {
		if (!this.ctx || !this.sfx) return;
		const t = this.ctx.currentTime;
		const o = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		o.type = "sawtooth";
		o.frequency.setValueAtTime(180, t);
		o.frequency.exponentialRampToValueAtTime(520, t + .35);
		g.gain.setValueAtTime(.1, t);
		g.gain.exponentialRampToValueAtTime(.001, t + .4);
		o.connect(g);
		g.connect(this.sfx);
		o.start(t);
		o.stop(t + .42);
	}
	finish(win) {
		if (win) {
			this.beep(523, .14);
			setTimeout(() => this.beep(659, .14), 120);
			setTimeout(() => this.beep(784, .28), 240);
		} else this.beep(200, .3, "triangle", .1);
	}
};
var DRAG = .55;
var COAST = 1.65;
var TURN_RATE = 4.4;
var NITRO_TIME = .9;
var NITRO_MULT = 1.58;
var START_MONEY = 2e4;
var STEP = 1 / 60;
var PRIZE = [
	1e5,
	8e4,
	7e4,
	0
];
var UPGRADE_COST = {
	nitro: 1e3,
	tires: 4e4,
	shocks: 6e4,
	accel: 8e4,
	topSpeed: 1e5
};
var TRUCK_PALETTE = {
	red: {
		body: "#d4322b",
		dark: "#7a1612",
		light: "#f07868",
		name: "Russet",
		driver: "Red"
	},
	yellow: {
		body: "#e0b81a",
		dark: "#8a6e08",
		light: "#f5dc6a",
		name: "Yukon Gold",
		driver: "Yellow"
	},
	blue: {
		body: "#2a62d0",
		dark: "#163a88",
		light: "#6aa0ee",
		name: "Blue Congo",
		driver: "Blue"
	},
	white: {
		body: "#ecece8",
		dark: "#6e6e6a",
		light: "#ffffff",
		name: "Iron Spud",
		driver: "White"
	}
};
var EMPTY_UPGRADES = {
	tires: 0,
	shocks: 0,
	accel: 0,
	topSpeed: 0
};
var PLAYER_COLORS = [
	"red",
	"yellow",
	"blue"
];
function clamp(n, a, b) {
	return n < a ? a : n > b ? b : n;
}
function wrapPi(a) {
	while (a > Math.PI) a -= Math.PI * 2;
	while (a < -Math.PI) a += Math.PI * 2;
	return a;
}
function shadeHex(hex, k) {
	const n = parseInt(hex.slice(1), 16);
	let r = n >> 16 & 255;
	let g = n >> 8 & 255;
	let b = n & 255;
	r = clamp(r * (1 + k), 0, 255);
	g = clamp(g * (1 + k), 0, 255);
	b = clamp(b * (1 + k), 0, 255);
	return `rgb(${r | 0},${g | 0},${b | 0})`;
}
function formatCash(n) {
	return `$${Math.max(0, Math.round(n)).toLocaleString("en-US")}`;
}
function hash2(x, y) {
	let n = Math.imul(Math.floor(x * 13.1) ^ 2654435769, 374761393) + Math.imul(Math.floor(y * 17.7), 668265263);
	n = (n ^ n >>> 13) * 1274126177;
	return ((n ^ n >>> 16) >>> 0) / 4294967296;
}
function mulberry32(seed) {
	let a = seed >>> 0;
	return () => {
		a = a + 1831565813 >>> 0;
		let t = Math.imul(a ^ a >>> 15, 1 | a);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
function straightPath() {
	const s = 160;
	const y = s / 2;
	return [
		{
			x: 0,
			y
		},
		{
			x: s * .25,
			y
		},
		{
			x: s * .5,
			y
		},
		{
			x: s * .75,
			y
		},
		{
			x: s,
			y
		}
	];
}
function cornerPath() {
	const s = 160;
	const r = s / 2;
	const n = 16;
	const pts = [];
	for (let i = 0; i <= n; i++) {
		const a = -Math.PI / 2 + i / n * (Math.PI / 2);
		pts.push({
			x: Math.cos(a) * r,
			y: s + Math.sin(a) * r
		});
	}
	return pts;
}
/** Fill a local-space clip with a world-aligned pattern so neighboring parts share texture. */
function fillWorldClipped(ctx, pattern, fallback, shape) {
	ctx.save();
	ctx.beginPath();
	shape();
	ctx.clip();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.fillStyle = pattern ?? fallback;
	ctx.fillRect(0, 0, 800, 480);
	ctx.restore();
}
function localToWorld(lx, ly, env) {
	const p = rotateLocal(lx, ly, env.rot);
	return {
		x: env.ox + env.col * 160 + p.x,
		y: env.oy + env.row * 160 + p.y
	};
}
/** 0 at the ports, 1 in the middle — keeps snap faces exact. */
function portWindow(lx) {
	const t = clamp(lx / 160, 0, 1);
	return Math.sin(t * Math.PI);
}
function edgeWave(lx, env, sign) {
	const w = localToWorld(lx, 80, env);
	const n = hash2(w.x * .35 + sign * 80, w.y * .35);
	return portWindow(lx) ** 2 * (n - .5) * 1.4;
}
function addStraightBand(ctx, env, inflate, pad) {
	const s = 160;
	const mid = s / 2;
	const hw = 76 + inflate;
	const steps = 18;
	ctx.moveTo(-pad, mid - hw);
	for (let i = 0; i <= steps; i++) {
		const lx = -pad + (s + pad * 2) * i / steps;
		ctx.lineTo(lx, mid - hw + edgeWave(clamp(lx, 0, s), env, -1));
	}
	for (let i = steps; i >= 0; i--) {
		const lx = -pad + (s + pad * 2) * i / steps;
		ctx.lineTo(lx, mid + hw + edgeWave(clamp(lx, 0, s), env, 1));
	}
	ctx.closePath();
}
function addCornerBand(ctx, inflate, over = 0) {
	const s = 160;
	const outer = 156 + inflate;
	const inner = Math.max(4, 4 - inflate);
	ctx.arc(0, s, outer, over, -Math.PI / 2 - over, true);
	ctx.arc(0, s, inner, -Math.PI / 2 - over, over, false);
	ctx.closePath();
}
function addCornerCaps(ctx, inflate, pad) {
	const s = 160;
	const hw = 76 + inflate;
	ctx.rect(-pad, s / 2 - hw, pad + 2, hw * 2);
	ctx.rect(s / 2 - hw, 158, hw * 2, pad + 2);
}
/**
* One definition — every straight on every track uses this.
* Edit here and the whole course updates.
*/
function paintStraight(ctx, env, layer) {
	const s = 160;
	const mid = s / 2;
	if (layer === "apron") {
		ctx.fillStyle = "#4a3018";
		ctx.beginPath();
		addStraightBand(ctx, env, 4, 0);
		ctx.fill();
		return;
	}
	if (layer === "dirt") {
		fillWorldClipped(ctx, env.dirt, "#c49648", () => {
			addStraightBand(ctx, env, 0, 3);
		});
		return;
	}
	const edge = ctx.createLinearGradient(0, 4, 0, 156);
	edge.addColorStop(0, "rgba(58, 32, 14, 0.5)");
	edge.addColorStop(.12, "rgba(58, 32, 14, 0)");
	edge.addColorStop(.88, "rgba(58, 32, 14, 0)");
	edge.addColorStop(1, "rgba(58, 32, 14, 0.5)");
	ctx.save();
	ctx.beginPath();
	addStraightBand(ctx, env, 0, 3);
	ctx.clip();
	ctx.fillStyle = edge;
	ctx.fillRect(-3, 0, 166, 160);
	ctx.restore();
	ctx.save();
	ctx.beginPath();
	addStraightBand(ctx, env, -18, 3);
	ctx.clip();
	const worn = ctx.createLinearGradient(0, 52, 0, 108);
	worn.addColorStop(0, "rgba(232, 196, 118, 0)");
	worn.addColorStop(.5, "rgba(232, 196, 118, 0.2)");
	worn.addColorStop(1, "rgba(232, 196, 118, 0)");
	ctx.fillStyle = worn;
	ctx.fillRect(-3, 50, 166, 60);
	ctx.restore();
	ctx.save();
	ctx.beginPath();
	addStraightBand(ctx, env, 0, 3);
	ctx.clip();
	ctx.lineCap = "butt";
	ctx.lineJoin = "round";
	const rut = (offset, alpha, width) => {
		ctx.beginPath();
		ctx.strokeStyle = `rgba(52, 30, 14, ${alpha})`;
		ctx.lineWidth = width;
		for (let i = 0; i <= 24; i++) {
			const lx = -3 + 166 * i / 24;
			const w = localToWorld(clamp(lx, 0, s), mid, env);
			const along = env.rot % 2 === 0 ? w.x : w.y;
			const y = mid + offset + Math.sin(along * .13) * .9;
			if (i === 0) ctx.moveTo(lx, y);
			else ctx.lineTo(lx, y);
		}
		ctx.stroke();
	};
	rut(-16.5, .26, 2.6);
	rut(16.5, .26, 2.6);
	rut(-16.5, .12, 1.2);
	rut(16.5, .12, 1.2);
	ctx.restore();
	for (let i = 0; i < 36; i++) {
		const lx = (i + .3) * (s / 36);
		const side = i % 2 === 0 ? -1 : 1;
		const wy = mid + side * (70 - hash2(lx, i) * 10);
		const w = localToWorld(lx, wy, env);
		const h = hash2(w.x, w.y);
		if (h < .22) continue;
		if (h > .86) {
			ctx.fillStyle = "rgba(46, 90, 32, 0.45)";
			ctx.beginPath();
			ctx.ellipse(lx, mid + side * 77, 2.2, 1.3, .2, 0, Math.PI * 2);
			ctx.fill();
		} else {
			ctx.fillStyle = h > .6 ? "rgba(62, 38, 18, 0.4)" : "rgba(210, 168, 96, 0.3)";
			ctx.beginPath();
			ctx.ellipse(lx + (h - .5) * 4, wy, 1.1 + h * 1.7, .7 + h, .5, 0, Math.PI * 2);
			ctx.fill();
		}
	}
}
/**
* Quarter-turn from west to south. Same road width as the straight so they snap.
*/
function paintCorner(ctx, env, layer) {
	const s = 160;
	const r = s / 2;
	const hw = 76;
	if (layer === "apron") {
		ctx.fillStyle = "#4a3018";
		ctx.beginPath();
		addCornerBand(ctx, 4, 0);
		ctx.fill();
		return;
	}
	if (layer === "dirt") {
		fillWorldClipped(ctx, env.dirt, "#c49648", () => {
			addCornerBand(ctx, 0, 0);
			addCornerCaps(ctx, 0, 4);
		});
		return;
	}
	ctx.save();
	ctx.beginPath();
	addCornerBand(ctx, 0, 0);
	addCornerCaps(ctx, 0, 4);
	ctx.clip();
	ctx.strokeStyle = "rgba(58, 32, 14, 0.45)";
	ctx.lineWidth = 6;
	ctx.beginPath();
	ctx.arc(0, s, 154, 0, -Math.PI / 2, true);
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(0, s, 6, 0, -Math.PI / 2, true);
	ctx.stroke();
	ctx.strokeStyle = "rgba(232, 196, 118, 0.18)";
	ctx.lineWidth = hw * .42;
	ctx.beginPath();
	ctx.arc(0, s, r, 0, -Math.PI / 2, true);
	ctx.stroke();
	ctx.strokeStyle = "rgba(52, 30, 14, 0.26)";
	ctx.lineWidth = 2.6;
	ctx.beginPath();
	ctx.arc(0, s, 63.5, 0, -Math.PI / 2, true);
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(0, s, 96.5, 0, -Math.PI / 2, true);
	ctx.stroke();
	ctx.restore();
	for (let i = 0; i < 22; i++) {
		const a = i / 22 * (-Math.PI / 2);
		const wld = localToWorld(Math.cos(a) * r, s + Math.sin(a) * r, env);
		const h = hash2(wld.x, wld.y);
		if (h < .28) continue;
		const rad = r + (h > .7 ? 71 : -71);
		const lx = Math.cos(a) * rad;
		const ly = s + Math.sin(a) * rad;
		ctx.fillStyle = h > .88 ? "rgba(46, 90, 32, 0.4)" : h > .6 ? "rgba(62, 38, 18, 0.38)" : "rgba(210, 168, 96, 0.26)";
		ctx.beginPath();
		ctx.ellipse(lx, ly, 1.3 + h, .9, a, 0, Math.PI * 2);
		ctx.fill();
	}
}
var PARTS = {
	straight: {
		id: "straight",
		localPath: straightPath(),
		paint: paintStraight
	},
	corner: {
		id: "corner",
		localPath: cornerPath(),
		paint: paintCorner
	}
};
/**
* Basic stadium loop: 4 corners, 2 straights on each long side, 1 on each short side.
* All parts are PART_SIZE square and snap on the grid.
*/
var TEST_LOOP = {
	id: "test-loop",
	name: "Test Loop",
	blurb: "Four corners. Two straights a side. Snap-together parts.",
	cols: 4,
	rows: 3,
	cells: [
		{
			id: "corner",
			rot: 3
		},
		{
			id: "straight",
			rot: 0
		},
		{
			id: "straight",
			rot: 0
		},
		{
			id: "corner",
			rot: 0
		},
		{
			id: "straight",
			rot: 1
		},
		null,
		null,
		{
			id: "straight",
			rot: 1
		},
		{
			id: "corner",
			rot: 2
		},
		{
			id: "straight",
			rot: 0
		},
		{
			id: "straight",
			rot: 0
		},
		{
			id: "corner",
			rot: 1
		}
	],
	loop: [
		{
			col: 1,
			row: 0,
			reverse: true
		},
		{
			col: 0,
			row: 0,
			reverse: true
		},
		{
			col: 0,
			row: 1,
			reverse: false
		},
		{
			col: 0,
			row: 2,
			reverse: true
		},
		{
			col: 1,
			row: 2,
			reverse: false
		},
		{
			col: 2,
			row: 2,
			reverse: false
		},
		{
			col: 3,
			row: 2,
			reverse: true
		},
		{
			col: 3,
			row: 1,
			reverse: true
		},
		{
			col: 3,
			row: 0,
			reverse: true
		},
		{
			col: 2,
			row: 0,
			reverse: true
		}
	]
};
function rotateLocal(lx, ly, rot) {
	const c = 80;
	const dx = lx - c;
	const dy = ly - c;
	let rx = dx;
	let ry = dy;
	if (rot === 1) {
		rx = -dy;
		ry = dx;
	} else if (rot === 2) {
		rx = -dx;
		ry = -dy;
	} else if (rot === 3) {
		rx = dy;
		ry = -dx;
	}
	return {
		x: rx + c,
		y: ry + c
	};
}
function worldOf(lx, ly, col, row, rot, ox, oy) {
	const p = rotateLocal(lx, ly, rot);
	return {
		x: ox + col * 160 + p.x,
		y: oy + row * 160 + p.y
	};
}
function withPartLocal(ctx, part, ox, oy, fn) {
	const s = 160;
	ctx.save();
	ctx.translate(ox + part.col * s + s / 2, oy + part.row * s + s / 2);
	ctx.rotate(part.rot * Math.PI / 2);
	ctx.translate(-80, -80);
	fn();
	ctx.restore();
}
function cellAt(layout, col, row) {
	if (col < 0 || row < 0 || col >= layout.cols || row >= layout.rows) return null;
	return layout.cells[row * layout.cols + col] ?? null;
}
function transformPath(local, col, row, rot, ox, oy, reverse) {
	const pts = local.map((p) => worldOf(p.x, p.y, col, row, rot, ox, oy));
	return reverse ? pts.reverse() : pts;
}
function alongPath(path, cum, total, t01, offset) {
	let d = (t01 * total % total + total) % total;
	let i = 0;
	while (i < path.length - 1 && cum[i + 1] < d) i++;
	const a = path[i];
	const b = path[(i + 1) % path.length];
	const seg = Math.max(1e-4, cum[i + 1] - cum[i]);
	const t = clamp((d - cum[i]) / seg, 0, 1);
	const x = a.x + (b.x - a.x) * t;
	const y = a.y + (b.y - a.y) * t;
	let tx = b.x - a.x;
	let ty = b.y - a.y;
	const len = Math.hypot(tx, ty) || 1;
	tx /= len;
	ty /= len;
	const nx = -ty;
	const ny = tx;
	return {
		x: x + nx * offset,
		y: y + ny * offset,
		angle: Math.atan2(ty, tx)
	};
}
function cumlen$1(path) {
	const cum = [0];
	let total = 0;
	for (let i = 0; i < path.length; i++) {
		const a = path[i];
		const b = path[(i + 1) % path.length];
		total += Math.hypot(b.x - a.x, b.y - a.y);
		cum.push(total);
	}
	return {
		cum,
		total
	};
}
function scatterOnParts(path, nParts, rng) {
	const { cum, total } = cumlen$1(path);
	const hills = [];
	const puddles = [];
	const pickups = [];
	for (let i = 0; i < nParts; i++) {
		if (rng() < .18) continue;
		const t = (i + .28 + rng() * .44) / nParts;
		if (t < .04 || t > .96) continue;
		const off = (rng() - .5) * 152 * .28;
		const roll = rng();
		if (roll < .36) {
			const a = alongPath(path, cum, total, t, off);
			pickups.push({
				x: a.x,
				y: a.y,
				kind: "money"
			});
		} else if (roll < .52) {
			const a = alongPath(path, cum, total, t, off);
			pickups.push({
				x: a.x,
				y: a.y,
				kind: "nitro"
			});
		} else if (roll < .82) {
			const a = alongPath(path, cum, total, t, off * .4);
			puddles.push({
				x: a.x,
				y: a.y,
				r: 14 + rng() * 10
			});
		} else {
			const a = alongPath(path, cum, total, t, 0);
			hills.push({
				x: a.x,
				y: a.y,
				r: 26 + rng() * 16,
				h: 9 + rng() * 8
			});
		}
	}
	if (pickups.length === 0) {
		const a = alongPath(path, cum, total, .3, 16);
		pickups.push({
			x: a.x,
			y: a.y,
			kind: "money"
		});
	}
	return {
		hills,
		puddles,
		pickups
	};
}
function offsetClosed(path, dist) {
	const n = path.length;
	const out = [];
	for (let i = 0; i < n; i++) {
		const a = path[(i - 1 + n) % n];
		const b = path[i];
		const c = path[(i + 1) % n];
		let tx1 = b.x - a.x;
		let ty1 = b.y - a.y;
		let tx2 = c.x - b.x;
		let ty2 = c.y - b.y;
		const l1 = Math.hypot(tx1, ty1) || 1;
		const l2 = Math.hypot(tx2, ty2) || 1;
		tx1 /= l1;
		ty1 /= l1;
		tx2 /= l2;
		ty2 /= l2;
		let tx = tx1 + tx2;
		let ty = ty1 + ty2;
		const l = Math.hypot(tx, ty) || 1;
		tx /= l;
		ty /= l;
		out.push({
			x: b.x + -ty * dist,
			y: b.y + tx * dist
		});
	}
	return out;
}
function tiresAlong(ring, r) {
	const tires = [];
	const spacing = r * 2.08;
	let carry = 0;
	for (let i = 0; i < ring.length; i++) {
		const a = ring[i];
		const b = ring[(i + 1) % ring.length];
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const len = Math.hypot(dx, dy);
		if (len < .2) continue;
		let d = spacing - carry;
		while (d <= len) {
			const t = d / len;
			tires.push({
				x: a.x + dx * t,
				y: a.y + dy * t,
				r
			});
			d += spacing;
		}
		carry = len - (d - spacing);
	}
	return tires;
}
function assembleLayout(layout, seed = 1) {
	const ox = (800 - layout.cols * 160) / 2;
	const oy = (480 - layout.rows * 160) / 2;
	const placed = [];
	for (let row = 0; row < layout.rows; row++) for (let col = 0; col < layout.cols; col++) {
		const cell = cellAt(layout, col, row);
		if (cell) placed.push({
			id: cell.id,
			col,
			row,
			rot: cell.rot
		});
	}
	const path = [];
	for (const step of layout.loop) {
		const cell = cellAt(layout, step.col, step.row);
		if (!cell) continue;
		const def = PARTS[cell.id];
		const pts = transformPath(def.localPath, step.col, step.row, cell.rot, ox, oy, step.reverse);
		if (path.length) path.push(...pts.slice(1));
		else path.push(...pts);
	}
	const wallRings = [offsetClosed(path, 74), offsetClosed(path, -74)];
	const tires = wallRings.flatMap((ring) => tiresAlong(ring, 6));
	const rng = mulberry32(seed);
	const deco = scatterOnParts(path, layout.loop.length, rng);
	return {
		id: layout.id,
		name: layout.name,
		blurb: layout.blurb,
		path,
		width: 152,
		hills: deco.hills,
		ramps: [],
		puddles: deco.puddles,
		tires,
		pickups: deco.pickups,
		placed,
		originX: ox,
		originY: oy,
		wallRings
	};
}
function paintPlacedPart(ctx, part, ox, oy, dirt, layer) {
	const def = PARTS[part.id];
	withPartLocal(ctx, part, ox, oy, () => {
		def.paint(ctx, {
			dirt,
			col: part.col,
			row: part.row,
			rot: part.rot,
			ox,
			oy
		}, layer);
	});
}
function ellipse(cx, cy, rx, ry, n = 96, wobble = 0, wobbleFreq = 3) {
	const pts = [];
	for (let i = 0; i < n; i++) {
		const t = -Math.PI / 2 - i / n * Math.PI * 2;
		const w = wobble ? 1 + wobble * Math.sin(t * wobbleFreq) : 1;
		pts.push({
			x: cx + Math.cos(t) * rx * w,
			y: cy + Math.sin(t) * ry * w
		});
	}
	return pts;
}
function figure8(cx, cy, ax, ay, n = 120) {
	const pts = [];
	for (let i = 0; i < n; i++) {
		const t = i / n * Math.PI * 2 + Math.PI / 2;
		pts.push({
			x: cx + ax * Math.sin(t),
			y: cy + ay * Math.sin(t) * Math.cos(t)
		});
	}
	return pts;
}
function roundedRect(cx, cy, w, h, r, n = 96) {
	const pts = [];
	const segs = Math.max(4, Math.floor(n / 4));
	const hw = w / 2 - r;
	const hh = h / 2 - r;
	const corners = [
		{
			x: cx + hw,
			y: cy - hh,
			a0: -Math.PI / 2,
			a1: 0
		},
		{
			x: cx + hw,
			y: cy + hh,
			a0: 0,
			a1: Math.PI / 2
		},
		{
			x: cx - hw,
			y: cy + hh,
			a0: Math.PI / 2,
			a1: Math.PI
		},
		{
			x: cx - hw,
			y: cy - hh,
			a0: Math.PI,
			a1: 3 * Math.PI / 2
		}
	];
	for (const c of corners) for (let i = 0; i < segs; i++) {
		const a = c.a0 + (c.a1 - c.a0) * i / segs;
		pts.push({
			x: c.x + Math.cos(a) * r,
			y: c.y + Math.sin(a) * r
		});
	}
	pts.reverse();
	let best = 0;
	let bestY = Infinity;
	for (let i = 0; i < pts.length; i++) if (pts[i].y < bestY) {
		bestY = pts[i].y;
		best = i;
	}
	return pts.slice(best).concat(pts.slice(0, best));
}
function cumlen(path) {
	const cum = [0];
	let total = 0;
	for (let i = 0; i < path.length; i++) {
		const a = path[i];
		const b = path[(i + 1) % path.length];
		total += Math.hypot(b.x - a.x, b.y - a.y);
		cum.push(total);
	}
	return {
		cum,
		total
	};
}
function samplePath(path, cum, total, s) {
	let d = (s % total + total) % total;
	let i = 0;
	while (i < path.length - 1 && cum[i + 1] < d) i++;
	const a = path[i];
	const b = path[(i + 1) % path.length];
	const seg = Math.max(1e-4, cum[i + 1] - cum[i]);
	const t = clamp((d - cum[i]) / seg, 0, 1);
	const p = {
		x: a.x + (b.x - a.x) * t,
		y: a.y + (b.y - a.y) * t
	};
	let tx = b.x - a.x;
	let ty = b.y - a.y;
	const len = Math.hypot(tx, ty) || 1;
	tx /= len;
	ty /= len;
	return {
		p,
		tx,
		ty,
		nx: -ty,
		ny: tx
	};
}
function along(path, cum, total, t01, offset = 0) {
	const s = samplePath(path, cum, total, t01 * total);
	return {
		x: s.p.x + s.nx * offset,
		y: s.p.y + s.ny * offset,
		angle: Math.atan2(s.ty, s.tx),
		...s
	};
}
function closestDist(path, x, y) {
	let best = Infinity;
	let bestI = 0;
	let bestT = 0;
	for (let i = 0; i < path.length; i++) {
		const a = path[i];
		const b = path[(i + 1) % path.length];
		const abx = b.x - a.x;
		const aby = b.y - a.y;
		const apx = x - a.x;
		const apy = y - a.y;
		const ab2 = abx * abx + aby * aby || 1;
		const t = clamp((apx * abx + apy * aby) / ab2, 0, 1);
		const px = a.x + abx * t;
		const py = a.y + aby * t;
		const d = Math.hypot(x - px, y - py);
		if (d < best) {
			best = d;
			bestI = i;
			bestT = t;
		}
	}
	return {
		dist: best,
		sIndex: bestI,
		t: bestT,
		d: best
	};
}
function buildHeight(def) {
	const hm = /* @__PURE__ */ new Float32Array(24e3);
	const set = (ix, iy, v) => {
		if (ix < 0 || iy < 0 || ix >= 200 || iy >= 120) return;
		const i = iy * 200 + ix;
		if (v > hm[i]) hm[i] = v;
	};
	for (const hill of def.hills) {
		const r = hill.r;
		const x0 = Math.floor((hill.x - r) / 800 * 200);
		const x1 = Math.ceil((hill.x + r) / 800 * 200);
		const y0 = Math.floor((hill.y - r) / 480 * 120);
		const y1 = Math.ceil((hill.y + r) / 480 * 120);
		for (let iy = y0; iy <= y1; iy++) for (let ix = x0; ix <= x1; ix++) {
			const wx = (ix + .5) / 200 * 800;
			const wy = (iy + .5) / 120 * 480;
			const d = Math.hypot(wx - hill.x, wy - hill.y) / r;
			if (d < 1) {
				const k = .5 + .5 * Math.cos(d * Math.PI);
				set(ix, iy, hill.h * k);
			}
		}
	}
	for (const ramp of def.ramps) {
		const ca = Math.cos(ramp.angle);
		const sa = Math.sin(ramp.angle);
		const hw = ramp.w / 2;
		const x0 = Math.floor((ramp.x - ramp.len - hw) / 800 * 200);
		const x1 = Math.ceil((ramp.x + ramp.len + hw) / 800 * 200);
		const y0 = Math.floor((ramp.y - ramp.len - hw) / 480 * 120);
		const y1 = Math.ceil((ramp.y + ramp.len + hw) / 480 * 120);
		for (let iy = y0; iy <= y1; iy++) for (let ix = x0; ix <= x1; ix++) {
			const wx = (ix + .5) / 200 * 800;
			const wy = (iy + .5) / 120 * 480;
			const dx = wx - ramp.x;
			const dy = wy - ramp.y;
			const localY = dx * ca + dy * sa;
			const localX = -dx * sa + dy * ca;
			if (localY >= 0 && localY <= ramp.len && Math.abs(localX) <= hw) {
				const k = localY / ramp.len;
				set(ix, iy, ramp.h * k);
			}
		}
	}
	return hm;
}
function heightAt(track, x, y) {
	const u = clamp(x / 800 * track.hmW, 0, track.hmW - 1.001);
	const v = clamp(y / 480 * track.hmH, 0, track.hmH - 1.001);
	const x0 = Math.floor(u);
	const y0 = Math.floor(v);
	const fx = u - x0;
	const fy = v - y0;
	const i = y0 * track.hmW + x0;
	const a = track.height[i];
	return lerp2(a, track.height[i + 1] ?? a, track.height[i + track.hmW] ?? a, track.height[i + track.hmW + 1] ?? a, fx, fy);
}
function lerp2(a, b, c, d, fx, fy) {
	return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
}
function offTrackDist(track, x, y) {
	return closestDist(track.path, x, y).dist;
}
function progressAt(track, x, y) {
	const c = closestDist(track.path, x, y);
	const d0 = track.cum[c.sIndex];
	return (d0 + ((track.cum[c.sIndex + 1] ?? track.totalLen) - d0) * c.t) / track.totalLen;
}
function pathHeading(track, t01) {
	const s = samplePath(track.path, track.cum, track.totalLen, t01 * track.totalLen);
	return Math.atan2(-s.tx, -s.ty);
}
function inPuddle(track, x, y) {
	for (const p of track.puddles) if (Math.hypot(x - p.x, y - p.y) < p.r) return p;
	return null;
}
function decorate(path, width, hillsT, rampsT, puddlesT, tiresT, bags) {
	const { cum, total } = cumlen(path);
	return {
		hills: hillsT.map((h) => {
			const a = along(path, cum, total, h.t, h.off ?? 0);
			return {
				x: a.x,
				y: a.y,
				r: h.r,
				h: h.h
			};
		}),
		ramps: rampsT.map((r) => {
			const a = along(path, cum, total, r.t, 0);
			const ang = Math.atan2(a.ty, a.tx);
			return {
				x: a.x - Math.cos(ang) * r.len * .15,
				y: a.y - Math.sin(ang) * r.len * .15,
				angle: ang,
				len: r.len,
				w: r.w,
				h: r.h
			};
		}),
		puddles: puddlesT.map((p) => {
			const a = along(path, cum, total, p.t, p.off ?? 0);
			return {
				x: a.x,
				y: a.y,
				r: p.r
			};
		}),
		tires: [...tiresT.map((t) => {
			const a = along(path, cum, total, t.t, t.off);
			return {
				x: a.x,
				y: a.y,
				r: t.r ?? 9
			};
		})],
		pickups: bags.map((b) => {
			const a = along(path, cum, total, b.t, b.off);
			return {
				x: a.x,
				y: a.y,
				kind: b.kind
			};
		})
	};
}
function makeTrack(id, name, blurb, path, width, extra) {
	return {
		id,
		name,
		blurb,
		path,
		width,
		hills: extra.hills,
		ramps: extra.ramps,
		puddles: extra.puddles,
		tires: [...extra.tires, ...extra.extraTires ?? []],
		pickups: extra.pickups
	};
}
function buildDefs() {
	const c = {
		x: 400,
		y: 240
	};
	const sidewinder = ellipse(c.x, c.y, 305, 172, 100, .04, 4);
	const wipeout = figure8(c.x, c.y, 250, 175, 128);
	const blaster = ellipse(c.x, c.y, 300, 168, 96);
	const fandango = ellipse(c.x, c.y, 290, 160, 110, .16, 3);
	const huevos = ellipse(c.x, c.y, 318, 178, 96, .02, 2);
	const cliff = ellipse(c.x, c.y, 288, 158, 100, .08, 5);
	const dukes = roundedRect(c.x, c.y, 620, 360, 88, 100);
	const gulch = ellipse(c.x, c.y, 300, 165, 120, .12, 4);
	return [
		makeTrack("sidewinder", "Sidewinder", "Stadium oval. Learn the bounce.", sidewinder, 78, decorate(sidewinder, 78, [
			{
				t: .2,
				r: 55,
				h: 16
			},
			{
				t: .55,
				r: 48,
				h: 12
			},
			{
				t: .82,
				r: 42,
				h: 10
			}
		], [{
			t: .12,
			len: 58,
			w: 48,
			h: 22
		}], [{
			t: .38,
			r: 22,
			off: 8
		}, {
			t: .7,
			r: 18,
			off: -10
		}], [], [
			{
				t: .18,
				off: 18,
				kind: "money"
			},
			{
				t: .45,
				off: -16,
				kind: "nitro"
			},
			{
				t: .72,
				off: 14,
				kind: "money"
			},
			{
				t: .9,
				off: -12,
				kind: "money"
			}
		])),
		makeTrack("wipeout", "Wipeout", "Figure-8. Don't blink at the cross.", wipeout, 70, decorate(wipeout, 70, [{
			t: .18,
			r: 40,
			h: 14
		}, {
			t: .68,
			r: 44,
			h: 16
		}], [{
			t: .3,
			len: 50,
			w: 42,
			h: 20
		}, {
			t: .8,
			len: 50,
			w: 42,
			h: 20
		}], [{
			t: .5,
			r: 16
		}], [], [
			{
				t: .12,
				off: 14,
				kind: "money"
			},
			{
				t: .4,
				off: -12,
				kind: "nitro"
			},
			{
				t: .62,
				off: 16,
				kind: "money"
			},
			{
				t: .88,
				off: -10,
				kind: "money"
			}
		])),
		makeTrack("blaster", "Blaster", "Big ramps. Hold nitro over the lip.", blaster, 80, decorate(blaster, 80, [{
			t: .5,
			r: 50,
			h: 10
		}], [{
			t: .08,
			len: 70,
			w: 56,
			h: 28
		}, {
			t: .58,
			len: 70,
			w: 56,
			h: 28
		}], [{
			t: .3,
			r: 20
		}, {
			t: .82,
			r: 18,
			off: 10
		}], [], [
			{
				t: .22,
				off: 16,
				kind: "money"
			},
			{
				t: .48,
				off: -14,
				kind: "nitro"
			},
			{
				t: .75,
				off: 12,
				kind: "money"
			}
		])),
		makeTrack("fandango", "Fandango", "Tight wiggle. Tires pay off here.", fandango, 64, decorate(fandango, 64, [
			{
				t: .15,
				r: 36,
				h: 12
			},
			{
				t: .4,
				r: 32,
				h: 14
			},
			{
				t: .78,
				r: 38,
				h: 11
			}
		], [{
			t: .55,
			len: 44,
			w: 36,
			h: 18
		}], [{
			t: .28,
			r: 16,
			off: 6
		}, {
			t: .88,
			r: 14
		}], [], [
			{
				t: .1,
				off: 12,
				kind: "nitro"
			},
			{
				t: .33,
				off: -12,
				kind: "money"
			},
			{
				t: .66,
				off: 10,
				kind: "money"
			},
			{
				t: .92,
				off: -8,
				kind: "money"
			}
		])),
		makeTrack("huevos", "Huevos Grande", "Wide and fast. Top speed wins.", huevos, 92, decorate(huevos, 92, [{
			t: .25,
			r: 60,
			h: 14
		}, {
			t: .75,
			r: 55,
			h: 12
		}], [{
			t: .48,
			len: 64,
			w: 60,
			h: 24
		}], [{
			t: .1,
			r: 24,
			off: 20
		}], [], [
			{
				t: .15,
				off: 22,
				kind: "money"
			},
			{
				t: .4,
				off: -20,
				kind: "nitro"
			},
			{
				t: .62,
				off: 18,
				kind: "money"
			},
			{
				t: .88,
				off: -16,
				kind: "money"
			}
		])),
		makeTrack("cliffhanger", "Cliffhanger", "Hill country. Upgrade those shocks.", cliff, 68, decorate(cliff, 68, [
			{
				t: .08,
				r: 50,
				h: 22
			},
			{
				t: .22,
				r: 42,
				h: 18
			},
			{
				t: .4,
				r: 48,
				h: 24
			},
			{
				t: .58,
				r: 40,
				h: 16
			},
			{
				t: .74,
				r: 52,
				h: 20
			},
			{
				t: .9,
				r: 36,
				h: 14
			}
		], [{
			t: .32,
			len: 48,
			w: 40,
			h: 20
		}], [{
			t: .5,
			r: 18
		}], [], [
			{
				t: .18,
				off: 12,
				kind: "money"
			},
			{
				t: .46,
				off: -10,
				kind: "nitro"
			},
			{
				t: .7,
				off: 12,
				kind: "money"
			}
		])),
		makeTrack("dukes", "Big Dukes", "Banked rectangle. Jump the short sides.", dukes, 76, decorate(dukes, 76, [{
			t: .2,
			r: 40,
			h: 10
		}, {
			t: .7,
			r: 40,
			h: 10
		}], [{
			t: .12,
			len: 62,
			w: 50,
			h: 26
		}, {
			t: .62,
			len: 62,
			w: 50,
			h: 26
		}], [{
			t: .35,
			r: 20
		}, {
			t: .85,
			r: 18
		}], [], [
			{
				t: .08,
				off: 16,
				kind: "nitro"
			},
			{
				t: .28,
				off: -14,
				kind: "money"
			},
			{
				t: .55,
				off: 14,
				kind: "money"
			},
			{
				t: .82,
				off: -12,
				kind: "money"
			}
		])),
		makeTrack("gulch", "Hurricane Gulch", "Mud, water, and a mean racing line.", gulch, 72, decorate(gulch, 72, [
			{
				t: .18,
				r: 46,
				h: 16
			},
			{
				t: .5,
				r: 52,
				h: 18
			},
			{
				t: .84,
				r: 44,
				h: 14
			}
		], [{
			t: .3,
			len: 54,
			w: 44,
			h: 22
		}, {
			t: .68,
			len: 50,
			w: 42,
			h: 20
		}], [
			{
				t: .1,
				r: 26,
				off: 4
			},
			{
				t: .42,
				r: 22,
				off: -8
			},
			{
				t: .78,
				r: 24
			}
		], [], [
			{
				t: .14,
				off: 14,
				kind: "money"
			},
			{
				t: .36,
				off: -12,
				kind: "nitro"
			},
			{
				t: .58,
				off: 12,
				kind: "money"
			},
			{
				t: .9,
				off: -10,
				kind: "money"
			}
		]))
	];
}
var TRACKS = buildDefs();
function prepareTrack(def) {
	const { cum, total } = cumlen(def.path);
	return {
		...def,
		cum,
		totalLen: total,
		height: buildHeight(def),
		hmW: 200,
		hmH: 120,
		baked: null
	};
}
function startPose(track, slot, count) {
	const s = samplePath(track.path, track.cum, track.totalLen, track.totalLen - 28);
	const offset = (slot - (count - 1) / 2) * 22;
	return {
		x: s.p.x + s.nx * offset - s.tx * 6,
		y: s.p.y + s.ny * offset - s.ty * 6,
		yaw: Math.atan2(-s.tx, -s.ty)
	};
}
function makeTruck(id, color, isPlayer, skill) {
	return {
		id,
		color,
		name: TRUCK_PALETTE[color].name,
		isPlayer,
		x: 0,
		y: 0,
		z: 0,
		vz: 0,
		yaw: 0,
		speed: 0,
		airborne: false,
		nitro: isPlayer ? 4 : 6,
		nitroTimer: 0,
		lap: 0,
		progress: 0,
		lastProgress: 0,
		nextCp: 1,
		finished: false,
		finishPlace: 0,
		finishTime: 0,
		cashBonus: 0,
		aiSkill: skill,
		aiNitroCd: 0,
		stuckTime: 0,
		bounce: 1,
		hop: 0
	};
}
function previewTruck(color, x, y, yaw, id = 0) {
	const t = makeTruck(id, color, true, 1);
	t.x = x;
	t.y = y;
	t.yaw = yaw;
	t.nitro = 0;
	return t;
}
function placeTrucks(trucks, track) {
	trucks.forEach((t, i) => {
		const p = startPose(track, i, trucks.length);
		t.x = p.x;
		t.y = p.y;
		t.yaw = p.yaw;
		t.z = heightAt(track, p.x, p.y);
		t.vz = 0;
		t.speed = 0;
		t.airborne = false;
		t.lap = 0;
		t.progress = progressAt(track, p.x, p.y);
		t.lastProgress = t.progress;
		t.nextCp = 1;
		t.finished = false;
		t.finishPlace = 0;
		t.finishTime = 0;
		t.cashBonus = 0;
		t.nitroTimer = 0;
		t.stuckTime = 0;
	});
}
function maxSpeedFor(t, upgrades, onDirt, inWater, nitro) {
	let m = 168 * (1 + (t.isPlayer ? upgrades.topSpeed : Math.round(t.aiSkill * 4)) * .12);
	if (t.color === "white") m *= 1.04;
	m *= .92 + t.aiSkill * .1;
	if (!onDirt) m *= .52;
	if (inWater) m *= .42;
	if (nitro) m *= NITRO_MULT;
	if (t.airborne) m *= 1.02;
	return m;
}
function accelFor(t, upgrades, nitro) {
	let a = 195 * (1 + (t.isPlayer ? upgrades.accel : Math.round(t.aiSkill * 3)) * .14);
	if (nitro) a *= 1.85;
	return a;
}
function turnFor(t, upgrades) {
	return TURN_RATE * (1 + (t.isPlayer ? upgrades.tires : Math.round(t.aiSkill * 3)) * .11);
}
function spawnPickups(track) {
	return track.pickups.map((p, i) => ({
		x: p.x,
		y: p.y,
		kind: p.kind,
		taken: false,
		value: p.kind === "money" ? 8e3 + i % 3 * 2e3 : 1,
		phase: i * .7
	}));
}
function bounceOff(t, nx, ny, overlap) {
	t.x += nx * overlap;
	t.y += ny * overlap;
	const fx = -Math.sin(t.yaw);
	const fy = -Math.cos(t.yaw);
	const vx = fx * t.speed;
	const vy = fy * t.speed;
	const vn = vx * nx + vy * ny;
	if (vn >= 0) {
		t.speed *= .88;
		return false;
	}
	let rx = vx - 1.52 * vn * nx;
	let ry = vy - 1.52 * vn * ny;
	rx *= .9;
	ry *= .9;
	t.speed = Math.hypot(rx, ry);
	if (t.speed > 10) t.yaw = wrapPi(Math.atan2(-rx, -ry));
	if (-vn > 40) t.hop = Math.max(t.hop, .7);
	return -vn > 14;
}
function stepRace(dt, trucks, track, playerUp, playerActions, particles, pickups, racing, time, onEvent) {
	const wall = 16;
	const cps = [
		0,
		.25,
		.5,
		.75
	];
	for (const t of trucks) {
		if (t.finished || !racing) {
			t.speed *= Math.max(0, 1 - 3 * dt);
			continue;
		}
		let throttle = 0;
		let steer = 0;
		let wantNitro = false;
		let brake = 0;
		if (t.isPlayer) {
			throttle = playerActions.throttle;
			steer = playerActions.steer;
			wantNitro = playerActions.nitro;
			brake = playerActions.brake;
		} else {
			const look = 48 + t.speed * .38;
			const targetS = (t.progress * track.totalLen + look) % track.totalLen;
			const samp = samplePath(track.path, track.cum, track.totalLen, targetS);
			const dx = samp.p.x - t.x;
			const dy = samp.p.y - t.y;
			const err = wrapPi(Math.atan2(-dx, -dy) - t.yaw);
			steer = clamp(err * (2.4 + t.aiSkill * 2.2), -1, 1);
			throttle = 1;
			if (Math.abs(err) > .9) throttle = .72;
			t.aiNitroCd -= dt;
			if (Math.abs(err) < .22 && t.speed > 70 && t.nitro > 0 && t.aiNitroCd <= 0 && t.nitroTimer <= 0 && Math.random() < .012 + t.aiSkill * .01) {
				wantNitro = true;
				t.aiNitroCd = 3.2 - t.aiSkill;
			}
			steer += Math.sin(time * (1.3 + t.id) + t.id) * (.12 - t.aiSkill * .08);
		}
		if (wantNitro && t.nitro > 0 && t.nitroTimer <= 0) {
			t.nitro -= 1;
			t.nitroTimer = NITRO_TIME;
			onEvent("nitro", t);
		}
		t.nitroTimer = Math.max(0, t.nitroTimer - dt);
		const nitroOn = t.nitroTimer > 0;
		const onDirt = offTrackDist(track, t.x, t.y) < track.width * .5 + 4;
		const puddle = inPuddle(track, t.x, t.y);
		const inWater = Boolean(puddle);
		const h = heightAt(track, t.x, t.y);
		const vmax = maxSpeedFor(t, playerUp, onDirt, inWater, nitroOn);
		const acc = accelFor(t, playerUp, nitroOn);
		const turn = turnFor(t, playerUp);
		const speedFactor = clamp(.22 + Math.abs(t.speed) / Math.max(40, vmax) * .9, .22, 1);
		const reverse = t.speed >= -8 ? 1 : -1;
		t.yaw += steer * turn * speedFactor * reverse * dt;
		t.yaw = wrapPi(t.yaw);
		if (brake > 0) t.speed -= 240 * dt;
		else if (throttle > 0) t.speed += acc * throttle * dt;
		else t.speed -= t.speed * COAST * dt;
		t.speed -= t.speed * DRAG * dt;
		if (!onDirt) t.speed -= t.speed * 1.4 * dt;
		if (inWater) t.speed -= t.speed * 1.8 * dt;
		const fx = -Math.sin(t.yaw);
		const fy = -Math.cos(t.yaw);
		const slope = (heightAt(track, t.x + fx * 14, t.y + fy * 14) - h) / 14;
		if (!t.airborne) t.speed -= slope * 90 * dt;
		t.speed = clamp(t.speed, -vmax * .28, vmax);
		const prevH = t.z;
		t.x += fx * t.speed * dt;
		t.y += fy * t.speed * dt;
		if (t.x < wall) {
			if (bounceOff(t, 1, 0, wall - t.x)) onEvent("bump", t);
		}
		if (t.x > 784) {
			if (bounceOff(t, -1, 0, t.x - 784)) onEvent("bump", t);
		}
		if (t.y < wall) {
			if (bounceOff(t, 0, 1, wall - t.y)) onEvent("bump", t);
		}
		if (t.y > 464) {
			if (bounceOff(t, 0, -1, t.y - 464)) onEvent("bump", t);
		}
		for (const tire of track.tires) {
			const d = Math.hypot(t.x - tire.x, t.y - tire.y);
			const min = 13 + (tire.r || 6);
			if (d < min && d > .001) {
				const nx = (t.x - tire.x) / d;
				const ny = (t.y - tire.y) / d;
				if (bounceOff(t, nx, ny, min - d)) {
					onEvent("bump", t);
					if (particles.length < 220) particles.push({
						x: t.x,
						y: t.y,
						vx: nx * 80 + (Math.random() - .5) * 40,
						vy: ny * 80 + (Math.random() - .5) * 40,
						life: .22,
						maxLife: .22,
						size: 2.4,
						kind: "spark",
						color: Math.random() > .5 ? "#ffe56a" : "#ff9a3a"
					});
				}
			}
		}
		const ground = heightAt(track, t.x, t.y);
		const shocks = t.isPlayer ? playerUp.shocks : Math.round(t.aiSkill * 3);
		if (t.airborne) {
			t.vz -= 520 * dt;
			t.z = Math.min(42, t.z + t.vz * dt);
			if (t.z <= ground) {
				t.z = ground;
				if (t.vz < -140 && shocks < 4) {
					t.vz = -t.vz * (.32 - shocks * .04);
					if (t.vz < 28) {
						t.airborne = false;
						t.vz = 0;
					}
				} else {
					t.airborne = false;
					t.vz = 0;
				}
				t.hop = 1.25;
				onEvent("land", t);
			}
		} else {
			const rise = ground - prevH;
			t.z = ground;
			if (rise > 3.2 && t.speed > 40) {
				t.airborne = true;
				t.vz = 50 + rise * (7 - shocks * .7);
				t.z = ground + 2;
			} else if (rise < -5 && t.speed > 55) {
				t.airborne = true;
				t.vz = 36 + Math.min(50, t.speed * .12);
			}
		}
		t.hop = Math.max(0, t.hop - dt * 4);
		t.bounce = 1 + Math.sin(t.hop * Math.PI) * .12;
		t.lastProgress = t.progress;
		t.progress = progressAt(track, t.x, t.y);
		const wrapped = t.lastProgress > .8 && t.progress < .2;
		const target = cps[t.nextCp] ?? 0;
		if (t.nextCp > 0 && t.nextCp < 4) {
			if (t.lastProgress < target && t.progress >= target) t.nextCp += 1;
			if (t.nextCp > 3) t.nextCp = 0;
		} else if (t.nextCp === 0 && wrapped) {
			t.lap += 1;
			t.nextCp = 1;
			if (t.lap >= 4) {
				t.finished = true;
				t.speed *= .4;
				onEvent("finish", t);
			}
		}
		if (Math.abs(t.speed) < 8) t.stuckTime += dt;
		else t.stuckTime = 0;
		if (t.stuckTime > 2.2 && !t.isPlayer) {
			t.yaw = pathHeading(track, t.progress);
			t.speed = 40;
			t.stuckTime = 0;
		}
		if (onDirt && t.speed > 40 && !t.airborne && particles.length < 220 && Math.random() < .5) particles.push({
			x: t.x - fx * 10,
			y: t.y - fy * 10,
			vx: -fx * 20 + (Math.random() - .5) * 40,
			vy: -fy * 20 + (Math.random() - .5) * 40,
			life: .35 + Math.random() * .25,
			maxLife: .5,
			size: 2 + Math.random() * 3,
			kind: "dust",
			color: "rgba(160,110,50,0.55)"
		});
		if (inWater && t.speed > 20 && particles.length < 220) particles.push({
			x: t.x,
			y: t.y,
			vx: (Math.random() - .5) * 50,
			vy: (Math.random() - .5) * 50,
			life: .3,
			maxLife: .3,
			size: 2,
			kind: "splash",
			color: "rgba(160,200,230,0.7)"
		});
		if (nitroOn) particles.push({
			x: t.x - fx * 14,
			y: t.y - fy * 14,
			vx: -fx * 80 + (Math.random() - .5) * 30,
			vy: -fy * 80 + (Math.random() - .5) * 30,
			life: .18,
			maxLife: .18,
			size: 4 + Math.random() * 3,
			kind: "flame",
			color: Math.random() > .4 ? "#ff7a18" : "#ffe56a"
		});
	}
	for (let i = 0; i < trucks.length; i++) for (let j = i + 1; j < trucks.length; j++) {
		const a = trucks[i];
		const b = trucks[j];
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const d = Math.hypot(dx, dy);
		const min = 26;
		if (d < min && d > .01) {
			const nx = dx / d;
			const ny = dy / d;
			const overlap = (min - d) * .51;
			a.x -= nx * overlap;
			a.y -= ny * overlap;
			b.x += nx * overlap;
			b.y += ny * overlap;
			const rel = (b.speed - a.speed) * .12;
			a.speed += rel;
			b.speed -= rel;
			a.speed *= .96;
			b.speed *= .96;
			if (a.isPlayer || b.isPlayer) onEvent("bump", a.isPlayer ? a : b);
		}
	}
	const player = trucks.find((t) => t.isPlayer);
	if (player && racing) for (const p of pickups) {
		if (p.taken) continue;
		if (Math.hypot(player.x - p.x, player.y - p.y) < 25) {
			p.taken = true;
			if (p.kind === "money") player.cashBonus += p.value;
			else player.nitro += 1;
			onEvent("pickup", player);
		}
	}
	for (let i = particles.length - 1; i >= 0; i--) {
		const p = particles[i];
		p.life -= dt;
		p.x += p.vx * dt;
		p.y += p.vy * dt;
		p.vx *= .92;
		p.vy *= .92;
		if (p.life <= 0) particles.splice(i, 1);
	}
	let nextPlace = trucks.filter((t) => t.finishPlace > 0).length;
	for (const t of trucks) if (t.finished && t.finishPlace === 0) {
		nextPlace += 1;
		t.finishPlace = nextPlace;
		t.finishTime = time;
	}
	return { finishedOrder: trucks.filter((t) => t.finished) };
}
function racePlace(trucks, t) {
	if (t.finished && t.finishPlace) return t.finishPlace;
	const score = (x) => x.lap + x.progress;
	return trucks.filter((o) => {
		if (o === t) return false;
		if (o.finished) return true;
		return score(o) > score(t) + 1e-4;
	}).length + 1;
}
function allFinished(trucks) {
	return trucks.every((t) => t.finished) || trucks.some((t) => t.isPlayer && t.finished);
}
function project(t, lx, ly, lz) {
	const fx = -Math.sin(t.yaw);
	const fy = -Math.cos(t.yaw);
	const rx = Math.cos(t.yaw);
	const ry = -Math.sin(t.yaw);
	const x = t.x + rx * lx + fx * ly;
	const y = t.y + ry * lx + fy * ly;
	const z = t.z + lz;
	return {
		sx: x,
		sy: y - z * .52,
		z,
		y
	};
}
function fillQuad(ctx, q, fill, stroke, width = .95) {
	if (q.some((p) => !Number.isFinite(p.sx) || !Number.isFinite(p.sy))) return;
	ctx.beginPath();
	ctx.moveTo(q[0].sx, q[0].sy);
	for (let i = 1; i < 4; i++) ctx.lineTo(q[i].sx, q[i].sy);
	ctx.closePath();
	ctx.fillStyle = fill;
	ctx.fill();
	if (stroke) {
		ctx.strokeStyle = stroke;
		ctx.lineWidth = width;
		ctx.lineJoin = "round";
		ctx.stroke();
	}
}
function drawBox(ctx, t, x0, x1, y0, y1, z0, z1, color, ink = "#1a1410") {
	const p = (x, y, z) => project(t, x, y, z);
	const nbl = p(x0, y0, z0);
	const nbr = p(x1, y0, z0);
	const nfl = p(x0, y1, z0);
	const nfr = p(x1, y1, z0);
	const tbl = p(x0, y0, z1);
	const tbr = p(x1, y0, z1);
	const tfl = p(x0, y1, z1);
	const tfr = p(x1, y1, z1);
	const faces = [
		{
			q: [
				nbl,
				nbr,
				tbr,
				tbl
			],
			k: -.22
		},
		{
			q: [
				nfl,
				nfr,
				tfr,
				tfl
			],
			k: -.04
		},
		{
			q: [
				nbl,
				nfl,
				tfl,
				tbl
			],
			k: -.1
		},
		{
			q: [
				nbr,
				nfr,
				tfr,
				tbr
			],
			k: -.28
		},
		{
			q: [
				tbl,
				tbr,
				tfr,
				tfl
			],
			k: .18
		}
	];
	faces.sort((a, b) => (a.q[0].sy + a.q[2].sy) / 2 - (b.q[0].sy + b.q[2].sy) / 2);
	for (const f of faces) fillQuad(ctx, f.q, shadeHex(color, f.k), ink, .95);
}
function disc(ctx, p, r, fill, stroke, width = .9) {
	ctx.beginPath();
	ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
	ctx.fillStyle = fill;
	ctx.fill();
	if (stroke) {
		ctx.strokeStyle = stroke;
		ctx.lineWidth = width;
		ctx.stroke();
	}
}
function tube(ctx, a, b, color, w) {
	ctx.strokeStyle = color;
	ctx.lineWidth = w;
	ctx.lineCap = "round";
	ctx.beginPath();
	ctx.moveTo(a.sx, a.sy);
	ctx.lineTo(b.sx, b.sy);
	ctx.stroke();
}
function drawWheel(ctx, t, lx, ly, hMul) {
	const p = project(t, lx, ly, 4.6 * hMul);
	const spin = t.x * .14 + t.y * .14;
	const rx = 5.6;
	const ry = 4.35;
	ctx.fillStyle = "rgba(20,12,6,0.38)";
	ctx.beginPath();
	ctx.ellipse(p.sx + .4, p.sy + 1.8, 6.1, ry * .52, -t.yaw, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = "#1a1614";
	ctx.beginPath();
	ctx.ellipse(p.sx, p.sy, rx, ry, -t.yaw, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = "#080706";
	ctx.lineWidth = 1.25;
	ctx.stroke();
	ctx.fillStyle = "#2c2824";
	for (let i = 0; i < 10; i++) {
		const a = -t.yaw + spin + i / 10 * Math.PI * 2;
		ctx.beginPath();
		ctx.ellipse(p.sx + Math.cos(a) * 5.25, p.sy + Math.sin(a) * 3.9999999999999996, 1.25, .82, a, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.fillStyle = "#12100e";
	ctx.beginPath();
	ctx.ellipse(p.sx, p.sy, rx * .64, ry * .64, -t.yaw, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = "#3a3a36";
	ctx.beginPath();
	ctx.ellipse(p.sx, p.sy, rx * .4, ry * .4, -t.yaw, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = "#0c0c0a";
	ctx.lineWidth = .8;
	ctx.stroke();
	ctx.strokeStyle = "#1c1c1a";
	ctx.lineWidth = 1.15;
	for (let i = 0; i < 5; i++) {
		const a = -t.yaw + i / 5 * Math.PI * 2 + spin * .15;
		ctx.beginPath();
		ctx.moveTo(p.sx, p.sy);
		ctx.lineTo(p.sx + Math.cos(a) * rx * .36, p.sy + Math.sin(a) * ry * .36);
		ctx.stroke();
	}
	ctx.fillStyle = "#d0ccc4";
	ctx.beginPath();
	ctx.ellipse(p.sx, p.sy, 1.2, .95, -t.yaw, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = "#4a4844";
	ctx.lineWidth = .55;
	ctx.stroke();
}
function drawTruck(ctx, t) {
	if (!Number.isFinite(t.x) || !Number.isFinite(t.y) || !Number.isFinite(t.yaw)) return;
	const pal = TRUCK_PALETTE[t.color];
	const squash = t.bounce;
	const S = 1.38;
	const h = squash;
	const ink = "#16120e";
	ctx.save();
	ctx.fillStyle = `rgba(0,0,0,${.3 + clamp(t.z / 80, 0, .22)})`;
	ctx.beginPath();
	ctx.ellipse(t.x + .6, t.y + 3.2, 16, 9.5, -t.yaw, 0, Math.PI * 2);
	ctx.fill();
	const sortedW = [
		[-8.5 * S, 8.8 * S],
		[8.5 * S, 8.8 * S],
		[-8.5 * S, -8.6 * S],
		[8.5 * S, -8.6 * S]
	].map(([wx, wy]) => ({
		wx,
		wy,
		sy: project(t, wx, wy, 4).sy
	})).sort((a, b) => a.sy - b.sy);
	for (const w of sortedW.slice(0, 2)) drawWheel(ctx, t, w.wx, w.wy, h);
	drawBox(ctx, t, -5.2 * S, 5.2 * S, -12 * S, 12.2 * S, 2.6, 5 * h, "#1c1c1c", ink);
	drawBox(ctx, t, -6.2 * S, 6.2 * S, 11.4 * S, 13.5 * S, 3, 5.5 * h, "#141414", ink);
	drawBox(ctx, t, -6.1 * S, 6.1 * S, -12.4 * S, 1 * S, 4.8 * h, 5.5 * h, "#5a4030", ink);
	drawBox(ctx, t, -6.4 * S, -4.9 * S, -12.2 * S, 1 * S, 5.1 * h, 9 * h, pal.body, ink);
	drawBox(ctx, t, 4.9 * S, 6.4 * S, -12.2 * S, 1 * S, 5.1 * h, 9 * h, pal.body, ink);
	drawBox(ctx, t, -6.3 * S, 6.3 * S, -12.8 * S, -11.4 * S, 5.1 * h, 8.8 * h, pal.body, ink);
	drawBox(ctx, t, -5.7 * S, 5.7 * S, 5.4 * S, 12 * S, 5 * h, 8.1 * h, pal.body, ink);
	drawBox(ctx, t, -5.5 * S, 5.5 * S, .5 * S, 7.2 * S, 5 * h, 12.3 * h, pal.body, ink);
	fillQuad(ctx, [
		project(t, -4.7 * S, 6 * S, 12.1 * h),
		project(t, 4.7 * S, 6 * S, 12.1 * h),
		project(t, 4.9 * S, 10.8 * S, 8.3 * h),
		project(t, -4.9 * S, 10.8 * S, 8.3 * h)
	], "#243038", ink, 1.05);
	fillQuad(ctx, [
		project(t, -3.2 * S, 6.6 * S, 11.5 * h),
		project(t, 1.4 * S, 6.6 * S, 11.5 * h),
		project(t, 1.6 * S, 9.2 * S, 9.4 * h),
		project(t, -3 * S, 9.2 * S, 9.4 * h)
	], "rgba(220,235,245,0.28)");
	drawBox(ctx, t, -3.8 * S, 3.8 * S, 11.95 * S, 12.55 * S, 5.3 * h, 7.7 * h, "#141414", ink);
	for (let i = 0; i < 3; i++) {
		const x = (-2.2 + i * 2.2) * S;
		drawBox(ctx, t, x - .55 * S, x + .55 * S, 12.05 * S, 12.48 * S, 5.45 * h, 7.55 * h, "#0c0c0c", ink);
	}
	const hl = project(t, -3.5 * S, 12.4 * S, 6.6 * h);
	const hr = project(t, 3.5 * S, 12.4 * S, 6.6 * h);
	disc(ctx, hl, 2.25, "#f6f0d4", "#222", 1.1);
	disc(ctx, hr, 2.25, "#f6f0d4", "#222", 1.1);
	disc(ctx, hl, 1.2, "#fffaf0");
	disc(ctx, hr, 1.2, "#fffaf0");
	disc(ctx, project(t, -5.4 * S, 12 * S, 7 * h), 1, "#e07a28", "#3a2010", .7);
	disc(ctx, project(t, 5.4 * S, 12 * S, 7 * h), 1, "#e07a28", "#3a2010", .7);
	drawBox(ctx, t, -1.4 * S, 1.4 * S, 12.8 * S, 13.7 * S, 3.4, 5.1 * h, "#2a2a28", ink);
	disc(ctx, project(t, 0, 13.55 * S, 4.1 * h), 1.1, "#3a3a38", "#0c0c0c", .7);
	disc(ctx, project(t, -7.2 * S, 6.8 * S, 9.2 * h), 1.35, "#1c1c1c", ink, .8);
	disc(ctx, project(t, 7.2 * S, 6.8 * S, 9.2 * h), 1.35, "#1c1c1c", ink, .8);
	const rackZ = 13.05 * h;
	const r1 = project(t, -5 * S, 1.6 * S, rackZ);
	const r2 = project(t, 5 * S, 1.6 * S, rackZ);
	const r3 = project(t, -5 * S, 7.8 * S, rackZ);
	const r4 = project(t, 5 * S, 7.8 * S, rackZ);
	tube(ctx, project(t, -5 * S, 1.6 * S, 12.2 * h), r1, "#1a1a18", 1.65);
	tube(ctx, project(t, 5 * S, 1.6 * S, 12.2 * h), r2, "#1a1a18", 1.65);
	tube(ctx, project(t, -5 * S, 7.8 * S, 12.2 * h), r3, "#1a1a18", 1.65);
	tube(ctx, project(t, 5 * S, 7.8 * S, 12.2 * h), r4, "#1a1a18", 1.65);
	tube(ctx, r1, r2, "#1a1a18", 1.65);
	tube(ctx, r3, r4, "#1a1a18", 1.65);
	tube(ctx, r1, r3, "#1a1a18", 1.5);
	tube(ctx, r2, r4, "#1a1a18", 1.5);
	disc(ctx, project(t, -2.4 * S, 7.75 * S, 13.5 * h), 1.55, "#f4f0dc", "#1a1a18", .95);
	disc(ctx, project(t, 2.4 * S, 7.75 * S, 13.5 * h), 1.55, "#f4f0dc", "#1a1a18", .95);
	for (const w of sortedW.slice(2)) drawWheel(ctx, t, w.wx, w.wy, h);
	const roof = project(t, 0, 4.2 * S, 12.6 * h);
	ctx.fillStyle = pal.light;
	ctx.strokeStyle = ink;
	ctx.lineWidth = 2.2;
	ctx.font = "bold 8px 'Share Tech Mono', monospace";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.strokeText(String(t.id + 1), roof.sx, roof.sy);
	ctx.fillText(String(t.id + 1), roof.sx, roof.sy);
	if (t.nitroTimer > 0) {
		const fx = -Math.sin(t.yaw);
		const fy = -Math.cos(t.yaw);
		const tail = project(t, 0, -13.4 * S, 6.4 * h);
		const g = ctx.createRadialGradient(tail.sx, tail.sy, 1, tail.sx - fx * 12, tail.sy - fy * 12, 18);
		g.addColorStop(0, "rgba(255,230,120,0.92)");
		g.addColorStop(.4, "rgba(255,110,20,0.7)");
		g.addColorStop(1, "rgba(255,40,0,0)");
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.ellipse(tail.sx - fx * 7, tail.sy - fy * 7, 7.5, 12, -t.yaw, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.restore();
}
function fillGrass(ctx, imgs) {
	if (imgs.grass) {
		const pat = ctx.createPattern(imgs.grass, "repeat");
		if (pat) ctx.fillStyle = pat;
		else ctx.fillStyle = "#3a7a2c";
	} else ctx.fillStyle = "#3a7a2c";
	ctx.fillRect(0, 0, 800, 480);
	ctx.fillStyle = "rgba(20,40,16,0.18)";
	ctx.fillRect(0, 0, 800, 480);
}
function applyHeightShading(ctx, track) {
	const img = ctx.getImageData(0, 0, 800, 480);
	const data = img.data;
	const step = 2;
	for (let y = 0; y < 480; y += step) for (let x = 0; x < 800; x += step) {
		const h = heightAt(track, x, y);
		const hx = heightAt(track, x + 4, y) - h;
		const hy = heightAt(track, x, y + 4) - h;
		const light = clamp(.78 + .035 * h - hx * .045 - hy * .02, .45, 1.25);
		for (let oy = 0; oy < step; oy++) for (let ox = 0; ox < step; ox++) {
			const i = ((y + oy) * 800 + (x + ox)) * 4;
			data[i] = clamp(data[i] * light, 0, 255);
			data[i + 1] = clamp(data[i + 1] * light, 0, 255);
			data[i + 2] = clamp(data[i + 2] * light, 0, 255);
		}
	}
	ctx.putImageData(img, 0, 0);
}
function drawPuddles(ctx, track) {
	for (const p of track.puddles) {
		const g = ctx.createRadialGradient(p.x - 4, p.y - 4, 2, p.x, p.y, p.r);
		g.addColorStop(0, "rgba(90,150,190,0.75)");
		g.addColorStop(.6, "rgba(40,90,130,0.7)");
		g.addColorStop(1, "rgba(30,70,90,0.15)");
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.ellipse(p.x, p.y, p.r, p.r * .78, .2, 0, Math.PI * 2);
		ctx.fill();
	}
}
function drawRamps(ctx, track) {
	for (const r of track.ramps) {
		const ca = Math.cos(r.angle);
		const sa = Math.sin(r.angle);
		const hw = r.w / 2;
		const proj = [
			{
				l: 0,
				s: -hw,
				h: 0
			},
			{
				l: 0,
				s: hw,
				h: 0
			},
			{
				l: r.len,
				s: hw,
				h: r.h
			},
			{
				l: r.len,
				s: -hw,
				h: r.h
			}
		].map((c) => {
			return {
				x: r.x + ca * c.l - sa * c.s,
				y: r.y + sa * c.l + ca * c.s - c.h * .52
			};
		});
		ctx.beginPath();
		ctx.moveTo(proj[0].x, proj[0].y);
		for (let i = 1; i < proj.length; i++) ctx.lineTo(proj[i].x, proj[i].y);
		ctx.closePath();
		ctx.fillStyle = "rgba(196,150,70,0.85)";
		ctx.fill();
		ctx.strokeStyle = "rgba(80,50,20,0.6)";
		ctx.stroke();
		ctx.fillStyle = "rgba(230,190,110,0.5)";
		ctx.beginPath();
		ctx.moveTo(proj[2].x, proj[2].y);
		ctx.lineTo(proj[3].x, proj[3].y);
		ctx.lineTo(proj[3].x, proj[3].y + r.h * .52);
		ctx.lineTo(proj[2].x, proj[2].y + r.h * .52);
		ctx.closePath();
		ctx.fill();
	}
}
function drawStartFinish(ctx, track) {
	const path = track.path;
	if (path.length < 2) return;
	const a = path[0];
	const b = path[1];
	const tx = b.x - a.x;
	const ty = b.y - a.y;
	const len = Math.hypot(tx, ty) || 1;
	const nx = -ty / len;
	const ny = tx / len;
	const half = track.width * .48;
	const cells = 10;
	for (let i = 0; i < cells; i++) {
		const t0 = -1 + i / cells * 2;
		const t1 = -1 + (i + 1) / cells * 2;
		const x0 = a.x + nx * half * t0;
		const y0 = a.y + ny * half * t0;
		const x1 = a.x + nx * half * t1;
		const y1 = a.y + ny * half * t1;
		ctx.strokeStyle = i % 2 === 0 ? "#f4f0e8" : "#161210";
		ctx.lineWidth = 7;
		ctx.beginPath();
		ctx.moveTo(x0 - tx / len * 4, y0 - ty / len * 4);
		ctx.lineTo(x1 - tx / len * 4, y1 - ty / len * 4);
		ctx.stroke();
	}
}
function drawOuterTires(ctx) {
	ctx.save();
	ctx.strokeStyle = "#1a1a1a";
	ctx.lineWidth = 13;
	ctx.strokeRect(8, 8, 784, 464);
	const tireR = 6;
	const inset = 8;
	const drawTiresAlong = (x0, y0, x1, y1) => {
		const dx = x1 - x0;
		const dy = y1 - y0;
		const n = Math.max(2, Math.floor(Math.hypot(dx, dy) / (tireR * 2.05)));
		for (let i = 0; i < n; i++) {
			const t = n === 1 ? 0 : i / (n - 1);
			const x = x0 + dx * t;
			const y = y0 + dy * t;
			ctx.beginPath();
			ctx.fillStyle = i % 2 === 0 ? "#1c1c1c" : "#ecece8";
			ctx.arc(x, y, tireR, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = "#0a0a0a";
			ctx.lineWidth = 1;
			ctx.stroke();
		}
	};
	drawTiresAlong(inset, inset, 792, inset);
	drawTiresAlong(792, inset, 792, 472);
	drawTiresAlong(792, 472, inset, 472);
	drawTiresAlong(inset, 472, inset, inset);
	ctx.restore();
}
function drawWallRings(ctx, track) {
	const rings = track.wallRings;
	if (!rings?.length) return;
	ctx.save();
	ctx.lineJoin = "round";
	ctx.lineCap = "round";
	for (const ring of rings) {
		if (ring.length < 2) continue;
		ctx.beginPath();
		ctx.moveTo(ring[0].x, ring[0].y);
		for (let i = 1; i < ring.length; i++) ctx.lineTo(ring[i].x, ring[i].y);
		ctx.closePath();
		ctx.strokeStyle = "#141210";
		ctx.lineWidth = 13;
		ctx.stroke();
		ctx.strokeStyle = "#2a241c";
		ctx.lineWidth = 7;
		ctx.stroke();
	}
	ctx.restore();
}
function drawTrackTires(ctx, track) {
	track.tires.forEach((tire, i) => {
		ctx.beginPath();
		ctx.fillStyle = i % 2 === 0 ? "#1c1c1c" : "#ecece8";
		ctx.arc(tire.x, tire.y, tire.r, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "#0a0a0a";
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.strokeStyle = i % 2 === 0 ? "#3a3a38" : "#c8c4bc";
		ctx.lineWidth = 1.3;
		ctx.beginPath();
		ctx.arc(tire.x, tire.y, tire.r * .52, 0, Math.PI * 2);
		ctx.stroke();
	});
}
function drawInfield(ctx, track) {
	const path = track.path;
	if (path.length < 3) return;
	ctx.save();
	ctx.beginPath();
	ctx.moveTo(path[0].x, path[0].y);
	for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
	ctx.closePath();
	ctx.fillStyle = "rgba(18, 36, 14, 0.16)";
	ctx.fill();
	ctx.restore();
}
function bakePartTrack(ctx, track, imgs) {
	fillGrass(ctx, imgs);
	drawInfield(ctx, track);
	const dirt = imgs.dirt ? ctx.createPattern(imgs.dirt, "repeat") : null;
	const ox = track.originX ?? 0;
	const oy = track.originY ?? 0;
	const placed = track.placed ?? [];
	for (const layer of [
		"apron",
		"dirt",
		"detail"
	]) for (const part of placed) paintPlacedPart(ctx, part, ox, oy, dirt, layer);
}
function bakeStrokedPath(ctx, track, imgs) {
	fillGrass(ctx, imgs);
	const path = track.path;
	ctx.lineJoin = "round";
	ctx.lineCap = "round";
	const strokePath = () => {
		ctx.beginPath();
		ctx.moveTo(path[0].x, path[0].y);
		for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
		ctx.closePath();
	};
	ctx.lineWidth = track.width + 16;
	ctx.strokeStyle = "rgba(48,28,12,0.95)";
	strokePath();
	ctx.stroke();
	ctx.lineWidth = track.width;
	ctx.strokeStyle = "#c49648";
	strokePath();
	ctx.stroke();
	if (imgs.dirt) {
		const pat = ctx.createPattern(imgs.dirt, "repeat");
		if (pat) {
			ctx.globalAlpha = .55;
			ctx.strokeStyle = pat;
			ctx.lineWidth = track.width - 2;
			strokePath();
			ctx.stroke();
			ctx.globalAlpha = 1;
		}
	}
	ctx.lineWidth = Math.max(18, track.width - 28);
	ctx.strokeStyle = "rgba(232,190,110,0.16)";
	strokePath();
	ctx.stroke();
}
function bakeTrack(track, imgs) {
	const c = document.createElement("canvas");
	c.width = 800;
	c.height = 480;
	const ctx = c.getContext("2d");
	if (track.placed && track.placed.length) bakePartTrack(ctx, track, imgs);
	else bakeStrokedPath(ctx, track, imgs);
	applyHeightShading(ctx, track);
	drawPuddles(ctx, track);
	drawRamps(ctx, track);
	drawStartFinish(ctx, track);
	drawWallRings(ctx, track);
	drawOuterTires(ctx);
	drawTrackTires(ctx, track);
	track.baked = c;
	return c;
}
function drawWorld(ctx, track, trucks, particles, pickups, imgs, time, shake) {
	ctx.save();
	ctx.translate(shake.x, shake.y);
	if (track.baked) ctx.drawImage(track.baked, 0, 0);
	else {
		ctx.fillStyle = "#3a7a2c";
		ctx.fillRect(0, 0, 800, 480);
	}
	ctx.globalAlpha = .22 + Math.sin(time * 3) * .08;
	ctx.fillStyle = "#9fd4ee";
	for (const p of track.puddles) {
		ctx.beginPath();
		ctx.ellipse(p.x + Math.sin(time * 2) * 2, p.y, p.r * .55, p.r * .28, time, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.globalAlpha = 1;
	for (const p of pickups) {
		if (p.taken) continue;
		const bob = Math.sin(time * 3 + p.phase) * 3;
		const img = p.kind === "money" ? imgs.money : imgs.nitro;
		const s = p.kind === "money" ? 22 : 18;
		if (img) ctx.drawImage(img, p.x - s / 2, p.y - s / 2 + bob, s, s);
		else {
			ctx.fillStyle = p.kind === "money" ? "#d4b84a" : "#e05020";
			ctx.beginPath();
			ctx.arc(p.x, p.y + bob, 8, 0, Math.PI * 2);
			ctx.fill();
		}
	}
	for (const p of particles) {
		const a = clamp(p.life / p.maxLife, 0, 1);
		ctx.globalAlpha = a;
		ctx.fillStyle = p.color;
		ctx.beginPath();
		ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.globalAlpha = 1;
	const sorted = [...trucks].sort((a, b) => a.y - b.y);
	for (const t of sorted) drawTruck(ctx, t);
	ctx.restore();
}
var PLACE_LABEL = [
	"1st",
	"2nd",
	"3rd",
	"4th"
];
function drawHud(ctx, trucks, money, upgrades, trackName, raceIndex, raceCount, countdown, paused) {
	ctx.fillStyle = "#0c0a08";
	ctx.fillRect(0, 480, 800, 84);
	ctx.fillStyle = "#2a241c";
	ctx.fillRect(0, 480, 800, 2);
	const slotW = 200;
	trucks.forEach((t, i) => {
		const x = i * slotW;
		const y = 486;
		ctx.fillStyle = shadeHex(TRUCK_PALETTE[t.color].body, -.45);
		ctx.fillRect(x + 6, y, 188, 70);
		ctx.strokeStyle = TRUCK_PALETTE[t.color].light;
		ctx.lineWidth = t.isPlayer ? 2 : 1;
		ctx.strokeRect(x + 6.5, 486.5, 187, 69);
		ctx.save();
		ctx.beginPath();
		ctx.rect(x + 6, y, 44, 70);
		ctx.clip();
		drawTruck(ctx, {
			...t,
			x: x + 26,
			y: 526,
			z: 0,
			yaw: -1.12,
			bounce: 1,
			nitroTimer: 0
		});
		ctx.restore();
		ctx.fillStyle = "#f2ebe0";
		ctx.font = "600 13px 'IBM Plex Sans', sans-serif";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillText(t.name, x + 36, 492);
		const place = racePlace(trucks, t);
		ctx.fillStyle = t.isPlayer ? "#f2ebe0" : "#9a8b74";
		ctx.font = "700 22px Teko, sans-serif";
		ctx.fillText(PLACE_LABEL[place - 1] ?? `${place}th`, x + 36, 510);
		ctx.font = "12px 'Share Tech Mono', monospace";
		ctx.fillStyle = "#9a8b74";
		const lap = Math.min(4, t.lap + 1);
		ctx.fillText(`LAP ${lap}/4`, x + 100, 516);
		for (let n = 0; n < Math.min(8, t.nitro); n++) {
			ctx.fillStyle = t.nitroTimer > 0 ? "#ff7a18" : "#c4783a";
			ctx.fillRect(x + 12 + n * 10, 538, 8, 12);
			ctx.strokeStyle = "#1a120c";
			ctx.strokeRect(x + 12 + n * 10, 538, 8, 12);
		}
	});
	ctx.fillStyle = "#f2ebe0";
	ctx.font = "12px 'Share Tech Mono', monospace";
	ctx.textAlign = "right";
	ctx.fillText(`${trackName}   HEAT ${raceIndex + 1}/${raceCount}   ${formatCash(money)}`, 786, 488);
	if (countdown > 0) {
		ctx.fillStyle = "rgba(10,8,6,0.35)";
		ctx.fillRect(0, 0, 800, 480);
		ctx.fillStyle = "#f2ebe0";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = "700 120px Teko, sans-serif";
		const n = Math.ceil(countdown);
		ctx.fillText(n > 0 && countdown > .15 ? String(n) : "GO", 400, 240);
	}
	if (paused) {
		ctx.fillStyle = "rgba(10,8,6,0.55)";
		ctx.fillRect(0, 0, 800, 480);
		ctx.fillStyle = "#f2ebe0";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = "700 64px Teko, sans-serif";
		ctx.fillText("PAUSED", 400, 240);
		ctx.font = "16px 'IBM Plex Sans', sans-serif";
		ctx.fillStyle = "#9a8b74";
		ctx.fillText("Press P or tap to resume", 400, 280);
	}
}
function fitCanvas(ctx, cssW, cssH, dpr) {
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, cssW, cssH);
	const scale = Math.min(cssW / 800, cssH / 564);
	const ox = (cssW - 800 * scale) / 2;
	const oy = (cssH - 564 * scale) / 2;
	ctx.translate(ox, oy);
	ctx.scale(scale, scale);
	ctx.imageSmoothingEnabled = true;
	return {
		scale,
		ox,
		oy
	};
}
var GAME_CODES = /* @__PURE__ */ new Set([
	"KeyW",
	"KeyA",
	"KeyS",
	"KeyD",
	"ArrowUp",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight",
	"Space",
	"KeyN",
	"KeyP",
	"KeyC",
	"Escape",
	"Enter",
	"KeyM"
]);
var Input = class {
	keys = /* @__PURE__ */ new Set();
	qaKeys = null;
	qaSteer = null;
	touchSteer = 0;
	touchThrottle = 0;
	touchNitro = false;
	touchBrake = 0;
	cameraEdge = false;
	nitroEdge = false;
	pauseEdge = false;
	confirmEdge = false;
	muteEdge = false;
	prevNitro = false;
	prevPause = false;
	prevConfirm = false;
	prevMute = false;
	prevCam = false;
	unsubs = [];
	attach() {
		const down = (e) => {
			if (GAME_CODES.has(e.code)) e.preventDefault();
			this.keys.add(e.code);
		};
		const up = (e) => {
			this.keys.delete(e.code);
		};
		const clear = () => this.keys.clear();
		window.addEventListener("keydown", down);
		window.addEventListener("keyup", up);
		window.addEventListener("blur", clear);
		document.addEventListener("visibilitychange", () => {
			if (document.hidden) clear();
		});
		this.unsubs.push(() => window.removeEventListener("keydown", down), () => window.removeEventListener("keyup", up), () => window.removeEventListener("blur", clear));
	}
	detach() {
		for (const u of this.unsubs) u();
		this.unsubs = [];
	}
	held(code) {
		if (this.qaKeys) return this.qaKeys.includes(code);
		return this.keys.has(code);
	}
	poll() {
		const left = this.held("KeyA") || this.held("ArrowLeft") || this.touchSteer > .3;
		const right = this.held("KeyD") || this.held("ArrowRight") || this.touchSteer < -.3;
		let steer = 0;
		if (left) steer += 1;
		if (right) steer -= 1;
		if (this.qaSteer != null) steer = this.qaSteer;
		else if (!this.qaKeys && Math.abs(this.touchSteer) > .15 && !left && !right) steer = this.touchSteer;
		const pads = typeof navigator !== "undefined" ? navigator.getGamepads?.() : null;
		let padThrottle = 0;
		let padBrake = 0;
		let padNitro = false;
		let padCam = false;
		let padPause = false;
		if (pads && !this.qaKeys) for (const pad of pads) {
			if (!pad) continue;
			const ax = pad.axes[0] ?? 0;
			const mag = Math.abs(ax);
			if (mag > .18) {
				const v = (mag - .18) / .82 * Math.sign(ax);
				steer -= v;
			}
			if (pad.buttons[14]?.pressed) steer += 1;
			if (pad.buttons[15]?.pressed) steer -= 1;
			padThrottle = Math.max(padThrottle, pad.buttons[7]?.value ?? 0);
			padBrake = Math.max(padBrake, pad.buttons[6]?.value ?? 0);
			if (pad.buttons[0]?.pressed) padNitro = true;
			if (pad.buttons[3]?.pressed) padCam = true;
			if (pad.buttons[9]?.pressed) padPause = true;
		}
		steer = Math.max(-1, Math.min(1, steer));
		let throttle = 0;
		if (this.held("KeyW") || this.held("ArrowUp")) throttle = 1;
		throttle = Math.max(throttle, this.touchThrottle, padThrottle);
		let brake = 0;
		if (this.held("KeyS") || this.held("ArrowDown")) brake = 1;
		brake = Math.max(brake, this.touchBrake, padBrake);
		const nitroHeld = this.held("Space") || this.held("KeyN") || this.touchNitro || padNitro;
		this.nitroEdge = nitroHeld && !this.prevNitro;
		this.prevNitro = nitroHeld;
		const pauseHeld = this.held("KeyP") || this.held("Escape") || padPause;
		this.pauseEdge = pauseHeld && !this.prevPause;
		this.prevPause = pauseHeld;
		const confirmHeld = this.held("Enter");
		this.confirmEdge = confirmHeld && !this.prevConfirm;
		this.prevConfirm = confirmHeld;
		const muteHeld = this.held("KeyM");
		this.muteEdge = muteHeld && !this.prevMute;
		this.prevMute = muteHeld;
		const camHeld = this.held("KeyC") || padCam;
		this.cameraEdge = camHeld && !this.prevCam;
		this.prevCam = camHeld;
		return {
			throttle: Math.min(1, throttle),
			steer,
			nitro: this.nitroEdge,
			brake: Math.min(1, brake)
		};
	}
	setTouchSteer(v) {
		this.touchSteer = v;
	}
	setTouchGas(on) {
		this.touchThrottle = on ? 1 : 0;
	}
	setTouchNitro(on) {
		this.touchNitro = on;
	}
	setTouchBrake(on) {
		this.touchBrake = on ? 1 : 0;
	}
};
var KEY = "taters-trucks-v1";
var DEFAULT = {
	version: 1,
	bestMoney: 0,
	lastColor: "red",
	muted: false
};
function loadSave() {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return { ...DEFAULT };
		const p = JSON.parse(raw);
		return {
			version: 1,
			bestMoney: typeof p.bestMoney === "number" ? p.bestMoney : 0,
			lastColor: p.lastColor === "yellow" || p.lastColor === "blue" || p.lastColor === "red" ? p.lastColor : "red",
			muted: Boolean(p.muted)
		};
	} catch {
		return { ...DEFAULT };
	}
}
function writeSave(s) {
	try {
		localStorage.setItem(KEY, JSON.stringify(s));
	} catch {}
}
var Engine = class {
	canvas;
	ctx;
	input = new Input();
	audio = new AudioSys();
	imgs = null;
	phase = "title";
	mode = "champ";
	trucks = [];
	track = null;
	raceIndex = 0;
	money = START_MONEY;
	upgrades = { ...EMPTY_UPGRADES };
	playerColor = "red";
	particles = [];
	pickups = [];
	time = 0;
	countdown = 0;
	paused = false;
	muted = false;
	bestMoney = 0;
	trauma = 0;
	lastBeep = -1;
	acc = 0;
	raf = 0;
	lastTs = 0;
	running = false;
	onUi = null;
	cssW = 800;
	cssH = 600;
	dpr = 1;
	attractInit = false;
	playerNitro = 4;
	constructor(canvas) {
		this.canvas = canvas;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Canvas unsupported");
		this.ctx = ctx;
		const save = loadSave();
		this.playerColor = save.lastColor;
		this.muted = save.muted;
		this.bestMoney = save.bestMoney;
		this.audio.setMuted(this.muted);
	}
	async start() {
		this.input.attach();
		this.installProbe();
		this.bootAttract();
		this.running = true;
		this.lastTs = performance.now();
		const loop = (ts) => {
			if (!this.running) return;
			const dt = Math.min(.1, (ts - this.lastTs) / 1e3);
			this.lastTs = ts;
			this.tick(dt);
			this.raf = requestAnimationFrame(loop);
		};
		this.raf = requestAnimationFrame(loop);
		this.emitUi();
		this.imgs = await loadImages();
		if (this.track && this.imgs) bakeTrack(this.track, this.imgs);
	}
	destroy() {
		this.running = false;
		cancelAnimationFrame(this.raf);
		this.input.detach();
	}
	resize(cssW, cssH, dpr) {
		this.cssW = cssW;
		this.cssH = cssH;
		this.dpr = Math.min(2, dpr);
		this.canvas.width = Math.max(1, Math.floor(cssW * this.dpr));
		this.canvas.height = Math.max(1, Math.floor(cssH * this.dpr));
	}
	bootAttract() {
		this.mode = "champ";
		this.raceIndex = 0;
		this.track = prepareTrack(assembleLayout(TEST_LOOP, 42));
		bakeTrack(this.track, this.imgs ?? {
			dirt: null,
			grass: null,
			money: null,
			nitro: null,
			title: null
		});
		this.trucks = [
			makeTruck(0, "red", false, .55),
			makeTruck(1, "yellow", false, .5),
			makeTruck(2, "blue", false, .48),
			makeTruck(3, "white", false, .72)
		];
		placeTrucks(this.trucks, this.track);
		this.pickups = spawnPickups(this.track);
		this.particles = [];
		this.phase = "title";
		this.attractInit = true;
		this.countdown = 0;
		this.paused = false;
	}
	playFromTitle() {
		this.audio.unlock();
		this.mode = "champ";
		this.phase = "select";
		this.emitUi();
	}
	playTestTrack() {
		this.audio.unlock();
		this.mode = "practice";
		this.paused = false;
		this.phase = "test3d";
		this.emitUi();
	}
	playYard() {
		this.audio.unlock();
		this.paused = false;
		this.phase = "yard";
		this.emitUi();
	}
	selectColor(c) {
		if (!PLAYER_COLORS.includes(c)) return;
		this.playerColor = c;
		const save = loadSave();
		save.lastColor = c;
		writeSave(save);
		this.emitUi();
	}
	beginChampionship() {
		this.audio.unlock();
		this.mode = "champ";
		this.money = START_MONEY;
		this.upgrades = { ...EMPTY_UPGRADES };
		this.playerNitro = 4;
		this.raceIndex = 0;
		this.startRace();
	}
	startRace() {
		const def = this.mode === "practice" ? assembleLayout(TEST_LOOP, Math.random() * 1e9 | 0) : TRACKS[this.raceIndex % TRACKS.length];
		this.track = prepareTrack(def);
		bakeTrack(this.track, this.imgs ?? {
			dirt: null,
			grass: null,
			money: null,
			nitro: null,
			title: null
		});
		const others = PLAYER_COLORS.filter((c) => c !== this.playerColor);
		const skillBase = .42 + this.raceIndex * .06;
		this.trucks = [
			makeTruck(0, this.playerColor, true, 1),
			makeTruck(1, others[0], false, skillBase),
			makeTruck(2, others[1], false, skillBase + .08),
			makeTruck(3, "white", false, Math.min(.95, skillBase + .28))
		];
		this.trucks[0].nitro = this.playerNitro;
		placeTrucks(this.trucks, this.track);
		this.pickups = spawnPickups(this.track);
		this.particles = [];
		this.time = 0;
		this.countdown = 3.2;
		this.paused = false;
		this.phase = "countdown";
		this.lastBeep = -1;
		this.emitUi();
	}
	buy(kind) {
		const player = this.trucks.find((t) => t.isPlayer);
		if (kind === "nitro") {
			if (this.money >= UPGRADE_COST.nitro) {
				this.money -= UPGRADE_COST.nitro;
				this.playerNitro += 1;
				if (player) player.nitro = this.playerNitro;
				this.emitUi();
			}
			return;
		}
		const lvl = this.upgrades[kind];
		if (lvl >= 5) return;
		const cost = UPGRADE_COST[kind];
		if (this.money < cost) return;
		this.money -= cost;
		this.upgrades[kind] = lvl + 1;
		this.emitUi();
	}
	nextFromShop() {
		this.raceIndex += 1;
		if (this.raceIndex >= 8) {
			this.phase = "champion";
			if (this.money > this.bestMoney) {
				this.bestMoney = this.money;
				const save = loadSave();
				save.bestMoney = this.money;
				writeSave(save);
			}
			this.audio.finish(true);
			this.emitUi();
			return;
		}
		this.startRace();
	}
	retryRace() {
		this.startRace();
	}
	toTitle() {
		this.bootAttract();
		this.emitUi();
	}
	toggleMute() {
		this.muted = !this.muted;
		this.audio.setMuted(this.muted);
		const save = loadSave();
		save.muted = this.muted;
		writeSave(save);
		this.emitUi();
	}
	tick(dt) {
		if (this.phase === "yard" || this.phase === "test3d") return;
		const actions = this.input.poll();
		if (this.input.muteEdge) this.toggleMute();
		if (this.input.pauseEdge && (this.phase === "racing" || this.phase === "countdown")) {
			this.paused = !this.paused;
			this.emitUi();
		}
		const racingPhases = this.phase === "racing" || this.phase === "countdown" || this.phase === "title";
		const freeze = this.paused || this.phase === "countdown" || this.phase === "select" || this.phase === "howto" || this.phase === "results" || this.phase === "shop" || this.phase === "gameover" || this.phase === "champion";
		if (this.phase === "countdown" && !this.paused) {
			const prev = this.countdown;
			this.countdown -= dt;
			const n = Math.ceil(this.countdown);
			if (n !== this.lastBeep && n >= 0 && n <= 3) {
				this.audio.countdown(n);
				this.lastBeep = n;
			}
			if (prev > 0 && this.countdown <= 0) {
				this.phase = "racing";
				this.countdown = 0;
				this.emitUi();
			}
		}
		this.acc += dt;
		while (this.acc >= STEP) {
			this.acc -= STEP;
			if (this.track && racingPhases && !this.paused) {
				const simRacing = this.phase === "racing" || this.phase === "title";
				const act = freeze && this.phase !== "title" ? {
					throttle: 0,
					steer: 0,
					nitro: false,
					brake: 0
				} : actions;
				const playerAct = this.phase === "title" ? {
					throttle: 0,
					steer: 0,
					nitro: false,
					brake: 0
				} : act;
				stepRace(STEP, this.trucks, this.track, this.upgrades, this.phase === "title" ? {
					throttle: 1,
					steer: 0,
					nitro: false,
					brake: 0
				} : playerAct, this.particles, this.pickups, simRacing, this.time, (e, t) => {
					if (e === "bump" && t.isPlayer) {
						this.trauma = Math.min(1, this.trauma + .25);
						this.audio.bump();
					}
					if (e === "land" && t.isPlayer) {
						this.trauma = Math.min(1, this.trauma + .18);
						this.audio.land();
					}
					if (e === "pickup") this.audio.pickup();
					if (e === "nitro") this.audio.nitro();
				});
				this.time += STEP;
				if (this.phase === "title" && this.trucks.some((t) => t.finished) && this.track) {
					placeTrucks(this.trucks, this.track);
					this.pickups = spawnPickups(this.track);
				}
			}
		}
		const player = this.trucks.find((t) => t.isPlayer);
		if (this.phase === "racing" && player) {
			this.audio.engineTo(player.speed, player.nitroTimer > 0, true);
			if (allFinished(this.trucks) || player.finished) {
				if (player.finished || this.trucks.filter((t) => t.finished).length >= 4) this.finishHeat();
			}
		} else this.audio.engineTo(this.phase === "title" ? 80 : 0, false, this.phase === "title");
		this.trauma = Math.max(0, this.trauma - dt * 1.8);
		this.draw();
	}
	finishHeat() {
		if (this.phase !== "racing") return;
		const player = this.trucks.find((t) => t.isPlayer);
		if (!player) return;
		if (!player.finished) return;
		const place = player.finishPlace || racePlace(this.trucks, player);
		player.finishPlace = place;
		const prize = this.mode === "practice" ? 0 : PRIZE[place - 1] ?? 0;
		this.money += prize + player.cashBonus;
		this.playerNitro = player.nitro;
		this.audio.finish(place === 1);
		this.trauma = .4;
		if (this.mode === "practice") this.phase = "results";
		else if (place >= 4) this.phase = "gameover";
		else this.phase = "results";
		if (this.money > this.bestMoney) {
			this.bestMoney = this.money;
			const save = loadSave();
			save.bestMoney = this.money;
			writeSave(save);
		}
		this.emitUi();
	}
	continueFromResults() {
		this.phase = "shop";
		this.emitUi();
	}
	draw() {
		const ctx = this.ctx;
		fitCanvas(ctx, this.cssW, this.cssH, this.dpr);
		const shakeAmt = this.trauma * this.trauma * 7;
		const shake = {
			x: (Math.random() - .5) * 2 * shakeAmt,
			y: (Math.random() - .5) * 2 * shakeAmt
		};
		if (this.track) drawWorld(ctx, this.track, this.trucks, this.particles, this.pickups, this.imgs ?? {
			dirt: null,
			grass: null,
			money: null,
			nitro: null,
			title: null
		}, this.time, shake);
		else {
			ctx.fillStyle = "#1a1612";
			ctx.fillRect(0, 0, 800, 480);
		}
		if ((this.phase === "racing" || this.phase === "countdown" || this.phase === "title") && this.track) drawHud(ctx, this.trucks, this.money, this.upgrades, this.phase === "title" ? "TATER'S TRUCKS" : this.track.name, this.raceIndex, 8, this.phase === "countdown" ? this.countdown : 0, this.paused);
		else if (this.track) drawHud(ctx, this.trucks, this.money, this.upgrades, this.track.name, this.raceIndex, 8, 0, false);
	}
	snapshot() {
		const player = this.trucks.find((t) => t.isPlayer);
		const standings = [...this.trucks].sort((a, b) => {
			return (a.finishPlace || racePlace(this.trucks, a)) - (b.finishPlace || racePlace(this.trucks, b));
		}).map((t) => ({
			name: t.name,
			color: t.color,
			place: t.finishPlace || racePlace(this.trucks, t),
			isPlayer: t.isPlayer
		}));
		const place = player ? player.finishPlace || racePlace(this.trucks, player) : 4;
		return {
			phase: this.phase,
			mode: this.mode,
			trackName: this.track?.name ?? "",
			raceIndex: this.raceIndex,
			raceCount: this.mode === "practice" ? 1 : 8,
			money: this.money,
			nitro: player?.nitro ?? 4,
			upgrades: { ...this.upgrades },
			playerColor: this.playerColor,
			standings,
			prize: PRIZE[place - 1] ?? 0,
			countdown: this.countdown,
			muted: this.muted,
			bestMoney: this.bestMoney,
			paused: this.paused,
			lap: player ? Math.min(4, player.lap + 1) : 1,
			place
		};
	}
	emitUi() {
		this.onUi?.(this.snapshot());
	}
	installProbe() {
		const self = this;
		window.__controlsTest = {
			getYaw: () => self.trucks.find((t) => t.isPlayer)?.yaw ?? 0,
			getSpeed: () => self.trucks.find((t) => t.isPlayer)?.speed ?? 0,
			setSteer: (v) => {
				self.input.qaSteer = v;
			},
			setKeys: (codes) => {
				self.input.qaKeys = codes;
				if (codes.length) {
					if (!self.trucks.some((t) => t.isPlayer)) self.beginChampionship();
					self.phase = "racing";
					self.countdown = 0;
					self.paused = false;
				}
			}
		};
	}
};
var CAM_CYCLE = [
	"top",
	"chase",
	"orbit",
	"hood"
];
var CAM_LABEL = {
	top: "Top down",
	chase: "Chase",
	orbit: "Orbit",
	hood: "Hood"
};
var desired = new Vector3();
var look = new Vector3();
var fwd = new Vector3();
function nextCam(mode) {
	return CAM_CYCLE[(CAM_CYCLE.indexOf(mode) + 1) % CAM_CYCLE.length];
}
function applyCamera(camera, mode, x, z, yaw, dt, orbit) {
	fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
	look.set(x, .7, z);
	if (mode === "top") desired.set(x + fwd.x * 2.2, 28, z + fwd.z * 2.2);
	else if (mode === "chase") {
		desired.set(x - fwd.x * 9.5, 4.2, z - fwd.z * 9.5);
		look.set(x + fwd.x * 3, 1.1, z + fwd.z * 3);
	} else if (mode === "orbit") {
		const cp = Math.cos(orbit.phi);
		const sp = Math.sin(orbit.phi);
		const dist = 11;
		desired.set(x + Math.sin(orbit.theta) * cp * dist, 2.4 + sp * dist, z + Math.cos(orbit.theta) * cp * dist);
	} else {
		desired.set(x + fwd.x * .85, 1.42, z + fwd.z * .85);
		look.set(x + fwd.x * 14, 1.15, z + fwd.z * 14);
	}
	const k = mode === "hood" ? 1 : 1 - Math.pow(.001, dt);
	camera.position.lerp(desired, k);
	if (camera instanceof PerspectiveCamera) {
		camera.fov = mode === "hood" ? 68 : mode === "top" ? 42 : 52;
		camera.updateProjectionMatrix();
	}
	camera.lookAt(look);
}
function nudgeOrbit(orbit, dx, dy) {
	orbit.theta -= dx * .012;
	orbit.phi = clampPhi(orbit.phi + dy * .01);
}
function clampPhi(p) {
	return Math.max(.12, Math.min(1.15, p));
}
var WALL_H = 2.75;
var PX = .1;
function bounceXZ(b, nx, nz, overlap) {
	b.x += nx * overlap;
	b.z += nz * overlap;
	const fx = -Math.sin(b.yaw);
	const fz = -Math.cos(b.yaw);
	const vx = fx * b.speed;
	const vz = fz * b.speed;
	const vn = vx * nx + vz * nz;
	if (vn >= 0) {
		b.speed *= .88;
		return false;
	}
	let rx = vx - 1.48 * vn * nx;
	let rz = vz - 1.48 * vn * nz;
	rx *= .9;
	rz *= .9;
	b.speed = Math.hypot(rx, rz);
	if (b.speed > 1.2) b.yaw = wrapPi(Math.atan2(-rx, -rz));
	if (-vn > 6) b.hop = Math.max(b.hop, .55);
	return -vn > 2.2;
}
function collideWalls(b, walls, radius) {
	let hit = false;
	for (const w of walls) {
		const dx = w.bx - w.ax;
		const dz = w.bz - w.az;
		const len2 = dx * dx + dz * dz || 1;
		let t = ((b.x - w.ax) * dx + (b.z - w.az) * dz) / len2;
		t = clamp(t, 0, 1);
		const px = w.ax + dx * t;
		const pz = w.az + dz * t;
		const ex = b.x - px;
		const ez = b.z - pz;
		const d = Math.hypot(ex, ez);
		if (d < radius && d > 1e-4) {
			if (bounceXZ(b, ex / d, ez / d, radius - d)) hit = true;
		}
	}
	return hit;
}
function boxWalls(x, z, w, d) {
	const x0 = x - w / 2;
	const x1 = x + w / 2;
	const z0 = z - d / 2;
	const z1 = z + d / 2;
	return [
		{
			ax: x0,
			az: z0,
			bx: x1,
			bz: z0
		},
		{
			ax: x1,
			az: z0,
			bx: x1,
			bz: z1
		},
		{
			ax: x1,
			az: z1,
			bx: x0,
			bz: z1
		},
		{
			ax: x0,
			az: z1,
			bx: x0,
			bz: z0
		}
	];
}
function stepBody(b, act, dt, onDirt = true) {
	const vmax = 168 * PX * (onDirt ? 1 : .52);
	const acc = 195 * PX;
	const turn = TURN_RATE * .72;
	const speedFactor = clamp(.22 + Math.abs(b.speed) / Math.max(4, vmax) * .9, .22, 1);
	const reverse = b.speed >= -.8 ? 1 : -1;
	b.yaw = wrapPi(b.yaw + act.steer * turn * speedFactor * reverse * dt);
	if (act.brake > 0) b.speed -= 240 * PX * dt;
	else if (act.throttle > 0) b.speed += acc * act.throttle * dt;
	else b.speed -= b.speed * COAST * dt;
	b.speed -= b.speed * DRAG * dt;
	if (!onDirt) b.speed -= b.speed * 1.4 * dt;
	b.speed = clamp(b.speed, -vmax * .28, vmax);
	const fx = -Math.sin(b.yaw);
	const fz = -Math.cos(b.yaw);
	b.x += fx * b.speed * dt;
	b.z += fz * b.speed * dt;
	b.hop = Math.max(0, b.hop - dt * 4);
}
function inZone(b, z) {
	return Math.hypot(b.x - z.x, b.z - z.z) < z.r;
}
var SHOP_YARD = {
	name: "Spud Yard",
	spawn: {
		x: 0,
		z: 16.5,
		yaw: 0
	},
	ground: {
		w: 72,
		d: 56
	},
	buildings: [{
		id: "tires",
		name: "TIRE BARN",
		x: -12.5,
		z: -8,
		w: 9,
		d: 11,
		h: 5.2,
		color: "#6a4030",
		accent: "#c4783a"
	}, {
		id: "nitro",
		name: "NITRO SHED",
		x: 12.5,
		z: -8,
		w: 9,
		d: 11,
		h: 4.6,
		color: "#3a4a38",
		accent: "#e07a28"
	}],
	shops: [{
		id: "tires",
		x: -12.5,
		z: -1.2,
		r: 4.2,
		hint: "Tire Barn — shop opens later"
	}, {
		id: "nitro",
		x: 12.5,
		z: -1.2,
		r: 4.2,
		hint: "Nitro Shed — shop opens later"
	}],
	exit: {
		x: 0,
		z: -24,
		r: 5.5,
		id: "exit",
		hint: "Head out to leave"
	}
};
function shopWalls() {
	const g = SHOP_YARD.ground;
	return [
		{
			ax: -g.w / 2,
			az: -g.d / 2,
			bx: -4,
			bz: -g.d / 2
		},
		{
			ax: 4,
			az: -g.d / 2,
			bx: g.w / 2,
			bz: -g.d / 2
		},
		{
			ax: -g.w / 2,
			az: g.d / 2,
			bx: -4,
			bz: g.d / 2
		},
		{
			ax: 4,
			az: g.d / 2,
			bx: g.w / 2,
			bz: g.d / 2
		},
		{
			ax: -g.w / 2,
			az: -g.d / 2,
			bx: -g.w / 2,
			bz: g.d / 2
		},
		{
			ax: g.w / 2,
			az: -g.d / 2,
			bx: g.w / 2,
			bz: g.d / 2
		},
		...SHOP_YARD.buildings.flatMap((b) => boxWalls(b.x, b.z, b.w + .35, b.d + .35))
	];
}
function shopWallBoxes() {
	const g = SHOP_YARD.ground;
	const h = 2.75;
	const t = .55;
	return [
		{
			x: -g.w / 4 - 2,
			z: -g.d / 2,
			w: g.w / 2 - 4,
			d: t,
			h
		},
		{
			x: g.w / 4 + 2,
			z: -g.d / 2,
			w: g.w / 2 - 4,
			d: t,
			h
		},
		{
			x: -g.w / 4 - 2,
			z: g.d / 2,
			w: g.w / 2 - 4,
			d: t,
			h
		},
		{
			x: g.w / 4 + 2,
			z: g.d / 2,
			w: g.w / 2 - 4,
			d: t,
			h
		},
		{
			x: -g.w / 2,
			z: 0,
			w: t,
			d: g.d,
			h
		},
		{
			x: g.w / 2,
			z: 0,
			w: t,
			d: g.d,
			h
		}
	];
}
function to3(x, y) {
	return {
		x: (x - 400) * PX,
		z: (y - 240) * PX
	};
}
function makeTestTrack3() {
	const def = assembleLayout(TEST_LOOP, 7);
	const walls = [];
	const wallBoxes = [];
	const rings = def.wallRings ?? [];
	for (const ring of rings) for (let i = 0; i < ring.length; i++) {
		const a = to3(ring[i].x, ring[i].y);
		const b = to3(ring[(i + 1) % ring.length].x, ring[(i + 1) % ring.length].y);
		walls.push({
			ax: a.x,
			az: a.z,
			bx: b.x,
			bz: b.z
		});
		const dx = b.x - a.x;
		const dz = b.z - a.z;
		const len = Math.hypot(dx, dz);
		if (len < .15) continue;
		wallBoxes.push({
			x: (a.x + b.x) / 2,
			z: (a.z + b.z) / 2,
			rot: Math.atan2(dx, dz),
			len,
			thick: .48,
			h: WALL_H
		});
	}
	const slabs = [];
	const ox = def.originX ?? 0;
	const oy = def.originY ?? 0;
	const s = 160 * PX;
	const rw = 152 * PX;
	for (const p of def.placed ?? []) {
		const c = to3(ox + p.col * 160 + 80, oy + p.row * 160 + 80);
		const rot = -p.rot * (Math.PI / 2);
		if (p.id === "straight") slabs.push({
			x: c.x,
			z: c.z,
			rot,
			w: s,
			d: rw
		});
		else {
			const steps = 10;
			for (let i = 0; i < steps; i++) {
				const t = (i + .5) / steps;
				const a = -Math.PI / 2 + t * (Math.PI / 2);
				const localX = Math.cos(a) * 80;
				const localY = 160 + Math.sin(a) * 80;
				const lx = localX - 80;
				const ly = localY - 80;
				Math.cos(-rot);
				Math.sin(-rot);
				const rx = lx * Math.cos(rot) - ly * Math.sin(rot);
				const rz = lx * Math.sin(rot) + ly * Math.cos(rot);
				slabs.push({
					x: c.x + rx * PX,
					z: c.z + rz * PX,
					rot: rot + a + Math.PI / 2,
					w: 160 / steps * PX * 1.35,
					d: rw
				});
			}
		}
	}
	const path = def.path.map((p) => to3(p.x, p.y));
	const spawn = path[Math.max(0, path.length - 4)] ?? {
		x: 0,
		z: 8
	};
	const n = path[Math.max(0, path.length - 3)] ?? {
		x: 0,
		z: 0
	};
	const yaw = Math.atan2(-(n.x - spawn.x), -(n.z - spawn.z));
	return {
		name: def.name,
		walls,
		wallBoxes,
		slabs,
		path,
		spawn: {
			x: spawn.x,
			z: spawn.z,
			yaw
		},
		width: rw
	};
}
function Wheel({ position }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
		position,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				rotation: [
					0,
					0,
					Math.PI / 2
				],
				castShadow: true,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
					.48,
					.48,
					.36,
					14
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#1a1614",
					roughness: .92
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				rotation: [
					0,
					0,
					Math.PI / 2
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
					.22,
					.22,
					.38,
					10
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#3a3a36",
					metalness: .4,
					roughness: .45
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				rotation: [
					0,
					0,
					Math.PI / 2
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
					.07,
					.07,
					.4,
					8
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#d0ccc4",
					metalness: .6,
					roughness: .3
				})]
			})
		]
	});
}
function TruckModel({ color, body, hide = false }) {
	const pal = TRUCK_PALETTE[color];
	const group = (0, import_react.useRef)(null);
	const nitroMesh = (0, import_react.useRef)(null);
	useFrame((_, dt) => {
		const g = group.current;
		if (!g) return;
		g.visible = !hide;
		const y = .48 + Math.sin(body.hop * Math.PI) * .12;
		g.position.set(body.x, y, body.z);
		g.rotation.y = body.yaw;
		g.traverse((obj) => {
			if (obj instanceof Mesh && obj.geometry.type === "CylinderGeometry") obj.rotation.x += body.speed / .48 * dt;
		});
		if (nitroMesh.current) nitroMesh.current.visible = body.speed > 16;
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
		ref: group,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wheel, { position: [
				-.95,
				0,
				-1.22
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wheel, { position: [
				.95,
				0,
				-1.22
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wheel, { position: [
				-.95,
				0,
				1.18
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wheel, { position: [
				.95,
				0,
				1.18
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					0,
					.22,
					0
				],
				castShadow: true,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					1.55,
					.28,
					3.7
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#1c1c1c",
					roughness: .8
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					0,
					.28,
					-2.05
				],
				castShadow: true,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					1.85,
					.32,
					.28
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { color: "#141414" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					0,
					.32,
					-2.22
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					.42,
					.22,
					.18
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { color: "#2a2a28" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					0,
					.58,
					-1.35
				],
				castShadow: true,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					1.62,
					.38,
					1.15
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: pal.body,
					roughness: .55
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					0,
					.62,
					-1.94
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					1.05,
					.32,
					.08
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { color: "#141414" })]
			}),
			[
				-.32,
				0,
				.32
			].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					x,
					.62,
					-1.97
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					.16,
					.26,
					.05
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { color: "#0c0c0c" })]
			}, x)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					-.52,
					.58,
					-1.96
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sphereGeometry", { args: [
					.13,
					12,
					10
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#f6f0d4",
					emissive: "#f2e8b0",
					emissiveIntensity: .6
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					.52,
					.58,
					-1.96
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sphereGeometry", { args: [
					.13,
					12,
					10
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#f6f0d4",
					emissive: "#f2e8b0",
					emissiveIntensity: .6
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					-.78,
					.62,
					-1.9
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sphereGeometry", { args: [
					.06,
					8,
					8
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#e07a28",
					emissive: "#c06018",
					emissiveIntensity: .4
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					.78,
					.62,
					-1.9
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sphereGeometry", { args: [
					.06,
					8,
					8
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#e07a28",
					emissive: "#c06018",
					emissiveIntensity: .4
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					0,
					.95,
					-.15
				],
				castShadow: true,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					1.58,
					.95,
					1.25
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: pal.body,
					roughness: .55
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					0,
					1.12,
					-.72
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					1.42,
					.55,
					.08
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#243038",
					metalness: .3,
					roughness: .2,
					transparent: true,
					opacity: .85
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					-.8,
					1.08,
					-.15
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					.06,
					.42,
					.7
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#1a2830",
					transparent: true,
					opacity: .7
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					.8,
					1.08,
					-.15
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					.06,
					.42,
					.7
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#1a2830",
					transparent: true,
					opacity: .7
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					0,
					.52,
					1.15
				],
				receiveShadow: true,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					1.62,
					.08,
					1.7
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#5a4030",
					roughness: .9
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					-.8,
					.78,
					1.15
				],
				castShadow: true,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					.1,
					.52,
					1.7
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: pal.body,
					roughness: .6
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					.8,
					.78,
					1.15
				],
				castShadow: true,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					.1,
					.52,
					1.7
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: pal.body,
					roughness: .6
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					0,
					.78,
					1.98
				],
				castShadow: true,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					1.62,
					.52,
					.1
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: pal.body,
					roughness: .6
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					0,
					1.55,
					-.15
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					1.5,
					.05,
					1.15
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { color: "#1a1a18" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					-.38,
					1.62,
					-.68
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sphereGeometry", { args: [
					.1,
					10,
					8
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#f4f0dc",
					emissive: "#fff2c0",
					emissiveIntensity: .7
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					.38,
					1.62,
					-.68
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sphereGeometry", { args: [
					.1,
					10,
					8
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#f4f0dc",
					emissive: "#fff2c0",
					emissiveIntensity: .7
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					-1,
					1.05,
					-.55
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					.18,
					.14,
					.08
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { color: "#1c1c1c" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					1,
					1.05,
					-.55
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					.18,
					.14,
					.08
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { color: "#1c1c1c" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				ref: nitroMesh,
				position: [
					0,
					.55,
					2.35
				],
				visible: false,
				rotation: [
					Math.PI,
					0,
					0
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("coneGeometry", { args: [
					.28,
					1.4,
					8
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#ff7a18",
					emissive: "#ff4a00",
					emissiveIntensity: 1.4,
					transparent: true,
					opacity: .85
				})]
			})
		]
	});
}
var EMPTY_PATH = [];
function TireStack({ x, z }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("group", {
		position: [
			x,
			0,
			z
		],
		children: [
			0,
			1,
			2
		].map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			position: [
				0,
				.22 + i * .42,
				0
			],
			rotation: [
				Math.PI / 2,
				0,
				0
			],
			castShadow: true,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("torusGeometry", { args: [
				.38,
				.16,
				8,
				14
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: i % 2 ? "#ecece8" : "#1c1c1c",
				roughness: .85
			})]
		}, i))
	});
}
function ShopScenery({ walls }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			rotation: [
				-Math.PI / 2,
				0,
				0
			],
			position: [
				0,
				0,
				0
			],
			receiveShadow: true,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("planeGeometry", { args: [SHOP_YARD.ground.w + 40, SHOP_YARD.ground.d + 40] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { color: "#3a6a2c" })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			rotation: [
				-Math.PI / 2,
				0,
				0
			],
			position: [
				0,
				.02,
				0
			],
			receiveShadow: true,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("planeGeometry", { args: [18, 48] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { color: "#c49648" })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			rotation: [
				-Math.PI / 2,
				0,
				0
			],
			position: [
				0,
				.03,
				-2
			],
			receiveShadow: true,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("planeGeometry", { args: [42, 28] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { color: "#b8894a" })]
		}),
		SHOP_YARD.buildings.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
			position: [
				b.x,
				b.h / 2,
				b.z
			],
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
					castShadow: true,
					receiveShadow: true,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
						b.w,
						b.h,
						b.d
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
						color: b.color,
						roughness: .8
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
					position: [
						0,
						b.h / 2 + .15,
						0
					],
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
						b.w + .6,
						.3,
						b.d + .6
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { color: "#2a2018" })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
					position: [
						0,
						.2,
						b.d / 2 + .04
					],
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
						2.4,
						3.2,
						.08
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { color: "#1a1410" })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Html, {
					position: [
						0,
						.6,
						b.d / 2 + .2
					],
					center: true,
					distanceFactor: 18,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "whitespace-nowrap rounded-xs bg-surface/90 px-2 py-1 font-display text-lg tracking-wide text-fg",
						children: b.name
					})
				})
			]
		}, b.id)),
		walls.map((w, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			position: [
				w.x,
				w.h / 2,
				w.z
			],
			castShadow: true,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				w.w,
				w.h,
				w.d
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: "#1a1a1a",
				roughness: .9
			})]
		}, i)),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TireStack, {
			x: -6,
			z: 6
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TireStack, {
			x: 6,
			z: 6
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TireStack, {
			x: -18,
			z: 4
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TireStack, {
			x: 18,
			z: 4
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Html, {
			position: [
				0,
				2.4,
				-26
			],
			center: true,
			distanceFactor: 22,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "whitespace-nowrap rounded-xs bg-surface/90 px-2 py-1 font-mono text-xs tracking-widest text-muted",
				children: "TO MENU"
			})
		})
	] });
}
function TestScenery({ slabs, wallBoxes }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			rotation: [
				-Math.PI / 2,
				0,
				0
			],
			position: [
				0,
				0,
				0
			],
			receiveShadow: true,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("planeGeometry", { args: [90, 70] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { color: "#3a6a2c" })]
		}),
		slabs.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			position: [
				s.x,
				.06,
				s.z
			],
			rotation: [
				0,
				s.rot,
				0
			],
			receiveShadow: true,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				s.w,
				.12,
				s.d
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: "#c49648",
				roughness: .95
			})]
		}, i)),
		wallBoxes.map((w, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			position: [
				w.x,
				w.h / 2,
				w.z
			],
			rotation: [
				0,
				w.rot,
				0
			],
			castShadow: true,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
				w.thick,
				w.h,
				w.len
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: i % 2 ? "#ecece8" : "#1c1c1c",
				roughness: .85
			})]
		}, i))
	] });
}
function Rig({ body, mode, orbit }) {
	const { camera } = useThree();
	useFrame((_, dt) => {
		const b = body.current;
		applyCamera(camera, mode, b.x, b.z, b.yaw, Math.min(dt, .05), orbit.current);
	});
	return null;
}
function DriveSim({ kind, color, engine, onExit, onHint, camMode, setCamMode, bodies, player, walls, zones, path, orbit }) {
	const acc = (0, import_react.useRef)(0);
	const left = (0, import_react.useRef)(false);
	const lastHint = (0, import_react.useRef)(void 0);
	(0, import_react.useEffect)(() => {
		window.__controlsTest = {
			getYaw: () => player.current.yaw,
			getSpeed: () => player.current.speed,
			setSteer: (v) => {
				engine.input.qaSteer = v;
			},
			setKeys: (codes) => {
				engine.input.qaKeys = codes.length ? codes : null;
			}
		};
		return () => engine.installProbe();
	}, [engine, player]);
	useFrame((_, dt) => {
		const d = Math.min(dt, .1);
		acc.current += d;
		const STEP = 1 / 60;
		const act = engine.input.poll();
		if (engine.input.cameraEdge) setCamMode(nextCam(camMode));
		if (engine.input.muteEdge) engine.toggleMute();
		if (camMode === "orbit") {
			const pads = navigator.getGamepads?.() ?? [];
			for (const pad of pads) {
				if (!pad) continue;
				const ax = pad.axes[2] ?? 0;
				const ay = pad.axes[3] ?? 0;
				if (Math.abs(ax) > .12 || Math.abs(ay) > .12) nudgeOrbit(orbit.current, ax * 6, ay * 6);
			}
			orbit.current.theta += d * .08;
		}
		while (acc.current >= STEP) {
			acc.current -= STEP;
			const list = bodies.current;
			for (const b of list) {
				let a = act;
				if (!b.isPlayer) a = aiAct(b, path);
				stepBody(b, a, STEP, true);
				collideWalls(b, walls, 1.15);
				b.hop = Math.max(0, b.hop - STEP * 4);
			}
		}
		const p = player.current;
		engine.audio.engineTo(Math.abs(p.speed) / .1, false, true);
		let hint = null;
		for (const z of zones) if (inZone(p, z)) {
			if (z.id === "exit") {
				if (!left.current) {
					left.current = true;
					onExit();
				}
			} else hint = z.hint;
		}
		if (hint !== lastHint.current) {
			lastHint.current = hint;
			onHint(hint);
		}
	});
	return null;
}
function aiAct(b, path) {
	if (path.length < 2) return {
		throttle: .6,
		steer: 0,
		nitro: false,
		brake: 0
	};
	let best = 0;
	let bestD = 1e9;
	for (let i = 0; i < path.length; i++) {
		const d = (b.x - path[i].x) ** 2 + (b.z - path[i].z) ** 2;
		if (d < bestD) {
			bestD = d;
			best = i;
		}
	}
	const look = path[(best + 4) % path.length];
	const err = wrapPi(Math.atan2(-(look.x - b.x), -(look.z - b.z)) - b.yaw);
	return {
		throttle: Math.abs(err) > .9 ? .55 : .85,
		steer: Math.max(-1, Math.min(1, err * 2.4)),
		nitro: false,
		brake: 0
	};
}
function Scene({ kind, color, engine, onExit, onHint, camMode, setCamMode }) {
	const test = (0, import_react.useMemo)(() => kind === "test" ? makeTestTrack3() : null, [kind]);
	const shopW = (0, import_react.useMemo)(() => kind === "shop" ? shopWalls() : [], [kind]);
	const shopBoxes = (0, import_react.useMemo)(() => kind === "shop" ? shopWallBoxes() : [], [kind]);
	const spawn = kind === "shop" ? SHOP_YARD.spawn : test.spawn;
	const walls = kind === "shop" ? shopW : test.walls;
	const zones = kind === "shop" ? [...SHOP_YARD.shops, SHOP_YARD.exit] : [];
	const path = kind === "test" ? test.path : EMPTY_PATH;
	const pack = (0, import_react.useMemo)(() => {
		const p = {
			x: spawn.x,
			z: spawn.z,
			yaw: spawn.yaw,
			speed: 0,
			color,
			isPlayer: true,
			aiSkill: 1,
			hop: 0
		};
		let rest = [];
		if (kind === "test") {
			const cols = PLAYER_COLORS.filter((c) => c !== color);
			rest = [
				cols[0],
				cols[1],
				"white"
			].map((c, i) => {
				const pt = path[(i * 8 + 6) % Math.max(1, path.length)] ?? spawn;
				return {
					x: pt.x + (i - 1) * 1.4,
					z: pt.z,
					yaw: spawn.yaw,
					speed: 8 + i,
					color: c,
					isPlayer: false,
					aiSkill: .5 + i * .1,
					hop: 0
				};
			});
		}
		return {
			p,
			rest,
			all: [p, ...rest]
		};
	}, [
		kind,
		color,
		spawn.x,
		spawn.z,
		spawn.yaw,
		path
	]);
	const player = (0, import_react.useRef)(pack.p);
	player.current = pack.p;
	const bodies = (0, import_react.useRef)(pack.all);
	bodies.current = pack.all;
	const orbit = (0, import_react.useRef)({
		theta: .7,
		phi: .42
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("color", {
			attach: "background",
			args: ["#8aa8c4"]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("fog", {
			attach: "fog",
			args: [
				"#8aa8c4",
				40,
				90
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("hemisphereLight", { args: [
			"#e8e0d0",
			"#3a2414",
			.7
		] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("directionalLight", {
			position: [
				18,
				28,
				12
			],
			intensity: 1.35,
			castShadow: true,
			"shadow-mapSize-width": 1024,
			"shadow-mapSize-height": 1024,
			"shadow-camera-far": 80,
			"shadow-camera-left": -40,
			"shadow-camera-right": 40,
			"shadow-camera-top": 40,
			"shadow-camera-bottom": -40
		}),
		kind === "shop" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShopScenery, { walls: shopBoxes }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TestScenery, {
			slabs: test.slabs,
			wallBoxes: test.wallBoxes
		}),
		pack.all.map((b, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TruckModel, {
			color: b.color,
			body: b,
			hide: camMode === "hood" && b.isPlayer
		}, i)),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rig, {
			body: player,
			mode: camMode,
			orbit
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DriveSim, {
			kind,
			color,
			engine,
			onExit,
			onHint,
			camMode,
			setCamMode,
			bodies,
			player,
			walls,
			zones,
			path,
			orbit
		})
	] });
}
function World3D(props) {
	const dragging = (0, import_react.useRef)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Canvas, {
		className: "absolute inset-0 z-[1]",
		shadows: true,
		dpr: [1, 1.75],
		camera: {
			fov: 52,
			position: [
				0,
				12,
				18
			],
			near: .2,
			far: 160
		},
		onPointerDown: () => {
			dragging.current = true;
		},
		onPointerUp: () => {
			dragging.current = false;
		},
		onPointerMove: (e) => {
			if (!dragging.current || props.camMode !== "orbit") return;
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scene, { ...props })
	});
}
var INITIAL = {
	phase: "title",
	mode: "champ",
	trackName: "",
	raceIndex: 0,
	raceCount: 8,
	money: 0,
	nitro: 4,
	upgrades: {
		tires: 0,
		shocks: 0,
		accel: 0,
		topSpeed: 0
	},
	playerColor: "red",
	standings: [],
	prize: 0,
	countdown: 0,
	muted: false,
	bestMoney: 0,
	paused: false,
	lap: 1,
	place: 1
};
function GameApp() {
	const canvasRef = (0, import_react.useRef)(null);
	const wrapRef = (0, import_react.useRef)(null);
	const engineRef = (0, import_react.useRef)(null);
	const [ui, setUi] = (0, import_react.useState)(INITIAL);
	const [howto, setHowto] = (0, import_react.useState)(false);
	const [options, setOptions] = (0, import_react.useState)(false);
	const [hint, setHint] = (0, import_react.useState)(null);
	const [cam, setCam] = (0, import_react.useState)("chase");
	(0, import_react.useEffect)(() => {
		const canvas = canvasRef.current;
		const wrap = wrapRef.current;
		if (!canvas || !wrap) return;
		const engine = new Engine(canvas);
		engineRef.current = engine;
		engine.onUi = (s) => setUi({ ...s });
		const fit = () => {
			const r = wrap.getBoundingClientRect();
			engine.resize(r.width, r.height, window.devicePixelRatio || 1);
		};
		fit();
		const ro = new ResizeObserver(fit);
		ro.observe(wrap);
		engine.start().then(() => setUi(engine.snapshot()));
		return () => {
			ro.disconnect();
			engine.destroy();
			engineRef.current = null;
		};
	}, []);
	const e = () => engineRef.current;
	const racing = ui.phase === "racing" || ui.phase === "countdown";
	const in3d = ui.phase === "yard" || ui.phase === "test3d";
	const showTouch = racing || in3d;
	(0, import_react.useEffect)(() => {
		if (ui.phase === "yard") {
			setCam("chase");
			setHint(null);
		}
		if (ui.phase === "test3d") {
			setCam("top");
			setHint(null);
		}
	}, [ui.phase]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative h-dvh w-full overflow-hidden bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				ref: wrapRef,
				className: "absolute inset-0 touch-none",
				style: { touchAction: "none" },
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
					ref: canvasRef,
					className: in3d ? "hidden" : "block h-full w-full"
				}), in3d && engineRef.current && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(World3D, {
					kind: ui.phase === "yard" ? "shop" : "test",
					color: ui.playerColor,
					engine: engineRef.current,
					onExit: () => e()?.toTitle(),
					onHint: setHint,
					camMode: cam,
					setCamMode: setCam
				})]
			}),
			ui.phase === "title" && !howto && !options && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Title, {
				ui,
				onStart: () => e()?.playFromTitle(),
				onTest: () => e()?.playTestTrack(),
				onShops: () => e()?.playYard(),
				onHow: () => setHowto(true),
				onOptions: () => setOptions(true)
			}),
			ui.phase === "select" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Select, {
				color: ui.playerColor,
				onColor: (c) => e()?.selectColor(c),
				onStart: () => e()?.beginChampionship(),
				onBack: () => e()?.toTitle()
			}),
			howto && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HowTo, { onClose: () => setHowto(false) }),
			options && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Options, { onClose: () => setOptions(false) }),
			ui.phase === "results" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Results, {
				ui,
				onNext: () => ui.mode === "practice" ? e()?.playTestTrack() : e()?.continueFromResults(),
				onTitle: () => e()?.toTitle()
			}),
			ui.phase === "shop" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shop, {
				ui,
				engine: e()
			}),
			ui.phase === "gameover" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GameOver, {
				ui,
				onRetry: () => e()?.retryRace(),
				onQuit: () => e()?.toTitle()
			}),
			ui.phase === "champion" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Champion, {
				ui,
				onAgain: () => e()?.toTitle()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "absolute right-3 top-3 z-20 flex size-11 items-center justify-center rounded-md border border-border bg-surface/80 text-fg",
				onClick: () => e()?.toggleMute(),
				"aria-label": ui.muted ? "Unmute" : "Mute",
				children: ui.muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { className: "size-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-5" })
			}),
			in3d && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pointer-events-none absolute left-3 top-3 z-20 flex flex-col gap-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-2xl leading-none text-fg",
						children: ui.phase === "yard" ? "Spud Yard" : "Test Loop"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-xs tracking-widest text-muted",
						children: CAM_LABEL[cam].toUpperCase()
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "absolute right-3 top-16 z-20 flex flex-col gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "flex h-11 items-center gap-2 rounded-md border border-border bg-surface/80 px-3 text-sm font-medium text-fg",
							onClick: () => setCam(nextCam(cam)),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "size-4" }), "Cam"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "h-11 rounded-md border border-border bg-surface/80 px-3 text-sm font-medium text-fg",
							onClick: () => setOptions(true),
							children: "Options"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "h-11 rounded-md border border-border bg-surface/80 px-3 text-sm font-medium text-fg",
							onClick: () => e()?.toTitle(),
							children: "Exit"
						})
					]
				}),
				hint && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center px-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "rounded-md border border-border bg-surface/90 px-4 py-2 text-sm text-fg",
						children: hint
					})
				})
			] }),
			showTouch && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TouchPad, {
				engine: e(),
				onCam: () => setCam(nextCam(cam))
			})
		]
	});
}
function Panel({ children, className = "" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: `pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4 ${className}`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "pointer-events-auto w-full max-w-lg rounded-xl border border-border bg-surface/92 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]",
			children
		})
	});
}
function Title({ ui, onStart, onTest, onShops, onHow, onOptions }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-bg/40 p-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "pointer-events-auto flex w-full max-w-md flex-col items-center rounded-xl border border-border bg-surface/90 px-6 py-8 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-xs tracking-[0.35em] text-muted",
					children: "SUPER OFF ROAD"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-1 font-display text-6xl font-semibold leading-none tracking-tight text-fg sm:text-7xl",
					children: "TATER'S TRUCKS"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 max-w-sm text-sm leading-relaxed text-muted",
					children: "Four laps. Four trucks. Nitro, bumps, and a parts shop between heats."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex w-full flex-col gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: onStart,
							className: "h-12 rounded-md bg-primary text-base font-semibold text-primary-fg transition-transform duration-[var(--motion-quick)] hover:brightness-105 active:scale-[0.98]",
							children: "Championship"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: onTest,
							className: "h-12 rounded-md border border-border bg-surface-2 text-sm font-medium text-fg",
							children: "Test Track"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: onShops,
							className: "h-12 rounded-md border border-border bg-surface-2 text-sm font-medium text-fg",
							children: "Shops"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: onOptions,
							className: "h-12 rounded-md border border-border bg-surface-2 text-sm font-medium text-fg",
							children: "Options"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: onHow,
							className: "h-12 rounded-md border border-border bg-surface-2 text-sm font-medium text-fg",
							children: "How to play"
						})
					]
				}),
				ui.bestMoney > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-4 font-mono text-xs text-muted",
					children: ["Best purse ", formatCash(ui.bestMoney)]
				})
			]
		})
	});
}
function TruckThumb({ color }) {
	const ref = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const c = ref.current;
		if (!c) return;
		const ctx = c.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, c.width, c.height);
		drawTruck(ctx, previewTruck(color, 70, 58, -1.12));
	}, [color]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
		ref,
		width: 140,
		height: 96,
		className: "mx-auto block h-24 w-[8.75rem]"
	});
}
function Select({ color, onColor, onStart, onBack }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-xs tracking-[0.28em] text-muted",
			children: "CHOOSE YOUR TRUCK"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "mt-1 font-display text-4xl font-semibold text-fg",
			children: "The field"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-5 grid grid-cols-3 gap-2",
			children: PLAYER_COLORS.map((id) => {
				const p = TRUCK_PALETTE[id];
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => onColor(id),
					className: `rounded-md border p-3 text-left ${color === id ? "border-primary bg-surface-2" : "border-border bg-bg"}`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TruckThumb, { color: id }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mt-1 block text-sm font-medium text-fg",
							children: p.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs text-muted",
							children: p.driver
						})
					]
				}, id);
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-3 text-xs text-muted",
			children: "Iron Spud in white is always the computer champ. Beat the field to keep racing."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-5 flex gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onBack,
				className: "h-11 flex-1 rounded-md border border-border text-sm",
				children: "Back"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onStart,
				className: "h-11 flex-[2] rounded-md bg-primary text-sm font-semibold text-primary-fg",
				children: "Race"
			})]
		})
	] });
}
function HowTo({ onClose }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "font-display text-4xl font-semibold text-fg",
			children: "How to play"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
			className: "mt-4 space-y-2 text-sm leading-relaxed text-muted",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "W / Up or hold Gas — accelerate. S / Down brakes. A / D or arrows steer." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Space or Nitro — one burst per bottle. Xbox: RT gas, LT brake, A nitro, stick steer." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "C or Cam — cycle cameras: top down, chase, orbit, hood." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Four laps. Collect cash sacks. Grass and water will slow you down." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Finish 1st, 2nd, or 3rd to keep the championship. Last place ends the run." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Shops is a 3D yard. Drive up to buildings. The out-road returns to the title." })
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: onClose,
			className: "mt-6 h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-fg",
			children: "Close"
		})
	] });
}
function Options({ onClose }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
		className: "overflow-y-auto",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-xs tracking-[0.28em] text-muted",
				children: "OPTIONS"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-4xl font-semibold text-fg",
				children: "Controls"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 grid gap-3 sm:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-md border border-border bg-bg p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-xl text-fg",
							children: "Keyboard"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "mt-2 space-y-1 text-xs leading-relaxed text-muted",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "W / Up — gas" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "S / Down — brake" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "A D / arrows — steer" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Space — nitro" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "C — camera" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Esc — pause / back" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Mouse — menus, orbit drag later" })
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-md border border-border bg-bg p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-xl text-fg",
							children: "Xbox"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "mt-2 space-y-1 text-xs leading-relaxed text-muted",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "RT — gas" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "LT — brake" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Left stick — steer" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "A — nitro" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Y — camera" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Right stick — orbit" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Menu — pause" })
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-md border border-border bg-bg p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-xl text-fg",
							children: "Phone"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "mt-2 space-y-1 text-xs leading-relaxed text-muted",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Left / Right — steer" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Gas / Brake" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Nitro" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Cam — cycle views" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Exit — back to title" })
							]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-xs text-muted",
				children: "Cameras: Top down (races), Chase (shops), Orbit, Hood. Plug in a pad and it just works."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onClose,
				className: "mt-5 h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-fg",
				children: "Close"
			})
		]
	});
}
function Results({ ui, onNext, onTitle }) {
	const practice = ui.mode === "practice";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-xs tracking-[0.28em] text-muted",
			children: ui.trackName.toUpperCase()
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "font-display text-4xl font-semibold text-fg",
			children: practice ? "Test loop" : "Heat results"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
			className: "mt-4 space-y-2",
			children: ui.standings.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: `flex items-center justify-between rounded-md px-3 py-2 ${s.isPlayer ? "bg-surface-2" : ""}`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "flex items-center gap-2 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "inline-block size-3 rounded-xs",
							style: { background: TRUCK_PALETTE[s.color].body }
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-muted",
							children: s.place
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-fg",
							children: s.name
						})
					]
				}), s.isPlayer && !practice && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-mono text-xs text-muted",
					children: formatCash(ui.prize)
				})]
			}, s.color))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-3 font-mono text-sm text-fg",
			children: ["Purse ", formatCash(ui.money)]
		}),
		practice ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-5 flex gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onTitle,
				className: "h-11 flex-1 rounded-md border border-border text-sm",
				children: "Title"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onNext,
				className: "h-11 flex-[2] rounded-md bg-primary text-sm font-semibold text-primary-fg",
				children: "Race again"
			})]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: onNext,
			className: "mt-5 h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-fg",
			children: "Parts shop"
		})
	] });
}
function Shop({ ui, engine }) {
	const rows = [
		{
			key: "nitro",
			label: "Nitro bottle",
			blurb: "One extra burst"
		},
		{
			key: "tires",
			label: "Tires",
			blurb: "Tighter turning",
			lvl: ui.upgrades.tires
		},
		{
			key: "shocks",
			label: "Shocks",
			blurb: "Less bounce",
			lvl: ui.upgrades.shocks
		},
		{
			key: "accel",
			label: "Acceleration",
			blurb: "Quicker punch",
			lvl: ui.upgrades.accel
		},
		{
			key: "topSpeed",
			label: "Top speed",
			blurb: "Higher trap speed",
			lvl: ui.upgrades.topSpeed
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-end justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-xs tracking-[0.28em] text-muted",
				children: "GARAGE"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-4xl font-semibold text-fg",
				children: "Buy parts"
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-sm text-fg",
				children: formatCash(ui.money)
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-4 space-y-2",
			children: rows.map((r) => {
				const cost = UPGRADE_COST[r.key];
				const maxed = r.key !== "nitro" && (r.lvl ?? 0) >= 5;
				const poor = ui.money < cost;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					disabled: maxed || poor,
					onClick: () => engine?.buy(r.key),
					className: "flex w-full items-center justify-between rounded-md border border-border bg-bg px-3 py-2.5 text-left disabled:opacity-40",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-sm font-medium text-fg",
						children: r.label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-xs text-muted",
						children: [r.blurb, r.lvl != null ? ` · ${r.lvl}/5` : ` · held ${ui.nitro}`]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-xs text-muted",
						children: maxed ? "MAX" : formatCash(cost)
					})]
				}, r.key);
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: () => engine?.nextFromShop(),
			className: "mt-5 h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-fg",
			children: "Next heat"
		})
	] });
}
function GameOver({ ui, onRetry, onQuit }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-xs tracking-[0.28em] text-danger",
			children: "LAST PLACE"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "font-display text-4xl font-semibold text-fg",
			children: "Game over"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-muted",
			children: "Iron Spud and the field boxed you out. Retry this heat or walk back to the title."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-3 font-mono text-sm text-fg",
			children: ["Purse ", formatCash(ui.money)]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-5 flex gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onQuit,
				className: "h-11 flex-1 rounded-md border border-border text-sm",
				children: "Title"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onRetry,
				className: "h-11 flex-[2] rounded-md bg-primary text-sm font-semibold text-primary-fg",
				children: "Retry heat"
			})]
		})
	] });
}
function Champion({ ui, onAgain }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-xs tracking-[0.28em] text-muted",
			children: "CHAMPIONSHIP"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "font-display text-4xl font-semibold text-fg",
			children: "You took the purse"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-muted",
			children: "Eight heats in the dirt. Iron Spud will want a rematch."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-4 font-mono text-lg text-fg",
			children: formatCash(ui.money)
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: onAgain,
			className: "mt-5 h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-fg",
			children: "Title"
		})
	] });
}
function TouchPad({ engine, onCam }) {
	const hold = (fn) => ({
		onPointerDown: (ev) => {
			ev.preventDefault();
			ev.currentTarget.setPointerCapture(ev.pointerId);
			fn(true);
		},
		onPointerUp: () => fn(false),
		onPointerCancel: () => fn(false)
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-between gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "pointer-events-auto flex gap-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "h-14 w-16 rounded-md border border-border bg-surface/80 text-sm font-medium",
					...hold((on) => engine?.input.setTouchSteer(on ? 1 : 0)),
					children: "Left"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "h-14 w-16 rounded-md border border-border bg-surface/80 text-sm font-medium",
					...hold((on) => engine?.input.setTouchSteer(on ? -1 : 0)),
					children: "Right"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "h-14 w-16 rounded-md border border-border bg-surface/80 text-sm font-medium",
					onClick: onCam,
					children: "Cam"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "pointer-events-auto flex gap-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "h-14 w-16 rounded-md border border-border bg-surface/80 text-sm font-medium",
					...hold((on) => engine?.input.setTouchNitro(on)),
					children: "Nitro"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "h-14 w-16 rounded-md border border-border bg-surface/80 text-sm font-medium",
					...hold((on) => engine?.input.setTouchBrake(on)),
					children: "Brake"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "h-14 w-20 rounded-md bg-primary text-sm font-semibold text-primary-fg",
					...hold((on) => engine?.input.setTouchGas(on)),
					children: "Gas"
				})
			]
		})]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GameApp, {});
}
//#endregion
export { Home as component };
