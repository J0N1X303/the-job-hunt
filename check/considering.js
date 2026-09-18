(()=>{
  const root=document.getElementById('app');
  if(!root)return;
  const $=(s)=>root.querySelector(s);
  const $$=(s)=>[...root.querySelectorAll(s)];
  const STORE='cvchaos-check-history-v1';
  let starterMode=false;
  let starterResult=null;

  const today=()=>new Date().toISOString().slice(0,10);
  const addDays=(dateStr,days)=>{const d=new Date(dateStr+'T12:00:00');d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)};
  const formatDate=(dateStr)=>new Date(dateStr+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'});
  const track=(name,data={})=>{try{window.umami?.track(name,data)}catch(_){}};

  function history(){try{const raw=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(raw)?raw:[]}catch(_){return[]}}
  function saveHistory(rows){try{localStorage.setItem(STORE,JSON.stringify(rows.slice(-20)));return true}catch(_){return false}}

  function setList(id,items,kind){
    const el=$(id); if(!el)return;
    el.innerHTML='';
    items.forEach(item=>{const li=document.createElement('li');li.textContent=item;el.appendChild(li)});
    el.className=kind==='signal'?'signal-list':'plain-list no';
  }

  function setPlan(items){
    const el=$('#planList'); if(!el)return;
    el.innerHTML='';
    items.forEach(([head,body])=>{
      const li=document.createElement('li');
      const d=document.createElement('div');
      const b=document.createElement('b');
      const s=document.createElement('span');
      b.textContent=head;s.textContent=body;d.append(b,s);li.appendChild(d);el.appendChild(li);
    });
  }

  function buildStarter(){
    const role=($('#role')?.value||'').trim();
    const level=$('#level')?.value||'';
    const breadth=$('#breadth')?.value||'related';
    const roleText=role?` around ${role}`:'';
    const direction=breadth==='wide'
      ? 'Your search is still broad, so the first job is deciding which type of move is actually worth making.'
      : role
        ? `You already have a likely direction${roleText}; now make sure your materials and network are ready before applications start.`
        : 'You are at the exploration stage, so the goal is to create a clear enough direction before applications start.';

    const plan=[
      ['Pick the direction',role?`Write down what would make a ${role} move worth leaving your current role for: scope, level, sector, location and non-negotiables.`:'Choose one or two role families you would genuinely consider, plus the conditions that would make a move worthwhile.'],
      ['Freshen the CV','Update your most recent role, strongest outcomes and the top third of the CV. Do not rewrite every line yet; get the core story current.'],
      ['Make LinkedIn current','Check headline, About section, current role and recent achievements so someone who finds you sees the same story as your CV.'],
      ['Reconnect quietly','Speak to 3–5 useful people you trust — former colleagues, recruiters, clients or peers — and start learning what is moving in the market.'],
      ['Build a first target list','Save 5–10 roles or employers that genuinely interest you. Use them to test whether your proposed direction survives contact with the real market.']
    ];

    return {
      date:today(),
      role:role||'Considering a change',
      level,
      apps:0,convs:0,ints:0,finals:0,offers:0,mot:0,
      category:'considering_change',
      title:'Get ready before you start applying.',
      explain:`You do not have a broken job-search funnel — you have not started one yet. ${direction} A little preparation now should make the first applications and conversations much more useful.`,
      signals:[
        'You are considering a move rather than actively applying, so zero activity is expected — not a problem to diagnose.',
        role?`You have identified ${role} as a possible direction, which gives the preparation something concrete to test.`:'Your role direction is still open, so clarity is more valuable than application volume right now.',
        'This is the best point to get your CV, LinkedIn profile and network ready without the pressure of an active process.'
      ],
      donts:[
        'Start firing off speculative applications just to see what happens.',
        'Spend days perfecting a CV before you know what kind of role it needs to sell you for.',
        'Assume you need to announce publicly that you are looking before you are ready.'
      ],
      plan,
      confidence:'Starting-point guidance'
    };
  }

  function showStarter(){
    starterMode=true;
    starterResult=buildStarter();
    $('#wizard')?.classList.add('hidden');
    $('#result')?.classList.remove('hidden');
    $('#resultTitle').textContent=starterResult.title;
    $('#resultExplain').textContent=starterResult.explain;
    $('#confidence').textContent=starterResult.confidence;
    $('.metrics')?.classList.add('hidden');
    $('#compareCard')?.classList.add('hidden');
    $('#energyNote')?.classList.add('hidden');
    setList('#signals',starterResult.signals,'signal');
    setList('#donts',starterResult.donts,'no');
    setPlan(starterResult.plan);
    $('#nextCheckDate').textContent=formatDate(addDays(starterResult.date,7));
    $('#saveStatus').textContent='Not saved yet. Saving keeps this result only in this browser.';
    $('#shareStatus').textContent='';
    $('#saveBtn').disabled=false;
    window.scrollTo({top:0,behavior:'smooth'});
    track('check_complete',{diagnosis:'considering_change',version:'1.2',returning:history().length>0});
  }

  function starterShareText(){
    const actions=starterResult.plan.slice(0,3).map(([head])=>`• ${head}`).join('\n');
    return `My CV Chaos focus to level up: ${starterResult.title}\n\nThis week:\n${actions}\n\nRun your own free check: https://cvchaos.co.uk/check/`;
  }

  const firstNext=$('[data-step="0"] .next');
  firstNext?.addEventListener('click',(e)=>{
    if($('#searchStage')?.value!=='considering')return;
    e.preventDefault();
    e.stopImmediatePropagation();
    showStarter();
  },true);

  $('#saveBtn')?.addEventListener('click',()=>{
    if(!starterMode||!starterResult)return;
    const h=history();
    const compact={version:'1.2',date:starterResult.date,role:starterResult.role,apps:0,convs:0,ints:0,finals:0,offers:0,mot:0,category:'considering_change',title:starterResult.title};
    const sameDay=h.findIndex(x=>x.date===starterResult.date);
    if(sameDay>=0)h[sameDay]=compact;else h.push(compact);
    if(saveHistory(h)){
      $('#saveStatus').textContent=`Saved on this device. Come back around ${formatDate(addDays(starterResult.date,7))}; we'll help you decide what to do next.`;
      $('#saveBtn').disabled=true;
      track('check_saved',{diagnosis:'considering_change',version:'1.2'});
    }
  });

  $('#copyBtn')?.addEventListener('click',async()=>{
    if(!starterMode||!starterResult)return;
    try{
      await navigator.clipboard.writeText(starterShareText());
      $('#shareStatus').textContent='Summary copied to your clipboard.';
      track('check_result_shared',{method:'copy',diagnosis:'considering_change',version:'1.2'});
    }catch(_){/* existing handler/fallback covers active-search pathway */}
  });

  $('#shareBtn')?.addEventListener('click',async()=>{
    if(!starterMode||!starterResult)return;
    try{
      if(navigator.share){
        await navigator.share({title:'My CV Chaos focus',text:starterShareText(),url:'https://cvchaos.co.uk/check/'});
        $('#shareStatus').textContent='Shared.';
        track('check_result_shared',{method:'native',diagnosis:'considering_change',version:'1.2'});
      }else if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(starterShareText());
        $('#shareStatus').textContent='Summary copied to your clipboard.';
      }
    }catch(_){$('#shareStatus').textContent='Share cancelled.'}
  });

  $('#editBtn')?.addEventListener('click',(e)=>{
    if(!starterMode)return;
    e.preventDefault();e.stopImmediatePropagation();
    $('#result')?.classList.add('hidden');
    $('#wizard')?.classList.remove('hidden');
    $$('[data-step]').forEach(el=>el.classList.toggle('hidden',el.dataset.step!=='0'));
    $$('.progress i').forEach((el,i)=>el.classList.toggle('on',i===0));
    window.scrollTo({top:0,behavior:'smooth'});
  },true);

  $('#restartBtn')?.addEventListener('click',()=>{
    starterMode=false;starterResult=null;
    $('.metrics')?.classList.remove('hidden');
  },true);

  $('#searchStage')?.addEventListener('change',()=>{
    const considering=$('#searchStage').value==='considering';
    $('#preSearchHint')?.classList.toggle('hidden',!considering);
    if(!considering)$('.metrics')?.classList.remove('hidden');
  });
})();