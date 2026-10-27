import { Game } from './game.js';

function initGame() {
    const game = new Game();
    game.init();
    window.game = game;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
