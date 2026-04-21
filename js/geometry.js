export function initGeometry() {
  const container = document.getElementById('geometry-viz');
  if (!container) return;

  const width = container.clientWidth || 800;
  const height = container.clientHeight || 500;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e1a);

  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
  camera.position.set(4, 5, 6);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  scene.add(new THREE.AmbientLight(0x334466, 0.5));
  const dirLight = new THREE.DirectionalLight(0x88ccff, 0.7);
  dirLight.position.set(5, 8, 5);
  scene.add(dirLight);

  const gridHelper = new THREE.GridHelper(10, 20, 0x1a2235, 0x1a2235);
  gridHelper.position.y = -1.5;
  scene.add(gridHelper);

  const RES = 50;
  let manifoldMesh = null;
  let geodesicLines = [];
  let gradientPaths = [];
  let fisherArrows = [];

  function fisherInfoGaussian(mu, sigma) {
    return {
      g11: 1 / (sigma * sigma),
      g12: 0,
      g22: 2 / (sigma * sigma),
    };
  }

  function klDivGaussian(mu1, s1, mu2, s2) {
    return Math.log(s2 / s1) + (s1 * s1 + (mu1 - mu2) ** 2) / (2 * s2 * s2) - 0.5;
  }

  function fisherInfoBeta(a, b) {
    const psiA = digamma(a);
    const psiB = digamma(b);
    const psiAB = digamma(a + b);
    const triA = trigamma(a);
    const triB = trigamma(b);
    const triAB = trigamma(a + b);
    return {
      g11: triA - triAB,
      g12: -triAB,
      g22: triB - triAB,
    };
  }

  function digamma(x) {
    if (x < 1) return digamma(x + 1) - 1 / x;
    let result = Math.log(x) - 1 / (2 * x);
    const x2 = x * x;
    result -= 1 / (12 * x2);
    result += 1 / (120 * x2 * x2);
    return result;
  }

  function trigamma(x) {
    if (x < 1) return trigamma(x + 1) + 1 / (x * x);
    let result = 1 / x + 1 / (2 * x * x);
    const x2 = x * x;
    result += 1 / (6 * x2 * x);
    result -= 1 / (30 * x2 * x2 * x);
    return result;
  }

  function buildGaussianManifold() {
    const muMin = -3, muMax = 3;
    const sigMin = 0.3, sigMax = 3;

    const geom = new THREE.PlaneGeometry(6, 3, RES - 1, RES - 1);
    const positions = geom.attributes.position.array;
    const colors = new Float32Array(positions.length);

    for (let i = 0; i < RES; i++) {
      for (let j = 0; j < RES; j++) {
        const mu = muMin + (muMax - muMin) * i / (RES - 1);
        const sigma = sigMin + (sigMax - sigMin) * j / (RES - 1);
        const fi = fisherInfoGaussian(mu, sigma);
        const curvature = Math.sqrt(fi.g11 * fi.g22 - fi.g12 * fi.g12);
        const y = Math.log(curvature + 1) * 0.5;

        const idx = (i * RES + j) * 3;
        positions[idx] = mu;
        positions[idx + 1] = y;
        positions[idx + 2] = sigma - 1.5;

        const t = Math.min(curvature / 5, 1);
        colors[idx] = 0.13 + 0.87 * t;
        colors[idx + 1] = 0.83 - 0.4 * t;
        colors[idx + 2] = 0.93 - 0.3 * t;
      }
    }

    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    return new THREE.Mesh(geom, new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 30,
      transparent: true,
      opacity: 0.8,
    }));
  }

  function buildBetaManifold() {
    const aMin = 0.5, aMax = 5;
    const bMin = 0.5, bMax = 5;

    const geom = new THREE.PlaneGeometry(5, 5, RES - 1, RES - 1);
    const positions = geom.attributes.position.array;
    const colors = new Float32Array(positions.length);

    for (let i = 0; i < RES; i++) {
      for (let j = 0; j < RES; j++) {
        const a = aMin + (aMax - aMin) * i / (RES - 1);
        const b = bMin + (bMax - bMin) * j / (RES - 1);
        const fi = fisherInfoBeta(a, b);
        const det = Math.max(fi.g11 * fi.g22 - fi.g12 * fi.g12, 0.001);
        const curvature = Math.sqrt(det);
        const y = Math.log(curvature + 1) * 0.8;

        const idx = (i * RES + j) * 3;
        positions[idx] = a - 2.5;
        positions[idx + 1] = y;
        positions[idx + 2] = b - 2.5;

        const t = Math.min(curvature / 3, 1);
        colors[idx] = 0.65 + 0.35 * t;
        colors[idx + 1] = 0.55 - 0.2 * t;
        colors[idx + 2] = 0.98 - 0.3 * t;
      }
    }

    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    return new THREE.Mesh(geom, new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 30,
      transparent: true,
      opacity: 0.8,
    }));
  }

  function buildCategoricalManifold() {
    const geom = new THREE.BufferGeometry();
    const vertices = [];
    const colorArr = [];
    const indices = [];

    const steps = 40;
    let vertIdx = 0;

    for (let i = 0; i <= steps; i++) {
      for (let j = 0; j <= steps - i; j++) {
        const p1 = (i + 0.01) / (steps + 0.03);
        const p2 = (j + 0.01) / (steps + 0.03);
        const p3 = Math.max(0.01, 1 - p1 - p2);

        const fi11 = 1 / p1;
        const fi22 = 1 / p2;
        const fi33 = 1 / p3;
        const curvature = Math.sqrt(fi11 + fi22 + fi33) * 0.2;
        const y = curvature * 0.3;

        const x = p1 * 2 + p2 - 1.5;
        const z = p2 * Math.sqrt(3) - 1;

        vertices.push(x, y, z);

        const t = Math.min(curvature / 3, 1);
        colorArr.push(0.13 + 0.5 * t, 0.83 * (1 - t * 0.3), 0.68 + 0.3 * t);
        vertIdx++;
      }
    }

    for (let i = 0; i < steps; i++) {
      const rowStart = i * (steps + 1) - (i * (i - 1)) / 2;
      const nextRowStart = (i + 1) * (steps + 1) - (i * (i + 1)) / 2;
      const rowLen = steps - i + 1;
      const nextRowLen = steps - i;

      for (let j = 0; j < nextRowLen; j++) {
        const a = rowStart + j;
        const b = rowStart + j + 1;
        const c = nextRowStart + j;
        if (a < vertIdx && b < vertIdx && c < vertIdx) {
          indices.push(a, b, c);
        }
        if (j < nextRowLen - 1) {
          const d = nextRowStart + j + 1;
          if (b < vertIdx && d < vertIdx && c < vertIdx) {
            indices.push(b, d, c);
          }
        }
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colorArr, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    return new THREE.Mesh(geom, new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 30,
      transparent: true,
      opacity: 0.8,
    }));
  }

  function clearScene() {
    if (manifoldMesh) { scene.remove(manifoldMesh); manifoldMesh = null; }
    geodesicLines.forEach(l => scene.remove(l));
    geodesicLines = [];
    gradientPaths.forEach(p => scene.remove(p));
    gradientPaths = [];
    fisherArrows.forEach(a => scene.remove(a));
    fisherArrows = [];
  }

  function getManifoldY(family, p1, p2) {
    if (family === 'gaussian') {
      const fi = fisherInfoGaussian(p1, p2);
      return Math.log(Math.sqrt(fi.g11 * fi.g22) + 1) * 0.5;
    } else if (family === 'beta') {
      const fi = fisherInfoBeta(p1, p2);
      const det = Math.max(fi.g11 * fi.g22 - fi.g12 * fi.g12, 0.001);
      return Math.log(Math.sqrt(det) + 1) * 0.8;
    }
    return 0;
  }

  function addGeodesics(family) {
    if (!document.getElementById('geometry-geodesics').checked) return;

    const numGeodesics = 5;
    for (let g = 0; g < numGeodesics; g++) {
      const points = [];
      const steps = 60;

      if (family === 'gaussian') {
        const mu0 = -2.5 + Math.random() * 5;
        const sig0 = 0.4 + Math.random() * 2.5;
        const mu1 = -2.5 + Math.random() * 5;
        const sig1 = 0.4 + Math.random() * 2.5;

        for (let t = 0; t <= steps; t++) {
          const frac = t / steps;
          const mu = mu0 + (mu1 - mu0) * frac;
          const logSig = Math.log(sig0) + (Math.log(sig1) - Math.log(sig0)) * frac;
          const sigma = Math.exp(logSig);
          const y = getManifoldY('gaussian', mu, sigma);
          points.push(new THREE.Vector3(mu, y + 0.02, sigma - 1.5));
        }
      } else if (family === 'beta') {
        const a0 = 0.6 + Math.random() * 4;
        const b0 = 0.6 + Math.random() * 4;
        const a1 = 0.6 + Math.random() * 4;
        const b1 = 0.6 + Math.random() * 4;

        for (let t = 0; t <= steps; t++) {
          const frac = t / steps;
          const a = a0 + (a1 - a0) * frac;
          const b = b0 + (b1 - b0) * frac;
          const y = getManifoldY('beta', a, b);
          points.push(new THREE.Vector3(a - 2.5, y + 0.02, b - 2.5));
        }
      }

      if (points.length > 1) {
        const geom = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.6 });
        const line = new THREE.Line(geom, mat);
        scene.add(line);
        geodesicLines.push(line);
      }
    }
  }

  function addFisherArrows(family) {
    if (!document.getElementById('geometry-fisher').checked) return;

    const numArrows = 20;
    for (let i = 0; i < numArrows; i++) {
      let p1, p2, fi, x, y, z;

      if (family === 'gaussian') {
        p1 = -2.5 + Math.random() * 5;
        p2 = 0.4 + Math.random() * 2.5;
        fi = fisherInfoGaussian(p1, p2);
        y = getManifoldY('gaussian', p1, p2);
        x = p1;
        z = p2 - 1.5;
      } else if (family === 'beta') {
        p1 = 0.6 + Math.random() * 4;
        p2 = 0.6 + Math.random() * 4;
        fi = fisherInfoBeta(p1, p2);
        y = getManifoldY('beta', p1, p2);
        x = p1 - 2.5;
        z = p2 - 2.5;
      } else return;

      const scale = Math.min(0.3 / Math.sqrt(fi.g11 + 0.1), 0.5);
      const arrowLen = scale;

      const dir1 = new THREE.Vector3(arrowLen, 0, 0);
      const origin = new THREE.Vector3(x, y + 0.05, z);

      const arrowGeom = new THREE.BufferGeometry().setFromPoints([
        origin,
        new THREE.Vector3(x + arrowLen * 0.7, y + 0.05, z),
      ]);
      const arrowMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.5 });
      const arrow = new THREE.Line(arrowGeom, arrowMat);
      scene.add(arrow);
      fisherArrows.push(arrow);

      const arrowGeom2 = new THREE.BufferGeometry().setFromPoints([
        origin,
        new THREE.Vector3(x, y + 0.05, z + arrowLen * 0.7),
      ]);
      const arrow2 = new THREE.Line(arrowGeom2, arrowMat.clone());
      scene.add(arrow2);
      fisherArrows.push(arrow2);
    }
  }

  let animatingGD = false;
  let gdAnimId = null;
  let gdTrails = [];

  function runGradientDescent() {
    if (animatingGD) return;
    animatingGD = true;

    const family = document.getElementById('geometry-family').value;
    const gradType = document.getElementById('geometry-gradient').value;
    const lr = parseFloat(document.getElementById('geometry-lr').value);
    const target = family === 'gaussian' ? { p1: 0, p2: 1.0 } : { p1: 2.5, p2: 2.5 };

    gdTrails.forEach(t => scene.remove(t));
    gdTrails = [];

    const doOrdinary = gradType === 'ordinary' || gradType === 'both';
    const doNatural = gradType === 'natural' || gradType === 'both';

    const agents = [];

    if (doOrdinary) {
      agents.push({
        p1: family === 'gaussian' ? -2 : 0.8,
        p2: family === 'gaussian' ? 2.5 : 4.5,
        type: 'ordinary',
        color: 0xf87171,
        path: [],
      });
    }
    if (doNatural) {
      agents.push({
        p1: family === 'gaussian' ? -2 : 0.8,
        p2: family === 'gaussian' ? 2.5 : 4.5,
        type: 'natural',
        color: 0x4ade80,
        path: [],
      });
    }

    agents.forEach(a => {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 12, 12),
        new THREE.MeshPhongMaterial({ color: a.color, emissive: a.color, emissiveIntensity: 0.4 })
      );
      scene.add(sphere);
      a.mesh = sphere;
      gdTrails.push(sphere);
    });

    let step = 0;
    const maxSteps = 200;

    function tick() {
      if (step >= maxSteps || !animatingGD) {
        animatingGD = false;
        return;
      }

      agents.forEach(a => {
        const eps = 0.001;

        let loss, dlp1, dlp2;
        if (family === 'gaussian') {
          loss = klDivGaussian(a.p1, a.p2, target.p1, target.p2);
          dlp1 = (klDivGaussian(a.p1 + eps, a.p2, target.p1, target.p2) - loss) / eps;
          dlp2 = (klDivGaussian(a.p1, a.p2 + eps, target.p1, target.p2) - loss) / eps;
        } else {
          const kl = klBeta(a.p1, a.p2, target.p1, target.p2);
          loss = kl;
          dlp1 = (klBeta(a.p1 + eps, a.p2, target.p1, target.p2) - kl) / eps;
          dlp2 = (klBeta(a.p1, a.p2 + eps, target.p1, target.p2) - kl) / eps;
        }

        if (a.type === 'natural') {
          let fi;
          if (family === 'gaussian') fi = fisherInfoGaussian(a.p1, a.p2);
          else fi = fisherInfoBeta(a.p1, a.p2);

          const det = fi.g11 * fi.g22 - fi.g12 * fi.g12;
          if (Math.abs(det) > 1e-10) {
            const invG11 = fi.g22 / det;
            const invG12 = -fi.g12 / det;
            const invG22 = fi.g11 / det;
            const ng1 = invG11 * dlp1 + invG12 * dlp2;
            const ng2 = invG12 * dlp1 + invG22 * dlp2;
            dlp1 = ng1;
            dlp2 = ng2;
          }
        }

        const normG = Math.sqrt(dlp1 * dlp1 + dlp2 * dlp2);
        const maxNorm = 2;
        if (normG > maxNorm) {
          dlp1 = dlp1 / normG * maxNorm;
          dlp2 = dlp2 / normG * maxNorm;
        }

        a.p1 -= lr * dlp1;
        a.p2 -= lr * dlp2;

        if (family === 'gaussian') {
          a.p1 = Math.max(-2.8, Math.min(2.8, a.p1));
          a.p2 = Math.max(0.35, Math.min(2.9, a.p2));
        } else {
          a.p1 = Math.max(0.55, Math.min(4.9, a.p1));
          a.p2 = Math.max(0.55, Math.min(4.9, a.p2));
        }

        let sx, sy, sz;
        if (family === 'gaussian') {
          sy = getManifoldY('gaussian', a.p1, a.p2) + 0.12;
          sx = a.p1;
          sz = a.p2 - 1.5;
        } else {
          sy = getManifoldY('beta', a.p1, a.p2) + 0.12;
          sx = a.p1 - 2.5;
          sz = a.p2 - 2.5;
        }

        a.mesh.position.set(sx, sy, sz);
        a.path.push(new THREE.Vector3(sx, sy, sz));

        if (a.path.length > 1) {
          if (a.line) { scene.remove(a.line); }
          const geom = new THREE.BufferGeometry().setFromPoints(a.path);
          const mat = new THREE.LineBasicMaterial({ color: a.color, transparent: true, opacity: 0.7 });
          a.line = new THREE.Line(geom, mat);
          scene.add(a.line);
          if (!gdTrails.includes(a.line)) gdTrails.push(a.line);
        }
      });

      step++;
      gdAnimId = requestAnimationFrame(tick);
    }
    tick();
  }

  function klBeta(a1, b1, a2, b2) {
    const lnB1 = lnBeta(a1, b1);
    const lnB2 = lnBeta(a2, b2);
    return lnB2 - lnB1 + (a1 - a2) * digamma(a1) + (b1 - b2) * digamma(b1) + (a2 - a1 + b2 - b1) * digamma(a1 + b1);
  }

  function lnBeta(a, b) {
    return lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  }

  function lnGamma(x) {
    if (x <= 0) return 0;
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.001208650973866179, -0.000005395239384953];
    let y = x;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) { ser += c[j] / ++y; }
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }

  function buildManifold() {
    clearScene();
    const family = document.getElementById('geometry-family').value;

    if (family === 'gaussian') {
      manifoldMesh = buildGaussianManifold();
    } else if (family === 'beta') {
      manifoldMesh = buildBetaManifold();
    } else {
      manifoldMesh = buildCategoricalManifold();
    }

    scene.add(manifoldMesh);

    if (family !== 'categorical') {
      addGeodesics(family);
      addFisherArrows(family);
    }
  }

  document.getElementById('geometry-family').addEventListener('change', buildManifold);
  document.getElementById('geometry-geodesics').addEventListener('change', buildManifold);
  document.getElementById('geometry-fisher').addEventListener('change', buildManifold);
  document.getElementById('geometry-descend').addEventListener('click', runGradientDescent);
  document.getElementById('geometry-reset').addEventListener('click', () => {
    animatingGD = false;
    if (gdAnimId) cancelAnimationFrame(gdAnimId);
    gdTrails.forEach(t => scene.remove(t));
    gdTrails = [];
    buildManifold();
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

  buildManifold();
}
