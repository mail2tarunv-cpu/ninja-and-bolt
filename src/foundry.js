import Phaser from 'phaser';

// Level 02: a playable construction-mechanics test level.
// The seesaw is a kinematic, weight-driven platform; the pulley uses
// rule-based counterweight balancing rather than unrestricted rope physics.
const WIDTH=2420, GROUND=610;
const K={stone:0x627789,edge:0xb0c1c5,gold:0xeecb88,cyan:0x8dd7df,green:0x93d8ac,red:0xc7767a};
const close=(a,b,n=100)=>Math.hypot(a.x-b.x,a.y-b.y)<n;
const hsl=(v)=>'#'+v.toString(16).padStart(6,'0');
const baseY=(h)=>GROUND-h/2;

export class Foundry extends Phaser.Scene {
  constructor(){super('Foundry');}
  create(){
    this.physics.world.setBounds(0,0,WIDTH,720);
    this.cameras.main.setBounds(0,0,WIDTH,720);
    this.cameras.main.setBackgroundColor('#152534');
    this.makePartTextures();
    this.drawBackdrop();
    this.solids=this.physics.add.staticGroup();
    this.platform(0,GROUND,WIDTH,110);
    this.platform(712,420,242,22);
    this.platform(1435,345,310,24);
    this.platform(2050,514,98,18);
    this.makeSeesaw();
    this.makePulley();
    this.makeHeroes();
    this.makeControls();
    this.makeAnnotations();
    this.state={switchOn:false,carried:null,wheelInstalled:false,ropeInstalled:false,
      loaded:{light:false,heavy:false},exitOpen:false,completed:false,loadedWeight:0};
    this.hintStage=0;
    document.querySelector('#restart').onclick=()=>this.scene.restart();
    document.querySelector('#hint').onclick=()=>this.showHint();
    document.querySelector('#victory').classList.remove('visible');
    document.querySelector('#victory button').onclick=()=>this.scene.restart();
    this.displayHud();
    this.toast('Two machines are missing their power. Discover how they work.');
  }
  makePartTextures(){
    const g=this.make.graphics({x:0,y:0});
    const make=(name,w,h,draw)=>{if(this.textures.exists(name))return;g.clear();draw(g);g.generateTexture(name,w,h);};
    make('foundry-wheel',54,54,g=>{g.fillStyle(0x303c4b);g.fillCircle(27,27,26);
      g.lineStyle(7,0xd4b889);g.strokeCircle(27,27,19);g.lineStyle(4,0x9babb4);
      for(let n=0;n<6;n++){const a=n*Math.PI/3;g.lineBetween(27,27,27+Math.cos(a)*19,27+Math.sin(a)*19);}
      g.fillStyle(0xeacb88);g.fillCircle(27,27,6);});
    make('foundry-rope',57,47,g=>{g.fillStyle(0x6b5549);g.fillRoundedRect(3,3,51,41,8);
      g.fillStyle(0xbd9870);g.fillEllipse(28,23,38,30);g.lineStyle(3,0xf2d39f);
      for(let i=0;i<4;i++)g.strokeEllipse(28,23,38-i*8,28-i*5);});
    make('foundry-light',49,47,g=>{g.fillStyle(0x9db4b8);g.fillRoundedRect(2,2,45,43,6);
      g.lineStyle(3,0x55707e);g.strokeRoundedRect(5,5,39,37,5);g.fillStyle(0xd9e2d6);g.fillCircle(25,23,8);});
    make('foundry-heavy',69,68,g=>{g.fillStyle(0xae997a);g.fillRoundedRect(2,2,65,64,7);
      g.lineStyle(4,0x5f5349);g.strokeRoundedRect(8,8,53,52,4);
      g.lineBetween(14,13,55,54);g.lineBetween(55,13,14,54);
      g.fillStyle(0xf3d89d);g.fillCircle(35,35,9);});
    make('foundry-lift',190,26,g=>{g.fillStyle(0x9b8567);g.fillRoundedRect(2,3,186,20,5);
      g.lineStyle(4,0xe5ca95);g.strokeRoundedRect(3,4,184,18,5);
      for(let i=20;i<180;i+=36)g.lineBetween(i,5,i+15,22);});
    make('foundry-door',112,156,g=>{g.fillStyle(0x6d8392);g.fillRoundedRect(0,0,112,156,40);
      g.fillStyle(0x2d3948);g.fillRoundedRect(9,8,94,144,34);
      g.lineStyle(4,0xe3be86);g.strokeRoundedRect(9,8,94,144,34);
      g.fillStyle(0xe6c892,0.3);g.fillEllipse(56,94,62,88);});
    make('foundry-bar',28,16,g=>{g.fillStyle(0x93785c);g.fillRoundedRect(1,1,26,14,3);});
    g.destroy();
  }
  drawBackdrop(){
    const g=this.add.graphics().setDepth(-25);
    g.fillGradientStyle(0x152534,0x20394b,0x2b4053,0x394654,1);
    g.fillRect(0,0,WIDTH,720);
    for(let i=0;i<18;i++){
      const x=i*150-45;
      g.fillStyle(0xbec8ce,0.055);g.fillRoundedRect(x,90+(i%3)*33,100,580,30);
      g.lineStyle(12,0xcfd0cb,0.08);g.strokeRoundedRect(x-17,180+(i%3)*26,130,150,50);
    }
    for(let i=0;i<26;i++)this.add.circle(24+i*92,190+(i%5)*42,2,0xf7d6a5,0.29).setDepth(-10);
  }
  platform(x,y,w,h){
    const rect=this.add.rectangle(x+w/2,y+h/2,w,h,K.stone).setDepth(3);
    rect.setStrokeStyle(1,0x304456);
    this.solids.add(rect);
    rect.body.updateFromGameObject();
    this.add.rectangle(x+w/2,y+3,w,6,K.edge).setDepth(4);
  }
  makeSeesaw(){
    this.pivot={x:505,y:559};
    this.angle=0;this.targetAngle=0;
    this.plank=this.add.rectangle(this.pivot.x,this.pivot.y,342,18,0xd6ad76).setStrokeStyle(3,0x826247).setDepth(9);
    this.add.triangle(this.pivot.x,590,0,30,28,0,56,30,0x788898).setStrokeStyle(2,K.gold).setDepth(8);
    this.segments=[];
    for(let i=0;i<15;i++){
      const dx=-161+i*23;
      const seg=this.physics.add.staticImage(this.pivot.x+dx,this.pivot.y,'foundry-bar');
      seg.setDisplaySize(25,13).refreshBody().setVisible(false);
      seg.body.checkCollision.left=false;
      seg.body.checkCollision.right=false;
      seg.body.checkCollision.down=false;
      this.segments.push({dx,seg});
    }
    this.torqueText=this.add.text(366,488,'',{fontSize:'13px',fontFamily:'Arial',color:'#e9c997'}).setDepth(13);
    this.tiltIndicator=this.add.text(337,512,'BOLT’S WEIGHT CAN TILT THE PLANK',{fontSize:'11px',color:'#a9c0d1'}).setDepth(13);
  }
  makePulley(){
    this.switch=this.add.rectangle(845,394,26,24,0xf0c67e).setDepth(11);
    this.switchArm=this.add.rectangle(845,374,8,30,0xeec988).setAngle(-27).setDepth(11);
    this.accessGate=this.physics.add.staticImage(958,415,'gate').setDisplaySize(44,390).refreshBody().setDepth(10);
    // Wheel and rope must be carried individually and installed at the machine.
    this.partPositions={
      wheel:{x:1029,y:baseY(54),w:54},
      rope:{x:1110,y:baseY(47),w:57},
      light:{x:1181,y:baseY(47),w:49},
      heavy:{x:1252,y:baseY(68),w:69}
    };
    this.parts={};
    for(const key of Object.keys(this.partPositions)){
      const p=this.partPositions[key];
      this.parts[key]=this.add.image(p.x,p.y,'foundry-'+key).setDepth(10);
    }
    this.assemblyZone=this.add.rectangle(1460,590,115,35,0xc19c6f,0.24).setStrokeStyle(2,0xf2c681).setDepth(6);
    this.add.text(1404,550,'ASSEMBLY BENCH',{fontSize:'12px',fontFamily:'Arial',color:'#e5c38b'}).setDepth(10);
    this.wheelArt=this.add.image(1490,222,'foundry-wheel').setDepth(11).setVisible(false);
    this.lift=this.physics.add.image(1320,564,'foundry-lift').setImmovable(true).setAllowGravity(false).setDepth(8);
    this.lift.body.setSize(182,25);this.lift.setVelocity(0,0);
    this.basket=this.add.rectangle(1670,368,96,18,0xb49b74).setStrokeStyle(2,K.gold).setDepth(8);
    this.basketEdge=this.add.graphics().setDepth(9);
    this.ropes=this.add.graphics().setDepth(6);
    this.basketLabel=this.add.text(1618,515,'COUNTERWEIGHT BASKET',{fontFamily:'Arial',fontSize:'12px',color:'#e6c78c'}).setDepth(13);
    this.assemblyLabel=this.add.text(1348,505,'WHEEL + ROPE',{fontFamily:'Arial',fontSize:'12px',color:'#adc3d0'}).setDepth(13);
    this.exitGate=this.physics.add.staticImage(1905,416,'gate').setDisplaySize(44,390).refreshBody().setDepth(10);
    this.finalSwitch=this.add.rectangle(1616,314,30,20,0xe5c182).setDepth(10);
    this.finalSwitchArm=this.add.rectangle(1616,290,8,29,0xf2d58e).setAngle(-27).setDepth(10);
    this.exit=this.add.image(2290,GROUND-78,'foundry-door').setDepth(8);
    this.liftHeightText=this.add.text(1234,302,'LIFT: LOW',{fontSize:'14px',color:'#a6d1d8',fontFamily:'Arial'}).setDepth(13);
    this.weightText=this.add.text(1618,555,'LOAD: 0',{fontSize:'13px',fontFamily:'Arial',color:'#f5d29b'}).setDepth(13);
    this.loadedIcons=[];
    this.machineReady=false;
  }
  makeHeroes(){
    this.ninja=this.physics.add.sprite(98,GROUND-35,'ninja').setSize(35,60).setDepth(15).setCollideWorldBounds(true);
    this.bolt=this.physics.add.sprite(180,GROUND-41,'bolt').setSize(64,72).setDepth(15).setCollideWorldBounds(true);
    this.ninja.setMaxVelocity(260,680);
    this.bolt.setMaxVelocity(200,680);
    for(const hero of [this.ninja,this.bolt]){
      this.physics.add.collider(hero,this.solids);
      for(const {seg} of this.segments)this.physics.add.collider(hero,seg);
      this.physics.add.collider(hero,this.accessGate);
      this.physics.add.collider(hero,this.exitGate);
      this.physics.add.collider(hero,this.lift);
    }
    this.lift.setPushable(false);
    this.carriedArt=this.add.image(0,0,'foundry-wheel').setDepth(17).setVisible(false);
    this.jump={n:{ground:-1e5,pressed:-1e5},b:{ground:-1e5,pressed:-1e5}};
    this.prompt=this.add.text(0,0,'',{fontSize:'14px',fontFamily:'Arial',color:'#fff2d7',backgroundColor:'#26394c',padding:{x:10,y:6}}).setDepth(30).setVisible(false);
  }
  makeControls(){
    this.keys=this.input.keyboard.addKeys({na:'A',nd:'D',nw:'W',nf:'F',bl:'LEFT',br:'RIGHT',bu:'UP',be:'ENTER'});
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
  makeAnnotations(){
    const txt=(x,y,label,size=13,color=K.gold)=>this.add.text(x,y,label,{fontFamily:'Arial',fontSize:size+'px',fontStyle:'bold',color:hsl(color)}).setDepth(13);
    txt(45,287,'THE COUNTERWEIGHT FOUNDRY',26);
    txt(47,327,'Two machines. Two builders. One way through.',15,0xb8cfdb);
    txt(397,476,'01   SEESAW',14);
    txt(766,368,'HIGH SWITCH',12);
    txt(1025,511,'WHEEL',12);
    txt(1106,501,'ROPE',12);
    txt(1168,511,'LIGHT',12);
    txt(1231,511,'HEAVY',12);
    txt(1449,268,'02   PULLEY',16);
    txt(1586,252,'FINAL SWITCH',12);
    txt(2231,422,'EXIT',15);
  }
  toast(text){
    const el=document.querySelector('#toast');el.textContent=text;el.classList.add('show');
    if(this.toastTimer)this.toastTimer.remove();
    this.toastTimer=this.time.delayedCall(2500,()=>el.classList.remove('show'));
  }
  displayHud(){
    const s=this.state;
    const stage=s.completed?'FOUNDRY COMPLETE':s.exitOpen?'THE EXIT':s.wheelInstalled&&s.ropeInstalled?'BALANCE THE LIFT':s.switchOn?'ASSEMBLE THE PULLEY':'THE HIGH SWITCH';
    document.querySelector('#objective').textContent=stage;
    document.querySelector('#step').textContent=s.completed?'✓':s.exitOpen?'04 / 04':s.wheelInstalled&&s.ropeInstalled?'03 / 04':s.switchOn?'02 / 04':'01 / 04';
  }
  showHint(){
    const s=this.state;
    const text=!s.switchOn?'The plank moves with weight. Can Bolt hold one side while Ninja climbs the other?':
      !(s.wheelInstalled&&s.ropeInstalled)?'Bolt can install the loose wheel and rope at the gold assembly bench.':
      s.loadedWeight<3?'Try loading different weights into the basket. A lighter block only raises the platform partway.':
      !s.exitOpen?'Ninja can ride the lift to the upper walkway and reach the final switch.':'Bring both characters to the exit.';
    this.toast(text);
  }
  ninjaInteract(){
    const s=this.state;
    if(!s.switchOn&&close(this.ninja,this.switch,98)){
      s.switchOn=true;
      this.accessGate.disableBody(true,true);
      this.switchArm.setAngle(30).setFillStyle(K.green);
      this.toast('The storage gate opened. The foundry parts are accessible.');
      this.displayHud();return;
    }
    if(!s.exitOpen&&close(this.ninja,this.finalSwitch,95)){
      s.exitOpen=true;this.exitGate.disableBody(true,true);
      this.finalSwitchArm.setAngle(32).setFillStyle(K.green);
      this.toast('The exit gate is open! Bring Bolt through.');
      this.displayHud();
    }
  }
  pickup(type){
    this.state.carried=type;
    this.parts[type].setVisible(false);
    this.carriedArt.setTexture('foundry-'+type).setScale(type==='heavy'?0.85:0.92).setVisible(true);
  }
  drop(type){
    const x=Phaser.Math.Clamp(this.bolt.x+(this.bolt.flipX?-78:78),970,1795);
    this.parts[type].setPosition(x,baseY(this.partPositions[type].w)).setVisible(true);
    this.state.carried=null;this.carriedArt.setVisible(false);
  }
  install(type){
    this.state[type==='wheel'?'wheelInstalled':'ropeInstalled']=true;
    this.state.carried=null;this.carriedArt.setVisible(false);
    if(type==='wheel')this.wheelArt.setVisible(true);
    if(this.state.wheelInstalled&&this.state.ropeInstalled){
      this.machineReady=true;
      this.toast('Pulley assembled. Try different counterweights in the basket.');
    }else this.toast(type==='wheel'?'Wheel secured. The pulley still needs a rope.':'Rope threaded. The pulley still needs a wheel.');
    this.displayHud();
  }
  load(type){
    this.state.loaded[type]=true;
    this.state.carried=null;this.carriedArt.setVisible(false);
    this.toast(type==='heavy'?'Heavy counterweight attached. Watch the lift rise.':'Light counterweight attached. Observe how far the lift rises.');
  }
  unload(){
    const type=this.state.loaded.light?'light':'heavy';
    this.state.loaded[type]=false;
    const x=Phaser.Math.Clamp(this.bolt.x-80,990,1800);
    this.parts[type].setPosition(x,baseY(this.partPositions[type].w)).setVisible(true);
    this.toast('Counterweight removed. Try a different arrangement.');
  }
  boltInteract(){
    const s=this.state, key=s.carried;
    if(key){
      if((key==='wheel'||key==='rope')&&this.bolt.x>1360&&this.bolt.x<1540){this.install(key);return;}
      if((key==='light'||key==='heavy')&&this.bolt.x>1602&&this.bolt.x<1743&&this.machineReady){this.load(key);return;}
      this.drop(key);return;
    }
    if(this.machineReady&&this.bolt.x>1602&&this.bolt.x<1743&&(s.loaded.light||s.loaded.heavy)){
      this.unload();return;
    }
    const pickable=Object.entries(this.parts)
      .filter(([k,o])=>o.visible&&!((k==='wheel'&&s.wheelInstalled)||(k==='rope'&&s.ropeInstalled)))
      .map(([k,o])=>({type:k,d:Math.abs(this.bolt.x-o.x)}))
      .filter(o=>o.d<100).sort((a,b)=>a.d-b.d)[0];
    if(pickable)this.pickup(pickable.type);
    else this.toast('Bolt can carry parts and install them at the workbench or basket.');
  }
  move(hero,left,right,jump,speed,power,memory,delta){
    const body=hero.body;
    if(body.blocked.down||body.touching.down)memory.ground=this.time.now;
    if(Phaser.Input.Keyboard.JustDown(jump))memory.pressed=this.time.now;
    const target=left.isDown?-speed:right.isDown?speed:0;
    const step=1800*delta/1000;
    const previous=body.velocity.x;
    hero.setVelocityX(previous<target?Math.min(previous+step,target):Math.max(previous-step,target));
    if(left.isDown||right.isDown)hero.setFlipX(left.isDown);
    if(this.time.now-memory.pressed<130&&this.time.now-memory.ground<130){
      hero.setVelocityY(-power);memory.pressed=-1e5;memory.ground=-1e5;
    }
  }
  onBoard(hero){
    const dx=hero.x-this.pivot.x;
    const top=this.pivot.y+Math.tan(this.angle)*dx;
    const feet=hero.body.bottom;
    return Math.abs(dx)<159&&Math.abs(feet-top)<42&&hero.body.velocity.y>=-25;
  }
  updateBoard(){
    // Bolt is ~2.7x the Ninja's effective weight.
    const boltOn=this.onBoard(this.bolt),ninjaOn=this.onBoard(this.ninja);
    const torque=(boltOn?2.7*(this.bolt.x-this.pivot.x):0)+(ninjaOn?1*(this.ninja.x-this.pivot.x):0);
    this.targetAngle=Phaser.Math.Clamp(torque/1100,-0.31,0.31);
    this.angle=Phaser.Math.Linear(this.angle,this.targetAngle,0.06);
    this.plank.setRotation(this.angle);
    for(const {dx,seg} of this.segments){
      seg.setPosition(this.pivot.x+dx,this.pivot.y+Math.tan(this.angle)*dx).refreshBody();
    }
    this.torqueText.setText(Math.abs(this.angle)<0.05?'Balanced':this.angle<0?'Right side rising':'Left side rising');
    this.torqueText.setColor(this.angle<-.13?'#a8e0ba':'#e9c997');
  }
  updateLift(){
    const s=this.state;
    s.loadedWeight=(s.loaded.light?1:0)+(s.loaded.heavy?3:0);
    const ready=s.wheelInstalled&&s.ropeInstalled;
    const goal=!ready?564:s.loadedWeight>=4?340:s.loadedWeight>=3?365:s.loadedWeight>=1?485:564;
    const deltaY=goal-this.lift.y;
    this.lift.setVelocityY(Math.abs(deltaY)<2?0:Phaser.Math.Clamp(deltaY*2.3,-112,112));
    const displacement=564-this.lift.y;
    const basketY=Phaser.Math.Clamp(368+displacement,368,590);
    this.basket.setY(basketY);
    this.basketEdge.clear();
    this.basketEdge.lineStyle(3,0xc8a878).beginPath()
      .moveTo(1623,basketY-2).lineTo(1623,basketY+17).lineTo(1717,basketY+17).lineTo(1717,basketY-2).strokePath();
    this.loadedIcons.forEach(o=>o.destroy());this.loadedIcons=[];
    if(s.loaded.light)this.loadedIcons.push(this.add.image(1650,basketY-22,'foundry-light').setScale(.6).setDepth(10));
    if(s.loaded.heavy)this.loadedIcons.push(this.add.image(1685,basketY-24,'foundry-heavy').setScale(.6).setDepth(10));
    this.ropes.clear();
    if(s.wheelInstalled){
      this.wheelArt.setRotation(this.wheelArt.rotation+(Math.abs(this.lift.body.velocity.y)>.5?.007:0));
      if(ready){
        this.ropes.lineStyle(4,0xdfc59b).beginPath()
          .moveTo(1320,this.lift.y-13).lineTo(1320,226).lineTo(1470,194)
          .lineTo(1510,194).lineTo(1670,228).lineTo(1670,basketY-10).strokePath();
      }
    }
    this.liftHeightText.setText('LIFT: '+(this.lift.y<403?'HIGH':this.lift.y<540?'MID':'LOW'));
    this.weightText.setText('LOAD: '+s.loadedWeight+' UNITS');
  }
  update(_time,delta){
    const s=this.state;if(s.completed)return;
    this.move(this.ninja,this.keys.na,this.keys.nd,this.keys.nw,260,545,this.jump.n,delta);
    this.move(this.bolt,this.keys.bl,this.keys.br,this.keys.bu,195,350,this.jump.b,delta);
    if(Phaser.Input.Keyboard.JustDown(this.keys.nf))this.ninjaInteract();
    if(Phaser.Input.Keyboard.JustDown(this.keys.be))this.boltInteract();
    this.updateBoard();this.updateLift();
    if(s.carried){
      this.carriedArt.setPosition(this.bolt.x+(this.bolt.flipX?-65:65),this.bolt.y-57);
    }
    this.prompt.setVisible(false);
    const prompt=(obj,str)=>this.prompt.setText(str).setPosition(obj.x-74,obj.y-112).setVisible(true);
    if(!s.switchOn&&close(this.ninja,this.switch,96))prompt(this.ninja,'F · Pull switch');
    else if(!s.exitOpen&&close(this.ninja,this.finalSwitch,96))prompt(this.ninja,'F · Open exit');
    else if(s.carried&&(s.carried==='wheel'||s.carried==='rope')&&this.bolt.x>1360&&this.bolt.x<1540)prompt(this.bolt,'ENTER · Install part');
    else if(s.carried&&(s.carried==='light'||s.carried==='heavy')&&this.bolt.x>1602&&this.bolt.x<1743&&this.machineReady)prompt(this.bolt,'ENTER · Attach weight');
    else if(s.carried)prompt(this.bolt,'ENTER · Put down');
    else if(this.bolt.x>1602&&this.bolt.x<1743&&(s.loaded.light||s.loaded.heavy))prompt(this.bolt,'ENTER · Unload weight');
    else {
      const candidate=Object.entries(this.parts).find(([,o])=>o.visible&&Math.abs(this.bolt.x-o.x)<78);
      if(candidate)prompt(this.bolt,'ENTER · Lift '+candidate[0]);
    }
    if(s.exitOpen&&this.ninja.x>2230&&this.bolt.x>2230){
      s.completed=true;this.physics.pause();this.displayHud();this.toast('LEVEL 2 COMPLETE — You built the way through!');
      document.querySelector('#victory .victory-card h1').textContent='Machines mastered.';
      document.querySelector('#victory .victory-card p').textContent='You balanced the plank, assembled the pulley, and lifted each other to the exit.';
      document.querySelector('#victory .victory-card>span').textContent='LEVEL 02 COMPLETE';
      document.querySelector('#victory').classList.add('visible');
    }
    const focus=(this.ninja.x+this.bolt.x)/2;
    const separation=Math.abs(this.ninja.x-this.bolt.x);
    const zoom=Phaser.Math.Clamp(1-Math.max(0,separation-560)/1600,.82,1);
    this.cameras.main.setZoom(Phaser.Math.Linear(this.cameras.main.zoom,zoom,.035));
    const view=1280/this.cameras.main.zoom;
    this.cameras.main.scrollX=Phaser.Math.Linear(this.cameras.main.scrollX,Phaser.Math.Clamp(focus-view/2,0,WIDTH-view),.055);
  }
}