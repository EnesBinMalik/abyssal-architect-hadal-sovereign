import { useCallback, useEffect, useRef, useState } from 'react';
import { AbyssalViewport } from './components/AbyssalViewport';
import { ControlDock } from './components/ControlDock';
import { DiegeticInstruments } from './components/DiegeticInstruments';
import { TitleIntroOverlay } from './components/TitleIntroOverlay';
import { AbyssEngine } from './engine/AbyssEngine';
import { DepthLayerId, GameStateSnapshot, ViewMode } from './types/abyss';

const INITIAL_STATE: GameStateSnapshot = {
  started: false,
  layerId: 0,
  viewMode: 'cockpit',
  depthMeters: 200,
  pressureBar: 21,
  temperatureC: 16.4,
  hullIntegrity: 100,
  helioxOxygen: 100,
  glaiveCharge: 100,
  speedKnots: 0,
  krakenHealth: 100,
  krakenDefeated: false,
  activeAutomatonsRemaining: 3,
  monolithsActivated: 0,
  totalMonoliths: 5,
  cockpit: {
    ballastOpen: false,
    mainBreakerOn: true,
    floodlightsOn: true,
    welderActive: false,
  },
  hoveredInteractable: null,
  sonarPulseAge: 99,
  sonarBlips: [],
  harpoonLatched: false,
  audioMuted: false,
  eventNotice: null,
};

export default function App() {
  const engineRef = useRef<AbyssEngine | null>(null);
  const [gameState, setGameState] = useState<GameStateSnapshot>(INITIAL_STATE);
  const [hudVisible, setHudVisible] = useState(true);

  const handleEngineReady = useCallback((engine: AbyssEngine) => {
    engineRef.current = engine;
  }, []);

  const handleStateUpdate = useCallback((snapshot: GameStateSnapshot) => {
    setGameState(snapshot);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyH') {
        setHudVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#02060b]">
      <AbyssalViewport
        onEngineReady={handleEngineReady}
        onStateUpdate={handleStateUpdate}
      />

      <DiegeticInstruments state={gameState} hudVisible={hudVisible} />

      <ControlDock
        state={gameState}
        hudVisible={hudVisible}
        onToggleHud={() => setHudVisible((v) => !v)}
        onSelectLayer={(id: DepthLayerId) => engineRef.current?.diveToLayer(id)}
        onSelectView={(mode: ViewMode) => engineRef.current?.setViewMode(mode)}
        onSonarPing={() => engineRef.current?.triggerSonarPing()}
        onCavitationStrike={() => engineRef.current?.strikeCavitationGlaive()}
        onFireHarpoon={() => engineRef.current?.fireHarpoon()}
        onArcWelder={() => engineRef.current?.activateArcWelder()}
        onToggleMute={() => engineRef.current?.toggleMute()}
      />

      {!gameState.started && (
        <TitleIntroOverlay onStart={() => engineRef.current?.startExperience()} />
      )}
    </main>
  );
}
