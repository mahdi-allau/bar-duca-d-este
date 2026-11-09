import * as THREE from "three";
import type { CakeText } from "@/lib/cake/types";
import { rng } from "./geometry";

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Soft crumb pattern: multiplied with the sponge colour so it looks porous. */
export function crumbTexture() {
  // one tile covers 4 cm (repeat 0.25), so pores of 1-3 mm are 6-20 px wide
  const c = canvas(512, 512);
  const g = c.getContext("2d")!;
  g.fillStyle = "#f1f1f1";
  g.fillRect(0, 0, 512, 512);
  const r = rng(7);
  for (let i = 0; i < 1500; i++) {
    const x = r() * 512;
    const y = r() * 512;
    const s = 1.2 + Math.pow(r(), 2) * 9;
    g.fillStyle = `rgba(95,62,28,${0.06 + r() * 0.2})`;
    for (const ox of [-512, 0, 512]) {
      g.beginPath();
      g.ellipse(x + ox, y, s, s * (0.55 + r() * 0.5), r() * 3, 0, Math.PI * 2);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(0.25, 0.25);
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Light grey marble with thin veins. */
export function marbleTexture() {
  const c = canvas(1024, 1024);
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 1024, 1024);
  grad.addColorStop(0, "#f2eee6");
  grad.addColorStop(1, "#e4ddd0");
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 1024);
  const r = rng(11);
  for (let v = 0; v < 26; v++) {
    g.beginPath();
    let x = r() * 1024;
    let y = r() * 1024;
    g.moveTo(x, y);
    const len = 8 + Math.floor(r() * 12);
    for (let i = 0; i < len; i++) {
      x += (r() - 0.35) * 90;
      y += (r() - 0.5) * 90;
      g.lineTo(x, y);
    }
    g.strokeStyle = `rgba(${95 + r() * 40},${85 + r() * 30},${75 + r() * 30},${0.07 + r() * 0.2})`;
    g.lineWidth = 0.6 + r() * 2.6;
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Icing writing: name, age, dedication and message, laid out for the top of the cake. */
export function textTexture(text: CakeText, fontFamily: string) {
  const size = 1024;
  const c = canvas(size, size);
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, size, size);
  g.fillStyle = text.color;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.shadowColor = "rgba(255,255,255,0.35)";
  g.shadowBlur = 3;
  g.shadowOffsetY = 2;

  const lines: { t: string; size: number; weight: string }[] = [];
  if (text.message) lines.push({ t: text.message, size: 96, weight: "600" });
  if (text.name) lines.push({ t: text.name, size: 150, weight: "600" });
  if (text.age) lines.push({ t: text.age, size: 260, weight: "700" });
  if (text.dedication) lines.push({ t: text.dedication, size: 84, weight: "500" });

  const total = lines.reduce((n, l) => n + l.size * 1.1, 0);
  let y = (size - total) / 2;
  for (const l of lines) {
    let px = l.size;
    g.font = `italic ${l.weight} ${px}px ${fontFamily}`;
    // shrink to fit the width of the writing area
    while (g.measureText(l.t).width > size * 0.9 && px > 24) {
      px -= 4;
      g.font = `italic ${l.weight} ${px}px ${fontFamily}`;
    }
    y += l.size * 0.55;
    g.fillText(l.t, size / 2, y);
    y += l.size * 0.55;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Latte art for the hero cup: a heart poured in layers. */
export function latteTexture() {
  const c = canvas(512, 512);
  const g = c.getContext("2d")!;
  const base = g.createRadialGradient(256, 256, 20, 256, 256, 256);
  base.addColorStop(0, "#c99a68");
  base.addColorStop(0.75, "#a9743f");
  base.addColorStop(1, "#7d4e27");
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 512);

  const heart = (cx: number, cy: number, s: number, fill: string) => {
    g.beginPath();
    g.moveTo(cx, cy + s * 0.95);
    g.bezierCurveTo(cx - s * 1.5, cy + s * 0.1, cx - s * 1.1, cy - s * 1.1, cx, cy - s * 0.45);
    g.bezierCurveTo(cx + s * 1.1, cy - s * 1.1, cx + s * 1.5, cy + s * 0.1, cx, cy + s * 0.95);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  };
  // nested hearts: cream, coffee, cream, coffee, cream
  heart(256, 248, 150, "rgba(255,247,233,0.96)");
  heart(256, 252, 118, "#b07a45");
  heart(256, 256, 92, "rgba(255,247,233,0.96)");
  heart(256, 260, 62, "#b07a45");
  heart(256, 264, 40, "rgba(255,247,233,0.96)");
  // the pull-through line
  g.strokeStyle = "#a9743f";
  g.lineWidth = 5;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(256, 170);
  g.lineTo(256, 400);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Round, soft puff of steam / sugar. */
export function softDot() {
  const c = canvas(64, 64);
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.45)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/** Greyscale relief for frosting: soft undulations and faint spatula marks. Used as a bump map. */
export function creamBumpTexture(strength = 1) {
  const c = canvas(512, 512);
  const g = c.getContext("2d")!;
  g.fillStyle = "#808080";
  g.fillRect(0, 0, 512, 512);
  const r = rng(23);
  for (let i = 0; i < 520; i++) {
    const x = r() * 512;
    const y = r() * 512;
    const s = 10 + r() * 46;
    const light = r() > 0.5;
    const grad = g.createRadialGradient(x, y, 0, x, y, s);
    const a = (0.1 + r() * 0.16) * strength;
    grad.addColorStop(0, light ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`);
    grad.addColorStop(1, "rgba(128,128,128,0)");
    g.fillStyle = grad;
    for (const ox of [-512, 0, 512]) {
      g.beginPath();
      g.arc(x + ox, y, s, 0, Math.PI * 2);
      g.fill();
    }
  }
  // long, wide strokes: the mark of a palette knife
  g.lineCap = "round";
  for (let i = 0; i < 26; i++) {
    g.strokeStyle = r() > 0.5 ? `rgba(255,255,255,${0.05 * strength})` : `rgba(0,0,0,${0.05 * strength})`;
    g.lineWidth = 16 + r() * 30;
    const y = r() * 512;
    g.beginPath();
    g.moveTo(0, y);
    g.bezierCurveTo(170, y + (r() - 0.5) * 60, 340, y + (r() - 0.5) * 60, 512, y + (r() - 0.5) * 40);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(0.09, 0.09); // one tile covers about 11 cm
  t.anisotropy = 4;
  return t;
}

/** A strawberry skin: deep red, paler shoulders, yellow seeds each in a small pit. */
export function strawberryTexture() {
  const w = 256;
  const h = 256;
  const c = canvas(w, h);
  const g = c.getContext("2d")!;
  const base = g.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, "#8f0c1b");
  base.addColorStop(0.55, "#b1121f");
  base.addColorStop(0.85, "#c9242b");
  base.addColorStop(1, "#d9503f");
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  const r = rng(5);
  const rows = 15;
  for (let row = 0; row < rows; row++) {
    const v = (row + 0.5) / rows;
    const y = v * h;
    const count = 13;
    for (let k = 0; k < count; k++) {
      const x = ((k + (row % 2 ? 0.5 : 0)) / count) * w + (r() - 0.5) * 4;
      const yy = y + (r() - 0.5) * 3;
      g.fillStyle = "rgba(60,0,6,0.38)";
      g.beginPath();
      g.ellipse(x, yy, 4.4, 5.6, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#e6c15a";
      g.beginPath();
      g.ellipse(x, yy, 1.9, 2.8, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Relief for the strawberry: the seeds sit in little dimples. */
export function strawberryBump() {
  const w = 256;
  const h = 256;
  const c = canvas(w, h);
  const g = c.getContext("2d")!;
  g.fillStyle = "#b0b0b0";
  g.fillRect(0, 0, w, h);
  const r = rng(5);
  const rows = 15;
  for (let row = 0; row < rows; row++) {
    const y = ((row + 0.5) / rows) * h;
    for (let k = 0; k < 13; k++) {
      const x = ((k + (row % 2 ? 0.5 : 0)) / 13) * w + (r() - 0.5) * 4;
      const yy = y + (r() - 0.5) * 3;
      g.fillStyle = "#303030";
      g.beginPath();
      g.ellipse(x, yy, 4.6, 5.8, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#808080";
      g.beginPath();
      g.ellipse(x, yy, 1.9, 2.8, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}
