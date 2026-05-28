import { MACHINES, JOBS } from './machines.js';
import { TOTAL_DAYS } from './schedule.js';

const mutations = [];
let _onChange = null;

export function initWhatIf(onChange) {
  _onChange = onChange;
  buildShiftLevers();
  buildMoveJobLever();
  buildDowntimeLever();

  document.getElementById('reset-btn').addEventListener('click', () => {
    mutations.length = 0;
    syncAll();
    fire();
  });
}

export function getMutations() { return mutations; }

// ─── Shift levers ───────────────────────────────────────────────────────────

function buildShiftLevers() {
  const container = document.getElementById('shift-levers');
  container.innerHTML = '';

  for (const m of MACHINES) {
    const row = document.createElement('div');
    row.className = 'lever-row';
    row.innerHTML = `
      <label class="lever-label">${m.name}</label>
      <label class="toggle-wrap">
        <input type="checkbox" class="shift-toggle" data-id="${m.id}">
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
      </label>
      <span class="lever-hint" id="shift-hint-${m.id}"></span>
    `;
    container.appendChild(row);
  }

  container.addEventListener('change', e => {
    const el = e.target.closest('.shift-toggle');
    if (!el) return;
    const mid = el.dataset.id;
    removeMutation('shift', mid);
    if (el.checked) {
      mutations.push({
        type: 'shift',
        machineId: mid,
        startDay: 0,
        endDay: TOTAL_DAYS - 1,
        capacityMultiplier: 0.62,  // +8h shift ≈ 38% more capacity → ~0.62× load
      });
      document.getElementById(`shift-hint-${mid}`).textContent = '+8h/day';
    } else {
      document.getElementById(`shift-hint-${mid}`).textContent = '';
    }
    fire();
  });
}

// ─── Move Job lever ─────────────────────────────────────────────────────────

function buildMoveJobLever() {
  const jobSel = document.getElementById('job-select');
  const machineSel = document.getElementById('target-machine-select');
  const applyBtn = document.getElementById('move-job-btn');

  jobSel.innerHTML = '<option value="">— pick a job —</option>';
  JOBS.forEach(j => {
    jobSel.innerHTML += `<option value="${j.id}">${j.name} (${j.fromMachine})</option>`;
  });

  // Populate target machine options excluding the job's current machine
  jobSel.addEventListener('change', () => {
    const job = JOBS.find(j => j.id === jobSel.value);
    machineSel.innerHTML = '<option value="">— pick target —</option>';
    if (!job) return;
    MACHINES.filter(m => m.id !== job.fromMachine).forEach(m => {
      machineSel.innerHTML += `<option value="${m.id}">${m.name}</option>`;
    });
  });

  applyBtn.addEventListener('click', () => {
    const jobId = jobSel.value;
    const toMachineId = machineSel.value;
    if (!jobId || !toMachineId) return;
    removeMutation('moveJob', null, jobId);
    mutations.push({ type: 'moveJob', jobId, toMachineId });
    applyBtn.textContent = 'Applied ✓';
    applyBtn.classList.add('applied');
    setTimeout(() => { applyBtn.textContent = 'Move Job'; applyBtn.classList.remove('applied'); }, 1500);
    fire();
  });
}

// ─── Downtime lever ─────────────────────────────────────────────────────────

function buildDowntimeLever() {
  const machineSel = document.getElementById('downtime-machine-select');
  const startInput = document.getElementById('downtime-start');
  const endInput   = document.getElementById('downtime-end');
  const applyBtn   = document.getElementById('downtime-btn');

  machineSel.innerHTML = '<option value="">— pick machine —</option>';
  MACHINES.forEach(m => {
    machineSel.innerHTML += `<option value="${m.id}">${m.name}</option>`;
  });

  // Default start/end to 7 days out
  const today = new Date();
  const fmt = d => d.toISOString().split('T')[0];
  const startD = new Date(today); startD.setDate(today.getDate() + 7);
  const endD   = new Date(today); endD.setDate(today.getDate() + 9);
  startInput.value = fmt(startD);
  endInput.value   = fmt(endD);
  startInput.min   = fmt(today);
  endInput.min     = fmt(today);

  applyBtn.addEventListener('click', () => {
    const mid = machineSel.value;
    if (!mid) return;
    const origin = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const sDay = Math.round((new Date(startInput.value) - origin) / 86400000);
    const eDay = Math.round((new Date(endInput.value) - origin) / 86400000);
    if (sDay < 0 || eDay < sDay) return;
    removeMutation('downtime', mid);
    mutations.push({ type: 'downtime', machineId: mid, startDay: sDay, endDay: eDay });
    applyBtn.textContent = 'Applied ✓';
    applyBtn.classList.add('applied');
    setTimeout(() => { applyBtn.textContent = 'Add Downtime'; applyBtn.classList.remove('applied'); }, 1500);
    fire();
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function removeMutation(type, machineId, jobId) {
  for (let i = mutations.length - 1; i >= 0; i--) {
    const m = mutations[i];
    if (m.type !== type) continue;
    if (machineId && m.machineId !== machineId) continue;
    if (jobId && m.jobId !== jobId) continue;
    mutations.splice(i, 1);
  }
}

function syncAll() {
  // Reset shift toggles
  document.querySelectorAll('.shift-toggle').forEach(el => {
    el.checked = false;
    const hint = document.getElementById(`shift-hint-${el.dataset.id}`);
    if (hint) hint.textContent = '';
  });
  document.getElementById('job-select').value = '';
  document.getElementById('target-machine-select').innerHTML = '<option value="">— pick target —</option>';
  document.getElementById('downtime-machine-select').value = '';
}

function fire() {
  if (_onChange) _onChange([...mutations]);
}
