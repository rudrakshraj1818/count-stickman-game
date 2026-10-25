import React from 'react';
import { FloatingTextItem } from '../types';

interface FloatingTextsProps {
  items: FloatingTextItem[];
}

export const FloatingTexts: React.FC<FloatingTextsProps> = ({ items }) => {
  return (
    <>
      {items.map(item => (
        <div
          key={item.id}
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '48px',
            fontWeight: 'bold',
            color: item.color,
            textShadow: `0 0 10px ${item.color}, 0 2px 4px rgba(0,0,0,0.5)`,
            pointerEvents: 'none',
            zIndex: 50,
            animation: 'floatUp 0.8s ease-out forwards',
          }}
        >
          {item.text}
        </div>
      ))}
    </>
  );
};
