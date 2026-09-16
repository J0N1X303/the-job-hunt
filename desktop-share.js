(()=>{
  const btn=document.getElementById('shareBtn');
  const toast=document.getElementById('toast');
  if(!btn)return;
  const text=id=>document.getElementById(id)?.textContent?.trim()||'';
  const say=message=>{
    if(!toast)return;
    toast.textContent=message;toast.classList.add('show');
    setTimeout(()=>toast.classList.remove('show'),1600);
  };
  const shareText=()=>`I sent ${text('rSent')} CVs, got ${text('rShortlisted')} through to hiring teams and landed ${text('rInterviews')} interviews in 60 seconds of CV Chaos.`;
  const shareUrl=()=>location.href.split('?')[0];

  async function copyFallback(){
    const payload=`${shareText()}\n${shareUrl()}`;
    try{
      if(navigator.clipboard&&window.isSecureContext){
        await navigator.clipboard.writeText(payload);
      }else{
        const area=document.createElement('textarea');
        area.value=payload;area.style.position='fixed';area.style.opacity='0';
        document.body.appendChild(area);area.focus();area.select();document.execCommand('copy');area.remove();
      }
      say('LINK COPIED — SEND TO A FRIEND');
    }catch(_){
      window.prompt('Copy this and send it to a friend:',payload);
    }
  }

  btn.onclick=async()=>{
    if(navigator.share){
      try{
        await navigator.share({title:'CV Chaos — The Job Hunt',text:shareText(),url:shareUrl()});
        return;
      }catch(err){
        if(err&&err.name==='AbortError')return;
      }
    }
    await copyFallback();
  };
})();