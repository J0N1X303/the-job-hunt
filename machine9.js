(()=>{
  const $=id=>document.getElementById(id);
  const canvas=$('game'),ctx=canvas.getContext('2d'),shell=$('shell');
  const start=$('start'),hud=$('hud'),gameover=$('gameover');
  const interviewsEl=$('interviewsHud'),timeEl=$('timeHud'),shortlistEl=$('shortlistHud'),motivationEl=$('motivationFill'),motivationLabel=$('motivationLabel');
  const bigToast=$('bigToast');

  let W=0,H=0,dpr=1,state='start',raf=0,last=0,startAt=0,elapsed=0,duration=60;
  let aimX=0,lastAimX=0,aimVelocity=0,steady=0,shotClock=0,interviews=0,sent=0,seq=0,idleTime=0,motivation=74;
  let shortlistProgress=0,shortlisted=0,lifeBoostsWon=0;
  const shortlistTarget=8;
  let cvs=[],obstacles=[],powerups=[],particles=[],floaters=[];
  let introUntil=0,recruiterUntil=0,recruiterGateId=0,recruiterGapX=0,boostUntil=0,nextPowerAt=0,nextLifeAt=0,nextChaosAt=0,bigT=0;
  let routeX=0,routeTarget=0,nextRouteAt=0,routeEase=1.5;
  let nextCrashAt=0,nextSetbackAt=0,setbackStreak=0,lastInterviewBoostAt=-99;
  let best=0;
  try{best=Number(localStorage.getItem('cv-chaos-best')||0)}catch(_){}

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rnd=(a,b)=>a+Math.random()*(b-a);
  const pick=a=>a[Math.random()*a.length|0];
  const blockers=['ATS','NO RESPONSE','GENERIC REJECTION','AI SCREEN','500+','UPLOAD CV AGAIN'];

  function phase(){return elapsed<12?0:elapsed<32?1:elapsed<50?2:3}
  function resize(){
    const r=shell.getBoundingClientRect();W=r.width;H=r.height;dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    if(!aimX)aimX=W/2;if(!routeX){routeX=W/2;routeTarget=W*.72}
    draw(performance.now());
  }
  function boom(t,ms=800){clearTimeout(bigT);bigToast.textContent=t;bigToast.classList.add('show');bigT=setTimeout(()=>bigToast.classList.remove('show'),ms)}
  function burst(x,y,color,n=12){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=rnd(35,120);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:rnd(.35,.8),color})}}
  function motivationChange(amount,label){
    const before=motivation;motivation=clamp(motivation+amount,12,100);
    if(label&&Math.abs(motivation-before)>1.2)floaters.push({t:label,x:W*.5,y:H*.83,l:.82,color:amount>0?'#d9ff69':'#ff9aa6'});
  }
  function registerSetback(type){
    if(elapsed<nextSetbackAt)return;
    nextSetbackAt=elapsed+rnd(1.35,1.9);
    const drops={'NO RESPONSE':4.8,'GENERIC REJECTION':4.3,'ATS':3.4,'AI SCREEN':3.0,'500+':2.4,'UPLOAD CV AGAIN':3.7};
    const drop=drops[type]||3.2;
    motivationChange(-drop,type==='NO RESPONSE'?'NO RESPONSE':type==='GENERIC REJECTION'?'GENERIC REJECTION':'MOTIVATION -'+Math.round(drop));
    setbackStreak++;
    if(setbackStreak>=4&&motivation>48){
      motivationChange(-7,'ROUGH PATCH');boom('ROUGH PATCH');setbackStreak=0;nextCrashAt=Math.max(nextCrashAt,elapsed+5.5);
    }
  }
  function interviewBoost(){
    let gain=motivation>82?1.4:motivation>65?2.6:4.2;
    if(elapsed-lastInterviewBoostAt<.65)gain*=.45;
    lastInterviewBoostAt=elapsed;motivationChange(gain,gain>=2?'MOTIVATION +'+Math.round(gain):'');
    setbackStreak=Math.max(0,setbackStreak-1);
  }
  function scheduledCrash(){
    if(elapsed<nextCrashAt)return;
    const drop=motivation>75?rnd(15,20):motivation>50?rnd(10,15):rnd(6,9);
    motivationChange(-drop,'MOTIVATION CRASH');boom('MOTIVATION CRASH');
    setbackStreak=0;nextCrashAt=elapsed+rnd(13,17);
  }

  function makeGate(y,type,offset,phaseSeed){
    return {id:++seq,y,type,offset,gapX:W/2+offset,gapW:Math.max(108,W*.29),flash:0,phase:phaseSeed,wander:rnd(9,19),waveMs:rnd(610,1030),lag:rnd(1.75,2.75),bias:0,biasTarget:rnd(-12,12),biasAt:rnd(.5,1.2),slam:0};
  }
  function resetObstacles(){obstacles=[makeGate(H*.68,'ATS',-10,.3),makeGate(H*.51,'NO RESPONSE',15,2.1),makeGate(H*.35,'GENERIC REJECTION',-5,4.3)]}

  function chooseRouteTarget(){
    const p=phase(),edge=Math.max(76,W*.17),minX=edge,maxX=W-edge,minMove=W*([.22,.25,.28,.30][p]);
    let candidate=routeTarget||W/2;
    for(let i=0;i<10;i++){candidate=rnd(minX,maxX);if(Math.abs(candidate-routeX)>=minMove)break}
    if(Math.abs(candidate-routeX)<minMove)candidate=routeX<W/2?maxX:minX;
    routeTarget=candidate;routeEase=rnd([1.55,1.9,2.25,2.6][p],[1.9,2.3,2.65,3.05][p]);
    const windows=[[1.9,2.6],[1.55,2.2],[1.25,1.85],[1.05,1.55]][p];nextRouteAt=elapsed+rnd(windows[0],windows[1]);
  }

  function reset(){
    elapsed=0;aimX=W/2;lastAimX=aimX;aimVelocity=0;steady=.15;shotClock=0;interviews=sent=shortlisted=shortlistProgress=lifeBoostsWon=0;idleTime=0;motivation=74;
    cvs=[];powerups=[];particles=[];floaters=[];introUntil=recruiterUntil=boostUntil=0;recruiterGateId=0;recruiterGapX=W/2;
    nextPowerAt=3.8;nextLifeAt=rnd(11,15);nextChaosAt=4.7;routeX=W/2;routeTarget=W*.73;routeEase=1.6;nextRouteAt=1.2;
    nextCrashAt=rnd(10.5,14.5);nextSetbackAt=0;setbackStreak=0;lastInterviewBoostAt=-99;
    resetObstacles();updateHud();
  }

  function startGame(){
    reset();state='play';start.classList.add('hidden');gameover.classList.add('hidden');hud.classList.remove('hidden');
    startAt=last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
  }

  function bottomGap(){return obstacles.length?obstacles[0].gapX:routeX}
  function updateHud(){
    interviewsEl.textContent=interviews;timeEl.textContent=Math.max(0,duration-elapsed).toFixed(1);shortlistEl.textContent=shortlistProgress+'/'+shortlistTarget;
    motivationEl.style.width=motivation+'%';motivationLabel.textContent=Math.round(motivation)+'%';
  }

  function activePower(){
    let bestP=null,bestD=Infinity;
    for(const p of powerups){if(p.life<=0)continue;const d=Math.abs(aimX-p.x);if(d<bestD){bestD=d;bestP=p}}
    return bestP;
  }

  function spawnCV(){
    const focus=clamp(steady/1.15,0,1),m=motivation/100,spread=32-(25*focus);
    const interval=(.24-.14*m)+(.065*focus);
    if(shotClock<interval)return;shotClock=0;sent++;
    const p=activePower(),lock=p&&Math.abs(aimX-p.x)<68,x=aimX+rnd(-spread,spread);
    const cv={id:++seq,x,y:H-115,vx:rnd(-10,10)*(1-focus),vy:-rnd(245,282),alive:true,age:0,color:'#6fe2ff',powerLock:lock?p.id:0};
    if(lock)cv.vx+=(p.x-x)*2.1;cvs.push(cv);
  }

  function updateGates(dt,now){
    const p=phase();
    for(let i=0;i<obstacles.length;i++){
      const o=obstacles[i];
      if(elapsed>=o.biasAt){o.biasTarget=rnd(-[18,22,25,28][p],[18,22,25,28][p]);o.biasAt=elapsed+rnd([1.25,1.05,.85,.7][p],[1.85,1.55,1.3,1.05][p])}
      o.bias+=(o.biasTarget-o.bias)*Math.min(1,dt*[1.4,1.8,2.2,2.6][p]);
      let desired=routeX+o.offset+o.bias+Math.sin(now/o.waveMs+o.phase)*o.wander;
      if(i>0){const prev=obstacles[i-1],overlap=Math.max(44,(prev.gapW+o.gapW)/2-[42,45,47,49][p]);desired=clamp(desired,prev.gapX-overlap,prev.gapX+overlap)}
      const edge=o.gapW/2+12;desired=clamp(desired,edge,W-edge);o.gapX+=(desired-o.gapX)*Math.min(1,dt*(o.lag+[0,.25,.45,.7][p]));
      o.flash=Math.max(0,o.flash-dt);o.slam=Math.max(0,o.slam-dt*3.8);
    }
  }

  function target(){
    const top=obstacles[obstacles.length-1],widths=[148,132,118,106];return{x:top?top.gapX:routeX,width:widths[phase()],y:Math.max(154,H*.19),h:46};
  }

  function spawnPower(){
    const kind=Math.random()<.55?'INTRO':'GOOD RECRUITER',side=Math.random()<.5?-1:1;
    const centreMin=W*.24,centreMax=W*.76;
    const x=clamp(bottomGap()+side*rnd(W*.14,W*.23),centreMin,centreMax),y=H*.77+rnd(-15,15);
    powerups.push({id:++seq,kind,x,y,r:27,life:5.8,vx:rnd(-4,4),pulse:rnd(0,6.28)});
    const p=phase(),windows=[[4.8,6.3],[4.2,5.6],[3.7,5],[3.2,4.4]][p];nextPowerAt=elapsed+rnd(windows[0],windows[1]);
  }

  function spawnLifeBoost(){
    const kind=Math.random()<.5?'FRIENDS':'EXERCISE',side=Math.random()<.5?-1:1;
    const x=clamp(bottomGap()+side*rnd(W*.24,W*.35),48,W-48),y=H*.73+rnd(-16,18);
    powerups.push({id:++seq,kind,x,y,r:28,life:6.4,vx:rnd(-3,3),pulse:rnd(0,6.28)});
    nextLifeAt=elapsed+rnd(15,20);
  }

  function changeChaos(){
    const p=phase(),o=pick(obstacles),widths=[.275,.245,.218,.195];
    const others=obstacles.filter(g=>g.id!==o.id).map(g=>g.type);
    let choices=blockers;
    if(others.length===2&&others[0]===others[1])choices=blockers.filter(t=>t!==others[0]);
    o.type=pick(choices);o.gapW=Math.max(82,W*widths[p]);o.offset=clamp(o.offset+rnd(-16,16),-28,28);o.wander=clamp(o.wander+rnd(-4,6),8,26);o.lag=clamp(o.lag+rnd(-.3,.35),1.45,3.1);o.flash=1;
    if(o.type==='GENERIC REJECTION')o.slam=1;
    const windows=[[3.6,5],[3.0,4.2],[2.4,3.5],[1.9,2.8]][p];nextChaosAt=elapsed+rnd(windows[0],windows[1]);
  }

  function hitPower(p,cv,now){
    p.life=0;cv.powerLock=0;
    const lifeBoost=p.kind==='FRIENDS'||p.kind==='EXERCISE';
    if(lifeBoost){
      const color='#ffca72';burst(p.x,p.y,color,24);lifeBoostsWon++;
      let gain=p.kind==='FRIENDS'?11:9;
      if(motivation>85)gain*=.55;else if(motivation<45)gain*=1.15;
      gain=Math.round(gain);
      motivationChange(gain,(p.kind==='FRIENDS'?'FRIENDS & FAMILY ':'EXERCISE ')+ '+'+gain);
      boom(p.kind==='FRIENDS'?'FRIENDS & FAMILY':'EXERCISE');setbackStreak=Math.max(0,setbackStreak-2);return;
    }
    burst(p.x,p.y,'#7cf3ad',24);
    if(p.kind==='INTRO'){
      introUntil=now+4700;boostUntil=introUntil;motivationChange(motivation>80?4:8,'MOTIVATION BOOST');boom('NETWORK INTRO');floaters.push({t:'NEXT GAPS OPEN',x:p.x,y:p.y,l:1.1,color:'#7cf3ad'});
    }else{
      recruiterUntil=now+4300;boostUntil=recruiterUntil;motivationChange(motivation>80?5:10,'MOTIVATION BOOST');
      const choices=obstacles.slice(1),gate=pick(choices.length?choices:obstacles);recruiterGateId=gate.id;recruiterGapX=clamp(p.x,W*.24,W*.76);boom('GOOD RECRUITER');floaters.push({t:'SHORTCUT OPEN',x:p.x,y:p.y,l:1.1,color:'#7cf3ad'});
    }
  }

  function normalGapWidth(o,now){return o.gapW+(now<introUntil?48:0)}
  function recruiterShortcut(o,now){return now<recruiterUntil&&o.id===recruiterGateId?{x:recruiterGapX,w:72}:null}

  function obstacleCollision(cv,o,now){
    if(Math.abs(cv.y-o.y)>=10)return false;
    const gapW=normalGapWidth(o,now);if(Math.abs(cv.x-o.gapX)<gapW/2)return false;
    const shortcut=recruiterShortcut(o,now);if(shortcut&&Math.abs(cv.x-shortcut.x)<shortcut.w/2)return false;
    if(o.type==='500+'&&Math.random()<.55){cv.vx+=rnd(-105,105);cv.vy*=.72;floaters.push({t:'500+',x:cv.x,y:cv.y,l:.45,color:'#ffca72'});registerSetback('500+');return false}
    cv.alive=false;registerSetback(o.type);burst(cv.x,cv.y,'#ff7586',7);floaters.push({t:o.type,x:cv.x,y:cv.y,l:.52,color:o.type==='NO RESPONSE'?'#91a0b5':'#ff9aa6'});return true;
  }

  function reachHiringTeam(cv,tar){
    shortlisted++;shortlistProgress++;cv.alive=false;
    burst(cv.x,tar.y,'#67dfff',7);
    floaters.push({t:'SHORTLIST '+shortlistProgress+'/'+shortlistTarget,x:cv.x,y:tar.y+28,l:.48,color:'#8be9ff'});
    if(shortlistProgress>=shortlistTarget){
      shortlistProgress-=shortlistTarget;interviews++;interviewBoost();burst(tar.x,tar.y,'#d9ff69',24);boom('INTERVIEW!');
    }
    updateHud();
  }

  function update(dt,now){
    elapsed=(now-startAt)/1000;if(elapsed>=duration){endGame();return}
    motivationChange(-dt*.48);scheduledCrash();
    if(elapsed>=nextRouteAt)chooseRouteTarget();routeX+=(routeTarget-routeX)*Math.min(1,dt*routeEase);updateGates(dt,now);

    const gap=bottomGap(),delta=aimX-lastAimX,speed=Math.abs(delta)/Math.max(dt,.001);aimVelocity=aimVelocity*.72+speed*.28;lastAimX=aimX;idleTime=speed<12?idleTime+dt:0;
    const error=Math.abs(aimX-gap);
    if(error<58&&aimVelocity<260)steady=Math.min(1.3,steady+dt*(error<30?1.25:.82));
    else if(error>82||aimVelocity>330)steady=Math.max(0,steady-dt*2.9);else steady=Math.max(0,steady-dt*.4);
    if(idleTime>1.8&&error>45)steady=Math.max(0,steady-dt*1.8);

    shotClock+=dt;spawnCV();if(elapsed>=nextPowerAt)spawnPower();if(elapsed>=nextLifeAt)spawnLifeBoost();if(elapsed>=nextChaosAt)changeChaos();powerups.forEach(p=>{p.x+=p.vx*dt;if(p.x<36||p.x>W-36)p.vx*=-1;p.life-=dt});

    const tar=target();
    for(const cv of cvs){
      if(!cv.alive)continue;cv.age+=dt;
      const power=cv.powerLock?powerups.find(q=>q.id===cv.powerLock&&q.life>0):null;
      if(power&&cv.y>power.y-8)cv.vx+=clamp((power.x-cv.x)*dt*6.5,-36,36);
      cv.vx=clamp(cv.vx,-180,180);cv.x+=cv.vx*dt;cv.y+=cv.vy*dt;
      if(cv.x<8||cv.x>W-8){cv.vx*=-.45;cv.x=clamp(cv.x,8,W-8)}
      for(const p of powerups){if(p.life>0&&Math.hypot(cv.x-p.x,cv.y-p.y)<p.r+8){hitPower(p,cv,now);break}}
      for(const o of obstacles){if(obstacleCollision(cv,o,now))break}
      if(!cv.alive)continue;
      if(cv.y<=tar.y+tar.h/2){
        if(Math.abs(cv.x-tar.x)<tar.width/2)reachHiringTeam(cv,tar);
        else{cv.alive=false;if(elapsed>=nextSetbackAt){motivationChange(-2.2,'MISSED');nextSetbackAt=elapsed+1.5}floaters.push({t:'MISSED',x:cv.x,y:tar.y+24,l:.45,color:'#8191a6'})}
      }
    }

    cvs=cvs.filter(x=>x.alive&&x.y>-20&&x.age<4.3);powerups=powerups.filter(p=>p.life>0);
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.985;p.vy*=.985;p.l-=dt});particles=particles.filter(p=>p.l>0);
    floaters.forEach(f=>{f.y-=16*dt;f.l-=dt});floaters=floaters.filter(f=>f.l>0);updateHud();
  }

  function drawGate(o,now){
    ctx.save();
    const squeeze=o.slam>0?Math.sin(o.slam*Math.PI)*14:0,gapW=Math.max(66,normalGapWidth(o,now)-squeeze),y=o.y-8;
    ctx.fillStyle=o.flash>0?'rgba(255,182,104,.22)':'rgba(255,255,255,.08)';ctx.fillRect(0,y,W,16);
    ctx.clearRect(clamp(o.gapX-gapW/2,0,W),y-1,Math.min(gapW,W),18);
    const shortcut=recruiterShortcut(o,now);
    if(shortcut){
      ctx.clearRect(clamp(shortcut.x-shortcut.w/2,0,W),y-1,shortcut.w,18);
      ctx.strokeStyle='rgba(124,243,173,.95)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(shortcut.x-shortcut.w/2,o.y-13);ctx.lineTo(shortcut.x-shortcut.w/2,o.y+13);ctx.moveTo(shortcut.x+shortcut.w/2,o.y-13);ctx.lineTo(shortcut.x+shortcut.w/2,o.y+13);ctx.stroke();
      ctx.fillStyle='#7cf3ad';ctx.font='950 8px system-ui';ctx.textAlign='center';ctx.fillText('RECRUITER',shortcut.x,o.y-18);
    }
    if(now<introUntil){
      ctx.strokeStyle='rgba(124,243,173,.72)';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(o.gapX-gapW/2,o.y-13);ctx.lineTo(o.gapX-gapW/2,o.y+13);ctx.moveTo(o.gapX+gapW/2,o.y-13);ctx.lineTo(o.gapX+gapW/2,o.y+13);ctx.stroke();
    }
    ctx.fillStyle=o.type==='NO RESPONSE'?'#8999ad':'#c4d1df';ctx.font='900 9px system-ui';ctx.textAlign='left';ctx.fillText(o.type,10,o.y+3);
    ctx.restore();
  }

  function drawPower(p,now){
    const lifeBoost=p.kind==='FRIENDS'||p.kind==='EXERCISE',color=lifeBoost?'#ffca72':'#7cf3ad';
    const label=p.kind==='FRIENDS'?'FRIENDS':p.kind==='EXERCISE'?'EXERCISE':p.kind==='INTRO'?'INTRO':'RECRUITER';
    const pulse=5+Math.sin(now/170+p.pulse)*3,lock=Math.abs(aimX-p.x)<68;
    ctx.save();ctx.strokeStyle=lock?color:(lifeBoost?'rgba(255,202,114,.55)':'rgba(124,243,173,.5)');ctx.lineWidth=lock?2.6:1.4;ctx.beginPath();ctx.arc(p.x,p.y,p.r+pulse,0,Math.PI*2);ctx.stroke();
    if(lock){ctx.strokeStyle=color;ctx.lineWidth=1.5;const s=p.r+11;ctx.beginPath();ctx.moveTo(p.x-s,p.y-s/2);ctx.lineTo(p.x-s,p.y-s);ctx.lineTo(p.x-s/2,p.y-s);ctx.moveTo(p.x+s,p.y-s/2);ctx.lineTo(p.x+s,p.y-s);ctx.lineTo(p.x+s/2,p.y-s);ctx.stroke();ctx.fillStyle=color;ctx.font='950 8px system-ui';ctx.textAlign='center';ctx.fillText('TARGET',p.x,p.y-p.r-13)}
    ctx.shadowColor=color;ctx.shadowBlur=15;ctx.fillStyle=lifeBoost?'rgba(41,29,10,.98)':'rgba(8,32,26,.98)';ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle=color;ctx.textAlign='center';ctx.font='900 9px system-ui';ctx.fillText(label,p.x,p.y+3);ctx.restore();
  }

  function drawBoostStatus(now){
    if(now<introUntil){ctx.fillStyle='rgba(124,243,173,.92)';ctx.font='950 10px system-ui';ctx.textAlign='center';ctx.fillText(`INTRO · WIDER GAPS ${(introUntil-now)/1000|0}s`,W/2,H-72)}
    if(now<recruiterUntil){ctx.fillStyle='rgba(124,243,173,.92)';ctx.font='950 10px system-ui';ctx.textAlign='center';ctx.fillText(`RECRUITER SHORTCUT ${(recruiterUntil-now)/1000|0}s`,W/2,H-58)}
  }

  function drawCV(cv){
    ctx.save();ctx.translate(cv.x,cv.y);ctx.rotate(cv.vx*.004);ctx.shadowColor=cv.color;ctx.shadowBlur=8;ctx.fillStyle='#0a1827';ctx.strokeStyle=cv.color;ctx.lineWidth=1.4;ctx.beginPath();ctx.roundRect(-9,-6,18,12,3);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle=cv.color;ctx.font='800 6px system-ui';ctx.textAlign='center';ctx.fillText('CV',0,2);ctx.restore();
  }

  function drawHiringTarget(tar){
    const p=shortlistProgress/shortlistTarget,ringX=tar.x-tar.width/2+22;
    ctx.save();ctx.shadowColor='#67dfff';ctx.shadowBlur=13;ctx.fillStyle='rgba(11,31,43,.94)';ctx.strokeStyle='#67dfff';ctx.lineWidth=2.1;ctx.beginPath();ctx.roundRect(tar.x-tar.width/2,tar.y-tar.h/2,tar.width,tar.h,12);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(255,255,255,.14)';ctx.lineWidth=4;ctx.beginPath();ctx.arc(ringX,tar.y,12,-Math.PI/2,Math.PI*1.5);ctx.stroke();
    ctx.strokeStyle='#d9ff69';ctx.lineCap='round';ctx.beginPath();ctx.arc(ringX,tar.y,12,-Math.PI/2,-Math.PI/2+Math.PI*2*p);ctx.stroke();ctx.lineCap='butt';
    ctx.fillStyle='#d9ff69';ctx.font='950 7px system-ui';ctx.textAlign='center';ctx.fillText(shortlistProgress+'/'+shortlistTarget,ringX,tar.y+2.5);
    ctx.fillStyle='#bdeeff';ctx.font='950 11px system-ui';ctx.textAlign='left';ctx.fillText('HIRING TEAM',tar.x-tar.width/2+43,tar.y+4);ctx.restore();
  }

  function draw(now){
    ctx.clearRect(0,0,W,H);ctx.fillStyle='rgba(255,255,255,.022)';for(let i=0;i<28;i++){ctx.beginPath();ctx.arc((i*71)%W,(i*107)%H,1,0,6.28);ctx.fill()}
    const tar=target();drawHiringTarget(tar);
    obstacles.forEach(o=>drawGate(o,now));powerups.forEach(p=>drawPower(p,now));cvs.forEach(drawCV);
    particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.l);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,2.4,0,6.28);ctx.fill();ctx.globalAlpha=1});
    floaters.forEach(f=>{ctx.globalAlpha=Math.min(1,f.l*1.7);ctx.fillStyle=f.color;ctx.font='950 10px system-ui';ctx.textAlign='center';ctx.fillText(f.t,f.x,f.y);ctx.globalAlpha=1});
    ctx.save();ctx.strokeStyle='rgba(103,223,255,.35)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(aimX,H-102);ctx.lineTo(aimX,H-160);ctx.stroke();ctx.fillStyle='#67dfff';ctx.beginPath();ctx.arc(aimX,H-102,12,0,6.28);ctx.fill();ctx.fillStyle='#07131f';ctx.font='900 7px system-ui';ctx.textAlign='center';ctx.fillText('YOU',aimX,H-100);ctx.restore();drawBoostStatus(now);
  }

  function endGame(){
    if(state!=='play')return;state='over';hud.classList.add('hidden');gameover.classList.remove('hidden');best=Math.max(best,interviews);try{localStorage.setItem('cv-chaos-best',best)}catch(_){}
    $('rInterviews').textContent=interviews;$('rSent').textContent=sent;$('rShortlisted').textContent=shortlisted;$('rBest').textContent=best;$('rMotivation').textContent=Math.round(motivation)+'%';
    $('resultLine').textContent=`${shortlisted} CVs reached a hiring team. ${interviews} converted to interview${interviews===1?'':'s'}. You finished on ${Math.round(motivation)}% motivation${lifeBoostsWon?` after ${lifeBoostsWon} life boost${lifeBoostsWon===1?'':'s'}`:''}.`;draw(performance.now());
  }

  function moveAim(clientX){const r=canvas.getBoundingClientRect();aimX=clamp(clientX-r.left,22,W-22)}
  function pointerDown(e){if(state!=='play')return;e.preventDefault();moveAim(e.clientX);canvas.setPointerCapture?.(e.pointerId)}
  function pointerMove(e){if(state!=='play'||!(e.buttons||e.pointerType==='touch'))return;e.preventDefault();moveAim(e.clientX)}
  function pointerUp(e){if(state!=='play')return;e.preventDefault();moveAim(e.clientX)}
  function nudge(dx){if(state!=='play')return;aimX=clamp(aimX+dx,22,W-22)}
  async function share(){const text=`I sent ${sent} CVs, got ${shortlisted} through to hiring teams and landed ${interviews} interviews in 60 seconds of CV Chaos.`;try{if(navigator.share)await navigator.share({title:'CV Chaos — The Job Hunt',text,url:location.href.split('?')[0]})}catch(_){}
  }
  function loop(now){if(state!=='play')return;const dt=Math.min(.033,(now-last)/1000||0);last=now;update(dt,now);draw(now);if(state==='play')raf=requestAnimationFrame(loop)}

  ['contextmenu','dblclick','selectstart','dragstart'].forEach(ev=>document.addEventListener(ev,e=>e.preventDefault(),{passive:false}));
  document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});document.addEventListener('touchmove',e=>{if(state==='play')e.preventDefault()},{passive:false});
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',pointerUp);
  $('leftBtn').addEventListener('pointerdown',e=>{e.preventDefault();nudge(-48)});$('rightBtn').addEventListener('pointerdown',e=>{e.preventDefault();nudge(48)});
  $('playBtn').onclick=startGame;$('againBtn').onclick=startGame;$('shareBtn').onclick=share;window.addEventListener('resize',resize);resize();draw(performance.now());
})();