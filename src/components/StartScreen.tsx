import React from 'react';

interface StartScreenProps {
  onPlay: () => void;
  onOpenShop: () => void;
  onOpenUpgrades: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onPlay,
  onOpenShop,
  onOpenUpgrades
}) => {
  return (
    <div id="start-screen" className="screen">
      <h1>COUNT MASTERS</h1>
      <p>Stickman Games</p>
      <button id="play-btn" className="btn" onClick={onPlay}>
        ▶ PLAY
      </button>
      <button id="shop-btn" className="btn btn-secondary" onClick={onOpenShop}>
        🛒 SHOP
      </button>
      <button id="upgrade-btn" className="btn btn-secondary" onClick={onOpenUpgrades}>
        ⬆ UPGRADES
      </button>
    </div>
  );
};
