import Phaser from 'phaser';
import { MAP as M } from './temple-layout.js';

/**
 * Screenshot-mapped Temple room: both floors visible, 2 seesaws, chained pulley,
 * red/blue gems and separate character doors. All reference geometry is 2×.
 * Original placeholder textures; no sprites taken from the source game.
 */
const S = M.scale;
const px = n => n*S;
const C = { bg:0x323a20,brick:0x414926,brick2:0x29331d,stone:0x9b9771,
  stoneEdge:0xc2b993,metal:0x868c8c,red:0xf44332,blue:0x56dfff,
  gold:0xefc653,green:0x70b956,ink:0xf3df9c };
const clamp=Phaser.Math.Clamp;

export class Temple extends Phaser.Scene {
  constructor(){super('Temple');}
  create(){
    this.physics.world.setBounds(0,0,M.width,M.height);
    this.cameras.main.setBounds(0,0,M.width,M.height).setScroll(0,0);
    this.cameras.main.setBackgroundColor('#30381e');
    this.createTextures();
    this.drawRoom();
    this.platforms=this.physics.add.staticGroup();
    this.buildGeometry();
    this.buildSeesaws();
    this.buildPulley();
    this.buildItems();
    this.buildPlayers();
    this.buildUI();
    this.keys=this.input.keyboard.addKeys({nl:'A',nr:'D',nj:'W',ni:'F',
      bl:'LEFT',br:'RIGHT',bj:'UP',bi:'ENTER',restart:'R',hint:'H',debug:'B'});
    this.input.keyboard.addCapture(['UP','DOWN','LEFT','RIGHT','SPACE']);
    this.states={
      ninjaFloor:0,boltFloor:0,redGems:0,blueGems:0,complete:false,
      pulleyEngaged:false,debug:false
    };
    this.startAt=this.time.now;this.nextToastAt=0;
    this.jumpRecords={
      ninja:{ground:-1e5,press:-1e5,onBoard:false},
      bolt:{ground:-1e5,press:-1e5,onBoard:false}
    };
    this.bindings={
      restart:()=>this.scene.restart(),
      hint:()=>this.hint(),
      debug:()=>this.toggleDebug()
    };
    this.input.keyboard.on('keydown-R',this.bindings.restart);
    this.input.keyboard.on('keydown-H',this.bindings.hint);
    this.input.keyboard.on('keydown-B',this.bindings.debug);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      this.input.keyboard.off('keydown-R',this.bindings.restart);
      this.input.keyboard.off('keydown-H',this.bindings.hint);
      this.input.keyboard.off('keydown-B',this.bindings.debug);
    });
    document.getElementById('restart').onclick=this.bindings.restart;
    document.getElementById('hint').onclick=this.bindings.hint;
    document.querySelector('#victory').classList.remove('visible');
    document.querySelector('#victory button').onclick=this.bindings.restart;
    this.syncHUD();
  }
  createTextures(){
    const g=this.make.graphics({x:0,y:0});
    const make=(id,w,h,fn)=>{if(this.textures.exists(id))return;g.clear();fn(g);g.generateTexture(id,w,h);};
    make('nf-ninja',44,64,g=>{
      g.fillStyle(0x2a2534);g.fillRoundedRect(10,30,24,31,6);
      g.fillStyle(0xf2e1d3);g.fillEllipse(22,18,34,31);
      g.fillTriangle(6,12,5,1,21,13);g.fillTriangle(26,13,40,0,39,16);
      g.fillStyle(0x1d2530);g.fillEllipse(15,18,7,10);g.fillEllipse(30,18,7,10);
      g.fillStyle(C.red);g.fillRoundedRect(6,31,32,8,3);
      g.fillTriangle(7,35,0,49,24,39);
    });
    make('nf-bolt',48,64,g=>{
      g.fillStyle(0x4f5f69);g.fillRoundedRect(7,27,34,32,8);
      g.fillStyle(0xb2c9cc);g.fillRoundedRect(9,12,30,40,10);
      g.fillStyle(0x173341);g.fillRoundedRect(10,18,28,20,8);
      g.fillStyle(C.blue);g.fillCircle(19,27,4);g.fillCircle(29,27,4);
      g.fillStyle(0x647983);g.fillRoundedRect(0,30,9,22,4);g.fillRoundedRect(39,30,9,22,4);
      g.fillStyle(0x33404c);g.fillRoundedRect(9,50,13,13,3);g.fillRoundedRect(26,50,13,13,3);
      g.fillStyle(0x78b597);g.fillEllipse(25,7,12,6);
    });
    make('nf-board',436,26,g=>{
      g.fillStyle(0x757c80);g.fillRoundedRect(1,4,434,19,4);
      g.lineStyle(3,0xb3bab9);g.strokeRoundedRect(2,4,432,19,4);
      for(let i=12;i<420;i+=34){
        g.lineStyle(3,0x404b4d);
        g.lineBetween(i,7,i+21,21);
        g.fillStyle(0xa3acaa);g.fillCircle(i+3,13,3);
      }
    });
    make('nf-gem-blue',32,32,g=>{
      g.fillStyle(0x0c3d55);g.fillTriangle(1,9,31,9,16,31);
      g.fillStyle(C.blue);g.fillTriangle(5,8,27,8,16,26);
      g.fillStyle(0xd7ffff);g.fillTriangle(6,9,17,9,12,15);
    });
    make('nf-gem-red',32,32,g=>{
      g.fillStyle(0x5a221d);g.fillTriangle(1,9,31,9,16,31);
      g.fillStyle(C.red);g.fillTriangle(5,8,27,8,16,26);
      g.fillStyle(0xffc5af);g.fillTriangle(6,9,17,9,12,15);
    });
    make('nf-door-red',56,92,g=>{
      g.fillStyle(0x5d6042);g.fillRoundedRect(0,0,56,92,4);
      g.fillStyle(0x4e5035);g.fillRoundedRect(7,7,42,84,4);
      g.lineStyle(3,0x918e5d);g.strokeRoundedRect(7,7,42,84,3);
      g.fillStyle(C.red);g.fillCircle(27,41,8);
      g.fillRoundedRect(25,48,5,19,2);g.fillCircle(36,57,4);
    });
    make('nf-door-blue',56,92,g=>{
      g.fillStyle(0x5d6042);g.fillRoundedRect(0,0,56,92,4);
      g.fillStyle(0x4e5035);g.fillRoundedRect(7,7,42,84,4);
      g.lineStyle(3,0x918e5d);g.strokeRoundedRect(7,7,42,84,3);
      g.fillStyle(C.blue);g.fillCircle(27,41,8);
      g.fillRoundedRect(25,48,5,19,2);g.fillCircle(36,57,4);
    });
    make('nf-pad-blue',74,15,g=>{
      g.fillStyle(0x88866c);g.fillRoundedRect(0,0,74,15,3);
      g.fillStyle(C.blue);g.fillRoundedRect(10,4,54,6,2);
    });
    make('nf-pad-red',64,15,g=>{
      g.fillStyle(0x88866c);g.fillRoundedRect(0,0,64,15,3);
      g.fillStyle(0xffa43f);g.fillRoundedRect(10,4,44,6,2);
    });
    make('nf-gear',36,36,g=>{
      g.fillStyle(0x91928b);g.fillCircle(18,18,18);
      g.fillStyle(0x414c4b);g.fillCircle(18,18,10);
      g.fillStyle(0x9b9f99);g.fillCircle(18,18,6);
      g.fillStyle(0x2f3939);g.fillCircle(18,18,3);
    });
    g.destroy();
  }
  drawRoom(){
    const g=this.add.graphics().setDepth(-30);
    g.fillStyle(C.bg);g.fillRect(0,0,M.width,M.height);
    // Repeating dark-olive masonry closely follows the supplied room.
    for(let y=18;y<864;y+=25){
      const odd=Math.floor(y/25)%2===0;
      for(let x=odd?-15:18;x<1172;x+=72){
        g.fillStyle((Math.floor(x/70)+Math.floor(y/25))%4===0?C.brick:C.brick2,.24);
        g.fillRect(x+1,y+1,70,22);
        g.lineStyle(2,0x0c1710,.30);g.strokeRect(x,y,72,24);
      }
    }
    const border=this.add.graphics().setDepth(10);
    border.lineStyle(17,0x8a8050,.9).strokeRect(13,13,1136,846);
    border.lineStyle(5,0xb5a26c,.5).strokeRect(19,18,1126,836);
    // Vines are atmospheric; they deliberately have no collision.
    for(const [x,y] of [[42,217],[170,98],[208,275],[323,97],[456,98],[608,104],
        [794,96],[910,102],[1040,143],[1098,220],[52,402],[340,429],
        [526,566],[364,785],[780,822],[1047,635],[180,834]]){
      const v=this.add.graphics().setDepth(7);
      v.lineStyle(4,0x244e19,.9);v.lineBetween(x,y,x+4,y+21);
      v.fillStyle(0x4e9e36,.88);v.fillEllipse(x-5,y+9,13,7);
      v.fillEllipse(x+9,y+14,12,7);
    }
    this.add.text(px(264),px(6),'00:00',{
      fontFamily:'Georgia, serif',fontSize:'35px',color:'#f4d45a',stroke:'#172316',strokeThickness:3
    }).setDepth(18).setName('clock');
    const over=this.add.graphics().setDepth(19);
    over.lineStyle(5,0x507930,.9);
    over.beginPath().moveTo(466,1).lineTo(498,38).lineTo(480,59).strokePath();
    over.beginPath().moveTo(694,0).lineTo(657,35).lineTo(672,55).strokePath();
  }
  addCollisionRect(x,y,w,h,fill=C.stone){
    const obj=this.add.rectangle(px(x+w/2),px(y+h/2),px(w),px(h),fill).setDepth(4);
    obj.setStrokeStyle(2,C.stoneEdge,.5);
    this.platforms.add(obj);
    obj.body.updateFromGameObject();
    return obj;
  }
  buildGeometry(){
    // The continuous middle slab and bottom ground form the two floors.
    this.addCollisionRect(16,246,549,14);
    this.addCollisionRect(15,422,554,16);
    // Reference maze edges and walkable ledges.
    for(const q of M.topPlatforms)this.addCollisionRect(...q);
    for(const q of M.lowerPlatforms)this.addCollisionRect(...q);
    // Stone columns and maze borders are solid, matching the reference image.
    // Background bricks, ivy and thin trim remain decorative only.
    for(const [x,y,w,h] of M.outerWalls)this.addCollisionRect(x,y,w,h,0x817c55);
    // Stepped lower-left masonry. These are distinct from the high ledges.
    for(const [x,y,w,h] of [
      [29,257,14,42],[55,300,14,25],[87,328,15,47],
      [115,320,13,25],[23,319,14,62]
    ])this.addCollisionRect(x,y,w,h,0x827f58);
    this.add.rectangle(px(291),px(69),px(423),px(11),0xa69b72,.5).setDepth(5);
    this.add.rectangle(px(291),px(50),px(431),px(10),0x95895f,.45).setDepth(5);
    this.add.rectangle(px(290),px(257),px(561),px(5),0xaaa078,.5).setDepth(6);
  }
  buildSeesaws(){
    const create=(data,index)=>{
      const x=px(data.x),y=px(data.y),width=px(data.length);
      const board=this.add.image(x,y,'nf-board').setDisplaySize(width,26)
        .setRotation(data.angle).setDepth(11);
      const pivot=this.add.graphics().setDepth(10);
      pivot.fillStyle(0x777b71);pivot.fillTriangle(x-45,y+60,x,y+7,x+45,y+60);
      pivot.lineStyle(7,0xaca983);pivot.lineBetween(x-42,y+60,x+44,y+60);
      const cap=this.add.circle(x,y,13,0xf5c633).setStrokeStyle(3,0x8f771d).setDepth(12);
      return {x,y,width,index,rotation:data.angle,board,pivot,cap,contacts:new Set()};
    };
    this.boards=[create(M.upperSeesaw,0),create(M.lowerSeesaw,1)];
  }
  buildPulley(){
    const {leftWheel,rightWheel,leftPlatform,rightWeight}=M.pulley;
    this.pulleyArt=this.add.graphics().setDepth(9);
    this.pulleyTop=this.add.rectangle(px(218),px(269),px(59),13,0xa7a17a).setDepth(9);
    this.pulleyWheels=[
      this.add.image(px(leftWheel.x),px(leftWheel.y),'nf-gear').setDepth(10),
      this.add.image(px(rightWheel.x),px(rightWheel.y),'nf-gear').setDepth(10)
    ];
    this.leftHanger=this.physics.add.image(px(leftPlatform.x),px(leftPlatform.y),'nf-board')
      .setDisplaySize(80,16).setImmovable(true).setPushable(false).setDepth(11);
    this.leftHanger.body.allowGravity = false;
    this.leftHanger.body.setSize(75,14);
    this.rightHanger=this.add.rectangle(px(rightWeight.x),px(rightWeight.y),79,15,0x9c9981)
      .setStrokeStyle(2,0xd8caa2).setDepth(11);
    this.pulleyState=0;
  }
  buildItems(){
    this.collectibles=[];
    for(const kind of ['red','blue']){
      for(const [x,y] of M.crystals[kind]){
        const sprite=this.add.image(px(x),px(y),'nf-gem-'+kind)
          .setDepth(14).setScale(1).setData('color',kind);
        this.collectibles.push({kind,sprite,x,y,found:false});
      }
    }
    this.portals={
      blue:this.add.image(px(M.upperPortal.blue.x),px(M.upperPortal.blue.y),'nf-pad-blue').setDepth(12),
      red:this.add.image(px(M.upperPortal.red.x),px(M.upperPortal.red.y),'nf-pad-red').setDepth(12)
    };
    this.doors={
      red:this.add.image(px(M.exits.red.x),px(M.exits.red.y),'nf-door-red').setDepth(12),
      blue:this.add.image(px(M.exits.blue.x),px(M.exits.blue.y),'nf-door-blue').setDepth(12)
    };
    this.portalText=this.add.text(px(27),px(232),'BLUE ↓', {
      fontSize:'12px',fontFamily:'Arial',color:'#95efff'
    }).setDepth(15);
    this.portalText2=this.add.text(px(514),px(226),'RED ↓',{
      fontSize:'12px',fontFamily:'Arial',color:'#ffc17c'
    }).setDepth(15);
    this.bottomText=this.add.text(px(276),px(406),'↓  MEET AT THE DOORS  →',{
      fontSize:'12px',fontFamily:'Arial',color:'#bdc58a'
    }).setDepth(15);
  }
  buildPlayers(){
    // In the reference, the blue hero stands on the left of the upper seesaw,
    // while the red hero is near its right side.
    this.ninja=this.physics.add.sprite(px(M.characters.ninja.x),px(M.characters.ninja.y),
      'nf-ninja').setSize(30,57).setDepth(20).setCollideWorldBounds(true);
    this.bolt=this.physics.add.sprite(px(M.characters.bolt.x),px(M.characters.bolt.y),
      'nf-bolt').setSize(39,58).setDepth(20).setCollideWorldBounds(true);
    this.ninja.setMaxVelocity(310,900).setDragX(1000);
    this.bolt.setMaxVelocity(300,900).setDragX(1000);
    for(const hero of [this.ninja,this.bolt]){
      this.physics.add.collider(hero,this.platforms);
      this.physics.add.collider(hero,this.leftHanger);
    }
    this.ninja.setVelocity(0,0);this.bolt.setVelocity(0,0);
    this.ninjaLabel=this.add.text(this.ninja.x-33,this.ninja.y-64,'NINJA',{
      fontSize:'13px',color:'#ffaea0',fontFamily:'Arial',fontStyle:'bold'
    }).setDepth(24);
    this.boltLabel=this.add.text(this.bolt.x-24,this.bolt.y-64,'BOLT',{
      fontSize:'13px',color:'#a1eaff',fontFamily:'Arial',fontStyle:'bold'
    }).setDepth(24);
    this.interactionLabel=this.add.text(0,0,'',{fontSize:'13px',fontFamily:'Arial',
      fontStyle:'bold',color:'#fff0be',backgroundColor:'#263c2a',padding:{x:8,y:5}
    }).setDepth(25).setVisible(false);
    this.debugLayer=this.add.graphics().setDepth(30).setVisible(false);
  }
  buildUI(){
    this.timer=this.children.getByName('clock');
    this.timer.setText('00:00');
    this.gemHud=this.add.text(px(224),px(30),'', {fontFamily:'Arial',
      fontSize:'15px',fontStyle:'bold',color:'#d9e7cd'
    }).setDepth(15).setVisible(false);
    this.hudFlag=0;
  }
  syncHUD(){
    const totalRed=M.crystals.red.length,totalBlue=M.crystals.blue.length;
    document.getElementById('objective').textContent=
      'RED '+this.states.redGems+'/'+totalRed+'  ·  BLUE '+this.states.blueGems+'/'+totalBlue;
    document.getElementById('step').textContent=
      (this.states.ninjaFloor&&this.states.boltFloor?'LOWER FLOOR':'UPPER FLOOR');
  }
  toast(msg,cooldown=1200){
    if(this.time.now<this.nextToastAt)return;
    this.nextToastAt=this.time.now+cooldown;
    const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');
    if(this.toastHandle)this.toastHandle.remove(false);
    this.toastHandle=this.time.delayedCall(2100,()=>el.classList.remove('show'));
  }
  hint(){
    if(!this.states.ninjaFloor||!this.states.boltFloor){
      this.toast('Collect the matching gems in the upper room, then press your interact key at your color pad.',0);
      return;
    }
    this.toast('Use the lower seesaw and hanging pulley to reach the remaining gems. Both colored doors are on the right.',0);
  }
  interact(hero,kind){
    if(!this.states[kind+'Floor']){
      const portal=this.portals[kind==='ninja'?'red':'blue'];
      const gemKind=kind==='ninja'?'red':'blue';
      const upperTotal=M.crystals[gemKind].filter(([,y])=>y<250).length;
      const obtained=this.collectibles.filter(c=>c.kind===gemKind&&c.y<250&&c.found).length;
      if(Math.abs(hero.x-portal.x)<75 && hero.y>px(175) && hero.y<px(253)){
        if(obtained<upperTotal){
          this.toast('Collect your remaining upper-room '+gemKind+' gems first.',0);return;
        }
        this.states[kind+'Floor']=1;
        if(kind==='bolt')hero.setPosition(px(43),px(395));
        else hero.setPosition(px(477),px(391));
        hero.setVelocity(0,0);
        this.syncHUD();
        this.toast((kind==='ninja'?'Ninja':'Bolt')+' entered the lower chamber!',0);
      }
    } else {
      const pulleyX=px(M.pulley.leftPlatform.x);
      if(Math.abs(hero.x-pulleyX)<65 && hero.y>px(295)){
        this.pulleyState=1-this.pulleyState;
        this.toast('Pulley counterweight reversed.',0);
      }
    }
  }
  movePlayer(hero,kleft,kright,kjump,memory,delta){
    const grounded=hero.body.blocked.down||hero.body.touching.down||memory.onBoard;
    if(grounded)memory.ground=this.time.now;
    if(Phaser.Input.Keyboard.JustDown(kjump))memory.press=this.time.now;
    const target=(kleft.isDown?-295:kright.isDown?295:0);
    const accel=(target===0?1800:2350)*Math.min(.045,delta/1000);
    const v=hero.body.velocity.x;
    hero.setVelocityX(v<target?Math.min(v+accel,target):Math.max(v-accel,target));
    if(kleft.isDown||kright.isDown)hero.setFlipX(kleft.isDown);
    if(this.time.now-memory.press<120&&this.time.now-memory.ground<110){
      hero.setVelocityY(-720);
      memory.press=-1e5;memory.ground=-1e5;memory.onBoard=false;
    }
    // Releasing jump early gives short hops; holding gives full jumps.
    if(Phaser.Input.Keyboard.JustUp(kjump) && hero.body.velocity.y < -290)
      hero.setVelocityY(hero.body.velocity.y*.56);
  }
  updateSeesaws(){
    for(const [index,board] of this.boards.entries()){
      let torque=0;
      for(const [hero,weight,memory] of [
        [this.ninja,1,this.jumpRecords.ninja],[this.bolt,1.75,this.jumpRecords.bolt]]){
        const inCorrectFloor=(index===0?
          (hero===this.ninja?!this.states.ninjaFloor:!this.states.boltFloor):
          (hero===this.ninja?this.states.ninjaFloor:this.states.boltFloor));
        if(!inCorrectFloor)continue;
        const dx=hero.x-board.x;
        const surface=board.y+Math.tan(board.rotation)*dx-12;
        const feet=hero.body.bottom;
        if(Math.abs(dx)<board.width/2-18&&hero.body.velocity.y>=-25
          &&feet>=surface-15&&feet<=surface+31){
          // Reset snaps the body to the rotated plank; restore horizontal
          // speed so a grounded player can still run across it smoothly.
          const vx=hero.body.velocity.x;
          hero.y+=(surface-feet);hero.body.reset(hero.x,hero.y);
          hero.setVelocity(vx,0);
          memory.onBoard=true;
          torque+=weight*dx;
        }
      }
      const neutral=index===0?.13:.23;
      const target=clamp(neutral+torque/640,-.37,.38);
      board.rotation=Phaser.Math.Linear(board.rotation,target,.055);
      board.board.setRotation(board.rotation);
      board.cap.setPosition(board.x,board.y);
    }
  }
  updatePulley(){
    const wanted=this.pulleyState?px(363):px(315);
    const velocity=clamp((wanted-this.leftHanger.y)*3,-95,95);
    this.leftHanger.setVelocityY(Math.abs(velocity)<1?0:velocity);
    const otherY=px(418)-(this.leftHanger.y-px(315))*.82;
    this.rightHanger.y=otherY;
    this.pulleyArt.clear().lineStyle(5,0x9faaa6);
    this.pulleyArt.beginPath().moveTo(px(193),px(268)).lineTo(px(193),this.leftHanger.y-10).strokePath();
    this.pulleyArt.beginPath().moveTo(px(244),px(268)).lineTo(px(244),otherY-12).strokePath();
    this.pulleyArt.lineStyle(8,0x77776d).lineBetween(px(193),px(268),px(244),px(268));
    for(const wheel of this.pulleyWheels)wheel.rotation+=this.pulleyState?.013:-.004;
  }
  collectGems(){
    for(const c of this.collectibles){
      if(c.found)continue;
      const hero=c.kind==='red'?this.ninja:this.bolt;
      if(Phaser.Math.Distance.Between(hero.x,hero.y,c.sprite.x,c.sprite.y)<49){
        c.found=true;c.sprite.destroy();
        if(c.kind==='red')this.states.redGems++;else this.states.blueGems++;
        this.syncHUD();
      }
    }
  }
  checkExits(){
    if(!this.states.ninjaFloor||!this.states.boltFloor)return;
    const doors=this.doors;
    const redReady=this.states.redGems===M.crystals.red.length;
    const blueReady=this.states.blueGems===M.crystals.blue.length;
    const redClose=Math.abs(this.ninja.x-doors.red.x)<52
      &&Math.abs(this.ninja.y-doors.red.y)<105;
    const blueClose=Math.abs(this.bolt.x-doors.blue.x)<52
      &&Math.abs(this.bolt.y-doors.blue.y)<97;
    doors.red.setTint(redReady?0xffffff:0x9b7b7b);
    doors.blue.setTint(blueReady?0xffffff:0x7b9b9b);
    if(redReady&&blueReady&&redClose&&blueClose){
      this.states.complete=true;
      this.physics.pause();
      const s=document.querySelector('#victory');
      s.querySelector('span').textContent='TEMPLE CLEARED';
      s.querySelector('h1').textContent='Both made it out.';
      s.querySelector('p').textContent='Every crystal collected. Both exits reached.';
      s.classList.add('visible');
    }
  }
  showPrompts(){
    this.interactionLabel.setVisible(false);
    for(const [hero,kind,key] of [[this.ninja,'ninja','F'],[this.bolt,'bolt','ENTER']]){
      const inTop=!this.states[kind+'Floor'];
      const p=this.portals[kind==='ninja'?'red':'blue'];
      if(inTop && Math.abs(hero.x-p.x)<73&&hero.y>px(175)&&hero.y<px(253)){
        this.interactionLabel.setText(key+' · Enter lower floor')
          .setPosition(hero.x-78,hero.y-94).setVisible(true);
        return;
      }
      if(!inTop&&Math.abs(hero.x-px(192))<70&&hero.y>px(295)){
        this.interactionLabel.setText(key+' · Shift pulley')
          .setPosition(hero.x-78,hero.y-90).setVisible(true);
        return;
      }
    }
  }
  toggleDebug(){
    this.states.debug=!this.states.debug;
    const d=this.debugLayer;d.setVisible(this.states.debug);d.clear();
    if(!this.states.debug)return;
    d.lineStyle(2,0xff5b84,.75);
    for(const p of this.platforms.getChildren())
      d.strokeRect(p.body.x,p.body.y,p.body.width,p.body.height);
    for(const b of this.boards)d.strokeCircle(b.x,b.y,13);
  }
  update(){
    if(this.states.complete)return;
    this.jumpRecords.ninja.onBoard=false;
    this.jumpRecords.bolt.onBoard=false;
    this.updateSeesaws();
    this.movePlayer(this.ninja,this.keys.nl,this.keys.nr,this.keys.nj,this.jumpRecords.ninja,
      this.game.loop.delta);
    this.movePlayer(this.bolt,this.keys.bl,this.keys.br,this.keys.bj,this.jumpRecords.bolt,
      this.game.loop.delta);
    if(Phaser.Input.Keyboard.JustDown(this.keys.ni))this.interact(this.ninja,'ninja');
    if(Phaser.Input.Keyboard.JustDown(this.keys.bi))this.interact(this.bolt,'bolt');
    this.updatePulley();this.collectGems();this.showPrompts();this.checkExits();
    this.ninjaLabel.setPosition(this.ninja.x-30,this.ninja.y-65);
    this.boltLabel.setPosition(this.bolt.x-25,this.bolt.y-64);
    const elapsed=Math.floor((this.time.now-this.startAt)/1000);
    this.timer.setText(String(Math.floor(elapsed/60)).padStart(2,'0')+':'+
      String(elapsed%60).padStart(2,'0'));
    // No scrolling. The entire 2-floor reference remains framed.
  }
}
