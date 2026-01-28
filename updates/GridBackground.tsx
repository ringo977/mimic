'use client';

import React from 'react';

/**
 * GridBackground Component
 * 
 * Griglia decorativa di background secondo le linee guida PoliMi.
 * IMPORTANTE: Non deve mai interferire con la leggibilità del testo.
 * 
 * Features:
 * - Opacità molto bassa (5-10%)
 * - pointer-events: none per non interferire con le interazioni
 * - z-index basso
 * - Colore: polimi-gray (#E0DCDC)
 */

interface GridBackgroundProps {
  opacity?: number; // 0.05 - 0.1 (default: 0.08)
  columnCount?: number; // numero di colonne verticali (default: 12)
  showHorizontal?: boolean; // mostra linee orizzontali (default: true)
}

export default function GridBackground({ 
  opacity = 0.08, 
  columnCount = 12,
  showHorizontal = true 
}: GridBackgroundProps) {
  
  return (
    <div 
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -10 }}
      aria-hidden="true"
    >
      {/* Colonne Verticali */}
      <div className="absolute inset-0 mx-auto max-w-screen-2xl">
        <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}>
          {Array.from({ length: columnCount }).map((_, i) => (
            <div
              key={`col-${i}`}
              className="border-r"
              style={{
                borderColor: `rgba(224, 220, 220, ${opacity})`,
                borderWidth: '1px',
              }}
            />
          ))}
        </div>
      </div>

      {/* Linee Orizzontali (opzionale) */}
      {showHorizontal && (
        <div className="absolute inset-0">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={`row-${i}`}
              className="border-t"
              style={{
                borderColor: `rgba(224, 220, 220, ${opacity * 0.5})`, // Ancora più leggere
                borderWidth: '1px',
                top: `${(i + 1) * 5}%`,
                position: 'absolute',
                left: 0,
                right: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* Gradiente sottile ai bordi (opzionale, per sfumatura) */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at center, transparent 0%, rgba(16, 44, 83, 0.02) 100%)
          `
        }}
      />
    </div>
  );
}

/**
 * Alternativa: Pattern SVG (più performante)
 * Decommentare questo e commentare il componente sopra se preferisci SVG
 */

/*
export default function GridBackgroundSVG({ opacity = 0.08 }: { opacity?: number }) {
  return (
    <div 
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -10 }}
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="polimi-grid"
            x="0"
            y="0"
            width="80"
            height="80"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 80 0 L 0 0 0 80"
              fill="none"
              stroke={`rgba(224, 220, 220, ${opacity})`}
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#polimi-grid)" />
      </svg>
    </div>
  );
}
*/
