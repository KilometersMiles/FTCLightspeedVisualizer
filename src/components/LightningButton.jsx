// src/components/PlasmaButton.js
import React, { useState, useEffect } from 'react';

export default function LightningButton({ children, onClick, style, color }) {
  const [isHovered, setIsHovered] = useState(false);

  // Unique ID for the filter so multiple buttons on the same page don't clash
  const filterId = 'plasma-glow-' + Math.random().toString(36).substr(2, 9);
  const electricBlue = color != null ? color : '#7dd3fc';

  const baseButtonStyle = {
    position: 'relative',
    background:
      isHovered
        ? 'rgba(125, 211, 252, 0.05)'
        : 'rgba(255, 255, 255, 0.01)',
    border: `1px solid ${
      isHovered ? 'transparent' : 'rgba(255, 255, 255, 0.15)'
    }`,
    backdropFilter: 'blur(8px)',
    padding: '12px 32px',
    borderRadius: '100px', // Keeps your sharp, clean-cut geometry aesthetic
    color: isHovered ? electricBlue : '#fff',
    cursor: 'pointer',
    textTransform: 'uppercase',
    fontWeight: '600',
    fontSize: '12px',
    letterSpacing: '2px',
    outline: 'none',
    overflow: 'visible', // Essential so the plasma arcs can break outside the bounding box
    transition: 'all 0.3s ease',
    ...style, // Allows overriding structural styles if needed
  };

  const lightningLayerStyle = {
    position: 'absolute',
    inset: '-1px',
    borderRadius: '100px',
    border: `2px solid ${electricBlue}`,
    pointerEvents: 'none',
    opacity: isHovered ? 1 : 0,
    filter: `url(#${filterId})`,
    boxShadow: `0 0 12px ${electricBlue}, inset 0 0 4px ${electricBlue}`,
    transition: 'opacity 0.2s ease',
    zIndex: 1,
  };

  return (
    <>
      {/* Dynamic SVG Distortion Filter */}
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
        <span style={{ position: 'relative', zIndex: 2 }}>{children}</span>
        <div style={lightningLayerStyle} />
      </button>
    </>
  );
}
