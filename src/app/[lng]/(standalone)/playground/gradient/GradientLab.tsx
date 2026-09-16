'use client';

import { useState } from 'react';

const ORANGE_GLOW = `
  radial-gradient(
    circle at 105% 55%,
    rgba(198, 91, 35, 0.3) 0%,
    rgba(139, 62, 30, 0.15) 24%,
    transparent 50%
  )
`;

const COLORS_3 = [
  ['#07131a', 0],
  ['#10151d', 66],
  ['#080c12', 100],
] as const;

const COLORS_6 = [
  ['#07131a', 0],
  ['#081219', 20],
  ['#0a121a', 40],
  ['#10151d', 60],
  ['#0c1118', 80],
  ['#080c12', 100],
] as const;

const COLORS_10 = [
  ['#07131a', 0],
  ['#081219', 11],
  ['#091219', 22],
  ['#0a121a', 33],
  ['#0c131b', 44],
  ['#0e141c', 55],
  ['#10151d', 66],
  ['#0e131b', 77],
  ['#0b1017', 88],
  ['#080c12', 100],
] as const;

const MULTI_LAYER = `
  radial-gradient(
    ellipse at 8% 4%,
    rgba(11, 47, 57, 0.32) 0%,
    rgba(8, 31, 41, 0.16) 32%,
    transparent 62%
  ),
  radial-gradient(
    ellipse at 92% 5%,
    rgba(46, 52, 61, 0.24) 0%,
    rgba(27, 33, 42, 0.12) 35%,
    transparent 65%
  ),
  radial-gradient(
    ellipse at 52% 42%,
    rgba(20, 29, 40, 0.18) 0%,
    transparent 55%
  )
`;

const DITHER_PATTERN = `
  repeating-conic-gradient(
    rgba(255, 255, 255, 0.035) 0% 25%,
    transparent 0% 50%
  )
`;

type ColorSpace = 'srgb' | 'oklab';
type StopCount = 3 | 6 | 10;

interface NoiseSettings {
  frequency: number;
  octaves: number;
  opacity: number;
}

interface Effects {
  noise: boolean;
  blur: boolean;
  multiLayer: boolean;
  dithering: boolean;
}

const DEFAULT_NOISE: NoiseSettings = {
  frequency: 0.8,
  octaves: 4,
  opacity: 0.08,
};

function createGradient(colorSpace: ColorSpace, stops: StopCount) {
  const colors = stops === 3 ? COLORS_3 : stops === 6 ? COLORS_6 : COLORS_10;

  return `linear-gradient(
    135deg in ${colorSpace},
    ${colors.map(([color, position]) => `${color} ${position}%`).join(', ')}
  )`;
}

function NoiseLayer({
  id,
  frequency,
  octaves,
  opacity,
}: {
  id: string;
  frequency: number;
  octaves: number;
  opacity: number;
}) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ opacity }}
    >
      <defs>
        <filter id={id}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency={frequency}
            numOctaves={octaves}
            stitchTiles="stitch"
          />
        </filter>
      </defs>

      <rect width="100%" height="100%" fill="white" filter={`url(#${id})`} />
    </svg>
  );
}

function GradientView({
  colorSpace,
  stops,
  effects,
  noise,
}: {
  colorSpace: ColorSpace;
  stops: StopCount;
  effects: Effects;
  noise: NoiseSettings;
}) {
  const gradient = createGradient(colorSpace, stops);

  return (
    <div
      className="absolute inset-0"
      style={{
        background: `${ORANGE_GLOW}, ${gradient}`,
      }}
    >
      {effects.multiLayer && (
        <div className="pointer-events-none absolute inset-0" style={{ background: MULTI_LAYER }} />
      )}

      {effects.blur && (
        <div
          className="pointer-events-none absolute -inset-12 blur-3xl"
          style={{
            background: `${ORANGE_GLOW}, ${gradient}`,
          }}
        />
      )}

      {effects.noise && (
        <NoiseLayer
          id="gradient-lab-noise"
          frequency={noise.frequency}
          octaves={noise.octaves}
          opacity={noise.opacity}
        />
      )}

      {effects.dithering && (
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage: DITHER_PATTERN,
            backgroundSize: '4px 4px',
          }}
        />
      )}
    </div>
  );
}

export default function GradientLab() {
  const [colorSpace, setColorSpace] = useState<ColorSpace>('srgb');
  const [stops, setStops] = useState<StopCount>(3);

  const [effects, setEffects] = useState<Effects>({
    noise: false,
    blur: false,
    multiLayer: false,
    dithering: false,
  });

  const [noise, setNoise] = useState<NoiseSettings>(DEFAULT_NOISE);

  const toggleEffect = (effect: keyof Effects) => {
    setEffects(prev => ({
      ...prev,
      [effect]: !prev[effect],
    }));
  };

  const toggleClass = (active: boolean) =>
    [
      'shrink-0 rounded-full border px-3 py-1.5 text-xs backdrop-blur-md transition',
      active
        ? 'border-white/60 bg-white/85 text-neutral-950'
        : 'border-white/15 bg-black/30 text-white/65 hover:border-white/30 hover:text-white',
    ].join(' ');

  return (
    <main className="relative min-h-screen overflow-hidden bg-black">
      <div className="absolute inset-0 opacity-70">
        <GradientView colorSpace={colorSpace} stops={stops} effects={effects} noise={noise} />
      </div>

      <div className="absolute inset-x-0 top-0 z-10 p-4 sm:p-6">
        {/* 옵션 버튼 */}
        <div className="flex w-fit flex-col gap-2">
          <div className="flex w-fit gap-1 rounded-full border border-slate-700 p-1">
            <button
              type="button"
              onClick={() => setColorSpace('srgb')}
              className={toggleClass(colorSpace === 'srgb')}
            >
              sRGB
            </button>

            <button
              type="button"
              onClick={() => setColorSpace('oklab')}
              className={toggleClass(colorSpace === 'oklab')}
            >
              OKLab
            </button>
          </div>

          {/* Color Stops: 셋 중 하나 */}
          <div className="flex items-center gap-2">
            <p className="text-xs text-white/40">Color stop</p>
            {([3, 6, 10] as const).map(count => (
              <button
                key={count}
                type="button"
                onClick={() => setStops(count)}
                className={toggleClass(stops === count)}
              >
                {count} Stops
              </button>
            ))}
          </div>

          {/* Noise */}
          <div className="flex items-center gap-2">
            <p className="text-xs text-white/40">Noise</p>
            <button
              type="button"
              onClick={() => toggleEffect('noise')}
              className={toggleClass(effects.noise)}
            >
              {effects.noise ? 'off' : 'on'}
            </button>
            {effects.noise && (
              <div className="ml-6 flex items-center gap-3">
                <label className="flex items-center gap-1">
                  <span className="flex flex-col text-xs text-white">
                    frequency
                    <span className="text-[8px] text-white/45">입자 크기</span>
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={noise.frequency}
                    onChange={e =>
                      setNoise(prev => ({
                        ...prev,
                        frequency: Number(e.target.value),
                      }))
                    }
                    className="w-20 rounded-full bg-black/30 px-3 py-2 text-sm text-white outline-none"
                  />
                </label>

                <label className="flex items-center gap-1">
                  <span className="flex flex-col text-xs text-white">
                    octaves
                    <span className="text-[8px] text-white/45">합성 단계</span>
                  </span>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={noise.octaves}
                    onChange={e =>
                      setNoise(prev => ({
                        ...prev,
                        octaves: Number(e.target.value),
                      }))
                    }
                    className="w-20 rounded-full bg-black/30 px-3 py-2 text-sm text-white outline-none"
                  />
                </label>

                <label className="flex items-center gap-1">
                  <span className="flex flex-col text-xs text-white">
                    opacity
                    <span className="text-[8px] text-white/45">강도</span>
                  </span>

                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={noise.opacity}
                    onChange={e =>
                      setNoise(prev => ({
                        ...prev,
                        opacity: Number(e.target.value),
                      }))
                    }
                    className="w-20 rounded-full bg-black/30 px-3 py-2 text-sm text-white outline-none"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setNoise(DEFAULT_NOISE)}
                  className="rounded-full bg-black/30 px-3 py-2 text-xs text-white/70 transition hover:text-white"
                >
                  초기화
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <p className="text-xs text-white/40">Blur</p>
            <button
              type="button"
              onClick={() => toggleEffect('blur')}
              className={toggleClass(effects.blur)}
            >
              {effects.blur ? 'off' : 'on'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-white/40">Multi-layer</p>
            <button
              type="button"
              onClick={() => toggleEffect('multiLayer')}
              className={toggleClass(effects.multiLayer)}
            >
              {effects.multiLayer ? 'off' : 'on'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-white/40">Dithering</p>
            <button
              type="button"
              onClick={() => toggleEffect('dithering')}
              className={toggleClass(effects.dithering)}
            >
              {effects.dithering ? 'off' : 'on'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
