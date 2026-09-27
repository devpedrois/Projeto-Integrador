// Vaso torneado procedural: renderiza a ceramica e deriva o desenho a grafite
// dos mesmos buffers de geometria e luz, garantindo a mesma silhueta nas duas camadas.

const LARGURA = 900;
const ALTURA = 1125;

const hash = (x: number, y: number): number => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
const sm = (t: number): number => t * t * (3 - 2 * t);
const cl = (v: number, a = 0, b = 1): number => (v < a ? a : v > b ? b : v);
const vn = (x: number, y: number): number => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  const u = sm(xf);
  const v = sm(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x: number, y: number, oitavas: number): number => {
  let s = 0;
  let a = 0.5;
  let f = 1;
  let n = 0;
  for (let i = 0; i < oitavas; i++) {
    s += a * vn(x * f + i * 17.3, y * f + i * 9.1);
    n += a;
    a *= 0.5;
    f *= 2.03;
  }
  return s / n;
};
const suavizar = (arr: Float32Array, raio: number): Float32Array => {
  const saida = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    let s = 0;
    let n = 0;
    for (let j = -raio; j <= raio; j++) {
      const q = i + j;
      if (q >= 0 && q < arr.length) {
        s += arr[q]!;
        n++;
      }
    }
    saida[i] = s / n;
  }
  return saida;
};

export function renderizarVaso(canvasReal: HTMLCanvasElement, canvasDesenho: HTMLCanvasElement): boolean {
  const W = LARGURA;
  const H = ALTURA;
  canvasReal.width = canvasDesenho.width = W;
  canvasReal.height = canvasDesenho.height = H;
  const ctxReal = canvasReal.getContext("2d");
  const ctxDesenho = canvasDesenho.getContext("2d");
  if (!ctxReal || !ctxDesenho) return false;

  const cx = W / 2;
  const yB = 948;
  const Hv = 740;
  const k = 0.15;
  const Rmax = 282;
  const P = [[0, 0.4], [0.03, 0.43], [0.12, 0.62], [0.3, 0.93], [0.42, 1], [0.55, 0.94], [0.7, 0.66], [0.8, 0.45], [0.88, 0.365], [0.95, 0.385], [1, 0.43]];
  const R = new Float32Array(Hv + 1);
  const C = new Float32Array(Hv + 1);
  const dR = new Float32Array(Hv + 1);
  for (let h = 0; h <= Hv; h++) {
    const t = h / Hv;
    let i = 0;
    while (i < P.length - 2 && t > P[i + 1]![0]!) i++;
    const p0 = P[Math.max(0, i - 1)]![1]!;
    const p1 = P[i]![1]!;
    const p2 = P[i + 1]![1]!;
    const p3 = P[Math.min(P.length - 1, i + 2)]![1]!;
    const s = (t - P[i]![0]!) / (P[i + 1]![0]! - P[i]![0]!);
    const r = 0.5 * (2 * p1 + (-p0 + p2) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s * s + (-p0 + 3 * p1 - 3 * p2 + p3) * s * s * s);
    R[h] = r * Rmax * (1 + 0.016 * (vn(h * 0.012, 3.3) - 0.5));
    C[h] = 5 * Math.sin(h * 0.006 + 0.8) + 4 * (vn(h * 0.01, 7) - 0.5);
  }
  const Rs = suavizar(suavizar(R, 10), 10);
  for (let h = 0; h <= Hv; h++) {
    if (h > Hv - 14) Rs[h] = Rs[h]! + 5 * Math.sin(((h - (Hv - 14)) / 14) * Math.PI);
    if (h < 10) Rs[h] = Rs[h]! - 7 * Math.pow(1 - h / 10, 2);
  }
  for (let h = 0; h <= Hv; h++) dR[h] = (Rs[Math.min(Hv, h + 1)]! - Rs[Math.max(0, h - 1)]!) / 2;

  const N = W * H;
  const ID = new Uint8Array(N);
  const S = new Float32Array(N);
  const HH = new Float32Array(N);
  const UU = new Float32Array(N);
  const SH = new Float32Array(N);
  const real = new Uint8ClampedArray(N * 4);

  let Lx = -0.62;
  let Ly = 0.52;
  let Lz = 0.58;
  {
    const l = Math.hypot(Lx, Ly, Lz);
    Lx /= l;
    Ly /= l;
    Lz /= l;
  }
  let Hx = Lx;
  let Hy = Ly;
  let Hz = Lz + 1;
  {
    const l = Math.hypot(Hx, Hy, Hz);
    Hx /= l;
    Hy /= l;
    Hz /= l;
  }
  const se = k;
  const ce = Math.sqrt(1 - k * k);
  const Rl = Rs[Hv]!;
  const cxl = cx + C[Hv]!;
  const yc = yB - Hv;
  const Ri = Rl - 11;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let h = yB - y;
      let u = 0;
      let cth = 0;
      let Rh = 0;
      let hc = 0;
      let ok = false;
      for (let it = 0; it < 4; it++) {
        hc = Math.round(cl(h, 0, Hv));
        Rh = Rs[hc]!;
        u = (x - cx - C[hc]!) / Rh;
        if (Math.abs(u) >= 1) {
          cth = 0;
          ok = false;
          h = yB - y;
          break;
        }
        cth = Math.sqrt(1 - u * u);
        h = yB - y + k * Rh * cth;
        ok = true;
      }
      if (ok) {
        hc = Math.round(cl(h, 0, Hv));
        u = (x - cx - C[hc]!) / Rs[hc]!;
        ok = h >= 0 && h <= Hv && Math.abs(u) < 1;
        if (ok) cth = Math.sqrt(1 - u * u);
      }
      let r = 0;
      let g = 0;
      let b = 0;
      let shade = 0;
      let id = 0;
      const grain = (hash(x, y) - 0.5) * 7;

      if (ok) {
        id = 1;
        let nx = u;
        let ny = -dR[hc]!;
        let nz = cth;
        const ringPhase = h * 0.62 + 2.4 * vn(h * 0.02, (u + 1) * 1.6);
        const ampR = 0.04 + 0.08 * vn(h * 0.011, 5.5);
        ny += ampR * Math.sin(ringPhase);
        nx += 0.07 * (vn(u * 3 + 2, h * 0.012) - 0.5);
        ny += 0.06 * (vn(u * 3 + 9, h * 0.012 + 4) - 0.5);
        const nl = Math.hypot(nx, ny, nz);
        nx /= nl;
        ny /= nl;
        nz /= nl;
        const vy = ny * ce - nz * se;
        const vz = nz * ce + ny * se;
        const vx = nx;
        const dl = vx * Lx + vy * Ly + vz * Lz;
        const d = Math.max(0, (dl + 0.12) / 1.12);
        const f = Math.max(0, vx * 0.7 + vy * 0.1 + vz * 0.7) * 0.22;
        const bo = Math.max(0, -vy) * 0.2 + 0.06;
        const ao = (0.55 + 0.45 * sm(Math.min(1, h / 70))) * (0.86 + 0.14 * cth);
        shade = (0.17 + 0.92 * d + f + bo) * ao;
        const sp = Math.pow(Math.max(0, vx * Hx + vy * Hy + vz * Hz), 14) * 0.07;
        let af = (0.86 + 0.26 * fbm(x * 0.006, y * 0.006, 3)) * (1 - 0.045 * Math.sin(ringPhase));
        const pn = vn(x * 0.45, y * 0.45);
        if (pn > 0.8) af *= 1 - (pn - 0.8) * 2.2;
        if (hash(x >> 1, y >> 1) > 0.9965) af *= 0.58;
        r = 170 * af * shade + sp * 255;
        g = 88 * af * shade * (0.98 + 0.05 * vn(x * 0.01, y * 0.01)) + sp * 225;
        b = 54 * af * shade + sp * 200;
        HH[i] = h;
        UU[i] = u;
      } else if (h > Hv) {
        const ex = (x - cxl) / Rl;
        const ey = (y - yc) / (k * Rl);
        if (ex * ex + ey * ey < 1) {
          const exi = (x - cxl) / Ri;
          const eyi = (y - yc) / (k * Ri);
          if (exi * exi + eyi * eyi < 1) {
            id = 3;
            const half = k * Ri * Math.sqrt(Math.max(0, 1 - exi * exi));
            const depth = cl((y - (yc - half)) / Math.max(1, 2 * half));
            shade = (0.12 + 0.42 * sm(cl((exi + 0.2) / 1.1)) * (1 - depth * 0.85)) * (0.9 + 0.2 * vn(x * 0.03, y * 0.06));
            const af = 0.9 + 0.2 * fbm(x * 0.01, y * 0.01, 2);
            r = 150 * af * shade;
            g = 74 * af * shade;
            b = 46 * af * shade;
          } else {
            id = 2;
            const dl = Ly * ce + Lz * se + 0.1 * (vn(x * 0.05, y * 0.2) - 0.5);
            shade = 0.25 + 0.85 * Math.max(0, dl);
            const af = 0.95 + 0.12 * fbm(x * 0.02, y * 0.02, 2);
            r = 176 * af * shade;
            g = 94 * af * shade;
            b = 60 * af * shade;
          }
        }
      }
      if (id === 0) {
        const light = (1.035 - 0.085 * (x / W)) * (0.975 + 0.04 * sm(cl(1 - Math.abs(y / H - 0.42) * 1.6)));
        const sx = (x - (cx + 0.55 * Rmax)) / (1.2 * Rmax);
        const sy = (y - (yB - 4)) / (0.2 * Rmax);
        const cast = Math.exp(-(sx * sx + sy * sy) * 2.2) * 0.26 * sm(cl((y - (yB - 70)) / 70));
        const qx = (x - cx) / (0.52 * Rmax);
        const qy = (y - (yB + 3)) / (0.05 * Rmax);
        const contact = Math.exp(-(qx * qx + qy * qy) * 2.6) * 0.42;
        const s = cast + contact;
        SH[i] = s;
        const f = light * (1 - s);
        r = 236 * f;
        g = 229 * f;
        b = 218 * f;
      }
      ID[i] = id;
      S[i] = shade;
      const j = i * 4;
      real[j] = r + grain;
      real[j + 1] = g + grain;
      real[j + 2] = b + grain;
      real[j + 3] = 255;
    }
  }
  ctxReal.putImageData(new ImageData(real, W, H), 0, 0);

  const desenho = new Uint8ClampedArray(N * 4);
  let hMax = 0;
  {
    let m = 0;
    for (let h = 0; h <= Hv; h++) {
      if (Rs[h]! > m) {
        m = Rs[h]!;
        hMax = h;
      }
    }
  }
  let hNeck = 0;
  {
    let m = 1e9;
    for (let h = Math.round(Hv * 0.7); h <= Hv - 20; h++) {
      if (Rs[h]! < m) {
        m = Rs[h]!;
        hNeck = h;
      }
    }
  }
  const guias = (
    [
      [0, Rs[0]!],
      [hMax, Rs[hMax]!],
      [hNeck, Rs[hNeck]!],
    ] as const
  ).map(([h, r]) => [cx + C[h]!, yB - h, r] as const);
  const cls = (v: number): number => (v === 0 ? 0 : v === 3 ? 2 : 1);
  const lineA = (d: number, w: number): number => cl(w - d + 0.6);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const id = ID[i]!;
      const pnoise = fbm(x * 0.08, y * 0.08, 2) * 0.5 + vn(x * 0.6, y * 0.03) * 0.25 + hash(x + 7, y + 3) * 0.25;
      const pf = 0.972 + 0.034 * pnoise;
      const tooth = 0.68 + 0.45 * vn(x * 0.9, y * 0.9);
      let keep = 1;
      const add = (a: number): void => {
        keep *= 1 - cl(a);
      };

      if (id !== 0) {
        let tone = Math.pow(cl(1 - S[i]! / 0.95), 1.2);
        if (id === 2) tone *= 0.35;
        add(tone * 0.16);
        if (id === 1) {
          const q = HH[i]! / 7.5;
          const li = Math.floor(q + 0.5);
          const d = Math.abs(q - li) * 7.5;
          const gp = sm(cl((vn(UU[i]! * 6 + li * 2.1, li * 0.7) - 0.18) / 0.16));
          add(lineA(d, 0.2 + 1.5 * tone) * (0.14 + 0.55 * tone) * gp * sm(cl(tone / 0.14)));
        }
        if (tone > 0.4) {
          const s1 = (x * 0.6 - y * 0.8) / 5.5;
          const d1 = Math.abs(s1 - Math.round(s1)) * 5.5;
          add(lineA(d1, (tone - 0.4) * 2.4) * 0.45 * sm(cl((vn(x * 0.02, y * 0.05) - 0.1) / 0.2)));
        }
        if (tone > 0.64) {
          const s2 = (x * 0.8 + y * 0.6) / 5;
          const d2 = Math.abs(s2 - Math.round(s2)) * 5;
          add(lineA(d2, (tone - 0.64) * 2.6) * 0.42);
        }
      } else if (SH[i]! > 0.02) {
        const tone = cl(SH[i]! * 2.1);
        const s = (x * 0.12 + y) / 5;
        const d = Math.abs(s - Math.round(s)) * 5;
        add(lineA(d, tone * 1.3) * (0.18 + 0.4 * tone) * sm(cl((vn(x * 0.03, y * 0.2) - 0.15) / 0.2)));
        add(tone * 0.08);
      }

      const c0 = cls(id);
      let e = 0;
      for (let o = 1; o <= 2 && e < 1; o++) {
        const w = o === 1 ? 1 : 0.5;
        const vizinhos = [
          x + o < W ? ID[i + o]! : 0,
          x - o >= 0 ? ID[i - o]! : 0,
          y + o < H ? ID[i + o * W]! : 0,
          y - o >= 0 ? ID[i - o * W]! : 0,
        ];
        for (const v of vizinhos) {
          const c = cls(v);
          if (c !== c0 || (v !== id && (v === 2 || id === 2))) e = Math.max(e, (c === 0 || c0 === 0 ? 1 : 0.7) * w);
        }
      }
      if (e) add(e * (0.55 + 0.4 * vn(x * 0.015, y * 0.015)));

      if (Math.abs(x - cx) < 0.7 && y > yc - 80 && y < yB + 70) add(0.14 * (vn(y * 0.05, 1) > 0.3 ? 1 : 0));
      for (const [gx, gy, gr] of guias) {
        const dx = x - gx;
        const dy = y - gy;
        const a = gr;
        const b2 = k * gr;
        const f = (dx * dx) / (a * a) + (dy * dy) / (b2 * b2) - 1;
        const gm = 2 * Math.hypot(dx / (a * a), dy / (b2 * b2)) || 1;
        const d = Math.abs(f) / gm;
        if (d < 1.6) add(lineA(d, 0.35) * (id === 0 ? 0.16 : 0.1));
      }
      if (Math.abs(y - (yB + 6 + 3 * Math.sin(x * 0.01))) < 0.8 && x > cx - 1.55 * Rmax && x < cx + 1.9 * Rmax) {
        add(0.2 * (vn(x * 0.04, 2) > 0.25 ? 1 : 0));
      }

      const a = Math.min(0.9, (1 - keep) * tooth);
      const j = i * 4;
      desenho[j] = 247 * pf * (1 - a) + 52 * a;
      desenho[j + 1] = 243 * pf * (1 - a) + 49 * a;
      desenho[j + 2] = 235 * pf * (1 - a) + 48 * a;
      desenho[j + 3] = 255;
    }
  }
  ctxDesenho.putImageData(new ImageData(desenho, W, H), 0, 0);
  return true;
}
