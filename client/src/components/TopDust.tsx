import React, { useMemo, useId } from 'react';

interface Props {
  density: number;
  opacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const TopDust: React.FC<Props> = ({ density, opacity, x, y, width, height }) => {
  const clipId = useId().replace(/:/g, '_') + '_top_dust';

  const particles = useMemo(() => {
    return Array.from({ length: density }).map((_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.5 + 0.5,
      delay: Math.random() * -20,
      duration: Math.random() * 10 + 15, // 15s to 25s
      tx: (Math.random() - 0.5) * 80, // Horizontal drift
      ty: -Math.random() * 120 - 40,   // Upward drift
    }));
  }, [density, width, height]);

  if (density <= 0 || opacity <= 0) return null;

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={width} height={height} />
        </clipPath>
      </defs>
      
      <g clipPath={`url(#${clipId})`} style={{ pointerEvents: 'none', opacity }}>
        {particles.map(p => (
          <circle
            key={p.id}
            cx={x + p.x}
            cy={y + p.y}
            r={p.r}
            fill="#ffeedd"
            className="dust-particle"
            style={{
              '--tx': `${p.tx}px`,
              '--ty': `${p.ty}px`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            } as React.CSSProperties}
          />
        ))}
      </g>
    </g>
  );
};
