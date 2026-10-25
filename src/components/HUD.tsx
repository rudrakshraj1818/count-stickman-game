import React, { useEffect, useState } from 'react';

interface HUDProps {
  level: number;
  coins: number;
  count: number;
}

export const HUD: React.FC<HUDProps> = ({ level, coins, count }) => {
  const [pulse, setPulse] = useState(false);
  const [prevCount, setPrevCount] = useState(count);

  useEffect(() => {
    if (Math.abs(count - prevCount) > 2) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 200);
      setPrevCount(count);
      return () => clearTimeout(timer);
    }
    setPrevCount(count);
  }, [count, prevCount]);

  return (
    <div id="hud">
      <div id="level-display">Level {level}</div>
      <div id="coin-display">🪙 {coins}</div>
      <div
        id="count-display"
        style={{
          transform: pulse ? 'scale(1.3)' : 'scale(1)',
          transition: 'transform 0.15s ease'
        }}
      >
        👥 {count}
      </div>
    </div>
  );
};
