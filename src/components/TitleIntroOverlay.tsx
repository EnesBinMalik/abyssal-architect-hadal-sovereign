import { Compass } from 'lucide-react';
import { ABYSS_LAYERS } from '../types/abyss';

interface TitleIntroOverlayProps {
  onStart: () => void;
}

export function TitleIntroOverlay({ onStart }: TitleIntroOverlayProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-6 bg-[#02060b]/72">
      <div className="w-full max-w-2xl rounded-lg bg-[#071019]/96 border border-[#b4833e]/45 p-7 md:p-9 shadow-2xl">
        <div className="flex items-center gap-2 text-xs text-amber-300/90 font-mono-tabular mb-2">
          <span>ENES ÖZTÜRK İMZALI DERİN OKYANUS MİMARİSİ</span>
          <span aria-hidden="true">·</span>
          <span>200m – 11.000m</span>
        </div>

        <h1 className="font-display text-3xl md:text-4xl font-bold text-slate-100 tracking-wide leading-tight [text-wrap:balance]">
          Abyssal Architect: The Hadal Sovereign
        </h1>

        <p className="mt-3 text-sm md:text-base text-slate-300 leading-relaxed max-w-xl">
          Zanaatkâr batiskafınız <strong className="text-amber-200 font-semibold">Nautilus-TR</strong> ve
          bakır-titanyum basınç zırhınızla 11.000 metrelik Hadal Çukuru’na inin. Kokpit vanalarını
          elle çevirin, akustik sonar dalgaları gönderin, Kavitasyon Mızrağı ve Pnömatik Zıpkın ile
          derinlik otomatlarını parçalayın.
        </p>

        {/* 5 Handcrafted Strata Compact Index */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-t border-b border-slate-800 py-4">
          {ABYSS_LAYERS.map((layer) => (
            <div key={layer.id} className="flex items-baseline gap-2.5 text-xs">
              <span className="font-mono-tabular text-amber-300 shrink-0">
                {layer.depthMeters.toLocaleString('tr-TR')}m
              </span>
              <span className="text-slate-200 truncate">{layer.name}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            Fiziksel Kokpit · Bourdon Basınç Kadranı · Katot Işınlı Sonar · Hidrofon Ses
          </div>
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Compass className="w-4 h-4" />
            <span>Dalışa Başla</span>
          </button>
        </div>
      </div>
    </div>
  );
}
