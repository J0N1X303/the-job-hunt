(()=>{
  const saveBtn=document.getElementById('saveBtn');
  if(!saveBtn)return;
  const text=id=>document.getElementById(id)?.textContent?.trim()||'';

  function drawResultImage(){
    const c=document.createElement('canvas');
    c.width=1200;c.height=1200;
    const g=c.getContext('2d');
    const grad=g.createLinearGradient(0,0,0,1200);
    grad.addColorStop(0,'#102744');grad.addColorStop(.45,'#081522');grad.addColorStop(1,'#050b14');
    g.fillStyle=grad;g.fillRect(0,0,1200,1200);

    g.textAlign='center';g.fillStyle='#67dfff';g.font='900 34px system-ui';g.fillText('THE JOB HUNT · CV CHAOS',600,110);
    g.fillStyle='#f5f8ff';g.font='950 72px system-ui';g.fillText('MY RESULTS',600,205);

    g.fillStyle='#d9ff69';g.font='950 220px system-ui';g.fillText(text('rInterviews')||'0',600,475);
    g.fillStyle='#92a6bf';g.font='900 36px system-ui';g.fillText('INTERVIEWS',600,535);

    const cards=[
      ['CVs SENT',text('rSent')],
      ['REACHED HIRING TEAM',text('rShortlisted')],
      ['PERSONAL BEST',text('rBest')],
      ['MOTIVATION LEFT',text('rMotivation')]
    ];
    cards.forEach((card,i)=>{
      const col=i%2,row=Math.floor(i/2),x=160+col*470,y=635+row*175;
      g.fillStyle='rgba(255,255,255,.055)';g.beginPath();g.roundRect(x,y,410,135,24);g.fill();
      g.textAlign='left';g.fillStyle='#778ba4';g.font='900 24px system-ui';g.fillText(card[0],x+28,y+42);
      g.fillStyle='#f5f8ff';g.font='950 54px system-ui';g.fillText(card[1]||'—',x+28,y+105);
    });

    g.textAlign='center';g.fillStyle='#b9c6d7';g.font='700 29px system-ui';
    const line=text('resultLine');
    const short=line.length>75?line.slice(0,72)+'…':line;
    g.fillText(short,600,1025);
    g.fillStyle='#67dfff';g.font='900 23px system-ui';g.fillText('Built by Jonathan Hendry · linkedin.com/in/jshendry',600,1090);
    g.fillStyle='#60758e';g.font='800 22px system-ui';g.fillText('cvchaos.co.uk',600,1130);
    return c;
  }

  function saveResults(){
    const c=drawResultImage();
    c.toBlob(blob=>{
      if(!blob)return;
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;a.download='cv-chaos-results.png';document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),2000);
    },'image/png');
  }

  saveBtn.addEventListener('click',saveResults);
})();