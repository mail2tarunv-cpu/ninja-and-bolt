/** Cosmetic rendering only: coordinates never enter collision or game state. */
export function drawFactoryLighting(ctx: CanvasRenderingContext2D) {
  ctx.save()
  for (const [x,y] of [[78,540],[958,400],[1060,44],[1236,44]]) {
    const glow = ctx.createRadialGradient(x,y+12,2,x,y+40,110)
    glow.addColorStop(0,'rgba(255,192,91,.19)')
    glow.addColorStop(.35,'rgba(238,163,65,.07)')
    glow.addColorStop(1,'rgba(238,163,65,0)')
    ctx.fillStyle=glow;ctx.fillRect(x-110,y-70,220,220)
    ctx.strokeStyle='#44515a';ctx.lineWidth=2
    ctx.beginPath();ctx.moveTo(x,y-26);ctx.lineTo(x,y-10);ctx.stroke()
    ctx.fillStyle='#15202a';ctx.beginPath();ctx.ellipse(x,y-3,10,5,0,Math.PI,Math.PI*2);ctx.fill()
    ctx.shadowColor='#ffbd55';ctx.shadowBlur=13;ctx.fillStyle='#ffe2a0'
    ctx.beginPath();ctx.roundRect(x-5,y-2,10,13,3);ctx.fill();ctx.shadowBlur=0
    ctx.strokeStyle='#765229';ctx.lineWidth=1
    ctx.strokeRect(x-6,y-2,12,14)
    ctx.beginPath();ctx.moveTo(x,y-2);ctx.lineTo(x,y+12);ctx.moveTo(x-6,y+5);ctx.lineTo(x+6,y+5);ctx.stroke()
  }
  ctx.restore()
}
export function drawSteelButton(ctx: CanvasRenderingContext2D,x:number,y:number,pressed:boolean) {
  ctx.save()
  const top=y+(pressed?6:0), h=pressed?6:12
  const steel=ctx.createLinearGradient(x,top,x,top+h)
  steel.addColorStop(0,'#79d8f3');steel.addColorStop(.3,'#247ca9');steel.addColorStop(1,'#143954')
  ctx.fillStyle=steel;ctx.strokeStyle='#111d29';ctx.lineWidth=1
  ctx.beginPath();ctx.roundRect(x,top,58,h,3);ctx.fill();ctx.stroke()
  ctx.fillStyle='#102736';ctx.fillRect(x+20,top+3,20,4)
  ctx.fillStyle=pressed?'#a1fff0':'#41e6ff';ctx.fillRect(x+22,top+4,16,2)
  ctx.fillStyle='#c4cdd0';ctx.fillRect(x+5,top+4,2,2);ctx.fillRect(x+51,top+4,2,2)
  ctx.restore()
}
export function drawHazardDetails(ctx:CanvasRenderingContext2D,r:{x:number;y:number;w:number;h:number},now:number) {
  ctx.save()
  for (const x of [r.x-10,r.x+r.w]) {
    ctx.fillStyle='#172633';ctx.fillRect(x,r.y,10,Math.min(r.h,28))
    ctx.save();ctx.beginPath();ctx.rect(x+1,r.y+2,8,Math.min(r.h-4,24));ctx.clip()
    ctx.strokeStyle='#d5a247';ctx.lineWidth=4
    for(let y=r.y-8;y<r.y+36;y+=11){ctx.beginPath();ctx.moveTo(x,y+12);ctx.lineTo(x+10,y);ctx.stroke()}
    ctx.restore()
  }
  ctx.beginPath();ctx.rect(r.x,r.y,r.w,r.h);ctx.clip()
  ctx.strokeStyle='rgba(255,219,114,.5)';ctx.lineWidth=1
  ctx.beginPath()
  for(let x=0;x<=r.w;x+=3){const y=r.y+3+Math.sin(x*.09+now*.001)*1.5;x?ctx.lineTo(r.x+x,y):ctx.moveTo(r.x+x,y)}ctx.stroke()
  for(let i=0;i<9;i++){
    const phase=(now*.00012+i*.137)%1
    const x=r.x+((i*43+19)%r.w),y=r.y+r.h*(1-phase)
    ctx.strokeStyle=`rgba(246,192,81,${Math.sin(phase*Math.PI)*.25})`
    ctx.beginPath();ctx.ellipse(x,y,1.4+i%3,1+i%2,0,0,Math.PI*2);ctx.stroke()
  }
  ctx.restore()
}
export function drawRefinedSign(ctx:CanvasRenderingContext2D) {
  ctx.save()
  const x=195,y=43,w=340,h=52
  ctx.strokeStyle='#59616a';ctx.lineWidth=1
  for(const cx of [x+26,x+w-26]){ctx.beginPath();ctx.moveTo(cx,0);ctx.lineTo(cx,y);ctx.stroke()}
  const steel=ctx.createLinearGradient(x,y,x,y+h)
  steel.addColorStop(0,'#364552');steel.addColorStop(1,'#13212e')
  ctx.fillStyle=steel;ctx.strokeStyle='#9e8050';ctx.lineWidth=1.5
  ctx.beginPath();ctx.moveTo(x+10,y);ctx.lineTo(x+w-10,y);ctx.lineTo(x+w,y+10);ctx.lineTo(x+w,y+h-10);ctx.lineTo(x+w-10,y+h);ctx.lineTo(x+10,y+h);ctx.lineTo(x,y+h-10);ctx.lineTo(x,y+10);ctx.closePath();ctx.fill();ctx.stroke()
  ctx.strokeStyle='#0c1823';ctx.strokeRect(x+5,y+6,w-10,h-12)
  ctx.fillStyle='#bfa06c';ctx.font='700 21px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle'
  ctx.fillText('HALLOWAY TOYS',x+w/2,y+h/2, w-52)
  for(const cx of [x+14,x+w-14]){ctx.fillStyle='#0d1923';ctx.beginPath();ctx.arc(cx,y+h/2,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8a98a0';ctx.beginPath();ctx.arc(cx,y+h/2-1,2,0,Math.PI*2);ctx.fill()}
  ctx.restore()
}
