import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Camera, Gamepad2, Volume2, VolumeX } from "lucide-react";
import { Engine } from "@/game/engine";
import { ACTION_META, bindLabel, isKeyBind, isPadBind } from "@/game/bindings";
import { MAX_UPGRADE, PLAYER_COLORS, TRUCK_PALETTE, UPGRADE_COST } from "@/game/constants";
import { drawTruck } from "@/game/draw";
import { previewTruck } from "@/game/sim";
import { formatCash } from "@/game/math";
import type { TruckColorId, UiSnap } from "@/game/types";
import { CAM_LABEL, nextCam, type CamMode } from "@/game/world3d/cameras";
import { World3D } from "@/game/world3d/World3D";

const INITIAL: UiSnap = {
  phase: "title",
  mode: "champ",
  trackName: "",
  raceIndex: 0,
  raceCount: 8,
  money: 0,
  nitro: 4,
  upgrades: { tires: 0, shocks: 0, accel: 0, topSpeed: 0 },
  playerColor: "red",
  standings: [],
  prize: 0,
  countdown: 0,
  muted: false,
  bestMoney: 0,
  paused: false,
  lap: 1,
  place: 1,
};

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [ui, setUi] = useState<UiSnap>(INITIAL);
  const [howto, setHowto] = useState(false);
  const [options, setOptions] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [cam, setCam] = useState<CamMode>("chase");
  const [yardShop, setYardShop] = useState(false);

  useEffect(() => {
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
    void engine.start().then(() => setUi(engine.snapshot()));
    return () => {
      ro.disconnect();
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.input.uiBlock = options || howto || yardShop;
    if (!options) eng.input.cancelListen();
  }, [options, howto, yardShop]);

  const e = () => engineRef.current;
  const racing = ui.phase === "racing" || ui.phase === "countdown";
  const in3d = ui.phase === "yard" || ui.phase === "test3d";
  const showTouch = racing || in3d;

  useEffect(() => {
    if (ui.phase === "yard") {
      setCam("chase");
      setHint(null);
    } else {
      setYardShop(false);
    }
    if (ui.phase === "test3d") {
      setCam("top");
      setHint(null);
    }
  }, [ui.phase]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <div
        ref={wrapRef}
        tabIndex={0}
        className={`absolute inset-0 touch-none outline-none ${in3d || racing ? "cursor-none" : ""}`}
        style={{ touchAction: "none" }}
        onPointerDown={() => wrapRef.current?.focus()}
      >
        <canvas ref={canvasRef} className={in3d ? "hidden" : "block h-full w-full"} />
        {in3d && engineRef.current && (
          <World3D
            kind={ui.phase === "yard" ? "shop" : "test"}
            color={ui.playerColor}
            engine={engineRef.current}
            onExit={() => e()?.toTitle()}
            onHint={setHint}
            onShopEnter={() => setYardShop(true)}
            camMode={cam}
            setCamMode={setCam}
          />
        )}
      </div>

      {ui.phase === "title" && !howto && !options && (
        <Title
          ui={ui}
          onStart={() => e()?.playFromTitle()}
          onTest={() => {
            setCam("top");
            e()?.playTestTrack();
          }}
          onShops={() => e()?.playYard()}
          onHow={() => setHowto(true)}
          onOptions={() => setOptions(true)}
        />
      )}
      {ui.phase === "select" && (
        <Select
          color={ui.playerColor}
          onColor={(c) => e()?.selectColor(c)}
          onStart={() => e()?.beginChampionship()}
          onBack={() => e()?.toTitle()}
        />
      )}
      {howto && <HowTo onClose={() => setHowto(false)} />}
      {options && <Options engine={e()} onClose={() => setOptions(false)} />}
      {ui.phase === "results" && (
        <Results
          ui={ui}
          onNext={() => (ui.mode === "practice" ? e()?.playTestTrack() : e()?.continueFromResults())}
          onTitle={() => e()?.toTitle()}
        />
      )}
      {ui.phase === "shop" && <Shop ui={ui} engine={e()} />}
      {ui.phase === "yard" && yardShop && (
        <Shop ui={ui} engine={e()} onClose={() => setYardShop(false)} closeLabel="Back to the yard" />
      )}
      {ui.phase === "gameover" && (
        <GameOver ui={ui} onRetry={() => e()?.retryRace()} onQuit={() => e()?.toTitle()} />
      )}
      {ui.phase === "champion" && <Champion ui={ui} onAgain={() => e()?.toTitle()} />}

      <button
        type="button"
        className="absolute right-3 top-3 z-20 flex size-11 items-center justify-center rounded-md border border-border bg-surface/80 text-fg"
        onClick={() => e()?.toggleMute()}
        aria-label={ui.muted ? "Unmute" : "Mute"}
      >
        {ui.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
      </button>

      {in3d && (
        <>
          <div className="pointer-events-none absolute left-3 top-3 z-20 flex flex-col gap-1">
            <p className="font-display text-2xl leading-none text-fg">
              {ui.phase === "yard" ? "Spud Yard" : "Test Loop"}
            </p>
            <p className="font-mono text-xs tracking-widest text-muted">{CAM_LABEL[cam].toUpperCase()}</p>
          </div>
          <div className="absolute right-3 top-16 z-20 flex flex-col gap-2">
            <button
              type="button"
              className="flex h-11 items-center gap-2 rounded-md border border-border bg-surface/80 px-3 text-sm font-medium text-fg"
              onClick={() => setCam(nextCam(cam))}
            >
              <Camera className="size-4" />
              Cam
            </button>
            <button
              type="button"
              className="h-11 rounded-md border border-border bg-surface/80 px-3 text-sm font-medium text-fg"
              onClick={() => setOptions(true)}
            >
              Options
            </button>
            {ui.phase === "yard" && (
              <button
                type="button"
                className="h-11 rounded-md border border-border bg-surface/80 px-3 text-sm font-medium text-fg"
                onClick={() => setYardShop(true)}
              >
                Shop
              </button>
            )}
            <button
              type="button"
              className="h-11 rounded-md border border-border bg-surface/80 px-3 text-sm font-medium text-fg"
              onClick={() => e()?.toTitle()}
            >
              Exit
            </button>
          </div>
          {hint && (
            <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center px-4">
              <p className="rounded-md border border-border bg-surface/90 px-4 py-2 text-sm text-fg">{hint}</p>
            </div>
          )}
        </>
      )}

      {showTouch && <TouchPad engine={e()} onCam={() => setCam(nextCam(cam))} />}
    </div>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4 ${className}`}>
      <div className="pointer-events-auto max-h-dvh w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface/92 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        {children}
      </div>
    </div>
  );
}

function Title({
  ui,
  onStart,
  onTest,
  onShops,
  onHow,
  onOptions,
}: {
  ui: UiSnap;
  onStart: () => void;
  onTest: () => void;
  onShops: () => void;
  onHow: () => void;
  onOptions: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-bg/40 p-4">
      <div className="pointer-events-auto flex w-full max-w-md flex-col items-center rounded-xl border border-border bg-surface/90 px-6 py-8 text-center">
        <p className="font-mono text-xs tracking-[0.35em] text-muted">SUPER OFF ROAD</p>
        <h1 className="mt-1 font-display text-6xl font-semibold leading-none tracking-tight text-fg sm:text-7xl">
          TATER'S TRUCKS
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
          Four laps. Four trucks. Nitro, bumps, and a parts shop between heats.
        </p>
        <div className="mt-6 flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={onStart}
            className="h-12 rounded-md bg-primary text-base font-semibold text-primary-fg transition-transform duration-[var(--motion-quick)] hover:brightness-105 active:scale-[0.98]"
          >
            Championship
          </button>
          <button
            type="button"
            onClick={onTest}
            className="h-12 rounded-md border border-border bg-surface-2 text-sm font-medium text-fg"
          >
            Test Track
          </button>
          <button
            type="button"
            onClick={onShops}
            className="h-12 rounded-md border border-border bg-surface-2 text-sm font-medium text-fg"
          >
            Shops
          </button>
          <button
            type="button"
            onClick={onOptions}
            className="h-12 rounded-md border border-border bg-surface-2 text-sm font-medium text-fg"
          >
            Options
          </button>
          <button
            type="button"
            onClick={onHow}
            className="h-12 rounded-md border border-border bg-surface-2 text-sm font-medium text-fg"
          >
            How to play
          </button>
        </div>
        {ui.bestMoney > 0 && (
          <p className="mt-4 font-mono text-xs text-muted">Best purse {formatCash(ui.bestMoney)}</p>
        )}
      </div>
    </div>
  );
}

function TruckThumb({ color }: { color: TruckColorId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    drawTruck(ctx, previewTruck(color, 70, 58, -1.12));
  }, [color]);
  return <canvas ref={ref} width={140} height={96} className="mx-auto block h-24 w-[8.75rem]" />;
}

function Select({
  color,
  onColor,
  onStart,
  onBack,
}: {
  color: TruckColorId;
  onColor: (c: TruckColorId) => void;
  onStart: () => void;
  onBack: () => void;
}) {
  return (
    <Panel>
      <p className="font-mono text-xs tracking-[0.28em] text-muted">CHOOSE YOUR TRUCK</p>
      <h2 className="mt-1 font-display text-4xl font-semibold text-fg">The field</h2>
      <div className="mt-5 grid grid-cols-3 gap-2">
        {PLAYER_COLORS.map((id) => {
          const p = TRUCK_PALETTE[id];
          const on = color === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onColor(id)}
              className={`rounded-md border p-3 text-left ${on ? "border-primary bg-surface-2" : "border-border bg-bg"}`}
            >
              <TruckThumb color={id} />
              <span className="mt-1 block text-sm font-medium text-fg">{p.name}</span>
              <span className="text-xs text-muted">{p.driver}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted">Iron Spud in white is always the computer champ. Beat the field to keep racing.</p>
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={onBack} className="h-11 flex-1 rounded-md border border-border text-sm">
          Back
        </button>
        <button
          type="button"
          onClick={onStart}
          className="h-11 flex-[2] rounded-md bg-primary text-sm font-semibold text-primary-fg"
        >
          Race
        </button>
      </div>
    </Panel>
  );
}

function HowTo({ onClose }: { onClose: () => void }) {
  return (
    <Panel>
      <h2 className="font-display text-4xl font-semibold text-fg">How to play</h2>
      <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
        <li>W / Up or hold Gas — accelerate. S / Down brakes. A / D or arrows steer.</li>
        <li>Space or Nitro — one burst per bottle. Xbox: RT gas, LT brake, A nitro, stick steer.</li>
        <li>C or Cam — cycle cameras: top down, chase, orbit, hood.</li>
        <li>Four laps. Collect cash sacks. Grass and water will slow you down.</li>
        <li>Finish 1st, 2nd, or 3rd to keep the championship. Last place ends the run.</li>
        <li>Shops is a 3D yard. Drive up to buildings. The out-road returns to the title.</li>
      </ul>
      <button
        type="button"
        onClick={onClose}
        className="mt-6 h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-fg"
      >
        Close
      </button>
    </Panel>
  );
}

function Options({ engine, onClose }: { engine: Engine | null; onClose: () => void }) {
  const [, bump] = useState(0);
  useEffect(() => {
    if (!engine) return;
    engine.input.uiBlock = true;
    const tick = () => bump((n) => (n + 1) % 10000);
    engine.input.onBindsChange = tick;
    const id = window.setInterval(tick, 200);
    return () => {
      engine.input.uiBlock = false;
      engine.input.cancelListen();
      engine.input.onBindsChange = null;
      window.clearInterval(id);
    };
  }, [engine]);

  const input = engine?.input;
  const pad = input?.pad;
  const listen = input?.listening;

  return (
    <Panel className="overflow-y-auto">
      <p className="font-mono text-xs tracking-[0.28em] text-muted">OPTIONS</p>
      <h2 className="font-display text-4xl font-semibold text-fg">Controls</h2>

      <div className="mt-3 flex items-start gap-2 rounded-md border border-border bg-bg px-3 py-2">
        <Gamepad2 className="mt-0.5 size-4 shrink-0 text-muted" />
        <div className="min-w-0">
          <p className="text-sm text-fg">
            {pad?.connected ? pad.name : "No controller yet"}
            {input?.live.pads ? ` · ${input.live.pads} pad` : ""}
          </p>
          <p className="font-mono text-xs text-muted">
            stick {input ? input.live.lx.toFixed(2) : "0.00"} · RT {input ? input.live.rt.toFixed(2) : "0.00"} · LT{" "}
            {input ? input.live.lt.toFixed(2) : "0.00"} · A {input ? input.live.a.toFixed(2) : "0.00"}
            {input?.live.last ? ` · last ${input.live.last}` : ""}
          </p>
          <p className="text-xs leading-relaxed text-muted">
            {pad?.connected
              ? "Those numbers should jump when you press. If they stay at 0 while the cursor moves, Windows/Steam still owns the pad — after reboot, click this window and press A. Close Steam if it is open."
              : "Click this window, then press A. The line above must change from 0.00. If it never does, the pad is not reaching the browser."}
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <p className="font-mono text-muted">Action</p>
          <p className="font-mono text-muted">Keyboard</p>
          <p className="font-mono text-muted">Xbox</p>
          {ACTION_META.map((row) => {
            const list = input?.binds[row.id] ?? [];
            const keys = list.filter(isKeyBind);
            const pads = list.filter(isPadBind);
            const waitingKey = listen?.action === row.id && listen.slot === "key";
            const waitingPad = listen?.action === row.id && listen.slot === "pad";
            return (
              <div key={row.id} className="contents">
                <p className="flex items-center text-sm text-fg">{row.label}</p>
                {row.id === "steerAxis" ? (
                  <p className="flex min-h-11 items-center font-mono text-xs text-muted">Stick only</p>
                ) : (
                  <BindCell
                    labels={keys.map(bindLabel)}
                    waiting={waitingKey}
                    onSet={() => input?.startListen(row.id, "key")}
                  />
                )}
                <BindCell
                  labels={pads.map(bindLabel)}
                  waiting={waitingPad}
                  onSet={() => input?.startListen(row.id, "pad")}
                />
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        Click a slot, then press a key or a controller button / stick. Esc cancels. Phone still uses the on-screen Gas, Brake, Nitro, and Cam buttons.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => input?.resetBinds()}
          className="h-11 flex-1 rounded-md border border-border text-sm"
        >
          Reset defaults
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-11 flex-[2] rounded-md bg-primary text-sm font-semibold text-primary-fg"
        >
          Done
        </button>
      </div>
    </Panel>
  );
}

function BindCell({
  labels,
  waiting,
  onSet,
}: {
  labels: string[];
  waiting: boolean;
  onSet: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSet}
      className={`min-h-11 rounded-md border px-2 py-1 text-left font-mono text-xs ${
        waiting ? "border-primary bg-surface-2 text-fg" : "border-border bg-bg text-fg"
      }`}
    >
      {waiting ? "Press…" : labels.length ? labels.join(" · ") : "Unset"}
    </button>
  );
}

function Results({ ui, onNext, onTitle }: { ui: UiSnap; onNext: () => void; onTitle: () => void }) {
  const practice = ui.mode === "practice";
  return (
    <Panel>
      <p className="font-mono text-xs tracking-[0.28em] text-muted">{ui.trackName.toUpperCase()}</p>
      <h2 className="font-display text-4xl font-semibold text-fg">{practice ? "Test loop" : "Heat results"}</h2>
      <ol className="mt-4 space-y-2">
        {ui.standings.map((s) => (
          <li
            key={s.color}
            className={`flex items-center justify-between rounded-md px-3 py-2 ${s.isPlayer ? "bg-surface-2" : ""}`}
          >
            <span className="flex items-center gap-2 text-sm">
              <span className="inline-block size-3 rounded-xs" style={{ background: TRUCK_PALETTE[s.color].body }} />
              <span className="font-mono text-muted">{s.place}</span>
              <span className="text-fg">{s.name}</span>
            </span>
            {s.isPlayer && !practice && <span className="font-mono text-xs text-muted">{formatCash(ui.prize)}</span>}
          </li>
        ))}
      </ol>
      <p className="mt-3 font-mono text-sm text-fg">Purse {formatCash(ui.money)}</p>
      {practice ? (
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onTitle} className="h-11 flex-1 rounded-md border border-border text-sm">
            Title
          </button>
          <button
            type="button"
            onClick={onNext}
            className="h-11 flex-[2] rounded-md bg-primary text-sm font-semibold text-primary-fg"
          >
            Race again
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onNext}
          className="mt-5 h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-fg"
        >
          Parts shop
        </button>
      )}
    </Panel>
  );
}

function Shop({
  ui,
  engine,
  onClose,
  closeLabel,
}: {
  ui: UiSnap;
  engine: Engine | null;
  onClose?: () => void;
  closeLabel?: string;
}) {
  const rows: { key: "nitro" | "tires" | "shocks" | "accel" | "topSpeed"; label: string; blurb: string; lvl?: number }[] = [
    { key: "nitro", label: "Nitro bottle", blurb: "One extra burst" },
    { key: "tires", label: "Tires", blurb: "Tighter turning", lvl: ui.upgrades.tires },
    { key: "shocks", label: "Shocks", blurb: "Less bounce", lvl: ui.upgrades.shocks },
    { key: "accel", label: "Acceleration", blurb: "Quicker punch", lvl: ui.upgrades.accel },
    { key: "topSpeed", label: "Top speed", blurb: "Higher trap speed", lvl: ui.upgrades.topSpeed },
  ];
  return (
    <Panel>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-[0.28em] text-muted">GARAGE</p>
          <h2 className="font-display text-4xl font-semibold text-fg">Buy parts</h2>
        </div>
        <p className="font-mono text-sm text-fg">{formatCash(ui.money)}</p>
      </div>
      <div className="mt-4 space-y-2">
        {rows.map((r) => {
          const cost = UPGRADE_COST[r.key];
          const maxed = r.key !== "nitro" && (r.lvl ?? 0) >= MAX_UPGRADE;
          const poor = ui.money < cost;
          return (
            <button
              key={r.key}
              type="button"
              disabled={maxed || poor}
              onClick={() => engine?.buy(r.key)}
              className="flex w-full items-center justify-between rounded-md border border-border bg-bg px-3 py-2.5 text-left disabled:opacity-40"
            >
              <span>
                <span className="block text-sm font-medium text-fg">{r.label}</span>
                <span className="text-xs text-muted">
                  {r.blurb}
                  {r.lvl != null ? ` · ${r.lvl}/${MAX_UPGRADE}` : ` · held ${ui.nitro}`}
                </span>
              </span>
              <span className="font-mono text-xs text-muted">{maxed ? "MAX" : formatCash(cost)}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => (onClose ? onClose() : engine?.nextFromShop())}
        className="mt-5 h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-fg"
      >
        {closeLabel ?? "Next heat"}
      </button>
    </Panel>
  );
}

function GameOver({ ui, onRetry, onQuit }: { ui: UiSnap; onRetry: () => void; onQuit: () => void }) {
  return (
    <Panel>
      <p className="font-mono text-xs tracking-[0.28em] text-danger">LAST PLACE</p>
      <h2 className="font-display text-4xl font-semibold text-fg">Game over</h2>
      <p className="mt-2 text-sm text-muted">Iron Spud and the field boxed you out. Retry this heat or walk back to the title.</p>
      <p className="mt-3 font-mono text-sm text-fg">Purse {formatCash(ui.money)}</p>
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={onQuit} className="h-11 flex-1 rounded-md border border-border text-sm">
          Title
        </button>
        <button type="button" onClick={onRetry} className="h-11 flex-[2] rounded-md bg-primary text-sm font-semibold text-primary-fg">
          Retry heat
        </button>
      </div>
    </Panel>
  );
}

function Champion({ ui, onAgain }: { ui: UiSnap; onAgain: () => void }) {
  return (
    <Panel>
      <p className="font-mono text-xs tracking-[0.28em] text-muted">CHAMPIONSHIP</p>
      <h2 className="font-display text-4xl font-semibold text-fg">You took the purse</h2>
      <p className="mt-2 text-sm text-muted">Eight heats in the dirt. Iron Spud will want a rematch.</p>
      <p className="mt-4 font-mono text-lg text-fg">{formatCash(ui.money)}</p>
      <button
        type="button"
        onClick={onAgain}
        className="mt-5 h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-fg"
      >
        Title
      </button>
    </Panel>
  );
}

function TouchPad({ engine, onCam }: { engine: Engine | null; onCam: () => void }) {
  const hold = (fn: (on: boolean) => void) => ({
    onPointerDown: (ev: PointerEvent) => {
      ev.preventDefault();
      (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
      fn(true);
    },
    onPointerUp: () => fn(false),
    onPointerCancel: () => fn(false),
  });
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-between gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="pointer-events-auto flex gap-2">
        <button
          type="button"
          className="h-14 w-16 rounded-md border border-border bg-surface/80 text-sm font-medium"
          {...hold((on) => engine?.input.setTouchSteer(on ? 1 : 0))}
        >
          Left
        </button>
        <button
          type="button"
          className="h-14 w-16 rounded-md border border-border bg-surface/80 text-sm font-medium"
          {...hold((on) => engine?.input.setTouchSteer(on ? -1 : 0))}
        >
          Right
        </button>
        <button
          type="button"
          className="h-14 w-16 rounded-md border border-border bg-surface/80 text-sm font-medium"
          onClick={onCam}
        >
          Cam
        </button>
      </div>
      <div className="pointer-events-auto flex gap-2">
        <button
          type="button"
          className="h-14 w-16 rounded-md border border-border bg-surface/80 text-sm font-medium"
          {...hold((on) => engine?.input.setTouchNitro(on))}
        >
          Nitro
        </button>
        <button
          type="button"
          className="h-14 w-16 rounded-md border border-border bg-surface/80 text-sm font-medium"
          {...hold((on) => engine?.input.setTouchBrake(on))}
        >
          Brake
        </button>
        <button
          type="button"
          className="h-14 w-20 rounded-md bg-primary text-sm font-semibold text-primary-fg"
          {...hold((on) => engine?.input.setTouchGas(on))}
        >
          Gas
        </button>
      </div>
    </div>
  );
}
