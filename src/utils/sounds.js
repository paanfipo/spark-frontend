// src/utils/sounds.js
// API esperada por los juegos:
//   import { playSound, sounds } from '../../utils/sounds';

let _ctx = null;
let _masterGain = null;
let _buffers = new Map();
let _unlocked = false;

// Catálogo de sonidos usados en los juegos
export const sounds = Object.freeze({
  click: "click",
  correct: "correct",
  incorrect: "incorrect",
  gameOver: "gameOver",
  pauseIn: "pauseIn",
  pauseOut: "pauseOut",
  start: "start",
  win: "win",
});

// Mapeo clave → nombre de archivo REAL
const SOUND_FILES = Object.freeze({
  [sounds.click]: "/sounds/click.mp3",
  [sounds.correct]: "/sounds/correct.mp3",
  [sounds.incorrect]: "/sounds/incorrect.mp3",
  [sounds.gameOver]: "/sounds/game-over.mp3",
  [sounds.start]: "/sounds/game-start.mp3",
  [sounds.pauseIn]: "/sounds/pause-in.mp3",
  [sounds.pauseOut]: "/sounds/pause-out.mp3",
  [sounds.win]: "/sounds/win.mp3",
});

function _ensureAudio() {
  if (_ctx && _masterGain) return;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  _ctx = new AudioCtx();
  _masterGain = _ctx.createGain();
  _masterGain.gain.value = 1;
  _masterGain.connect(_ctx.destination);
}

async function _unlockIfNeeded() {
  if (_unlocked) return;
  _ensureAudio();
  if (!_ctx) return;

  if (_ctx.state === "suspended") {
    try { await _ctx.resume(); } catch {}
  }

  if (_ctx.state === "running") _unlocked = true;
}

async function _loadBuffer(key) {
  _ensureAudio();
  if (!_ctx) return null;

  if (_buffers.has(key)) return _buffers.get(key);

  const url = SOUND_FILES[key];
  if (!url) return null;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    const buf = await _ctx.decodeAudioData(arr);
    _buffers.set(key, buf);
    return buf;
  } catch {
    return null;
  }
}

export async function playSound(key, volume = 1) {
  try {
    await _unlockIfNeeded();
    if (!_ctx || !_masterGain) return;

    const buf = await _loadBuffer(key);
    if (!buf) return;

    const src = _ctx.createBufferSource();
    src.buffer = buf;

    const g = _ctx.createGain();
    g.gain.value = _clamp01(volume);

    src.connect(g);
    g.connect(_masterGain);

    src.start(0);
  } catch {}
}

export async function preloadSounds(keys = Object.values(sounds)) {
  try {
    await _unlockIfNeeded();
    await Promise.all(keys.map(k => _loadBuffer(k)));
  } catch {}
}

export function setMasterVolume(v) {
  _ensureAudio();
  if (!_masterGain) return;
  _masterGain.gain.value = _clamp01(v);
}

function _clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 1;
  return Math.min(1, Math.max(0, n));
}
