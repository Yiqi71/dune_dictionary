import { Noise } from "https://cdn.skypack.dev/noisejs@2.1.0";

const canvas = document.getElementById("sand-layer");
const ctx = canvas.getContext("2d");

let width, height, imageData, pixels;
let t = 0;

// ===== 可调参数 =====
const MODE = "grayscale"; // "binary" 或 "grayscale"
const CONTRAST = 1.7;     // 对比度
const SPEED = 0.01;       // 变化速度
const SCALE = 0.003;      // 颗粒大小
// ====================

// 固定随机数种子
const randVals = [];
const noise = new Noise(Math.random());

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  imageData = ctx.createImageData(width, height);
  pixels = imageData.data;

  randVals.length = width * height;
  for (let i = 0; i < randVals.length; i++) {
    randVals[i] = Math.random();
  }
}

function draw() {
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const idx = (x + y * width) * 4;

      // 原始噪声
      let n = noise.perlin3(x * SCALE, y * SCALE, t);

      // 映射到 [0,1]
      let nc = (n + 1) / 2;
      nc = (nc - 0.5) * CONTRAST + 0.5;
      nc = Math.min(Math.max(nc, 0), 1);

      // 固定随机颗粒
      const r = randVals[x + y * width];
      let col;

      if (MODE === "binary") {
        col = r < nc ? 255 : 0;
      } else if (MODE === "grayscale") {
        col = r < nc ? 0 : 255;
      }

      pixels[idx] = col;
      pixels[idx + 1] = col;
      pixels[idx + 2] = col;
      pixels[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  t += SPEED;

  requestAnimationFrame(draw);
}

window.addEventListener("resize", resize);
resize();
draw();
