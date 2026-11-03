import test from 'node:test';
import assert from 'node:assert/strict';
import {MAP as M} from '../src/temple-layout.js';

test('room matches the supplied screenshot proportions',()=>{
 assert.equal(M.referenceWidth,581);
 assert.equal(M.referenceHeight,437);
 assert.equal(M.width,1162);
 assert.equal(M.height,874);
 assert.equal(M.scale,2);
 assert.equal(M.lowerFloor-M.topFloor,176);
});

test('one room shows exactly two separate floors and two seesaws',()=>{
 assert.ok(M.upperSeesaw.y<M.topFloor);
 assert.ok(M.lowerSeesaw.y>M.topFloor);
 assert.ok(M.lowerSeesaw.y<M.lowerFloor);
 assert.ok(M.upperSeesaw.x<M.lowerSeesaw.x);
 assert.ok(M.upperSeesaw.length>180&&M.lowerSeesaw.length>180);
});

test('characters start on upper floor at opposing ends of first seesaw',()=>{
 assert.ok(M.characters.bolt.x<M.upperSeesaw.x);
 assert.ok(M.characters.ninja.x>M.upperSeesaw.x);
 assert.ok(M.characters.ninja.y<M.topFloor);
 assert.ok(M.characters.bolt.y<M.topFloor);
 assert.ok(M.characters.ninja.x<M.referenceWidth);
});

test('colored portals remain at opposite edges of the upper floor',()=>{
 assert.ok(M.upperPortal.blue.x<100);
 assert.ok(M.upperPortal.red.x>480);
 assert.ok(Math.abs(M.upperPortal.blue.y-M.topFloor)<10);
 assert.ok(Math.abs(M.upperPortal.red.y-M.topFloor)<15);
});

test('doors occupy distinct heights on the lower-right wall',()=>{
 assert.ok(M.exits.red.x>500 && M.exits.blue.x>500);
 assert.ok(M.exits.red.y<M.exits.blue.y);
 assert.ok(M.exits.blue.y<M.lowerFloor);
 assert.ok(M.exits.red.y>M.topFloor);
});

test('gems replicate reference positions and colors',()=>{
 assert.equal(M.crystals.red.length,3);
 assert.equal(M.crystals.blue.length,7);
 assert.equal(M.crystals.red.filter(([x,y])=>y<M.topFloor).length,2);
 assert.equal(M.crystals.blue.filter(([x,y])=>y<M.topFloor).length,3);
 for(const items of Object.values(M.crystals))
  for(const [x,y] of items){
   assert.ok(x>12&&x<M.referenceWidth-12);
   assert.ok(y>20&&y<M.lowerFloor);
  }
});

test('jump range is sufficient for the stacked floor obstacles',()=>{
 const gravity=1500, jumpVelocity=720;
 const rise=jumpVelocity**2/(2*gravity)/M.scale;
 assert.ok(rise>80 && rise<95, 'jump should be approximately 86 reference pixels high');
 assert.ok(Math.abs(M.lowerFloor-327)>rise, 'red exit shelf must require use of the seesaw');
});

test('reference-mapped ledges and walls stay within viewport',()=>{
 assert.ok(M.topPlatforms.length>=10);
 assert.ok(M.lowerPlatforms.length>=7);
 for(const [x,y,w,h] of [...M.topPlatforms,...M.lowerPlatforms,...M.outerWalls]){
  assert.ok(x>=0&&y>=0&&w>0&&h>0);
  assert.ok(x+w<=M.referenceWidth&&y+h<=M.referenceHeight);
 }
});
