// THE WORLD TODAY — Tuesday 24 November 2026.
// A newspaper front page drawn entirely in code: a pixel buffer, a small
// hand-built 5x7 bitmap font (glyphs as rows of '#' and '.'), and a
// hand-rolled PNG encoder (zlib deflate + manual PNG chunks). Node 22
// standard library only, no network, and the same bytes on every run.
import { deflateSync } from "node:zlib";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const W = 1024;
const H = 1024;

// ---- palette ------------------------------------------------------------
type RGB = [number, number, number];
const PAPER: RGB = [246, 241, 227];
const INK: RGB = [18, 18, 18];
const RED: RGB = [158, 27, 27];
const BLUE: RGB = [29, 78, 137];
const GREY: RGB = [90, 86, 76];

// ---- pixel buffer -------------------------------------------------------
const buf = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  buf[i * 3] = PAPER[0];
  buf[i * 3 + 1] = PAPER[1];
  buf[i * 3 + 2] = PAPER[2];
}

function put(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 3;
  buf[o] = c[0];
  buf[o + 1] = c[1];
  buf[o + 2] = c[2];
}

function box(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) put(i, j, c);
}

function rule(x: number, y: number, w: number, c: RGB, t = 1): void {
  box(x, y, w, t, c);
}

// ---- PNG encoder --------------------------------------------------------
const CRC_TAB = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (const byte of b) c = CRC_TAB[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePng(): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(buf.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, pngChunk("IHDR", ihdr), pngChunk("IDAT", idat), pngChunk("IEND", Buffer.alloc(0))]);
}

// Read a written PNG back and verify its signature and IHDR dimensions,
// so a truncated or corrupt write can never pass as a valid entry.
function verifyPng(path: string): void {
  const bytes = readFileSync(path);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(sig)) {
    throw new Error("entry.png does not start with the PNG signature");
  }
  const ihdrLen = bytes.readUInt32BE(8);
  const ihdrType = bytes.subarray(12, 16).toString("ascii");
  if (ihdrLen !== 13 || ihdrType !== "IHDR") {
    throw new Error("entry.png has no valid IHDR chunk");
  }
  const w = bytes.readUInt32BE(16);
  const h = bytes.readUInt32BE(20);
  if (w !== W || h !== H) {
    throw new Error(`entry.png is ${w}x${h}; expected ${W}x${H}`);
  }
}

// ---- 5x7 bitmap font ----------------------------------------------------
// One glyph is 7 rows of 5 cells; '#' is ink, '.' is blank.
const GLYPHS: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", ".#.#."],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "..##.", ".#...", "#....", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", ".##..", ".#..."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  ";": [".....", ".##..", ".##..", ".....", ".##..", ".##..", ".#..."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "..##.", "..#..", ".....", "..#.."],
  "-": [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
  "—": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  "–": [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
  "'": ["..#..", "..#..", ".#...", ".....", ".....", ".....", "....."],
  "’": ["..#..", "..#..", ".#...", ".....", ".....", ".....", "....."],
  '"': [".#.#.", ".#.#.", ".#.#.", ".....", ".....", ".....", "....."],
  "“": [".#.#.", ".#.#.", ".#.#.", ".....", ".....", ".....", "....."],
  "”": [".#.#.", ".#.#.", ".#.#.", ".....", ".....", ".....", "....."],
  "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
  ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  "%": ["##..#", "##..#", "...#.", "..#..", ".#...", "#..##", "#..##"],
  $: ["..#..", ".####", "#.#..", ".###.", "..#.#", "####.", "..#.."],
  "&": [".##..", "#..#.", "#.#..", ".#...", "#.#.#", "#..#.", ".##.#"],
  "+": [".....", "..#..", "..#..", ".###.", "..#..", "..#..", "....."],
  "=": [".....", ".....", ".###.", ".....", ".###.", ".....", "....."],
  "*": [".....", "..#..", "#.#.#", ".###.", "#.#.#", "..#..", "....."],
  "•": [".....", "..#..", ".###.", ".###.", ".###.", "..#..", "....."],
};

function glyphFor(ch: string): string[] {
  return GLYPHS[ch.toUpperCase()] ?? GLYPHS[" "]!;
}

// Draw one line of text. Returns the width in pixels.
function render(x: number, y: number, text: string, s: number, c: RGB, bold = false): number {
  let cx = x;
  for (const ch of text) {
    const g = glyphFor(ch);
    for (let r = 0; r < 7; r++) {
      const row = g[r]!;
      for (let col = 0; col < 5; col++) {
        if (row[col] === "#") {
          box(cx + col * s, y + r * s, s, s, c);
          if (bold) box(cx + col * s + 1, y + r * s, s, s, c);
        }
      }
    }
    cx += 6 * s;
  }
  return cx - x - s;
}

function widthOf(text: string, s: number): number {
  return text.length * 6 * s - s;
}

function centre(y: number, text: string, s: number, c: RGB, bold = false): void {
  render(Math.round((W - widthOf(text, s)) / 2), y, text, s, c, bold);
}

// Greedy word wrap to a maximum pixel width. Returns the lines.
function fit(text: string, s: number, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? cur + " " + w : w;
    if (widthOf(trial, s) <= maxW || !cur) cur = trial;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// Draw wrapped text; returns the y just below the last line.
function para(x: number, y: number, text: string, s: number, maxW: number, c: RGB, bold = false): number {
  const lh = 7 * s + (s >= 2 ? 3 : 2);
  for (const line of fit(text, s, maxW)) {
    render(x, y, line, s, c, bold);
    y += lh;
  }
  return y;
}

// ---- globe emblem -------------------------------------------------------
function emblem(cx: number, cy: number, r: number, c: RGB): void {
  // Circle outline, equator and meridian ellipses, plotted point by point,
  // with a tilted land band to suggest continents without drawing any map.
  for (let a = 0; a < 360; a += 1) {
    const t = (a * Math.PI) / 180;
    const ox = Math.round(cx + r * Math.cos(t));
    const oy = Math.round(cy + r * Math.sin(t));
    box(ox, oy, 2, 2, c);
    box(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * 0.34 * Math.sin(t)), 2, 2, c);
    box(Math.round(cx + r * 0.34 * Math.cos(t)), Math.round(cy + r * Math.sin(t)), 2, 2, c);
    if (a % 3 === 0) {
      const lx = Math.round(cx + (r - 8) * Math.cos(t + 0.6));
      const ly = Math.round(cy + (r - 8) * Math.sin(t + 0.6) * 0.8);
      if ((lx - cx) * (lx - cx) + (ly - cy) * (ly - cy) < (r - 6) * (r - 6)) box(lx, ly, 3, 3, c);
    }
  }
}

// ---- the day's stories --------------------------------------------------
// Every story below was reported on Tuesday 24 November 2026. Headline +
// one factual deck line each; the lead is Nvidia's founder coming back.
interface Story {
  h: string;
  d: string;
}
interface Section {
  name: string;
  stories: Story[];
}

const LEAD_KICKER = "TECH - NVIDIA'S FOUNDER RETURNS";
const LEAD_HEAD = ["HUANG IS BACK AT NVIDIA", "TRUMP PRESSED THE BOARD TO DO IT"];
const LEAD_DECK =
  "The board reinstates Jensen Huang as chief executive less than two weeks after he quit; shares jump 31% in a day and lift the S&P 500 by 4.73%.";

const COLUMNS: Section[][] = [
  [
    {
      name: "WAR IN UKRAINE",
      stories: [
        { h: "UKRAINE SINKS RUSSIAN WARSHIP OFF LIBYA", d: "Seven naval drones hit the corvette Merkury." },
        { h: "RUSSIAN STRIKE KILLS 2 IN ZAPORIZHZHIA", d: "40 wounded, four of them children, in flats." },
        { h: "GERMANY FIRST TO GET UKRAINE'S DELTA", d: "Berlin signs up for battlefield software." },
        { h: "ZELENSKY: LET UKRAINE INTO NATO", d: "President presses the alliance in Berlin." },
        { h: "RUSSIA WARNS ESTONIA OF OPEN WAR", d: "Moscow says Tallinn's actions risk war." },
      ],
    },
    {
      name: "MIDDLE EAST",
      stories: [
        { h: "THREE TANKERS HIT BY MINES IN HORMUZ", d: "Iran blames mines as the US blockade bites." },
        { h: "ISRAELI STRIKES KILL HAMAS SECURITY CHIEF", d: "Naeem Abu Nahel among seven dead in Gaza." },
        { h: "NETANYAHU URGES TRUMP: STRIKE IRAN AGAIN", d: "Israeli PM pushes Washington to hit Tehran." },
        { h: "IRAQ MOVES ON KURDISH OILFIELDS", d: "Baghdad orders the ministry to run the fields." },
        { h: "STRIKES ON YEMEN BUSES KILL ABOUT 25", d: "Buses and trucks hit in Lahj province." },
      ],
    },
  ],
  [
    {
      name: "UNITED STATES",
      stories: [
        { h: "DEMOCRATS' HOUSE WIN: LARGEST IN DECADES", d: "The party's majority is the biggest in decades." },
        { h: "TRUMP: FAST-TRACK DEATH SENTENCES", d: "Order to seek death for child killers." },
        { h: "REP. GOMEZ TO QUIT HOUSE ON DEC. 1", d: "Californian quits after ethics findings." },
        { h: "SENATE DEMOCRATS VOW NVIDIA INQUIRY", d: "Schumer warns Congress will probe Huang." },
        { h: "PENTAGON: CANADA FALLS SHORT ON DEFENCE", d: "US says Ottawa fails NATO and NORAD duties." },
      ],
    },
    {
      name: "EUROPE",
      stories: [
        { h: "EU READIES 22ND SANCTIONS PACKAGE", d: "A sports ban is among the measures." },
        { h: "SPAIN'S TOP COURT AMNESTIES PUIGDEMONT", d: "Catalan separatist leader is cleared." },
        { h: "NATO VOWS TO DEFEND SPACE", d: "Rutte warns after nuclear satellite reports." },
        { h: "SEVEN STATES WANT EU TO CURB RUSSIAN VISAS", d: "Tourist and sports travel in the firing line." },
      ],
    },
    {
      name: "JUSTICE & SOCIETY",
      stories: [
        { h: "PELICOT SUES PUBLISHER OVER NUDE PHOTOS", d: "Gisele Pelicot says a book used her photos." },
        { h: "ARMY TO BLAST 5 TONS OF EXPLOSIVES IN IOWA", d: "Unstable munitions go up on Wednesday." },
        { h: "TWO US STATES SUE SPACEX OVER GROK IMAGES", d: "Oregon and Virginia sue over AI images." },
      ],
    },
  ],
  [
    {
      name: "ASIA-PACIFIC",
      stories: [
        { h: "SEOUL PAYS $375,000 TO CATCH AI CHEATS", d: "Rewards offered to catch exam cheating by AI." },
        { h: "SOLOMONS TO END CHINA SECURITY PACT", d: "Pacific state walks away from the Beijing deal." },
        { h: "NEPAL PM IN DELHI; INDIA PLEDGES 1.4 BN", d: "Kathmandu and Delhi deepen ties on a visit." },
        { h: "HASINA PLANS RETURN TO DHAKA ON DEC. 16", d: "Ousted PM says she will come home next month." },
        { h: "INDONESIA FACTORY FIRE KILLS 26", d: "Dozens missing after a blaze in Banten." },
        { h: "UK SANCTIONS MYANMAR GENERALS", d: "London acts after a genocide ruling." },
      ],
    },
    {
      name: "MARKETS & BUSINESS",
      stories: [
        { h: "S&P 500 JUMPS 4.73% ON NVIDIA NEWS", d: "Nikkei up 3.91% as the AI rally roars back." },
        { h: "CROWDSTRIKE TO BUY ZSCALER FOR $44 BN", d: "A giant cyber deal, the year's biggest." },
        { h: "TRUMP: CHINA TO BUY 250 MORE BOEINGS", d: "President says Beijing will order 250 jets." },
      ],
    },
    {
      name: "SPORT & CULTURE",
      stories: [
        { h: "BRITAIN TO HOST 2035 WOMEN'S WORLD CUP", d: "FIFA awards the tournament to the UK." },
        { h: "BRENTFORD 4-0 EVERTON", d: "Lewis-Potter double sinks 10-man Everton." },
      ],
    },
  ],
];

const MARGIN = 28;
const COLW = 304;
const GUT = 14;
const COLX = [MARGIN, MARGIN + COLW + GUT, MARGIN + 2 * (COLW + GUT)];

function sectionHead(x: number, y: number, name: string): number {
  box(x, y, COLW, 24, INK);
  render(x + 8, y + 5, name, 2, PAPER, true);
  return y + 28;
}

function story(x: number, y: number, s: Story): number {
  // Red square bullet, then a bold headline and a plain deck line.
  box(x, y + 2, 8, 8, RED);
  let ny = para(x + 14, y, s.h, 2, COLW - 14, INK, true);
  ny = para(x + 14, ny + 1, s.d, 1, COLW - 14, GREY);
  return ny + 3;
}

// ---- compose the front page ---------------------------------------------
function compose(): void {
  // Masthead: globe, title, red date box.
  emblem(72, 58, 40, BLUE);
  render(132, 30, "THE WORLD TODAY", 7, INK, true);
  box(872, 22, 124, 78, RED);
  render(906, 30, "24", 5, PAPER, true);
  render(910, 68, "NOV 2026", 1, PAPER, true);
  rule(MARGIN, 116, W - 2 * MARGIN, INK, 3);
  centre(128, "TUESDAY, 24 NOVEMBER 2026", 2, INK, true);
  centre(150, "33 STORIES FROM EVERY REGION - ONE DAY, ONE PAGE", 1, GREY);
  rule(MARGIN, 168, W - 2 * MARGIN, INK, 1);

  // Lead story: Huang returns to Nvidia.
  let y = 182;
  render(MARGIN, y, LEAD_KICKER, 2, RED, true);
  y += 30;
  for (const line of LEAD_HEAD) {
    render(MARGIN, y, line, 4, INK, true);
    y += 34;
  }
  y = para(MARGIN, y + 2, LEAD_DECK, 2, W - 2 * MARGIN, INK);
  rule(MARGIN, y + 8, W - 2 * MARGIN, INK, 3);

  // Three columns of sections.
  const colTop = y + 14;
  let deepest = colTop;
  COLUMNS.forEach((sections, ci) => {
    let cy = colTop;
    const x = COLX[ci]!;
    for (const sec of sections) {
      cy = sectionHead(x, cy, sec.name);
      for (const st of sec.stories) cy = story(x, cy, st);
      cy += 2;
    }
    if (cy > deepest) deepest = cy;
  });

  // Footer.
  rule(MARGIN, 996, W - 2 * MARGIN, INK, 2);
  centre(1006, "THE WORLD TODAY - TUESDAY 24 NOVEMBER 2026 - EVERY STORY REPORTED TODAY", 1, GREY);
  if (deepest > 990) console.error("WARNING: columns run to y=" + deepest);
  else console.error("columns end at y=" + deepest);
}

function main(): void {
  compose();
  const out = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  mkdirSync(out, { recursive: true });
  const target = out + "/entry.png";
  writeFileSync(target, encodePng());
  verifyPng(target);
}

main();
