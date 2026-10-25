import React, { useState } from 'react';
import { Skin, Theme } from '../types';

interface ShopScreenProps {
  coins: number;
  skins: Skin[];
  themes: Theme[];
  equippedSkin: string;
  equippedTheme: string;
  onSkinClick: (skin: Skin) => void;
  onThemeClick: (theme: Theme) => void;
  onBack: () => void;
}

export const ShopScreen: React.FC<ShopScreenProps> = ({
  coins,
  skins,
  themes,
  equippedSkin,
  equippedTheme,
  onSkinClick,
  onThemeClick,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'skins' | 'themes'>('skins');

  return (
    <div id="shop-screen" className="screen">
      <h2>🛒 SHOP</h2>
      <p id="shop-coins" className="shop-coins">🪙 {coins}</p>

      <div className="shop-tabs">
        <button
          id="tab-skins"
          className={`shop-tab ${activeTab === 'skins' ? 'active' : ''}`}
          onClick={() => setActiveTab('skins')}
        >
          🎨 Skins
        </button>
        <button
          id="tab-themes"
          className={`shop-tab ${activeTab === 'themes' ? 'active' : ''}`}
          onClick={() => setActiveTab('themes')}
        >
          🌄 Themes
        </button>
      </div>

      {activeTab === 'skins' ? (
        <div id="skins-panel" className="shop-panel">
          <div id="skins-grid" className="shop-grid">
            {skins.map(skin => {
              const isEquipped = skin.id === equippedSkin;
              const isOwned = skin.owned;

              let priceLabel = `🪙 ${skin.price}`;
              let priceClass = '';
              if (isEquipped) {
                priceLabel = '✓ Equipped';
                priceClass = 'owned-label';
              } else if (isOwned) {
                priceLabel = 'Tap to equip';
                priceClass = 'owned-label';
              } else if (skin.shareUnlock) {
                priceLabel = '📤 Share';
                priceClass = 'free';
              }

              const previewBg = skin.id === 'rainbow'
                ? 'linear-gradient(135deg, red, orange, yellow, green, blue, purple)'
                : '#' + skin.color.toString(16).padStart(6, '0');

              return (
                <div
                  key={skin.id}
                  className={`shop-item ${isOwned ? 'owned' : ''} ${isEquipped ? 'equipped' : ''}`}
                  onClick={() => onSkinClick(skin)}
                >
                  <div
                    className="skin-preview"
                    style={{ background: previewBg }}
                  />
                  <div className="item-name">{skin.name}</div>
                  <div className={`item-price ${priceClass}`}>{priceLabel}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div id="themes-panel" className="shop-panel">
          <div id="themes-grid" className="shop-grid">
            {themes.map(theme => {
              const isEquipped = theme.id === equippedTheme;
              const isOwned = theme.owned;

              let priceLabel = `🪙 ${theme.price}`;
              let priceClass = '';
              if (isEquipped) {
                priceLabel = '✓ Equipped';
                priceClass = 'owned-label';
              } else if (isOwned) {
                priceLabel = 'Tap to equip';
                priceClass = 'owned-label';
              }

              const previewBg = `linear-gradient(180deg, ${theme.colors[0]}, ${theme.colors[2]}, ${theme.colors[4]})`;

              return (
                <div
                  key={theme.id}
                  className={`shop-item ${isOwned ? 'owned' : ''} ${isEquipped ? 'equipped' : ''}`}
                  onClick={() => onThemeClick(theme)}
                >
                  <div
                    className="theme-preview"
                    style={{ background: previewBg }}
                  />
                  <div className="item-name">{theme.name}</div>
                  <div className={`item-price ${priceClass}`}>{priceLabel}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button id="shop-back-btn" className="btn btn-secondary" onClick={onBack}>
        ← BACK
      </button>
    </div>
  );
};
