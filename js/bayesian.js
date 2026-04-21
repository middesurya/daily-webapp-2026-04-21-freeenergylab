export function initBayesian() {
  const canvas = document.getElementById('bayesian-canvas');
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
    prior: '#60a5fa',
    likelihood: '#4ade80',
    posterior: '#f97316',
    priorFill: 'rgba(96, 165, 250, 0.15)',
    likFill: 'rgba(74, 222, 128, 0.15)',
    postFill: 'rgba(249, 115, 22, 0.25)',
    axis: '#334466',
    text: '#94a3b8',
    bg: '#0a0e1a',
    grid: '#1a2235',
  };

  let priorMean = -1;
  let priorPrec = 1;
  let likMean = 2;
  let likPrec = 2;
  let seqCount = 1;

  let posteriors = [];
  let animating = false;
  let animStep = 0;
  let animTimer = null;

  function gaussian(x, mean, prec) {
    const sigma2 = 1 / prec;
    return Math.exp(-0.5 * (x - mean) ** 2 / sigma2) / Math.sqrt(2 * Math.PI * sigma2);
  }

  function computePosterior(priorMu, priorPi, likMu, likPi) {
    const postPi = priorPi + likPi;
    const postMu = (priorPi * priorMu + likPi * likMu) / postPi;
    return { mu: postMu, pi: postPi };
  }

  function draw() {
    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    const margin = { top: 60, bottom: 60, left: 60, right: 40 };
    const plotW = W - margin.left - margin.right;
    const plotH = H - margin.top - margin.bottom;
    const xMin = -6, xMax = 6;
    const numPoints = 400;

    // Grid lines
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let x = -5; x <= 5; x++) {
      const px = margin.left + ((x - xMin) / (xMax - xMin)) * plotW;
      ctx.beginPath();
      ctx.moveTo(px, margin.top);
      ctx.lineTo(px, margin.top + plotH);
      ctx.stroke();
    }

    // Compute distributions
    const priorVals = [];
    const likVals = [];
    const postVals = [];
    let maxY = 0;

    const post = computePosterior(priorMean, priorPrec, likMean, likPrec);

    for (let i = 0; i <= numPoints; i++) {
      const x = xMin + (xMax - xMin) * (i / numPoints);
      const pv = gaussian(x, priorMean, priorPrec);
      const lv = gaussian(x, likMean, likPrec);
      const postv = gaussian(x, post.mu, post.pi);
      priorVals.push(pv);
      likVals.push(lv);
      postVals.push(postv);
      maxY = Math.max(maxY, pv, lv, postv);
    }

    // Include sequential posteriors
    let seqPosts = [];
    if (posteriors.length > 0) {
      posteriors.forEach(p => {
        const vals = [];
        for (let i = 0; i <= numPoints; i++) {
          const x = xMin + (xMax - xMin) * (i / numPoints);
          const v = gaussian(x, p.mu, p.pi);
          vals.push(v);
          maxY = Math.max(maxY, v);
        }
        seqPosts.push(vals);
      });
    }

    maxY *= 1.15;

    // Axis
    ctx.strokeStyle = COLORS.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + plotH);
    ctx.lineTo(margin.left + plotW, margin.top + plotH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + plotH);
    ctx.lineTo(margin.left, margin.top);
    ctx.stroke();

    // X tick labels
    ctx.fillStyle = COLORS.text;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    for (let x = -5; x <= 5; x++) {
      const px = margin.left + ((x - xMin) / (xMax - xMin)) * plotW;
      ctx.fillText(x.toString(), px, margin.top + plotH + 18);
    }

    // Y axis label
    ctx.save();
    ctx.translate(18, margin.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = COLORS.text;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Probability Density', 0, 0);
    ctx.restore();

    function toScreenX(i) {
      return margin.left + (i / numPoints) * plotW;
    }
    function toScreenY(v) {
      return margin.top + plotH - (v / maxY) * plotH;
    }

    function drawCurve(vals, color, fillColor, lineWidth) {
      // Fill
      ctx.beginPath();
      ctx.moveTo(toScreenX(0), margin.top + plotH);
      for (let i = 0; i <= numPoints; i++) {
        ctx.lineTo(toScreenX(i), toScreenY(vals[i]));
      }
      ctx.lineTo(toScreenX(numPoints), margin.top + plotH);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();

      // Line
      ctx.beginPath();
      ctx.moveTo(toScreenX(0), toScreenY(vals[0]));
      for (let i = 1; i <= numPoints; i++) {
        ctx.lineTo(toScreenX(i), toScreenY(vals[i]));
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }

    // Draw sequential posteriors (faded)
    seqPosts.forEach((vals, idx) => {
      const alpha = 0.2 + 0.5 * (idx / Math.max(seqPosts.length, 1));
      drawCurve(vals, `rgba(167, 139, 250, ${alpha})`, `rgba(167, 139, 250, ${alpha * 0.1})`, 1.5);
    });

    // Draw main curves
    drawCurve(priorVals, COLORS.prior, COLORS.priorFill, 2.5);
    drawCurve(likVals, COLORS.likelihood, COLORS.likFill, 2.5);
    drawCurve(postVals, COLORS.posterior, COLORS.postFill, 3);

    // Mean markers
    function drawMeanMarker(mean, color, label, yOffset) {
      const px = margin.left + ((mean - xMin) / (xMax - xMin)) * plotW;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, margin.top);
      ctx.lineTo(px, margin.top + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = color;
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, px, margin.top - 8 + yOffset);
      ctx.font = '9px monospace';
      ctx.fillText(`μ=${mean.toFixed(2)}`, px, margin.top + 4 + yOffset);
    }

    drawMeanMarker(priorMean, COLORS.prior, 'Prior', 0);
    drawMeanMarker(likMean, COLORS.likelihood, 'Likelihood', 20);
    drawMeanMarker(post.mu, COLORS.posterior, 'Posterior', 40);

    // Legend
    const legendX = W - margin.right - 170;
    const legendY = margin.top + 10;
    ctx.fillStyle = 'rgba(21, 29, 46, 0.9)';
    ctx.fillRect(legendX - 10, legendY - 5, 175, 95);
    ctx.strokeStyle = COLORS.axis;
    ctx.strokeRect(legendX - 10, legendY - 5, 175, 95);

    const legends = [
      { color: COLORS.prior, label: `Prior (μ=${priorMean.toFixed(1)}, π=${priorPrec.toFixed(1)})` },
      { color: COLORS.likelihood, label: `Likelihood (μ=${likMean.toFixed(1)}, π=${likPrec.toFixed(1)})` },
      { color: COLORS.posterior, label: `Posterior (μ=${post.mu.toFixed(2)}, π=${post.pi.toFixed(1)})` },
    ];

    legends.forEach((l, i) => {
      ctx.fillStyle = l.color;
      ctx.fillRect(legendX, legendY + i * 25 + 5, 18, 3);
      ctx.fillStyle = l.color;
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(l.label, legendX + 24, legendY + i * 25 + 12);
    });

    // Precision weighting indicator
    const pwY = margin.top + plotH + 35;
    const totalPrec = priorPrec + likPrec;
    const priorWeight = priorPrec / totalPrec;
    const likWeight = likPrec / totalPrec;
    const barW = plotW * 0.6;
    const barX = margin.left + plotW * 0.2;

    ctx.fillStyle = COLORS.text;
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Precision Weighting', barX + barW / 2, pwY - 3);

    ctx.fillStyle = COLORS.prior;
    ctx.fillRect(barX, pwY + 2, barW * priorWeight, 10);
    ctx.fillStyle = COLORS.likelihood;
    ctx.fillRect(barX + barW * priorWeight, pwY + 2, barW * likWeight, 10);

    ctx.fillStyle = COLORS.prior;
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Prior: ${(priorWeight * 100).toFixed(0)}%`, barX - 5, pwY + 11);
    ctx.fillStyle = COLORS.likelihood;
    ctx.textAlign = 'left';
    ctx.fillText(`Lik: ${(likWeight * 100).toFixed(0)}%`, barX + barW + 5, pwY + 11);
  }

  function singleUpdate() {
    posteriors = [];
    animStep = 0;
    draw();
  }

  function sequentialUpdate() {
    if (animating) return;
    animating = true;
    posteriors = [];
    animStep = 0;

    let currentMu = priorMean;
    let currentPi = priorPrec;

    function stepFn() {
      if (animStep >= seqCount) {
        animating = false;
        return;
      }

      const noisyObs = likMean + (Math.random() - 0.5) * 2 / Math.sqrt(likPrec);
      const p = computePosterior(currentMu, currentPi, noisyObs, likPrec);
      posteriors.push({ mu: currentMu, pi: currentPi });
      currentMu = p.mu;
      currentPi = p.pi;

      priorMean = currentMu;
      priorPrec = currentPi;

      document.getElementById('bayes-prior-mean').value = priorMean;
      document.getElementById('bayes-prior-mean-val').textContent = priorMean.toFixed(1);
      document.getElementById('bayes-prior-prec').value = Math.min(priorPrec, 5);
      document.getElementById('bayes-prior-prec-val').textContent = priorPrec.toFixed(1);

      animStep++;
      draw();
      animTimer = setTimeout(stepFn, 400);
    }
    stepFn();
  }

  document.getElementById('bayes-update').addEventListener('click', singleUpdate);
  document.getElementById('bayes-sequential').addEventListener('click', sequentialUpdate);
  document.getElementById('bayes-reset').addEventListener('click', () => {
    animating = false;
    if (animTimer) clearTimeout(animTimer);
    posteriors = [];
    priorMean = -1;
    priorPrec = 1;
    likMean = 2;
    likPrec = 2;
    document.getElementById('bayes-prior-mean').value = -1;
    document.getElementById('bayes-prior-prec').value = 1;
    document.getElementById('bayes-lik-mean').value = 2;
    document.getElementById('bayes-lik-prec').value = 2;
    document.getElementById('bayes-prior-mean-val').textContent = '-1.0';
    document.getElementById('bayes-prior-prec-val').textContent = '1.0';
    document.getElementById('bayes-lik-mean-val').textContent = '2.0';
    document.getElementById('bayes-lik-prec-val').textContent = '2.0';
    draw();
  });

  ['bayes-prior-mean', 'bayes-prior-prec', 'bayes-lik-mean', 'bayes-lik-prec'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      priorMean = parseFloat(document.getElementById('bayes-prior-mean').value);
      priorPrec = parseFloat(document.getElementById('bayes-prior-prec').value);
      likMean = parseFloat(document.getElementById('bayes-lik-mean').value);
      likPrec = parseFloat(document.getElementById('bayes-lik-prec').value);
      posteriors = [];
      draw();
    });
  });

  document.getElementById('bayes-seq-count').addEventListener('input', e => {
    seqCount = parseInt(e.target.value);
  });

  draw();
}
