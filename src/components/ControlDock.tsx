import {
  Anchor,
  ChevronDown,
  ChevronUp,
  Flame,
  Radio,
  Sword,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ABYSS_LAYERS, DepthLayerId, GameStateSnapshot, ViewMode } from '../types/abyss';

interface ControlDockProps {
  state: GameStateSnapshot;
  hudVisible: boolean;
  onToggleHud: () => void;
  onSelectLayer: (id: DepthLayerId) => void;
  onSelectView: (mode: ViewMode) => void;
  onSonarPing: () => void;
  onCavitationStrike: () => void;
  onFireHarpoon: () => void;
  onArcWelder: () => void;
  onToggleMute: () => void;
}

export function ControlDock({
  state,
  hudVisible,
  onToggleHud,
  onSelectLayer,
  onSelectView,
  onSonarPing,
  onCavitationStrike,
  onFireHarpoon,
  onArcWelder,
  onToggleMute,
}: ControlDockProps) {
  if (!state.started) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center max-w-[94vw]">
      {/* Collapse / Cinema Mode Toggle */}
      <button
        type="button"
        onClick={onToggleHud}
        className="mb-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#08111a]/92 border border-amber-500/30 text-[11px] font-medium text-slate-200 hover:text-amber-200 hover:border-amber-400/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
      >
        {hudVisible ? (
          <>
            <ChevronDown className="w-3.5 h-3.5" />
            <span>Arayüzü Gizle [H]</span>
          </>
        ) : (
          <>
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Kontrolleri Göster [H]</span>
          </>
        )}
      </button>

      {/* Collapsible Unified Bottom Control Dock */}
      {hudVisible && (
        <div className="flex flex-col gap-2 px-3 py-2.5 rounded-lg bg-[#071018]/94 border border-[#b4833e]/35 shadow-2xl">
          {/* Row 1: 5 Handcrafted Depth Strata + View Mode */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="flex items-center gap-1 bg-[#0c1926] p-1 rounded border border-slate-800">
              {ABYSS_LAYERS.map((layer) => {
                const active = state.layerId === layer.id;
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => onSelectLayer(layer.id)}
                    title={layer.name}
                    className={`px-2.5 py-1 rounded text-xs font-mono-tabular transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-amber-600/90 text-white font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    {layer.depthMeters.toLocaleString('tr-TR')}m
                  </button>
                );
              })}
            </div>

            <div className="h-5 w-px bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-1 bg-[#0c1926] p-1 rounded border border-slate-800">
              {(
                [
                  ['cockpit', 'Kokpit'],
                  ['exterior', 'Nautilus-TR'],
                  ['eva', 'Dalış Zırhı'],
                ] as [ViewMode, string][]
              ).map(([mode, label]) => {
                const active = state.viewMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onSelectView(mode)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-sky-700/90 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2: Diegetic Engineering & Kinetic Combat Actions */}
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={onSonarPing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-950/90 border border-emerald-500/40 text-xs font-medium text-emerald-200 hover:bg-emerald-900/90 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Sonar [F]</span>
            </button>

            <button
              type="button"
              onClick={onCavitationStrike}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-950/90 border border-sky-500/40 text-xs font-medium text-sky-200 hover:bg-sky-900/90 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Sword className="w-3.5 h-3.5" />
              <span>Kavitasyon Mızrağı [Q]</span>
            </button>

            <button
              type="button"
              onClick={onFireHarpoon}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-950/90 border border-amber-500/40 text-xs font-medium text-amber-200 hover:bg-amber-900/90 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Anchor className="w-3.5 h-3.5" />
              <span>Pnömatik Zıpkın [E]</span>
            </button>

            <button
              type="button"
              onClick={onArcWelder}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 border border-slate-600/60 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Flame className="w-3.5 h-3.5 text-sky-400" />
              <span>Ark Kaynağı [R]</span>
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={state.audioMuted ? 'Sesi Aç' : 'Sesi Kapat'}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {state.audioMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>Hidrofon</span>
            </button>
          </div>

          <div className="text-center text-[10px] text-slate-400 font-mono-tabular">
            WASD: İtiş · Boşluk/Shift: Yüksel/Alçal · Fare Sürükle: Bakış · Tıkla: Kokpit Vanası / Anıt
          </div>
        </div>
      )}
    </div>
  );
}
