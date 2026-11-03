import {mulberry} from './card.js';
// Sample sunset (drawn, so it needs no download) and palette extraction.
export function sampleSunset(){
  const c=document.createElement('canvas');c.width=1500;c.height=1000;const g=c.getContext('2d');const R=mulberry(7);const hz=600;
  let sky=g.createLinearGradient(0,0,0,hz);
  [[0,'#1f2a55'],[.3,'#4f4686'],[.58,'#b85b7c'],[.8,'#ef8f67'],[1,'#ffd49b']].forEach(([s,col])=>sky.addColorStop(s,col));
  g.fillStyle=sky;g.fillRect(0,0,1500,hz);
  const sx=940,sy=hz-30;
  let glow=g.createRadialGradient(sx,sy,0,sx,sy,620);glow.addColorStop(0,'rgba(255,232,180,.95)');glow.addColorStop(.14,'rgba(255,190,125,.55)');glow.addColorStop(1,'rgba(255,140,110,0)');
  g.fillStyle=glow;g.fillRect(0,0,1500,hz);
  for(let i=0;i<9;i++){g.fillStyle=`rgba(${110+R()*40|0},${60+R()*30|0},${110+R()*30|0},${.22+R()*.2})`;g.beginPath();g.ellipse(R()*1500,120+R()*330,160+R()*260,10+R()*16,0,0,Math.PI*2);g.fill()}
  g.fillStyle='#fff4d8';g.beginPath();g.arc(sx,sy,64,0,Math.PI*2);g.fill();
  let sea=g.createLinearGradient(0,hz,0,1000);sea.addColorStop(0,'#de8670');sea.addColorStop(.22,'#7c4d77');sea.addColorStop(1,'#171c3a');
  g.fillStyle=sea;g.fillRect(0,hz,1500,400);
  for(let i=0;i<80;i++){const t=i/80;const y=hz+4+Math.pow(t,1.5)*390;const w=(1-t)*160+30+R()*80;g.fillStyle=`rgba(255,222,175,${.6*(1-t)})`;g.fillRect(sx-w/2+(R()-.5)*40*t*3,y,w,2+t*4)}
  g.fillStyle='#1b1430';g.beginPath();g.moveTo(0,hz-150);g.bezierCurveTo(140,hz-190,260,hz-110,380,hz-70);g.bezierCurveTo(470,hz-40,540,hz-12,600,hz+4);g.lineTo(0,hz+4);g.closePath();g.fill();
  g.fillRect(250,hz-235,18,110);g.beginPath();g.moveTo(244,hz-235);g.lineTo(274,hz-235);g.lineTo(259,hz-262);g.fill();
  g.fillStyle='rgba(255,230,170,.9)';g.fillRect(252,hz-226,14,8);
  g.strokeStyle='rgba(30,20,45,.8)';g.lineWidth=3;g.lineCap='round';
  [[1120,260,1],[1180,300,.8],[1060,320,.7]].forEach(([x,y,s])=>{g.beginPath();g.moveTo(x-18*s,y-6*s);g.quadraticCurveTo(x-8*s,y-10*s,x,y);g.quadraticCurveTo(x+8*s,y-10*s,x+18*s,y-6*s);g.stroke()});
  return c;
}

export function extractColors(canvas){
  const s=document.createElement('canvas');s.width=40;s.height=40;const g=s.getContext('2d');g.drawImage(canvas,0,0,40,40);
  const d=g.getImageData(0,0,40,40).data;const b={};
  for(let i=0;i<d.length;i+=4){const r=d[i],gg=d[i+1],bb=d[i+2];const k=(r>>5)<<6|(gg>>5)<<3|(bb>>5);(b[k]||(b[k]=[0,0,0,0]));b[k][0]+=r;b[k][1]+=gg;b[k][2]+=bb;b[k][3]++}
  const list=Object.values(b).sort((a,b)=>b[3]-a[3]).map(v=>[v[0]/v[3],v[1]/v[3],v[2]/v[3]]);
  const pick=[];for(const c of list){if(pick.every(p=>Math.hypot(p[0]-c[0],p[1]-c[1],p[2]-c[2])>70))pick.push(c);if(pick.length===4)break}
  while(pick.length<4){const p=pick[pick.length-1]||[60,50,80];pick.push(p.map(v=>Math.min(255,v*1.3+20)))}
  pick.sort((a,b)=>(a[0]+a[1]+a[2])-(b[0]+b[1]+b[2]));
  return pick.map(c=>'#'+c.map(v=>Math.round(v).toString(16).padStart(2,'0')).join(''));
}

