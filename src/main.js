import Phaser from 'phaser';
import { Foundry } from './foundry.js';
import './style.css';

// Gameplay-only greybox. Every measurement uses game-world pixels.
// No final art is embedded in the puzzle logic.
const WORLD = { width: 1780, height: 720, ground: 605, gapStart: 1090, gapEnd: 1320 };
const C = { sky: 0x172431, stone: 0x526273, edge: 0xa5b5bd, ink: 0xe8edf2,
  ninja: 0xcc7080, bolt: 0xb5a184, gold: 0xeec783, cyan: 0x78cdd7, green: 0x8dd6ad };
const distance = (a,b) => Phaser.Math.Distance.Between(a.x,a.y,b.x,b.y);
const near = (a,b,r=100) => distance(a,b)<r;
const groundCenter = (height) => WORLD.ground-height/2;

class Workshop extends Phaser.Scene {
  constructor(){ super('Workshop'); }

  create(){
    this.physics.world.setBounds(0,0,WORLD.width,WORLD.height);
    this.cameras.main.setBounds(0,0,WORLD.width,WORLD.height);
    this.cameras.main.setBackgroundColor(C.sky);
    this.createTextures();
    this.drawEnvironment();
    this.createTerrain();
    this.createPuzzle();
    this.createPlayers();
    this.configureInputs();
    this.createLabels();
    this.resetState();
    document.getElementById('restart').onclick = () => this.scene.restart();
    document.getElementById('hint').onclick = () => this.showHint();
  }

  createTextures(){
    const g = this.make.graphics({x:0,y:0});
    const make = (key,w,h,paint) => {g.clear(); paint(g);g.generateTexture(key,w,h);};
    make('ninja',54,70,g=>{
      g.fillStyle(0x212938);g.fillRoundedRect(15,37,25,31,6);
      g.fillStyle(0xf4e7db);g.fillEllipse(27,24,43,38);
      g.fillTriangle(8,16,6,1,23,15);g.fillTriangle(32,15,48,1,49,23);
      g.fillStyle(0x18202a);g.fillEllipse(18,24,7,12);g.fillEllipse(36,24,7,12);
      g.fillStyle(C.ninja);g.fillRoundedRect(8,39,37,10,5);
      g.fillTriangle(11,41,1,57,26,44);
    });
    make('bolt',76,82,g=>{
      g.fillStyle(0x585a62);g.fillRoundedRect(10,30,55,46,8);
      g.fillStyle(0xc8b89e);g.fillRoundedRect(14,13,49,57,15);
      g.fillStyle(0x202b39);g.fillRoundedRect(19,22,40,25,11);
      g.fillStyle(0xffd88f);g.fillCircle(31,34,5);g.fillCircle(46,34,5);
      g.fillStyle(0x8d8c92);g.fillRoundedRect(0,39,16,25,7);g.fillRoundedRect(60,39,16,25,7);
      g.fillStyle(0x414451);g.fillRoundedRect(15,69,23,12,4);g.fillRoundedRect(42,69,22,12,4);
      g.fillStyle(0x96af7a);g.fillEllipse(40,7,17,8);
      g.lineStyle(3,0x6e5d53);g.strokeRoundedRect(17,15,44,52,10);
    });
    make('crate',68,68,g=>{
      g.fillStyle(0xad9b81);g.fillRoundedRect(2,2,64,64,6);
      g.lineStyle(4,0x554d4b);g.strokeRect(7,7,54,54);
      g.lineBetween(11,11,57,57);g.lineBetween(57,11,11,57);
      g.fillStyle(0xe4c993);g.fillCircle(34,34,6);
    });
    make('beam',172,27,g=>{
      g.fillStyle(0xc4a277);g.fillRoundedRect(0,1,172,24,4);
      g.lineStyle(3,0x625347);g.strokeRoundedRect(4,4,164,18,3);
      for(let x=28;x<168;x+=42)g.lineBetween(x,5,x+13,22);
    });
    make('lever',44,55,g=>{
      g.fillStyle(0x808e9e);g.fillRoundedRect(3,41,38,11,3);
      g.lineStyle(6,C.gold);g.lineBetween(21,43,32,12);g.fillStyle(0xffe0a5);g.fillCircle(32,12,9);
    });
    make('door',110,151,g=>{
      g.fillStyle(0x758293);g.fillRoundedRect(0,0,110,151,40);
      g.fillStyle(0x2f3d4b);g.fillRoundedRect(9,12,92,136,34);
      g.lineStyle(4,C.gold);g.strokeRoundedRect(9,12,92,136,34);
      g.fillStyle(0xf6d9a1,0.42);g.fillEllipse(55,91,52,84);
      g.fillStyle(0xffe1a8);g.fillCircle(55,67,7);
    });
    make('gate',40,310,g=>{
      g.fillStyle(0xa64f5d);g.fillRoundedRect(0,0,40,310,7);
      g.lineStyle(3,0xe7a3a5);for(let i=7;i<39;i+=10)g.lineBetween(i,8,i,300);
    });
    make('square',8,8,g=>{g.fillStyle(0xffffff);g.fillRect(0,0,8,8);});
    g.destroy();
  }

  drawEnvironment(){
    const g=this.add.graphics().setDepth(-30);
    g.fillGradientStyle(0x142232,0x1e2e40,0x2c4051,0x35475a,1);g.fillRect(0,0,WORLD.width,WORLD.height);
    for(let i=0;i<14;i++){
      const x=i*150-45, h=290+(i%4)*34;
      g.fillStyle(0x9ba8b6,0.075);g.fillRoundedRect(x,WORLD.ground-h,86,h,28);
      g.lineStyle(12,0xc4ccda,0.04);g.strokeRoundedRect(x-15,WORLD.ground-h-45,116,148,46);
    }
    const fog=this.add.graphics().setDepth(-20);
    fog.fillStyle(0xb5c6ce,0.035);fog.fillRect(0,435,WORLD.width,170);
    for(let i=0;i<37;i++)this.add.circle(34+i*59,150+(i%7)*43,1.8,0xffd99b,0.35).setDepth(-10);
  }

  createTerrain(){
    this.solids=this.physics.add.staticGroup();
    this.terrain(0,WORLD.ground,1090,115);
    this.terrain(1320,WORLD.ground,460,115);
    // A ledge is deliberately unreachable from ground without the 68px crate.
    this.terrain(445,437,182,24);
    this.terrain(1430,515,125,18); // Optional lookout; never required.
  }
  terrain(x,top,width,height){
    const o=this.add.rectangle(x+width/2,top+height/2,width,height,C.stone).setDepth(3);
    o.setStrokeStyle(1,0x374858);this.solids.add(o);o.body.updateFromGameObject();
    this.add.rectangle(x+width/2,top+4,width,8,C.edge).setDepth(4);
    return o;
  }

  createPuzzle(){
    this.gate=this.physics.add.staticImage(719,450,'gate').setDepth(12);
    this.lever=this.add.image(546,408,'lever').setDepth(10);
    this.gateCable=this.add.graphics().setDepth(2);
    this.gateCable.lineStyle(3,C.gold,0.7).beginPath().moveTo(546,365).lineTo(620,365).lineTo(620,290).lineTo(719,290).lineTo(719,293).strokePath();
    this.crate=this.physics.add.staticImage(226,groundCenter(68),'crate').setDepth(9);
    this.plateX=869;
    this.plate=this.add.rectangle(this.plateX,599,104,12,0xd7ac64).setDepth(11);
    this.plateCable=this.add.graphics().setDepth(2);
    this.plateCable.lineStyle(3,0xb3b5a3,0.55).beginPath().moveTo(869,598).lineTo(869,520).lineTo(980,520).strokePath();
    this.beamPedestal=this.add.rectangle(975,590,202,36,0x33495a).setStrokeStyle(2,C.gold,0.65).setDepth(4);
    this.beam=this.physics.add.staticImage(975,groundCenter(27)-24,'beam').setDepth(10);
    this.beam.disableBody(true,true);
    this.socket=this.add.rectangle(1050,568,68,56,0xeec783,0.14).setStrokeStyle(2,C.gold,0.85).setDepth(5);
    this.bridgeGhost=this.add.rectangle((WORLD.gapStart+WORLD.gapEnd)/2,WORLD.ground-12,WORLD.gapEnd-WORLD.gapStart,24,0xf4cb7d,0.10).setStrokeStyle(2,C.gold,0.55).setDepth(3);
    this.bridge=this.add.rectangle(1205,593,230,24,0xc4a276).setDepth(7).setVisible(false);
    this.exit=this.add.image(1640, WORLD.ground-75,'door').setDepth(9);
  }

  createPlayers(){
    this.ninja=this.physics.add.sprite(103,WORLD.ground-35,'ninja').setDepth(14).setSize(36,60).setCollideWorldBounds(true);
    this.bolt=this.physics.add.sprite(167,WORLD.ground-40,'bolt').setDepth(14).setSize(66,72).setCollideWorldBounds(true);
    this.ninja.setMaxVelocity(270,650).setDragX(1100);
    this.bolt.setMaxVelocity(205,650).setDragX(1200);
    for(const o of [this.ninja,this.bolt])this.physics.add.collider(o,this.solids);
    this.physics.add.collider(this.ninja,this.crate);
    this.physics.add.collider(this.bolt,this.crate);
    for(const o of [this.ninja,this.bolt])this.physics.add.collider(o,this.gate);
    this.carryVisual=this.add.image(0,0,'crate').setDepth(16).setVisible(false);
    this.jumpMemory={ninja:{grounded:-10000,pressed:-10000},bolt:{grounded:-10000,pressed:-10000}};
    this.groundMarkers=this.add.graphics().setDepth(8);
  }

  configureInputs(){
    this.keys=this.input.keyboard.addKeys({
      na:'A', nd:'D', nw:'W', nf:'F',
      bl:'LEFT', br:'RIGHT', bu:'UP', be:'ENTER',
      restart:'R', hint:'H'
    });
    this.input.keyboard.addCapture(['UP','DOWN','LEFT','RIGHT','SPACE']);
    const restart=()=>this.scene.restart();
    const hint=()=>this.showHint();
    this.input.keyboard.on('keydown-R',restart);
    this.input.keyboard.on('keydown-H',hint);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      this.input.keyboard.off('keydown-R',restart);
      this.input.keyboard.off('keydown-H',hint);
    });
  }

  createLabels(){
    const text=(x,y,t,color=C.ink,size=14)=>this.add.text(x,y,t,{fontFamily:'Arial, sans-serif',fontSize:size+'px',fontStyle:'bold',color:'#'+color.toString(16).padStart(6,'0')}).setDepth(15);
    text(38,305,'THE FORGOTTEN WORKSHOP',0xf1dab0,25);
    text(40,343,'Two heroes. One way through.',0xb5c7d4,15);
    text(74,493,'A / D · W',0x94d5e0,14);
    text(145,458,'← → · ↑',0xf2cb9d,14);
    text(452,379,'THE LEVER',0xe6c58b);
    text(675,275,'GATE',0xf3a3a6);
    text(821,563,'WEIGHT PLATE',0xe6c58b,13);
    text(911,516,'SEALED BEAM',0xe6c58b,13);
    text(1034,523,'BUILD',0xe6c58b,13);
    text(1594,436,'THE EXIT',0xf6da9d,16);
    this.prompt=this.add.text(0,0,'',{fontFamily:'Arial, sans-serif',fontSize:'14px',fontStyle:'bold',color:'#f9e7c4',backgroundColor:'#273a4c',padding:{x:9,y:7}}).setDepth(30).setVisible(false);
  }

  resetState(){
    this.state={gateOpen:false,plateOn:false,beamReleased:false,bridgeBuilt:false,carried:null,complete:false,shownHint:false};
    this.lastProgress=this.time.now;
    document.getElementById('victory').classList.remove('visible');
    document.querySelector('#victory button').onclick=()=>this.scene.restart();
    this.notice('Find a way for both heroes to reach the exit.');
    this.updateHud();
    this.cameras.main.scrollX=0;
  }

  notice(message){
    const toast=document.querySelector('#toast');
    toast.textContent=message;toast.classList.add('show');
    if(this.toastEvent)this.toastEvent.remove(false);
    this.toastEvent=this.time.delayedCall(2800,()=>toast.classList.remove('show'));
  }

  updateHud(){
    const s=this.state;
    const status=s.complete?'WORKSHOP CLEARED':s.bridgeBuilt?'BRIDGE BUILT':s.beamReleased?'THE BRIDGE':s.gateOpen?'THE WEIGHTED PLATE':'THE LOCKED GATE';
    document.querySelector('#objective').textContent=status;
    document.querySelector('#step').textContent=s.complete?'✓':s.bridgeBuilt?'03 / 03':s.gateOpen?'02 / 03':'01 / 03';
  }

  carryCrate(){
    this.state.carried='crate';this.crate.disableBody(true,true);
    this.carryVisual.setTexture('crate').setScale(0.85).setVisible(true);
  }

  dropCrate(){
    // A deliberate snap radius makes the weight puzzle readable, not pixel-perfect.
    let x=Phaser.Math.Clamp(this.bolt.x+(this.bolt.flipX?-67:67),55,1050);
    if(Math.abs(x-this.plateX)<92)x=this.plateX;
    // Do not allow the crate to be lost beyond the gate or embedded in a wall.
    if(x>693&&x<745)x=this.bolt.x<719?670:774;
    this.crate.enableBody(true,x,groundCenter(68),true,true);
    this.crate.refreshBody();
    this.state.carried=null;this.carryVisual.setVisible(false);
  }

  carryBeam(){
    this.state.carried='beam';this.beam.disableBody(true,true);
    this.carryVisual.setTexture('beam').setScale(0.85).setVisible(true);
  }

  dropBeam(){
    const x=Phaser.Math.Clamp(this.bolt.x+(this.bolt.flipX?-75:75),830,1050);
    this.beam.enableBody(true,x,groundCenter(27),true,true);
    this.beam.refreshBody();
    this.state.carried=null;this.carryVisual.setVisible(false);
  }

  ninjaInteract(){
    if(this.state.gateOpen)return;
    if(near(this.ninja,this.lever,93)){
      this.state.gateOpen=true;this.gate.disableBody(true,true);
      this.add.circle(546,393,36,C.green,.2).setDepth(1);
      this.lastProgress=this.time.now;this.updateHud();
      this.notice('The gate is open. What else could that heavy block do?');
    }
  }

  boltInteract(){
    const s=this.state;
    if(s.carried==='crate'){this.dropCrate();return;}
    if(s.carried==='beam'){
      if(this.bolt.x>984&&this.bolt.x<1092&&!s.bridgeBuilt){
        s.carried=null;this.carryVisual.setVisible(false);s.bridgeBuilt=true;
        this.beam.disableBody(true,true);this.bridge.setVisible(true);
        this.physics.add.existing(this.bridge,true);this.bridge.body.updateFromGameObject();
        this.physics.add.collider(this.ninja,this.bridge);this.physics.add.collider(this.bolt,this.bridge);
        this.socket.setVisible(false);this.bridgeGhost.setVisible(false);
        this.lastProgress=this.time.now;this.updateHud();
        this.notice('Bridge assembled! Both heroes can reach the exit.');
      }else this.dropBeam();
      return;
    }
    if(!s.bridgeBuilt&&s.beamReleased&&near(this.bolt,this.beam,125)){this.carryBeam();return;}
    if(near(this.bolt,this.crate,115)){this.carryCrate();return;}
  }

  showHint(){
    const s=this.state;
    const hint=!s.gateOpen?'The lever is too high. Can one character reposition something heavy?':
      !s.plateOn?'The block opened a path once. Look for another place its weight could help.':
      !s.bridgeBuilt?'A beam has been released. Bolt can carry and install it near the gap.':
      'The door needs both heroes.';
    this.notice(hint);s.shownHint=true;
  }

  move(hero,keys,speed,jump,dt,memory){
    const body=hero.body;const left=keys[0].isDown,right=keys[1].isDown;
    const grounded=body.blocked.down||body.touching.down;
    if(grounded)memory.grounded=this.time.now;
    if(Phaser.Input.Keyboard.JustDown(keys[2]))memory.pressed=this.time.now;
    const acceleration = 1650;
    const target=left?-speed:right?speed:0;
    const increment=acceleration*dt/1000;
    const previous=body.velocity.x;
    const next=previous<target?Math.min(previous+increment,target):Math.max(previous-increment,target);
    hero.setVelocityX(next);
    if(left||right)hero.setFlipX(left);
    if(this.time.now-memory.pressed<120&&this.time.now-memory.grounded<95){
      hero.setVelocityY(-jump);memory.pressed=-99999;memory.grounded=-99999;
    }
  }

  update(_time,delta){
    const s=this.state;
    if(s.complete)return;
    this.move(this.ninja,[this.keys.na,this.keys.nd,this.keys.nw],260,545,delta,this.jumpMemory.ninja);
    this.move(this.bolt,[this.keys.bl,this.keys.br,this.keys.bu],195,342,delta,this.jumpMemory.bolt);
    if(Phaser.Input.Keyboard.JustDown(this.keys.nf))this.ninjaInteract();
    if(Phaser.Input.Keyboard.JustDown(this.keys.be))this.boltInteract();

    if(s.carried){
      const pos=s.carried==='crate'?{x:58,y:-50}:{x:70,y:-45};
      this.carryVisual.setPosition(this.bolt.x+(this.bolt.flipX?-pos.x:pos.x),this.bolt.y+pos.y);
    }
    const plateOn = s.carried!=='crate' && Math.abs(this.crate.x-this.plateX)<12 && this.crate.visible;
    if(plateOn!==s.plateOn){
      s.plateOn=plateOn;
      this.plate.setFillStyle(plateOn?C.green:0xd7ac64);
      if(plateOn&&!s.beamReleased){
        s.beamReleased=true;
        this.beam.enableBody(true,975,groundCenter(27)-24,true,true);
        this.beam.refreshBody();
        this.lastProgress=this.time.now;
        this.notice('The storage lock released a long bridge beam.');
      }
      this.updateHud();
    }
    this.prompt.setVisible(false);
    const prompt=(obj,t)=>{
      this.prompt.setText(t).setPosition(obj.x-84,obj.y-111).setVisible(true);
    };
    if(!s.gateOpen&&near(this.ninja,this.lever,93))prompt(this.ninja,'F  ·  Pull lever');
    else if(s.carried==='beam'&&this.bolt.x>984&&this.bolt.x<1092)prompt(this.bolt,'ENTER  ·  Build bridge');
    else if(s.carried)prompt(this.bolt,'ENTER  ·  Place down');
    else if(s.beamReleased&&!s.bridgeBuilt&&near(this.bolt,this.beam,125))prompt(this.bolt,'ENTER  ·  Carry beam');
    else if(near(this.bolt,this.crate,115))prompt(this.bolt,'ENTER  ·  Lift block');

    // Checkpoints avoid forcing either player to replay the whole tutorial.
    for(const [hero,key] of [[this.ninja,'ninja'],[this.bolt,'bolt']]){
      if(hero.y>700){
        const fallback=s.bridgeBuilt?1352:s.gateOpen?760:90;
        hero.setPosition(fallback+(key==='bolt'?75:0),WORLD.ground-(key==='ninja'?35:41)).setVelocity(0,0);
        this.notice('Back on solid ground — keep experimenting.');
      }
    }
    if(s.bridgeBuilt&&this.ninja.x>1592&&this.bolt.x>1592){
      s.complete=true;this.physics.pause();this.updateHud();
      this.notice('LEVEL COMPLETE — You solved it together!');
      document.querySelector('#victory').classList.add('visible');
    }

    // Shared camera: adapts to the two heroes without stealing control.
    const separation=Math.abs(this.ninja.x-this.bolt.x);
    const zoom=Phaser.Math.Clamp(1-(Math.max(0,separation-650)/1050),0.90,1);
    this.cameras.main.setZoom(Phaser.Math.Linear(this.cameras.main.zoom,zoom,0.045));
    const focus=(this.ninja.x+this.bolt.x)/2;
    const viewWidth=1280/this.cameras.main.zoom;
    const desired=Phaser.Math.Clamp(focus-viewWidth/2,0,WORLD.width-viewWidth);
    this.cameras.main.scrollX=Phaser.Math.Linear(this.cameras.main.scrollX,desired,.08);
  }
}

const game = new Phaser.Game({
  type:Phaser.AUTO,parent:'game',width:1280,height:720,
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
  physics:{default:'arcade',arcade:{gravity:{y:1150},debug:false}},
  scene:[Workshop,Foundry],render:{pixelArt:false,antialias:true}
});

function switchLevel(key){
  game.scene.stop('Workshop');
  game.scene.stop('Foundry');
  document.querySelector('#levelTitle').textContent =
    key === 'Foundry' ? 'THE COUNTERWEIGHT FOUNDRY / LEVEL 02' : 'THE FORGOTTEN WORKSHOP / LEVEL 01';
  document.querySelector('#victory').classList.remove('visible');
  document.querySelector('#level1').setAttribute('aria-pressed', String(key==='Workshop'));
  document.querySelector('#level2').setAttribute('aria-pressed', String(key==='Foundry'));
  document.querySelector('#victory .victory-card>span').textContent='LEVEL 01 COMPLETE';
  document.querySelector('#victory .victory-card h1').textContent='Built together.';
  document.querySelector('#victory .victory-card p').textContent='One block. Two jobs. Two heroes through the door.';
  game.scene.start(key);
}

document.querySelector('#level1').addEventListener('click',()=>switchLevel('Workshop'));
document.querySelector('#level2').addEventListener('click',()=>switchLevel('Foundry'));