/* eslint-env node */
/**
 * Generates the original, royalty-free sound effects used by the game.
 * Everything is synthesised from sine waves and shaped noise, so there are no
 * third-party audio assets. Run: node scripts/gen-sounds.js
 */
const fs = require('fs');
const path = require('path');

const RATE = 22050;

const writeWav = (file, samples) => {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => {
    const v = Math.max(-1, Math.min(1, s));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  });
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([header, data]));
};

let seed = 12345;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296 - 0.5;
};

const make = (seconds, fn) => {
  const n = Math.floor(seconds * RATE);
  return Array.from({ length: n }, (_, i) => fn(i / RATE, i / n));
};

const tone = (freq, t) => Math.sin(2 * Math.PI * freq * t);

const mix = (...tracks) => {
  const n = Math.max(...tracks.map(t => t.length));
  return Array.from({ length: n }, (_, i) =>
    tracks.reduce((s, t) => s + (t[i] || 0), 0),
  );
};

const delay = (track, seconds) => [
  ...new Array(Math.floor(seconds * RATE)).fill(0),
  ...track,
];

const note = (freq, len, gain = 0.4) =>
  make(len, (t, p) => {
    const env = Math.min(1, t * 200) * Math.exp(-5 * p);
    return (tone(freq, t) + 0.3 * tone(freq * 2, t)) * env * gain;
  });

const sounds = {
  // soft paper "flick"
  deal: make(0.09, (t, p) => {
    let last = 0;
    const n = rand();
    last = n - last * 0.5;
    return last * Math.exp(-7 * p) * 0.9;
  }),
  select: make(0.05, (t, p) => tone(1500, t) * Math.exp(-9 * p) * 0.35),
  place: mix(
    make(0.13, (t, p) => tone(170 - 60 * p, t) * Math.exp(-6 * p) * 0.7),
    make(0.04, (t, p) => rand() * Math.exp(-8 * p) * 0.6),
  ),
  reveal: mix(
    make(0.45, (t, p) => tone(660 + 500 * p, t) * Math.sin(Math.PI * p) * 0.25),
    make(0.45, (t, p) => tone(1320, t) * Math.sin(Math.PI * p) * 0.12),
  ),
  score: mix(note(784, 0.28), delay(note(1175, 0.4), 0.09)),
  win: mix(
    note(523, 0.3),
    delay(note(659, 0.3), 0.16),
    delay(note(784, 0.3), 0.32),
    delay(note(1047, 0.7), 0.48),
  ),
  lose: mix(
    note(392, 0.35),
    delay(note(330, 0.35), 0.22),
    delay(note(262, 0.7), 0.44),
  ),
};

const targets = [
  path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', 'raw'),
  path.join(__dirname, '..', 'assets', 'sounds'),
];
targets.forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
  Object.entries(sounds).forEach(([name, samples]) => {
    writeWav(path.join(dir, `${name}.wav`), samples);
  });
});
console.log('Generated', Object.keys(sounds).join(', '));
