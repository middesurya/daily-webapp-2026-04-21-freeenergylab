export function initLandscape() {
  const container = document.getElementById('landscape-viz');
  if (!container) return;

  const width = container.clientWidth || 800;
  const height = container.clientHeight || 500;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e1a);

  const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
  camera.position.set(5, 6, 5);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.48;

  const ambientLight = new THREE.AmbientLight(0x334466, 0.6);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0x88ccff, 0.8);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);

  const gridHelper = new THREE.GridHelper(10, 20, 0x1a2235, 0x1a2235);
  gridHelper.position.y = -2;
  scene.add(gridHelper);

  const RES = 80;
  const RANGE = 4;

  function getParams() {
    return {
      obs: parseFloat(document.getElementById('landscape-obs').value),
      priorMean: parseFloat(document.getElementById('landscape-prior-mean').value),
      priorPrec: parseFloat(document.getElementById('landscape-prior-prec').value),
      likPrec: parseFloat(document.getElementById('landscape-lik-prec').value),
      numParticles: parseInt(document.getElementById('landscape-particles').value),
    };
  }

  function freeEnergy(mu, logSigma, params) {
    const sigma = Math.exp(logSigma);
    const sigma2 = sigma * sigma;
    const priorVar = 1 / params.priorPrec;
    const likVar = 1 / params.likPrec;
    const klPrior = 0.5 * (Math.log(priorVar / sigma2) + (sigma2 + (mu - params.priorMean) ** 2) / priorVar - 1);
    const ell = -0.5 * (Math.log(2 * Math.PI * likVar) + ((params.obs - mu) ** 2 + sigma2) / likVar);
    return klPrior - ell;
  }

  let surfaceMesh = null;

  function buildSurface(params) {
    if (surfaceMesh) scene.remove(surfaceMesh);

    const geom = new THREE.PlaneGeometry(8, 4, RES - 1, RES - 1);
    const positions = geom.attributes.position.array;
    const colors = new Float32Array(positions.length);

    let minF = Infinity, maxF = -Infinity;
    const fVals = [];

    for (let i = 0; i < RES; i++) {
      for (let j = 0; j < RES; j++) {
        const mu = -RANGE + (2 * RANGE * i) / (RES - 1);
        const logSig = -2 + (4 * j) / (RES - 1);
        let f = freeEnergy(mu, logSig, params);
        f = Math.min(f, 15);
        fVals.push(f);
        minF = Math.min(minF, f);
        maxF = Math.max(maxF, f);
      }
    }

    const fRange = maxF - minF || 1;

    for (let i = 0; i < RES; i++) {
      for (let j = 0; j < RES; j++) {
        const idx = i * RES + j;
        const vi = idx * 3;
        const f = fVals[idx];
        const norm = (f - minF) / fRange;
        const y = norm * 4 - 2;

        positions[vi] = -RANGE + (2 * RANGE * i) / (RES - 1);
        positions[vi + 1] = y;
        positions[vi + 2] = -2 + (4 * j) / (RES - 1);

        const r = 0.08 + 0.92 * norm;
        const g = 0.8 - 0.6 * norm;
        const b = 0.93 - 0.5 * norm;
        colors[vi] = r;
        colors[vi + 1] = g;
        colors[vi + 2] = b;
      }
    }

    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    const mat = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 40,
      transparent: true,
      opacity: 0.85,
      wireframe: false,
    });

    surfaceMesh = new THREE.Mesh(geom, mat);
    scene.add(surfaceMesh);
    return { minF, maxF, fRange };
  }

  let particles = [];
  let particleMeshes = [];
  let trails = [];
  let animating = false;
  let animId = null;

  function clearParticles() {
    particleMeshes.forEach(m => scene.remove(m));
    trails.forEach(t => scene.remove(t));
    particleMeshes = [];
    particles = [];
    trails = [];
  }

  function spawnParticles(params) {
    clearParticles();
    const n = params.numParticles;
    for (let i = 0; i < n; i++) {
      const mu = -RANGE + Math.random() * 2 * RANGE;
      const logSig = -2 + Math.random() * 4;
      particles.push({ mu, logSig, history: [{ mu, logSig }] });

      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 12, 12),
        new THREE.MeshPhongMaterial({
          color: 0x22d3ee,
          emissive: 0x22d3ee,
          emissiveIntensity: 0.5,
        })
      );
      scene.add(sphere);
      particleMeshes.push(sphere);
    }
  }

  function positionParticle(idx, params, surfInfo) {
    const p = particles[idx];
    const f = freeEnergy(p.mu, p.logSig, params);
    const norm = (Math.min(f, 15) - surfInfo.minF) / surfInfo.fRange;
    const y = norm * 4 - 2 + 0.12;
    particleMeshes[idx].position.set(p.mu, y, -2 + (p.logSig + 2));
  }

  function gradientStep(p, params, lr) {
    const eps = 0.001;
    const f0 = freeEnergy(p.mu, p.logSig, params);
    const dfMu = (freeEnergy(p.mu + eps, p.logSig, params) - f0) / eps;
    const dfSig = (freeEnergy(p.mu, p.logSig + eps, params) - f0) / eps;
    p.mu -= lr * dfMu;
    p.logSig -= lr * dfSig;
    p.mu = Math.max(-RANGE, Math.min(RANGE, p.mu));
    p.logSig = Math.max(-2, Math.min(2, p.logSig));
    p.history.push({ mu: p.mu, logSig: p.logSig });
  }

  function updateTrails(surfInfo, params) {
    trails.forEach(t => scene.remove(t));
    trails = [];
    particles.forEach((p, idx) => {
      if (p.history.length < 2) return;
      const points = p.history.map(h => {
        const f = freeEnergy(h.mu, h.logSig, params);
        const norm = (Math.min(f, 15) - surfInfo.minF) / surfInfo.fRange;
        const y = norm * 4 - 2 + 0.12;
        return new THREE.Vector3(h.mu, y, -2 + (h.logSig + 2));
      });
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.7 });
      const line = new THREE.Line(geom, mat);
      scene.add(line);
      trails.push(line);
    });
  }

  let surfInfo = null;

  function fullRebuild() {
    const params = getParams();
    surfInfo = buildSurface(params);
    spawnParticles(params);
    particles.forEach((_, i) => positionParticle(i, params, surfInfo));
  }

  function runGradientDescent() {
    if (animating) return;
    animating = true;
    const params = getParams();
    let step = 0;
    const maxSteps = 150;
    const lr = 0.05;

    function tick() {
      if (step >= maxSteps || !animating) {
        animating = false;
        return;
      }
      particles.forEach((p, i) => {
        gradientStep(p, params, lr);
        positionParticle(i, params, surfInfo);
      });
      updateTrails(surfInfo, params);
      step++;
      animId = requestAnimationFrame(tick);
    }
    tick();
  }

  document.getElementById('landscape-run').addEventListener('click', runGradientDescent);
  document.getElementById('landscape-reset').addEventListener('click', () => {
    animating = false;
    if (animId) cancelAnimationFrame(animId);
    fullRebuild();
  });

  ['landscape-obs', 'landscape-prior-mean', 'landscape-prior-prec', 'landscape-lik-prec'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      if (!animating) {
        const params = getParams();
        surfInfo = buildSurface(params);
        particles.forEach((_, i) => positionParticle(i, params, surfInfo));
        updateTrails(surfInfo, params);
      }
    });
  });

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  fullRebuild();
}
