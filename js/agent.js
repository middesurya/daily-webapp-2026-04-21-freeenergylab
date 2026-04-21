export function initAgent() {
  const aiCanvas = document.getElementById('agent-ai-canvas');
  const qlCanvas = document.getElementById('agent-ql-canvas');
  if (!aiCanvas || !qlCanvas) return;

  function sizeCanvas(c) {
    const parent = c.parentElement;
    const size = Math.min(parent.clientWidth - 20, 400);
    c.width = size;
    c.height = size;
  }
  sizeCanvas(aiCanvas);
  sizeCanvas(qlCanvas);

  const aiCtx = aiCanvas.getContext('2d');
  const qlCtx = qlCanvas.getContext('2d');

  let gridSize = 8;
  let epistemicDrive = 1.0;
  let pragmaticDrive = 1.0;
  let epsilon = 0.3;
  let simSpeed = 100;
  let running = false;
  let timer = null;

  let world = null;
  let aiAgent = null;
  let qlAgent = null;

  const CELL = {
    EMPTY: 0,
    WALL: 1,
    REWARD: 2,
    PENALTY: 3,
  };

  const ACTIONS = [
    { dx: 0, dy: -1, name: 'up' },
    { dx: 0, dy: 1, name: 'down' },
    { dx: -1, dy: 0, name: 'left' },
    { dx: 1, dy: 0, name: 'right' },
  ];

  function createWorld(size) {
    const grid = Array.from({ length: size }, () => Array(size).fill(CELL.EMPTY));

    const numWalls = Math.floor(size * size * 0.15);
    for (let i = 0; i < numWalls; i++) {
      const x = Math.floor(Math.random() * size);
      const y = Math.floor(Math.random() * size);
      if (x === 0 && y === 0) continue;
      grid[y][x] = CELL.WALL;
    }

    const numRewards = Math.max(2, Math.floor(size * 0.4));
    for (let i = 0; i < numRewards; i++) {
      let x, y;
      do {
        x = Math.floor(Math.random() * size);
        y = Math.floor(Math.random() * size);
      } while (grid[y][x] !== CELL.EMPTY || (x === 0 && y === 0));
      grid[y][x] = CELL.REWARD;
    }

    const numPenalties = Math.max(1, Math.floor(size * 0.25));
    for (let i = 0; i < numPenalties; i++) {
      let x, y;
      do {
        x = Math.floor(Math.random() * size);
        y = Math.floor(Math.random() * size);
      } while (grid[y][x] !== CELL.EMPTY || (x === 0 && y === 0));
      grid[y][x] = CELL.PENALTY;
    }

    return grid;
  }

  function createAIAgent(size) {
    const beliefs = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => ({
        visited: false,
        reward: 0,
        uncertainty: 1.0,
        visits: 0,
      }))
    );
    return {
      x: 0, y: 0,
      steps: 0,
      totalReward: 0,
      beliefs,
      path: [{ x: 0, y: 0 }],
    };
  }

  function createQLAgent(size) {
    const Q = {};
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        Q[`${x},${y}`] = [0, 0, 0, 0];
      }
    }
    return {
      x: 0, y: 0,
      steps: 0,
      totalReward: 0,
      Q,
      visited: new Set(['0,0']),
      path: [{ x: 0, y: 0 }],
    };
  }

  function isValid(x, y) {
    return x >= 0 && x < gridSize && y >= 0 && y < gridSize && world[y][x] !== CELL.WALL;
  }

  function getReward(x, y) {
    if (world[y][x] === CELL.REWARD) return 1;
    if (world[y][x] === CELL.PENALTY) return -1;
    return -0.01;
  }

  function expectedFreeEnergy(agent, actionIdx) {
    const act = ACTIONS[actionIdx];
    const nx = agent.x + act.dx;
    const ny = agent.y + act.dy;

    if (!isValid(nx, ny)) return 100;

    const belief = agent.beliefs[ny][nx];
    const epistemic = belief.uncertainty * epistemicDrive;
    const pragmatic = (belief.visits > 0 ? belief.reward : 0) * pragmaticDrive;

    return -epistemic - pragmatic;
  }

  function softmax(values, temperature) {
    const max = Math.max(...values);
    const exps = values.map(v => Math.exp((v - max) / Math.max(temperature, 0.01)));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sum);
  }

  function sampleFromProbs(probs) {
    const r = Math.random();
    let cum = 0;
    for (let i = 0; i < probs.length; i++) {
      cum += probs[i];
      if (r < cum) return i;
    }
    return probs.length - 1;
  }

  function stepAI() {
    const G = ACTIONS.map((_, i) => expectedFreeEnergy(aiAgent, i));
    const negG = G.map(g => -g);
    const probs = softmax(negG, 0.5);
    const actionIdx = sampleFromProbs(probs);

    const act = ACTIONS[actionIdx];
    const nx = aiAgent.x + act.dx;
    const ny = aiAgent.y + act.dy;

    if (isValid(nx, ny)) {
      aiAgent.x = nx;
      aiAgent.y = ny;
      const reward = getReward(nx, ny);
      aiAgent.totalReward += reward;

      const b = aiAgent.beliefs[ny][nx];
      b.visited = true;
      b.visits++;
      b.reward = b.reward + (reward - b.reward) / b.visits;
      b.uncertainty = Math.max(0.05, b.uncertainty * 0.6);

      aiAgent.path.push({ x: nx, y: ny });
    }
    aiAgent.steps++;
  }

  function stepQL() {
    const stateKey = `${qlAgent.x},${qlAgent.y}`;
    let actionIdx;

    if (Math.random() < epsilon) {
      actionIdx = Math.floor(Math.random() * 4);
    } else {
      const qVals = qlAgent.Q[stateKey];
      actionIdx = qVals.indexOf(Math.max(...qVals));
    }

    const act = ACTIONS[actionIdx];
    const nx = qlAgent.x + act.dx;
    const ny = qlAgent.y + act.dy;

    if (isValid(nx, ny)) {
      const reward = getReward(nx, ny);
      qlAgent.totalReward += reward;

      const nextKey = `${nx},${ny}`;
      const nextQ = qlAgent.Q[nextKey] || [0, 0, 0, 0];
      const maxNextQ = Math.max(...nextQ);
      const lr = 0.1;
      const gamma = 0.95;

      qlAgent.Q[stateKey][actionIdx] += lr * (reward + gamma * maxNextQ - qlAgent.Q[stateKey][actionIdx]);

      qlAgent.x = nx;
      qlAgent.y = ny;
      qlAgent.visited.add(nextKey);
      qlAgent.path.push({ x: nx, y: ny });
    }
    qlAgent.steps++;
  }

  function drawWorld(ctx, canvas, agent, isAI) {
    const W = canvas.width;
    const H = canvas.height;
    const cellW = W / gridSize;
    const cellH = H / gridSize;

    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, W, H);

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const px = x * cellW;
        const py = y * cellH;

        if (isAI) {
          const b = agent.beliefs[y][x];
          if (b.visited) {
            ctx.fillStyle = `rgba(34, 211, 238, ${0.08 + (1 - b.uncertainty) * 0.15})`;
            ctx.fillRect(px, py, cellW, cellH);
          } else {
            const unc = b.uncertainty;
            ctx.fillStyle = `rgba(100, 116, 139, ${unc * 0.1})`;
            ctx.fillRect(px, py, cellW, cellH);
          }
        } else {
          if (agent.visited.has(`${x},${y}`)) {
            ctx.fillStyle = 'rgba(34, 211, 238, 0.1)';
            ctx.fillRect(px, py, cellW, cellH);
          }
        }

        ctx.strokeStyle = '#1a2235';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, cellW, cellH);

        if (world[y][x] === CELL.WALL) {
          ctx.fillStyle = '#374151';
          ctx.fillRect(px + 2, py + 2, cellW - 4, cellH - 4);
        } else if (world[y][x] === CELL.REWARD) {
          ctx.fillStyle = '#4ade80';
          ctx.beginPath();
          ctx.arc(px + cellW / 2, py + cellH / 2, cellW * 0.25, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0a0e1a';
          ctx.font = `${Math.max(10, cellW * 0.3)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('+', px + cellW / 2, py + cellH / 2);
        } else if (world[y][x] === CELL.PENALTY) {
          ctx.fillStyle = '#f87171';
          ctx.beginPath();
          ctx.arc(px + cellW / 2, py + cellH / 2, cellW * 0.25, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0a0e1a';
          ctx.font = `${Math.max(10, cellW * 0.3)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('−', px + cellW / 2, py + cellH / 2);
        }
      }
    }

    if (isAI && agent.beliefs) {
      ctx.globalAlpha = 0.3;
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const b = agent.beliefs[y][x];
          if (b.uncertainty > 0.1) {
            const px = x * cellW + cellW / 2;
            const py = y * cellH + cellH / 2;
            const r = cellW * 0.15 * b.uncertainty;
            ctx.strokeStyle = '#a78bfa';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    // Draw path trail
    if (agent.path.length > 1) {
      ctx.strokeStyle = isAI ? 'rgba(249, 115, 22, 0.4)' : 'rgba(96, 165, 250, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const start = agent.path[Math.max(0, agent.path.length - 30)];
      ctx.moveTo(start.x * cellW + cellW / 2, start.y * cellH + cellH / 2);
      for (let i = Math.max(1, agent.path.length - 30); i < agent.path.length; i++) {
        ctx.lineTo(agent.path[i].x * cellW + cellW / 2, agent.path[i].y * cellH + cellH / 2);
      }
      ctx.stroke();
    }

    // Draw agent
    const ax = agent.x * cellW + cellW / 2;
    const ay = agent.y * cellH + cellH / 2;
    const agentR = cellW * 0.3;

    const glow = ctx.createRadialGradient(ax, ay, 0, ax, ay, agentR * 2);
    glow.addColorStop(0, isAI ? 'rgba(249, 115, 22, 0.4)' : 'rgba(96, 165, 250, 0.4)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(ax - agentR * 2, ay - agentR * 2, agentR * 4, agentR * 4);

    ctx.beginPath();
    ctx.arc(ax, ay, agentR, 0, Math.PI * 2);
    ctx.fillStyle = isAI ? '#f97316' : '#60a5fa';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function updateStats() {
    const totalCells = gridSize * gridSize - world.flat().filter(c => c === CELL.WALL).length;

    document.getElementById('ai-steps').textContent = aiAgent.steps;
    document.getElementById('ai-reward').textContent = aiAgent.totalReward.toFixed(1);
    let aiExplored = 0;
    for (let y = 0; y < gridSize; y++)
      for (let x = 0; x < gridSize; x++)
        if (aiAgent.beliefs[y][x].visited) aiExplored++;
    document.getElementById('ai-explored').textContent = Math.round(100 * aiExplored / totalCells) + '%';

    document.getElementById('ql-steps').textContent = qlAgent.steps;
    document.getElementById('ql-reward').textContent = qlAgent.totalReward.toFixed(1);
    document.getElementById('ql-explored').textContent = Math.round(100 * qlAgent.visited.size / totalCells) + '%';
  }

  function drawAll() {
    drawWorld(aiCtx, aiCanvas, aiAgent, true);
    drawWorld(qlCtx, qlCanvas, qlAgent, false);
    updateStats();
  }

  function simStep() {
    stepAI();
    stepQL();
    drawAll();
  }

  function resetWorld() {
    if (running) stop();
    gridSize = parseInt(document.getElementById('agent-grid').value);
    world = createWorld(gridSize);
    aiAgent = createAIAgent(gridSize);
    qlAgent = createQLAgent(gridSize);
    drawAll();
  }

  function start() {
    if (running) return;
    running = true;
    timer = setInterval(simStep, simSpeed);
    document.getElementById('agent-run').textContent = '⏸ Pause';
  }

  function stop() {
    running = false;
    if (timer) clearInterval(timer);
    document.getElementById('agent-run').textContent = '▶ Run Both';
  }

  document.getElementById('agent-run').addEventListener('click', () => {
    if (running) stop(); else start();
  });

  document.getElementById('agent-step').addEventListener('click', () => {
    stop();
    simStep();
  });

  document.getElementById('agent-reset').addEventListener('click', resetWorld);

  document.getElementById('agent-epistemic').addEventListener('input', e => {
    epistemicDrive = parseFloat(e.target.value);
  });

  document.getElementById('agent-pragmatic').addEventListener('input', e => {
    pragmaticDrive = parseFloat(e.target.value);
  });

  document.getElementById('agent-epsilon').addEventListener('input', e => {
    epsilon = parseFloat(e.target.value);
  });

  document.getElementById('agent-speed').addEventListener('input', e => {
    simSpeed = parseInt(e.target.value);
    if (running) {
      clearInterval(timer);
      timer = setInterval(simStep, simSpeed);
    }
  });

  document.getElementById('agent-grid').addEventListener('input', () => {
    resetWorld();
  });

  resetWorld();
}
