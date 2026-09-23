(()=>{
  const track=(name,data={})=>{
    const send=()=>{try{window.umami?.track(name,data)}catch(_){}};
    if(window.umami?.track)send();else setTimeout(send,1200);
  };
  const n=id=>Number((document.getElementById(id)?.textContent||'0').replace(/[^0-9.-]/g,''))||0;

  window.addEventListener('load',()=>{
    const params=new URLSearchParams(location.search);
    track('game_view',{
      source:params.get('utm_source')||'direct',
      medium:params.get('utm_medium')||'none',
      campaign:params.get('utm_campaign')||'none'
    });
  });

  document.getElementById('playBtn')?.addEventListener('click',()=>track('game_start',{source:'arcade'}));
  document.getElementById('desktopPlayBtn')?.addEventListener('click',()=>track('landing_route',{route:'play'}));
  document.getElementById('checkBtn')?.addEventListener('click',()=>track('check_click',{source:'homepage'}));
  document.getElementById('desktopCheckBtn')?.addEventListener('click',()=>track('check_click',{source:'desktop_home'}));
  document.getElementById('resultCheckBtn')?.addEventListener('click',()=>track('check_click',{source:'game_result'}));
  document.getElementById('redundancyBtn')?.addEventListener('click',()=>track('redundancy_click',{source:'homepage'}));
  document.getElementById('desktopRedundancyBtn')?.addEventListener('click',()=>track('redundancy_click',{source:'desktop_home'}));
  document.getElementById('resultRedundancyBtn')?.addEventListener('click',()=>track('redundancy_click',{source:'game_result'}));
  document.getElementById('againBtn')?.addEventListener('click',()=>track('play_again'));
  document.getElementById('saveBtn')?.addEventListener('click',()=>track('save_results',{
    interviews:n('rInterviews'),reached_hiring_team:n('rShortlisted')
  }));
  document.getElementById('shareBtn')?.addEventListener('click',()=>track('share_results',{
    interviews:n('rInterviews'),reached_hiring_team:n('rShortlisted')
  }));
  document.querySelector('.creatorBlock a')?.addEventListener('click',()=>track('linkedin_click',{
    interviews:n('rInterviews')
  }));

  const over=document.getElementById('gameover');
  if(over){
    let visible=!over.classList.contains('hidden');
    const obs=new MutationObserver(()=>{
      const nowVisible=!over.classList.contains('hidden');
      if(nowVisible&&!visible){
        track('game_complete',{
          interviews:n('rInterviews'),
          cvs_sent:n('rSent'),
          reached_hiring_team:n('rShortlisted'),
          motivation_left:n('rMotivation')
        });
      }
      visible=nowVisible;
    });
    obs.observe(over,{attributes:true,attributeFilter:['class']});
  }
})();