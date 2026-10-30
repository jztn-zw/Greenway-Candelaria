const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../../client/node_modules/typescript');

// Exercise the real drawing functions without opening a browser or contacting
// a map provider. Leaflet layers record marker lifetime and position writes.
function compile(code, scope) {
  const module = { exports: {} };
  const result = ts.transpileModule(`module.exports = ${code}`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
  }).outputText;
  vm.runInNewContext(result, { module, ...scope });
  return module.exports;
}

function sourceFile(file) {
  return ts.createSourceFile(file, fs.readFileSync(path.resolve(__dirname, '../..', file), 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function effect(file, fragment, scope) {
  const source = sourceFile(file);
  let callback;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect' &&
      node.arguments[0]?.getText(source).includes(fragment)) callback = node.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(callback, `drawing effect includes ${fragment}`);
  return compile(callback.getText(source), scope);
}

function drawing(file, name) {
  const source = sourceFile(file);
  const fn = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(fn, `${name} exists`);
  return compile(fn.getText(source), {
    latLng: ([lng, lat]) => [lat, lng],
    colors: { map: { road: 'blue', roadOutline: 'white', pin: 'green', inset: 'white', current: 'green' } },
    mapPin: () => ({ svg: 'pin' }), trackingMapPin: () => ({ svg: 'pin' }),
    scalablePinIcon: value => value,
    document: { createElement: () => ({ textContent: '' }) },
  });
}

function variable(file, name, scope) {
  const source = sourceFile(file);
  let value;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) value = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(value, `${name} exists`);
  return compile(value.getText(source), scope);
}

test('native Collector: a changed OSRM route reuses the GPS annotation and exact device coordinates', () => {
  let cached;
  const scope = {
    truckLng: 121, truckLat: 14, pinScale: 1, truckPin: { svg: 'pin' },
    truckAnnotation: { current: null }, routeCoordinates: firstRoad,
    PointAnnotation: 'PointAnnotation', View: 'View', SvgXml: 'SvgXml',
    React: { createElement: (type, props, ...children) => ({ type, props, children }) },
    mapPinDimensions: () => ({ width: 42, height: 54, frameWidth: 42, frameHeight: 54 }),
    useMemo: (work, dependencies) => {
      if (!cached || dependencies.some((value, index) => value !== cached.dependencies[index])) {
        cached = { dependencies, value: work() };
      }
      return cached.value;
    },
  };
  const render = () => variable('driverapp/src/components/tracking/LiveTruckMap.maplibre.tsx', 'truckMarker', scope);
  const first = render();
  assert.equal(first.props.coordinate[0], 121);
  assert.equal(first.props.coordinate[1], 14);
  scope.routeCoordinates = otherRoad;
  assert.equal(render(), first, 'road changes must not recreate the native annotation');
  scope.truckLng = 121.0001;
  const moved = render();
  assert.notEqual(moved, first);
  assert.equal(moved.props.coordinate[0], 121.0001);
  scope.truckLng = scope.truckLat = undefined;
  assert.equal(render(), null, 'no GPS must never fall back to the OSRM start');
});

test('native Resident: route updates keep GPS props stable and never substitute a road endpoint', () => {
  let cached;
  const scope = {
    truckLng: 121, truckLat: 14, routeCoordinates: firstRoad,
    useMemo: (work, dependencies) => {
      if (!cached || dependencies.some((value, index) => value !== cached.dependencies[index])) cached = { dependencies, value: work() };
      return cached.value;
    },
  };
  const render = () => variable('residentapp/src/components/tracking/LiveTruckMap.native.tsx', 'gpsCoordinate', scope);
  const first = render();
  scope.routeCoordinates = otherRoad;
  assert.equal(render(), first);
  scope.truckLat = 14.0001;
  assert.equal(render()[1], 14.0001);
  scope.truckLng = scope.truckLat = undefined;
  assert.equal(render(), null);
});

function leaflet() {
  const created = [];
  const group = () => ({
    layers: new Set(), clears: 0,
    addTo() { return this; },
    clearLayers() { this.clears++; for (const item of [...this.layers]) item.remove(); },
    removeLayer(item) { item.remove(); },
    eachLayer(work) { for (const item of [...this.layers]) work(item); },
  });
  const L = {
    divIcon: options => options,
    polyline: () => ({ addTo(layer) { layer.layers.add(this); return this; }, remove() {} }),
    marker: (coordinate, options) => {
      const marker = {
        coordinate, options, moves: 0, removes: 0, icons: 0, layer: null, events: new Map(),
        addTo(layer) { this.layer = layer; layer.layers.add(this); return this; },
        getLatLng() { return { lat: this.coordinate[0], lng: this.coordinate[1] }; },
        setLatLng(value) { this.coordinate = value; this.moves++; return this; },
        setIcon(icon) { this.options.icon = icon; this.icons++; return this; },
        bindTooltip() { return this; }, setTooltipContent() { return this; },
        getElement() { return null; },
        getPopup() { return this.popup; },
        bindPopup(content) { this.popup = { content }; return this; },
        setPopupContent(content) { this.popup.content = content; return this; },
        remove() { this.removes++; this.layer?.layers.delete(this); },
        on(event, work) { this.events.set(event, work); return this; },
      };
      created.push(marker); return marker;
    },
  };
  return { L, created, roads: group(), coverage: group(), markers: group(), reveal: { animate() {} } };
}

test('Collector embedded map: changing road geometry cannot move or recreate the device pin', () => {
  const f = leaflet();
  f.L.map = () => ({ layers: new Set(), setView() { return this; }, on() {}, getZoom: () => 14 });
  f.L.layerGroup = () => ({ layers: new Set(), addTo() { return this; }, clearLayers() { this.layers.clear(); } });
  f.L.tileLayer = () => ({ addTo() {} });
  const window = { L: f.L, ReactNativeWebView: { postMessage() {} }, addEventListener() {},
    matchMedia: () => ({ matches: true, addEventListener() {} }) };
  const context = vm.createContext({ window, L: f.L, Set, JSON, Math, String,
    setTimeout: () => 1, clearTimeout() {}, performance: { now: () => 0 },
    document: { addEventListener() {}, getElementById: () => ({ style: { setProperty() {} } }) },
  });
  const html = variable('driverapp/src/components/tracking/expoGoMapDocument.ts', 'expoGoMapHtml', {});
  for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) vm.runInContext(match[1], context);
  const data = { ...base, residentCoordinate: null, stops: [], truckPin: { width: 42, height: 54, svg: 'pin' },
    colors: { road: 'blue', roadOutline: 'white' }, primary: 'green', reducedMotion: true };
  const render = next => window.greenwayMap({ type: 'update', data: next });
  render(data);
  const truck = f.created[0];
  render({ ...data, routeCoordinates: otherRoad });
  assert.equal(f.created.length, 1);
  assert.equal(truck.moves, 0);
  render({ ...data, truckCoordinate: [121.0001, 14.0001] });
  assert.equal(truck.moves, 1);
  render({ ...data, truckCoordinate: null });
  assert.equal(truck.removes, 1);
});

function collector() {
  const f = leaflet();
  const scope = {
    L: f.L, mapRef: { current: { layers: new Set() } }, layerRef: { current: f.markers },
    truckMarkerRef: { current: null }, truckCoords: [14, 121], stops: [],
    lastStopsKeyRef: { current: '' }, hasAutoFittedRef: { current: false },
    userInteractedRef: { current: false }, selectedMapStop: null, showFullRoute: false, preview: false,
    renderTrackingStops: ({ layer }) => layer.clearLayers(), setSelectedMapStop() {},
    createCollectorTruckPinIcon: () => ({}), window: { matchMedia: () => ({ matches: true }) },
  };
  return { ...f, scope, render: coordinate => {
    scope.truckCoords = coordinate;
    effect('client/src/features/collector/route-map/components/RouteMapView.tsx', 'L.marker(truckCoords', scope)();
  } };
}

test('Collector website: route/stop refreshes retain the device marker', () => {
  const f = collector();
  f.render([14, 121]);
  const truck = f.created[0];
  f.render([14, 121]);
  assert.equal(f.created.length, 1);
  assert.equal(truck.removes, 0);
  assert.equal(truck.moves, 0);
  f.render([14.0001, 121.0001]);
  assert.equal(truck.moves, 1);
  f.render(null);
  assert.equal(truck.removes, 1);
});

function admin() {
  const f = leaflet();
  const scope = {
    L: f.L, trucksLayerRef: { current: f.markers }, truckMarkersRef: { current: new Map() },
    markerClickRef: { current() {} }, onMarkerClick() {},
    isReplayMode: false, focusedTruckId: 'truck', activeTruck: { id: 'truck' },
    visibleTrucks: [], createAdminTruckPinIcon: () => ({}), escapeHtml: value => String(value ?? ''),
  };
  const truck = { id: 'truck', status: 'on-the-way', coords: [14, 121], barangaysAway: null,
    name: 'Fixture truck', driverMessages: [], totalBarangays: 1, completedBarangays: 0 };
  return { ...f, scope, truck, render: rows => {
    scope.visibleTrucks = rows;
    effect('client/src/features/admin/truck-tracking/components/AdminTrackingMap.tsx', 'visibleTrucks.forEach', scope)();
  } };
}

test('Admin website: route recalculation and repeated snapshots cannot reset the GPS marker', () => {
  const f = admin();
  f.render([f.truck]);
  const marker = f.created[0];
  f.render([{ ...f.truck, coords: [14, 121] }]);
  assert.equal(f.created.length, 1);
  assert.equal(marker.removes, 0);
  assert.equal(marker.moves, 0);
  f.render([{ ...f.truck, coords: [14.0001, 121.0001] }]);
  assert.equal(marker.moves, 1);
  assert.equal(f.created.length, 1);
});

test('Admin website: disappearance and replay mode remove live pins', () => {
  const f = admin();
  f.render([f.truck]);
  const marker = f.created[0];
  f.render([]);
  assert.equal(marker.removes, 1);
  f.render([f.truck]);
  const replacement = f.created[1];
  f.scope.isReplayMode = true;
  f.render([f.truck]);
  assert.equal(replacement.removes, 1);
});

test('Admin website: retained pins keep current popup data, focus styling and click handlers', () => {
  const f = admin();
  f.render([f.truck]);
  const marker = f.created[0];
  const clicks = [];
  f.scope.markerClickRef.current = id => clicks.push(id);
  f.scope.focusedTruckId = null;
  f.scope.activeTruck = null;
  f.render([{ ...f.truck, name: 'Updated fixture truck', driverMessages: [{ text: 'Fixture update' }] }]);
  assert.equal(f.created.length, 1);
  assert.equal(marker.moves, 0);
  assert.equal(marker.icons, 1);
  assert.match(marker.popup.content, /Updated fixture truck/);
  assert.match(marker.popup.content, /Fixture update/);
  marker.events.get('click')();
  assert.deepEqual(clicks, ['truck']);
});

const truckCoordinate = [121, 14];
const firstRoad = [[121.001, 14.001], [121.002, 14.002]];
const otherRoad = [[121.01, 14.01], [121.02, 14.02]];
const base = { centerCoordinate: [121, 14], truckCoordinate, routeCoordinates: firstRoad,
  routeTargetKey: 'target', residentCoordinate: [121.005, 14.005], truckStatus: 'ACTIVE',
  coverageCoordinates: [], stopMarkers: [], trailCoordinates: [] };

for (const [app, fn] of [['driverapp', 'drawLayers'], ['residentapp', 'draw']]) {
  function fixture() {
    const f = leaflet(), state = {};
    const draw = drawing(`${app}/src/components/tracking/LiveTruckMap.web.tsx`, fn);
    const render = props => draw(f.L, f.roads, f.coverage, f.markers, props, f.reveal, state);
    return { ...f, state, render };
  }

  test(`${app}: OSRM route replacement leaves the existing truck pin untouched`, () => {
    const f = fixture();
    f.render(base);
    const truck = f.created.find(marker => marker.options.zIndexOffset === 1000);
    assert.ok(truck);
    const created = f.created.length;
    f.render({ ...base, routeCoordinates: otherRoad });
    assert.equal(f.created.length, created, 'route updates cannot recreate pins');
    assert.equal(truck.removes, 0);
    assert.equal(truck.moves, 0, 'route coordinates must never reposition the truck');
    assert.equal(truck.coordinate[0], 14);
    assert.equal(truck.coordinate[1], 121);
  });

  test(`${app}: a new array holding the same GPS fix does not move the pin`, () => {
    const f = fixture();
    f.render(base);
    const truck = f.created.find(marker => marker.options.zIndexOffset === 1000);
    f.render({ ...base, truckCoordinate: [...truckCoordinate], routeCoordinates: otherRoad });
    assert.equal(truck.moves, 0);
    assert.equal(truck.removes, 0);
  });

  test(`${app}: only a new device fix moves the retained truck marker`, () => {
    const f = fixture();
    f.render(base);
    const truck = f.created.find(marker => marker.options.zIndexOffset === 1000);
    f.render({ ...base, truckCoordinate: [121.0001, 14.0001], routeCoordinates: otherRoad });
    assert.equal(truck.removes, 0);
    assert.equal(truck.moves, 1);
    assert.equal(truck.coordinate[0], 14.0001);
    assert.equal(truck.coordinate[1], 121.0001);
  });

  test(`${app}: losing GPS removes the truck instead of using a road endpoint`, () => {
    const f = fixture();
    f.render(base);
    const truck = f.created.find(marker => marker.options.zIndexOffset === 1000);
    f.render({ ...base, truckCoordinate: null, routeCoordinates: otherRoad });
    assert.equal(truck.removes, 1);
    assert.equal([...f.markers.layers].some(marker => marker.options?.zIndexOffset === 1000), false);
  });

  if (app === 'driverapp') test('Collector app: changing stop visibility keeps the GPS pin intact', () => {
    const f = fixture();
    f.render(base);
    const truck = f.created[0];
    f.render({ ...base, stopMarkers: [{ id: 'stop', status: 'current', label: '1', coordinate: [121.01, 14.01] }] });
    assert.equal(truck.removes, 0);
    assert.equal(truck.moves, 0);
    assert.equal([...f.markers.layers].filter(marker => marker.options?.zIndexOffset === 1000).length, 1);
  });

  if (app === 'residentapp') test('Resident app: stale/live styling updates the retained pin without moving it', () => {
    const f = fixture();
    f.render(base);
    const truck = f.created.find(marker => marker.options.zIndexOffset === 1000);
    f.render({ ...base, truckStatus: 'STALE' });
    assert.equal(truck.removes, 0);
    assert.equal(truck.moves, 0);
    assert.equal(truck.icons, 1);
    assert.match(truck.options.title, /last known/);
  });
}
