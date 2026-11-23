export type DepthLayerId = 0 | 1 | 2 | 3 | 4;

export type ViewMode = 'cockpit' | 'exterior' | 'eva';

export interface AbyssLayerConfig {
  id: DepthLayerId;
  name: string;
  englishName: string;
  depthMeters: number;
  pressureBar: number;
  temperatureC: number;
  fogColor: string;
  fogDensity: number;
  ambientSky: string;
  ambientGround: string;
  keyLightColor: string;
  keyLightIntensity: number;
  accentColor: string;
  description: string;
  yCenter: number;
}

export const ABYSS_LAYERS: AbyssLayerConfig[] = [
  {
    id: 0,
    name: 'Batık Mermer Tapınaklar ve Mercan Ormanı',
    englishName: 'The Sunlit Ruins',
    depthMeters: 200,
    pressureBar: 21,
    temperatureC: 16.4,
    fogColor: '#083a52',
    fogDensity: 0.014,
    ambientSky: '#3ba6c9',
    ambientGround: '#0a2230',
    keyLightColor: '#a6ecff',
    keyLightIntensity: 2.3,
    accentColor: '#38bdf8',
    description:
      'Su yüzeyinden süzülen kırılmalı güneş ışınlarının antik mermer sütunlar ve mercanlar üzerinde dans ettiği üst katman.',
    yCenter: 0,
  },
  {
    id: 1,
    name: 'Alacakaranlık Batık Tersanesi',
    englishName: 'The Twilight Graveyard',
    depthMeters: 1500,
    pressureBar: 151,
    temperatureC: 4.8,
    fogColor: '#061a2e',
    fogDensity: 0.022,
    ambientSky: '#1b496b',
    ambientGround: '#040c14',
    keyLightColor: '#6999b8',
    keyLightIntensity: 1.05,
    accentColor: '#d97706',
    description:
      'Paslı perçinli savaş gemisi gövdeleri, sarkan çapa zincirleri ve devriye gezen mekanik derinlik otomatları.',
    yCenter: -160,
  },
  {
    id: 2,
    name: 'Biyoluminesans Kristal Mağaraları',
    englishName: 'The Luminous Abyss',
    depthMeters: 4000,
    pressureBar: 401,
    temperatureC: 2.1,
    fogColor: '#030b1c',
    fogDensity: 0.024,
    ambientSky: '#103b66',
    ambientGround: '#02050d',
    keyLightColor: '#2de2e6',
    keyLightIntensity: 0.65,
    accentColor: '#2dd4bf',
    description:
      'Güneş ışığının tükendiği, parlayan kuvars kristalleri ve elektrik yüklü denizanası kolonilerinin aydınlattığı mağara ağı.',
    yCenter: -320,
  },
  {
    id: 3,
    name: 'Hidrotermal Bacalar ve Volkanik Dökümhane',
    englishName: 'The Thermal Trenches',
    depthMeters: 8000,
    pressureBar: 801,
    temperatureC: 342.0,
    fogColor: '#120809',
    fogDensity: 0.025,
    ambientSky: '#3b1512',
    ambientGround: '#080304',
    keyLightColor: '#ff6b35',
    keyLightIntensity: 0.9,
    accentColor: '#f97316',
    description:
      'Siyah duman püskürten kaynar volkanik bacalar ve jeotermal enerjiyle çalışan kadim pirinç türbinler.',
    yCenter: -480,
  },
  {
    id: 4,
    name: 'Hadal Çekirdeği ve Dev Leviathan Tapınağı',
    englishName: 'The Hadal Sanctum',
    depthMeters: 11000,
    pressureBar: 1101,
    temperatureC: 1.4,
    fogColor: '#020408',
    fogDensity: 0.023,
    ambientSky: '#112238',
    ambientGround: '#010204',
    keyLightColor: '#e0a96d',
    keyLightIntensity: 0.55,
    accentColor: '#f59e0b',
    description:
      'Santimetrekareye bir tonu aşan ezici basınçta, antik veri-enerji tapınağını koruyan mekanik-biyolojik dev The Abyssal Kraken.',
    yCenter: -640,
  },
];

export interface SonarBlip {
  id: string;
  angleRad: number;
  distanceNorm: number; // 0..1
  kind: 'hostile' | 'anchor' | 'vent' | 'monolith' | 'kraken';
  label: string;
  strength: number; // decays after ping
}

export interface CockpitSystems {
  ballastOpen: boolean;
  mainBreakerOn: boolean;
  floodlightsOn: boolean;
  welderActive: boolean;
}

export interface GameStateSnapshot {
  started: boolean;
  layerId: DepthLayerId;
  viewMode: ViewMode;
  depthMeters: number;
  pressureBar: number;
  temperatureC: number;
  hullIntegrity: number; // 0..100
  helioxOxygen: number; // 0..100
  glaiveCharge: number; // 0..100
  speedKnots: number;
  krakenHealth: number; // 0..100
  krakenDefeated: boolean;
  activeAutomatonsRemaining: number;
  monolithsActivated: number;
  totalMonoliths: number;
  cockpit: CockpitSystems;
  hoveredInteractable: string | null;
  sonarPulseAge: number; // seconds since last ping
  sonarBlips: SonarBlip[];
  harpoonLatched: boolean;
  audioMuted: boolean;
  eventNotice: string | null;
}
