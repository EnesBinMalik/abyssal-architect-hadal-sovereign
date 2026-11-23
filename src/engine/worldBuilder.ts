import * as THREE from 'three';
import { ABYSS_LAYERS, DepthLayerId } from '../types/abyss';
import { ProceduralTextureSet } from './proceduralTextures';

export interface HostileAutomaton {
  id: string;
  mesh: THREE.Group;
  layerId: DepthLayerId;
  hp: number;
  maxHp: number;
  alive: boolean;
  homePos: THREE.Vector3;
  phase: number;
  armorStripped: boolean;
  rotor: THREE.Mesh;
}

export interface HydrothermalVent {
  id: string;
  position: THREE.Vector3;
  layerId: DepthLayerId;
  plumeMesh: THREE.Mesh;
  eruptingPhase: number;
}

export interface AnchorPoint {
  id: string;
  position: THREE.Vector3;
  layerId: DepthLayerId;
  mesh: THREE.Mesh;
  label: string;
}

export interface MonolithNode {
  id: string;
  layerId: DepthLayerId;
  position: THREE.Vector3;
  mesh: THREE.Group;
  coreMat: THREE.MeshStandardMaterial;
  activated: boolean;
}

export interface JellyfishActor {
  group: THREE.Group;
  baseY: number;
  phase: number;
  tentacles: THREE.Mesh[];
}

export interface KrakenBoss {
  root: THREE.Group;
  mantle: THREE.Group;
  tentacles: THREE.Group[];
  eyeMat: THREE.MeshStandardMaterial;
  hp: number;
  maxHp: number;
  defeated: boolean;
  hitFlash: number;
}

export interface AbyssalWorldData {
  root: THREE.Group;
  causticUniforms: { uTime: { value: number } };
  automatons: HostileAutomaton[];
  vents: HydrothermalVent[];
  anchors: AnchorPoint[];
  monoliths: MonolithNode[];
  jellyfish: JellyfishActor[];
  turbines: THREE.Group[];
  kraken: KrakenBoss;
  interactiveWorldMeshes: THREE.Object3D[];
}

function buildClockworkAutomaton(
  textures: ProceduralTextureSet,
  id: string,
  layerId: DepthLayerId,
  pos: THREE.Vector3
): HostileAutomaton {
  const g = new THREE.Group();
  g.position.copy(pos);

  const brass = new THREE.MeshStandardMaterial({
    map: textures.hammeredBrassColor,
    color: 0xc28538,
    metalness: 0.88,
    roughness: 0.28,
  });
  const iron = new THREE.MeshStandardMaterial({
    map: textures.rivetedSteelColor,
    color: 0x2a3138,
    metalness: 0.78,
    roughness: 0.56,
  });
  const eyeGlow = new THREE.MeshStandardMaterial({
    color: 0xff5a1f,
    emissive: 0xff4500,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });

  // Core pressure sphere
  const core = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15, 1), iron);
  core.userData = { targetKind: 'hostile', targetId: id, interactLabel: 'Derinlik Otomatı (Mızrak / Zıpkın)' };
  g.add(core);

  // Brass girdle & rivets
  const girdle = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.14, 10, 22), brass);
  girdle.rotation.x = Math.PI / 2;
  g.add(girdle);

  // Optical cyclops lens
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.35, 14), eyeGlow);
  lens.rotation.x = Math.PI / 2;
  lens.position.z = -1.08;
  g.add(lens);

  // Articulated pincer arms
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 1.5), brass);
    arm.position.set(s * 1.15, -0.25, -0.55);
    arm.rotation.y = s * 0.25;
    g.add(arm);
  }

  // Dorsal turbine rotor
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.12, 0.26), brass);
  rotor.position.y = 1.32;
  g.add(rotor);

  return {
    id,
    mesh: g,
    layerId,
    hp: 100,
    maxHp: 100,
    alive: true,
    homePos: pos.clone(),
    phase: Math.random() * Math.PI * 2,
    armorStripped: false,
    rotor,
  };
}

function buildMonolith(
  textures: ProceduralTextureSet,
  id: string,
  layerId: DepthLayerId,
  pos: THREE.Vector3,
  accentHex: number
): MonolithNode {
  const g = new THREE.Group();
  g.position.copy(pos);

  const stoneMat = new THREE.MeshStandardMaterial({
    map: textures.ancientMarbleColor,
    color: 0x3b444b,
    roughness: 0.72,
    metalness: 0.2,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    map: textures.hammeredBrassColor,
    metalness: 0.9,
    roughness: 0.24,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 0.9,
    roughness: 0.25,
    metalness: 0.3,
  });

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.2, 1.2, 8), stoneMat);
  plinth.position.y = 0.6;
  g.add(plinth);

  const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.35, 7.2, 6), stoneMat);
  obelisk.position.y = 4.5;
  obelisk.userData = { targetKind: 'monolith', targetId: id, interactLabel: 'Antik Veri-Enerji Anıtı (Etkinleştir)' };
  g.add(obelisk);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.13, 10, 28), brassMat);
  ring.position.y = 6.4;
  ring.rotation.x = Math.PI / 5;
  g.add(ring);

  const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.95, 1), coreMat);
  orb.position.y = 8.9;
  orb.userData = { targetKind: 'monolith', targetId: id, interactLabel: 'Antik Veri-Enerji Anıtı (Etkinleştir)' };
  g.add(orb);

  return {
    id,
    layerId,
    position: pos.clone(),
    mesh: g,
    coreMat,
    activated: false,
  };
}

export function buildAbyssalWorld(textures: ProceduralTextureSet): AbyssalWorldData {
  const root = new THREE.Group();
  const causticUniforms = { uTime: { value: 0 } };
  const automatons: HostileAutomaton[] = [];
  const vents: HydrothermalVent[] = [];
  const anchors: AnchorPoint[] = [];
  const monoliths: MonolithNode[] = [];
  const jellyfish: JellyfishActor[] = [];
  const turbines: THREE.Group[] = [];
  const interactiveWorldMeshes: THREE.Object3D[] = [];

  const brassMat = new THREE.MeshStandardMaterial({
    map: textures.hammeredBrassColor,
    metalness: 0.9,
    roughness: 0.26,
  });
  const rustedSteelMat = new THREE.MeshStandardMaterial({
    map: textures.rivetedSteelColor,
    bumpMap: textures.rivetedSteelBump,
    bumpScale: 0.05,
    color: 0x5c463c,
    metalness: 0.68,
    roughness: 0.68,
  });

  // Helper to create natural canyon-ring seabed for each layer
  const buildSeabed = (
    yBase: number,
    mat: THREE.Material,
    craterDepth: number,
    ridgeHeight: number
  ) => {
    const geo = new THREE.PlaneGeometry(240, 240, 56, 56);
    geo.rotateX(-Math.PI / 2);
    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const dist = Math.hypot(x, z);
      const wave =
        Math.sin(x * 0.06) * Math.cos(z * 0.06) * 2.2 +
        Math.sin(x * 0.14 + z * 0.11) * 0.95;
      // Outer natural volcanic rim walls (never flat box walls!)
      const rim = Math.max(0, (dist - 55) * 0.38) * ridgeHeight;
      const bowl = Math.max(0, 1 - dist / 45) * -craterDepth;
      posAttr.setY(i, wave + rim + bowl);
    }
    geo.computeVertexNormals();
    const floor = new THREE.Mesh(geo, mat);
    floor.position.y = yBase - 14;
    floor.receiveShadow = true;
    root.add(floor);
  };

  // ============================================================================
  // KATMAN 1 (200m): BATIK MERMER TAPINAKLAR VE MERCAN ORMANI (THE SUNLIT RUINS)
  // ============================================================================
  {
    const y0 = ABYSS_LAYERS[0].yCenter;
    const marbleCausticMat = new THREE.MeshStandardMaterial({
      map: textures.ancientMarbleColor,
      color: 0xb7cfc9,
      roughness: 0.62,
      metalness: 0.1,
    });
    // Animated sunlight caustics injected via onBeforeCompile
    marbleCausticMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = causticUniforms.uTime;
      shader.vertexShader =
        'varying vec3 vWorldPosCaustic;\n' +
        shader.vertexShader.replace(
          '#include <worldpos_vertex>',
          '#include <worldpos_vertex>\nvWorldPosCaustic = (modelMatrix * vec4(transformed, 1.0)).xyz;'
        );
      shader.fragmentShader =
        'uniform float uTime;\nvarying vec3 vWorldPosCaustic;\n' +
        shader.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          `
          #include <emissivemap_fragment>
          float c1 = sin(vWorldPosCaustic.x * 0.24 + uTime * 1.4) * cos(vWorldPosCaustic.z * 0.24 - uTime * 1.1);
          float c2 = sin((vWorldPosCaustic.x + vWorldPosCaustic.z) * 0.35 - uTime * 1.8);
          float caustic = pow(max(0.0, (c1 + c2) * 0.5 + 0.35), 4.0) * 0.42;
          totalEmissiveRadiance += vec3(0.18, 0.78, 0.92) * caustic;
          `
        );
    };

    buildSeabed(y0, marbleCausticMat, 2.0, 0.75);

    // Sunken Doric Marble Temple Colonnade
    const templeGroup = new THREE.Group();
    templeGroup.position.set(0, y0 - 14, -22);
    const dais = new THREE.Mesh(new THREE.BoxGeometry(24, 1.6, 20), marbleCausticMat);
    dais.position.y = 0.8;
    templeGroup.add(dais);

    const colGeo = new THREE.CylinderGeometry(0.72, 0.88, 11.5, 14);
    for (let cx = -9; cx <= 9; cx += 4.5) {
      for (const cz of [-7, 7]) {
        const broken = Math.abs(cx) < 3 && cz > 0;
        const col = new THREE.Mesh(colGeo, marbleCausticMat);
        col.position.set(cx, broken ? 4.1 : 7.1, cz);
        if (broken) col.rotation.z = 0.24;
        col.castShadow = true;
        templeGroup.add(col);
      }
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(21, 1.5, 3.2), marbleCausticMat);
    lintel.position.set(0, 13.4, -7);
    templeGroup.add(lintel);
    root.add(templeGroup);

    // Instanced Reef Coral Clusters (varied scale + color tint)
    const coralGeo = new THREE.ConeGeometry(0.75, 2.6, 7);
    const coralMat = new THREE.MeshStandardMaterial({ roughness: 0.72, metalness: 0.05 });
    const coralCount = 90;
    const coralInst = new THREE.InstancedMesh(coralGeo, coralMat, coralCount);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const palette = [0xf43f5e, 0xfb923c, 0x2dd4bf, 0xa78bfa, 0xfacc15];
    for (let i = 0; i < coralCount; i++) {
      const ang = (i / coralCount) * Math.PI * 2 + Math.random() * 0.4;
      const rad = 14 + Math.random() * 44;
      dummy.position.set(Math.cos(ang) * rad, y0 - 12.6, Math.sin(ang) * rad - 8);
      dummy.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * Math.PI, (Math.random() - 0.5) * 0.4);
      const sc = 0.7 + Math.random() * 1.45;
      dummy.scale.set(sc, sc * (0.9 + Math.random() * 0.8), sc);
      dummy.updateMatrix();
      coralInst.setMatrixAt(i, dummy.matrix);
      color.setHex(palette[i % palette.length]);
      coralInst.setColorAt(i, color);
    }
    coralInst.computeBoundingSphere();
    root.add(coralInst);

    // Monolith 1 + Grapple Anchor
    const mono0 = buildMonolith(textures, 'mono-0', 0, new THREE.Vector3(0, y0 - 12.5, -22), 0x38bdf8);
    monoliths.push(mono0);
    root.add(mono0.mesh);
    interactiveWorldMeshes.push(mono0.mesh);

    const archRing = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.16, 10, 20), brassMat);
    archRing.position.set(-16, y0 - 2, -16);
    archRing.userData = { targetKind: 'anchor', targetId: 'anc-0', interactLabel: 'Mermer Kemer Halat Halkası' };
    root.add(archRing);
    anchors.push({ id: 'anc-0', position: archRing.position.clone(), layerId: 0, mesh: archRing, label: 'Mermer Kemer' });
    interactiveWorldMeshes.push(archRing);
  }

  // ============================================================================
  // KATMAN 2 (1.500m): ALACAKARANLIK BATIK TERSANESİ (THE TWILIGHT GRAVEYARD)
  // ============================================================================
  {
    const y1 = ABYSS_LAYERS[1].yCenter;
    const mudMat = new THREE.MeshStandardMaterial({
      color: 0x16222c,
      roughness: 0.9,
      metalness: 0.08,
    });
    buildSeabed(y1, mudMat, 2.5, 0.95);

    // Sunken Warship Hulls tilted on seabed
    for (const [wx, wz, rotY, tilt] of [
      [-18, -24, 0.6, 0.28],
      [22, -18, -0.8, -0.22],
    ] as const) {
      const ship = new THREE.Group();
      ship.position.set(wx, y1 - 8.5, wz);
      ship.rotation.set(0.12, rotY, tilt);

      const hull = new THREE.Mesh(new THREE.BoxGeometry(8, 6.5, 28), rustedSteelMat);
      ship.add(hull);
      const bow = new THREE.Mesh(new THREE.ConeGeometry(4.6, 9, 4), rustedSteelMat);
      bow.rotation.x = -Math.PI / 2;
      bow.rotation.y = Math.PI / 4;
      bow.position.z = -18.2;
      ship.add(bow);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 14, 10), rustedSteelMat);
      mast.position.set(0, 8.5, -2);
      ship.add(mast);

      // Grapple Anchor on Mast
      const anc = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.16, 10, 18), brassMat);
      anc.position.set(0, 13.5, -2);
      anc.userData = { targetKind: 'anchor', targetId: `anc-1-${wx}`, interactLabel: 'Batık Direk Çapa Halkası' };
      ship.add(anc);
      const worldAncPos = new THREE.Vector3(0, 13.5, -2).applyEuler(ship.rotation).add(ship.position);
      anchors.push({ id: `anc-1-${wx}`, position: worldAncPos, layerId: 1, mesh: anc, label: 'Batık Direk' });
      interactiveWorldMeshes.push(anc);

      root.add(ship);
    }

    // 2 Patrolling Clockwork Depth Automatons
    const auto1 = buildClockworkAutomaton(textures, 'auto-1a', 1, new THREE.Vector3(-8, y1 - 2, -14));
    const auto2 = buildClockworkAutomaton(textures, 'auto-1b', 1, new THREE.Vector3(12, y1 - 4, -22));
    automatons.push(auto1, auto2);
    root.add(auto1.mesh, auto2.mesh);
    interactiveWorldMeshes.push(auto1.mesh, auto2.mesh);

    const mono1 = buildMonolith(textures, 'mono-1', 1, new THREE.Vector3(2, y1 - 13, -34), 0xf59e0b);
    monoliths.push(mono1);
    root.add(mono1.mesh);
    interactiveWorldMeshes.push(mono1.mesh);
  }

  // ============================================================================
  // KATMAN 3 (4.000m): BİYOLUMİNESANS KRİSTAL MAĞARALARI (THE LUMINOUS ABYSS)
  // ============================================================================
  {
    const y2 = ABYSS_LAYERS[2].yCenter;
    const crystalFloorMat = new THREE.MeshStandardMaterial({
      color: 0x0b1a2d,
      roughness: 0.72,
      metalness: 0.25,
    });
    buildSeabed(y2, crystalFloorMat, 3.0, 1.15);

    // Instanced Glowing Quartz Crystal Spires
    const crystalGeo = new THREE.OctahedronGeometry(1.1, 0);
    crystalGeo.scale(0.65, 3.8, 0.65);
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x38f2ff,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.85,
      roughness: 0.14,
      metalness: 0.15,
      clearcoat: 1.0,
    });
    const crystalCount = 64;
    const crystalInst = new THREE.InstancedMesh(crystalGeo, crystalMat, crystalCount);
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    for (let i = 0; i < crystalCount; i++) {
      const ang = (i / crystalCount) * Math.PI * 2 + Math.random() * 0.5;
      const rad = 12 + Math.random() * 42;
      dummy.position.set(Math.cos(ang) * rad, y2 - 12.2, Math.sin(ang) * rad - 10);
      dummy.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * Math.PI, (Math.random() - 0.5) * 0.5);
      const sc = 0.75 + Math.random() * 1.65;
      dummy.scale.set(sc, sc * (0.9 + Math.random() * 0.9), sc);
      dummy.updateMatrix();
      crystalInst.setMatrixAt(i, dummy.matrix);
      col.setHSL(0.49 + (i % 4) * 0.05, 0.95, 0.58);
      crystalInst.setColorAt(i, col);
    }
    crystalInst.computeBoundingSphere();
    root.add(crystalInst);

    const caveLight = new THREE.PointLight(0x2dd4bf, 18, 70, 1.4);
    caveLight.position.set(0, y2 + 2, -16);
    root.add(caveLight);

    // Bioluminescent Jellyfish Colonies
    const bellGeo = new THREE.SphereGeometry(1.6, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const bellMat = new THREE.MeshPhysicalMaterial({
      color: 0x67e8f9,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.25,
      transparent: true,
      opacity: 0.72,
      roughness: 0.15,
      depthWrite: false,
    });
    const tentacleGeo = new THREE.CylinderGeometry(0.05, 0.02, 3.6, 6);

    for (let j = 0; j < 7; j++) {
      const jg = new THREE.Group();
      const ang = (j / 7) * Math.PI * 2;
      const rad = 10 + (j % 3) * 8;
      const baseY = y2 + 2 + (j % 3) * 3;
      jg.position.set(Math.cos(ang) * rad, baseY, Math.sin(ang) * rad - 16);
      const bell = new THREE.Mesh(bellGeo, bellMat);
      jg.add(bell);

      const jTents: THREE.Mesh[] = [];
      for (let t = 0; t < 5; t++) {
        const ta = (t / 5) * Math.PI * 2;
        const tent = new THREE.Mesh(tentacleGeo, bellMat);
        tent.position.set(Math.cos(ta) * 0.65, -1.7, Math.sin(ta) * 0.65);
        jg.add(tent);
        jTents.push(tent);
      }
      root.add(jg);
      jellyfish.push({ group: jg, baseY, phase: j * 1.1, tentacles: jTents });
    }

    const mono2 = buildMonolith(textures, 'mono-2', 2, new THREE.Vector3(0, y2 - 13, -24), 0x2dd4bf);
    monoliths.push(mono2);
    root.add(mono2.mesh);
    interactiveWorldMeshes.push(mono2.mesh);
  }

  // ============================================================================
  // KATMAN 4 (8.000m): HİDROTERMAL BACALAR & VOLKANİK DÖKÜMHANE
  // ============================================================================
  {
    const y3 = ABYSS_LAYERS[3].yCenter;
    const basaltMat = new THREE.MeshStandardMaterial({
      map: textures.volcanicBasaltColor,
      emissiveMap: textures.volcanicBasaltEmissive,
      emissive: new THREE.Color(0xff5500),
      emissiveIntensity: 1.35,
      roughness: 0.85,
      metalness: 0.25,
    });
    buildSeabed(y3, basaltMat, 2.2, 1.05);

    // 4 Erupting Hydrothermal Vents (Can scald Automatons!)
    const ventPositions = [
      new THREE.Vector3(-12, y3 - 13.5, -16),
      new THREE.Vector3(14, y3 - 13.5, -14),
      new THREE.Vector3(-6, y3 - 13.5, -30),
      new THREE.Vector3(9, y3 - 13.5, -28),
    ];
    const chimneyMat = new THREE.MeshStandardMaterial({
      map: textures.volcanicBasaltColor,
      color: 0x29211f,
      roughness: 0.92,
      metalness: 0.2,
    });
    const plumeMat = new THREE.MeshBasicMaterial({
      color: 0xff7b29,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    ventPositions.forEach((vp, idx) => {
      const chimney = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 2.4, 8.5, 10), chimneyMat);
      chimney.position.copy(vp).add(new THREE.Vector3(0, 4.2, 0));
      root.add(chimney);

      const plume = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 0.9, 14, 12, 1, true), plumeMat);
      plume.position.copy(vp).add(new THREE.Vector3(0, 14.5, 0));
      root.add(plume);

      const vLight = new THREE.PointLight(0xff5714, 12, 30, 1.6);
      vLight.position.copy(vp).add(new THREE.Vector3(0, 9.2, 0));
      root.add(vLight);

      vents.push({
        id: `vent-${idx}`,
        position: vp.clone().add(new THREE.Vector3(0, 10, 0)),
        layerId: 3,
        plumeMesh: plume,
        eruptingPhase: idx * 1.4,
      });
    });

    // Ancient Geothermal Brass Turbines
    for (const tx of [-22, 22]) {
      const tGroup = new THREE.Group();
      tGroup.position.set(tx, y3 - 4, -22);
      const frame = new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.45, 12, 28), rustedSteelMat);
      tGroup.add(frame);
      const blades = new THREE.Group();
      for (let b = 0; b < 6; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.85, 4.1, 0.25), brassMat);
        const a = (b / 6) * Math.PI * 2;
        blade.position.set(Math.cos(a) * 2.1, Math.sin(a) * 2.1, 0);
        blade.rotation.z = a + Math.PI / 2;
        blades.add(blade);
      }
      tGroup.add(blades);
      root.add(tGroup);
      turbines.push(blades);
    }

    const auto3 = buildClockworkAutomaton(textures, 'auto-3a', 3, new THREE.Vector3(0, y3 - 2, -20));
    automatons.push(auto3);
    root.add(auto3.mesh);
    interactiveWorldMeshes.push(auto3.mesh);

    const mono3 = buildMonolith(textures, 'mono-3', 3, new THREE.Vector3(0, y3 - 13, -36), 0xf97316);
    monoliths.push(mono3);
    root.add(mono3.mesh);
    interactiveWorldMeshes.push(mono3.mesh);
  }

  // ============================================================================
  // KATMAN 5 (11.000m): HADAL ÇEKİRDEĞİ & THE ABYSSAL KRAKEN BOSS ARENA
  // ============================================================================
  let kraken!: KrakenBoss;
  {
    const y4 = ABYSS_LAYERS[4].yCenter;
    const hadalMat = new THREE.MeshStandardMaterial({
      map: textures.ancientMarbleColor,
      color: 0x111824,
      roughness: 0.78,
      metalness: 0.3,
    });
    buildSeabed(y4, hadalMat, 4.0, 1.3);

    // Hadal Sanctum Outer Ring Pillars
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 22, 8), hadalMat);
      pillar.position.set(Math.cos(a) * 34, y4 - 3, Math.sin(a) * 34 - 18);
      root.add(pillar);
    }

    const mono4 = buildMonolith(textures, 'mono-4', 4, new THREE.Vector3(0, y4 - 12, 6), 0xf59e0b);
    monoliths.push(mono4);
    root.add(mono4.mesh);
    interactiveWorldMeshes.push(mono4.mesh);

    // THE ABYSSAL KRAKEN (Colossal Biomechanical Boss)
    const kRoot = new THREE.Group();
    kRoot.position.set(0, y4 + 1, -30);

    const kMantle = new THREE.Group();
    const chitinMat = new THREE.MeshPhysicalMaterial({
      map: textures.rivetedSteelColor,
      color: 0x1d2532,
      metalness: 0.72,
      roughness: 0.35,
      clearcoat: 0.45,
    });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff9e2c,
      emissive: 0xff6a00,
      emissiveIntensity: 2.5,
      roughness: 0.15,
    });

    // Sculpted Lathe Mantle Head
    const kPoints = [
      new THREE.Vector2(0.01, -3.5),
      new THREE.Vector2(3.6, -2.5),
      new THREE.Vector2(4.4, 0.5),
      new THREE.Vector2(3.1, 5.2),
      new THREE.Vector2(1.4, 8.8),
      new THREE.Vector2(0.01, 10.2),
    ];
    const mantleMesh = new THREE.Mesh(new THREE.LatheGeometry(kPoints, 22), chitinMat);
    mantleMesh.userData = { targetKind: 'kraken', targetId: 'kraken-boss', interactLabel: 'The Abyssal Kraken (Zayıf Nokta)' };
    kMantle.add(mantleMesh);

    // Brass Armor Crest Ribs
    for (const ry of [0, 2.8, 5.4]) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(4.2 - ry * 0.36, 0.25, 10, 24), brassMat);
      rib.rotation.x = Math.PI / 2;
      rib.position.y = ry;
      kMantle.add(rib);
    }

    // Twin Glowing Sensory Eyes
    for (const ex of [-2.2, 2.2]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12), eyeMat);
      eye.position.set(ex, 0.2, 3.6);
      eye.userData = { targetKind: 'kraken', targetId: 'kraken-boss', interactLabel: 'Kraken Optik Çekirdeği' };
      kMantle.add(eye);
    }

    const bossLight = new THREE.PointLight(0xff7722, 22, 65, 1.4);
    bossLight.position.set(0, 1.5, 6.5);
    kMantle.add(bossLight);
    kRoot.add(kMantle);

    // 6 Articulated Sweeping Tentacles (TubeGeometry along curves)
    const tentacles: THREE.Group[] = [];
    for (let t = 0; t < 6; t++) {
      const tGroup = new THREE.Group();
      const ang = ((t - 2.5) / 5) * Math.PI * 1.15;
      tGroup.position.set(Math.sin(ang) * 3.8, -2.2, Math.cos(ang) * 2.5);
      tGroup.rotation.y = ang;

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, -1.5, 5.5),
        new THREE.Vector3(0, 1.2, 11.5),
        new THREE.Vector3(0, 3.2, 16.5),
      ]);
      const tGeo = new THREE.TubeGeometry(curve, 20, 0.68, 10, false);
      const tMesh = new THREE.Mesh(tGeo, chitinMat);
      tMesh.userData = { targetKind: 'kraken', targetId: 'kraken-boss', interactLabel: 'Kraken Dokungacı' };
      tGroup.add(tMesh);

      const tipClaw = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.1, 8), brassMat);
      tipClaw.rotation.x = Math.PI / 2;
      tipClaw.position.set(0, 3.2, 17.3);
      tipClaw.userData = { targetKind: 'kraken', targetId: 'kraken-boss', interactLabel: 'Kraken Zırhlı Pençesi' };
      tGroup.add(tipClaw);

      kRoot.add(tGroup);
      tentacles.push(tGroup);
    }

    root.add(kRoot);
    interactiveWorldMeshes.push(kRoot);

    kraken = {
      root: kRoot,
      mantle: kMantle,
      tentacles,
      eyeMat,
      hp: 100,
      maxHp: 100,
      defeated: false,
      hitFlash: 0,
    };
  }

  return {
    root,
    causticUniforms,
    automatons,
    vents,
    anchors,
    monoliths,
    jellyfish,
    turbines,
    kraken,
    interactiveWorldMeshes,
  };
}
