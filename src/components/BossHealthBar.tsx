import React from 'react';
import { BossHealthInfo } from '../types';

interface BossHealthBarProps {
  info: BossHealthInfo;
}

export const BossHealthBar: React.FC<BossHealthBarProps> = ({ info }) => {
  const pct = Math.max(0, Math.min(100, (info.remaining / info.max) * 100));

  let gradient = 'linear-gradient(90deg, #f44336, #E91E63, #9C27B0)';
  if (pct < 25) {
    gradient = 'linear-gradient(90deg, #f44336, #ff5722)';
  } else if (pct < 50) {
    gradient = 'linear-gradient(90deg, #f44336, #E91E63)';
  }

  return (
    <div
      id="boss-health-wrapper"
      style={{
        position: 'absolute',
        top: '60px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '300px',
        maxWidth: '80vw',
        zIndex: 50,
        pointerEvents: 'none',
        animation: 'slideInUp 0.5s ease',
      }}
    >
      <div
        style={{
          color: '#fff',
          fontSize: '14px',
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: '4px',
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
        }}
      >
        👑 GIANT KING
      </div>

      <div
        style={{
          width: '100%',
          height: '20px',
          background: 'rgba(0, 0, 0, 0.6)',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '2px solid #9C27B0',
          boxShadow: '0 0 10px rgba(156, 39, 176, 0.5)',
        }}
      >
        <div
          id="boss-health-fill"
          style={{
            width: `${pct}%`,
            height: '100%',
            background: gradient,
            borderRadius: '8px',
            transition: 'width 0.15s ease',
            boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.3)',
          }}
        />
      </div>

      <div
        id="boss-health-text"
        style={{
          color: '#fff',
          fontSize: '12px',
          textAlign: 'center',
          marginTop: '3px',
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
        }}
      >
        {Math.max(0, info.remaining)} / {info.max}
      </div>
    </div>
  );
};
