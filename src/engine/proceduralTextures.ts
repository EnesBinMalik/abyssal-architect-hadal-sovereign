import * as THREE from 'three';

export interface ProceduralTextureSet {
  rivetedSteelColor: THREE.CanvasTexture;
  rivetedSteelBump: THREE.CanvasTexture;
  hammeredBrassColor: THREE.CanvasTexture;
  ancientMarbleColor: THREE.CanvasTexture;
  volcanicBasaltColor: THREE.CanvasTexture;
  volcanicBasaltEmissive: THREE.CanvasTexture;
  bubbleSprite: THREE.CanvasTexture;
  sonarDialTexture: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const aniso = Math.max(1, Math.min(8, maxAnisotropy));

  // 1. Weathered Riveted Submarine Steel (Color + Bump)
  const [steelCanvas, sCtx] = makeCanvas(512, 512);
  const [steelBumpCanvas, sbCtx] = makeCanvas(512, 512);

  sCtx.fillStyle = '#25323d';
  sCtx.fillRect(0, 0, 512, 512);
  sbCtx.fillStyle = '#808080';
  sbCtx.fillRect(0, 0, 512, 512);

  // Subtle brushed metal & salt-corrosion patches
  for (let i = 0; i < 420; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 6 + Math.random() * 26;
    const isRust = Math.random() < 0.25;
    sCtx.fillStyle = isRust
      ? `rgba(116, 62, 34, ${0.06 + Math.random() * 0.14})`
      : `rgba(175, 200, 215, ${0.03 + Math.random() * 0.06})`;
    sCtx.beginPath();
    sCtx.arc(x, y, r, 0, Math.PI * 2);
    sCtx.fill();
  }

  // Welded hull plate seams
  sCtx.strokeStyle = '#111a22';
  sCtx.lineWidth = 4;
  sbCtx.strokeStyle = '#252525';
  sbCtx.lineWidth = 5;
  for (let p = 0; p <= 512; p += 128) {
    sCtx.beginPath();
    sCtx.moveTo(0, p);
    sCtx.lineTo(512, p);
    sCtx.stroke();
    sCtx.beginPath();
    sCtx.moveTo(p, 0);
    sCtx.lineTo(p, 512);
    sCtx.stroke();

    sbCtx.beginPath();
    sbCtx.moveTo(0, p);
    sbCtx.lineTo(512, p);
    sbCtx.stroke();
    sbCtx.beginPath();
    sbCtx.moveTo(p, 0);
    sbCtx.lineTo(p, 512);
    sbCtx.stroke();
  }

  // Hand-placed steel rivets along plate borders
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const bx = col * 128;
      const by = row * 128;
      for (let k = 12; k < 120; k += 18) {
        const coords = [
          [bx + k, by + 10],
          [bx + k, by + 118],
          [bx + 10, by + k],
          [bx + 118, by + k],
        ];
        for (const [rx, ry] of coords) {
          sCtx.fillStyle = '#485a68';
          sCtx.beginPath();
          sCtx.arc(rx, ry, 3.2, 0, Math.PI * 2);
          sCtx.fill();
          sCtx.fillStyle = '#18222a';
          sCtx.beginPath();
          sCtx.arc(rx + 0.8, ry + 0.8, 3.2, 0, Math.PI * 2);
          sCtx.stroke();

          sbCtx.fillStyle = '#e5e5e5';
          sbCtx.beginPath();
          sbCtx.arc(rx, ry, 3.5, 0, Math.PI * 2);
          sbCtx.fill();
        }
      }
    }
  }

  // 2. Oxidized Hammered Brass
  const [brassCanvas, bCtx] = makeCanvas(512, 512);
  bCtx.fillStyle = '#9c7338';
  bCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const rad = 4 + Math.random() * 14;
    bCtx.fillStyle =
      Math.random() < 0.28
        ? `rgba(42, 108, 92, ${0.06 + Math.random() * 0.14})` // verdigris patina
        : `rgba(225, 178, 92, ${0.05 + Math.random() * 0.12})`;
    bCtx.beginPath();
    bCtx.arc(x, y, rad, 0, Math.PI * 2);
    bCtx.fill();
  }

  // 3. Ancient Carved Marble (salt-eroded, mossy veins)
  const [marbleCanvas, mCtx] = makeCanvas(512, 512);
  mCtx.fillStyle = '#c8c4b8';
  mCtx.fillRect(0, 0, 512, 512);
  for (let v = 0; v < 28; v++) {
    mCtx.strokeStyle =
      v % 3 === 0 ? 'rgba(46, 92, 84, 0.18)' : 'rgba(90, 96, 102, 0.16)';
    mCtx.lineWidth = 1 + Math.random() * 3;
    mCtx.beginPath();
    let mx = Math.random() * 512;
    let my = 0;
    mCtx.moveTo(mx, my);
    for (let s = 0; s < 10; s++) {
      mx += (Math.random() - 0.5) * 70;
      my += 52;
      mCtx.lineTo(mx, my);
    }
    mCtx.stroke();
  }

  // 4. Volcanic Basalt & Magma Fissure Maps
  const [basaltCanvas, baCtx] = makeCanvas(512, 512);
  const [magmaCanvas, mgCtx] = makeCanvas(512, 512);
  baCtx.fillStyle = '#18181c';
  baCtx.fillRect(0, 0, 512, 512);
  mgCtx.fillStyle = '#000000';
  mgCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 360; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 4 + Math.random() * 20;
    baCtx.fillStyle = `rgba(42, 36, 38, ${0.15 + Math.random() * 0.25})`;
    baCtx.beginPath();
    baCtx.arc(x, y, r, 0, Math.PI * 2);
    baCtx.fill();
  }
  for (let f = 0; f < 16; f++) {
    let fx = Math.random() * 512;
    let fy = Math.random() * 512;
    mgCtx.strokeStyle = 'rgba(255, 95, 22, 0.85)';
    mgCtx.lineWidth = 2 + Math.random() * 3;
    mgCtx.beginPath();
    mgCtx.moveTo(fx, fy);
    for (let s = 0; s < 7; s++) {
      fx += (Math.random() - 0.5) * 90;
      fy += (Math.random() - 0.5) * 90;
      mgCtx.lineTo(fx, fy);
    }
    mgCtx.stroke();
  }

  // 5. Micro-bubble / Plankton Sprite
  const [bubCanvas, buCtx] = makeCanvas(64, 64);
  const grad = buCtx.createRadialGradient(26, 24, 3, 32, 32, 28);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.55, 'rgba(180, 235, 255, 0.45)');
  grad.addColorStop(1, 'rgba(120, 210, 255, 0)');
  buCtx.fillStyle = grad;
  buCtx.fillRect(0, 0, 64, 64);

  // 6. Diegetic CRT Phosphor Sonar Glass Texture (Cockpit Console Screen)
  const [crtCanvas, crtCtx] = makeCanvas(256, 256);
  crtCtx.fillStyle = '#031912';
  crtCtx.fillRect(0, 0, 256, 256);
  crtCtx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
  crtCtx.lineWidth = 1.5;
  for (const r of [36, 72, 108]) {
    crtCtx.beginPath();
    crtCtx.arc(128, 128, r, 0, Math.PI * 2);
    crtCtx.stroke();
  }
  crtCtx.beginPath();
  crtCtx.moveTo(128, 16);
  crtCtx.lineTo(128, 240);
  crtCtx.moveTo(16, 128);
  crtCtx.lineTo(240, 128);
  crtCtx.stroke();

  const rivetedSteelColor = finalizeTexture(steelCanvas, true, aniso, 2, 2);
  const rivetedSteelBump = finalizeTexture(steelBumpCanvas, false, aniso, 2, 2);
  const hammeredBrassColor = finalizeTexture(brassCanvas, true, aniso, 2, 2);
  const ancientMarbleColor = finalizeTexture(marbleCanvas, true, aniso, 2, 2);
  const volcanicBasaltColor = finalizeTexture(basaltCanvas, true, aniso, 3, 3);
  const volcanicBasaltEmissive = finalizeTexture(magmaCanvas, true, aniso, 3, 3);
  const bubbleSprite = finalizeTexture(bubCanvas, true, 1, 1, 1);
  const sonarDialTexture = finalizeTexture(crtCanvas, true, aniso, 1, 1);

  return {
    rivetedSteelColor,
    rivetedSteelBump,
    hammeredBrassColor,
    ancientMarbleColor,
    volcanicBasaltColor,
    volcanicBasaltEmissive,
    bubbleSprite,
    sonarDialTexture,
    dispose: () => {
      rivetedSteelColor.dispose();
      rivetedSteelBump.dispose();
      hammeredBrassColor.dispose();
      ancientMarbleColor.dispose();
      volcanicBasaltColor.dispose();
      volcanicBasaltEmissive.dispose();
      bubbleSprite.dispose();
      sonarDialTexture.dispose();
    },
  };
}
