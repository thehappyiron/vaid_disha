import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

// Load the real TypeScript modules using the project's installed Vite runtime.
// This test needs no browser, backend, account or external API.
const runtime = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
});
try {
  const { DEPARTMENTS } = await runtime.ssrLoadModule(
    '/src/data/departments.ts'
  );
  const routing = await runtime.ssrLoadModule(
    '/src/services/pathfindingService.ts'
  );
  const { FACILITY_PINS } = await runtime.ssrLoadModule(
    '/src/data/facilitiesData.ts'
  );
  const { getLiveStoreSnapshot } = await runtime.ssrLoadModule(
    '/src/services/liveStore.ts'
  );
  const { MOCK_STAFF_PATIENTS } = await runtime.ssrLoadModule(
    '/src/data/mockPatientsData.ts'
  );
  const { MOCK_REGISTERED_PATIENT } = await runtime.ssrLoadModule(
    '/src/data/mockUserData.ts'
  );
  const { MOCK_LAB_REPORTS } = await runtime.ssrLoadModule(
    '/src/data/labReportsData.ts'
  );
  const graph = routing.getHospitalGraph(),
    state = getLiveStoreSnapshot();
  const dicts = await Promise.all(
    ['en', 'hi', 'mr'].map(async (lang) =>
      JSON.parse(await readFile(`src/i18n/locales/${lang}.json`, 'utf8'))
    )
  );
  const lookup = (object, key) =>
    key.split('.').reduce((value, part) => value?.[part], object);
  assert.deepEqual(
    [...new Set(graph.nodes.map((node) => node.floor))].sort(),
    [0, 1, 2]
  );
  assert.equal(
    graph.nodes.filter((node) => node.floor === 0 && node.isLandmark).length,
    13
  );
  assert.deepEqual(
    DEPARTMENTS.filter((dept) => dept.category === 'consultation')
      .map((dept) => dept.roomNumbers[0])
      .sort(),
    ['1', '2', '3', '4', '5', '6', '7', '8']
  );
  for (const dept of DEPARTMENTS) {
    const node = routing.findNodeByDepartmentId(dept.id),
      live = state.departments[dept.id];
    assert.ok(node, `Missing map room: ${dept.id}`);
    assert.deepEqual(
      [node.name, node.floor, node.roomNumber],
      [dept.name, dept.floor, dept.roomNumbers[0]],
      `Map mismatch: ${dept.id}`
    );
    assert.deepEqual(
      [live.departmentName, live.roomNumber, live.floor, live.activeDoctorName],
      [dept.name, dept.roomNumbers[0], dept.floor, dept.doctorName],
      `Queue mismatch: ${dept.id}`
    );
    assert.equal(
      lookup(dicts[0], dept.nameKey),
      dept.name,
      `English name mismatch: ${dept.id}`
    );
    assert.ok(
      dept.doctorName && Number.isFinite(dept.averageConsultationMinutes)
    );
    if (dept.category === 'consultation') {
      assert.equal(dept.floor, 1);
      assert.equal(dept.opdHours, '09:00–14:00');
    }
    for (const dict of dicts)
      assert.ok(
        lookup(dict, dept.nameKey),
        `Missing translated department: ${dept.id}`
      );
  }
  for (const ward of ['ward-4', 'ward-5', 'ward-6'])
    assert.equal(routing.getNodeById(ward).floor, 2);
  for (const pin of FACILITY_PINS) {
    const node = routing.getNodeById(pin.nodeId);
    assert.deepEqual(
      [pin.name, pin.floor, pin.x, pin.y],
      [node.name, node.floor, node.x, node.y],
      `Facility mismatch: ${pin.id}`
    );
  }
  const roster = new Set(DEPARTMENTS.map((dept) => dept.doctorName));
  for (const patient of MOCK_STAFF_PATIENTS) {
    assert.ok(
      DEPARTMENTS.some(
        (dept) =>
          dept.name === patient.currentDepartment &&
          dept.doctorName === patient.currentDoctor
      ),
      `Staff record mismatch: ${patient.id}`
    );
    for (const visit of patient.previousVisits)
      assert.ok(
        roster.has(visit.doctorName),
        `Unknown visit doctor: ${visit.doctorName}`
      );
  }
  for (const visit of MOCK_REGISTERED_PATIENT.visits)
    assert.ok(
      DEPARTMENTS.some(
        (dept) =>
          dept.name === visit.departmentName &&
          dept.doctorName === visit.doctorName
      ),
      `Patient history mismatch: ${visit.id}`
    );
  for (const report of MOCK_LAB_REPORTS)
    assert.ok(
      DEPARTMENTS.some((dept) => dept.name === report.department) &&
        roster.has(report.doctorName),
      `Report mismatch: ${report.id}`
    );
  for (const node of graph.nodes) {
    assert.ok(
      Number.isFinite(node.x) && Number.isFinite(node.y) && node.landmark,
      `Incomplete place: ${node.id}`
    );
    for (const dict of dicts) {
      assert.ok(lookup(dict, node.nameKey));
      assert.ok(lookup(dict, node.landmarkKey));
    }
  }
  for (const edge of graph.edges) {
    const a = routing.getNodeById(edge.from),
      b = routing.getNodeById(edge.to);
    assert.ok(a && b && edge.distance > 0);
    assert.equal(edge.usesStairs, edge.type === 'stairs');
    if (a.floor !== b.floor) {
      assert.ok(['lift', 'stairs'].includes(edge.type));
      continue;
    }
    assert.ok(a.x === b.x || a.y === b.y, `Diagonal corridor: ${edge.from}`);
    for (const node of graph.nodes.filter(
      (node) => node.floor === a.floor && node.bounds
    )) {
      const r = node.bounds;
      const crosses =
        a.x === b.x
          ? a.x > r.x &&
            a.x < r.x + r.width &&
            Math.max(a.y, b.y) > r.y &&
            Math.min(a.y, b.y) < r.y + r.height
          : a.y > r.y &&
            a.y < r.y + r.height &&
            Math.max(a.x, b.x) > r.x &&
            Math.min(a.x, b.x) < r.x + r.width;
      assert.ok(
        !crosses,
        `Route crosses ${node.id}: ${edge.from} → ${edge.to}`
      );
    }
  }
  const straightHall = routing.computeRoute(
    'corridor-f1-200',
    'corridor-f1-995'
  );
  assert.ok(
    straightHall.steps.every(
      (step) => step.templateKey === 'guidance.step_walk'
    ),
    'A straight corridor must not announce repeated turns.'
  );
  let routes = 0;
  for (const a of graph.nodes)
    for (const b of graph.nodes)
      for (const accessible of [false, true]) {
        const route = routing.computeRoute(a.id, b.id, {
          excludeStairs: accessible,
        });
        assert.ok(route, `No route: ${a.id} → ${b.id}`);
        assert.equal(route.path[0], a.id);
        assert.equal(route.path.at(-1), b.id);
        if (accessible)
          assert.ok(route.edges.every((edge) => edge.type !== 'stairs'));
        routes++;
      }
  console.log(
    `Hospital checks passed: ${DEPARTMENTS.length} departments, ${FACILITY_PINS.length} facilities, ${graph.nodes.length} places, ${routes} routes, 3 languages.`
  );
} finally {
  await runtime.close();
}
