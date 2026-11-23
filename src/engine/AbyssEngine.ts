import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { HydrophoneAudio } from '../audio/HydrophoneAudio';
import {
  ABYSS_LAYERS,
  CockpitSystems,
  DepthLayerId,
  GameStateSnapshot,
  SonarBlip,
  ViewMode,
} from '../types/abyss';
import {
  buildDiverSuitRig,
  buildNautilusTR,
  DiverSuitRig,
  NautilusRig,
} from './nautilusBuilder';
import { createProceduralTextures, ProceduralTextureSet } from './proceduralTextures';
import { AbyssalWorldData, buildAbyssalWorld } from './worldBuilder';

// Pre-allocated scratch math helpers (zero GC inside animation loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _camTargetPos = new THREE.Vector3();
const _camLookAt = new THREE.Vector3();
const _targetFogColor = new THREE.Color();
const _targetSkyColor = new THREE.Color();
const _targetGroundColor = new THREE.Color();
const _targetKeyColor = new THREE.Color();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();

interface ShockwaveRing {
  mesh: THREE.Mesh;
  age: number;
  maxAge: number;
}

export class AbyssEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private textures: ProceduralTextureSet;
  private nautilus: NautilusRig;
  private diver: DiverSuitRig;
  private world: AbyssalWorldData;
  private audio: HydrophoneAudio;
  private isSoftwareGl: boolean;

  private hemiLight: THREE.HemisphereLight;
  private keyLight: THREE.DirectionalLight;

  // Plankton & rising bubble particle fields
  private planktonPoints: THREE.Points;
  private bubblePoints: THREE.Points;
  private bubblePositions: Float32Array;

  // Harpoon steel cable line
  private harpoonLine: THREE.Line;
  private harpoonActive = false;
  private harpoonTimer = 0;
  private harpoonLatchPos = new THREE.Vector3();

  // Active shockwave / sonar expanding rings
  private shockwaves: ShockwaveRing[] = [];
  private sonarRing: THREE.Mesh;
  private sonarPulseAge = 99;
  private sonarBlips: SonarBlip[] = [];

  // Player & Vessel Kinematics
  private started = false;
  private layerId: DepthLayerId = 0;
  private viewMode: ViewMode = 'cockpit';
  private playerPos = new THREE.Vector3(0, 0, 12);
  private velocity = new THREE.Vector3();
  private yaw = 0;
  private pitch = -0.06;
  private smoothCamPos = new THREE.Vector3(0, 0.2, 12);
  private smoothCamLook = new THREE.Vector3(0, 0, -10);

  // Survival & Combat State
  private hullIntegrity = 100;
  private helioxOxygen = 100;
  private glaiveCharge = 100;
  private glaiveSwingAnim = 0;
  private harpoonRecoilAnim = 0;
  private welderTimer = 0;
  private cockpit: CockpitSystems = {
    ballastOpen: false,
    mainBreakerOn: true,
    floodlightsOn: true,
    welderActive: false,
  };
  private hoveredInteractable: string | null = null;
  private eventNotice: string | null = null;
  private eventNoticeTimer = 0;

  // Input State
  private keys: Record<string, boolean> = {};
  private pointerDown = false;
  private pointerMoved = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private pointerNDC = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();
  private lastHoverCheck = 0;

  // Loop & Callbacks
  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;
  private onStateUpdate: (snapshot: GameStateSnapshot) => void;
  private lastSnapshotEmit = 0;

  constructor(
    container: HTMLElement,
    onStateUpdate: (snapshot: GameStateSnapshot) => void
  ) {
    this.container = container;
    this.onStateUpdate = onStateUpdate;
    this.audio = new HydrophoneAudio();

    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const initialLayer = ABYSS_LAYERS[0];
    this.scene.background = new THREE.Color(initialLayer.fogColor);
    this.scene.fog = new THREE.FogExp2(initialLayer.fogColor, initialLayer.fogDensity);

    this.camera = new THREE.PerspectiveCamera(68, width / height, 0.15, 220);
    this.camera.position.copy(this.playerPos);

    // Mandatory Studio Environment Reflection for metals & quartz dome
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Warm/cool balanced lighting rig
    this.hemiLight = new THREE.HemisphereLight(
      initialLayer.ambientSky,
      initialLayer.ambientGround,
      0.85
    );
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(
      initialLayer.keyLightColor,
      initialLayer.keyLightIntensity
    );
    this.keyLight.position.set(18, 42, 22);
    if (!this.isSoftwareGl) {
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.set(1024, 1024);
      this.keyLight.shadow.bias = -0.0005;
      this.keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.keyLight);

    // Textures & 3D Assemblies
    this.textures = createProceduralTextures(
      this.renderer.capabilities.getMaxAnisotropy()
    );
    this.nautilus = buildNautilusTR(this.textures, this.isSoftwareGl);
    this.nautilus.root.position.copy(this.playerPos);
    this.scene.add(this.nautilus.root);

    this.diver = buildDiverSuitRig(this.textures);
    this.diver.root.visible = false;
    this.scene.add(this.diver.root);

    this.world = buildAbyssalWorld(this.textures);
    this.scene.add(this.world.root);

    // Plankton motes around player
    const pCount = 420;
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 90;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 55;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 90;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    this.planktonPoints = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        size: 0.24,
        map: this.textures.bubbleSprite,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        color: 0xa5f3fc,
      })
    );
    this.scene.add(this.planktonPoints);

    // Rising suit/thruster micro-bubbles
    const bCount = 90;
    this.bubblePositions = new Float32Array(bCount * 3);
    for (let i = 0; i < bCount; i++) {
      this.bubblePositions[i * 3] = (Math.random() - 0.5) * 3;
      this.bubblePositions[i * 3 + 1] = Math.random() * 6;
      this.bubblePositions[i * 3 + 2] = (Math.random() - 0.5) * 3;
    }
    const bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute('position', new THREE.BufferAttribute(this.bubblePositions, 3));
    this.bubblePoints = new THREE.Points(
      bGeo,
      new THREE.PointsMaterial({
        size: 0.16,
        map: this.textures.bubbleSprite,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
        color: 0xe0f2fe,
      })
    );
    this.scene.add(this.bubblePoints);

    // Pneumatic Harpoon Steel Cable Line
    const cableGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    this.harpoonLine = new THREE.Line(
      cableGeo,
      new THREE.LineBasicMaterial({ color: 0xfbbf24, linewidth: 2 })
    );
    this.harpoonLine.visible = false;
    this.harpoonLine.frustumCulled = false;
    this.scene.add(this.harpoonLine);

    // 3D Acoustic Sonar Ring
    this.sonarRing = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.35, 48),
      new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.sonarRing.rotation.x = Math.PI / 2;
    this.scene.add(this.sonarRing);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.emitSnapshot();
    this.tick();
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('contextmenu', this.handleContextMenu);
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
  };

  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
    if (this.started) {
      this.fireHarpoon();
    }
  };

  private handleResize = (): void => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keys[e.code] = true;
    if (!this.started) return;

    switch (e.code) {
      case 'KeyF':
        this.triggerSonarPing();
        break;
      case 'KeyQ':
        this.strikeCavitationGlaive();
        break;
      case 'KeyE':
        this.fireHarpoon();
        break;
      case 'KeyR':
        this.activateArcWelder();
        break;
      case 'KeyV':
        this.cycleViewMode();
        break;
      case 'Digit1':
        this.diveToLayer(0);
        break;
      case 'Digit2':
        this.diveToLayer(1);
        break;
      case 'Digit3':
        this.diveToLayer(2);
        break;
      case 'Digit4':
        this.diveToLayer(3);
        break;
      case 'Digit5':
        this.diveToLayer(4);
        break;
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.code] = false;
  };

  private handlePointerDown = (e: PointerEvent): void => {
    if (!this.started) return;
    this.pointerDown = true;
    this.pointerMoved = false;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  };

  private handlePointerMove = (e: PointerEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.pointerDown) {
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      if (Math.abs(dx) + Math.abs(dy) > 3) {
        this.pointerMoved = true;
      }
      this.yaw -= dx * 0.0042;
      this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.0036, -0.78, 0.78);
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      return;
    }

    // Throttled hover raycast for diegetic lever/target tooltip
    const now = performance.now();
    if (this.started && now - this.lastHoverCheck > 75) {
      this.lastHoverCheck = now;
      this.updateHoverTarget();
    }
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (!this.pointerDown) return;
    this.pointerDown = false;
    if (!this.started || this.pointerMoved) return;

    // Click interaction against cockpit levers or world targets
    if (e.button === 0) {
      this.performClickRaycast();
    }
  };

  private updateHoverTarget(): void {
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);
    const candidates: THREE.Object3D[] =
      this.viewMode === 'cockpit'
        ? [...this.nautilus.interactiveMeshes, ...this.world.interactiveWorldMeshes]
        : this.world.interactiveWorldMeshes;

    const hits = this.raycaster.intersectObjects(candidates, true);
    let label: string | null = null;
    for (const h of hits) {
      if (h.distance > 42) break;
      const lbl = h.object.userData?.interactLabel;
      if (lbl) {
        label = lbl;
        break;
      }
    }
    if (label !== this.hoveredInteractable) {
      this.hoveredInteractable = label;
      this.renderer.domElement.style.cursor = label ? 'pointer' : 'grab';
      this.emitSnapshot();
    }
  }

  private performClickRaycast(): void {
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);
    const candidates: THREE.Object3D[] =
      this.viewMode === 'cockpit'
        ? [...this.nautilus.interactiveMeshes, ...this.world.interactiveWorldMeshes]
        : this.world.interactiveWorldMeshes;

    const hits = this.raycaster.intersectObjects(candidates, true);
    if (hits.length === 0) {
      // If in EVA mode, empty click swings the Cavitation Glaive!
      if (this.viewMode === 'eva') {
        this.strikeCavitationGlaive();
      }
      return;
    }

    const hit = hits[0];
    const data = hit.object.userData || {};

    if (data.interactId) {
      this.audio.playMechanicalSwitch();
      switch (data.interactId) {
        case 'ballast':
          this.cockpit.ballastOpen = !this.cockpit.ballastOpen;
          this.setNotice(
            this.cockpit.ballastOpen
              ? 'Safra tankı vanası açıldı: Dalış dengesi artırıldı.'
              : 'Safra tankı vanası mühürlendi.'
          );
          break;
        case 'breaker':
          this.cockpit.mainBreakerOn = !this.cockpit.mainBreakerOn;
          this.cockpit.floodlightsOn = this.cockpit.mainBreakerOn;
          this.setNotice(
            this.cockpit.mainBreakerOn
              ? 'Ana elektrik şalteri devrede: Türbinler tam güçte.'
              : 'Ana şalter kesildi: Sessiz çalışma modu.'
          );
          break;
        case 'floodlights':
          this.cockpit.floodlightsOn = !this.cockpit.floodlightsOn;
          this.setNotice(
            this.cockpit.floodlightsOn
              ? 'Projektörler ateşlendi.'
              : 'Projektörler karartıldı.'
          );
          break;
        case 'sonar':
          this.triggerSonarPing();
          break;
      }
      this.emitSnapshot();
      return;
    }

    if (data.targetKind === 'monolith' && hit.distance < 38) {
      this.activateMonolith(data.targetId);
    } else if (
      (data.targetKind === 'hostile' || data.targetKind === 'kraken') &&
      hit.distance < 34
    ) {
      this.strikeCavitationGlaive();
    } else if (data.targetKind === 'anchor' && hit.distance < 55) {
      this.fireHarpoonAtPoint(hit.point, 'Çapa Halkası');
    }
  }

  private activateMonolith(id: string): void {
    const mono = this.world.monoliths.find((m) => m.id === id);
    if (!mono || mono.activated) return;
    mono.activated = true;
    mono.coreMat.emissiveIntensity = 3.2;
    this.helioxOxygen = Math.min(100, this.helioxOxygen + 25);
    this.audio.playSonarPing();
    this.spawnShockwave(mono.position.clone().add(new THREE.Vector3(0, 8.5, 0)), 0x38bdf8);
    this.setNotice(`Antik Veri-Enerji Anıtı mühürlendi — Heliox rezervi yenilendi.`);
    this.emitSnapshot();
  }

  // Public Controls API ------------------------------------------------------
  public startExperience(): void {
    this.started = true;
    this.audio.init();
    this.triggerSonarPing();
    this.setNotice('Nautilus-TR derin dalışa hazır. Akustik sonar taraması başlatıldı.');
    this.emitSnapshot();
  }

  public diveToLayer(id: DepthLayerId): void {
    this.layerId = id;
    const cfg = ABYSS_LAYERS[id];
    this.playerPos.set(0, cfg.yCenter, 14);
    this.velocity.set(0, 0, 0);
    this.yaw = 0;
    this.pitch = -0.06;
    this.audio.playHullCreak(0.4 + id * 0.15);
    this.triggerSonarPing();
    this.setNotice(`Katman ${id + 1}: ${cfg.name} (${cfg.depthMeters}m)`);
    this.emitSnapshot();
  }

  public setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    this.nautilus.root.visible = mode !== 'eva';
    this.diver.root.visible = mode === 'eva';
    this.nautilus.cockpitGroup.visible = mode === 'cockpit';
    this.audio.playMechanicalSwitch();

    if (mode === 'eva') {
      this.setNotice('Bathysphere Dalış Zırhı EVA aktif: Kavitasyon Mızrağı & Pnömatik Zıpkın hazır.');
    } else if (mode === 'cockpit') {
      this.setNotice('Nautilus-TR Kokpit: Vanalara ve şalterlere doğrudan tıklayabilirsiniz.');
    } else {
      this.setNotice('Dış Batiskaf Kamerası aktif.');
    }
    this.emitSnapshot();
  }

  public cycleViewMode(): void {
    const order: ViewMode[] = ['cockpit', 'exterior', 'eva'];
    const next = order[(order.indexOf(this.viewMode) + 1) % order.length];
    this.setViewMode(next);
  }

  public toggleMute(): void {
    this.audio.init();
    this.audio.setMuted(!this.audio.isMuted());
    this.emitSnapshot();
  }

  public triggerSonarPing(): void {
    this.audio.init();
    this.audio.playSonarPing();
    this.sonarPulseAge = 0;
    this.sonarRing.position.copy(this.playerPos);
    this.sonarRing.scale.setScalar(1);

    // Scan all entities in the current depth layer for the CRT Phosphor Sonar
    const blips: SonarBlip[] = [];
    const maxRange = 65;

    const addBlip = (
      id: string,
      pos: THREE.Vector3,
      kind: SonarBlip['kind'],
      label: string
    ) => {
      const dx = pos.x - this.playerPos.x;
      const dz = pos.z - this.playerPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > maxRange) return;
      // Angle relative to player's facing yaw
      const worldAngle = Math.atan2(dx, -dz);
      const relAngle = worldAngle + this.yaw;
      blips.push({
        id,
        angleRad: relAngle,
        distanceNorm: Math.min(0.95, dist / maxRange),
        kind,
        label,
        strength: 1,
      });
    };

    for (const a of this.world.automatons) {
      if (a.alive && a.layerId === this.layerId) {
        addBlip(a.id, a.mesh.position, 'hostile', 'Derinlik Otomatı');
      }
    }
    for (const v of this.world.vents) {
      if (v.layerId === this.layerId) {
        addBlip(v.id, v.position, 'vent', 'Hidrotermal Baca');
      }
    }
    for (const anc of this.world.anchors) {
      if (anc.layerId === this.layerId) {
        addBlip(anc.id, anc.position, 'anchor', anc.label);
      }
    }
    for (const m of this.world.monoliths) {
      if (m.layerId === this.layerId) {
        addBlip(m.id, m.position, 'monolith', 'Veri-Enerji Anıtı');
      }
    }
    if (this.layerId === 4 && !this.world.kraken.defeated) {
      addBlip('kraken', this.world.kraken.root.position, 'kraken', 'The Abyssal Kraken');
    }

    this.sonarBlips = blips;
    this.emitSnapshot();
  }

  public strikeCavitationGlaive(): void {
    this.audio.init();
    if (this.glaiveCharge < 20) return;

    this.glaiveCharge = Math.max(0, this.glaiveCharge - 22);
    this.glaiveSwingAnim = 1.0;
    this.audio.playCavitationStrike();

    // Forward shockwave origin
    _forward.set(0, 0, -1).applyEuler(_euler.set(this.pitch, this.yaw, 0, 'YXZ'));
    const strikePos = this.playerPos.clone().addScaledVector(_forward, 4.5);
    this.spawnShockwave(strikePos, 0x38bdf8);

    // Damage nearby automatons, activate nearby monoliths, or strike Kraken
    let hitAny = false;
    for (const auto of this.world.automatons) {
      if (!auto.alive || auto.layerId !== this.layerId) continue;
      if (auto.mesh.position.distanceTo(strikePos) < 11.5) {
        const dmg = auto.armorStripped ? 65 : 40;
        auto.hp -= dmg;
        hitAny = true;
        if (auto.hp <= 0) {
          auto.alive = false;
          auto.mesh.visible = false;
          this.spawnShockwave(auto.mesh.position.clone(), 0xf59e0b);
          this.setNotice('Derinlik Otomatı kavitasyon şok dalgasıyla parçalandı!');
        } else {
          this.setNotice(`Kavitasyon Mızrağı isabeti! Otomat gövdesi: %${Math.max(0, auto.hp)}`);
        }
      }
    }

    for (const mono of this.world.monoliths) {
      if (mono.layerId === this.layerId && !mono.activated) {
        if (mono.position.distanceTo(this.playerPos) < 15) {
          this.activateMonolith(mono.id);
          hitAny = true;
        }
      }
    }

    if (this.layerId === 4 && !this.world.kraken.defeated) {
      const kDist = this.world.kraken.root.position.distanceTo(strikePos);
      if (kDist < 22) {
        this.damageKraken(18);
        hitAny = true;
      }
    }

    if (!hitAny) {
      this.setNotice('Süpersonik kavitasyon patlaması tetiklendi.');
    }
    this.emitSnapshot();
  }

  public fireHarpoon(): void {
    this.audio.init();
    this.harpoonRecoilAnim = 1.0;

    // Look for best forward target (automaton, anchor, kraken, or vent)
    _forward.set(0, 0, -1).applyEuler(_euler.set(this.pitch, this.yaw, 0, 'YXZ'));

    let bestPos: THREE.Vector3 | null = null;
    let bestLabel = '';
    let bestAutomaton = null as (typeof this.world.automatons)[number] | null;
    let isKraken = false;

    const consider = (pos: THREE.Vector3, maxDist: number) => {
      _v1.copy(pos).sub(this.playerPos);
      const d = _v1.length();
      if (d > maxDist || d < 2) return -1;
      const align = _v1.normalize().dot(_forward);
      return align > 0.68 ? align * 100 - d * 0.5 : -1;
    };

    let bestScore = 0;

    for (const a of this.world.automatons) {
      if (!a.alive || a.layerId !== this.layerId) continue;
      const sc = consider(a.mesh.position, 48);
      if (sc > bestScore) {
        bestScore = sc;
        bestPos = a.mesh.position.clone();
        bestLabel = 'Derinlik Otomatı';
        bestAutomaton = a;
        isKraken = false;
      }
    }

    for (const anc of this.world.anchors) {
      if (anc.layerId !== this.layerId) continue;
      const sc = consider(anc.position, 58);
      if (sc > bestScore) {
        bestScore = sc;
        bestPos = anc.position.clone();
        bestLabel = anc.label;
        bestAutomaton = null;
        isKraken = false;
      }
    }

    if (this.layerId === 4 && !this.world.kraken.defeated) {
      const sc = consider(this.world.kraken.root.position, 58);
      if (sc > bestScore) {
        bestScore = sc;
        bestPos = this.world.kraken.root.position.clone();
        bestLabel = 'The Abyssal Kraken';
        bestAutomaton = null;
        isKraken = true;
      }
    }

    if (bestPos) {
      if (bestAutomaton && !bestAutomaton.armorStripped) {
        bestAutomaton.armorStripped = true;
        bestAutomaton.hp = Math.max(10, bestAutomaton.hp - 25);
        this.setNotice('Pnömatik Zıpkın otomatın zırh plakasını söktü!');
      } else if (isKraken) {
        this.damageKraken(10);
      }
      this.fireHarpoonAtPoint(bestPos, bestLabel);
    } else {
      // Grapple forward into seabed ridge if aimed downward or forward
      const fallback = this.playerPos.clone().addScaledVector(_forward, 22);
      this.audio.playHarpoonLaunch(false);
      this.harpoonLatchPos.copy(fallback);
      this.harpoonActive = true;
      this.harpoonTimer = 0.45;
      this.setNotice('Pnömatik Zıpkın boşluğa fırlatıldı — halat geri sarılıyor.');
    }
    this.emitSnapshot();
  }

  private fireHarpoonAtPoint(point: THREE.Vector3, label: string): void {
    this.audio.playHarpoonLaunch(true);
    this.harpoonLatchPos.copy(point);
    this.harpoonActive = true;
    this.harpoonTimer = 0.95;

    // Pull velocity rapidly toward latch point
    _v1.copy(point).sub(this.playerPos).normalize();
    this.velocity.addScaledVector(_v1, 22);
    this.setNotice(`Pnömatik Zıpkın kilitlendi: ${label} — Vinç çekiliyor!`);
  }

  public activateArcWelder(): void {
    this.audio.init();
    this.cockpit.welderActive = true;
    this.welderTimer = 1.6;
    this.audio.playArcWelder();
    this.hullIntegrity = Math.min(100, this.hullIntegrity + 26);
    this.setNotice('Su Altı Ark Kaynak Tabancası ateşlendi — Gövde perçinleri onarılıyor.');
    this.emitSnapshot();
  }

  private damageKraken(dmg: number): void {
    const k = this.world.kraken;
    if (k.defeated) return;
    k.hp = Math.max(0, k.hp - dmg);
    k.hitFlash = 1.0;
    this.audio.playKrakenRoar();
    this.spawnShockwave(k.root.position.clone().add(new THREE.Vector3(0, 1, 4)), 0xf59e0b);
    if (k.hp <= 0) {
      k.defeated = true;
      this.setNotice('ZAFER! The Abyssal Kraken alt edildi — Hadal Çekirdeği Enes Öztürk hakimiyetinde!');
    } else {
      this.setNotice(`The Abyssal Kraken zayıf noktası sarsıldı! Kalan direnç: %${k.hp}`);
    }
  }

  private spawnShockwave(pos: THREE.Vector3, hex: number): void {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.9, 32),
      new THREE.MeshBasicMaterial({
        color: hex,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    ring.position.copy(pos);
    ring.lookAt(this.camera.position);
    this.scene.add(ring);
    this.shockwaves.push({ mesh: ring, age: 0, maxAge: 0.65 });
  }

  private setNotice(msg: string): void {
    this.eventNotice = msg;
    this.eventNoticeTimer = 4.2;
  }

  // Main Animation Loop ------------------------------------------------------
  private tick = (): void => {
    if (this.disposed) return;

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.getElapsedTime();

    this.updatePhysics(dt, elapsed);
    this.updateWorldActors(dt, elapsed);
    this.updateEffects(dt, elapsed);
    this.updateCamera(dt);

    this.renderer.render(this.scene, this.camera);

    if (elapsed - this.lastSnapshotEmit > 0.09) {
      this.lastSnapshotEmit = elapsed;
      this.emitSnapshot();
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updatePhysics(dt: number, elapsed: number): void {
    const layer = ABYSS_LAYERS[this.layerId];

    // Smooth atmospheric lighting & fog transitions across layers
    const fog = this.scene.fog as THREE.FogExp2;
    _targetFogColor.set(layer.fogColor);
    fog.color.lerp(_targetFogColor, 1 - Math.exp(-3.2 * dt));
    (this.scene.background as THREE.Color).copy(fog.color);
    fog.density = THREE.MathUtils.damp(fog.density, layer.fogDensity, 3.2, dt);

    _targetSkyColor.set(layer.ambientSky);
    _targetGroundColor.set(layer.ambientGround);
    _targetKeyColor.set(layer.keyLightColor);
    this.hemiLight.color.lerp(_targetSkyColor, 1 - Math.exp(-3 * dt));
    this.hemiLight.groundColor.lerp(_targetGroundColor, 1 - Math.exp(-3 * dt));
    this.keyLight.color.lerp(_targetKeyColor, 1 - Math.exp(-3 * dt));
    this.keyLight.intensity = THREE.MathUtils.damp(
      this.keyLight.intensity,
      layer.keyLightIntensity,
      3,
      dt
    );

    if (this.started) {
      // 6DOF underwater thrust & fluid drag
      const accel = this.cockpit.mainBreakerOn ? 24 : 11;
      _forward.set(0, 0, -1).applyEuler(_euler.set(this.pitch, this.yaw, 0, 'YXZ'));
      _right.set(1, 0, 0).applyEuler(_euler.set(0, this.yaw, 0, 'YXZ'));

      if (this.keys['KeyW'] || this.keys['ArrowUp']) {
        this.velocity.addScaledVector(_forward, accel * dt);
      }
      if (this.keys['KeyS'] || this.keys['ArrowDown']) {
        this.velocity.addScaledVector(_forward, -accel * 0.75 * dt);
      }
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
        this.velocity.addScaledVector(_right, -accel * 0.8 * dt);
      }
      if (this.keys['KeyD'] || this.keys['ArrowRight']) {
        this.velocity.addScaledVector(_right, accel * 0.8 * dt);
      }
      if (this.keys['Space']) {
        this.velocity.y += accel * 0.75 * dt;
      }
      if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) {
        this.velocity.y -= accel * 0.75 * dt;
      }
    }

    // Hydrodynamic water drag
    const drag = Math.exp(-2.6 * dt);
    this.velocity.multiplyScalar(drag);
    this.playerPos.addScaledVector(this.velocity, dt);

    // Keep player within navigable natural canyon perimeter of current stratum
    this.playerPos.x = THREE.MathUtils.clamp(this.playerPos.x, -48, 48);
    this.playerPos.z = THREE.MathUtils.clamp(this.playerPos.z, -48, 42);
    this.playerPos.y = THREE.MathUtils.clamp(
      this.playerPos.y,
      layer.yCenter - 10.5,
      layer.yCenter + 22
    );

    // Update Nautilus-TR & Diver transforms
    _euler.set(this.pitch * 0.65, this.yaw, -this.velocity.x * 0.012, 'YXZ');
    _quat.setFromEuler(_euler);

    this.nautilus.root.position.copy(this.playerPos);
    this.nautilus.root.quaternion.slerp(_quat, 1 - Math.exp(-8 * dt));
    this.nautilus.propellerGroup.rotation.z +=
      (2.5 + this.velocity.length() * 1.4) * dt * (this.cockpit.mainBreakerOn ? 1 : 0.2);

    // Animate cockpit levers based on system states
    this.nautilus.ballastValveWheel.rotation.z = THREE.MathUtils.damp(
      this.nautilus.ballastValveWheel.rotation.z,
      this.cockpit.ballastOpen ? Math.PI : 0,
      8,
      dt
    );
    this.nautilus.mainBreakerLever.rotation.x = THREE.MathUtils.damp(
      this.nautilus.mainBreakerLever.rotation.x,
      this.cockpit.mainBreakerOn ? 0 : 0.75,
      10,
      dt
    );
    this.nautilus.helmWheel.rotation.z = THREE.MathUtils.damp(
      this.nautilus.helmWheel.rotation.z,
      -this.velocity.x * 0.08,
      6,
      dt
    );

    // Floodlight toggles
    const lightPower = this.cockpit.floodlightsOn && this.cockpit.mainBreakerOn ? 1 : 0;
    this.nautilus.floodLightLeft.intensity = 58 * lightPower;
    this.nautilus.floodLightRight.intensity = 58 * lightPower;
    this.nautilus.floodBeamLeft.visible = lightPower > 0;
    this.nautilus.floodBeamRight.visible = lightPower > 0;

    // Diver Suit (EVA) transforms & animations
    this.diver.root.position.copy(this.playerPos);
    this.diver.root.quaternion.slerp(_quat, 1 - Math.exp(-10 * dt));
    this.diver.thrusterLeftSpin.rotation.z += 18 * dt;
    this.diver.thrusterRightSpin.rotation.z -= 18 * dt;

    if (this.glaiveSwingAnim > 0) {
      this.glaiveSwingAnim = Math.max(0, this.glaiveSwingAnim - dt * 3.4);
      const swing = Math.sin(this.glaiveSwingAnim * Math.PI);
      this.diver.rightArmGroup.rotation.x = -swing * 1.25;
      this.diver.rightArmGroup.rotation.y = swing * 0.65;
      this.diver.cavitationTubeMat.emissiveIntensity = 1.6 + swing * 4.0;
    } else {
      this.diver.rightArmGroup.rotation.x = Math.sin(elapsed * 2) * 0.04;
      this.diver.rightArmGroup.rotation.y = 0;
      this.diver.cavitationTubeMat.emissiveIntensity = 1.2 + (this.glaiveCharge / 100) * 0.8;
    }

    if (this.harpoonRecoilAnim > 0) {
      this.harpoonRecoilAnim = Math.max(0, this.harpoonRecoilAnim - dt * 3.5);
      this.diver.leftArmGroup.position.z = -0.08 + Math.sin(this.harpoonRecoilAnim * Math.PI) * 0.22;
    }

    // Hydrostatic pressure vs Hull Integrity & Heliox O2
    if (this.started) {
      const pressureStrain = this.layerId >= 3 && !this.cockpit.ballastOpen ? 0.65 : 0.12;
      if (this.viewMode !== 'eva') {
        this.hullIntegrity = Math.max(15, this.hullIntegrity - pressureStrain * dt);
      } else {
        this.helioxOxygen = Math.max(8, this.helioxOxygen - 0.55 * dt);
      }
      if (this.viewMode !== 'eva') {
        this.helioxOxygen = Math.min(100, this.helioxOxygen + 2.5 * dt);
      }
      this.glaiveCharge = Math.min(100, this.glaiveCharge + 16 * dt);
    }

    // Welder sparks
    if (this.welderTimer > 0) {
      this.welderTimer -= dt;
      this.nautilus.welderTorchGroup.visible = true;
      this.nautilus.welderSparkLight.intensity = 10 + Math.random() * 24;
      if (this.welderTimer <= 0) {
        this.cockpit.welderActive = false;
        this.nautilus.welderTorchGroup.visible = false;
        this.nautilus.welderSparkLight.intensity = 0;
      }
    }

    // Hydrophone ambience update
    this.audio.updateAmbience(
      layer.depthMeters,
      Math.min(1, this.velocity.length() / 18),
      this.viewMode === 'eva'
    );

    if (this.eventNoticeTimer > 0) {
      this.eventNoticeTimer -= dt;
      if (this.eventNoticeTimer <= 0) {
        this.eventNotice = null;
      }
    }
  }

  private updateWorldActors(dt: number, elapsed: number): void {
    this.world.causticUniforms.uTime.value = elapsed;

    // Spin Geothermal Turbines in Layer 4
    for (const tb of this.world.turbines) {
      tb.rotation.z += 0.9 * dt;
    }

    // Undulate Bioluminescent Jellyfish in Layer 3
    for (const jf of this.world.jellyfish) {
      jf.group.position.y = jf.baseY + Math.sin(elapsed * 1.15 + jf.phase) * 1.4;
      const pulse = 1 + Math.sin(elapsed * 2.4 + jf.phase) * 0.08;
      jf.group.scale.set(pulse, 1 / pulse, pulse);
      for (let t = 0; t < jf.tentacles.length; t++) {
        jf.tentacles[t].rotation.x = Math.sin(elapsed * 2.1 + jf.phase + t) * 0.22;
      }
    }

    // Shimmer Hydrothermal Vents & Check Scald Trap against Automatons
    for (const vent of this.world.vents) {
      const s = 0.85 + Math.sin(elapsed * 5.2 + vent.eruptingPhase) * 0.2;
      vent.plumeMesh.scale.set(s, 1 + (s - 0.85) * 0.6, s);
      if (this.layerId === 3) {
        for (const auto of this.world.automatons) {
          if (auto.alive && auto.layerId === 3 && auto.mesh.position.distanceTo(vent.position) < 7.5) {
            auto.hp -= 28 * dt;
            if (auto.hp <= 0) {
              auto.alive = false;
              auto.mesh.visible = false;
              this.spawnShockwave(auto.mesh.position.clone(), 0xf97316);
              this.setNotice('Hidrotermal baca kaynar akıntısı Derinlik Otomatını haşladı!');
            }
          }
        }
      }
    }

    // Clockwork Depth Automatons patrol & engage
    for (const auto of this.world.automatons) {
      if (!auto.alive) continue;
      auto.rotor.rotation.y += 6.5 * dt;
      if (auto.layerId !== this.layerId) continue;

      const distToPlayer = auto.mesh.position.distanceTo(this.playerPos);
      if (this.started && distToPlayer < 32) {
        _v1.copy(this.playerPos).sub(auto.mesh.position).normalize();
        if (distToPlayer > 7.5) {
          auto.mesh.position.addScaledVector(_v1, 3.6 * dt);
        } else {
          // Orbit & apply light hull pressure bump
          _v2.set(-_v1.z, 0, _v1.x);
          auto.mesh.position.addScaledVector(_v2, 4.2 * dt);
          this.hullIntegrity = Math.max(10, this.hullIntegrity - 2.4 * dt);
        }
        auto.mesh.lookAt(this.playerPos);
      } else {
        auto.mesh.position.x = auto.homePos.x + Math.cos(elapsed * 0.6 + auto.phase) * 6;
        auto.mesh.position.z = auto.homePos.z + Math.sin(elapsed * 0.6 + auto.phase) * 6;
      }
    }

    // The Abyssal Kraken Boss in Layer 5 (11,000m)
    const k = this.world.kraken;
    if (!k.defeated) {
      k.mantle.position.y = Math.sin(elapsed * 0.9) * 1.4;
      for (let t = 0; t < k.tentacles.length; t++) {
        const tent = k.tentacles[t];
        tent.rotation.x = Math.sin(elapsed * 1.5 + t * 0.9) * 0.28;
        tent.rotation.z = Math.cos(elapsed * 1.1 + t * 1.2) * 0.18;
      }
      if (k.hitFlash > 0) {
        k.hitFlash = Math.max(0, k.hitFlash - dt * 2.5);
        k.eyeMat.emissiveIntensity = 2.5 + k.hitFlash * 5;
      }
    } else {
      k.root.position.y = THREE.MathUtils.damp(k.root.position.y, ABYSS_LAYERS[4].yCenter - 26, 1.2, dt);
    }
  }

  private updateEffects(dt: number, elapsed: number): void {
    // Keep plankton centered smoothly around player
    this.planktonPoints.position.set(
      Math.round(this.playerPos.x / 20) * 20,
      this.playerPos.y,
      Math.round(this.playerPos.z / 20) * 20
    );
    this.planktonPoints.rotation.y = elapsed * 0.015;

    // Rising micro-bubbles around diver/sub
    for (let i = 0; i < this.bubblePositions.length; i += 3) {
      this.bubblePositions[i + 1] += dt * (1.8 + (i % 5) * 0.25);
      if (this.bubblePositions[i + 1] > 7) {
        this.bubblePositions[i] = (Math.random() - 0.5) * 2.8;
        this.bubblePositions[i + 1] = -0.8;
        this.bubblePositions[i + 2] = (Math.random() - 0.5) * 2.8;
      }
    }
    this.bubblePoints.geometry.attributes.position.needsUpdate = true;
    this.bubblePoints.position.copy(this.playerPos);

    // Expanding 3D Sonar Wave
    if (this.sonarPulseAge < 3.5) {
      this.sonarPulseAge += dt;
      const radius = 1 + this.sonarPulseAge * 26;
      this.sonarRing.scale.setScalar(radius);
      (this.sonarRing.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        0.55 * (1 - this.sonarPulseAge / 3.5)
      );
      for (const b of this.sonarBlips) {
        b.strength = Math.max(0.15, 1 - this.sonarPulseAge / 6);
      }
    }

    // Harpoon Cable Tether
    if (this.harpoonActive) {
      this.harpoonTimer -= dt;
      this.harpoonLine.visible = true;
      const posAttr = this.harpoonLine.geometry.attributes.position as THREE.BufferAttribute;
      _v1.copy(this.playerPos).add(new THREE.Vector3(-0.4, -0.15, 0));
      posAttr.setXYZ(0, _v1.x, _v1.y, _v1.z);
      posAttr.setXYZ(1, this.harpoonLatchPos.x, this.harpoonLatchPos.y, this.harpoonLatchPos.z);
      posAttr.needsUpdate = true;
      if (this.harpoonTimer <= 0) {
        this.harpoonActive = false;
        this.harpoonLine.visible = false;
      }
    }

    // Cavitation Shockwave Rings
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.age += dt;
      const t = sw.age / sw.maxAge;
      sw.mesh.scale.setScalar(1 + t * 9);
      (sw.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 * (1 - t));
      if (t >= 1) {
        this.scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        (sw.mesh.material as THREE.Material).dispose();
        this.shockwaves.splice(i, 1);
      }
    }
  }

  private updateCamera(dt: number): void {
    _forward.set(0, 0, -1).applyEuler(_euler.set(this.pitch, this.yaw, 0, 'YXZ'));

    if (!this.started) {
      // Slow cinematic hero orbit around Nautilus-TR on title screen
      const t = this.clock.getElapsedTime() * 0.22;
      _camTargetPos.set(
        this.playerPos.x + Math.sin(t) * 9.5,
        this.playerPos.y + 2.6,
        this.playerPos.z + Math.cos(t) * 9.5
      );
      _camLookAt.copy(this.playerPos);
      this.camera.position.copy(_camTargetPos);
      this.camera.lookAt(_camLookAt);
      return;
    }

    if (this.viewMode === 'cockpit') {
      // Inside Nautilus-TR behind spherical quartz dome & physical levers
      _v1.set(0, 0.28, -0.95).applyQuaternion(this.nautilus.root.quaternion);
      _camTargetPos.copy(this.nautilus.root.position).add(_v1);
      _camLookAt.copy(_camTargetPos).addScaledVector(_forward, 20);
      this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-16 * dt));
      this.smoothCamLook.lerp(_camLookAt, 1 - Math.exp(-16 * dt));
      this.camera.lookAt(this.smoothCamLook);
    } else if (this.viewMode === 'exterior') {
      // 3rd-person bathyscaphe chase camera
      _camTargetPos
        .copy(this.playerPos)
        .addScaledVector(_forward, -10.5)
        .add(new THREE.Vector3(0, 3.2, 0));
      _camLookAt.copy(this.playerPos).addScaledVector(_forward, 8);
      this.smoothCamPos.lerp(_camTargetPos, 1 - Math.exp(-7 * dt));
      this.smoothCamLook.lerp(_camLookAt, 1 - Math.exp(-10 * dt));
      this.camera.position.copy(this.smoothCamPos);
      this.camera.lookAt(this.smoothCamLook);
    } else {
      // 3rd-person Bathysphere Suit EVA camera
      _camTargetPos
        .copy(this.playerPos)
        .addScaledVector(_forward, -5.2)
        .add(new THREE.Vector3(0, 1.5, 0));
      _camLookAt.copy(this.playerPos).addScaledVector(_forward, 8);
      this.smoothCamPos.lerp(_camTargetPos, 1 - Math.exp(-9 * dt));
      this.smoothCamLook.lerp(_camLookAt, 1 - Math.exp(-12 * dt));
      this.camera.position.copy(this.smoothCamPos);
      this.camera.lookAt(this.smoothCamLook);
    }
  }

  private emitSnapshot(): void {
    const layer = ABYSS_LAYERS[this.layerId];
    const verticalOffset = Math.round(layer.yCenter - this.playerPos.y);
    const liveDepth = Math.max(40, layer.depthMeters + verticalOffset);
    const livePressure = Number((1 + liveDepth / 10).toFixed(1));

    this.onStateUpdate({
      started: this.started,
      layerId: this.layerId,
      viewMode: this.viewMode,
      depthMeters: liveDepth,
      pressureBar: livePressure,
      temperatureC: layer.temperatureC,
      hullIntegrity: Math.round(this.hullIntegrity),
      helioxOxygen: Math.round(this.helioxOxygen),
      glaiveCharge: Math.round(this.glaiveCharge),
      speedKnots: Number((this.velocity.length() * 1.94).toFixed(1)),
      krakenHealth: this.world.kraken.hp,
      krakenDefeated: this.world.kraken.defeated,
      activeAutomatonsRemaining: this.world.automatons.filter((a) => a.alive).length,
      monolithsActivated: this.world.monoliths.filter((m) => m.activated).length,
      totalMonoliths: this.world.monoliths.length,
      cockpit: { ...this.cockpit },
      hoveredInteractable: this.hoveredInteractable,
      sonarPulseAge: this.sonarPulseAge,
      sonarBlips: this.sonarBlips,
      harpoonLatched: this.harpoonActive,
      audioMuted: this.audio.isMuted(),
      eventNotice: this.eventNotice,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('contextmenu', this.handleContextMenu);
    canvas.removeEventListener('webglcontextlost', this.handleContextLost);

    this.audio.dispose();
    this.textures.dispose();
    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });
    this.renderer.dispose();
    if (canvas.parentElement === this.container) {
      this.container.removeChild(canvas);
    }
  }
}
