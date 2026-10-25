import React from 'react';

interface WinScreenProps {
  earnedCoins: number;
  totalCoins: number;
  crowdUpgrade: number;
  strengthUpgrade: number;
  onUpgradeCrowd: () => void;
  onUpgradeStrength: () => void;
  onNextLevel: () => void;
}

export const WinScreen: React.FC<WinScreenProps> = ({
  earnedCoins,
  totalCoins,
  crowdUpgrade,
  strengthUpgrade,
  onUpgradeCrowd,
  onUpgradeStrength,
  onNextLevel
}) => {
  return (
    <div id="win-screen" className="screen">
      <h2>🎉 LEVEL COMPLETE!</h2>
      <p id="win-coins">+{earnedCoins} 🪙</p>
      <p id="win-total-coins" style={{ fontSize: '14px', opacity: 0.8 }}>
        Total: 🪙 {totalCoins}
      </p>

      <div id="win-upgrades">
        <div className="upgrade-item">
          <span>Starting Crowd</span>
          <span id="win-crowd-level">Lv. {crowdUpgrade}</span>
          <button
            id="win-upgrade-crowd-btn"
            className="btn btn-small"
            onClick={onUpgradeCrowd}
          >
            🪙 {crowdUpgrade * 50}
          </button>
        </div>

        <div className="upgrade-item">
          <span>Strength</span>
          <span id="win-strength-level">Lv. {strengthUpgrade}</span>
          <button
            id="win-upgrade-strength-btn"
            className="btn btn-small"
            onClick={onUpgradeStrength}
          >
            🪙 {strengthUpgrade * 75}
          </button>
        </div>
      </div>

      <button id="next-btn" className="btn" onClick={onNextLevel}>
        NEXT LEVEL →
      </button>
    </div>
  );
};
