/** Independent game-world geometry for Level 03.
 * Keeping coordinates here lets us validate the map without Phaser.
 */
export const TEMPLE_LAYOUT = {
  width:2960,height:720,ground:620,
  first:{x:455,y:565,span:348,padMin:284,padMax:388,ledgeX:684,ledgeY:365,ledgeWidth:230,switchX:804},
  machine:{gate1:980,bench:1490,liftX:1540,basketX:1695,upperX:1735,upperY:309,upperWidth:230,switchX:1851},
  second:{gate2:2035,plankX:2143,x:2323,y:565,span:348,padMin:2155,padMax:2248,ledgeX:2534,ledgeY:365,ledgeWidth:208,switchX:2642},
  exitGate:2815,exitX:2895,
  gravity:1150,ninjaJumpVelocity:635,ninjaRunSpeed:270,
  tiltAngle:-0.325,liftMidY:489,liftHighY:357
};
