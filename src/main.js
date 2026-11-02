
import Phaser from 'phaser';
import './style.css';
const W=3300, FLOOR=620;
class Workshop extends Phaser.Scene {
 constructor(){super('Workshop')}
 preload(){}
 create(){
  this.physics.world.setBounds(0,0,W,720);this.cameras.main.setBounds(0,0,W,720);
  this.cameras.main.setBackgroundColor('#1a2c3f');this.textureFactory();this.scenery();
  this.floor=this.physics.add.staticGroup();
  this.platform(0,620,550,100);this.platform(600,620,1080,100);this.platform(2180,620,1120,100);
  this.platform(220,547,115,22);this.platform(330,480,115,22);this.platform(442,402,210,22);
  this.platform(890,535,120,22);this.platform(1100,480,125,22);this.platform(2540,528,150,20);
  // Gate is a separate blocking body and can be removed after activating the lever.
  this.gate=this.physics.add.staticImage(700,553,'gate').setDepth(7);
  this.lever=this.add.image(544,367,'lever').setDepth(7);
  this.add.text(487,321,'NINJA SWITCH',{fontSize:'13px',color:'#f1c88d'});
  this.plate=this.add.rectangle(1450,611,110,14,0xffc475).setDepth(5);
  this.add.text(1393,568,'WEIGHT PLATE',{fontSize:'13px',color:'#f1c88d'});
  this.crate=this.physics.add.image(1045,574,'crate').setDepth(7).setCollideWorldBounds(true);
  this.crate.setSize(55,55).setDragX(700);
  this.beam=this.physics.add.image(1590,574,'beam').setDepth(7).setSize(96,26);
  this.beam.disableBody(true,true);
  this.socket=this.add.rectangle(1930,615,500,20,0xf8d38e,0.13).setStrokeStyle(2,0xf6ce7d,0.8);
  this.add.text(1720,564,'BRIDGE CONSTRUCTION SITE',{fontSize:'14px',color:'#f1c88d'});
  this.bridge=this.add.rectangle(1930,616,500,22,0xc7a275).setVisible(false).setDepth(4);
  this.exit=this.add.image(3075,532,'exit').setDepth(4);
  this.ninja=this.physics.add.image(100,576,'ninja').setDepth(9).setCollideWorldBounds(true).setSize(28,60);
  this.bolt=this.physics.add.image(170,573,'bolt').setDepth(9).setCollideWorldBounds(true).setSize(53,75);
  for(const obj of [this.ninja,this.bolt,this.crate,this.beam])this.physics.add.collider(obj,this.floor);
  this.physics.add.collider(this.ninja,this.crate);this.physics.add.collider(this.bolt,this.crate);
  this.physics.add.collider(this.ninja,this.beam);this.physics.add.collider(this.bolt,this.beam);
  this.physics.add.collider(this.ninja,this.gate);this.physics.add.collider(this.bolt,this.gate);
  this.keys=this.input.keyboard.addKeys('A,D,W,F,LEFT,RIGHT,UP,ENTER,R');
  this.input.keyboard.on('keydown-R',()=>this.scene.restart());
  document.querySelector('#restart').onclick=()=>this.scene.restart();
  this.open=false;this.activePlate=false;this.built=false;this.held=null;this.finished=false;
  this.help=this.add.text(0,0,'',{fontSize:'14px',color:'#ffe0a0',backgroundColor:'#263748',padding:{x:9,y:6}}).setDepth(20);
  this.help.setVisible(false);this.setGoal('Ninja: reach the high lever and open the gate.',1);
  this.add.text(44,268,'THE FORGOTTEN WORKSHOP',{fontFamily:'sans-serif',fontSize:'27px',fontStyle:'bold',color:'#f4d9a1'});
  this.add.text(44,302,'Two heroes. One way through.',{fontSize:'16px',color:'#c5d8e9'});
  this.add.text(85,497,'A D W',{fontSize:'16px',color:'#a6dbef'});this.add.text(159,497,'← → ↑',{fontSize:'16px',color:'#ecc9a9'});
 }
 textureFactory(){
  const g=this.make.graphics({x:0,y:0});
  const make=(name,w,h,fn)=>{g.clear();fn(g);g.generateTexture(name,w,h)};
  make('ninja',48,68,g=>{g.fillStyle(0x212a36);g.fillRoundedRect(12,30,25,34,6);g.fillStyle(0xf7e7d6);g.fillEllipse(25,20,35,35);g.fillTriangle(9,12,7,0,23,12);g.fillTriangle(28,12,42,0,42,18);g.fillStyle(0x1b2533);g.fillEllipse(17,20,7,10);g.fillEllipse(31,20,7,10);g.fillStyle(0xca686b);g.fillRoundedRect(4,35,39,8,3);g.fillTriangle(10,37,0,49,23,39)});
  make('bolt',70,81,g=>{g.fillStyle(0x62565a);g.fillRoundedRect(8,27,55,48,11);g.fillStyle(0xcebaa0);g.fillRoundedRect(12,12,48,56,12);g.fillStyle(0x202938);g.fillRoundedRect(17,18,40,27,12);g.fillStyle(0xffd68b);g.fillCircle(31,31,5);g.fillCircle(46,31,5);g.fillStyle(0xa4988d);g.fillRoundedRect(0,37,17,26,7);g.fillRoundedRect(55,37,15,26,7);g.fillStyle(0x4a4851);g.fillRoundedRect(15,67,20,13,4);g.fillRoundedRect(39,67,20,13,4);g.fillStyle(0x9ab38a);g.fillEllipse(38,7,16,9)});
  make('crate',60,60,g=>{g.fillStyle(0x9d9da6);g.fillRoundedRect(2,2,56,56,4);g.lineStyle(3,0x4e5967);g.strokeRect(8,8,44,44);g.lineBetween(10,10,50,50);g.lineBetween(50,10,10,50)});
  make('beam',104,30,g=>{g.fillStyle(0xc09b66);g.fillRoundedRect(1,1,102,28,4);g.lineStyle(3,0x6b5849);g.strokeRoundedRect(5,5,94,20,4);g.lineBetween(12,25,94,5)});
  make('lever',42,50,g=>{g.fillStyle(0x9da3a9);g.fillRoundedRect(4,34,34,12,3);g.lineStyle(5,0xf5bd77);g.lineBetween(19,34,30,9);g.fillStyle(0xf8d68a);g.fillCircle(30,9,8)});
  make('gate',40,134,g=>{g.fillStyle(0xa45d67);g.fillRoundedRect(0,0,40,134,4);g.lineStyle(3,0xe89798);for(let x=8;x<40;x+=11)g.lineBetween(x,5,x,128)});
  make('exit',112,172,g=>{g.fillStyle(0x666d7c);g.fillRoundedRect(0,0,112,172,40);g.fillStyle(0x2a3144);g.fillRoundedRect(9,10,94,153,34);g.lineStyle(4,0xf2c67d);g.strokeRoundedRect(9,10,94,153,34);g.fillStyle(0xe9bd77,0.7);g.fillEllipse(56,87,50,95)});
  g.destroy();
 }
 scenery(){
  const g=this.add.graphics().setDepth(-15);
  g.fillGradientStyle(0x152536,0x152536,0x394e67,0x394e67);g.fillRect(0,0,W,720);
  for(let i=0;i<29;i++){let x=i*120;g.fillStyle(0x8390a4,0.11);g.fillRoundedRect(x,210+i%4*35,68,390,20);g.lineStyle(12,0x8894a8,0.1);g.strokeRoundedRect(x-15,130+i%4*35,100,220,40)}
  const m=this.add.graphics().setDepth(-10);for(let i=0;i<35;i++){m.fillStyle(0x263748,0.6);m.fillRoundedRect(i*115,450+(i%3)*30,65,235,8)}
  for(let i=0;i<23;i++)this.add.circle(i*140+50,200+(i%5)*37,2,0xffdfad,0.5).setDepth(-4);
 }
 platform(x,y,w,h){const r=this.add.rectangle(x+w/2,y+h/2,w,h,0x687482).setStrokeStyle(2,0x47566a).setDepth(2);this.floor.add(r);this.add.rectangle(x+w/2,y+4,w,8,0xb0b9b5).setDepth(3)}
 setGoal(s,i){document.querySelector('#objective').textContent=s;document.querySelector('#step').textContent='0'+i+' / 04'}
 toast(s){let e=document.querySelector('#toast');e.textContent=s;e.classList.add('show');this.time.delayedCall(2300,()=>e.classList.remove('show'))}
 close(a,b,d=90){return Phaser.Math.Distance.Between(a.x,a.y,b.x,b.y)<d}
 drive(o,l,r,j,speed,power){o.setVelocityX(l?-speed:r?speed:Phaser.Math.Linear(o.body.velocity.x,0,.25));if(j&&o.body.blocked.down)o.setVelocityY(-power);if(l||r)o.setFlipX(l)}
 ninjaUse(){if(!this.open&&this.close(this.ninja,this.lever,100)){this.open=true;this.gate.disableBody(true,true);this.toast('The gate is open! Bolt can now reach the heavy crate.');this.setGoal('Bolt: put the heavy crate on the pressure plate.',2)}else this.toast('Ninja: reach the lever above the gate.')}
 boltUse(){
  if(!this.open){this.toast('Ninja must open the gate first.');return}
  if(this.held){let o=this.held==='crate'?this.crate:this.beam;if(this.held==='beam'&&this.bolt.x>1640&&this.bolt.x<1775){this.held=null;this.built=true;o.disableBody(true,true);this.bridge.setVisible(true);this.physics.add.existing(this.bridge,true);this.physics.add.collider(this.ninja,this.bridge);this.physics.add.collider(this.bolt,this.bridge);this.socket.setVisible(false);this.toast('Bridge built! Reach the exit together.');this.setGoal('Both heroes: cross the bridge and reach the exit.',4);return}
   o.body.setAllowGravity(true);o.setPosition(this.bolt.x+63,this.bolt.y-45).setVelocity(0,0);this.held=null;return}
  if(!this.activePlate&&this.close(this.bolt,this.crate,110)){this.held='crate';this.toast('Carry the crate to the pressure plate.');return}
  if(this.activePlate&&!this.built&&this.close(this.bolt,this.beam,120)){this.held='beam';this.toast('Carry the beam to the gold bridge socket.');return}
  this.toast('Move near an object and press Enter to lift it.');
 }
 update(){
  if(this.finished)return;
  this.drive(this.ninja,this.keys.A.isDown,this.keys.D.isDown,Phaser.Input.Keyboard.JustDown(this.keys.W),230,445);
  this.drive(this.bolt,this.keys.LEFT.isDown,this.keys.RIGHT.isDown,Phaser.Input.Keyboard.JustDown(this.keys.UP),170,330);
  if(Phaser.Input.Keyboard.JustDown(this.keys.F))this.ninjaUse();
  if(Phaser.Input.Keyboard.JustDown(this.keys.ENTER))this.boltUse();
  if(this.held){let o=this.held==='crate'?this.crate:this.beam;o.body.setAllowGravity(false);o.setPosition(this.bolt.x+65,this.bolt.y-43).setVelocity(0,0)}
  if(this.open&&!this.activePlate&&this.held!=='crate'&&Math.abs(this.crate.x-this.plate.x)<62&&this.crate.y>560&&this.crate.y<613){this.activePlate=true;this.plate.setFillStyle(0x8be6aa);this.beam.enableBody(true,1584,575,true,true);this.physics.add.collider(this.beam,this.floor);this.toast('Pressure plate activated: bridge beam unlocked!');this.setGoal('Bolt: carry the beam to the bridge socket.',3)}
  if(this.ninja.y>715)this.ninja.setPosition(1260,550).setVelocity(0);
  if(this.bolt.y>715)this.bolt.setPosition(1370,550).setVelocity(0);
  if(this.crate.y>715&&this.held!=='crate')this.crate.setPosition(1035,550).setVelocity(0);
  if(this.beam.active&&this.beam.y>715&&this.held!=='beam')this.beam.setPosition(1584,560).setVelocity(0);
  const setHint=(o,s)=>{this.help.setText(s).setPosition(o.x-68,o.y-115).setVisible(true)};
  if(!this.open&&this.close(this.ninja,this.lever,100))setHint(this.ninja,'NINJA · F to use lever');
  else if(this.open&&!this.activePlate&&this.close(this.bolt,this.crate,120))setHint(this.bolt,'BOLT · Enter to carry / drop');
  else if(this.activePlate&&!this.built&&this.held==='beam'&&this.bolt.x>1640&&this.bolt.x<1775)setHint(this.bolt,'BOLT · Enter to build bridge');
  else if(this.activePlate&&!this.built&&this.close(this.bolt,this.beam,120))setHint(this.bolt,'BOLT · Enter to carry beam');
  else this.help.setVisible(false);
  const focus=(this.ninja.x+this.bolt.x)/2;const target=Phaser.Math.Clamp(focus-640,0,W-1280);this.cameras.main.scrollX=Phaser.Math.Linear(this.cameras.main.scrollX,target,.05);
  if(this.built&&this.ninja.x>2990&&this.bolt.x>2990){this.finished=true;this.physics.pause();this.toast('LEVEL COMPLETE · Together, you made it!');this.setGoal('Workshop complete! Restart to play again.',4)}
 }
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:1280,height:720,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},physics:{default:'arcade',arcade:{gravity:{y:950},debug:false}},scene:[Workshop]});
