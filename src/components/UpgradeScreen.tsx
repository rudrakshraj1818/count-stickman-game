import React from 'react';

interface UpgradeScreenProps {
  coins: number;
  crowdUpgrade: number;
  strengthUpgrade: number;
  onUpgradeCrowd: () => void;
  onUpgradeStrength: () => void;
  onBack: () => void;
}

export const UpgradeScreen: React.FC<UpgradeScreenProps> = ({
  coins,
  crowdUpgrade,
  strengthUpgrade,
  onUpgradeCrowd,
  onUpgradeStrength,
  onBack
}) => {
  return (
    <div id="upgrade-screen" className="screen">
      <h2>UPGRADES</h2>
      <p style={{ color: '#ffd700', fontSize: '20px', fontWeight: 'bold' }}>🪙 {coins}</p>
      
      <div className="upgrade-item">
        <span>Starting Crowd</span>
        <span id="crowd-level">Lv. {crowdUpgrade}</span>
        <button
          id="upgrade-crowd-btn"
          className="btn btn-small"
          onClick={onUpgradeCrowd}
        >
          🪙 {crowdUpgrade * 50}
        </button>
      </div>

      <div className="upgrade-item">
        <span>Strength</span>
        <span id="strength-level">Lv. {strengthUpgrade}</span>
        <button
          id="upgrade-strength-btn"
          className="btn btn-small"
          onClick={onUpgradeStrength}
        >
          🪙 {strengthUpgrade * 75}
        </button>
      </div>

      <button id="back-btn" className="btn btn-secondary" onClick={onBack}>
        ← BACK
      </button>
    </div>
  );
};
