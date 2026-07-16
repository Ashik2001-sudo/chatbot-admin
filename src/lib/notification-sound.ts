// Pleasant two-tone chime synthesized with the Web Audio API, so no audio
// asset needs to be shipped or loaded.

let ctx: AudioContext | null = null;
let unlockAttached = false;
let lastPlayed = 0;

/**
 * Browsers refuse to start audio without a user gesture, and a context
 * created while the tab is hidden stays suspended. Create and resume the
 * context on the first click/keypress so later chimes (even from a
 * minimized window) are allowed to play.
 */
export function initNotificationSound() {
  if (unlockAttached || typeof window === "undefined") return;
  unlockAttached = true;

  const unlock = () => {
    try {
      ctx ??= new AudioContext();
      if (ctx.state === "suspended") void ctx.resume();
    } catch {
      // Web Audio unsupported; chimes just won't play.
    }
  };
  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true, passive: true });
}

function playTone(
  context: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  peak: number
) {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;

  // Soft attack and exponential release so it feels like a bell, not a beep.
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

export async function playNotificationSound() {
  // Bursts of messages shouldn't stack into a wall of dings.
  const now = Date.now();
  if (now - lastPlayed < 1500) return;
  lastPlayed = now;

  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") await ctx.resume();
    if (ctx.state !== "running") return;

    const t = ctx.currentTime;
    // E6 → G6: a light, friendly "new message" chime.
    playTone(ctx, 1318.5, t, 0.35, 0.12);
    playTone(ctx, 1568.0, t + 0.13, 0.5, 0.1);
  } catch {
    // Autoplay policy blocked it (no user gesture yet); skip silently.
  }
}
