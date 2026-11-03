import Phaser from 'phaser';
import { Temple } from './temple.js';
import './style.css';

// One playable scene while we refine Ninja, Bolt and Temple of Balance.
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1162,
  height: 874,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 1150 }, debug: false }
  },
  scene: [Temple],
  render: { pixelArt: false, antialias: true }
});
