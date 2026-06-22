import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
export default function LightningButton({ children, onClick, style, color, isLoading }) {
  const [isHovered, setIsHovered] = useState(false);

  const filterId = 'plasma-glow-' + Math.random().toString(36).substr(2, 9);
  const electricBlue = color != null ? color : '#7dd3fc';

  const baseButtonStyle = {
    position: 'relative',
    background: isHovered
      ? 'rgba(125, 211, 252, 0.05)'
      : 'rgba(255, 255, 255, 0.01)',
    border: `1px solid ${isHovered ? 'transparent' : 'rgba(255, 255, 255, 0.15)'}`,
    backdropFilter: 'blur(8px)',
    padding: '8px 14px',
    borderRadius: '100px',
    height: '36px',
    boxSizing: 'border-box',
    color: isHovered ? electricBlue : '#fff',
    cursor: isLoading ? 'not-allowed' : 'pointer',
    textTransform: 'uppercase',
    fontWeight: '600',
    fontSize: '12px',
    letterSpacing: '1px',
    outline: 'none',
    overflow: 'visible',
    transition: 'all 0.3s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    opacity: isLoading ? 0.7 : 1,
    ...style,
  };

  const lightningLayerStyle = {
    position: 'absolute',
    inset: '-1px',
    borderRadius: '100px',
    border: `2px solid ${electricBlue}`,
    pointerEvents: 'none',
    opacity: isHovered && !isLoading ? 1 : 0,
    filter: `url(#${filterId})`,
    boxShadow: `0 0 12px ${electricBlue}, inset 0 0 4px ${electricBlue}`,
    transition: 'opacity 0.2s ease',
    zIndex: 1,
  };

  return (
    <>
      <svg
        style={{
          position: 'absolute',
          width: 0,
          height: 0,
          pointerEvents: 'none',
        }}
      >
        <filter id={filterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.01"
            numOctaves="5"
            seed="1"
          >
            <animate
              attributeName="seed"
              from="1"
              to="100"
              dur="3s"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="7" />
        </filter>
      </svg>

      <button
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
        style={baseButtonStyle}
      >
        {isLoading && <Loader2 size={14} className="cyber-spin" style={{ color: electricBlue }} />}

        <span style={{ zIndex: 2, display: 'flex', alignItems: 'center', gap: '8px' }}>
          {children}
        </span>

        <div style={lightningLayerStyle} />
      </button>
    </>
  );
}
