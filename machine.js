(()=>{
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),shell=document.getElementById('shell');
const start=document.getElementById('start'),hud=document.getElementById('hud'),gameover=document.getElementById('gameover');
const playBtn=document.getElementById('playBtn'),againBtn=document.getElementById('againBtn'),shareBtn=document.getElementById('shareBtn');
const scoreEl=document.getElementById('scoreHud'),timeEl=document.getElementById('timeHud'),interviewsEl=document.getElementById('interviewsHud'),offersEl=document.getElementById('offersHud');
const jobBadge=document.getElementById('jobBadge'),jobTitle=document.getElementById('jobTitle'),jobTags=document.getElementById('jobTags'),jobTimer=document.getElementById('jobTimer');
const sendButton=document.getElementById('sendButton'),holdFill=document.getElementById('holdFill'),sendCopy=document.getElementById('sendCopy'),humanRoute=document.getElementById('humanRoute');
const toast=document.getElementById('toast'),bigToast=document.getElementById('bigToast');
const rScore=document.getElementById('rScore'),rApps=document.getElementById('rApps'),rTailored=document.getElementById('rTailored'),rHuman=document.getElementById('rHuman'),rInterviews=document.getElementById('rInterviews'),rOffers=document.getElementById('rOffers'),strategyEl=document.getElementById('strategyLine');
let W=0,H=0,dpr=1,state='start',raf=0,last=0,startAt=0,elapsed=0,duration=45;
let score=0,apps=0,tailored=0,human=0,interviews=0,offers=0,ghosts=0,rejects=0,missed=0,seq=0,currentJob=null,nextJobAt=0,jobDeadline=0,pressAt=0,pressing=false,tailorSent=false,toastT=0,bigT=0,best=0;
let particles=[],tokens=[],flashes=[];
try{best=Number(localStorage.getItem('machine-best')||0)}catch(_){}
const JOBS=[
 {badge:'GREAT FIT',title:'This looks almost made for you',tags:['Strong match','Salary: competitive'],fit:1.25,kind:'fit'},
 {badge:'EASY APPLY',title:'One click. 487 applicants.',tags:['Quick apply','Easy enough?'],fit:.9,kind:'easy'},
 {badge:'REMOTE*',title:'Remote role',tags:['3 days in office','Location flexible*'],fit:.95,kind:'remote'},
 {badge:'ENTRY LEVEL',title:'Entry level opportunity',tags:['5 years required','Fast-paced'],fit:.85,kind:'entry'},
 {badge:'£ COMPETITIVE',title:'Do everything. Salary secret.',tags:['Sales + Ops + Data','Competitive'],fit:.8,kind:'many'},
 {badge:'GOOD FIT',title:'You could genuinely do this',tags:['Relevant experience','Worth a look'],fit:1.08,kind:'good'},
 {badge:'NEW',title:'Posted 11 minutes ago',tags:['Already 163 applicants','Be quick'],fit:1,kind:'new'},
 {badge:'STRETCH',title:'Interesting… maybe?',tags:['Some match','Could be worth it'],fit:.78,kind:'stretch'}
];
const HUMAN=[
 {label:'🤝 NETWORK INTRO',power:1.2},
 {label:'🧑‍💼 GOOD RECRUITER',power:1.16},
 {label:'☕ QUICK CONVERSATION',power:1.1},
 {label:'💬 RECRUITER MESSAGE',power:.98}
];
const FAILS=['GHOSTED','GENERIC REJECTION','ROLE CLOSED','NO RESPONSE','ROLE REPOSTED'];
function resize(){const r=shell.getBoundingClientRect();W=r.width;H=r.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw(performance.now())}
function toastMsg(t,ms=700){clearTimeout(toastT);toast.textContent=t;toast.classList.add('show');toastT=setTimeout(()=>toast.classList.remove('show'),ms)}
function bigMsg(t,ms=850){clearTimeout(bigT);bigToast.textContent=t;bigToast.classList.add('show');bigT=setTimeout(()=>bigToast.classList.remove('show'),ms)}
function rand(a,b){return a+Math.random()*(b-a)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function pick(a){return a[(Math.random()*a.length)|0]}
function reset(){score=0;apps=0;tailored=0;human=0;interviews=0;offers=0;ghosts=0;rejects=0;missed=0;tokens=[];particles=[];flashes=[];currentJob=null;pressing=false;tailorSent=false;nextJobAt=0;updateHud()}
function startGame(){reset();state='play';start.classList.add('hidden');gameover.classList.add('hidden');hud.classList.remove('hidden');startAt=performance.now();last=startAt;spawnJob(startAt,true);cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)}
function spawnJob(now,first=false){const base={...pick(JOBS)};base.id=++seq;base.human=Math.random()<(first?.12:.26)?pick(HUMAN):null;base.tease=Math.random()<.22 || base.kind==='fit'&&Math.random()<.45;base.deadline=now+(first?3600:rand(2200,3100));currentJob=base;jobDeadline=base.deadline;jobBadge.textContent=base.badge;jobTitle.textContent=base.title;jobTags.innerHTML=base.tags.map((t,i)=>`<span class="tag ${i===1&&/competitive|applicants|office|required|secret/i.test(t)?'warn':''}">${t}</span>`).join('');humanRoute.classList.toggle('show',!!base.human);humanRoute.textContent=base.human?.label||'';sendButton.style.opacity='1';sendButton.style.pointerEvents='auto';holdFill.style.width='0%';sendCopy.innerHTML='TAP TO APPLY<span>HOLD TO TAILOR</span>'}
function lockJob(){sendButton.style.pointerEvents='none';sendButton.style.opacity='.55';humanRoute.classList.remove('show');currentJob=null;nextJobAt=performance.now()+330}
function planOutcome(mode,job){let fit=job.fit,screen=0,interview=0,offer=0;if(mode==='quick'){screen=.30*fit;interview=.105*fit;offer=.018*fit;if(job.kind==='easy'||job.kind==='new')screen+=.05}else if(mode==='tailor'){screen=.39*fit;interview=.145*fit;offer=.025*fit;if(job.kind==='fit'||job.kind==='good')interview+=.035}else{const p=job.human?.power||1;screen=.60*p*fit;interview=.26*p*fit;offer=.055*p*fit}
screen=clamp(screen,.12,.78);interview=clamp(interview,.035,.42);offer=clamp(offer,.008,.09);
const r=Math.random();let stage=0;if(r<offer)stage=4;else if(r<interview)stage=3;else if(r<screen)stage=2;else stage=1;
if(job.tease&&stage<3&&Math.random()<.58)stage=3;
let fail='';if(stage<4){fail=pick(FAILS);if(job.tease&&stage===3)fail=Math.random()<.6?'ROLE REPOSTED':'NO RESPONSE'}return{stage,fail}}
function submit(mode){if(state!=='play'||!currentJob)return;const job=currentJob;const out=planOutcome(mode,job);apps++;if(mode==='tailor')tailored++;if(mode==='human')human++;score+=mode==='human'?5:mode==='tailor'?3:1;const token={id:++seq,mode,job,out,x:W/2,y:H-245,stageIndex:0,targetIndex:1,progress:0,done:false,delay:0,color:mode==='human'?'#68f0a2':mode==='tailor'?'#d7ff63':'#67dfff'};tokens.push(token);burst(token.x,token.y,token.color,10);if(mode==='quick')toastMsg('CV SENT');if(mode==='tailor')toastMsg('TAILORED + SENT');if(mode==='human')toastMsg('HUMAN ROUTE');lockJob();updateHud()}
function pointerDown(e){if(state!=='play'||!currentJob)return;e.preventDefault();pressing=true;tailorSent=false;pressAt=performance.now();holdFill.style.width='0%'}
function pointerUp(e){if(!pressing)return;e.preventDefault();pressing=false;if(!tailorSent&&currentJob)submit('quick');holdFill.style.width='0%'}
function humanClick(e){e.preventDefault();if(state==='play'&&currentJob?.human)submit('human')}
function stages(){return[{name:'SEND',y:H-250},{name:'ATS',y:H*.59},{name:'SCREEN',y:H*.43},{name:'INTERVIEW',y:H*.27},{name:'OFFER',y:H*.135}]}
function burst(x,y,color,n=8){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=rand(30,110);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.4,.8),color})}}
function resolveToken(t){if(t.done)return;const o=t.out;if(o.stage>=4){offers++;interviews++;score+=65;bigMsg('OFFER!');burst(t.x,t.y,'#d7ff63',22)}else if(o.stage>=3){interviews++;score+=22;bigMsg('INTERVIEW!');burst(t.x,t.y,'#aaff87',15);flashes.push({text:o.fail,x:t.x,y:t.y+34,life:1.25,color:'#ffbd70'});if(o.fail==='ROLE REPOSTED')toastMsg('So close… role reposted',1000)}else if(o.stage>=2){score+=6;flashes.push({text:o.fail,x:t.x,y:t.y+30,life:1.05,color:'#ff8e9b'});rejects++}else{flashes.push({text:o.fail,x:t.x,y:t.y+24,life:.95,color:'#8999ad'});if(o.fail==='GHOSTED'||o.fail==='NO RESPONSE')ghosts++;else rejects++}t.done=true;updateHud()}
function updateTokens(dt){const st=stages();for(const t of tokens){if(t.done){t.delay+=dt;continue}const final=Math.min(t.out.stage,4);if(t.stageIndex>=final){resolveToken(t);continue}const a=st[t.stageIndex],b=st[t.stageIndex+1],speed=t.mode==='human'?2.5:t.mode==='tailor'?2.1:2.35;t.progress+=dt*speed;if(t.progress>=1){t.stageIndex++;t.progress=0;t.x+=rand(-16,16);score+=t.stageIndex===1?0:t.stageIndex===2?2:t.stageIndex===3?5:0;if(t.stageIndex>=final)resolveToken(t)}else{const ease=1-Math.pow(1-t.progress,3);t.y=a.y+(b.y-a.y)*ease;t.x=W/2+Math.sin((t.progress+t.id)*5)*12}}
tokens=tokens.filter(t=>!t.done||t.delay<1.4)}
function updateHud(){scoreEl.textContent=score;timeEl.textContent=Math.max(0,Math.ceil(duration-elapsed));interviewsEl.textContent=interviews;offersEl.textContent=offers}
function update(dt,now){elapsed=(now-startAt)/1000;if(pressing&&currentJob&&!tailorSent){const p=clamp((now-pressAt)/700,0,1);holdFill.style.width=(p*100)+'%';if(p>=1){tailorSent=true;pressing=false;submit('tailor');holdFill.style.width='0%'}}if(currentJob){const left=Math.max(0,(jobDeadline-now)/1000);jobTimer.textContent=left.toFixed(1)+'s';if(now>=jobDeadline){missed++;toastMsg('MISSED');lockJob()}}else if(now>=nextJobAt&&elapsed<duration-.5)spawnJob(now);
updateTokens(dt);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.98;p.vy*=.98;p.life-=dt}particles=particles.filter(p=>p.life>0);for(const f of flashes)f.life-=dt;flashes=flashes.filter(f=>f.life>0);updateHud();if(elapsed>=duration)endGame()}
function drawMachine(now){const st=stages();ctx.save();for(let i=1;i<st.length;i++){ctx.strokeStyle='rgba(255,255,255,.07)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(W*.18,st[i].y);ctx.lineTo(W*.82,st[i].y);ctx.stroke();ctx.fillStyle='rgba(135,154,179,.75)';ctx.font='900 9px system-ui';ctx.textAlign='left';ctx.fillText(st[i].name,W*.08,st[i].y+3)}ctx.restore()}
function drawToken(t){ctx.save();ctx.shadowColor=t.color;ctx.shadowBlur=15;ctx.fillStyle='#091725';ctx.strokeStyle=t.color;ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(t.x-28,t.y-16,56,32,8);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle=t.color;ctx.font='900 9px system-ui';ctx.textAlign='center';ctx.fillText(t.mode==='human'?'HUMAN':t.mode==='tailor'?'TAILORED':'CV',t.x,t.y+3);ctx.restore()}
function draw(now){ctx.clearRect(0,0,W,H);ctx.fillStyle='rgba(255,255,255,.025)';for(let i=0;i<28;i++){ctx.beginPath();ctx.arc((i*71)%W,(i*109)%H,1,0,Math.PI*2);ctx.fill()}drawMachine(now);tokens.forEach(drawToken);for(const p of particles){ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,2.5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}for(const f of flashes){ctx.globalAlpha=Math.min(1,f.life*1.4);ctx.fillStyle=f.color;ctx.font='950 12px system-ui';ctx.textAlign='center';ctx.fillText(f.text,f.x,f.y);ctx.globalAlpha=1}}
function strategyText(){if(!apps)return 'You somehow survived the job market without applying for anything.';const q=(apps-tailored-human)/apps,t=tailored/apps,h=human/apps;if(h>.35)return 'You leaned hard into human routes. Faster conversations, still no guarantees.';if(q>.68)return 'You went full volume. Maximum CVs, maximum chaos.';if(t>.45)return 'You backed tailoring. More time per shot, same unpredictable market.';return 'Balanced strategy: volume, tailoring and the occasional human route.'}
function endGame(){if(state!=='play')return;state='over';pressing=false;currentJob=null;humanRoute.classList.remove('show');hud.classList.add('hidden');gameover.classList.remove('hidden');best=Math.max(best,score);try{localStorage.setItem('machine-best',best)}catch(_){}rScore.textContent=score;rApps.textContent=apps;rTailored.textContent=tailored;rHuman.textContent=human;rInterviews.textContent=interviews;rOffers.textContent=offers;strategyEl.textContent=strategyText()+` Best score: ${best}.`;draw(performance.now())}
async function share(){const text=`I survived 45 seconds of The Job Hunt: ${apps} applications, ${interviews} interviews, ${offers} offers. Score ${score}.`;try{if(navigator.share)await navigator.share({title:'The Job Hunt',text,url:location.href.split('?')[0]});else{await navigator.clipboard.writeText(text);toastMsg('Copied')}}catch(e){}}
function loop(now){if(state!=='play')return;const dt=Math.min(.033,(now-last)/1000||0);last=now;update(dt,now);draw(now);if(state==='play')raf=requestAnimationFrame(loop)}
sendButton.addEventListener('pointerdown',pointerDown);sendButton.addEventListener('pointerup',pointerUp);sendButton.addEventListener('pointercancel',()=>{pressing=false;holdFill.style.width='0%'});sendButton.addEventListener('pointerleave',e=>{if(pressing)pointerUp(e)});humanRoute.addEventListener('pointerdown',humanClick);playBtn.addEventListener('click',startGame);againBtn.addEventListener('click',startGame);shareBtn.addEventListener('click',share);window.addEventListener('resize',resize);resize();draw(performance.now());
})();