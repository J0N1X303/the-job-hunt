(()=>{
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d'),shell=$('shell');
const start=$('start'),hud=$('hud'),gameover=$('gameover'),playBtn=$('playBtn'),againBtn=$('againBtn'),shareBtn=$('shareBtn');
const timeHud=$('timeHud'),offerHud=$('offerHud'),chainHud=$('chainHud'),signalHint=$('signalHint'),chargeEls=[...document.querySelectorAll('#charges i')];
const toast=$('toast'),chainToast=$('chainToast');
const resultEls={offers:$('rOffers'),interviews:$('rInterviews'),chain:$('rChain'),signals:$('rSignals'),roles:$('rRoles'),line:$('resultLine')};
const COLORS={contact:'#7cf3ac',recruiter:'#58d8ff',event:'#ffc86a',role:'#ae8cff',hidden:'#8a6aff'};
const ICONS={contact:'●',recruiter:'◆',event:'✦',role:'◎',hidden:'?'};
const ROLE_STAGES=['ROLE','SCREEN','INTERVIEW','FINAL','OFFER'];
let W=0,H=0,dpr=1,cx=0,cy=0,state='start',raf=0,last=0,startAt=0,elapsed=0,duration=45;
let nodes=[],packets=[],ripples=[],trails=[],noise=null,charges=3,lastRegen=0,chainId=0,stats={},toastTimer=0,chainTimer=0,tutorial=true,bestOffers=0,bestChain=0;
try{bestOffers=Number(localStorage.getItem('signal-best-offers')||0);bestChain=Number(localStorage.getItem('signal-best-chain')||0)}catch(_){}
function resetStats(){stats={offers:0,interviews:0,longest:0,signals:0,roles:0,score:0}}
function resize(){const r=shell.getBoundingClientRect();W=r.width;H=r.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);cx=W/2;cy=H*.47;draw(performance.now())}
function node(type,angle,rx,ry,speed,label,opts={}){const n={id:crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2),type,angle,rx,ry,speed,label:label||type.toUpperCase(),x:0,y:0,r:opts.r||28,revealed:opts.revealed!==false,roleStage:opts.roleStage||0,offered:false,lastPulse:0,spawnAt:opts.spawnAt||0,counted:false};nodes.push(n);return n}
function setupNodes(){nodes=[];packets=[];ripples=[];trails=[];noise=null;
 node('contact',-1.05,84,66,.08,'CONTACT',{r:28});
 node('role',-0.42,153,104,-.035,'ROLE',{r:32});
 node('recruiter',2.25,125,86,-.055,'RECRUITER',{r:29,spawnAt:4});
 node('contact',2.9,157,112,.045,'CONTACT',{r:27,spawnAt:5.5});
 node('event',.78,138,98,.035,'EVENT',{r:29,spawnAt:8});
 node('role',1.72,168,118,-.028,'ROLE',{r:32,spawnAt:11});
 node('contact',-.05,187,128,.03,'CONTACT',{r:27,spawnAt:14});
 node('role',-2.38,185,132,.024,'ROLE',{r:32,revealed:false,spawnAt:17});
}
function updatePositions(){for(const n of nodes){n.x=cx+Math.cos(n.angle)*n.rx;n.y=cy+Math.sin(n.angle)*n.ry}}
function showToast(text,ms=800){clearTimeout(toastTimer);toast.textContent=text;toast.classList.add('show');toastTimer=setTimeout(()=>toast.classList.remove('show'),ms)}
function showChain(len){if(len<2)return;clearTimeout(chainTimer);chainToast.textContent=`CHAIN ×${len}`;chainToast.classList.add('show');chainTimer=setTimeout(()=>chainToast.classList.remove('show'),650)}
function updateHud(){timeHud.textContent=Math.max(0,Math.ceil(duration-elapsed));offerHud.textContent=stats.offers;chainHud.textContent=stats.longest;chargeEls.forEach((el,i)=>el.classList.toggle('on',i<charges));signalHint.textContent=charges?'Tap a glowing node':'Recharging…'}
function startGame(){resetStats();charges=3;lastRegen=0;elapsed=0;chainId=0;tutorial=true;setupNodes();updatePositions();state='play';start.classList.add('hidden');gameover.classList.add('hidden');hud.classList.remove('hidden');startAt=performance.now();last=startAt;updateHud();showToast('Tap CONTACT');cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)}
function activeNode(n){return elapsed>=n.spawnAt&&n.revealed&&!n.offered}
function relayRange(n){return n.type==='event'?150:n.type==='recruiter'?132:n.type==='contact'?118:0}
function inNoise(n){if(!noise)return false;return Math.hypot(n.x-noise.x,n.y-noise.y)<noise.r}
function tapNode(n){if(state!=='play'||charges<=0||!activeNode(n))return;charges--;stats.signals++;tutorial=false;const id=++chainId;const visited=new Set();packets.push({fromX:cx,fromY:cy,to:n,t:0,dur:.24,chain:1,id,visited});updateHud();if(navigator.vibrate)navigator.vibrate(6)}
function arrive(n,chain,id,visited){if(visited.has(n.id)||!activeNode(n))return;visited.add(n.id);stats.longest=Math.max(stats.longest,chain);stats.score+=chain*35;
 if(n.type==='role'){hitRole(n,chain);showChain(chain);return}
 if(n.type==='event')revealHidden();
 const range=relayRange(n);if(range>0){ripples.push({x:n.x,y:n.y,r:0,max:range,speed:250,life:1,id,chain,visited:new Set(visited),source:n});n.lastPulse=performance.now()}
}
function revealHidden(){const hidden=nodes.find(n=>n.type==='role'&&!n.revealed&&elapsed>=n.spawnAt);if(hidden){hidden.revealed=true;showToast('✦ HIDDEN ROLE REVEALED',900)}}
function hitRole(n,chain){if(inNoise(n)&&chain<3){showToast('TOO MUCH NOISE — BUILD A STRONGER CHAIN',850);return}
 const prev=n.roleStage;const jump=chain>=4?3:chain>=2?2:1;n.roleStage=Math.min(4,n.roleStage+jump);charges=Math.min(3,charges+1);stats.score+=180*jump+chain*70;
 if(prev<2&&n.roleStage>=2){stats.interviews++;showToast('INTERVIEW',700)}
 if(n.roleStage===4&&!n.offered){n.offered=true;stats.offers++;stats.score+=900;showToast('OFFER!',1000);burst(n.x,n.y,COLORS.role,22);setTimeout(()=>spawnFreshRole(),1100)} else burst(n.x,n.y,COLORS.role,10);
 updateHud()}
function spawnFreshRole(){if(state!=='play')return;const a=Math.random()*Math.PI*2;const n=node('role',a,150+Math.random()*45,100+Math.random()*35,(Math.random()>.5?1:-1)*(.02+Math.random()*.025),'ROLE',{r:32,spawnAt:elapsed});n.revealed=true}
function burst(x,y,color,count=10){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=40+Math.random()*120;trails.push({particle:true,x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.45+Math.random()*.35,color,size:2+Math.random()*3})}}
function update(dt,now){elapsed=(now-startAt)/1000;
 for(const n of nodes){n.angle+=n.speed*dt;if(n.type==='role'&&n.revealed&&elapsed>=n.spawnAt&&!n.counted){n.counted=true;stats.roles++}}
 updatePositions();
 if(elapsed>24&&!noise)noise={x:W*.78,y:H*.30,r:74,vx:-11,vy:6};
 if(noise){noise.x+=noise.vx*dt;noise.y+=noise.vy*dt;if(noise.x<W*.2||noise.x>W*.82)noise.vx*=-1;if(noise.y<H*.22||noise.y>H*.55)noise.vy*=-1}
 if(charges<3&&elapsed-lastRegen>=4){charges++;lastRegen=elapsed;updateHud()}
 packets.forEach(p=>{p.t+=dt/p.dur;if(p.t>=1&&!p.done){p.done=true;arrive(p.to,p.chain,p.id,p.visited)}});packets=packets.filter(p=>!p.done);
 ripples.forEach(r=>{const old=r.r;r.r+=r.speed*dt;r.life=1-r.r/r.max;for(const n of nodes){if(!activeNode(n)||r.visited.has(n.id)||n===r.source)continue;const d=Math.hypot(n.x-r.x,n.y-r.y);if(d>=old-3&&d<=r.r+n.r*.3&&d<=r.max){const nextVisited=new Set(r.visited);const chain=r.chain+1;arrive(n,chain,r.id,nextVisited);r.visited.add(n.id)}}});ripples=ripples.filter(r=>r.r<r.max);
 trails.forEach(t=>{t.life-=dt;if(t.particle){t.x+=t.vx*dt;t.y+=t.vy*dt;t.vy+=80*dt}});trails=trails.filter(t=>t.life>0);
 if(elapsed>=duration)endGame();updateHud()}
function drawBackground(){ctx.fillStyle='rgba(255,255,255,.018)';for(let i=0;i<40;i++){const x=(i*83)%W,y=(i*137)%H;ctx.beginPath();ctx.arc(x,y,(i%3)+.6,0,Math.PI*2);ctx.fill()}ctx.strokeStyle='rgba(88,216,255,.035)';ctx.lineWidth=1;[60,115,170].forEach(r=>{ctx.beginPath();ctx.ellipse(cx,cy,r,r*.72,0,0,Math.PI*2);ctx.stroke()})}
function drawNoise(){if(!noise)return;const g=ctx.createRadialGradient(noise.x,noise.y,10,noise.x,noise.y,noise.r);g.addColorStop(0,'rgba(120,135,160,.16)');g.addColorStop(1,'rgba(100,110,130,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(noise.x,noise.y,noise.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(180,190,205,.52)';ctx.font='900 9px system-ui';ctx.textAlign='center';ctx.fillText('NOISE',noise.x,noise.y)}
function drawPotential(){ctx.lineWidth=1;for(const a of nodes){if(!activeNode(a)||!['contact','recruiter','event'].includes(a.type))continue;const range=relayRange(a);for(const b of nodes){if(a===b||!activeNode(b))continue;const d=Math.hypot(a.x-b.x,a.y-b.y);if(d<range*.92){ctx.strokeStyle='rgba(124,243,172,.10)';ctx.setLineDash([3,6]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([])}}}}
function drawYou(now){const pulse=5+3*Math.sin(now/180);ctx.save();ctx.shadowColor='rgba(88,216,255,.55)';ctx.shadowBlur=20;ctx.fillStyle='#112b43';ctx.beginPath();ctx.arc(cx,cy,34,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(88,216,255,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,34+pulse*.25,0,Math.PI*2);ctx.stroke();ctx.restore();ctx.fillStyle='#f3f8ff';ctx.font='950 11px system-ui';ctx.textAlign='center';ctx.fillText('YOU',cx,cy+4)}
function drawNode(n,now){if(elapsed<n.spawnAt||!n.revealed)return;const color=COLORS[n.type],pulse=(now-n.lastPulse<450)?8*(1-(now-n.lastPulse)/450):0;ctx.save();ctx.globalAlpha=n.offered?.38:1;ctx.shadowColor=color;ctx.shadowBlur=n.offered?5:14+pulse;ctx.fillStyle='rgba(7,19,33,.94)';ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2);ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=color;ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle=color;ctx.font=`900 ${n.type==='role'?15:14}px system-ui`;ctx.textAlign='center';ctx.fillText(ICONS[n.type],n.x,n.y+4);ctx.fillStyle='#dce8f6';ctx.font='900 8px system-ui';const label=n.type==='role'?ROLE_STAGES[n.roleStage]:n.label;ctx.fillText(label,n.x,n.y+n.r+13);ctx.restore();if(tutorial&&n.type==='contact'){ctx.strokeStyle=`rgba(211,255,105,${.45+.3*Math.sin(now/140)})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(n.x,n.y,n.r+10+4*Math.sin(now/180),0,Math.PI*2);ctx.stroke()}}
function drawPackets(){for(const p of packets){const t=Math.min(1,p.t),e=t*t*(3-2*t),x=p.fromX+(p.to.x-p.fromX)*e,y=p.fromY+(p.to.y-p.fromY)*e;ctx.strokeStyle='rgba(88,216,255,.23)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.fromX,p.fromY);ctx.lineTo(x,y);ctx.stroke();ctx.fillStyle='#d3ff69';ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill()}}
function drawRipples(){for(const r of ripples){ctx.strokeStyle=`rgba(124,243,172,${Math.max(0,r.life)*.7})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke()}}
function drawTrails(){for(const t of trails){ctx.globalAlpha=Math.max(0,t.life*2);if(t.particle){ctx.fillStyle=t.color;ctx.beginPath();ctx.arc(t.x,t.y,t.size,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1}}
function draw(now){ctx.clearRect(0,0,W,H);drawBackground();drawNoise();drawPotential();drawRipples();drawTrails();drawPackets();for(const n of nodes)drawNode(n,now);drawYou(now);if(state==='play'&&tutorial){ctx.fillStyle='#d3ff69';ctx.font='950 12px system-ui';ctx.textAlign='center';ctx.fillText('TAP CONTACT',cx,cy+88)}}
function endGame(){if(state!=='play')return;state='over';cancelAnimationFrame(raf);hud.classList.add('hidden');gameover.classList.remove('hidden');bestOffers=Math.max(bestOffers,stats.offers);bestChain=Math.max(bestChain,stats.longest);try{localStorage.setItem('signal-best-offers',bestOffers);localStorage.setItem('signal-best-chain',bestChain)}catch(_){}resultEls.offers.textContent=stats.offers;resultEls.interviews.textContent=stats.interviews;resultEls.chain.textContent=stats.longest;resultEls.signals.textContent=stats.signals;resultEls.roles.textContent=stats.roles;resultEls.line.textContent=stats.offers?`Best: ${bestOffers} offer${bestOffers===1?'':'s'} · chain ×${bestChain}. Can you build a stronger route?`:`No offer this run. Best chain ×${bestChain}. Try timing your signals through people, not just roles.`;draw(performance.now())}
async function share(){const text=`I created ${stats.offers} offer${stats.offers===1?'':'s'} with a longest chain of ×${stats.longest} in The Signal. Can you build a stronger route?`;try{if(navigator.share)await navigator.share({title:'The Job Hunt — The Signal',text,url:location.href.split('?')[0]});else{await navigator.clipboard.writeText(text);showToast('Score copied')}}catch(e){if(e?.name!=='AbortError')showToast('Share cancelled')}}
function loop(now){if(state!=='play')return;const dt=Math.min(.033,(now-last)/1000||0);last=now;update(dt,now);draw(now);if(state==='play')raf=requestAnimationFrame(loop)}
canvas.addEventListener('pointerdown',e=>{if(state!=='play')return;const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;let target=null,best=Infinity;for(const n of nodes){if(!activeNode(n))continue;const d=Math.hypot(x-n.x,y-n.y);if(d<n.r+16&&d<best){target=n;best=d}}if(target)tapNode(target);else showToast('Tap a node',500)});
playBtn.addEventListener('click',startGame);againBtn.addEventListener('click',startGame);shareBtn.addEventListener('click',share);window.addEventListener('resize',resize);resize();draw(performance.now());
})();
