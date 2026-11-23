import * as THREE from 'three';
import { ProceduralTextureSet } from './proceduralTextures';

export interface NautilusRig {
  root: THREE.Group;
  propellerGroup: THREE.Group;
  floodLightLeft: THREE.SpotLight;
  floodLightRight: THREE.SpotLight;
  floodBeamLeft: THREE.Mesh;
  floodBeamRight: THREE.Mesh;
  cockpitGroup: THREE.Group;
  ballastValveWheel: THREE.Group;
  mainBreakerLever: THREE.Group;
  sonarLever: THREE.Group;
  helmWheel: THREE.Group;
  welderTorchGroup: THREE.Group;
  welderSparkLight: THREE.PointLight;
  interactiveMeshes: THREE.Object3D[];
}

export interface DiverSuitRig {
  root: THREE.Group;
  leftArmGroup: THREE.Group;
  rightArmGroup: THREE.Group;
  cavitationBlade: THREE.Mesh;
  cavitationTubeMat: THREE.MeshStandardMaterial;
  harpoonBarrel: THREE.Mesh;
  thrusterLeftSpin: THREE.Mesh;
  thrusterRightSpin: THREE.Mesh;
  helmetSpotLight: THREE.SpotLight;
}

/**
 * Hand-crafted composite Bathyscaphe "NAUTILUS-TR" (12+ physical parts)
 * Includes riveted steel pressure hull, quartz spherical dome, twin brass ballast
 * tanks, articulated floodlight housings, rear turbine shroud + blades, and
 * clickable physical cockpit levers (Ballast Valve, Main Breaker, Sonar Lever, Helm).
 */
export function buildNautilusTR(
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean
): NautilusRig {
  const root = new THREE.Group();

  const hullSteelMat = new THREE.MeshStandardMaterial({
    map: textures.rivetedSteelColor,
    bumpMap: textures.rivetedSteelBump,
    bumpScale: 0.04,
    metalness: 0.78,
    roughness: 0.48,
  });

  const brassMat = new THREE.MeshPhysicalMaterial({
    map: textures.hammeredBrassColor,
    color: 0xd9a85c,
    metalness: 0.92,
    roughness: 0.22,
    clearcoat: 0.35,
    clearcoatRoughness: 0.25,
  });

  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x1a2128,
    metalness: 0.85,
    roughness: 0.58,
  });

  const quartzDomeMat = new THREE.MeshPhysicalMaterial({
    color: 0xcbeeff,
    metalness: 0.05,
    roughness: 0.06,
    transmission: isSoftwareGl ? 0 : 0.88,
    transparent: true,
    opacity: isSoftwareGl ? 0.32 : 0.96,
    ior: 1.54,
    thickness: 0.6,
    clearcoat: 1.0,
    depthWrite: false,
  });

  // 1. Primary Pressure Hull (LatheGeometry silhouette)
  const hullProfile: THREE.Vector2[] = [
    new THREE.Vector2(0.01, -4.4),
    new THREE.Vector2(0.55, -4.1),
    new THREE.Vector2(1.25, -3.1),
    new THREE.Vector2(1.75, -1.6),
    new THREE.Vector2(1.85, 0.2),
    new THREE.Vector2(1.75, 1.5),
    new THREE.Vector2(1.38, 2.2),
    new THREE.Vector2(0.01, 2.2),
  ];
  const hullGeo = new THREE.LatheGeometry(hullProfile, 28);
  hullGeo.rotateX(Math.PI / 2); // +Z forward or -Z forward -> let's orient nose toward -Z
  hullGeo.rotateY(Math.PI);
  const mainHull = new THREE.Mesh(hullGeo, hullSteelMat);
  mainHull.castShadow = true;
  mainHull.receiveShadow = true;
  root.add(mainHull);

  // 2. Heavy Brass Reinforcement Ribs (Torus rings around hull)
  for (const zPos of [-1.4, 0.1, 1.45]) {
    const rib = new THREE.Mesh(
      new THREE.TorusGeometry(zPos < -1 ? 1.58 : 1.84, 0.08, 12, 32),
      brassMat
    );
    rib.position.z = zPos;
    root.add(rib);
  }

  // 3. Spherical Quartz Observation Dome (Nose at -Z)
  const domeGeo = new THREE.SphereGeometry(1.34, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.55);
  domeGeo.rotateX(-Math.PI / 2);
  const quartzDome = new THREE.Mesh(domeGeo, quartzDomeMat);
  quartzDome.position.set(0, 0.08, -2.05);
  quartzDome.renderOrder = 4;
  root.add(quartzDome);

  // Brass Dome Collar Ring
  const collar = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.11, 14, 32), brassMat);
  collar.position.set(0, 0.08, -2.12);
  root.add(collar);

  // 4. Twin Lateral Ballast Tanks (Port & Starboard)
  for (const side of [-1, 1]) {
    const tankGroup = new THREE.Group();
    const tankCyl = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 2.6, 8, 16), hullSteelMat);
    tankCyl.rotation.x = Math.PI / 2;
    tankGroup.add(tankCyl);

    const endCapFront = new THREE.Mesh(new THREE.SphereGeometry(0.44, 16, 12), brassMat);
    endCapFront.position.z = -1.35;
    tankGroup.add(endCapFront);

    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 1.8), darkIronMat);
    strut.position.x = -side * 0.45;
    tankGroup.add(strut);

    tankGroup.position.set(side * 2.05, -0.42, 0.15);
    root.add(tankGroup);
  }

  // 5. Dorsal Conning Tower & Snorkel Hatch
  const conningTower = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.72, 1.05, 18), hullSteelMat);
  conningTower.position.set(0, 2.15, 0.35);
  root.add(conningTower);

  const hatchRim = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.07, 10, 24), brassMat);
  hatchRim.rotation.x = Math.PI / 2;
  hatchRim.position.set(0, 2.68, 0.35);
  root.add(hatchRim);

  // 6. Hydrodynamic Stabilizer Fins & Rudders
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(1.2, -0.35);
  finShape.lineTo(1.1, -1.05);
  finShape.lineTo(0, -0.8);
  finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  });

  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(finGeo, brassMat);
    fin.rotation.x = Math.PI / 2;
    fin.rotation.z = side === 1 ? 0 : Math.PI;
    fin.position.set(side * 1.1, 0.05, 2.8);
    root.add(fin);
  }

  // 7. Rear Shrouded Brass Turbine Propeller
  const shroud = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.12, 12, 28), darkIronMat);
  shroud.position.set(0, 0, 4.15);
  root.add(shroud);

  const propellerGroup = new THREE.Group();
  propellerGroup.position.set(0, 0, 4.15);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.55, 16), brassMat);
  hub.rotation.x = Math.PI / 2;
  propellerGroup.add(hub);

  const bladeGeo = new THREE.BoxGeometry(0.18, 0.82, 0.05);
  for (let b = 0; b < 5; b++) {
    const blade = new THREE.Mesh(bladeGeo, brassMat);
    const angle = (b / 5) * Math.PI * 2;
    blade.position.set(Math.cos(angle) * 0.48, Math.sin(angle) * 0.48, 0);
    blade.rotation.z = angle + Math.PI / 2;
    blade.rotation.x = 0.45; // hydrodynamic pitch
    propellerGroup.add(blade);
  }
  root.add(propellerGroup);

  // 8. Twin Exterior Halogen Floodlights + Volumetric Beams
  const beamGeo = new THREE.ConeGeometry(4.2, 28, 24, 1, true);
  beamGeo.translate(0, -14, 0);
  beamGeo.rotateX(Math.PI / 2);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffe4b8,
    transparent: true,
    opacity: 0.055,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const floodBeamLeft = new THREE.Mesh(beamGeo, beamMat);
  floodBeamLeft.position.set(-1.35, 0.65, -2.05);
  root.add(floodBeamLeft);

  const floodBeamRight = new THREE.Mesh(beamGeo, beamMat);
  floodBeamRight.position.set(1.35, 0.65, -2.05);
  root.add(floodBeamRight);

  for (const sx of [-1.35, 1.35]) {
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.4, 14), brassMat);
    housing.rotation.x = Math.PI / 2;
    housing.position.set(sx, 0.65, -1.9);
    root.add(housing);
  }

  const floodLightLeft = new THREE.SpotLight(0xffe5bd, 58, 130, Math.PI / 4.8, 0.55, 1.35);
  floodLightLeft.position.set(-1.35, 0.65, -2.1);
  const targetL = new THREE.Object3D();
  targetL.position.set(-1.6, -1.2, -32);
  root.add(targetL);
  floodLightLeft.target = targetL;
  root.add(floodLightLeft);

  const floodLightRight = new THREE.SpotLight(0xffe5bd, 58, 130, Math.PI / 4.8, 0.55, 1.35);
  floodLightRight.position.set(1.35, 0.65, -2.1);
  const targetR = new THREE.Object3D();
  targetR.position.set(1.6, -1.2, -32);
  root.add(targetR);
  floodLightRight.target = targetR;
  root.add(floodLightRight);

  // 9. Interior Physical Cockpit Console (visible in Cockpit mode)
  const cockpitGroup = new THREE.Group();
  cockpitGroup.position.set(0, -0.35, -1.55);

  const consoleDesk = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.42, 0.72), darkIronMat);
  consoleDesk.position.set(0, -0.22, 0);
  cockpitGroup.add(consoleDesk);

  const brassTrim = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.05, 0.76), brassMat);
  brassTrim.position.set(0, -0.01, 0);
  cockpitGroup.add(brassTrim);

  // Warm amber cockpit instrument light
  const cockpitWarmLight = new THREE.PointLight(0xffb347, 1.4, 4.5, 1.5);
  cockpitWarmLight.position.set(0, 0.55, 0.35);
  cockpitGroup.add(cockpitWarmLight);

  const interactiveMeshes: THREE.Object3D[] = [];

  // 9A. Ballast Valve Wheel (Left Console)
  const ballastValveWheel = new THREE.Group();
  ballastValveWheel.position.set(-0.62, 0.14, 0.08);
  ballastValveWheel.rotation.x = -0.5;
  const valveRim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.028, 10, 20), brassMat);
  valveRim.userData = { interactId: 'ballast', interactLabel: 'Safra Tankı Vanası (Basınç/Denge)' };
  ballastValveWheel.add(valveRim);
  for (let s = 0; s < 3; s++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 8), brassMat);
    spoke.rotation.z = (s / 3) * Math.PI;
    spoke.userData = { interactId: 'ballast', interactLabel: 'Safra Tankı Vanası (Basınç/Denge)' };
    ballastValveWheel.add(spoke);
  }
  cockpitGroup.add(ballastValveWheel);
  interactiveMeshes.push(ballastValveWheel);

  // 9B. Mechanical Helm Wheel (Center)
  const helmWheel = new THREE.Group();
  helmWheel.position.set(0, 0.16, 0.18);
  helmWheel.rotation.x = -0.32;
  const helmRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 10, 24), brassMat);
  helmRing.userData = { interactId: 'floodlights', interactLabel: 'Projektör & Dümen Kontrolü' };
  helmWheel.add(helmRing);
  for (let h = 0; h < 6; h++) {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.52, 8), brassMat);
    handle.rotation.z = (h / 6) * Math.PI;
    handle.userData = { interactId: 'floodlights', interactLabel: 'Projektör & Dümen Kontrolü' };
    helmWheel.add(handle);
  }
  cockpitGroup.add(helmWheel);
  interactiveMeshes.push(helmWheel);

  // 9C. Main Electric Breaker Lever (Right-Inner)
  const mainBreakerLever = new THREE.Group();
  mainBreakerLever.position.set(0.45, 0.05, 0.05);
  const breakerBase = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.18), darkIronMat);
  mainBreakerLever.add(breakerBase);
  const breakerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.24, 8), brassMat);
  breakerArm.position.set(0, 0.12, 0);
  breakerArm.rotation.x = -0.35;
  breakerArm.userData = { interactId: 'breaker', interactLabel: 'Ana Elektrik Şalteri' };
  mainBreakerLever.add(breakerArm);
  const breakerKnob = new THREE.Mesh(
    new THREE.SphereGeometry(0.036, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.35, metalness: 0.2 })
  );
  breakerKnob.position.set(0, 0.22, -0.07);
  breakerKnob.userData = { interactId: 'breaker', interactLabel: 'Ana Elektrik Şalteri' };
  mainBreakerLever.add(breakerKnob);
  cockpitGroup.add(mainBreakerLever);
  interactiveMeshes.push(mainBreakerLever);

  // 9D. Mechanical Sonar Ping Lever (Far Right)
  const sonarLever = new THREE.Group();
  sonarLever.position.set(0.74, 0.06, 0.06);
  const sonarArm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 8), brassMat);
  sonarArm.position.set(0, 0.11, 0);
  sonarArm.userData = { interactId: 'sonar', interactLabel: 'Akustik Sonar Kolu [F]' };
  sonarLever.add(sonarArm);
  const sonarGrip = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 12, 10),
    new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.65,
      roughness: 0.3,
    })
  );
  sonarGrip.position.set(0, 0.22, 0);
  sonarGrip.userData = { interactId: 'sonar', interactLabel: 'Akustik Sonar Kolu [F]' };
  sonarLever.add(sonarGrip);
  cockpitGroup.add(sonarLever);
  interactiveMeshes.push(sonarLever);

  // 9E. Embedded CRT Sonar Housing on Desk
  const crtBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.1, 20), brassMat);
  crtBezel.rotation.x = Math.PI / 2 - 0.55;
  crtBezel.position.set(-0.3, 0.1, -0.14);
  cockpitGroup.add(crtBezel);

  const crtGlass = new THREE.Mesh(
    new THREE.CircleGeometry(0.15, 24),
    new THREE.MeshBasicMaterial({ map: textures.sonarDialTexture })
  );
  crtGlass.position.set(-0.3, 0.135, -0.1);
  crtGlass.rotation.x = -0.55;
  cockpitGroup.add(crtGlass);

  // 10. Underwater Arc Welder Arm (mounted lower-right cockpit / EVA repair)
  const welderTorchGroup = new THREE.Group();
  welderTorchGroup.position.set(0.75, -0.45, -1.85);
  const welderBody = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.48, 12), brassMat);
  welderBody.rotation.x = Math.PI / 2;
  welderTorchGroup.add(welderBody);
  const welderTip = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.14, 10), darkIronMat);
  welderTip.rotation.x = -Math.PI / 2;
  welderTip.position.z = -0.28;
  welderTorchGroup.add(welderTip);

  const welderSparkLight = new THREE.PointLight(0x7dd3fc, 0, 12, 1.5);
  welderSparkLight.position.set(0, 0, -0.42);
  welderTorchGroup.add(welderSparkLight);
  welderTorchGroup.visible = false;
  root.add(welderTorchGroup);

  root.add(cockpitGroup);

  return {
    root,
    propellerGroup,
    floodLightLeft,
    floodLightRight,
    floodBeamLeft,
    floodBeamRight,
    cockpitGroup,
    ballastValveWheel,
    mainBreakerLever,
    sonarLever,
    helmWheel,
    welderTorchGroup,
    welderSparkLight,
    interactiveMeshes,
  };
}

/**
 * Hand-crafted Enes Öztürk Heavy Pressure Bathysphere Suit ("The Bathysphere Rig")
 * Copper-brass diving helmet with quartz visor, twin Heliox tanks, articulated back
 * directional turbines, Right Hand Cavitation Glaive, Left Hand Pneumatic Harpoon Winch.
 */
export function buildDiverSuitRig(textures: ProceduralTextureSet): DiverSuitRig {
  const root = new THREE.Group();

  const copperBrassMat = new THREE.MeshPhysicalMaterial({
    map: textures.hammeredBrassColor,
    color: 0xc8844c,
    metalness: 0.88,
    roughness: 0.28,
    clearcoat: 0.25,
  });

  const titaniumSuitMat = new THREE.MeshStandardMaterial({
    map: textures.rivetedSteelColor,
    color: 0x3b4856,
    metalness: 0.65,
    roughness: 0.55,
  });

  const visorMat = new THREE.MeshPhysicalMaterial({
    color: 0x93e2ff,
    emissive: 0x164e63,
    emissiveIntensity: 0.4,
    metalness: 0.1,
    roughness: 0.08,
    clearcoat: 1.0,
  });

  // Torso Armor
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.62, 8, 16), titaniumSuitMat);
  torso.position.y = 0.05;
  torso.castShadow = true;
  root.add(torso);

  // Brass Breastplate Collar
  const breastCollar = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.075, 10, 20), copperBrassMat);
  breastCollar.rotation.x = Math.PI / 2;
  breastCollar.position.y = 0.44;
  root.add(breastCollar);

  // Old-school Copper Diving Helmet + Quartz Visor
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 16), copperBrassMat);
  helmet.position.set(0, 0.72, 0);
  root.add(helmet);

  const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16), visorMat);
  visor.rotation.x = Math.PI / 2;
  visor.position.set(0, 0.72, -0.24);
  root.add(visor);

  const visorGrill = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.02, 8, 18), copperBrassMat);
  visorGrill.position.set(0, 0.72, -0.27);
  root.add(visorGrill);

  // Twin Heliox Regulator Cylinders + Directional Thrusters on Back
  const thrusterGeo = new THREE.TorusGeometry(0.14, 0.03, 8, 16);
  const spinGeo = new THREE.BoxGeometry(0.22, 0.04, 0.02);
  let thrusterLeftSpin!: THREE.Mesh;
  let thrusterRightSpin!: THREE.Mesh;

  for (const side of [-1, 1]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.72, 14), copperBrassMat);
    tank.position.set(side * 0.17, 0.1, 0.34);
    root.add(tank);

    const thrusterShroud = new THREE.Mesh(thrusterGeo, titaniumSuitMat);
    thrusterShroud.position.set(side * 0.28, 0.28, 0.42);
    root.add(thrusterShroud);

    const blade = new THREE.Mesh(spinGeo, copperBrassMat);
    blade.position.set(side * 0.28, 0.28, 0.42);
    root.add(blade);
    if (side === -1) thrusterLeftSpin = blade;
    else thrusterRightSpin = blade;
  }

  // Legs
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.65, 6, 12), titaniumSuitMat);
    leg.position.set(side * 0.18, -0.68, 0.02);
    leg.rotation.x = 0.15;
    root.add(leg);
  }

  // RIGHT ARM: High-Pressure Cavitation Glaive (Kavitasyon Mızrak-Kılıcı)
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.46, 0.26, -0.08);
  const rArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.42, 6, 10), titaniumSuitMat);
  rArm.rotation.x = Math.PI / 2.4;
  rArm.position.set(0, -0.1, -0.2);
  rightArmGroup.add(rArm);

  const glaiveShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.038, 1.45, 10), copperBrassMat);
  glaiveShaft.rotation.x = Math.PI / 2;
  glaiveShaft.position.set(0.05, -0.18, -0.78);
  rightArmGroup.add(glaiveShaft);

  const cavitationTubeMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.6,
    roughness: 0.2,
    metalness: 0.3,
  });
  const pressureTube = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.32, 10), cavitationTubeMat);
  pressureTube.rotation.x = Math.PI / 2;
  pressureTube.position.set(0.05, -0.18, -1.08);
  rightArmGroup.add(pressureTube);

  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0);
  bladeShape.lineTo(0.08, 0.55);
  bladeShape.lineTo(0, 0.85);
  bladeShape.lineTo(-0.06, 0.48);
  bladeShape.closePath();
  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.025,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  const cavitationBlade = new THREE.Mesh(
    bladeGeo,
    new THREE.MeshPhysicalMaterial({
      color: 0xdbeafe,
      metalness: 0.96,
      roughness: 0.14,
      anisotropy: 0.7,
    })
  );
  cavitationBlade.rotation.x = -Math.PI / 2;
  cavitationBlade.rotation.z = Math.PI / 2;
  cavitationBlade.position.set(0.05, -0.18, -1.32);
  rightArmGroup.add(cavitationBlade);
  root.add(rightArmGroup);

  // LEFT ARM: Pneumatic Harpoon & Winch (Pnömatik Zıpkın ve Çekme Vinci)
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.46, 0.26, -0.08);
  const lArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.42, 6, 10), titaniumSuitMat);
  lArm.rotation.x = Math.PI / 2.4;
  lArm.position.set(0, -0.1, -0.2);
  leftArmGroup.add(lArm);

  const harpoonBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.72, 12), copperBrassMat);
  harpoonBarrel.rotation.x = Math.PI / 2;
  harpoonBarrel.position.set(-0.04, -0.16, -0.64);
  leftArmGroup.add(harpoonBarrel);

  const spearTip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.24, 6), titaniumSuitMat);
  spearTip.rotation.x = -Math.PI / 2;
  spearTip.position.set(-0.04, -0.16, -1.1);
  leftArmGroup.add(spearTip);
  root.add(leftArmGroup);

  // Helmet Projector Spotlight
  const helmetSpotLight = new THREE.SpotLight(0xd9f7ff, 34, 85, Math.PI / 5, 0.5, 1.4);
  helmetSpotLight.position.set(0, 0.75, -0.35);
  const target = new THREE.Object3D();
  target.position.set(0, 0.2, -24);
  root.add(target);
  helmetSpotLight.target = target;
  root.add(helmetSpotLight);

  return {
    root,
    leftArmGroup,
    rightArmGroup,
    cavitationBlade,
    cavitationTubeMat,
    harpoonBarrel,
    thrusterLeftSpin,
    thrusterRightSpin,
    helmetSpotLight,
  };
}
