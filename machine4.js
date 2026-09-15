(()=>{
  const $=id=>document.getElementById(id);
  const canvas=$('game'),ctx=canvas.getContext('2d'),shell=$('shell');
  const start=$('start'),hud=$('hud'),gameover=$('gameover');
  const interviewsEl=$('interviewsHud'),sentEl=$('sentHud'),comboEl=$('comboHud'),focusEl=$('focusFill'),focusLabel=$('focusLabel');
  const toast=$('toast'),bigToast=$('bigToast');

  let W=0,H=0,dpr=1,state='start',raf=0,last=0,startAt=0,elapsed=0,duration=30;
  let aimX=0,lastAimX=0,aimVelocity=0,steady=0,shotClock=0,interviews=0,sent=0,combo=0,bestCombo=0,seq=0;
  let cvs=[],obstacles=[],powerups=[],particles=[],floaters=[];
  let introUntil=0,recruiterUntil=0,recruiterX=0,boostName='',boostUntil=0,nextPowerAt=0,nextChaosAt=0,toastT=0,bigT=0;
  let routeX=0,routeTarget=0,nextRouteAt=0,routeEase=1.4;
  let best=0;
  try{best=Number(localStorage.getItem('cv-chaos-best')||0)}catch(_){}

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rnd=(a,b)=>a+Math.random()*(b-a);
  const pick=a=>a[Math.random()*a.length|0];
  const blockers=['ATS','NO RESPONSE','GENERIC REJECTION','AI SCREEN','500+','UPLOAD CV AGAIN'];

  function resize(){
    const r=shell.getBoundingClientRect();
    W=r.width;H=r.height;dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if(!aimX)aimX=W/2;
    if(!routeX){routeX=W/2;routeTarget=W*.72}
    draw(performance.now());
  }
  function say(t,ms=700){clearTimeout(toastT);toast.textContent=t;toast.classList.add('show');toastT=setTimeout(()=>toast.classList.remove('show'),ms)}
  function boom(t,ms=800){clearTimeout(bigT);bigToast.textContent=t;bigToast.classList.add('show');bigT=setTimeout(()=>bigToast.classList.remove('show'),ms)}
  function burst(x,y,color,n=12){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=rnd(35,120);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:rnd(.35,.8),color})}}

  function makeGate(y,type,offset,phase){
    return {id:++seq,y,type,offset,gapX:W/2+offset,gapW:Math.max(104,W*.29),flash:0,phase,wander:rnd(8,18),waveMs:rnd(700,1150),lag:rnd(1.45,2.35)};
  }
  function resetObstacles(){
    obstacles=[
      makeGate(H*.67,'ATS',-10,.3),
      makeGate(H*.50,'NO RESPONSE',16,2.1),
      makeGate(H*.34,'GENERIC REJECTION',-6,4.3)
    ];
  }

  function chooseRouteTarget(){
    const edge=Math.max(76,W*.17),minX=edge,maxX=W-edge,minMove=W*.24;
    let candidate=routeTarget||W/2;
    for(let i=0;i<8;i++){
      candidate=rnd(minX,maxX);
      if(Math.abs(candidate-routeX)>=minMove)break;
    }
    if(Math.abs(candidate-routeX)<minMove){
      candidate=routeX<W/2?maxX:minX;
    }
    routeTarget=candidate;
    routeEase=rnd(1.25,1.9)+(elapsed/30)*.35;
    nextRouteAt=elapsed+rnd(2.0,2.9);
  }

  function reset(){
    elapsed=0;aimX=W/2;lastAimX=aimX;aimVelocity=0;steady=.2;shotClock=0;interviews=sent=combo=bestCombo=0;
    cvs=[];powerups=[];particles=[];floaters=[];introUntil=recruiterUntil=boostUntil=0;recruiterX=W/2;
    nextPowerAt=4.2;nextChaosAt=5.5;routeX=W/2;routeTarget=W*.72;routeEase=1.35;nextRouteAt=2.4;
    resetObstacles();updateHud();
  }

  function startGame(){
    reset();state='play';start.classList.add('hidden');gameover.classList.add('hidden');hud.classList.remove('hidden');
    startAt=last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
  }

  function bottomGap(){return obstacles.length?obstacles[0].gapX:routeX}
  function updateHud(){
    interviewsEl.textContent=interviews;sentEl.textContent=sent;comboEl.textContent=combo>1?'×'+combo:'—';
    const f=clamp(steady/1.15,0,1);focusEl.style.width=(f*100)+'%';focusLabel.textContent=f>.83?'LOCKED IN':f>.4?'TRACKING':'SPRAYING';
  }

  function activePower(){
    let bestP=null,bestD=Infinity;
    for(const p of powerups){
      if(p.life<=0)continue;
      const d=Math.abs(aimX-p.x);
      if(d<bestD){bestD=d;bestP=p}
    }
    return bestP;
  }

  function spawnCV(now){
    const focus=clamp(steady/1.15,0,1);
    const spread=31-(24*focus);
    const interval=.10+(.085*focus);
    if(shotClock<interval)return;
    shotClock=0;sent++;
    const referral=now<introUntil;
    const fast=now<recruiterUntil&&Math.abs(aimX-recruiterX)<76;
    const p=activePower(),lock=p&&Math.abs(aimX-p.x)<62;
    const x=aimX+rnd(-spread,spread);
    const cv={id:++seq,x,y:H-115,vx:rnd(-9,9)*(1-focus),vy:-rnd(240,276),alive:true,referral,shield:referral?1:0,fast,age:0,color:fast?'#70f6ac':referral?'#b9ff7a':'#6fe2ff',powerLock:lock?p.id:0};
    if(lock){cv.vx+=(p.x-x)*2.2}
    cvs.push(cv);updateHud();
  }

  function updateGates(dt,now){
    for(let i=0;i<obstacles.length;i++){
      const o=obstacles[i];
      let desired=routeX+o.offset+Math.sin(now/o.waveMs+o.phase)*o.wander;
      if(i>0){
        const prev=obstacles[i-1];
        const overlap=Math.max(46,(prev.gapW+o.gapW)/2-38);
        desired=clamp(desired,prev.gapX-overlap,prev.gapX+overlap);
      }
      const edge=o.gapW/2+12;
      desired=clamp(desired,edge,W-edge);
      o.gapX+=(desired-o.gapX)*Math.min(1,dt*o.lag);
      o.flash=Math.max(0,o.flash-dt);
    }
  }

  function target(){
    const top=obstacles[obstacles.length-1];
    const width=elapsed<10?148:elapsed<20?130:114;
    return{x:top?top.gapX:routeX,width,y:Math.max(150,H*.18),h:42};
  }

  function spawnPower(){
    const kind=Math.random()<.55?'INTRO':'GOOD RECRUITER';
    const side=Math.random()<.5?-1:1;
    const x=clamp(bottomGap()+side*rnd(W*.21,W*.31),46,W-46);
    const y=H*.76+rnd(-16,16);
    powerups.push({id:++seq,kind,x,y,r:26,life:5.2,vx:rnd(-5,5),pulse:rnd(0,6.28)});
    nextPowerAt=elapsed+rnd(4.8,6.7);
  }

  function changeChaos(){
    const o=pick(obstacles);
    o.type=pick(blockers);
    o.gapW=Math.max(86,W*(elapsed<12?.275:elapsed<22?.24:.215));
    o.offset=clamp(o.offset+rnd(-14,14),-26,26);
    o.wander=clamp(o.wander+rnd(-4,5),7,22);
    o.lag=clamp(o.lag+rnd(-.25,.28),1.25,2.6);
    o.flash=1;
    nextChaosAt=elapsed+rnd(3.8,5.7);
  }

  function hitPower(p,cv,now){
    p.life=0;burst(p.x,p.y,'#7cf3ad',22);
    if(p.kind==='INTRO'){
      introUntil=now+4300;boostName='REFERRAL MODE';boostUntil=now+4300;boom('REFERRAL MODE');
    }else{
      recruiterUntil=now+4100;recruiterX=p.x;boostName='FAST TRACK';boostUntil=now+4100;boom('GOOD RECRUITER');
    }
    floaters.push({t:p.kind==='INTRO'?'INTRO!':'FAST TRACK!',x:p.x,y:p.y,l:1.1,color:'#7cf3ad'});
    cv.alive=false;
  }

  function obstacleCollision(cv,o,now){
    if(cv.fast&&now<recruiterUntil&&Math.abs(cv.x-recruiterX)<72)return false;
    if(Math.abs(cv.y-o.y)>=10)return false;
    const introW=now<introUntil?38:0;
    if(Math.abs(cv.x-o.gapX)<(o.gapW+introW)/2)return false;
    if(cv.shield>0){cv.shield--;burst(cv.x,cv.y,'#b9ff7a',6);return false}
    if(o.type==='500+'&&Math.random()<.55){
      cv.vx+=rnd(-95,95);cv.vy*=.72;floaters.push({t:'500+',x:cv.x,y:cv.y,l:.45,color:'#ffca72'});return false;
    }
    cv.alive=false;burst(cv.x,cv.y,'#ff7586',7);
    floaters.push({t:o.type,x:cv.x,y:cv.y,l:.52,color:o.type==='NO RESPONSE'?'#91a0b5':'#ff9aa6'});
    return true;
  }

  function scoreInterview(cv,y){
    interviews++;combo++;bestCombo=Math.max(bestCombo,combo);burst(cv.x,y,'#d9ff69',18);
    boom(combo>1?'INTERVIEW ×'+combo:'INTERVIEW!');cv.alive=false;updateHud();
  }

  function update(dt,now){
    elapsed=(now-startAt)/1000;
    if(elapsed>=duration){endGame();return}

    if(elapsed>=nextRouteAt)chooseRouteTarget();
    routeX+=(routeTarget-routeX)*Math.min(1,dt*routeEase);
    updateGates(dt,now);

    const gap=bottomGap();
    const delta=aimX-lastAimX;
    const speed=Math.abs(delta)/Math.max(dt,.001);
    aimVelocity=aimVelocity*.74+speed*.26;
    lastAimX=aimX;
    const error=Math.abs(aimX-gap);
    if(error<54&&aimVelocity<245)steady=Math.min(1.3,steady+dt*(error<30?1.25:.8));
    else if(error>82||aimVelocity>310)steady=Math.max(0,steady-dt*2.7);
    else steady=Math.max(0,steady-dt*.35);

    shotClock+=dt;spawnCV(now);
    if(elapsed>=nextPowerAt)spawnPower();
    if(elapsed>=nextChaosAt)changeChaos();
    powerups.forEach(p=>{p.x+=p.vx*dt;if(p.x<34||p.x>W-34)p.vx*=-1;p.life-=dt});

    const tar=target();
    for(const cv of cvs){
      if(!cv.alive)continue;
      cv.age+=dt;
      const p=cv.powerLock?powerups.find(q=>q.id===cv.powerLock&&q.life>0):null;
      if(p&&cv.y>p.y-8){cv.vx+=clamp((p.x-cv.x)*dt*7,-42,42)}
      cv.vx=clamp(cv.vx,-170,170);
      cv.x+=cv.vx*dt;cv.y+=cv.vy*dt;
      if(cv.x<8||cv.x>W-8){cv.vx*=-.45;cv.x=clamp(cv.x,8,W-8)}
      for(const power of powerups){
        if(power.life>0&&Math.hypot(cv.x-power.x,cv.y-power.y)<power.r+8){hitPower(power,cv,now);break}
      }
      if(!cv.alive)continue;
      for(const o of obstacles){if(obstacleCollision(cv,o,now))break}
      if(!cv.alive)continue;
      if(cv.y<=tar.y+tar.h/2){
        if(Math.abs(cv.x-tar.x)<tar.width/2)scoreInterview(cv,tar.y);
        else{cv.alive=false;combo=0;floaters.push({t:'MISSED',x:cv.x,y:tar.y+24,l:.45,color:'#8191a6'});updateHud()}
      }
    }

    cvs=cvs.filter(x=>x.alive&&x.y>-20&&x.age<4);
    powerups=powerups.filter(p=>p.life>0);
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.985;p.vy*=.985;p.l-=dt});
    particles=particles.filter(p=>p.l>0);
    floaters.forEach(f=>{f.y-=16*dt;f.l-=dt});floaters=floaters.filter(f=>f.l>0);
    updateHud();
  }

  function drawGate(o,now){
    ctx.save();
    const introW=now<introUntil?38:0,gapW=o.gapW+introW;
    const x1=clamp(o.gapX-gapW/2,0,W),x2=clamp(o.gapX+gapW/2,0,W);
    ctx.fillStyle=o.flash>0?'rgba(255,182,104,.22)':'rgba(255,255,255,.075)';
    ctx.fillRect(0,o.y-8,x1,16);ctx.fillRect(x2,o.y-8,W-x2,16);
    ctx.strokeStyle='rgba(255,255,255,.14)';ctx.lineWidth=1;ctx.strokeRect(0,o.y-8,x1,16);ctx.strokeRect(x2,o.y-8,W-x2,16);
    ctx.fillStyle=o.type==='NO RESPONSE'?'#8999ad':'#c4d1df';ctx.font='900 9px system-ui';ctx.textAlign='center';
    const lx=x1>70?x1/2:(x2+W)/2;ctx.fillText(o.type,lx,o.y+3);
    if(o.type==='AI SCREEN'){
      ctx.strokeStyle='rgba(174,140,255,.28)';ctx.beginPath();ctx.moveTo(o.gapX,o.y-15);ctx.lineTo(aimX,H-110);ctx.stroke();
    }
    ctx.restore();
  }

  function drawPower(p,now){
    const pulse=4+Math.sin(now/180+p.pulse)*3;
    const lock=Math.abs(aimX-p.x)<62;
    ctx.save();
    ctx.strokeStyle=lock?'rgba(124,243,173,.9)':'rgba(124,243,173,.45)';ctx.lineWidth=lock?2.2:1.3;
    ctx.beginPath();ctx.arc(p.x,p.y,p.r+pulse,0,Math.PI*2);ctx.stroke();
    if(lock){
      ctx.setLineDash([6,6]);ctx.strokeStyle='rgba(124,243,173,.35)';ctx.beginPath();ctx.moveTo(aimX,H-102);ctx.lineTo(p.x,p.y+p.r+8);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='#7cf3ad';ctx.font='950 8px system-ui';ctx.textAlign='center';ctx.fillText('TARGET',p.x,p.y-p.r-12);
    }
    ctx.shadowColor='#7cf3ad';ctx.shadowBlur=14;ctx.fillStyle='rgba(8,32,26,.96)';ctx.strokeStyle='#7cf3ad';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    ctx.fillStyle='#7cf3ad';ctx.textAlign='center';ctx.font='900 9px system-ui';ctx.fillText(p.kind==='INTRO'?'INTRO':'RECRUITER',p.x,p.y+3);ctx.restore();
  }

  function drawCV(cv){
    ctx.save();ctx.translate(cv.x,cv.y);ctx.rotate(cv.vx*.004);ctx.shadowColor=cv.color;ctx.shadowBlur=8;
    ctx.fillStyle='#0a1827';ctx.strokeStyle=cv.color;ctx.lineWidth=1.4;ctx.beginPath();ctx.roundRect(-9,-6,18,12,3);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    ctx.fillStyle=cv.color;ctx.font='800 6px system-ui';ctx.textAlign='center';ctx.fillText('CV',0,2);ctx.restore();
  }

  function draw(now){
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='rgba(255,255,255,.022)';for(let i=0;i<28;i++){ctx.beginPath();ctx.arc((i*71)%W,(i*107)%H,1,0,6.28);ctx.fill()}

    const tar=target();
    ctx.save();ctx.shadowColor='#d9ff69';ctx.shadowBlur=16;ctx.fillStyle='rgba(18,38,20,.92)';ctx.strokeStyle='#d9ff69';ctx.lineWidth=2.3;
    ctx.beginPath();ctx.roundRect(tar.x-tar.width/2,tar.y-tar.h/2,tar.width,tar.h,12);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    ctx.fillStyle='#d9ff69';ctx.font='950 13px system-ui';ctx.textAlign='center';ctx.fillText('INTERVIEW',tar.x,tar.y+4);ctx.restore();

    if(now<recruiterUntil){
      ctx.save();ctx.fillStyle='rgba(124,243,173,.08)';ctx.fillRect(recruiterX-65,tar.y+26,130,H-tar.y-120);
      ctx.strokeStyle='rgba(124,243,173,.42)';ctx.setLineDash([8,8]);ctx.strokeRect(recruiterX-65,tar.y+26,130,H-tar.y-120);ctx.restore();
    }

    obstacles.forEach(o=>drawGate(o,now));powerups.forEach(p=>drawPower(p,now));cvs.forEach(drawCV);
    particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.l);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,2.4,0,6.28);ctx.fill();ctx.globalAlpha=1});
    floaters.forEach(f=>{ctx.globalAlpha=Math.min(1,f.l*1.7);ctx.fillStyle=f.color;ctx.font='950 10px system-ui';ctx.textAlign='center';ctx.fillText(f.t,f.x,f.y);ctx.globalAlpha=1});

    ctx.save();ctx.strokeStyle='rgba(103,223,255,.35)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(aimX,H-102);ctx.lineTo(aimX,H-160);ctx.stroke();
    ctx.fillStyle='#67dfff';ctx.beginPath();ctx.arc(aimX,H-102,12,0,6.28);ctx.fill();ctx.fillStyle='#07131f';ctx.font='900 7px system-ui';ctx.textAlign='center';ctx.fillText('YOU',aimX,H-100);ctx.restore();
    if(boostUntil>now){ctx.fillStyle='rgba(124,243,173,.9)';ctx.font='950 10px system-ui';ctx.textAlign='center';ctx.fillText(boostName,W/2,H-72)}
  }

  function endGame(){
    if(state!=='play')return;state='over';hud.classList.add('hidden');gameover.classList.remove('hidden');best=Math.max(best,interviews);
    try{localStorage.setItem('cv-chaos-best',best)}catch(_){}
    $('rInterviews').textContent=interviews;$('rSent').textContent=sent;$('rCombo').textContent=bestCombo>1?'×'+bestCombo:'—';$('rBest').textContent=best;
    $('resultLine').textContent=interviews?`${sent-interviews} CVs vanished, missed or got blocked. Best: ${best} interviews.`:`A very realistic run. Best so far: ${best} interviews.`;
    draw(performance.now());
  }

  function moveAim(clientX){const r=canvas.getBoundingClientRect();aimX=clamp(clientX-r.left,22,W-22)}
  function pointerDown(e){if(state!=='play')return;e.preventDefault();moveAim(e.clientX);canvas.setPointerCapture?.(e.pointerId)}
  function pointerMove(e){if(state!=='play'||!(e.buttons||e.pointerType==='touch'))return;e.preventDefault();moveAim(e.clientX)}
  function pointerUp(e){if(state!=='play')return;e.preventDefault();moveAim(e.clientX)}
  function nudge(dx){if(state!=='play')return;aimX=clamp(aimX+dx,22,W-22)}
  async function share(){const text=`I got ${interviews} interviews from ${sent} CVs in CV Chaos. Best combo ${bestCombo>1?'×'+bestCombo:'—'}.`;try{if(navigator.share)await navigator.share({title:'CV Chaos — The Job Hunt',text,url:location.href.split('?')[0]})}catch(_){}}
  function loop(now){if(state!=='play')return;const dt=Math.min(.033,(now-last)/1000||0);last=now;update(dt,now);draw(now);if(state==='play')raf=requestAnimationFrame(loop)}

  ['contextmenu','dblclick','selectstart','dragstart'].forEach(ev=>document.addEventListener(ev,e=>e.preventDefault(),{passive:false}));
  document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
  document.addEventListener('touchmove',e=>{if(state==='play')e.preventDefault()},{passive:false});
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',pointerUp);
  $('leftBtn').addEventListener('pointerdown',e=>{e.preventDefault();nudge(-48)});$('rightBtn').addEventListener('pointerdown',e=>{e.preventDefault();nudge(48)});
  $('playBtn').onclick=startGame;$('againBtn').onclick=startGame;$('shareBtn').onclick=share;
  window.addEventListener('resize',resize);resize();draw(performance.now());
})();