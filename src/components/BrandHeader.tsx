import React, { useState } from 'react';
import { User } from '../types';
import { RefreshCw, ShieldAlert, Users, Layers, Award, CheckCircle2 } from 'lucide-react';

interface BrandHeaderProps {
  currentUser: User | null;
  personas: User[];
  onSelectPersona: (user: User) => void;
  onResetDemo: () => void;
  isResetting: boolean;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({
  currentUser,
  personas,
  onSelectPersona,
  onResetDemo,
  isResetting
}) => {
  const [logoVariant, setLogoVariant] = useState<'horizontal' | 'stacked' | 'icon' | 'monochrome'>('horizontal');
  const [showBrandModal, setShowBrandModal] = useState(false);

  // Stylized multi-producer linked-harvest SVG symbol (avoiding leaf & circuit trope)
  const renderHarvestGlyph = (colorClass = 'text-emerald-700') => (
    <svg className={`w-8 h-8 ${colorClass}`} viewBox="0 0 36 36" fill="currentColor">
      {/* 3 Interlocking grain sheaves / multi-producer nodes */}
      <circle cx="18" cy="8" r="4.5" fill="currentColor" fillOpacity="0.9" />
      <circle cx="9.5" cy="24" r="4.5" fill="currentColor" fillOpacity="0.85" />
      <circle cx="26.5" cy="24" r="4.5" fill="currentColor" fillOpacity="0.85" />
      {/* Central coordinating node */}
      <circle cx="18" cy="19" r="3" fill="#ffffff" stroke="currentColor" strokeWidth="2" />
      {/* Interconnecting logistical stems */}
      <path d="M18 12.5 V16 M12.5 21.5 L15.5 19.5 M23.5 21.5 L20.5 19.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );

  return (
    <header className="border-b border-stone-200 bg-white sticky top-0 z-50 shadow-sm">
      {/* Mandatory Brand Status & Legal Disclaimer Banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-900 flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Brand Status:</strong> Provisional prototype name only. A Sri Lankan agricultural marketplace already operates as{' '}
            <a href="https://asvanu.lk/" target="_blank" rel="noreferrer" className="underline font-bold text-amber-950 hover:text-amber-800">
              Asvanu.lk (අස්වනු.lk)
            </a>. Independent NIPO trademark clearance review is mandatory before any public launch.
          </span>
        </div>
        <button
          onClick={() => setShowBrandModal(true)}
          className="text-amber-800 underline hover:text-amber-950 font-semibold ml-4 shrink-0 text-xs"
        >
          View Evidence & Typographic Lockup
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Typographic Lockup Variants */}
        <div className="flex items-center gap-4">
          {logoVariant === 'icon' && (
            <div className="flex items-center gap-2" title="Aswanu (Icon-only variant)">
              {renderHarvestGlyph('text-emerald-800')}
              <span className="text-xs font-mono bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-300">
                Icon Only
              </span>
            </div>
          )}

          {logoVariant === 'monochrome' && (
            <div className="flex items-center gap-3">
              {renderHarvestGlyph('text-stone-900')}
              <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold tracking-tight text-stone-900 font-serif">Aswanu</span>
                  <span className="text-sm font-medium text-stone-700">| අස්වනු</span>
                  <span className="text-sm font-medium text-stone-700">| அறுவடை</span>
                </div>
                <span className="text-[10px] text-stone-500 uppercase tracking-widest font-mono">Monochrome High-Contrast</span>
              </div>
            </div>
          )}

          {logoVariant === 'stacked' && (
            <div className="flex items-center gap-3">
              {renderHarvestGlyph('text-emerald-700')}
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tight text-emerald-950 font-serif leading-none">Aswanu</span>
                <div className="flex items-center gap-2 mt-0.5 text-xs font-medium text-emerald-800">
                  <span title="Sinhala: Aswanu">අස්වනු</span>
                  <span className="text-stone-300">•</span>
                  <span title="Tamil: Harvest concept">அறுவடை</span>
                </div>
              </div>
            </div>
          )}

          {logoVariant === 'horizontal' && (
            <div className="flex items-center gap-3">
              {renderHarvestGlyph('text-emerald-700')}
              <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black tracking-tight text-emerald-950 font-serif">Aswanu</span>
                  <span className="text-base font-semibold text-emerald-800" title="Sinhala: Aswanu">අස්වනු</span>
                  <span className="text-base font-semibold text-emerald-700" title="Tamil: Harvest concept translation">அறுவடை</span>
                </div>
                <span className="text-[10px] text-stone-500 font-medium tracking-tight">
                  Multi-Producer Agricultural Procurement & Landed Cost Coordination
                </span>
              </div>
            </div>
          )}

          {/* Lockup switcher pill */}
          <div className="hidden md:flex items-center gap-1 bg-stone-100 p-1 rounded-lg border border-stone-200 text-xs">
            <button
              onClick={() => setLogoVariant('horizontal')}
              className={`px-2 py-0.5 rounded font-medium ${logoVariant === 'horizontal' ? 'bg-white text-emerald-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
            >
              Horizontal
            </button>
            <button
              onClick={() => setLogoVariant('stacked')}
              className={`px-2 py-0.5 rounded font-medium ${logoVariant === 'stacked' ? 'bg-white text-emerald-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
            >
              Stacked
            </button>
            <button
              onClick={() => setLogoVariant('monochrome')}
              className={`px-2 py-0.5 rounded font-medium ${logoVariant === 'monochrome' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
            >
              Monochrome
            </button>
            <button
              onClick={() => setLogoVariant('icon')}
              className={`px-2 py-0.5 rounded font-medium ${logoVariant === 'icon' ? 'bg-white text-emerald-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
            >
              Icon
            </button>
          </div>
        </div>

        {/* Persona Switcher & Reset Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5">
            <Users className="w-4 h-4 text-stone-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Active Persona</span>
              <select
                value={currentUser?.id || ''}
                onChange={(e) => {
                  const selected = personas.find(p => p.id === e.target.value);
                  if (selected) onSelectPersona(selected);
                }}
                className="text-xs font-semibold text-stone-900 bg-transparent border-0 p-0 focus:ring-0 cursor-pointer"
              >
                <optgroup label="Buyers">
                  {personas.filter(p => p.role === 'buyer').map(p => (
                    <option key={p.id} value={p.id}>
                      Buyer: {p.name} ({p.organization})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Producers">
                  {personas.filter(p => p.role === 'producer').map(p => (
                    <option key={p.id} value={p.id}>
                      Producer: {p.name} ({p.district})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Reviewer">
                  {personas.filter(p => p.role === 'reviewer').map(p => (
                    <option key={p.id} value={p.id}>
                      Reviewer: {p.name} (Simulated Compliance)
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
              currentUser?.role === 'buyer' ? 'bg-blue-100 text-blue-800' :
              currentUser?.role === 'producer' ? 'bg-emerald-100 text-emerald-800' :
              'bg-purple-100 text-purple-800'
            }`}>
              {currentUser?.role}
            </span>
          </div>

          <button
            onClick={onResetDemo}
            disabled={isResetting}
            title="Reset database to clean deterministic state"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-emerald-700' : ''}`} />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* Brand & Typographic Lockup Modal */}
      {showBrandModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-700" />
                <h3 className="text-lg font-bold text-stone-900">Brand Status & Typographic Lockup Brief</h3>
              </div>
              <button
                onClick={() => setShowBrandModal(false)}
                className="text-stone-400 hover:text-stone-700 font-bold text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 text-xs text-stone-700 leading-relaxed">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-bold text-red-900 flex items-center gap-1 mb-1">
                  <ShieldAlert className="w-4 h-4 text-red-700" />
                  Legal Clearance Warning
                </h4>
                <p>
                  “Aswanu” is a provisional hackathon working title. An established agricultural marketplace already operates at{' '}
                  <strong>Asvanu.lk (අස්වනු.lk)</strong>. The sound, spelling, Sinhala rendering, sector, and audience overlap.
                  This prototype does NOT claim legal clearance or exclusive brand rights. Official NIPO trademark search and formal brand advice are mandatory prior to any public launch.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-stone-900 text-sm mb-2">Three-Script Typographic Lockup Design</h4>
                <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 flex flex-col items-center gap-3">
                  {renderHarvestGlyph('text-emerald-700')}
                  <div className="text-center">
                    <span className="text-3xl font-black text-emerald-950 font-serif tracking-tight">Aswanu</span>
                    <div className="flex items-center justify-center gap-3 text-lg font-bold text-emerald-800 mt-1">
                      <span>අස්වනු</span>
                      <span className="text-stone-300">•</span>
                      <span>அறுவடை</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-stone-500 italic text-center max-w-md">
                    Primary English “Aswanu”, supporting Sinhala “අස්වනු”, supporting Tamil “அறுவடை” (“harvest” concept translation).
                    Each script is rendered legibly with equal respect; glyphs are never spliced across languages.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-stone-50 rounded border border-stone-200">
                  <span className="font-bold text-stone-900 block mb-1">Evidence Check #1: Novelty</span>
                  <p>
                    Farmer-buyer marketplaces already exist (Asvanu.lk, GoviNet). Aswanu positions around <strong>buyer-led multi-producer aggregation, explicit landed cost itemization, and consent-based two-sided fulfilment</strong>.
                  </p>
                </div>
                <div className="p-3 bg-stone-50 rounded border border-stone-200">
                  <span className="font-bold text-stone-900 block mb-1">Evidence Check #2: Post-Harvest Loss</span>
                  <p>
                    Per National Institute of Post Harvest Management (NIPHM), packaging and transport cause major tomato losses. Aswanu tracks real rigid crate compliance and delivery responsibility rather than claiming an on-screen match prevents waste.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowBrandModal(false)}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded-lg text-xs"
                >
                  Understood & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
