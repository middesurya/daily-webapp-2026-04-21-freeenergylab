export function initMarkov() {
  const container = document.getElementById('markov-viz');
  if (!container) return;

  const COLORS = {
    internal: '#ff6b6b',
    sensory: '#4ecdc4',
    active: '#ffd166',
    external: '#6c7b95',
  };

  const presets = {
    cell: {
      nodes: [
        { id: 'dna', type: 'internal', label: 'DNA' },
        { id: 'rna', type: 'internal', label: 'RNA' },
        { id: 'protein', type: 'internal', label: 'Protein Synthesis' },
        { id: 'receptor', type: 'sensory', label: 'Membrane Receptor' },
        { id: 'ion_channel', type: 'sensory', label: 'Ion Channel' },
        { id: 'signaling', type: 'sensory', label: 'Signal Transduction' },
        { id: 'secretion', type: 'active', label: 'Secretion' },
        { id: 'motility', type: 'active', label: 'Motility' },
        { id: 'pump', type: 'active', label: 'Ion Pump' },
        { id: 'nutrient', type: 'external', label: 'Nutrients' },
        { id: 'signal_mol', type: 'external', label: 'Signal Molecules' },
        { id: 'temperature', type: 'external', label: 'Temperature' },
        { id: 'other_cells', type: 'external', label: 'Other Cells' },
      ],
      links: [
        { source: 'nutrient', target: 'receptor' },
        { source: 'signal_mol', target: 'receptor' },
        { source: 'temperature', target: 'ion_channel' },
        { source: 'other_cells', target: 'signaling' },
        { source: 'receptor', target: 'protein' },
        { source: 'ion_channel', target: 'rna' },
        { source: 'signaling', target: 'dna' },
        { source: 'dna', target: 'rna' },
        { source: 'rna', target: 'protein' },
        { source: 'protein', target: 'secretion' },
        { source: 'protein', target: 'motility' },
        { source: 'dna', target: 'pump' },
        { source: 'secretion', target: 'signal_mol' },
        { source: 'motility', target: 'other_cells' },
        { source: 'pump', target: 'nutrient' },
      ],
    },
    brain: {
      nodes: [
        { id: 'prefrontal', type: 'internal', label: 'Prefrontal Cortex' },
        { id: 'hippocampus', type: 'internal', label: 'Hippocampus' },
        { id: 'amygdala', type: 'internal', label: 'Amygdala' },
        { id: 'thalamus', type: 'sensory', label: 'Thalamus' },
        { id: 'v1', type: 'sensory', label: 'Visual Cortex (V1)' },
        { id: 'a1', type: 'sensory', label: 'Auditory Cortex (A1)' },
        { id: 'motor', type: 'active', label: 'Motor Cortex' },
        { id: 'basal', type: 'active', label: 'Basal Ganglia' },
        { id: 'cerebellum', type: 'active', label: 'Cerebellum' },
        { id: 'light', type: 'external', label: 'Light (photons)' },
        { id: 'sound', type: 'external', label: 'Sound (pressure)' },
        { id: 'body', type: 'external', label: 'Body State' },
        { id: 'environment', type: 'external', label: 'Environment' },
      ],
      links: [
        { source: 'light', target: 'v1' },
        { source: 'sound', target: 'a1' },
        { source: 'body', target: 'thalamus' },
        { source: 'v1', target: 'prefrontal' },
        { source: 'a1', target: 'prefrontal' },
        { source: 'thalamus', target: 'amygdala' },
        { source: 'thalamus', target: 'hippocampus' },
        { source: 'prefrontal', target: 'hippocampus' },
        { source: 'amygdala', target: 'prefrontal' },
        { source: 'hippocampus', target: 'amygdala' },
        { source: 'prefrontal', target: 'motor' },
        { source: 'amygdala', target: 'basal' },
        { source: 'hippocampus', target: 'cerebellum' },
        { source: 'motor', target: 'environment' },
        { source: 'basal', target: 'body' },
        { source: 'cerebellum', target: 'environment' },
      ],
    },
    organism: {
      nodes: [
        { id: 'brain_int', type: 'internal', label: 'Brain (CNS)' },
        { id: 'organs', type: 'internal', label: 'Internal Organs' },
        { id: 'metabolism', type: 'internal', label: 'Metabolism' },
        { id: 'immune', type: 'internal', label: 'Immune System' },
        { id: 'skin', type: 'sensory', label: 'Skin / Touch' },
        { id: 'eyes', type: 'sensory', label: 'Eyes / Vision' },
        { id: 'ears', type: 'sensory', label: 'Ears / Hearing' },
        { id: 'gut', type: 'sensory', label: 'Gut / Interoception' },
        { id: 'muscles', type: 'active', label: 'Muscles' },
        { id: 'voice', type: 'active', label: 'Vocal Cords' },
        { id: 'hands', type: 'active', label: 'Hands / Manipulation' },
        { id: 'food', type: 'external', label: 'Food Sources' },
        { id: 'predators', type: 'external', label: 'Predators' },
        { id: 'conspecifics', type: 'external', label: 'Conspecifics' },
        { id: 'weather', type: 'external', label: 'Weather / Climate' },
      ],
      links: [
        { source: 'food', target: 'eyes' },
        { source: 'predators', target: 'ears' },
        { source: 'conspecifics', target: 'eyes' },
        { source: 'weather', target: 'skin' },
        { source: 'food', target: 'gut' },
        { source: 'eyes', target: 'brain_int' },
        { source: 'ears', target: 'brain_int' },
        { source: 'skin', target: 'brain_int' },
        { source: 'gut', target: 'organs' },
        { source: 'brain_int', target: 'organs' },
        { source: 'organs', target: 'metabolism' },
        { source: 'metabolism', target: 'immune' },
        { source: 'immune', target: 'brain_int' },
        { source: 'brain_int', target: 'muscles' },
        { source: 'brain_int', target: 'voice' },
        { source: 'brain_int', target: 'hands' },
        { source: 'muscles', target: 'predators' },
        { source: 'voice', target: 'conspecifics' },
        { source: 'hands', target: 'food' },
      ],
    },
    custom: {
      nodes: [
        { id: 'int1', type: 'internal', label: 'Internal 1' },
        { id: 'sen1', type: 'sensory', label: 'Sensory 1' },
        { id: 'act1', type: 'active', label: 'Active 1' },
        { id: 'ext1', type: 'external', label: 'External 1' },
      ],
      links: [
        { source: 'ext1', target: 'sen1' },
        { source: 'sen1', target: 'int1' },
        { source: 'int1', target: 'act1' },
        { source: 'act1', target: 'ext1' },
      ],
    },
  };

  const width = container.clientWidth || 800;
  const height = container.clientHeight || 500;

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const defs = svg.append('defs');
  ['internal', 'sensory', 'active', 'external'].forEach(type => {
    const grad = defs.append('radialGradient').attr('id', `grad-${type}`);
    grad.append('stop').attr('offset', '0%').attr('stop-color', COLORS[type]).attr('stop-opacity', 0.9);
    grad.append('stop').attr('offset', '100%').attr('stop-color', COLORS[type]).attr('stop-opacity', 0.5);
  });

  const blanketGroup = svg.append('g').attr('class', 'blanket-region');
  const linkGroup = svg.append('g').attr('class', 'links');
  const nodeGroup = svg.append('g').attr('class', 'nodes');
  const labelGroup = svg.append('g').attr('class', 'labels');
  const particleGroup = svg.append('g').attr('class', 'particles');

  let simulation = null;
  let currentNodes = [];
  let currentLinks = [];
  let flowAnimating = false;
  let flowParticles = [];
  let flowAnimId = null;

  function loadPreset(name) {
    stopFlow();
    const preset = presets[name];
    if (!preset) return;

    currentNodes = preset.nodes.map(n => ({
      ...n,
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: height / 2 + (Math.random() - 0.5) * 200,
    }));
    currentLinks = preset.links.map(l => ({ ...l }));

    if (simulation) simulation.stop();

    simulation = d3.forceSimulation(currentNodes)
      .force('link', d3.forceLink(currentLinks).id(d => d.id).distance(100).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(35))
      .force('x', d3.forceX().x(d => {
        if (d.type === 'external') return width * 0.15;
        if (d.type === 'sensory') return width * 0.38;
        if (d.type === 'internal') return width * 0.62;
        return width * 0.85;
      }).strength(0.15))
      .on('tick', ticked);

    render();
  }

  function render() {
    linkGroup.selectAll('line').remove();
    nodeGroup.selectAll('circle').remove();
    labelGroup.selectAll('text').remove();

    const links = linkGroup.selectAll('line')
      .data(currentLinks)
      .enter()
      .append('line')
      .attr('class', 'markov-link')
      .attr('stroke', '#334466')
      .attr('stroke-width', 2);

    const nodes = nodeGroup.selectAll('circle')
      .data(currentNodes)
      .enter()
      .append('circle')
      .attr('class', 'markov-node')
      .attr('r', 18)
      .attr('fill', d => `url(#grad-${d.type})`)
      .attr('stroke', d => COLORS[d.type])
      .attr('stroke-width', 2)
      .call(d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded));

    nodes.append('title').text(d => `${d.label} (${d.type})`);

    labelGroup.selectAll('text')
      .data(currentNodes)
      .enter()
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 32)
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .text(d => d.label);
  }

  function ticked() {
    linkGroup.selectAll('line')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    nodeGroup.selectAll('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);

    labelGroup.selectAll('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y);

    drawBlanket();
  }

  function drawBlanket() {
    blanketGroup.selectAll('*').remove();

    const blanketNodes = currentNodes.filter(n => n.type === 'sensory' || n.type === 'active');
    if (blanketNodes.length < 3) return;

    const hull = d3.polygonHull(blanketNodes.map(n => [n.x, n.y]));
    if (!hull) return;

    const expanded = expandHull(hull, 30);
    blanketGroup.append('path')
      .attr('d', `M${expanded.map(p => p.join(',')).join('L')}Z`)
      .attr('fill', 'rgba(34, 211, 238, 0.06)')
      .attr('stroke', 'rgba(34, 211, 238, 0.3)')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '8,4');
  }

  function expandHull(hull, padding) {
    const cx = hull.reduce((s, p) => s + p[0], 0) / hull.length;
    const cy = hull.reduce((s, p) => s + p[1], 0) / hull.length;
    return hull.map(p => {
      const dx = p[0] - cx;
      const dy = p[1] - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = (dist + padding) / dist;
      return [cx + dx * scale, cy + dy * scale];
    });
  }

  function dragStarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragEnded(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  function startFlow() {
    if (flowAnimating) return;
    flowAnimating = true;
    const showFlow = document.getElementById('markov-flow').checked;
    if (!showFlow) return;

    flowParticles = currentLinks.map(() => ({ t: Math.random(), speed: 0.005 + Math.random() * 0.01 }));

    function animateFlow() {
      if (!flowAnimating) return;
      const speed = parseFloat(document.getElementById('markov-speed').value);

      particleGroup.selectAll('circle').remove();

      flowParticles.forEach((fp, i) => {
        fp.t += fp.speed * speed;
        if (fp.t > 1) fp.t -= 1;

        const link = currentLinks[i];
        const sx = link.source.x, sy = link.source.y;
        const tx = link.target.x, ty = link.target.y;
        const x = sx + (tx - sx) * fp.t;
        const y = sy + (ty - sy) * fp.t;

        particleGroup.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 3)
          .attr('class', 'flow-particle');
      });

      flowAnimId = requestAnimationFrame(animateFlow);
    }
    animateFlow();
  }

  function stopFlow() {
    flowAnimating = false;
    if (flowAnimId) cancelAnimationFrame(flowAnimId);
    particleGroup.selectAll('circle').remove();
  }

  document.getElementById('markov-preset').addEventListener('change', e => {
    loadPreset(e.target.value);
  });

  document.getElementById('markov-animate').addEventListener('click', () => {
    if (flowAnimating) stopFlow();
    else startFlow();
  });

  document.getElementById('markov-reset').addEventListener('click', () => {
    loadPreset(document.getElementById('markov-preset').value);
  });

  loadPreset('cell');
}
