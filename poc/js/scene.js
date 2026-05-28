import * as THREE from 'https://esm.sh/three@0.164.1';
import { OrbitControls } from 'https://esm.sh/three@0.164.1/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'https://esm.sh/three@0.164.1/examples/jsm/renderers/CSS2DRenderer.js';
import { MACHINES, DEPT_AREAS, DEPT_COLORS } from './machines.js';
import { updateMachineColors } from './heatmap.js';

export let camera, renderer, labelRenderer, scene;
const machineObjects = {};  // id → { mesh, badge }

export function initScene(canvas) {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e1a);
  scene.fog = new THREE.FogExp2(0x0a0e1a, 0.025);

  // Camera — isometric-ish perspective
  // Use the parent container dimensions since canvas CSS size may not be resolved yet
  const wrap = canvas.parentElement;
  const w = wrap.offsetWidth || window.innerWidth - 280;
  const h = wrap.offsetHeight || window.innerHeight - 48 - 80;
  camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 200);
  camera.position.set(14, 14, 14);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h, false);  // false = don't set canvas CSS size (CSS controls it)
  renderer.shadowMap.enabled = true;

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(w, h);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  canvas.parentElement.appendChild(labelRenderer.domElement);

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 6;
  controls.maxDistance = 40;
  controls.maxPolarAngle = Math.PI / 2.2;

  // Lights
  const ambient = new THREE.AmbientLight(0x1a2a4a, 2.5);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(10, 15, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x4466aa, 0.6);
  fill.position.set(-8, 6, -6);
  scene.add(fill);

  buildFloor();
  buildDeptAreas();
  buildMachines();
  buildGridLines();

  // Resize handler
  window.addEventListener('resize', () => {
    const w = wrap.offsetWidth, h = wrap.offsetHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    labelRenderer.setSize(w, h);
  });

  // Animate
  (function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    pulseMachines();
  })();

  return { machineObjects };
}

function buildFloor() {
  const geo = new THREE.PlaneGeometry(30, 20);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0d1526,
    roughness: 0.9,
    metalness: 0.1,
  });
  const floor = new THREE.Mesh(geo, mat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
}

function buildGridLines() {
  const size = 30, step = 1;
  const mat = new THREE.LineBasicMaterial({ color: 0x1a2a4a, transparent: true, opacity: 0.5 });
  const points = [];
  for (let i = -size / 2; i <= size / 2; i += step) {
    points.push(new THREE.Vector3(i, 0.01, -size / 2));
    points.push(new THREE.Vector3(i, 0.01,  size / 2));
    points.push(new THREE.Vector3(-size / 2, 0.01, i));
    points.push(new THREE.Vector3( size / 2, 0.01, i));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  scene.add(new THREE.LineSegments(geo, mat));
}

function buildDeptAreas() {
  for (const area of DEPT_AREAS) {
    const color = DEPT_COLORS[area.dept];
    const geo = new THREE.PlaneGeometry(area.w, area.d);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(area.x, 0.02, area.z);
    scene.add(mesh);

    // Dept border
    const edges = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.25 });
    const border = new THREE.LineSegments(edges, lineMat);
    border.rotation.x = -Math.PI / 2;
    border.position.set(area.x, 0.03, area.z);
    scene.add(border);
  }
}

function buildMachines() {
  for (const m of MACHINES) {
    const color = DEPT_COLORS[m.dept];

    // Body
    const bodyGeo = new THREE.BoxGeometry(1.2, 0.7, 1.2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x162030,
      roughness: 0.7,
      metalness: 0.4,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;

    // Top face — this is what we colorize
    const topGeo = new THREE.BoxGeometry(1.1, 0.05, 1.1);
    const topMat = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.4,
      roughness: 0.4,
      metalness: 0.6,
    });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 0.375;

    // Dept accent strip
    const stripGeo = new THREE.BoxGeometry(1.22, 0.06, 0.12);
    const stripMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.6,
    });
    const strip = new THREE.Mesh(stripGeo, stripMat);
    strip.position.set(0, -0.15, 0.55);

    const group = new THREE.Group();
    group.add(body, top, strip);
    group.position.set(m.x, 0.35, m.z);
    scene.add(group);

    // CSS2D badge
    const badge = document.createElement('div');
    badge.className = 'machine-badge';
    badge.innerHTML = `<span class="badge-name">${m.name}</span><span class="badge-util">—</span>`;
    const label = new CSS2DObject(badge);
    label.position.set(0, 1.1, 0);
    group.add(label);

    machineObjects[m.id] = { group, topMesh: top, badge, utilValue: 0, pulsePhase: Math.random() * Math.PI * 2 };
  }
}

let _pulseT = 0;
function pulseMachines() {
  _pulseT += 0.02;
  for (const obj of Object.values(machineObjects)) {
    if (obj.utilValue > 0.85) {
      const pulse = 0.5 + 0.5 * Math.sin(_pulseT * 3 + obj.pulsePhase);
      obj.topMesh.material.emissiveIntensity = 0.3 + pulse * 0.7;
    }
  }
}

export function setUtilization(utilMap) {
  updateMachineColors(machineObjects, utilMap);
}
