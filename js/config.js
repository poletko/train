'use strict';
// ---------- Splošne nastavitve ----------
const W = 1280, H = 720;          // notranja ločljivost
const SEG = 3;                     // dolžina segmenta proge [m]
const PX = 9;                      // pikslov na meter v pogledu vožnje (od zgoraj)
const ZK = 0.9;                    // koliko se višina predmeta riše navzgor
const BPM = 132;                   // ritem glasbe in poskakovanja
const G_ACC = 9.81;
const START_TIME = 8 * 3600;       // 08:00:00
const FIRST_DWELL = 180;           // čas na prvi postaji [s]
const DWELL = 120;                 // čas postanka [s]

const STATIONS = [
  { name: 'Jesenice', code: 'JE', color: '#e74c3c' },
  { name: 'Bled Jezero', code: 'BJ', color: '#3498db' },
  { name: 'Bohinjska Bistrica', code: 'BB', color: '#2ecc71' },
  { name: 'Podbrdo', code: 'PO', color: '#f1c40f' },
  { name: 'Most na Soči', code: 'MS', color: '#b06ee0' },
  { name: 'Nova Gorica', code: 'NG', color: '#ff8c3a' },
];

// e1 = nadmorska višina (relativna) na koncu odseka, hump = dodaten hrib na sredini
const LEGS = [
  { len: 2800, e1: -10, hump: 18, rain: false, tunnels: [],                         seed: 11, line: 80 },
  { len: 3200, e1: -5,  hump: 24, rain: true,  tunnels: [[0.82, 0.94]],             seed: 23, line: 70 },
  { len: 3400, e1: 0,   hump: 16, rain: false, tunnels: [[0.18, 0.34], [0.56, 0.74]], seed: 37, line: 70 },
  { len: 3200, e1: -50, hump: 0,  rain: false, tunnels: [[0.14, 0.28], [0.6, 0.72]], seed: 41, line: 60 },
  { len: 2800, e1: -75, hump: 8,  rain: true,  tunnels: [],                         seed: 53, line: 80 },
];

// ---------- Lokomotiva ----------
const TRAIN = {
  locoMass: 68000,        // kg
  adhesiveMass: 56000,    // kg na pogonskih kolesih
  tenderEmpty: 18000,
  coalCap: 5000,          // kg
  waterCap: 22,           // m3
  sandCap: 400,           // kg
  F0: 130000,             // največja vlečna sila [N]
  Pmax: 750000,           // največja moč [W]
  boilerCapMJ: 40,        // energija kotla pri 16 bar
  maxP: 16,
  valveP: 15.2,           // varnostni ventil
  boilerWaterCap: 6,      // m3
  heatPerKg: 0.12,        // MJ uporabne energije na kg premoga
  evapPerMJ: 0.06,        // m3 vode na MJ porabljene pare
  shovelKg: 20,
  shovelCd: 0.35,
  injRate: 0.15,          // m3/s
  injCool: 2.5,           // MJ/m3
  brakeMu: 0.11,
  sandRate: 2,            // kg/s
};
const WAGON_TYPES = { P: { mass: 20000, name: 'potniški' }, F: { mass: 12000, name: 'tovorni' } };
const ITEM_MASS = { P: 80, F: 1800 };
const SLOTS = 6;

const BRIDGE_LIMIT = 50;           // km/h; most se podre nad BRIDGE_LIMIT + BRIDGE_BREAK
const BRIDGE_BREAK = 25;
const COAL_LOW = 700;
const KID_BONUS = 10;               // točke, če zatrobiš otrokom ob progi
const MINI_QUIZ_EVERY = [90, 140];  // s vožnje med kurjačevimi računi
const MINI_QUIZ_TIME = 45;          // s za kurjačev račun

// Vmesne igre: hlod (odsek 0), skakalnica (1), razbojnik na samorogu (2), zmaj in brizgalna (3), goreča hiša (4)
const JUMP_KMH = 55;                // najmanjša hitrost na skakalnici
const JUMP_GAP = 40;                // m, širina kanjona
const JUMP_RAMP = 30;               // m, dolžina klančine pred kanjonom
const EVENT_TIME = [45, 0, 150, 30, 60];  // s rezerve v voznem redu za vmesno igro na odseku

// Zasilne rezerve po rešenem kazenskem računu
const RESERVE = { coal: 400, water: 3, sand: 60 };

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function fmtTime(s) {
  s = Math.floor(s);
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(x).padStart(2, '0');
}
function fmtDelta(s) {
  const sign = s < 0 ? '−' : '+';
  s = Math.abs(Math.round(s));
  return sign + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
