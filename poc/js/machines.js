export const DEPT_COLORS = {
  Turning: 0x00c8ff,
  Milling: 0x9b5de5,
  Inspect: 0x00f5d4,
  Finish:  0xf7b731,
};

export const MACHINES = [
  { id: 'M1', name: 'Lathe #1',  dept: 'Turning', x: -5, z: -3 },
  { id: 'M2', name: 'Lathe #2',  dept: 'Turning', x: -5, z:  0 },
  { id: 'M3', name: 'VMC #1',    dept: 'Milling', x: -1, z: -3 },
  { id: 'M4', name: 'VMC #2',    dept: 'Milling', x: -1, z:  0 },
  { id: 'M5', name: 'VMC #3',    dept: 'Milling', x: -1, z:  3 },
  { id: 'M6', name: 'CMM',       dept: 'Inspect', x:  3, z: -1.5 },
  { id: 'M7', name: 'Deburr',    dept: 'Finish',  x:  6, z:  0 },
  { id: 'M8', name: 'Wash',      dept: 'Finish',  x:  6, z:  3 },
];

export const DEPT_AREAS = [
  { label: 'Turning', dept: 'Turning', x: -5, z: -1.5, w: 3.5, d: 5 },
  { label: 'Milling', dept: 'Milling', x: -1, z:  0,   w: 3.5, d: 9 },
  { label: 'Inspect', dept: 'Inspect', x:  3, z: -1.5, w: 3,   d: 5 },
  { label: 'Finish',  dept: 'Finish',  x:  6, z:  1.5, w: 3,   d: 5 },
];

// Downstream relationships: when machine X frees up, these benefit
export const DOWNSTREAM = {
  M1: ['M3', 'M4'],
  M2: ['M3', 'M4', 'M5'],
  M3: ['M6'],
  M4: ['M6'],
  M5: ['M6'],
  M6: ['M7', 'M8'],
  M7: [],
  M8: [],
};

// Jobs used for the "move job" what-if lever
export const JOBS = [
  { id: 'JOB-101', name: 'Shaft Assembly',  fromMachine: 'M3', load: 0.35 },
  { id: 'JOB-102', name: 'Bracket Set',     fromMachine: 'M4', load: 0.28 },
  { id: 'JOB-103', name: 'Impeller Rough',  fromMachine: 'M1', load: 0.40 },
  { id: 'JOB-104', name: 'Housing Bore',    fromMachine: 'M2', load: 0.22 },
];
