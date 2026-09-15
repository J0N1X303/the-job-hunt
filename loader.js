Promise.all([1,2,3,4,5].map(i=>fetch(`game${i}.txt?v=2`).then(r=>r.text()))).then(parts=>{const s=document.createElement('script');s.textContent=parts.join('');document.body.appendChild(s)});
