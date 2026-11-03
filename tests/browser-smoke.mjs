import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';
import { chromium } from 'playwright';

const port=4174, url='http://127.0.0.1:'+port;
const server=spawn('./node_modules/.bin/vite',['--host','127.0.0.1','--port',String(port),'--strictPort'],{
 stdio:['ignore','pipe','pipe'],env:{...process.env,CI:'1'}
});
server.stderr.on('data',c=>process.stderr.write('[vite] '+c));
let browser;
async function main(){
 await wait(1800);
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 const errors=[];
 page.on('pageerror',error=>{errors.push(error.message+'\n'+error.stack);console.error('BROWSER ERROR:',error.stack)});
 page.on('console',message=>{if(message.type()==='error')console.error('CONSOLE:',message.text())});
 const response=await page.goto(url,{waitUntil:'load',timeout:25000});
 console.log('HTTP',response.status());
 await page.waitForTimeout(2200);
 const result=await page.evaluate(()=>{
   const game=window.__ninjaBoltGame;
   const scene=game?.scene?.getScene('Temple');
   return {hasCanvas:!!document.querySelector('#game canvas'),
      canvasWidth:document.querySelector('#game canvas')?.width,
      active:scene?.sys?.isActive(),hasState:!!scene?.states,
      n:!!scene?.ninja,b:!!scene?.bolt,
      hud:document.querySelector('#objective')?.textContent,
      phaserVersion:window.Phaser?.VERSION,
      children:scene?.children?.list?.length};
 });
 console.log('GAME STATE',JSON.stringify(result));
 await page.screenshot({path:'smoke-temple.png'});
 if(errors.length)throw Error('Browser errors: '+errors.join('\n\n'));
 if(!result.hasCanvas||!result.active||!result.hasState||!result.n||!result.b)throw Error('Game scene did not initialize');
 const oldX=await page.evaluate(()=>window.__ninjaBoltGame.scene.getScene('Temple').ninja.x);
 await page.keyboard.down('d');
 await page.waitForTimeout(400);
 await page.keyboard.up('d');
 const newX=await page.evaluate(()=>window.__ninjaBoltGame.scene.getScene('Temple').ninja.x);
 console.log('Ninja moved from',oldX,'to',newX);
 if(!(newX>oldX+5))throw Error('Input or physics update not working');
 console.log('PASS: scene rendering, both players, and keyboard movement.');
}
try{await main()}catch(error){console.error(error.stack);process.exitCode=1}
finally{await browser?.close();server.kill('SIGTERM');process.exit(process.exitCode||0)}
