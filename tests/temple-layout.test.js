import test from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLE_LAYOUT as L } from '../src/temple-layout.js';

const jumpRise = L.ninjaJumpVelocity ** 2 / (2 * L.gravity);
const seesawTip = board => board.y + Math.tan(L.tiltAngle) * board.span / 2;

test('both seesaws have reachable ledges, but not from flat ground', () => {
  for (const board of [L.first, L.second]) {
    assert.ok(L.ground - board.ledgeY > jumpRise, 'upper ledge would be reachable without using seesaw');
    assert.ok(seesawTip(board) - board.ledgeY < jumpRise, 'tilted seesaw must put upper ledge in jump range');
    assert.ok(seesawTip(board) - board.ledgeY > 60, 'jump must retain meaningful challenge');
    assert.ok(board.ledgeX - (board.x + board.span / 2) < 90, 'right board end should be near upper ledge');
    assert.ok(board.switchX > board.ledgeX && board.switchX < board.ledgeX + board.ledgeWidth, 'switch must be on upper ledge');
    assert.ok(board.padMin < board.padMax && board.padMax < board.x, 'Bolt pad must be left of pivot');
  }
});

test('light weight cannot reach upper walkway but heavy weight can', () => {
  const upper = L.machine.upperY;
  assert.ok(L.liftMidY - upper > jumpRise, 'lightweight lift should be deliberately insufficient');
  assert.ok(L.liftHighY - upper < jumpRise, 'heavyweight lift should put upper route in jump reach');
  assert.ok(L.machine.switchX > L.machine.upperX && L.machine.switchX < L.machine.upperX + L.machine.upperWidth, 'pulley switch on upper walkway');
});

test('gates and construction parts are traversed in intentional order', () => {
  assert.ok(L.first.switchX < L.machine.gate1);
  assert.ok(L.machine.gate1 < L.machine.bench);
  assert.ok(L.machine.bench < L.machine.basketX);
  assert.ok(L.machine.basketX < L.machine.switchX);
  assert.ok(L.machine.switchX < L.second.gate2);
  assert.ok(L.second.gate2 < L.second.plankX);
  assert.ok(L.second.plankX < L.second.x);
  assert.ok(L.second.switchX < L.exitGate);
  assert.ok(L.exitGate < L.exitX && L.exitX < L.width);
});

test('camera and vertical level geometry remain in bounds', () => {
  assert.ok(L.height > L.ground);
  assert.ok(L.first.ledgeY > 250 && L.second.ledgeY > 250 && L.machine.upperY > 250);
  assert.ok(L.width > 1280);
});
