const { JSDOM } = require('jsdom');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

const errors = [];

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  url: 'http://localhost/',
  virtualConsole: (() => {
    const { VirtualConsole } = require('jsdom');
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => errors.push('JSDOM ERROR: ' + e.message));
    vc.on('error', (e) => errors.push('CONSOLE ERROR: ' + (e.message || e)));
    return vc;
  })(),
});

// stub geolocation (jsdom doesn't implement it) to avoid "not a function" during click sim
dom.window.navigator.geolocation = {
  getCurrentPosition: (success, error) => { if (error) error({ code: 1, message: 'denied (stub)' }); }
};

// give the load event time to fire
setTimeout(() => {
  const doc = dom.window.document;
  const win = dom.window;

  // Collect every element with an onclick attribute and simulate a click
  const clickable = [...doc.querySelectorAll('[onclick]')];
  console.log(`Found ${clickable.length} onclick elements. Simulating clicks...`);
  clickable.forEach((el, i) => {
    try {
      el.dispatchEvent(new win.Event('click', { bubbles: true }));
    } catch (e) {
      errors.push(`CLICK ERROR on element #${i} (${el.getAttribute('onclick')}): ${e.message}`);
    }
  });

  // Simulate input/change events
  const inputEls = [...doc.querySelectorAll('[oninput],[onchange]')];
  inputEls.forEach((el) => {
    try {
      el.value = 'test';
      el.dispatchEvent(new win.Event('input', { bubbles: true }));
      el.dispatchEvent(new win.Event('change', { bubbles: true }));
    } catch (e) {
      errors.push(`INPUT ERROR on ${el.id}: ${e.message}`);
    }
  });

  // Try opening every modal explicitly via openM, then closing
  const modalIds = [...doc.querySelectorAll('.backdrop')].map(m => m.id);
  modalIds.forEach(id => {
    try { win.openM(id); win.closeM(id); } catch (e) { errors.push(`MODAL ERROR (${id}): ${e.message}`); }
  });

  // Try all the render*/filter* functions directly
  ['renderAmb','renderPolice','renderBlood','renderBeds','renderSymptomChips','renderHeatmap',
   'renderQueue','renderRecords','renderNotifs','initOfflineMID','renderIDCard','renderDoctors',
   'renderSOSContacts','renderLocShare','filterAmb','filterPolice','filterDoctors'
  ].forEach(fn => {
    try { if (typeof win[fn] === 'function') win[fn](); } catch (e) { errors.push(`FN ERROR (${fn}): ${e.message}`); }
  });

  // openNearby for every category
  Object.keys(win.nearbyDB || {}).forEach(type => {
    try { win.openNearby(type); } catch (e) { errors.push(`openNearby ERROR (${type}): ${e.message}`); }
  });

  setTimeout(() => {
    console.log('\n=== RESULT ===');
    if (errors.length === 0) {
      console.log('NO RUNTIME ERRORS DETECTED');
    } else {
      errors.forEach(e => console.log(e));
    }
    process.exit(0);
  }, 1200);

}, 500);
