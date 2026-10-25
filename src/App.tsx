import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Game } from './game/game';
import { HUD } from './components/HUD';
import { StartScreen } from './components/StartScreen';
import { ShopScreen } from './components/ShopScreen';
import { UpgradeScreen } from './components/UpgradeScreen';
import { WinScreen } from './components/WinScreen';
import { LoseScreen } from './components/LoseScreen';
import { BossHealthBar } from './components/BossHealthBar';
import { Confetti } from './components/Confetti';
import { FloatingTexts } from './components/FloatingTexts';
import { Skin, Theme, GameState, BossHealthInfo, FloatingTextItem } from './types';
import '../style.css';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const shakeIntensityRef = useRef<number>(0);

  const [gameState, setGameState] = useState<GameState>('menu');
  const [activeOverlay, setActiveOverlay] = useState<'none' | 'shop' | 'upgrades'>('none');
  const [level, setLevel] = useState(1);
  const [coins, setCoins] = useState(0);
  const [crowdUpgrade, setCrowdUpgrade] = useState(1);
  const [strengthUpgrade, setStrengthUpgrade] = useState(1);
  const [skins, setSkins] = useState<Skin[]>([]);
  const [equippedSkin, setEquippedSkin] = useState('blue');
  const [themes, setThemes] = useState<Theme[]>([]);
  const [equippedTheme, setEquippedTheme] = useState('default');
  const [count, setCount] = useState(1);
  const [bossHealth, setBossHealth] = useState<BossHealthInfo | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextItem[]>([]);
  const [winCoinsEarned, setWinCoinsEarned] = useState(0);

  const addFloatingText = useCallback((text: string, color: string) => {
    const id = Date.now() + Math.random();
    setFloatingTexts(prev => [...prev, { id, text, color }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(item => item.id !== id));
    }, 850);
  }, []);

  const triggerScreenShake = useCallback((intensity: number) => {
    shakeIntensityRef.current = Math.max(shakeIntensityRef.current, intensity);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animFrame: number;
    const shakeLoop = () => {
      if (shakeIntensityRef.current > 0.5) {
        const x = (Math.random() - 0.5) * shakeIntensityRef.current;
        const y = (Math.random() - 0.5) * shakeIntensityRef.current;
        canvas.style.transform = `translate(${x}px, ${y}px)`;
        shakeIntensityRef.current *= 0.85;
      } else {
        shakeIntensityRef.current = 0;
        canvas.style.transform = '';
      }
      animFrame = requestAnimationFrame(shakeLoop);
    };
    shakeLoop();

    const game = new Game({
      onStateChange: (st) => setGameState(st),
      onCountChange: (cnt) => setCount(cnt),
      onCoinsChange: (c) => setCoins(c),
      onLevelChange: (lvl) => setLevel(lvl),
      onUpgradesChange: (crw, str) => {
        setCrowdUpgrade(crw);
        setStrengthUpgrade(str);
      },
      onSkinsChange: (skns, eqSkin) => {
        setSkins(skns);
        setEquippedSkin(eqSkin);
      },
      onThemesChange: (thms, eqTheme) => {
        setThemes(thms);
        setEquippedTheme(eqTheme);
      },
      onBossHealthChange: (info) => setBossHealth(info),
      onFloatingText: (txt, clr) => addFloatingText(txt, clr),
      onScreenShake: (intensity) => triggerScreenShake(intensity),
      onWin: (earned) => {
        setWinCoinsEarned(earned);
      },
      onLose: () => {},
    });

    game.init(canvas);
    gameRef.current = game;

    return () => {
      cancelAnimationFrame(animFrame);
      game.dispose();
    };
  }, [addFloatingText, triggerScreenShake]);

  const handlePlay = () => {
    gameRef.current?.audio.init();
    gameRef.current?.audio.playClick();
    setActiveOverlay('none');
    gameRef.current?.startGame();
  };

  const handleOpenShop = () => {
    gameRef.current?.audio.init();
    gameRef.current?.audio.playClick();
    setActiveOverlay('shop');
  };

  const handleOpenUpgrades = () => {
    gameRef.current?.audio.init();
    gameRef.current?.audio.playClick();
    setActiveOverlay('upgrades');
  };

  const handleBack = () => {
    gameRef.current?.audio.playClick();
    setActiveOverlay('none');
  };

  const handleUpgradeCrowd = () => {
    if (gameRef.current?.upgradeCrowd()) {
      gameRef.current.audio.playGateGood();
    }
  };

  const handleUpgradeStrength = () => {
    if (gameRef.current?.upgradeStrength()) {
      gameRef.current.audio.playGateGood();
    }
  };

  const handleSkinClick = (skin: Skin) => {
    if (!gameRef.current) return;
    if (skin.id === equippedSkin) return;

    if (skin.owned) {
      gameRef.current.equipSkin(skin.id);
      gameRef.current.audio.playClick();
    } else if (skin.shareUnlock) {
      const shareData = {
        title: 'Count Masters: Stickman Games',
        text: 'Check out this awesome stickman runner game!',
        url: window.location.href,
      };

      if (navigator.share) {
        navigator.share(shareData).then(() => {
          gameRef.current?.shareForSkin(skin.id);
          gameRef.current?.audio.playGateGood();
          addFloatingText('+🎨 Rainbow unlocked!', '#4CAF50');
        }).catch(() => {});
      } else {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`).catch(() => {});
        }
        gameRef.current.shareForSkin(skin.id);
        gameRef.current.audio.playGateGood();
        addFloatingText('Link copied + 🎨 Rainbow!', '#4CAF50');
      }
    } else {
      if (gameRef.current.buySkin(skin.id)) {
        gameRef.current.audio.playGateGood();
        addFloatingText(`-${skin.price} 🪙`, '#ffd700');
      }
    }
  };

  const handleThemeClick = (theme: Theme) => {
    if (!gameRef.current) return;
    if (theme.id === equippedTheme) return;

    if (theme.owned) {
      gameRef.current.equipTheme(theme.id);
      gameRef.current.audio.playClick();
    } else {
      if (gameRef.current.buyTheme(theme.id)) {
        gameRef.current.audio.playGateGood();
        addFloatingText(`-${theme.price} 🪙`, '#ffd700');
      }
    }
  };

  const handleNextLevel = () => {
    gameRef.current?.audio.playClick();
    gameRef.current?.startGame();
  };

  const handleRetry = () => {
    gameRef.current?.audio.playClick();
    gameRef.current?.startGame();
  };

  const isPlayingOrFighting = gameState === 'playing' || gameState === 'fighting' || gameState === 'boss_defeated';

  return (
    <div id="game-container">
      <canvas id="game-canvas" ref={canvasRef} />

      {isPlayingOrFighting && (
        <>
          <HUD level={level} coins={coins} count={count} />
          {bossHealth && <BossHealthBar info={bossHealth} />}
        </>
      )}

      {gameState === 'menu' && (
        <>
          {activeOverlay === 'shop' && (
            <ShopScreen
              coins={coins}
              skins={skins}
              themes={themes}
              equippedSkin={equippedSkin}
              equippedTheme={equippedTheme}
              onSkinClick={handleSkinClick}
              onThemeClick={handleThemeClick}
              onBack={handleBack}
            />
          )}

          {activeOverlay === 'upgrades' && (
            <UpgradeScreen
              coins={coins}
              crowdUpgrade={crowdUpgrade}
              strengthUpgrade={strengthUpgrade}
              onUpgradeCrowd={handleUpgradeCrowd}
              onUpgradeStrength={handleUpgradeStrength}
              onBack={handleBack}
            />
          )}

          {activeOverlay === 'none' && (
            <StartScreen
              onPlay={handlePlay}
              onOpenShop={handleOpenShop}
              onOpenUpgrades={handleOpenUpgrades}
            />
          )}
        </>
      )}

      {gameState === 'win' && (
        <>
          <WinScreen
            earnedCoins={winCoinsEarned}
            totalCoins={coins}
            crowdUpgrade={crowdUpgrade}
            strengthUpgrade={strengthUpgrade}
            onUpgradeCrowd={handleUpgradeCrowd}
            onUpgradeStrength={handleUpgradeStrength}
            onNextLevel={handleNextLevel}
          />
          <Confetti />
        </>
      )}

      {gameState === 'lose' && (
        <LoseScreen onRetry={handleRetry} />
      )}

      <FloatingTexts items={floatingTexts} />
    </div>
  );
};
export default App;
