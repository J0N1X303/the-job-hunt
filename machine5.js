(()=>{
  const $=id=>document.getElementById(id);
  const canvas=$('game'),ctx=canvas.getContext('2d'),shell=$('shell');
  const start=$('start'),hud=$('hud'),gameover=$('gameover');
  const interviewsEl=$('interviewsHud'),timeEl=$('timeHud'),comboEl=$('comboHud'),focusEl=$('focusFill'),focusLabel=$('focusLabel');
  const toast=$('toast'),bigToast=$('bigToast');

  let W=0,H=0,dpr=1,state='start',raf=0,last=0,startAt=0,elapsed=0,duration=45;
  let aimX=0,lastAimX=0,aimVelocity=0,steady=0,shotClock=0,interviews=0,sent=0,combo=0,bestCombo=0,seq=0,idleTime=0;
  let cvs=[],obstacles=[],powerups=[],particles=[],floaters=[];
  let introUntil=0,introLaneX=0,recruiterUntil=0,recruiterX=0,boostName='',boostUntil=0,nextPowerAt=0,nextChaosAt=0,toastT=0,bigT=0;
  let routeX=0,routeTarget=0,nextRouteAt=0,routeEase=1.5;
  let best=0;
  try{best=Number(localStorage.getItem('cv-chaos-best')||0)}catch(_){}

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rnd=(a,b)=>a+Math.random()*(b-a);
  const pick=a=>a[Math.random()*a.length|0];
  const blockers=['ATS','NO RESPONSE','GENERIC REJECTION','AI SCREEN','500+','UPLOAD CV AGAIN'];

  function phase(){return elapsed<10?0:elapsed<25?1:elapsed<38?2:3}
  function resize(){
    const r=shell.getBoundingClientRect();W=r.width;H=r.height;dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    if(!aimX)aimX=W/2;if(!routeX){routeX=W/2;routeTarget=W*.72}
    draw(performance.now());
  }
  function say(t,ms=700){clearTimeout(toastT);toast.textContent=t;toast.classList.add('show');toastT=setTimeout(()=>toast.classList.remove('show'),ms)}
  function boom(t,ms=800){clearTimeout(bigT);bigToast.textContent=t;bigToast.classList.add('show');bigT=setTimeout(()=>bigToast.classList.remove('show'),ms)}
  function burst(x,y,color,n=12){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=rnd(35,120);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:rnd(.35,.8),color})}}

  function makeGate(y,type,offset,phaseSeed){
    return {id:++seq,y,type,offset,gapX:W/2+offset,gapW:Math.max(108,W*.29),flash:0,phase:phaseSeed,wander:rnd(9,19),waveMs:rnd(610,1030),lag:rnd(1.75,2.75),bias:0,biasTarget:rnd(-12,12),biasAt:rnd(.5,1.2),slam:0};
  }
  function resetObstacles(){
    obstacles=[makeGate(H*.68,'ATS',-10,.3),makeGate(H*.51,'NO RESPONSE',15,2.1),makeGate(H*.35,'GENERIC REJECTION',-5,4.3)];
  }

  function chooseRouteTarget(){
    const p=phase(),edge=Math.max(76,W*.17),minX=edge,maxX=W-edge;
    const minMove=W*([.22,.25,.28,.30][p]);
    let candidate=routeTarget||W/2;
    for(let i=0;i<10;i++){candidate=rnd(minX,maxX);if(Math.abs(candidate-routeX)>=minMove)break}
    if(Math.abs(candidate-routeX)<minMove)candidate=routeX<W/2?maxX:minX;
    routeTarget=candidate;
    routeEase=rnd([1.55,1.9,2.25,2.6][p],[1.9,2.3,2.65,3.05][p]);
    const windows=[[1.9,2.6],[1.55,2.2],[1.25,1.85],[1.05,1.55]][p];
    nextRouteAt=elapsed+rnd(windows[0],windows[1]);
  }

  function reset(){
    elapsed=0;aimX=W/2;lastAimX=aimX;aimVelocity=0;steady=.15;shotClock=0;interviews=sent=combo=bestCombo=0;idleTime=0;
    cvs=[];powerups=[];particles=[];floaters=[];introUntil=recruiterUntil=boostUntil=0;introLaneX=recruiterX=W/2;
    nextPowerAt=3.8;nextChaosAt=4.7;routeX=W/2;routeTarget=W*.73;routeEase=1.6;nextRouteAt=1.2;
    resetObstacles();updateHud();
  }

  function startGame(){
    reset();state='play';start.classList.add('hidden');gameover.classList.add('hidden');hud.classList.remove('hidden');
    startAt=last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
  }

  function bottomGap(){return obstacles.length?obstacles[0].gapX:routeX}
  function updateHud(){
    interviewsEl.textContent=interviews;timeEl.textContent=Math.max(0,duration-elapsed).toFixed(1);comboEl.textContent=combo>1?'×'+combo:'—';
    const f=clamp(steady/1.15,0,1);focusEl.style.width=(f*100)+'%';focusLabel.textContent=f>.83?'LOCKED IN':f>.4?'TRACKING':'SPRAYING';
  }

  function activePower(){
    let bestP=null,bestD=Infinity;
    for(const p of powerups){if(p.life<=0)continue;const d=Math.abs(aimX-p.x);if(d<bestD){bestD=d;bestP=p}}
    return bestP;
  }

  function spawnCV(now){
    const focus=clamp(steady/1.15,0,1),spread=32-(25*focus),interval=.10+(.08*focus);
    if(shotClock<interval)return;shotClock=0;sent++;
    const inIntro=now<introUntil&&Math.abs(aimX-introLaneX)<76;
    const inRecruiter=now<recruiterUntil&&Math.abs(aimX-recruiterX)<76;
    const p=activePower(),lock=p&&Math.abs(aimX-p.x)<68;
    const x=aimX+rnd(-spread,spread);
    const cv={id:++seq,x,y:H-115,vx:rnd(-10,10)*(1-focus),vy:-rnd(245,282),alive:true,referral:inIntro,fast:inRecruiter,age:0,color:inRecruiter?'#70f6ac':inIntro?'#b9ff7a':'#6fe2ff',powerLock:lock?p.id:0};
    if(lock)cv.vx+=(p.x-x)*2.6;
    cvs.push(cv);
  }

  function updateGates(dt,now){
    const p=phase();
    for(let i=0;i<obstacles.length;i++){
      const o=obstacles[i];
      if(elapsed>=o.biasAt){
        o.biasTarget=rnd(-[18,22,25,28][p],[18,22,25,28][p]);
        o.biasAt=elapsed+rnd([1.25,1.05,.85,.7][p],[1.85,1.55,1.3,1.05][p]);
      }
      o.bias+=(o.biasTarget-o.bias)*Math.min(1,dt*[1.4,1.8,2.2,2.6][p]);
      let desired=routeX+o.offset+o.bias+Math.sin(now/o.waveMs+o.phase)*o.wander;
      if(i>0){
        const prev=obstacles[i-1];
        const overlap=Math.max(44,(prev.gapW+o.gapW)/2-[42,45,47,49][p]);
        desired=clamp(desired,prev.gapX-overlap,prev.gapX+overlap);
      }
      const edge=o.gapW/2+12;desired=clamp(desired,edge,W-edge);
      o.gapX+=(desired-o.gapX)*Math.min(1,dt*(o.lag+[0,.25,.45,.7][p]));
      o.flash=Math.max(0,o.flash-dt);o.slam=Math.max(0,o.slam-dt*3.8);
    }
  }

  function target(){
    const top=obstacles[obstacles.length-1];
    const widths=[148,132,118,106];
    return{x:top?top.gapX:routeX,width:widths[phase()],y:Math.max(154,H*.19),h:42};
  }

  function spawnPower(){
    const kind=Math.random()<.55?'INTRO':'GOOD RECRUITER',side=Math.random()<.5?-1:1;
    const x=clamp(bottomGap()+side*rnd(W*.22,W*.31),48,W-48),y=H*.77+rnd(-15,15);
    powerups.push({id:++seq,kind,x,y,r:27,life:5.3,vx:rnd(-5,5),pulse:rnd(0,6.28)});
    const p=phase(),windows=[[4.8,6.3],[4.2,5.6],[3.7,5],[3.2,4.4]][p];nextPowerAt=elapsed+rnd(windows[0],windows[1]);
  }

  function changeChaos(){
    const p=phase(),o=pick(obstacles),widths=[.275,.245,.218,.195];
    o.type=pick(blockers);o.gapW=Math.max(82,W*widths[p]);
    o.offset=clamp(o.offset+rnd(-16,16),-28,28);o.wander=clamp(o.wander+rnd(-4,6),8,26);o.lag=clamp(o.lag+rnd(-.3,.35),1.45,3.1);o.flash=1;
    if(o.type==='GENERIC REJECTION')o.slam=1;
    const windows=[[3.6,5],[3.0,4.2],[2.4,3.5],[1.9,2.8]][p];nextChaosAt=elapsed+rnd(windows[0],windows[1]);
  }

  function hitPower(p,cv,now){
    p.life=0;burst(p.x,p.y,'#7cf3ad',24);
    if(p.kind==='INTRO'){
      introLaneX=p.x;introUntil=now+5000;boostName='REFERRAL LANE';boostUntil=now+5000;boom('REFERRAL LANE OPEN');cv.referral=true;cv.color='#b9ff7a';
    }else{
      recruiterX=p.x;recruiterUntil=now+4600;boostName='RECRUITER FAST TRACK';boostUntil=now+4600;boom('FAST TRACK OPEN');cv.fast=true;cv.color='#70f6ac';
    }
    cv.powerLock=0;floaters.push({t:p.kind==='INTRO'?'REFERRAL!':'FAST TRACK!',x:p.x,y:p.y,l:1.2,color:'#7cf3ad'});
  }

  function laneCenterAtY(bottomX,tar,y){
    const y0=H-102,y1=tar.y+tar.h/2,t=clamp((y0-y)/(y0-y1),0,1);return bottomX+(tar.x-bottomX)*t;
  }

  function obstacleCollision(cv,o,now,tar){
    if(now<introUntil){const lx=laneCenterAtY(introLaneX,tar,o.y);if(Math.abs(cv.x-lx)<40)return false}
    if(now<recruiterUntil){const lx=laneCenterAtY(recruiterX,tar,o.y);if(Math.abs(cv.x-lx)<34)return false}
    if(Math.abs(cv.y-o.y)>=10)return false;
    if(Math.abs(cv.x-o.gapX)<o.gapW/2)return false;
    if(o.type==='500+'&&Math.random()<.55){cv.vx+=rnd(-105,105);cv.vy*=.72;floaters.push({t:'500+',x:cv.x,y:cv.y,l:.45,color:'#ffca72'});return false}
    cv.alive=false;burst(cv.x,cv.y,'#ff7586',7);floaters.push({t:o.type,x:cv.x,y:cv.y,l:.52,color:o.type==='NO RESPONSE'?'#91a0b5':'#ff9aa6'});return true;
  }

  function scoreInterview(cv,y){
    interviews++;combo++;bestCombo=Math.max(bestCombo,combo);burst(cv.x,y,'#d9ff69',18);boom(combo>1?'INTERVIEW ×'+combo:'INTERVIEW!');cv.alive=false;
  }

  function update(dt,now){
    elapsed=(now-startAt)/1000;if(elapsed>=duration){endGame();return}
    if(elapsed>=nextRouteAt)chooseRouteTarget();routeX+=(routeTarget-routeX)*Math.min(1,dt*routeEase);updateGates(dt,now);

    const gap=bottomGap(),delta=aimX-lastAimX,speed=Math.abs(delta)/Math.max(dt,.001);aimVelocity=aimVelocity*.72+speed*.28;lastAimX=aimX;
    idleTime=speed<12?idleTime+dt:0;
    const error=Math.abs(aimX-gap);
    if(error<58&&aimVelocity<260)steady=Math.min(1.3,steady+dt*(error<30?1.25:.82));
    else if(error>82||aimVelocity>330)steady=Math.max(0,steady-dt*2.9);else steady=Math.max(0,steady-dt*.4);
    if(idleTime>1.8&&error>45)steady=Math.max(0,steady-dt*1.8);

    shotClock+=dt;spawnCV(now);if(elapsed>=nextPowerAt)spawnPower();if(elapsed>=nextChaosAt)changeChaos();
    powerups.forEach(p=>{p.x+=p.vx*dt;if(p.x<36||p.x>W-36)p.vx*=-1;p.life-=dt});

    const tar=target();
    for(const cv of cvs){
      if(!cv.alive)continue;cv.age+=dt;
      const power=cv.powerLock?powerups.find(q=>q.id===cv.powerLock&&q.life>0):null;
      if(power&&cv.y>power.y-8)cv.vx+=clamp((power.x-cv.x)*dt*8,-48,48);
      if(cv.referral&&now<introUntil){const lx=laneCenterAtY(introLaneX,tar,cv.y);cv.vx+=clamp((lx-cv.x)*dt*5.2,-38,38)}
      if(cv.fast&&now<recruiterUntil){const lx=laneCenterAtY(recruiterX,tar,cv.y);cv.vx+=clamp((lx-cv.x)*dt*7,-52,52);cv.vy=Math.min(cv.vy,-300)}
      cv.vx=clamp(cv.vx,-185,185);cv.x+=cv.vx*dt;cv.y+=cv.vy*dt;
      if(cv.x<8||cv.x>W-8){cv.vx*=-.45;cv.x=clamp(cv.x,8,W-8)}
      for(const p of powerups){if(p.life>0&&Math.hypot(cv.x-p.x,cv.y-p.y)<p.r+8){hitPower(p,cv,now);break}}
      for(const o of obstacles){if(obstacleCollision(cv,o,now,tar))break}
      if(!cv.alive)continue;
      if(cv.y<=tar.y+tar.h/2){if(Math.abs(cv.x-tar.x)<tar.width/2)scoreInterview(cv,tar.y);else{cv.alive=false;combo=0;floaters.push({t:'MISSED',x:cv.x,y:tar.y+24,l:.45,color:'#8191a6'})}}
    }

    cvs=cvs.filter(x=>x.alive&&x.y>-20&&x.age<4.3);powerups=powerups.filter(p=>p.life>0);
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.985;p.vy*=.985;p.l-=dt});particles=particles.filter(p=>p.l>0);
    floaters.forEach(f=>{f.y-=16*dt;f.l-=dt});floaters=floaters.filter(f=>f.l>0);updateHud();
  }

  function drawGate(o,now){
    ctx.save();const squeeze=o.slam>0?Math.sin(o.slam*Math.PI)*14:0,gapW=Math.max(66,o.gapW-squeeze),x1=clamp(o.gapX-gapW/2,0,W),x2=clamp(o.gapX+gapW/2,0,W);
    ctx.fillStyle=o.flash>0?'rgba(255,182,104,.22)':'rgba(255,255,255,.08)';ctx.fillRect(0,o.y-8,x1,16);ctx.fillRect(x2,o.y-8,W-x2,16);
    ctx.strokeStyle='rgba(255,255,255,.15)';ctx.lineWidth=1;ctx.strokeRect(0,o.y-8,x1,16);ctx.strokeRect(x2,o.y-8,W-x2,16);
    ctx.fillStyle=o.type==='NO RESPONSE'?'#8999ad':'#c4d1df';ctx.font='900 9px system-ui';ctx.textAlign='center';const lx=x1>70?x1/2:(x2+W)/2;ctx.fillText(o.type,lx,o.y+3);
    if(o.type==='AI SCREEN'){ctx.strokeStyle='rgba(174,140,255,.34)';ctx.beginPath();ctx.moveTo(o.gapX,o.y-15);ctx.lineTo(aimX,H-110);ctx.stroke()}
    ctx.restore();
  }

  function drawPower(p,now){
    const pulse=5+Math.sin(now/170+p.pulse)*3,lock=Math.abs(aimX-p.x)<68;
    ctx.save();ctx.strokeStyle=lock?'rgba(124,243,173,.98)':'rgba(124,243,173,.5)';ctx.lineWidth=lock?2.6:1.4;ctx.beginPath();ctx.arc(p.x,p.y,p.r+pulse,0,Math.PI*2);ctx.stroke();
    if(lock){ctx.setLineDash([6,6]);ctx.strokeStyle='rgba(124,243,173,.45)';ctx.beginPath();ctx.moveTo(aimX,H-102);ctx.lineTo(p.x,p.y+p.r+8);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#7cf3ad';ctx.font='950 8px system-ui';ctx.textAlign='center';ctx.fillText('TARGET LOCK',p.x,p.y-p.r-13)}
    ctx.shadowColor='#7cf3ad';ctx.shadowBlur=15;ctx.fillStyle='rgba(8,32,26,.98)';ctx.strokeStyle='#7cf3ad';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    ctx.fillStyle='#7cf3ad';ctx.textAlign='center';ctx.font='900 9px system-ui';ctx.fillText(p.kind==='INTRO'?'INTRO':'RECRUITER',p.x,p.y+3);ctx.restore();
  }

  function drawBoostLane(now,tar){
    let active=false,bottom=0,label='',until=0,width=0;
    if(now<introUntil){active=true;bottom=introLaneX;label='REFERRAL LANE';until=introUntil;width=78}
    else if(now<recruiterUntil){active=true;bottom=recruiterX;label='GOOD RECRUITER · FAST TRACK';until=recruiterUntil;width=66}
    if(!active)return;
    const topY=tar.y+tar.h/2,bottomY=H-88,leftB=bottom-width/2,rightB=bottom+width/2,leftT=tar.x-width/2,rightT=tar.x+width/2;
    ctx.save();ctx.fillStyle='rgba(124,243,173,.13)';ctx.strokeStyle='rgba(124,243,173,.72)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(leftB,bottomY);ctx.lineTo(leftT,topY);ctx.lineTo(rightT,topY);ctx.lineTo(rightB,bottomY);ctx.closePath();ctx.fill();ctx.setLineDash([9,7]);ctx.stroke();ctx.setLineDash([]);
    const cx=y=>laneCenterAtY(bottom,tar,y);ctx.fillStyle='rgba(124,243,173,.9)';
    for(let i=0;i<4;i++){const f=((now/520)+i/4)%1,y=bottomY-(bottomY-topY)*f,x=cx(y);ctx.beginPath();ctx.moveTo(x-6,y+5);ctx.lineTo(x,y-3);ctx.lineTo(x+6,y+5);ctx.strokeStyle='rgba(124,243,173,.85)';ctx.stroke()}
    ctx.font='950 10px system-ui';ctx.textAlign='center';ctx.fillText(`${label} ${Math.max(0,(until-now)/1000).toFixed(1)}s`,W/2,H-72);ctx.restore();
  }

  function drawCV(cv){
    ctx.save();ctx.translate(cv.x,cv.y);ctx.rotate(cv.vx*.004);ctx.shadowColor=cv.color;ctx.shadowBlur=8;ctx.fillStyle='#0a1827';ctx.strokeStyle=cv.color;ctx.lineWidth=1.4;ctx.beginPath();ctx.roundRect(-9,-6,18,12,3);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle=cv.color;ctx.font='800 6px system-ui';ctx.textAlign='center';ctx.fillText('CV',0,2);ctx.restore();
  }

  function draw(now){
    ctx.clearRect(0,0,W,H);ctx.fillStyle='rgba(255,255,255,.022)';for(let i=0;i<28;i++){ctx.beginPath();ctx.arc((i*71)%W,(i*107)%H,1,0,6.28);ctx.fill()}
    const tar=target();drawBoostLane(now,tar);
    ctx.save();ctx.shadowColor='#d9ff69';ctx.shadowBlur=16;ctx.fillStyle='rgba(18,38,20,.92)';ctx.strokeStyle='#d9ff69';ctx.lineWidth=2.3;ctx.beginPath();ctx.roundRect(tar.x-tar.width/2,tar.y-tar.h/2,tar.width,tar.h,12);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#d9ff69';ctx.font='950 13px system-ui';ctx.textAlign='center';ctx.fillText('INTERVIEW',tar.x,tar.y+4);ctx.restore();
    obstacles.forEach(o=>drawGate(o,now));powerups.forEach(p=>drawPower(p,now));cvs.forEach(drawCV);
    particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.l);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,2.4,0,6.28);ctx.fill();ctx.globalAlpha=1});
    floaters.forEach(f=>{ctx.globalAlpha=Math.min(1,f.l*1.7);ctx.fillStyle=f.color;ctx.font='950 10px system-ui';ctx.textAlign='center';ctx.fillText(f.t,f.x,f.y);ctx.globalAlpha=1});
    ctx.save();ctx.strokeStyle='rgba(103,223,255,.35)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(aimX,H-102);ctx.lineTo(aimX,H-160);ctx.stroke();ctx.fillStyle='#67dfff';ctx.beginPath();ctx.arc(aimX,H-102,12,0,6.28);ctx.fill();ctx.fillStyle='#07131f';ctx.font='900 7px system-ui';ctx.textAlign='center';ctx.fillText('YOU',aimX,H-100);ctx.restore();
  }

  function endGame(){
    if(state!=='play')return;state='over';hud.classList.add('hidden');gameover.classList.remove('hidden');best=Math.max(best,interviews);try{localStorage.setItem('cv-chaos-best',best)}catch(_){}
    $('rInterviews').textContent=interviews;$('rSent').textContent=sent;$('rCombo').textContent=bestCombo>1?'×'+bestCombo:'—';$('rBest').textContent=best;
    $('resultLine').textContent=interviews?`${sent-interviews} CVs vanished, missed or got blocked. Best: ${best} interviews.`:`A very realistic run. Best so far: ${best} interviews.`;draw(performance.now());
  }

  function moveAim(clientX){const r=canvas.getBoundingClientRect();aimX=clamp(clientX-r.left,22,W-22)}
  function pointerDown(e){if(state!=='play')return;e.preventDefault();moveAim(e.clientX);canvas.setPointerCapture?.(e.pointerId)}
  function pointerMove(e){if(state!=='play'||!(e.buttons||e.pointerType==='touch'))return;e.preventDefault();moveAim(e.clientX)}
  function pointerUp(e){if(state!=='play')return;e.preventDefault();moveAim(e.clientX)}
  function nudge(dx){if(state!=='play')return;aimX=clamp(aimX+dx,22,W-22)}
  async function share(){const text=`I got ${interviews} interviews from ${sent} CVs in 45 seconds of CV Chaos. Best combo ${bestCombo>1?'×'+bestCombo:'—'}.`;try{if(navigator.share)await navigator.share({title:'CV Chaos — The Job Hunt',text,url:location.href.split('?')[0]})}catch(_){}}
  function loop(now){if(state!=='play')return;const dt=Math.min(.033,(now-last)/1000||0);last=now;update(dt,now);draw(now);if(state==='play')raf=requestAnimationFrame(loop)}

  ['contextmenu','dblclick','selectstart','dragstart'].forEach(ev=>document.addEventListener(ev,e=>e.preventDefault(),{passive:false}));
  document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});document.addEventListener('touchmove',e=>{if(state==='play')e.preventDefault()},{passive:false});
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',pointerUp);
  $('leftBtn').addEventListener('pointerdown',e=>{e.preventDefault();nudge(-48)});$('rightBtn').addEventListener('pointerdown',e=>{e.preventDefault();nudge(48)});
  $('playBtn').onclick=startGame;$('againBtn').onclick=startGame;$('shareBtn').onclick=share;window.addEventListener('resize',resize);resize();draw(performance.now());
})();