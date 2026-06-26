import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { MatchAnswer } from "../../types/content";
import { RichText } from "./MathBlock";

interface MatchInputProps {
  spec: MatchAnswer;
  /** Chosen option (LaTeX) per prompt, by position (null where unmatched). */
  value: (string | null)[] | undefined;
  onChange: (value: (string | null)[]) => void;
  disabled?: boolean;
  /** When true, color each prompt's chosen option by that pair's correctness. */
  reveal?: boolean;
  /** Whether the whole answer was correct (slots self-color, so unused here). */
  isCorrect?: boolean;
}

/**
 * A draggable label in the bank. `value` is the LaTeX shown to the learner; `id`
 * is a stable per-question handle so two tiles that read the same (e.g. a
 * distractor that mirrors a correct answer, or two prompts sharing an answer)
 * stay distinct for React keys, availability, and drag highlighting.
 */
interface Tile {
  id: string;
  value: string;
}

type DropTarget = { kind: "slot"; index: number } | { kind: "bank" } | null;

interface DragInfo {
  /** LaTeX of the dragged label (what lands in a slot and shows in the ghost). */
  value: string;
  /** Slot index the option is dragged from, or null when it comes from the bank. */
  from: number | null;
  /** Bank tile id when dragging from the bank, for precise dimming of duplicates. */
  tileId: string | null;
  startX: number;
  startY: number;
  pointerId: number;
  moved: boolean;
}

// A drag has to travel this far (px) before it counts as a drag rather than a
// tap, so a quick tap still places an option without spawning a drag ghost.
const MOVE_THRESHOLD = 6;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Pair each fixed left-hand prompt with one right-hand option. Works with both
 * mouse and touch via pointer events: drag an option onto a slot to place it, or
 * tap an option to drop it into the active slot (or the first empty one). Tap a
 * filled slot to clear it and re-pick. Each tile is used at most once, but tiles
 * may share the same label (duplicates are tracked by id, not value), so a
 * question can offer plausible repeated answers. On reveal, each filled slot
 * colors by its own correctness — green if that pair is right, red if wrong —
 * without exposing the correct option for the wrong ones.
 */
export function MatchInput({
  spec,
  value,
  onChange,
  disabled,
  reveal,
}: MatchInputProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragInfo | null>(null);
  // True for the instant after a real drag ends, so the click event browsers
  // fire after pointerup doesn't also trigger a tap handler.
  const justDraggedRef = useRef(false);
  const [ghost, setGhost] = useState<{ x: number; y: number; label: string } | null>(
    null,
  );
  const [hover, setHover] = useState<DropTarget>(null);
  const [active, setActive] = useState<number | null>(null);

  const picks: (string | null)[] = spec.pairs.map((_, i) => value?.[i] ?? null);

  // The widget isn't remounted between questions, so drop any stale active-slot
  // selection when the question (spec) changes.
  useEffect(() => setActive(null), [spec]);

  // Bank = a tile per correct match plus one per distractor, each with a stable
  // id, shuffled once per question. The spec reference is stable within a step,
  // so a retry keeps the layout and it only reshuffles when the step changes.
  // Ids let identical labels coexist (duplicate or shared answers).
  const tiles = useMemo<Tile[]>(
    () =>
      shuffle([
        ...spec.pairs.map((p, i) => ({ id: `m${i}`, value: p.match })),
        ...(spec.distractors ?? []).map((d, i) => ({ id: `d${i}`, value: d })),
      ]),
    [spec],
  );

  // Availability is a multiset: each placed value consumes one tile of that
  // value, so duplicates show the right remaining count rather than vanishing
  // together. Which specific id is consumed is irrelevant — same-value tiles are
  // visually identical — but the walk over the stable `tiles` order keeps it
  // deterministic across renders.
  const available: Tile[] = (() => {
    const used = new Map<string, number>();
    for (const p of picks) if (p != null) used.set(p, (used.get(p) ?? 0) + 1);
    const out: Tile[] = [];
    for (const t of tiles) {
      const remaining = used.get(t.value) ?? 0;
      if (remaining > 0) used.set(t.value, remaining - 1);
      else out.push(t);
    }
    return out;
  })();

  // Place a label into a slot. A tile dragged out of another slot vacates its
  // origin so it isn't duplicated; a tile coming from the bank (`from` null)
  // adds a fresh instance and must NOT disturb identical labels placed
  // elsewhere. Any existing occupant of `target` is bumped back to the bank.
  const placeIntoSlot = (label: string, target: number, from: number | null) => {
    const next = spec.pairs.map((_, i) => picks[i]);
    if (from !== null && from !== target) next[from] = null;
    next[target] = label;
    onChange(next);
    setActive(null);
  };

  // Return a slot's label to the bank by clearing that exact slot (by index, so
  // duplicate labels don't clear the wrong slot).
  const clearSlot = (i: number) => {
    if (i < 0 || picks[i] == null) return;
    const next = spec.pairs.map((_, k) => picks[k]);
    next[i] = null;
    onChange(next);
  };

  const onOptionTap = (label: string) => {
    if (disabled || justDraggedRef.current) return;
    const target = active ?? picks.findIndex((p) => p === null);
    if (target < 0) return;
    placeIntoSlot(label, target, null);
  };

  const onSlotTap = (i: number) => {
    if (disabled || justDraggedRef.current) return;
    if (picks[i] != null) {
      // Clear a filled slot (returning its option to the bank) and target it
      // so the next option tap refills it.
      const next = spec.pairs.map((_, k) => picks[k]);
      next[i] = null;
      onChange(next);
      setActive(i);
    } else {
      setActive((cur) => (cur === i ? null : i));
    }
  };

  const dropTargetAt = (x: number, y: number): DropTarget => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const zone = el?.closest("[data-dropzone]") as HTMLElement | null;
    if (!zone || !rootRef.current?.contains(zone)) return null;
    const v = zone.getAttribute("data-dropzone");
    if (v === "bank") return { kind: "bank" };
    if (v?.startsWith("slot-")) return { kind: "slot", index: Number(v.slice(5)) };
    return null;
  };

  // Latest move/up logic, refreshed every render so it always sees current
  // `picks`. The window listeners themselves are stable wrappers (below), so
  // they attach/detach symmetrically even if the component re-renders mid-drag.
  const moveRef = useRef<(e: globalThis.PointerEvent) => void>(() => {});
  const upRef = useRef<(e: globalThis.PointerEvent) => void>(() => {});

  moveRef.current = (e) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < MOVE_THRESHOLD)
      return;
    d.moved = true;
    setGhost({ x: e.clientX, y: e.clientY, label: d.value });
    setHover(dropTargetAt(e.clientX, e.clientY));
  };

  upRef.current = (e) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    window.removeEventListener("pointermove", onWindowMove);
    window.removeEventListener("pointerup", onWindowUp);
    window.removeEventListener("pointercancel", onWindowUp);
    dragRef.current = null;
    setGhost(null);
    setHover(null);

    // A plain press with no drag is a tap; let the button's onClick handle it
    // (covers mouse, touch, keyboard, and assistive tech uniformly).
    if (e.type === "pointercancel" || !d.moved) return;
    justDraggedRef.current = true;
    setTimeout(() => {
      justDraggedRef.current = false;
    }, 0);
    const target = dropTargetAt(e.clientX, e.clientY);
    if (target?.kind === "slot") placeIntoSlot(d.value, target.index, d.from);
    // Dropping onto the bank or outside clears the origin slot; a tile dragged
    // from the bank was never placed, so there's nothing to clear.
    else if (d.from !== null) clearSlot(d.from);
  };

  const onWindowMove = useRef((e: globalThis.PointerEvent) => moveRef.current(e)).current;
  const onWindowUp = useRef((e: globalThis.PointerEvent) => upRef.current(e)).current;

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onWindowMove);
      window.removeEventListener("pointerup", onWindowUp);
      window.removeEventListener("pointercancel", onWindowUp);
    };
  }, [onWindowMove, onWindowUp]);

  const startDrag = (
    e: ReactPointerEvent,
    label: string | null,
    from: number | null,
    tileId: string | null,
  ) => {
    if (disabled || e.button !== 0 || !label) return;
    dragRef.current = {
      value: label,
      from,
      tileId,
      startX: e.clientX,
      startY: e.clientY,
      pointerId: e.pointerId,
      moved: false,
    };
    window.addEventListener("pointermove", onWindowMove);
    window.addEventListener("pointerup", onWindowUp);
    window.addEventListener("pointercancel", onWindowUp);
  };

  // While a drag is active (ghost shown), dim the tile/slot it originated from.
  const draggingFrom = ghost ? dragRef.current?.from ?? null : null;
  const draggingTileId = ghost ? dragRef.current?.tileId ?? null : null;

  const optionBtn =
    "inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-sm transition hover:border-indigo-400 active:scale-95 disabled:cursor-default disabled:opacity-60 touch-none cursor-grab select-none";

  return (
    <div ref={rootRef} className="space-y-4 select-none">
      <div className="space-y-2">
        {spec.pairs.map((pair, i) => {
          const chosen = picks[i];
          const isActive = active === i;
          const isHover = hover?.kind === "slot" && hover.index === i;
          const pairCorrect = chosen != null && chosen === pair.match;

          let slotClasses =
            "flex min-h-[52px] flex-1 items-center justify-center rounded-xl border-2 px-3 py-2 text-base transition-colors ";
          if (reveal && chosen) {
            slotClasses += pairCorrect
              ? "border-emerald-500 bg-emerald-50 text-emerald-900"
              : "border-rose-500 bg-rose-50 text-rose-900";
          } else if (isHover) {
            slotClasses += "border-indigo-500 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-200";
          } else if (isActive) {
            slotClasses += "border-indigo-500 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-200";
          } else if (chosen) {
            slotClasses += "border-indigo-300 bg-indigo-50 text-indigo-900";
          } else {
            slotClasses += "border-dashed border-slate-300 bg-white text-slate-300";
          }
          if (chosen) slotClasses += " touch-none cursor-grab";
          if (draggingFrom === i) slotClasses += " opacity-30";

          return (
            <div key={i} className="flex items-stretch gap-2 sm:gap-3">
              <div className="flex min-h-[52px] flex-1 items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-800">
                <RichText text={pair.prompt} />
              </div>
              <span aria-hidden className="flex items-center text-xl text-slate-300">
                →
              </span>
              <button
                type="button"
                data-dropzone={`slot-${i}`}
                disabled={disabled}
                onPointerDown={(e) => startDrag(e, chosen, i, null)}
                onClick={() => onSlotTap(i)}
                aria-label={
                  chosen
                    ? `Match for ${pair.prompt} is ${chosen}. Drag it out, or activate to change it.`
                    : `Empty match for ${pair.prompt}. Drag an option here, or activate then tap an option.`
                }
                className={slotClasses}
              >
                {chosen ? <RichText text={chosen} /> : "Drag a label here"}
              </button>
            </div>
          );
        })}
      </div>

      <div
        data-dropzone="bank"
        className={`rounded-xl border-2 border-dashed p-3 transition-colors ${
          hover?.kind === "bank"
            ? "border-indigo-400 bg-indigo-50/50"
            : "border-slate-300 bg-white"
        }`}
      >
        <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
          {active != null ? "Tap an option to place it" : "Drag a label onto a match — or tap"}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {available.length === 0 ? (
            <span className="py-2 text-sm text-slate-400">
              All labels placed — drag or tap a match to change it.
            </span>
          ) : (
            available.map((tile) => (
              <button
                key={tile.id}
                type="button"
                disabled={disabled}
                aria-label={`Option ${tile.value}. Drag onto a match, or tap to place it.`}
                onPointerDown={(e) => startDrag(e, tile.value, null, tile.id)}
                onClick={() => onOptionTap(tile.value)}
                className={`${optionBtn} ${
                  draggingTileId === tile.id ? "opacity-30" : ""
                }`}
              >
                <RichText text={tile.value} />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Floating ghost that follows the pointer during a drag. */}
      {ghost && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-indigo-400 bg-white px-3 py-2 text-base text-slate-900 shadow-xl"
          style={{ left: ghost.x, top: ghost.y }}
        >
          <RichText text={ghost.label} />
        </div>
      )}
    </div>
  );
}
