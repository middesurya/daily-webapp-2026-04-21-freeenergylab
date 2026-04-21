export function initEFG() {
  const canvas = document.getElementById('efg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const container = canvas.parentElement;
  function resize() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }
  resize();
  window.addEventListener('resize', () => { resize(); draw(); });

  const COLORS = {
    epistemic: '#a78bfa',
    pragmatic: '#4ade80',
    total: '#22d3ee',
    selected: '#f97316',
    bar: '#243049',
    bg: '#0a0e1a',
    text: '#94a3b8',
    grid: '#1a2235',
    axis: '#334466',
  };

  let numPolicies = 5;
  let epistemicW = 1.0;
  let pragmaticW = 1.0;
  let prefSharpness = 1.0;
  let uncertainty = 1.5;

  let policies = [];
  let selectedPolicy = -1;

  function generatePolicies() {
    policies = [];
    for (let i = 0; i < numPolicies; i++) {
      const infoGain = Math.random() * 2 * uncertainty;
      const prefAlignment = -1 + Math.random() * 2;
      const pragValue = prefAlignment * prefSharpness;
      policies.push({
        id: i,
        name: `π${i + 1}`,
        label: getPolicyLabel(i),
        infoGain,
        pragValue,
      });
    }
    // Ensure some diversity
    policies[0].infoGain = uncertainty * 1.8;
    policies[0].pragValue = -0.2 * prefSharpness;
    policies[0].label = 'Explore novel area';

    if (numPolicies > 1) {
      policies[1].infoGain = 0.2;
      policies[1].pragValue = 1.5 * prefSharpness;
      policies[1].label = 'Exploit known reward';
    }

    if (numPolicies > 2) {
      policies[2].infoGain = uncertainty * 0.9;
      policies[2].pragValue = 0.8 * prefSharpness;
      policies[2].label = 'Balanced approach';
    }
  }

  function getPolicyLabel(i) {
    const labels = [
      'Explore novel area',
      'Exploit known reward',
      'Balanced approach',
      'Cautious observation',
      'Bold hypothesis test',
      'Random walk',
      'Targeted probe',
      'Greedy local search',
      'Systematic survey',
      'Risky high-reward',
    ];
    return labels[i % labels.length];
  }

  function computeEFE(policy) {
    return -(epistemicW * policy.infoGain) - (pragmaticW * policy.pragValue);
  }

  function softmax(values, temp) {
    const min = Math.min(...values);
    const negG = values.map(v => -(v - min));
    const exps = negG.map(v => Math.exp(v / Math.max(temp, 0.01)));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sum);
  }

  function draw() {
    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    if (policies.length === 0) return;

    const margin = { top: 50, bottom: 80, left: 70, right: 250 };
    const plotW = W - margin.left - margin.right;
    const plotH = H - margin.top - margin.bottom;

    const efes = policies.map(p => computeEFE(p));
    const probs = softmax(efes, 1.0);
    selectedPolicy = probs.indexOf(Math.max(...probs));

    const barH = Math.min(40, plotH / numPolicies - 8);
    const barGap = (plotH - barH * numPolicies) / (numPolicies + 1);

    // Find max magnitude for scaling
    let maxMag = 0;
    policies.forEach(p => {
      maxMag = Math.max(maxMag, Math.abs(epistemicW * p.infoGain), Math.abs(pragmaticW * p.pragValue), Math.abs(computeEFE(p)));
    });
    maxMag = Math.max(maxMag, 0.5) * 1.2;

    // Draw zero line
    const zeroX = margin.left + plotW / 2;
    ctx.strokeStyle = COLORS.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(zeroX, margin.top - 10);
    ctx.lineTo(zeroX, margin.top + plotH + 10);
    ctx.stroke();

    // Grid lines
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    for (let t = -4; t <= 4; t++) {
      if (t === 0) continue;
      const px = zeroX + (t / 4) * (plotW / 2);
      ctx.beginPath();
      ctx.moveTo(px, margin.top);
      ctx.lineTo(px, margin.top + plotH);
      ctx.stroke();
    }

    // Title
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Expected Free Energy Decomposition per Policy', W / 2, 25);
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.fillText('← Lower G (preferred)                    Higher G (avoided) →', zeroX, margin.top - 15);

    // Draw bars for each policy
    policies.forEach((p, idx) => {
      const y = margin.top + barGap + idx * (barH + barGap);
      const isSelected = idx === selectedPolicy;

      // Policy label
      ctx.fillStyle = isSelected ? COLORS.selected : '#e2e8f0';
      ctx.font = `${isSelected ? 'bold ' : ''}11px Inter, sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(p.name, margin.left - 30, y + barH / 2 + 4);

      ctx.fillStyle = COLORS.text;
      ctx.font = '9px Inter, sans-serif';
      ctx.fillText(p.label, margin.left - 30, y + barH / 2 + 16);

      // Selection highlight
      if (isSelected) {
        ctx.fillStyle = 'rgba(249, 115, 22, 0.05)';
        ctx.fillRect(margin.left, y - 2, plotW, barH + 4);
        ctx.strokeStyle = COLORS.selected;
        ctx.lineWidth = 1;
        ctx.strokeRect(margin.left, y - 2, plotW, barH + 4);
      }

      // Epistemic component (always negative contribution to G, so draws left)
      const episVal = -epistemicW * p.infoGain;
      const episWidth = (episVal / maxMag) * (plotW / 2);
      ctx.fillStyle = COLORS.epistemic;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(zeroX, y, episWidth, barH * 0.45);
      ctx.globalAlpha = 1;

      // Pragmatic component
      const pragVal = -pragmaticW * p.pragValue;
      const pragWidth = (pragVal / maxMag) * (plotW / 2);
      ctx.fillStyle = COLORS.pragmatic;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(zeroX, y + barH * 0.55, pragWidth, barH * 0.45);
      ctx.globalAlpha = 1;

      // Total EFE marker
      const totalG = efes[idx];
      const totalX = zeroX + (totalG / maxMag) * (plotW / 2);
      ctx.beginPath();
      ctx.moveTo(totalX, y - 4);
      ctx.lineTo(totalX + 6, y + barH / 2);
      ctx.lineTo(totalX, y + barH + 4);
      ctx.lineTo(totalX - 6, y + barH / 2);
      ctx.closePath();
      ctx.fillStyle = isSelected ? COLORS.selected : COLORS.total;
      ctx.fill();

      // Probability
      const probX = margin.left + plotW + 15;
      ctx.fillStyle = COLORS.text;
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`P=${(probs[idx] * 100).toFixed(1)}%`, probX, y + barH / 2 + 4);

      // Probability bar
      ctx.fillStyle = COLORS.bar;
      ctx.fillRect(probX + 65, y + barH * 0.2, 80, barH * 0.6);
      ctx.fillStyle = isSelected ? COLORS.selected : COLORS.total;
      ctx.fillRect(probX + 65, y + barH * 0.2, 80 * probs[idx], barH * 0.6);
    });

    // Legend
    const legY = margin.top + plotH + 25;
    const legItems = [
      { color: COLORS.epistemic, label: `Epistemic (−ω_e · Info Gain) [ω_e = ${epistemicW.toFixed(1)}]` },
      { color: COLORS.pragmatic, label: `Pragmatic (−ω_p · Pref Value) [ω_p = ${pragmaticW.toFixed(1)}]` },
      { color: COLORS.total, label: 'Total G (diamond marker)' },
      { color: COLORS.selected, label: 'Selected Policy (min G)' },
    ];

    legItems.forEach((item, i) => {
      const x = margin.left + (i % 2) * (plotW / 2 + 50);
      const yy = legY + Math.floor(i / 2) * 18;
      ctx.fillStyle = item.color;
      ctx.fillRect(x, yy - 4, 14, 8);
      ctx.fillStyle = COLORS.text;
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, x + 20, yy + 3);
    });

    // Pie chart showing epistemic vs pragmatic split for selected policy
    if (selectedPolicy >= 0) {
      const sp = policies[selectedPolicy];
      const eAbs = Math.abs(epistemicW * sp.infoGain);
      const pAbs = Math.abs(pragmaticW * sp.pragValue);
      const total = eAbs + pAbs || 1;

      const pieX = W - 110;
      const pieY = margin.top + 80;
      const pieR = 50;

      ctx.fillStyle = '#151d2e';
      ctx.beginPath();
      ctx.arc(pieX, pieY, pieR + 5, 0, Math.PI * 2);
      ctx.fill();

      const eAngle = (eAbs / total) * Math.PI * 2;

      ctx.beginPath();
      ctx.moveTo(pieX, pieY);
      ctx.arc(pieX, pieY, pieR, -Math.PI / 2, -Math.PI / 2 + eAngle);
      ctx.closePath();
      ctx.fillStyle = COLORS.epistemic;
      ctx.globalAlpha = 0.8;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.moveTo(pieX, pieY);
      ctx.arc(pieX, pieY, pieR, -Math.PI / 2 + eAngle, -Math.PI / 2 + Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = COLORS.pragmatic;
      ctx.globalAlpha = 0.8;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Drive Split', pieX, pieY - pieR - 12);
      ctx.fillText(`(${sp.name})`, pieX, pieY - pieR);

      ctx.font = '9px monospace';
      ctx.fillStyle = COLORS.epistemic;
      ctx.fillText(`E: ${(eAbs / total * 100).toFixed(0)}%`, pieX - 25, pieY + pieR + 16);
      ctx.fillStyle = COLORS.pragmatic;
      ctx.fillText(`P: ${(pAbs / total * 100).toFixed(0)}%`, pieX + 25, pieY + pieR + 16);
    }
  }

  function evaluate() {
    numPolicies = parseInt(document.getElementById('efg-policies').value);
    epistemicW = parseFloat(document.getElementById('efg-epistemic-w').value);
    pragmaticW = parseFloat(document.getElementById('efg-pragmatic-w').value);
    prefSharpness = parseFloat(document.getElementById('efg-pref-sharp').value);
    uncertainty = parseFloat(document.getElementById('efg-uncertainty').value);
    generatePolicies();
    draw();
  }

  document.getElementById('efg-evaluate').addEventListener('click', evaluate);
  document.getElementById('efg-reset').addEventListener('click', () => {
    document.getElementById('efg-policies').value = 5;
    document.getElementById('efg-epistemic-w').value = 1;
    document.getElementById('efg-pragmatic-w').value = 1;
    document.getElementById('efg-pref-sharp').value = 1;
    document.getElementById('efg-uncertainty').value = 1.5;
    document.getElementById('efg-policies-val').textContent = '5';
    document.getElementById('efg-epistemic-w-val').textContent = '1.0';
    document.getElementById('efg-pragmatic-w-val').textContent = '1.0';
    document.getElementById('efg-pref-sharp-val').textContent = '1.0';
    document.getElementById('efg-uncertainty-val').textContent = '1.5';
    numPolicies = 5;
    epistemicW = 1.0;
    pragmaticW = 1.0;
    prefSharpness = 1.0;
    uncertainty = 1.5;
    evaluate();
  });

  ['efg-epistemic-w', 'efg-pragmatic-w', 'efg-pref-sharp', 'efg-uncertainty'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      epistemicW = parseFloat(document.getElementById('efg-epistemic-w').value);
      pragmaticW = parseFloat(document.getElementById('efg-pragmatic-w').value);
      prefSharpness = parseFloat(document.getElementById('efg-pref-sharp').value);
      uncertainty = parseFloat(document.getElementById('efg-uncertainty').value);
      draw();
    });
  });

  evaluate();
}
