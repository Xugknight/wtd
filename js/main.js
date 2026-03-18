(function(){
  const APP = 'write-that-down';
  const PAD_KEY = `${APP}:pads:v1`;
  const UI_KEY  = `${APP}:ui:v1`;
  const DEFAULT_PAD = { id: uid(), name: 'Pad 1', html: '' };

  // DOM (guarded)
  const $ = (s)=>document.querySelector(s);
  const pad = $('#pad');
  const status = $('#status');
  const saveBtn = $('#saveLocal');
  const dlTxtBtn = $('#downloadTxt');
  const dlHtmlBtn = $('#downloadHtml');
  const loadBtn = $('#loadFile');
  const fileInput = $('#fileInput');
  const clearBtn = $('#clear');
  const printBtn = $('#print');
  const monoToggle = $('#monoToggle');
  const wrapToggle = $('#wrapToggle');
  const pastePlainToggle = $('#pastePlainToggle');
  const themeToggle = $('#themeToggle');
  const mdToggle = $('#mdToggle');
  const tabsEl = $('#tabs');
  const addTabBtn = $('#addTab');
  const mdPreview = $('#mdPreview');
  const linesIntensity = $('#linesIntensity');
  const root = document.documentElement;

  if (!pad) return; // nothing to do

  // State
  let pads = loadPads();
  let ui   = loadUI();
  ensureState();

  // Initial render
  renderTabs();
  switchTo(ui.activeId);
  // apply current control state to UI
  pad.classList.toggle('is-mono', monoToggle?.checked ?? true);
  pad.classList.toggle('nowrap', !(wrapToggle?.checked ?? true));
  mdPreview?.classList.toggle('hidden', !(mdToggle?.checked ?? false));
  if (mdToggle?.checked) renderMarkdown();

  // Autosave
  let t;
  const autosave = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const i = pads.findIndex(p => p.id === ui.activeId);
      if (i >= 0) {
        pads[i].html = pad.innerHTML;
        savePads();
        setStatus('Saved ✓');
        if (mdToggle?.checked) renderMarkdown();
      }
      saveUI({ scrollY: pad.scrollTop });
    }, 250);
  };

  // Events
  pad.addEventListener('input', autosave);
  pad.addEventListener('scroll', () => saveUI({ scrollY: pad.scrollTop }));

  // Paste as plain text
  pad.addEventListener('paste', (e)=>{
    if(!(pastePlainToggle?.checked)) return;
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    insertPlain(text);
  });

  saveBtn?.addEventListener('click', autosave);
  dlTxtBtn?.addEventListener('click', () => download(safeName(active().name)+'.txt', pad.textContent));
  dlHtmlBtn?.addEventListener('click', () => download(safeName(active().name)+'.html', wrapHtml(pad.innerHTML)));
  printBtn?.addEventListener('click', () => window.print());
  clearBtn?.addEventListener('click', () => {
    if(confirm('Clear the pad? This will also overwrite autosave.')){
      pad.innerHTML = '';
      autosave();
    }
  });

  loadBtn?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target.result);
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const looksHtml =
        ['html','htm'].includes(ext) ||
        /<html[\s>]/i.test(text) ||
        /<body[\s>]/i.test(text);
      if(looksHtml){
        // Parse + sanitize before inserting into the editor.
        // This prevents script/event-handler injection when importing HTML.
        try{
          pad.innerHTML = sanitizeImportedHtml(text);
        }catch{
          pad.textContent = text;
        }
      } else {
        pad.textContent = text;
      }
      autosave();
    };
    reader.readAsText(file);
    fileInput.value = '';
  });

  monoToggle?.addEventListener('change', () => { pad.classList.toggle('is-mono', monoToggle.checked); saveUI({ mono: monoToggle.checked });});
  wrapToggle?.addEventListener('change', () => { pad.classList.toggle('nowrap', !wrapToggle.checked); saveUI({ wrap: wrapToggle.checked });});
  pastePlainToggle?.addEventListener('change', () => saveUI({ pastePlain: pastePlainToggle.checked }));
  themeToggle?.addEventListener('change', () => { root.setAttribute('data-theme', themeToggle.checked ? 'light' : 'dark'); saveUI({ theme: root.getAttribute('data-theme')});});
  mdToggle?.addEventListener('change', () => {
    mdPreview.classList.toggle('hidden', !mdToggle.checked);
    saveUI({ mdPreview: mdToggle.checked });
    if (mdToggle.checked) renderMarkdown();
  });

  // Tabs
  addTabBtn?.addEventListener('click', () => {
    const n = prompt('New pad name?', `Pad ${pads.length + 1}`) || `Pad ${pads.length + 1}`;
    const p = { id: uid(), name: n, html: '' };
    pads.push(p); savePads();
    renderTabs(); switchTo(p.id);
  });

  tabsEl?.addEventListener('click', (e) => {
    const t = e.target.closest('.tab');
    if(!t || t.classList.contains('add') || t.classList.contains('more')) return;
    const id = t.dataset.id;
    if (e.metaKey || e.ctrlKey) {
      const p = pads.find(p => p.id === id);
      const n = prompt('Rename pad:', p.name);
      if(n && n.trim()){ p.name = n.trim(); savePads(); renderTabs(); }
      return;
    }
    switchTo(id);
  });

  tabsEl?.addEventListener('contextmenu', (e) => {
    const t = e.target.closest('.tab');
    if (!t || t.classList.contains('add') || t.classList.contains('more')) return;
    e.preventDefault();
    deletePad(t.dataset.id);
  });
  
  function deletePad(id){
    if (pads.length === 1) return alert('Cannot delete the only pad.');
    if (!confirm('Delete this pad?')) return;

    pads = pads.filter(p => p.id !== id);
    savePads();

    if (ui.activeId === id) {
      switchTo(pads[0].id);
    } else {
      renderTabs();
    }
  }

  // Shortcuts
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if(mod && e.key.toLowerCase() === 's'){
      e.preventDefault();
      if(e.shiftKey) dlHtmlBtn?.click(); else dlTxtBtn?.click();
    }
    if(mod && e.key.toLowerCase() === 'n'){
      e.preventDefault();
      addTabBtn?.click();
    }
    if(mod && e.key.toLowerCase() === 'b' && mdToggle){
      e.preventDefault();
      mdToggle.checked = !mdToggle.checked; mdToggle.dispatchEvent(new Event('change'));
    }
  });

  // Intensity slider
  if (linesIntensity) {
    const apply = (v)=>root.style.setProperty('--line-alpha', (v/100).toFixed(2));
    const v = ui.linesAlpha != null ? Math.round(ui.linesAlpha*100) : 70;
    linesIntensity.value = v; apply(v);
    linesIntensity.addEventListener('input', (e)=> apply(e.target.value));
    linesIntensity.addEventListener('change', (e)=> saveUI({ linesAlpha: e.target.value/100 }));
  }

  // Helpers
  function active(){ return pads.find(p => p.id === ui.activeId) || pads[0]; }

  function switchTo(id){
    const p = pads.find(p => p.id === id) || pads[0];
    ui.activeId = p.id; saveUI({});
    pad.innerHTML = p.html || '';
    if (ui.scrollY) pad.scrollTop = ui.scrollY;
    renderTabs();
    if (mdToggle?.checked) renderMarkdown();
    setStatus(`Switched to ${p.name}`);
  }

  function renderTabs(){
    if (!tabsEl) return;
    tabsEl.querySelectorAll('.tab:not(.add):not(.more)').forEach(n => n.remove());
    const VISIBLE = 7;
    const head = pads.slice(0, VISIBLE);
    const tail = pads.slice(VISIBLE);

    head.forEach(p => {
      const b = document.createElement('button');
      b.className = 'tab' + (p.id === ui.activeId ? ' active' : '');
      b.dataset.id = p.id;
      
      const label = document.createElement('span');
      label.className = 'tab-label';
      label.textContent = p.name;

      const closeBtn = document.createElement('span');
      closeBtn.className = 'tab-close';
      closeBtn.textContent = '×';
      closeBtn.setAttribute('role', 'button');
      closeBtn.setAttribute('aria-label', `Delete ${p.name}`);

      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        deletePad(p.id);
      });

      b.appendChild(label);
      b.appendChild(closeBtn);
      tabsEl.insertBefore(b, addTabBtn);
    });

    let moreBtn = tabsEl.querySelector('.more');
    if (tail.length){
      if (!moreBtn){
        moreBtn = document.createElement('div');
        moreBtn.className = 'tab more';
        moreBtn.innerHTML = '…';
        moreBtn.style.position = 'relative';
        tabsEl.insertBefore(moreBtn, addTabBtn);
      }
      moreBtn.onclick = () => {
        const menu = document.createElement('div');
        menu.style.position = 'absolute';
        menu.style.top = '110%';
        menu.style.left = '0';
        menu.style.background = getComputedStyle(document.body).getPropertyValue('--surface');
        menu.style.border = '1px solid ' + colorMix('--text', 85);
        menu.style.borderRadius = '10px';
        menu.style.padding = '.3rem';
        menu.style.boxShadow = 'var(--shadow)';
        tail.forEach(p => {
          const item = document.createElement('button');
          item.className = 'tab';
          item.textContent = p.name;
          item.style.display = 'block';
          item.style.margin = '.2rem';
          item.onclick = (e)=>{ e.stopPropagation(); switchTo(p.id); menu.remove(); };
          menu.appendChild(item);
        });
        const cleanup = ()=>{ menu.remove(); document.removeEventListener('click', cleanup); };
        document.addEventListener('click', cleanup);
        moreBtn.appendChild(menu);
      };
    } else if (moreBtn) {
      moreBtn.remove();
    }
  }

  function renderMarkdown(){
    const src = pad.textContent;
    mdPreview.innerHTML = mdToHtml(src);
  }

  function sanitizeImportedHtml(html){
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const body = doc.body;
    if(!body) return '';

    // Drop obviously dangerous nodes.
    body.querySelectorAll('script, style, iframe, object, embed, link, meta').forEach(n => n.remove());

    // Drop dangerous attributes (inline handlers, styles, javascript: URLs).
    body.querySelectorAll('*').forEach(el => {
      [...el.attributes].forEach(attr => {
        const name = attr.name.toLowerCase();
        const value = attr.value || '';
        if(name.startsWith('on')) el.removeAttribute(attr.name);
        else if(name === 'style') el.removeAttribute(attr.name);
        else if((name === 'href' || name === 'src') && /^\s*javascript:/i.test(value)) el.removeAttribute(attr.name);
        else if((name === 'href' || name === 'src') && /^\s*data:/i.test(value)) el.removeAttribute(attr.name);
      });
    });

    return body.innerHTML;
  }

  function mdToHtml(md){
    // Escape for HTML text/attribute contexts (we also use this inside href attributes).
    const esc = (s)=> s.replace(/[&<>"']/g, ch => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[ch]));

    // Extract code blocks/spans first, then escape all remaining text.
    // This ensures any raw HTML typed into the editor cannot execute in the preview.
    const codeBlocks = [];
    const inlineCodes = [];
    md = md.replace(/```([\s\S]*?)```/g, (_, code) => {
      const i = codeBlocks.length;
      codeBlocks.push(`<pre><code>${esc(code)}</code></pre>`);
      return `@@CODEBLOCK${i}@@`;
    });
    md = md.replace(/`([^`]+)`/g, (_, code) => {
      const i = inlineCodes.length;
      inlineCodes.push(`<code>${esc(code)}</code>`);
      return `@@INLINECODE${i}@@`;
    });

    // Escape everything else (neutralizes <script>, <img onerror=...>, etc.).
    md = esc(md);

    md = md.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
           .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
           .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
    md = md.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
           .replace(/\*([^*]+)\*/g, '<em>$1</em>');
    md = md.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    md = md.replace(/^(?:[-*]\s+.+\n?)+/gm, block => {
      const items = block.trim()
        .split(/\n/)
        .map(li => li.replace(/^[-*]\s+/, ''))
        .map(t => `<li>${t}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    });
    md = md.replace(/^(?!<h\d|<ul|<pre|@@CODEBLOCK\d+@@|@@INLINECODE\d+@@|\s*$)(.+)$/gm, '<p>$1</p>');

    // Restore code after paragraphing/structure.
    md = md.replace(/@@CODEBLOCK(\d+)@@/g, (_, i) => codeBlocks[Number(i)] || '');
    md = md.replace(/@@INLINECODE(\d+)@@/g, (_, i) => inlineCodes[Number(i)] || '');
    return md;
  }

  function insertPlain(text){
    if(document.queryCommandSupported && document.queryCommandSupported('insertText')){
      document.execCommand('insertText', false, text);
    } else {
      const sel = window.getSelection();
      if(!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      sel.removeAllRanges(); sel.addRange(range);
    }
  }

  function download(filename, text){
    const blob = new Blob([text], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {href:url, download:filename});
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    setStatus('Downloaded');
  }

  function wrapHtml(inner){
    return `<!doctype html>
<html><head><meta charset="utf-8"><title>${safeName(active().name)} — Export</title></head><body>${inner}</body></html>`;
  }

  function setStatus(msg){
    if(!status) return;
    status.textContent = msg;
    if(msg.includes('Saved')) setTimeout(()=> status.textContent = 'Idle', 900);
  }

  function active(){ return pads.find(p => p.id === ui.activeId) || pads[0]; }
  function safeName(s){ return (s||'pad').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || 'pad'; }
  function uid(){ return Math.random().toString(36).slice(2,9); }
  function colorMix(varName, pct){ return `color-mix(in srgb, var(${varName}), transparent ${pct}%)`; }

  // Persistence
  function loadPads(){
    try{
      const saved = JSON.parse(localStorage.getItem(PAD_KEY) || '[]');
      return Array.isArray(saved) && saved.length ? saved : [structuredClone(DEFAULT_PAD)];
    }catch{ return [structuredClone(DEFAULT_PAD)]; }
  }
  function savePads(){ localStorage.setItem(PAD_KEY, JSON.stringify(pads)); }
  function loadUI(){ try{ return JSON.parse(localStorage.getItem(UI_KEY) || '{}'); }catch{ return {}; } }
  function saveUI(partial){ ui = { ...ui, ...partial }; localStorage.setItem(UI_KEY, JSON.stringify(ui)); }

  function ensureState(){
    if(!pads.length) pads = [structuredClone(DEFAULT_PAD)];
    if(!ui.activeId) ui.activeId = pads[0].id;
    root.setAttribute('data-theme', ui.theme || 'dark');
    if (monoToggle){ const v = ui.mono ?? true; monoToggle.checked = v; pad.classList.toggle('is-mono', v); }
    if (wrapToggle){ const v = ui.wrap ?? true; wrapToggle.checked = v; pad.classList.toggle('nowrap', !v); }
    if (pastePlainToggle) pastePlainToggle.checked = ui.pastePlain ?? true;
    if (themeToggle) themeToggle.checked = (root.getAttribute('data-theme') === 'light');
    if (mdToggle) mdToggle.checked = ui.mdPreview ?? false;
    if (typeof ui.linesAlpha === 'number') root.style.setProperty('--line-alpha', ui.linesAlpha);
  }

  // SW
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
})();