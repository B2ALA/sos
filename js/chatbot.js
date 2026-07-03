/* chatbot.js
   Enhanced AI medical chatbot (demo) with local knowledge base, typing animation, quick replies and emergency suggestions.
   This is a client-side simulated assistant. Replace with server-side AI integration for production.
*/

/* Chatbot module */
(function(){
  const chatWindow = document.getElementById('chatWindow');
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendChat');

  // Load KB from database/faqs.json
  let KB = [];
  async function loadKB(){
    try{
      const res = await fetch('database/faqs.json');
      KB = await res.json();
    }catch(e){
      console.warn('Failed to load KB', e);
      KB = [];
    }
  }

  // Render message
  function renderMessage(text, who='bot', meta=''){
    const el = document.createElement('div');
    el.className = 'chat-msg ' + (who==='user' ? 'user' : 'bot');
    el.innerHTML = `<div>${text}</div><div class="meta" style="font-size:11px;color:var(--muted);margin-top:6px">${meta}</div>`;
    chatWindow.appendChild(el);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  // Typing animation
  function renderTyping(){
    const el = document.createElement('div'); el.className='chat-msg bot typing'; el.id='typing';
    el.textContent = 'Assistant is typing...';
    chatWindow.appendChild(el);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
  function removeTyping(){ const t = document.getElementById('typing'); if(t) t.remove(); }

  // Simple semantic match
  function findBestAnswer(q){
    q = q.toLowerCase();
    // direct match
    let best = KB.find(k => k.q.toLowerCase() === q);
    if(best) return best;
    // keyword match
    let score = 0; let candidate = null;
    KB.forEach(k=>{
      const keywords = (k.keywords||'').toLowerCase().split(',');
      let s = 0;
      keywords.forEach(kw=>{ if(kw && q.includes(kw.trim())) s++; });
      if(s>score){ score=s; candidate=k; }
    });
    if(candidate) return candidate;
    // fuzzy: search for any word overlap
    const words = q.split(/\s+/).filter(Boolean);
    let max = 0; let cand2 = null;
    KB.forEach(k=>{
      const text = (k.q + ' ' + k.a).toLowerCase();
      let c = words.reduce((acc,w)=> acc + (text.includes(w)?1:0), 0);
      if(c>max){ max=c; cand2=k; }
    });
    if(cand2) return cand2;
    // fallback
    return {q:'I am not sure', a:"I couldn't find an exact match in my knowledge base. For emergencies, call your local emergency number or press SOS. I can also connect you to a doctor or show nearby hospitals.", suggestions:['Call Ambulance','Show Nearby Hospitals']};
  }

  // Ask function
  async function ask(question){
    if(!question) return;
    renderMessage(question,'user','You');
    input.value = '';
    renderTyping();
    // simulate processing time
    await new Promise(r=>setTimeout(r, 700 + Math.random()*800));
    removeTyping();
    const ans = findBestAnswer(question);
    // Add emoji and emergency suggestions
    let answerText = ans.a;
    if(ans.tags && ans.tags.includes('emergency')){
      answerText = '🚨 ' + answerText;
    }
    renderMessage(answerText,'bot', ans.source || 'MediHelp KB');
    // Quick suggestions
    if(ans.suggestions){
      const sug = document.createElement('div'); sug.className='chat-msg bot';
      sug.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap">${ans.suggestions.map(s=>`<button class="quick-reply">${s}</button>`).join('')}</div>`;
      chatWindow.appendChild(sug);
      chatWindow.scrollTop = chatWindow.scrollHeight;
      // attach handlers
      sug.querySelectorAll('.quick-reply').forEach(b=>b.addEventListener('click', ()=>ask(b.textContent)));
    }
  }

  // Send handler
  sendBtn.addEventListener('click', ()=> ask(input.value));
  input.addEventListener('keydown', e=>{ if(e.key==='Enter') ask(input.value); });

  // Expose
  window.chatbot = {ask, loadKB};

  // Initialize
  loadKB().then(()=> {
    // welcome message
    renderMessage('Hello! I am MediHelp Assistant. Ask me about first aid, medicines, hospitals, ambulance info, or type "SOS" for emergency guidance. Quick replies available below.','bot','Ready');
  });
})();
