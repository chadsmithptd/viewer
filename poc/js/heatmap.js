import * as THREE from 'https://esm.sh/three@0.164.1';

const COLOR_IDLE       = new THREE.Color(0x00ff88);  // green
const COLOR_BUSY       = new THREE.Color(0xffaa00);  // amber
const COLOR_OVERLOADED = new THREE.Color(0xff2222);  // red
const COLOR_DOWN       = new THREE.Color(0x334455);  // dark grey — downtime

/**
 * Map utilization 0–1 to a heat color.
 * 0.0–0.5 → idle→busy, 0.5–1.0 → busy→overloaded
 */
function heatColor(util) {
  if (util <= 0) return COLOR_DOWN.clone();
  const c = new THREE.Color();
  if (util < 0.5) {
    c.lerpColors(COLOR_IDLE, COLOR_BUSY, util / 0.5);
  } else {
    c.lerpColors(COLOR_BUSY, COLOR_OVERLOADED, (util - 0.5) / 0.5);
  }
  return c;
}

function utilLabel(util) {
  if (util <= 0) return '<span style="color:#6688aa">OFFLINE</span>';
  const pct = Math.round(util * 100);
  if (util > 0.85) return `<span style="color:#ff4444">${pct}% ▲</span>`;
  if (util > 0.6)  return `<span style="color:#ffaa00">${pct}%</span>`;
  return `<span style="color:#00cc66">${pct}%</span>`;
}

export function updateMachineColors(machineObjects, utilMap) {
  for (const [id, obj] of Object.entries(machineObjects)) {
    const util = utilMap[id]?.[0] ?? 0;  // caller passes current-day slice
    obj.utilValue = util;

    const color = heatColor(util);
    obj.topMesh.material.color.copy(color);
    obj.topMesh.material.emissive.copy(color);
    obj.topMesh.material.emissiveIntensity = util > 0.85 ? 0.6 : 0.3;

    const utilSpan = obj.badge.querySelector('.badge-util');
    if (utilSpan) utilSpan.innerHTML = utilLabel(util);
  }
}
