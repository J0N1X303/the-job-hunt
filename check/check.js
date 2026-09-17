(()=>{
  const STORE='cvchaos-check-history-v1';
  const DIAGNOSTIC_VERSION='1.1';
  const root=document.getElementById('app');
  if(!root)return;
  const $=(s)=>root.querySelector(s);
  const $$=(s)=>[...root.querySelectorAll(s)];
  let step=0;
  let currentResult=null;

  const track=(name,data={})=>{
    const send=()=>{try{window.umami?.track(name,data)}catch(_){}};
    if(window.umami?.track)send();else setTimeout(send,900);
  };
  const safeNum=(id,max=500)=>Math.max(0,Math.min(max,parseInt($(id)?.value||'0',10)||0));
  const percent=(a,b)=>b>0?Math.round((a/b)*100):0;
  const daysBetween=(a,b)=>Math.floor(Math.abs(new Date(b)-new Date(a))/86400000);
  const today=()=>new Date().toISOString().slice(0,10);
  const addDays=(dateStr,days)=>{
    const d=new Date(dateStr+'T12:00:00');
    d.setDate(d.getDate()+days);
    return d.toISOString().slice(0,10);
  };
  const formatDate=(dateStr)=>new Date(dateStr+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'});

  function history(){
    try{const raw=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(raw)?raw:[]}catch(_){return[]}
  }
  function saveHistory(rows){
    try{localStorage.setItem(STORE,JSON.stringify(rows.slice(-20)));return true}catch(_){return false}
  }
  function lastSaved(){const h=history();return h[h.length-1]||null}

  function showStep(n){
    step=Math.max(0,Math.min(3,n));
    $$('[data-step]').forEach(el=>el.classList.toggle('hidden',Number(el.dataset.step)!==step));
    $$('.progress i').forEach((el,i)=>el.classList.toggle('on',i<=step));
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function renderWelcome(){
    const h=history();
    const box=$('#welcomeBack');
    if(!box||!h.length)return;
    const last=h[h.length-1];
    const ago=daysBetween(last.date,today());
    const due=addDays(last.date,7);
    box.classList.remove('hidden');
    if(ago===0){
      $('#welcomeText').textContent=`You checked in today. Your saved focus is “${last.title}”. Weekly changes will be more meaningful around ${formatDate(due)}.`;
    }else if(ago<7){
      $('#welcomeText').textContent=`Your last focus was “${last.title}”. You're ${7-ago} day${7-ago===1?'':'s'} away from the suggested weekly check, but you can update it now if something has changed.`;
    }else{
      $('#welcomeText').textContent=`Your last focus was “${last.title}”. It's been ${ago} days — run the check again to see whether the evidence says stay focused or move on.`;
    }
  }

  function validateFunnel(){
    const apps=safeNum('#apps'),convs=safeNum('#convs'),ints=safeNum('#interviews'),finals=safeNum('#finals'),offers=safeNum('#offers');
    const ok=convs<=apps&&ints<=convs&&finals<=ints&&offers<=finals;
    $('#funnelWarn').textContent=ok?'':'One of these numbers is higher than the stage before it. Check the figures before continuing.';
    return ok;
  }

  function diagnose(){
    const role=($('#role').value||'your target role').trim();
    const level=$('#level').value;
    const weeks=safeNum('#weeks',52);
    const breadth=$('#breadth').value;
    const apps=safeNum('#apps'),convs=safeNum('#convs'),ints=safeNum('#interviews'),finals=safeNum('#finals'),offers=safeNum('#offers');
    const warm=safeNum('#warm',200),fit=safeNum('#fit',10),tailor=$('#tailor').value,mot=safeNum('#mot',100),feeling=$('#feeling').value;
    const reach=percent(convs,apps),intRate=percent(ints,convs),finalRate=percent(finals,ints),offerRate=percent(offers,finals);
    let title,explain,signals,donts,plan,confidence='Medium confidence',category='general_focus';

    if(apps<6||weeks<=1){
      category='insufficient_signal';
      title='Build a clean sample before fixing anything.';
      explain='There is not enough evidence yet to identify a reliable bottleneck. Making major changes now would risk reacting to normal job-search noise rather than a pattern.';
      signals=[`${apps} recent applications is still a small sample.`,`Your search is early enough that chance can dominate the result.`,`A short run of genuinely matched roles will tell us more than another rewrite.`];
      donts=['Rewrite your whole CV after each rejection.','Assume silence means the market has rejected your profile.','Chase volume simply to make the numbers bigger.'];
      plan=[['Choose 6–10 strong-fit roles',`Use ${role} as the anchor and only include opportunities you would genuinely take.`],['Record the route in','Mark each one as cold application, recruiter, network or direct contact.'],['Keep the proposition stable','Do not change everything between applications or you cannot learn what is working.'],['Come back with evidence','Run CV Chaos again once there is enough activity to see a pattern.']];
      confidence='Low confidence — intentionally';
    }else if((reach<15||convs<2)&&fit<=4){
      category='targeting';
      title='Tighten targeting before touching the CV.';
      explain='Human contact is limited, but the stronger signal is that fewer than half of your recent applications felt like genuinely strong fits. Selection quality is the first lever to test.';
      signals=[`${fit}/10 recent applications were strong fits.`,`${reach}% of applications became meaningful conversations.`,`Weak fit can make a perfectly credible profile look ineffective.`];
      donts=['Increase application volume.','Optimise keywords for roles you only partly match.','Blame the entire problem on your CV.'];
      plan=[['Define a strong-fit role','Write down five things that must be true for a role to deserve an application.'],['Audit your last 15 applications','Label each strong / plausible / speculative.'],['Pause speculative applications','Give yourself one week of cleaner data.'],['Measure the response','Compare strong-fit roles with the previous mix.']];
    }else if((reach<15||convs<2)&&warm<3){
      category='route_to_market';
      title='Change how you reach people.';
      explain='Your application activity is not converting into enough human contact, and the search is relying heavily on submission rather than conversation. Route-to-market is the highest-value experiment.';
      signals=[`${apps} applications produced ${convs} meaningful conversations.`,`Only ${warm} warm or direct approaches were made.`,`A different route can be tested before rewriting the product — you.`];
      donts=['Send another large batch of cold applications.','Rewrite the entire CV before testing another route.','Count connection requests as meaningful conversations.'];
      plan=[['Pick 10 targets','Choose live roles or employers you genuinely want.'],['Find one real person around each','Recruiter, hiring manager, peer, former colleague or mutual contact.'],['Make relevant approaches','Keep them short and give a genuine reason for making contact.'],['Compare the routes','See whether direct/warm activity creates more conversations than cold submissions.']];
    }else if((reach<18||convs<3)&&breadth==='wide'){
      category='positioning';
      title='Make your proposition easier to understand.';
      explain='You are searching broadly and relatively little activity is becoming human contact. Test whether the market is being asked to understand too many versions of you at once.';
      signals=['Your search spans quite different role types.',`${reach}% of applications are becoming conversations.`,`Broad searches can dilute the headline, proof points and outreach story.`];
      donts=['Create a different professional identity for every vacancy.','Add generic competencies just to cover more ground.','Increase volume until the proposition is clearer.'];
      plan=[['Choose one primary role family',`Use ${role} as the centre of the experiment for seven days.`],['Tune the top third only','Headline, profile and strongest evidence should make that proposition obvious.'],['Use one core story','Keep applications and outreach consistent enough to test it.'],['Measure conversations','See whether clarity improves the front of the funnel.']];
    }else if(convs>=3&&intRate<35){
      category='conversation_to_interview';
      title='Improve the story between interest and interview.';
      explain='People are willing to engage with you, but those conversations are not consistently becoming interviews. Your profile is creating interest; now test how clearly you explain fit, motivation and value.';
      signals=[`${convs} meaningful conversations show the profile can attract attention.`,`${intRate}% of those conversations became first interviews.`,`The leverage point appears downstream of initial visibility.`];
      donts=['Start again with a completely new CV.','Add application volume to solve a conversion issue.','Give a generic career-history answer when asked about fit.'];
      plan=[['Review three recent conversations','Look for repeated questions, doubts or moments where the energy changed.'],['Build a 60-second story','Why this role, why you, why now.'],['Choose three proof points',`Use evidence that matters specifically at ${level.toLowerCase()} level.`],['Test it twice','Use real conversations to see whether progression improves.']];
    }else if(ints>=3&&finalRate<35){
      category='interview_progression';
      title='Focus on interview progression.';
      explain='Your CV and initial conversations are doing enough to create interviews. The highest-value work now sits inside the interview: evidence choice, relevance, seniority and how clearly you solve the employer’s problem.';
      signals=[`${ints} first interviews means the front of the funnel is functioning.`,`${finalRate}% progressed to final stage.`,`A wholesale CV rewrite would target the wrong part of the journey.`];
      donts=['Overhaul the CV because an interview did not progress.','Prepare twenty generic STAR stories.','Spend most of the week generating more applications.'];
      plan=[['Debrief the last three interviews','Write down what was asked and where you felt strongest or weakest.'],['Define three beliefs','What must the next interviewer believe about you by the end?'],['Prepare five evidence stories','Keep them concise: scale, action, outcome, relevance.'],['Surface concerns early','Ask what the hiring team still needs to be confident about.']];
    }else if(finals>=2&&offerRate<50){
      category='final_stage';
      title='Work on final-stage differentiation.';
      explain='You are repeatedly reaching serious consideration. The question is no longer whether your CV works; it is what separates you from another credible finalist and what risk the employer still perceives.';
      signals=[`${finals} final-stage processes show strong market credibility.`,`${offerRate}% converted to offers.`,`The likely leverage point is differentiation or unresolved risk, not visibility.`];
      donts=['Start sending substantially more applications.','Treat final-stage losses as evidence the whole search is broken.','Repeat earlier-stage answers without addressing the hiring decision.'];
      plan=[['Identify remaining risk','What might make the employer hesitate even if they like you?'],['Ask the question','What could stop them choosing you?'],['Map evidence to the decision','Answer the final criteria, not the original job advert.'],['Review the losses','Look for one repeated concern or competitor advantage.']];
    }else{
      category='optimise_weakest_step';
      title='Protect what is working and improve one weak step.';
      explain='There is no obvious structural break in the information you provided. That is useful: resist changing everything and make one measurable improvement at a time.';
      signals=[`${reach}% application-to-conversation conversion.`,`${intRate}% conversation-to-interview conversion.`,`${finalRate}% interview-to-final conversion.`];
      donts=['Change strategy every few days.','Assume more activity is always better.','Optimise several parts of the funnel at once.'];
      plan=[['Find your weakest step','Use your own funnel, not an invented industry benchmark.'],['Keep the rest stable','Give the experiment a fair chance.'],['Change one thing','Make one deliberate intervention for seven days.'],['Compare next week','Only change direction once the evidence changes.']];
      confidence='Medium-high confidence';
    }

    if(tailor==='rarely'&&apps>=10&&!signals.some(x=>x.includes('tailor')))signals.push('You rarely tailor the top third of your CV, so role-specific positioning is worth testing.');
    if(feeling==='cv'&&title!=='Build a clean sample before fixing anything.')signals.push('You suspect the CV is the issue. Treat that as a hypothesis to test, not the diagnosis itself.');
    if(mot<35){
      plan=plan.slice(0,3);
      plan.push(['Reduce the workload','For seven days, protect a small number of high-value actions and deliberately remove low-value activity.']);
    }

    return {version:DIAGNOSTIC_VERSION,date:today(),role,level,weeks,breadth,apps,convs,ints,finals,offers,warm,fit,tailor,mot,reach,intRate,finalRate,offerRate,category,title,explain,signals,donts,plan,confidence};
  }

  function listInto(id,items,mode='plain'){
    const el=$(id);el.innerHTML='';
    items.forEach(item=>{const li=document.createElement('li');li.textContent=item;el.appendChild(li)});
    el.className=mode==='signal'?'signal-list':mode==='no'?'plain-list no':'plain-list';
  }
  function planInto(items){
    const el=$('#planList');el.innerHTML='';
    items.forEach(([head,body])=>{const li=document.createElement('li');const d=document.createElement('div');const b=document.createElement('b');const s=document.createElement('span');b.textContent=head;s.textContent=body;d.append(b,s);li.appendChild(d);el.appendChild(li)});
  }
  function deltaText(now,old){const d=now-old;return {text:d>0?`+${d}`:`${d}`,cls:d>0?'up':d<0?'down':'flat'}}

  function buildShareText(r){
    const actions=r.plan.slice(0,3).map(([head])=>`• ${head}`).join('\n');
    return `My CV Chaos focus to level up: ${r.title}\n\nThis week:\n${actions}\n\nRun your own free check: https://cvchaos.co.uk/check/`;
  }

  function renderResult(r){
    currentResult=r;
    $('#wizard').classList.add('hidden');$('#result').classList.remove('hidden');
    $('#resultTitle').textContent=r.title;$('#resultExplain').textContent=r.explain;$('#confidence').textContent=r.confidence;
    $('#mApps').textContent=r.apps;$('#mConvs').textContent=r.convs;$('#mInts').textContent=r.ints;$('#mMot').textContent=r.mot+'%';
    listInto('#signals',r.signals,'signal');listInto('#donts',r.donts,'no');planInto(r.plan);
    $('#energyNote').classList.toggle('hidden',r.mot>=35);
    $('#nextCheckDate').textContent=formatDate(addDays(r.date,7));

    const prev=lastSaved();
    const compare=$('#compareCard');
    if(prev){
      compare.classList.remove('hidden');
      $('#compareDate').textContent=`Compared with your saved check on ${new Date(prev.date+'T12:00:00').toLocaleDateString(undefined,{day:'numeric',month:'short'})}`;
      [['dApps',r.apps,prev.apps],['dConvs',r.convs,prev.convs],['dInts',r.ints,prev.ints],['dMot',r.mot,prev.mot]].forEach(([id,a,b])=>{const d=deltaText(a,b);const el=$('#'+id);el.textContent=d.text;el.className=d.cls});
      const sameFocus=prev.title===r.title;
      $('#previousDiagnosis').textContent=sameFocus?`Last focus: ${prev.title} — the evidence still points here.`:`Last focus: ${prev.title} — your focus has now changed.`;
    }else compare.classList.add('hidden');

    $('#saveStatus').textContent='Not saved yet. Saving keeps this result only in this browser.';
    $('#shareStatus').textContent='';
    $('#saveBtn').disabled=false;
    window.scrollTo({top:0,behavior:'smooth'});
    track('check_complete',{diagnosis:r.category,version:DIAGNOSTIC_VERSION,returning:Boolean(prev)});
  }

  $$('.next').forEach(btn=>btn.addEventListener('click',()=>{
    if(step===1&&!validateFunnel())return;
    showStep(step+1);
  }));
  $$('.back').forEach(btn=>btn.addEventListener('click',()=>showStep(step-1)));
  $('#mot').addEventListener('input',()=>$('#motValue').textContent=$('#mot').value+'%');
  ['#apps','#convs','#interviews','#finals','#offers'].forEach(id=>$(id).addEventListener('input',validateFunnel));
  $('#diagnoseBtn').addEventListener('click',()=>renderResult(diagnose()));
  $('#editBtn').addEventListener('click',()=>{$('#result').classList.add('hidden');$('#wizard').classList.remove('hidden');showStep(3)});
  $('#restartBtn').addEventListener('click',()=>{$('#result').classList.add('hidden');$('#wizard').classList.remove('hidden');showStep(0)});

  $('#saveBtn').addEventListener('click',()=>{
    if(!currentResult)return;
    const h=history();
    const sameDay=h.findIndex(x=>x.date===currentResult.date);
    const compact={version:currentResult.version,date:currentResult.date,role:currentResult.role,apps:currentResult.apps,convs:currentResult.convs,ints:currentResult.ints,finals:currentResult.finals,offers:currentResult.offers,mot:currentResult.mot,category:currentResult.category,title:currentResult.title};
    if(sameDay>=0)h[sameDay]=compact;else h.push(compact);
    if(saveHistory(h)){
      const due=formatDate(addDays(currentResult.date,7));
      $('#saveStatus').textContent=`Saved on this device. Come back around ${due}; we'll compare what changed and tell you whether to stay focused here or move on.`;
      $('#saveBtn').disabled=true;
      track('check_saved',{diagnosis:currentResult.category,version:DIAGNOSTIC_VERSION});
      renderWelcome();
    }else $('#saveStatus').textContent='Your browser would not allow local saving. You can still use the result normally.';
  });

  $('#shareBtn').addEventListener('click',async()=>{
    if(!currentResult)return;
    const text=buildShareText(currentResult);
    try{
      if(navigator.share){
        await navigator.share({title:'My CV Chaos focus',text,url:'https://cvchaos.co.uk/check/'});
        $('#shareStatus').textContent='Shared.';
        track('check_result_shared',{method:'native',diagnosis:currentResult.category,version:DIAGNOSTIC_VERSION});
      }else if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(text);
        $('#shareStatus').textContent='Summary copied to your clipboard.';
        track('check_result_shared',{method:'copy',diagnosis:currentResult.category,version:DIAGNOSTIC_VERSION});
      }else{
        $('#shareStatus').textContent='Sharing is not available in this browser.';
      }
    }catch(_){$('#shareStatus').textContent='Share cancelled.'}
  });

  $('#copyBtn').addEventListener('click',async()=>{
    if(!currentResult)return;
    const text=buildShareText(currentResult);
    try{
      if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(text);
        $('#shareStatus').textContent='Summary copied to your clipboard.';
        track('check_result_shared',{method:'copy',diagnosis:currentResult.category,version:DIAGNOSTIC_VERSION});
      }else{
        const area=document.createElement('textarea');
        area.value=text;area.setAttribute('readonly','');area.style.position='absolute';area.style.left='-9999px';
        document.body.appendChild(area);area.select();document.execCommand('copy');area.remove();
        $('#shareStatus').textContent='Summary copied to your clipboard.';
        track('check_result_shared',{method:'copy_fallback',diagnosis:currentResult.category,version:DIAGNOSTIC_VERSION});
      }
    }catch(_){$('#shareStatus').textContent='Could not copy the summary in this browser.'}
  });

  $('#deleteHistory').addEventListener('click',()=>{
    try{localStorage.removeItem(STORE)}catch(_){}
    $('#welcomeBack').classList.add('hidden');$('#compareCard').classList.add('hidden');
    $('#saveStatus').textContent='Saved history deleted from this device.';
    track('check_history_deleted',{version:DIAGNOSTIC_VERSION});
  });

  $('#feedbackBtn').addEventListener('click',()=>{
    const changed=root.querySelector('input[name="changed"]:checked')?.value||'';
    const useful=root.querySelector('input[name="useful"]:checked')?.value||'';
    const account=root.querySelector('input[name="account"]:checked')?.value||'';
    const help=$$('input[name="helpnext"]:checked').map(x=>x.value);
    const changeArea=root.querySelector('input[name="changearea"]:checked')?.value||'';
    if(!changed||!useful||!account){$('#feedbackStatus').textContent='Please answer the first three questions so the feedback is useful.';return}
    if(!window.umami?.track){$('#feedbackStatus').textContent='Feedback could not send — your browser may be blocking anonymous analytics. No problem.';return}
    try{
      window.umami.track('check_feedback',{changed_plan:changed,useful,account_interest:account,help_next:help.join('|')||'none',change_area:changeArea||'none',diagnosis:currentResult?.category||'unknown',returning:history().length>0,version:DIAGNOSTIC_VERSION});
      $('#feedbackStatus').textContent='Thank you — feedback sent. No name, email or free-text response was collected.';
      $('#feedbackBtn').disabled=true;
    }catch(_){$('#feedbackStatus').textContent='Feedback could not send this time.'}
  });

  const params=new URLSearchParams(location.search);
  track('check_view',{source:params.get('utm_source')||'direct',medium:params.get('utm_medium')||'none',campaign:params.get('utm_campaign')||'none',returning:history().length>0,version:DIAGNOSTIC_VERSION});
  $('#startBtn').addEventListener('click',()=>{track('check_start',{returning:history().length>0,version:DIAGNOSTIC_VERSION});$('#intro').classList.add('hidden');$('#wizard').classList.remove('hidden');showStep(0)});
  $('#welcomeStart')?.addEventListener('click',()=>{track('check_start',{returning:true,version:DIAGNOSTIC_VERSION});$('#intro').classList.add('hidden');$('#wizard').classList.remove('hidden');showStep(0)});
  renderWelcome();
})();