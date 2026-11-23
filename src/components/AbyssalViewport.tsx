import { useEffect, useRef } from 'react';
import { AbyssEngine } from '../engine/AbyssEngine';
import { GameStateSnapshot } from '../types/abyss';

interface AbyssalViewportProps {
  onEngineReady: (engine: AbyssEngine) => void;
  onStateUpdate: (snapshot: GameStateSnapshot) => void;
}

export function AbyssalViewport({
  onEngineReady,
  onStateUpdate,
}: AbyssalViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const onEngineReadyRef = useRef(onEngineReady);
  const onStateUpdateRef = useRef(onStateUpdate);

  onEngineReadyRef.current = onEngineReady;
  onStateUpdateRef.current = onStateUpdate;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new AbyssEngine(container, (snap) => {
      onStateUpdateRef.current(snap);
    });
    onEngineReadyRef.current(engine);

    return () => {
      engine.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 w-full h-full overflow-hidden bg-[#02060b]"
      aria-label="3D Derin Okyanus Sahnesi"
    />
  );
}
