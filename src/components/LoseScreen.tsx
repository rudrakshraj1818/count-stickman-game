import React from 'react';

interface LoseScreenProps {
  onRetry: () => void;
}

export const LoseScreen: React.FC<LoseScreenProps> = ({ onRetry }) => {
  return (
    <div id="lose-screen" className="screen">
      <h2>💀 DEFEATED!</h2>
      <p>Your crowd was overwhelmed!</p>
      <button id="retry-btn" className="btn" onClick={onRetry}>
        🔄 RETRY
      </button>
    </div>
  );
};
