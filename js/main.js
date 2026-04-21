import { initLandscape } from './landscape.js';
import { initMarkov } from './markov.js';
import { initPredictive } from './predictive.js';
import { initAgent } from './agent.js';
import { initBayesian } from './bayesian.js';
import { initEFG } from './efg.js';
import { initGeometry } from './geometry.js';

const modules = {
  landscape: { init: initLandscape, loaded: false },
  markov:    { init: initMarkov,    loaded: false },
  predictive:{ init: initPredictive,loaded: false },
  agent:     { init: initAgent,     loaded: false },
  bayesian:  { init: initBayesian,  loaded: false },
  efg:       { init: initEFG,       loaded: false },
  geometry:  { init: initGeometry,  loaded: false },
};

let activeModule = 'landscape';

function switchModule(name) {
  if (name === activeModule) return;
  document.querySelectorAll('.module-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById(`mod-${name}`);
  const btn = document.querySelector(`.nav-btn[data-module="${name}"]`);
  if (panel) panel.classList.add('active');
  if (btn) btn.classList.add('active');
  activeModule = name;
  if (!modules[name].loaded) {
    modules[name].init();
    modules[name].loaded = true;
  }
}

function bindSliderDisplays() {
  document.querySelectorAll('input[type="range"]').forEach(input => {
    const display = document.getElementById(input.id + '-val');
    if (!display) return;
    input.addEventListener('input', () => {
      let v = parseFloat(input.value);
      if (input.id === 'agent-grid') {
        display.textContent = `${v}×${v}`;
      } else if (input.id === 'markov-speed') {
        display.textContent = `${v.toFixed(1)}x`;
      } else if (input.id.includes('epsilon')) {
        display.textContent = v.toFixed(2);
      } else {
        display.textContent = Number.isInteger(v) ? v : v.toFixed(1);
      }
    });
  });
}

function renderMath() {
  if (typeof renderMathInElement === 'function') {
    renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
      ],
      throwOnError: false,
    });
  }
}

function waitForKaTeX() {
  if (typeof renderMathInElement === 'function') {
    renderMath();
  } else {
    setTimeout(waitForKaTeX, 100);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchModule(btn.dataset.module));
  });
  bindSliderDisplays();
  waitForKaTeX();
  modules.landscape.init();
  modules.landscape.loaded = true;
});
