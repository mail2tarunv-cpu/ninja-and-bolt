import Phaser from 'phaser';
import { TEMPLE_LAYOUT as L } from './temple-layout.js';

/**
 * LEVEL 03 — TEMPLE OF BALANCE
 * Original cooperative puzzle layout informed by classic dual-character
 * platformers. All geometry in world px. No external art or source assets.
 *
 * Solution:
 * 1. Bolt weighs left end of seesaw A, Ninja jumps from raised right end.
 * 2. Ninja pulls the high switch to open the first gate.
 * 3. Bolt installs wheel and rope, experiments with basket weights.
 * 4. Heavy counterweight raises lift; Ninja reaches high switch B.
 * 5. Switch B opens passage to zone C and releases a buildable plank.
 * 6. Bolt installs plank on pivot B, weighs down its left end.
 * 7. Ninja jumps to upper lever C, opening the exit; both reunite.
 */

const palette={
  bg:0x152536,stone:0x576d80,edge:0xa9bbc4,steel:0x889aaa,gold:0xe8c285,
  pink:0xc66d80,green:0x97d9b4,blue:0x8fd2df,wood:0xc8a171
};
const clamp=Phaser.Math.Clamp;
const near=(a,b,r=90)=>Math.hypot(a.x-b.x,a.y-b.y)<r;
const cstr=(n)=>'#'+n.toString(16).padStart(6,'0');

export class Temple extends Phaser.Scene{
  constructor(){super({key:'Temple'});}
  create(){
    this.physics.world.setBounds(0,0,L.width,L.height);
    this.cameras.main.setBounds(0,0,L.width,L.height).setZoom(1).setScroll(0,0);
    this.makeTextures();this.makeAtmosphere();
    this.terrain=this.physics.add.staticGroup();
    this.platform(0,L.ground,L.width,110);
    this.platform(L.first.ledgeX,L.first.ledgeY,230,23);
    this.platform(L.machine.upperX,L.machine.upperY,230,25);
    this.platform(L.second.ledgeX,L.second.ledgeY,208,24);
    this.platform(1175,529,110,17); // optional lower route
    this.buildSeesaw('first',true);
    this.buildSeesaw('second',false);
    this.buildMachinery();this.buildPlayers();this.makeInputs();this.makeLabels();
    this.state={
      gate1:false,gate2:false,gate3:false,carried:null,
      wheel:false,rope:false,heavy:false,light:false,
      loaded:null,done:false
    };
    this.cameraMode='follow';this.lastNotice=0;
    this.jumpState={n:{lastGround:-10000,lastPress:-10000},
      b:{lastGround:-10000,lastPress:-10000}};
    const restart=()=>this.scene.restart();
    const hint=()=>this.hint();
    this.input.keyboard.on('keydown-R',restart);
    this.input.keyboard.on('keydown-H',hint);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      this.input.keyboard.off('keydown-R',restart);
      this.input.keyboard.off('keydown-H',hint);
    });
    document.querySelector('#restart').onclick=restart;
    document.querySelector('#hint').onclick=hint;
    document.querySelector('#victory').classList.remove('visible');
    document.querySelector('#victory button').onclick=restart;
    this.hud();this.notify('Reach both exit doors. The machines are part of the puzzle.');
  }

  makeTextures(){
    const g=this.make.graphics({x:0,y:0});
    const gen=(k,w,h,draw)=>{if(this.textures.exists(k))return;g.clear();draw(g);g.generateTexture(k,w,h);};
    gen('temple-ninja',54,70,g=>{
      g.fillStyle(0x23303d);g.fillRoundedRect(13,36,28,32,7);
      g.fillStyle(0xf5e9dd);g.fillEllipse(27,22,44,39);
      g.fillTriangle(7,14,5,0,24,14);g.fillTriangle(31,14,48,0,48,19);
      g.fillStyle(0x1c2630);g.fillEllipse(18,21,7,12);g.fillEllipse(36,21,7,12);
      g.fillStyle(palette.pink);g.fillRoundedRect(8,37,38,10,4);
      g.fillTriangle(7,41,0,56,27,44);
    });
    gen('temple-bolt',76,84,g=>{
      g.fillStyle(0x565563);g.fillRoundedRect(9,33,58,45,9);
      g.fillStyle(0xcbb99f);g.fillRoundedRect(13,12,50,59,14);
      g.fillStyle(0x22303c);g.fillRoundedRect(18,21,40,26,10);
      g.fillStyle(0xffd58d);g.fillCircle(30,34,5);g.fillCircle(46,34,5);
      g.fillStyle(0x8f9699);g.fillRoundedRect(0,39,15,25,7);g.fillRoundedRect(61,39,15,25,7);
      g.fillStyle(0x414a56);g.fillRoundedRect(16,69,22,14,4);g.fillRoundedRect(41,69,22,14,4);
      g.fillStyle(0x92ae85);g.fillEllipse(39,6,15,8);
    });
    gen('temple-wheel',57,57,g=>{
      g.fillStyle(0x31414e);g.fillCircle(28.5,28.5,28);
      g.lineStyle(6,0xe0c18c);g.strokeCircle(28.5,28.5,21);
      g.lineStyle(3,0x91a0ae);for(let i=0;i<8;i++){let a=i*Math.PI/4;
        g.lineBetween(28.5,28.5,28.5+Math.cos(a)*20,28.5+Math.sin(a)*20);}
      g.fillStyle(0xf7d69a);g.fillCircle(28.5,28.5,7);
    });
    gen('temple-rope',60,53,g=>{g.fillStyle(0x665b54);g.fillRoundedRect(5,5,50,43,8);
      g.lineStyle(4,0xdac59f);for(let i=0;i<4;i++)g.strokeEllipse(30,27,43-i*8,32-i*5);});
    gen('temple-light',56,52,g=>{g.fillStyle(0x8cabb5);g.fillRoundedRect(3,3,50,46,7);
      g.lineStyle(3,0xd5e4df);g.strokeRoundedRect(7,7,42,38,5);g.fillStyle(0xe9f3e9);g.fillCircle(28,26,8);});
    gen('temple-heavy',76,70,g=>{g.fillStyle(0xab906d);g.fillRoundedRect(2,2,72,66,6);
      g.lineStyle(4,0x655140);g.strokeRoundedRect(7,7,62,56,5);
      g.lineBetween(12,12,64,59);g.lineBetween(64,12,12,59);
      g.fillStyle(0xf0d5a3);g.fillCircle(38,35,8);});
    gen('temple-plank',182,23,g=>{g.fillStyle(0xb48c60);g.fillRoundedRect(2,2,178,19,4);
      g.lineStyle(3,0xead4a4);g.strokeRoundedRect(3,3,176,17,4);
      for(let i=20;i<172;i+=28)g.lineBetween(i,4,i+10,19);});
    gen('temple-seg',23,13,g=>{g.fillStyle(0xc9aa7b);g.fillRoundedRect(0,0,23,13,2);});
    gen('temple-lift',190,20,g=>{g.fillStyle(0xa38d74);g.fillRoundedRect(0,0,190,20,4);
      g.lineStyle(3,0xe1cc9f);g.strokeRoundedRect(3,3,184,14,2);});
    gen('temple-gate',46,620,g=>{g.fillStyle(0x944e60);g.fillRoundedRect(0,0,46,620,5);
      g.lineStyle(3,0xe998a4);for(let i=8;i<46;i+=11)g.lineBetween(i,0,i,619);
      for(let y=60;y<620;y+=75)g.lineBetween(3,y,43,y);});
    gen('temple-door',120,165,g=>{g.fillStyle(0x778b97);g.fillRoundedRect(2,2,116,163,48);
      g.fillStyle(0x273747);g.fillRoundedRect(11,10,98,154,36);
      g.lineStyle(4,0xf1d195);g.strokeRoundedRect(11,10,98,154,36);
      g.fillStyle(0xffe5a6,.50);g.fillEllipse(60,92,60,105);});
    g.destroy();
  }

  makeAtmosphere(){
    const g=this.add.graphics().setDepth(-30);
    g.fillGradientStyle(0x18283a,0x203449,0x34485c,0x344b59,1);
    g.fillRect(0,0,L.width,L.height);
    for(let i=0;i<24;i++){
      let x=i*130-20,y=170+(i%4)*30;
      g.fillStyle(0xc6cdd8,.065);g.fillRoundedRect(x,y,69,470,26);
      g.lineStyle(11,0xb9c8d0,.06);g.strokeRoundedRect(x-18,y-92,110,170,50);
    }
    g.lineStyle(8,0xbcae91,.09);
    for(let x=130;x<L.width;x+=440)g.lineBetween(x,0,x+80,160);
    for(let i=0;i<48;i++)this.add.circle(35+i*64,135+(i%7)*45,1.6,0xffd8a1,.29).setDepth(-10);
    const lines=this.add.graphics().setDepth(-5);
    lines.lineStyle(2,0xa8bfcd,.13);
    lines.lineBetween(L.first.switchX,333,L.machine.gate1,333);
    lines.lineBetween(L.machine.switchX,276,L.second.gate2,276);
    lines.lineBetween(L.second.switchX,333,L.exitGate,333);
  }
  platform(x,top,w,h){
    const ob=this.add.rectangle(x+w/2,top+h/2,w,h,palette.stone).setStrokeStyle(1,0x3b5063).setDepth(3);
    this.terrain.add(ob);ob.body.updateFromGameObject();
    this.add.rectangle(x+w/2,top+4,w,7,palette.edge).setDepth(4);
  }
  buildSeesaw(key,alreadyBuilt){
    const d=L[key],plank=this.add.rectangle(d.x,d.y,d.span,17,palette.wood)
      .setStrokeStyle(3,0x69533d).setDepth(8).setVisible(alreadyBuilt);
    const triangle=this.add.triangle(d.x,605,0,30,30,0,60,30,0x90a0a8)
      .setStrokeStyle(2,palette.gold).setDepth(8);
    const pad=this.add.rectangle((d.padMin+d.padMax)/2,613,d.padMax-d.padMin,12,palette.gold,.38)
      .setStrokeStyle(2,palette.gold,.75).setDepth(5);
    const segments=[];
    for(let i=0;i<15;i++){
      const offset=-161+i*23;
      const seg=this.physics.add.staticImage(d.x+offset,d.y,'temple-seg').setVisible(false);
      seg.body.checkCollision.left=false;seg.body.checkCollision.right=false;seg.body.checkCollision.down=false;
      if(!alreadyBuilt)seg.disableBody(true,true);
      segments.push({offset,seg});
    }
    this[key+'Board']={...d,plank,triangle,pad,segments,angle:0,ready:alreadyBuilt};
    if(!alreadyBuilt){
      this.loosePlank=this.add.image(d.plankX,GROUND_Y(23),'temple-plank').setDepth(11);
      this.pivotHalo=this.add.circle(d.x,d.y,28,palette.gold,.10)
        .setStrokeStyle(2,palette.gold,.75).setDepth(5);
    }
  }
  buildMachinery(){
    const lever=(x,y)=>({
      plate:this.add.rectangle(x,y,29,19,palette.gold).setDepth(11),
      arm:this.add.rectangle(x+7,y-23,7,30,palette.gold).setAngle(-26).setDepth(11),
      x,y
    });
    this.lever1=lever(L.first.switchX,329);
    this.lever2=lever(L.machine.switchX,275);
    this.lever3=lever(L.second.switchX,329);
    this.gate1=this.physics.add.staticImage(L.machine.gate1,310,'temple-gate').setDepth(12);
    this.gate2=this.physics.add.staticImage(L.second.gate2,310,'temple-gate').setDepth(12);
    this.gate3=this.physics.add.staticImage(L.exitGate,310,'temple-gate').setDepth(12);
    // Loose construction pieces always stay visible and can be picked up again.
    const at=(key,x,dy)=>this.add.image(x,GROUND_Y(dy),'temple-'+key).setDepth(11);
    this.parts={
      wheel:at('wheel',1120,57),rope:at('rope',1220,53),
      light:at('light',1320,52),heavy:at('heavy',1410,70)
    };
    this.installPad=this.add.rectangle(1500,600,116,28,palette.gold,.23)
      .setStrokeStyle(2,palette.gold,.8).setDepth(5);
    this.installWheel=this.add.image(1510,196,'temple-wheel').setVisible(false).setDepth(10);
    this.ropeGraphic=this.add.graphics().setDepth(6);
    this.lift=this.physics.add.image(L.machine.liftX,520,'temple-lift')
      .setImmovable(true).setAllowGravity(false).setDepth(9);
    this.lift.body.setSize(188,20);this.lift.setPushable(false).setMaxVelocity(0,110);
    this.basket=this.add.rectangle(L.machine.basketX,380,95,17,0xc3a377)
      .setStrokeStyle(2,palette.gold).setDepth(9);
    this.basketWeight=this.add.image(L.machine.basketX,345,'temple-heavy')
      .setScale(.65).setDepth(10).setVisible(false);
    this.liftLabel=this.add.text(1432,423,'LIFT  /  LOW',{fontFamily:'Arial',fontSize:'13px',color:'#b8dbe4'}).setDepth(13);
    this.weightLabel=this.add.text(1643,465,'0 / 3 WEIGHT',{fontFamily:'Arial',fontSize:'13px',color:'#efce98'}).setDepth(13);
    this.exit=this.add.image(L.exitX,L.ground-81,'temple-door').setDepth(9);
    this.carryVisual=this.add.image(0,0,'temple-heavy').setVisible(false).setDepth(17);
    this.prompt=this.add.text(0,0,'',{fontFamily:'Arial',fontSize:'14px',fontStyle:'bold',
      color:'#ffe4ac',backgroundColor:'#203144',padding:{x:9,y:6}}).setDepth(25).setVisible(false);
  }
  buildPlayers(){
    this.ninja=this.physics.add.sprite(88,L.ground-35,'temple-ninja')
      .setSize(34,60).setDepth(16).setCollideWorldBounds(true);
    this.bolt=this.physics.add.sprite(160,L.ground-42,'temple-bolt')
      .setSize(63,72).setDepth(16).setCollideWorldBounds(true);
    this.ninja.setMaxVelocity(260,800).setDragX(900);
    this.bolt.setMaxVelocity(205,800).setDragX(950);
    for(const p of [this.ninja,this.bolt]){
      this.physics.add.collider(p,this.terrain);
      for(const board of [this.firstBoard,this.secondBoard]){
        for(const seg of board.segments)this.physics.add.collider(p,seg.seg);
      }
      for(const gate of [this.gate1,this.gate2,this.gate3])this.physics.add.collider(p,gate);
      this.physics.add.collider(p,this.lift);
    }
  }
  makeInputs(){
    this.keys=this.input.keyboard.addKeys({nl:'A',nr:'D',nj:'W',ni:'F',
      bl:'LEFT',br:'RIGHT',bj:'UP',bi:'ENTER'});
    this.input.keyboard.addCapture(['UP','DOWN','LEFT','RIGHT','SPACE']);
  }
  makeLabels(){
    const t=(x,y,label,size=14,color=palette.gold)=>this.add.text(x,y,label,
      {fontSize:size+'px',fontFamily:'Arial',fontStyle:'bold',color:cstr(color)}).setDepth(13);
    t(36,244,'TEMPLE OF BALANCE',29);
    t(40,287,'Two characters. Three chambers. One way out.',15,0xb9cfda);
    t(322,492,'01 · BALANCE',14);
    t(717,316,'SWITCH A',12);
    t(1081,516,'WHEEL',12);t(1183,515,'ROPE',12);
    t(1286,513,'LIGHT',12);t(1380,503,'HEAVY',12);
    t(1420,553,'ASSEMBLE',12);
    t(1670,490,'BASKET',12);
    t(1759,255,'SWITCH B',12);
    t(2168,490,'02 · REBUILD',14);
    t(2583,319,'SWITCH C',12);
    t(2840,438,'EXIT',16);
    this.infoTag=this.add.text(0,0,'',{fontSize:'12px',fontFamily:'Arial',
      color:'#e8c997',backgroundColor:'#263748',padding:{x:7,y:5}}).setDepth(13).setVisible(false);
  }
  notify(message){
    const node=document.getElementById('toast');
    node.textContent=message;node.classList.add('show');
    if(this.toastTimer)this.toastTimer.remove(false);
    this.toastTimer=this.time.delayedCall(2600,()=>node.classList.remove('show'));
  }
  hud(){
    const s=this.state;
    const label=s.done?'TEMPLE CLEARED':s.gate3?'EXIT UNLOCKED':s.gate2?'THE SECOND BALANCE':s.gate1?'THE COUNTERWEIGHT CHAMBER':'THE FIRST BALANCE';
    document.getElementById('objective').textContent=label;
    document.getElementById('step').textContent=s.done?'✓':s.gate3?'04 / 04':s.gate2?'03 / 04':s.gate1?'02 / 04':'01 / 04';
  }
  hint(){
    const s=this.state;
    const text=!s.gate1?'Bolt is much heavier. Put Bolt on the left gold pad while Ninja jumps from the right end of the seesaw.':
      !s.wheel||!s.rope?'Bolt can install the loose wheel and rope at the marked assembly bench.':
      s.loaded!=='heavy'?'A light weight changes the lift height, but only the heavy counterweight gets Ninja to the upper walkway.':
      !s.gate2?'Ninja rides the lift to Switch B, which opens the passage to the next chamber.':
      !this.secondBoard.ready?'Bolt must carry the loose plank to the second pivot before either player can use it.':
      !s.gate3?'Bolt weighs down the left end of the second seesaw so Ninja can reach Switch C.':
      'Both heroes must stand beside the glowing exit.';
    this.notify(text);
  }
  pressedLever(l){
    l.arm.setAngle(32).setFillStyle(palette.green);
    this.add.circle(l.x,l.y,27,palette.green,.18).setDepth(6);
  }
  interactNinja(){
    const s=this.state;
    if(!s.gate1&&near(this.ninja,this.lever1,90)){
      s.gate1=true;this.gate1.disableBody(true,true);this.pressedLever(this.lever1);
      this.notify('Gate A opened. The middle machine is now accessible.');this.hud();
    }else if(!s.gate2&&near(this.ninja,this.lever2,94)&&s.loaded==='heavy'){
      s.gate2=true;this.gate2.disableBody(true,true);this.pressedLever(this.lever2);
      this.notify('Gate B opened. The second seesaw can now be rebuilt.');this.hud();
    }else if(!s.gate3&&near(this.ninja,this.lever3,90)){
      s.gate3=true;this.gate3.disableBody(true,true);this.pressedLever(this.lever3);
      this.notify('The exit is unlocked. Get both characters to the door.');this.hud();
    }else if(!s.gate2&&near(this.ninja,this.lever2,94)){
      this.notify('This switch needs a fully raised lift. Try another counterweight.');
    }
  }
  choosePart(){
    const options=Object.entries(this.parts).filter(([k,o])=>o.visible
      && !(k==='wheel'&&this.state.wheel) && !(k==='rope'&&this.state.rope))
      .map(([key,part])=>({key,part,d:Math.abs(this.bolt.x-part.x)}))
      .filter(c=>c.d<115).sort((a,b)=>a.d-b.d);
    return options[0]?.key??null;
  }
  pickup(key){
    this.state.carried=key;
    const item=key==='plank'?this.loosePlank:this.parts[key];
    item.setVisible(false);
    this.carryVisual.setTexture(key==='plank'?'temple-plank':'temple-'+key)
      .setScale(key==='plank'?.82:.85).setVisible(true);
  }
  drop(){
    const key=this.state.carried;
    if(!key)return;
    const item=key==='plank'?this.loosePlank:this.parts[key];
    const x=clamp(this.bolt.x+(this.bolt.flipX?-82:82),1080,L.exitGate-80);
    item.setPosition(x,GROUND_Y(key==='plank'?23:key==='heavy'?70:key==='wheel'?57:53)).setVisible(true);
    this.carryVisual.setVisible(false);this.state.carried=null;
  }
  installPart(key){
    this.state[key]=true;
    this.state.carried=null;this.carryVisual.setVisible(false);
    if(key==='wheel')this.installWheel.setVisible(true);
    if(this.state.wheel&&this.state.rope){
      this.notify('Pulley connected. Add weight to the hanging basket.');
    }else{
      this.notify(key==='wheel'?'Wheel installed. Still needs rope.':'Rope threaded. Still needs a wheel.');
    }
  }
  loadWeight(key){
    const s=this.state;
    if(s.loaded){
      this.notify('The basket is occupied. Remove its load before switching weights.');
      return;
    }
    s.loaded=key;s.carried=null;this.carryVisual.setVisible(false);
    this.basketWeight.setTexture('temple-'+key).setVisible(true);
    this.notify(key==='heavy'?'Heavy weight loaded. Watch the lift climb.':'Light weight loaded. The lift rises only partway.');
  }
  interactBolt(){
    const s=this.state;
    if(s.carried==='plank'){
      if(s.gate2&&Math.abs(this.bolt.x-this.secondBoard.x)<120){
        const b=this.secondBoard;b.ready=true;b.plank.setVisible(true);
        for(const {offset,seg} of b.segments){
          seg.enableBody(false,b.x+offset,b.y,true,false);seg.refreshBody();
        }
        this.pivotHalo.setVisible(false);
        s.carried=null;this.carryVisual.setVisible(false);
        this.notify('Seesaw B assembled. Who should weigh down its left side?');
      }else this.drop();
      return;
    }
    if(s.carried==='wheel'||s.carried==='rope'){
      if(this.bolt.x>1415&&this.bolt.x<1570)this.installPart(s.carried);
      else this.drop();
      return;
    }
    if(s.carried==='light'||s.carried==='heavy'){
      if(this.bolt.x>1630&&this.bolt.x<1770&&s.wheel&&s.rope)this.loadWeight(s.carried);
      else this.drop();
      return;
    }
    if(s.wheel&&s.rope&&s.loaded&&this.bolt.x>1630&&this.bolt.x<1770){
      const old=s.loaded;
      s.loaded=null;this.basketWeight.setVisible(false);
      this.parts[old].setPosition(1695,GROUND_Y(old==='heavy'?70:52)).setVisible(true);
      this.notify('Counterweight detached. You can test a different load.');
      return;
    }
    if(s.gate2&&!this.secondBoard.ready&&this.loosePlank.visible&&Math.abs(this.bolt.x-this.loosePlank.x)<130){
      this.pickup('plank');return;
    }
    const available=this.choosePart();
    if(available){this.pickup(available);return;}
    if(this.bolt.x>1415&&this.bolt.x<1570&&!s.wheel&&!s.rope){
      this.notify('Find the loose gear wheel and spool of rope.');
    }
  }

  move(hero,left,right,jump,speed,power,mem,dt){
    const body=hero.body;
    if(body.blocked.down||body.touching.down)mem.lastGround=this.time.now;
    if(Phaser.Input.Keyboard.JustDown(jump))mem.lastPress=this.time.now;
    const target=left.isDown?-speed:right.isDown?speed:0;
    const step=1750*dt/1000,old=body.velocity.x;
    hero.setVelocityX(old<target?Math.min(old+step,target):Math.max(old-step,target));
    if(left.isDown||right.isDown)hero.setFlipX(left.isDown);
    if(this.time.now-mem.lastPress<135&&this.time.now-mem.lastGround<115){
      hero.setVelocityY(-power);mem.lastPress=-10000;mem.lastGround=-10000;
    }
  }

  updateBoards(){
    for(const board of [this.firstBoard,this.secondBoard]){
      if(!board.ready)continue;
      // Left gold pad is the counterweight footing. This deliberate contact
      // region is more reliable than requiring pixel-perfect plank contact.
      const weighted=this.bolt.x>board.padMin&&this.bolt.x<board.padMax
        &&this.bolt.y>500&&this.bolt.y<620;
      const target=weighted?L.tiltAngle:0;
      board.angle=Phaser.Math.Linear(board.angle,target,.075);
      board.plank.setRotation(board.angle);
      for(const {offset,seg} of board.segments){
        seg.setPosition(board.x+offset,board.y+Math.tan(board.angle)*offset).refreshBody();
      }
      board.pad.setFillStyle(weighted?palette.green:palette.gold,weighted?.5:.25);
    }
  }
  updatePulley(){
    const s=this.state;
    const ready=s.wheel&&s.rope;
    const target=ready?(s.loaded==='heavy'?L.liftHighY:s.loaded==='light'?L.liftMidY:520):520;
    const v=(target-this.lift.y)*2.25;
    this.lift.setVelocityY(Math.abs(v)<3?0:clamp(v,-110,110));
    const liftRise=520-this.lift.y;
    const basketY=380+liftRise;
    this.basket.setY(basketY);
    this.basketWeight.setPosition(L.machine.basketX,basketY-29);
    this.ropeGraphic.clear();
    if(s.wheel){
      if(s.rope){
        this.ropeGraphic.lineStyle(4,0xe6c998,1);
        this.ropeGraphic.beginPath().moveTo(1540,this.lift.y-12)
          .lineTo(1540,190).lineTo(1490,169).lineTo(1515,169)
          .lineTo(1695,191).lineTo(1695,basketY-8).strokePath();
        this.installWheel.rotation+=Math.abs(this.lift.body.velocity.y)>1?.007:0;
      }else{
        this.ropeGraphic.lineStyle(3,0xe6c998,.28).lineBetween(1490,171,1530,207);
      }
    }
    this.liftLabel.setText(s.loaded==='heavy'?'LIFT  /  HIGH':s.loaded==='light'?'LIFT  /  MID':'LIFT  /  LOW');
    this.weightLabel.setText(s.loaded==='heavy'?'3 / 3 WEIGHT':s.loaded==='light'?'1 / 3 WEIGHT':'0 / 3 WEIGHT');
  }
  updatePrompt(){
    const s=this.state;
    this.prompt.setVisible(false);
    const show=(hero,label)=>this.prompt.setText(label).setPosition(hero.x-76,hero.y-110).setVisible(true);
    if(!s.gate1&&near(this.ninja,this.lever1,88))show(this.ninja,'F · Pull switch A');
    else if(!s.gate2&&near(this.ninja,this.lever2,94))show(this.ninja,'F · Switch B');
    else if(!s.gate3&&near(this.ninja,this.lever3,88))show(this.ninja,'F · Switch C');
    else if(s.carried==='plank'&&Math.abs(this.bolt.x-this.secondBoard.x)<120)
      show(this.bolt,'ENTER · Build seesaw');
    else if((s.carried==='wheel'||s.carried==='rope')&&this.bolt.x>1415&&this.bolt.x<1570)
      show(this.bolt,'ENTER · Install part');
    else if((s.carried==='light'||s.carried==='heavy')&&this.bolt.x>1630&&this.bolt.x<1770)
      show(this.bolt,'ENTER · Add counterweight');
    else if(s.carried)show(this.bolt,'ENTER · Put down');
    else if(s.loaded&&this.bolt.x>1630&&this.bolt.x<1770)show(this.bolt,'ENTER · Remove load');
    else if(s.gate2&&!this.secondBoard.ready&&this.loosePlank.visible&&Math.abs(this.bolt.x-this.loosePlank.x)<135)
      show(this.bolt,'ENTER · Pick up plank');
    else if(this.choosePart())show(this.bolt,'ENTER · Carry component');
  }
  update(_t,dt){
    if(this.state.done)return;
    this.move(this.ninja,this.keys.nl,this.keys.nr,this.keys.nj,L.ninjaRunSpeed,L.ninjaJumpVelocity,this.jumpState.n,dt);
    this.move(this.bolt,this.keys.bl,this.keys.br,this.keys.bj,205,375,this.jumpState.b,dt);
    if(Phaser.Input.Keyboard.JustDown(this.keys.ni))this.interactNinja();
    if(Phaser.Input.Keyboard.JustDown(this.keys.bi))this.interactBolt();
    this.updateBoards();
    this.updatePulley();
    this.updatePrompt();
    if(this.state.carried){
      this.carryVisual.setPosition(this.bolt.x+(this.bolt.flipX?-66:66),this.bolt.y-66);
    }
    // Recover falling heroes near their last opened gate; the level never
    // irreversibly consumes a construction piece.
    for(const [hero,diff] of [[this.ninja,0],[this.bolt,75]]){
      if(hero.y>700){
        let x=this.state.gate2?2075:this.state.gate1?1020:90;
        hero.setPosition(x+diff,L.ground-(hero===this.bolt?42:35)).setVelocity(0,0);
        this.notify('Recovered on safe ground.');
      }
    }
    if(this.state.gate3&&this.ninja.x>2837&&this.bolt.x>2837){
      this.state.done=true;this.physics.pause();this.hud();
      document.querySelector('#victory .victory-card>span').textContent='LEVEL 03 COMPLETE';
      document.querySelector('#victory .victory-card h1').textContent='Balance mastered.';
      document.querySelector('#victory .victory-card p').textContent='Both seesaws solved, pulley assembled, and every gate opened together.';
      document.querySelector('#victory').classList.add('visible');
      return;
    }
    // A shared camera always includes both heroes; zoom is capped to keep
    // visual guidance and collision expectations readable.
    const separation=Math.abs(this.ninja.x-this.bolt.x);
    const zoom=clamp(1-Math.max(0,separation-600)/1800,.78,1);
    this.cameras.main.setZoom(Phaser.Math.Linear(this.cameras.main.zoom,zoom,.05));
    const width=1280/this.cameras.main.zoom;
    const focus=(this.ninja.x+this.bolt.x)/2;
    const targetX=clamp(focus-width/2,0,L.width-width);
    this.cameras.main.scrollX=Phaser.Math.Linear(this.cameras.main.scrollX,targetX,.075);
  }
}
function GROUND_Y(h){return L.ground-h/2;}
