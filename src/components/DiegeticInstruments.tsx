import { ABYSS_LAYERS, GameStateSnapshot } from '../types/abyss';

interface DiegeticInstrumentsProps {
  state: GameStateSnapshot;
  hudVisible: boolean;
}

export function DiegeticInstruments({ state, hudVisible }: DiegeticInstrumentsProps) {
  if (!state.started) return null;

  const layer = ABYSS_LAYERS[state.layerId];
  // Bourdon tube needle rotation (-125 deg at 0 bar to +125 deg at 1200 bar)
  const pressureRatio = Math.min(1, state.pressureBar / 1200);
  const needleAngle = -125 + pressureRatio * 250;

  // Visor condensation opacity rises as Heliox O2 drops or in deep cold water
  const fogOpacity =
    state.viewMode === 'eva'
      ? Math.max(0.08, (100 - state.helioxOxygen) / 140)
      : Math.max(0.04, (100 - state.hullIntegrity) / 180);

  // Pressure micro-crack visibility below 4000m when hull integrity drops
  const showCracks = state.hullIntegrity < 72 || state.layerId >= 3;

  // Sonar sweep angle
  const sweepAngleDeg = (state.sonarPulseAge * 180) % 360;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
      {/* Diegetic Quartz Visor Condensation & Brass Frame Vignette */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background:
            state.viewMode === 'eva'
              ? `radial-gradient(circle at 50% 50%, transparent 52%, rgba(8, 22, 34, ${0.42 + fogOpacity}) 88%, rgba(3, 8, 14, 0.88) 100%)`
              : state.viewMode === 'cockpit'
                ? `radial-gradient(circle at 50% 48%, transparent 58%, rgba(4, 10, 18, ${0.35 + fogOpacity}) 92%, rgba(2, 5, 10, 0.82) 100%)`
                : 'none',
        }}
      />

      {/* Subtle Quartz Micro-Crack Hairlines under extreme Hadal stress */}
      {showCracks && state.viewMode !== 'exterior' && (
        <svg
          className="absolute inset-0 w-full h-full opacity-25"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M 0 110 L 68 142 L 104 128 L 146 164 M 1440 160 L 1365 188 L 1320 174 L 1285 212"
            fill="none"
            stroke="#bae6fd"
            strokeWidth="1.2"
          />
          {state.hullIntegrity < 55 && (
            <path
              d="M 42 820 L 112 778 L 148 792 L 195 752"
              fill="none"
              stroke="#fda4af"
              strokeWidth="1.4"
            />
          )}
        </svg>
      )}

      {/* Center Minimal Reticle & Contextual Interactable Prompt */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
        <div className="w-5 h-5 rounded-full border border-amber-200/45 flex items-center justify-center">
          <div className="w-1 h-1 rounded-full bg-amber-300/80" />
        </div>
        {state.hoveredInteractable && (
          <div className="px-3 py-1 bg-[#071018]/90 border border-amber-500/40 rounded text-xs text-amber-100 whitespace-nowrap">
            {state.hoveredInteractable}
          </div>
        )}
      </div>

      {/* Top-Left Minimal Stratum Title (No clutter, clean editorial typography) */}
      {hudVisible && (
        <div className="absolute top-5 left-6 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[11px] tracking-wider text-amber-300/85 font-mono-tabular">
            <span>KATMAN {state.layerId + 1} / 5</span>
            <span aria-hidden="true">·</span>
            <span>{state.depthMeters.toLocaleString('tr-TR')} m</span>
            <span aria-hidden="true">·</span>
            <span>{state.temperatureC.toFixed(1)} °C</span>
          </div>
          <h2 className="font-display text-lg md:text-xl font-semibold text-slate-100 tracking-wide">
            {layer.name}
          </h2>
          <div className="flex items-center gap-3 text-xs text-slate-300/80 font-mono-tabular">
            <span>Anıtlar: {state.monolithsActivated}/{state.totalMonoliths}</span>
            <span aria-hidden="true">·</span>
            <span>Otomatlar: {state.activeAutomatonsRemaining}</span>
            {state.layerId === 4 && (
              <>
                <span aria-hidden="true">·</span>
                <span className={state.krakenDefeated ? 'text-emerald-300' : 'text-amber-300'}>
                  {state.krakenDefeated
                    ? 'Abyssal Kraken: Yenildi'
                    : `Abyssal Kraken: %${state.krakenHealth}`}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Top-Center Transient Event Notice */}
      {state.eventNotice && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-[#07111a]/92 border border-amber-500/35 rounded text-xs text-amber-100 whitespace-nowrap">
          {state.eventNotice}
        </div>
      )}

      {/* Bottom-Left Physical Bourdon Tube Brass Pressure Gauge */}
      {hudVisible && (
        <div className="hidden sm:flex absolute bottom-6 left-6 items-end gap-3">
          <div className="relative w-32 h-32 rounded-full bg-[#09121a]/95 border-2 border-[#b4833e] shadow-lg flex items-center justify-center">
            <svg viewBox="0 0 120 120" className="w-full h-full" aria-label="Bourdon Basınç Kadranı">
              {/* Brass outer tick marks */}
              {Array.from({ length: 13 }).map((_, idx) => {
                const a = ((-125 + idx * (250 / 12)) * Math.PI) / 180 - Math.PI / 2;
                const x1 = 60 + Math.cos(a) * 44;
                const y1 = 60 + Math.sin(a) * 44;
                const x2 = 60 + Math.cos(a) * 51;
                const y2 = 60 + Math.sin(a) * 51;
                return (
                  <line
                    key={idx}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={idx >= 9 ? '#f97316' : '#d4a359'}
                    strokeWidth={idx % 3 === 0 ? '2' : '1'}
                  />
                );
              })}

              {/* Bourdon C-Tube curved brass arc */}
              <path
                d="M 32 76 A 32 32 0 1 1 88 76"
                fill="none"
                stroke="#6e532b"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Oscillating Brass Needle */}
              <g transform={`rotate(${needleAngle} 60 60)`}>
                <polygon points="58.5,64 60,18 61.5,64" fill="#f59e0b" />
                <circle cx="60" cy="60" r="5" fill="#d4a359" stroke="#09121a" strokeWidth="1.5" />
              </g>
            </svg>
            <div className="absolute bottom-3 text-center">
              <div className="font-mono-tabular text-[11px] font-semibold text-amber-200 leading-none">
                {state.pressureBar.toFixed(0)} BAR
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">BOURDON</div>
            </div>
          </div>

          {/* Physical Hull & Heliox Tubes */}
          <div className="flex flex-col gap-1.5 bg-[#09121a]/92 border border-[#b4833e]/40 rounded px-3 py-2 text-[11px] font-mono-tabular">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Gövde</span>
              <span className={state.hullIntegrity < 45 ? 'text-rose-400' : 'text-amber-200'}>
                %{state.hullIntegrity}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Heliox</span>
              <span className={state.helioxOxygen < 35 ? 'text-rose-400' : 'text-cyan-200'}>
                %{state.helioxOxygen}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Hız</span>
              <span className="text-slate-200">{state.speedKnots.toFixed(1)} kt</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom-Right Mechanical Cathode-Ray Green Phosphor Sonar Screen */}
      {hudVisible && (
        <div className="hidden sm:flex absolute bottom-6 right-6 flex-col items-center gap-1.5">
          <div className="relative w-32 h-32 rounded-full bg-[#02140e]/95 border-2 border-[#b4833e] shadow-lg overflow-hidden">
            <svg viewBox="0 0 120 120" className="w-full h-full" aria-label="Katot Işınlı Sonar">
              <circle cx="60" cy="60" r="54" fill="#02140e" />
              <circle cx="60" cy="60" r="18" fill="none" stroke="#10b981" strokeOpacity="0.28" strokeWidth="0.8" />
              <circle cx="60" cy="60" r="36" fill="none" stroke="#10b981" strokeOpacity="0.28" strokeWidth="0.8" />
              <circle cx="60" cy="60" r="53" fill="none" stroke="#10b981" strokeOpacity="0.35" strokeWidth="0.8" />
              <line x1="60" y1="6" x2="60" y2="114" stroke="#10b981" strokeOpacity="0.22" strokeWidth="0.8" />
              <line x1="6" y1="60" x2="114" y2="60" stroke="#10b981" strokeOpacity="0.22" strokeWidth="0.8" />

              {/* Expanding ping ring */}
              {state.sonarPulseAge < 2.2 && (
                <circle
                  cx="60"
                  cy="60"
                  r={Math.min(54, (state.sonarPulseAge / 2.2) * 54)}
                  fill="none"
                  stroke="#34d399"
                  strokeOpacity={Math.max(0, 0.85 * (1 - state.sonarPulseAge / 2.2))}
                  strokeWidth="1.5"
                />
              )}

              {/* Rotating phosphor sweep line */}
              <g transform={`rotate(${sweepAngleDeg} 60 60)`}>
                <line
                  x1="60"
                  y1="60"
                  x2="60"
                  y2="8"
                  stroke="#34d399"
                  strokeOpacity="0.65"
                  strokeWidth="1.2"
                />
              </g>

              {/* Real detected 3D world blips */}
              {state.sonarBlips.map((b) => {
                const r = b.distanceNorm * 50;
                const bx = 60 + Math.sin(b.angleRad) * r;
                const by = 60 - Math.cos(b.angleRad) * r;
                const fill =
                  b.kind === 'hostile' || b.kind === 'kraken'
                    ? '#fb7185'
                    : b.kind === 'vent'
                      ? '#fb923c'
                      : b.kind === 'monolith'
                        ? '#38bdf8'
                        : '#34d399';
                return (
                  <circle
                    key={b.id}
                    cx={bx}
                    cy={by}
                    r={b.kind === 'kraken' ? 4.2 : 2.6}
                    fill={fill}
                    fillOpacity={b.strength}
                  />
                );
              })}

              {/* Center vessel dot */}
              <circle cx="60" cy="60" r="2.2" fill="#a7f3d0" />
            </svg>
          </div>
          <div className="font-mono-tabular text-[10px] text-emerald-300/85 tracking-wider">
            CRT SONAR · {state.sonarBlips.length} EKO
          </div>
        </div>
      )}
    </div>
  );
}
