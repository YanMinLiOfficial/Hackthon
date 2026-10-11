import assert from 'node:assert/strict';
import { build } from 'esbuild';
async function bundle(path) {
  const result = await build({ entryPoints: [path], bundle: true, write: false, format: 'esm', define: { 'import.meta.env': '{}' } });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
const { selectPlaceMarkers } = await bundle('src/features/journey/selectors.ts');
const { applyMapLayers, facilityGlyphSvg } = await bundle('src/features/journey/mapLayers.ts');
const fixture = {
  places: [
    { id: 'lab', name: '科研楼', coordinates: { x: 20, y: 20, lng: 113.99, lat: 22.6 }, currentStatus: 'institution_confirmed', accessibilityFeatures: ['无障碍卫生间', '无障碍电梯'] },
    { id: 'gym', name: '书院', coordinates: { x: 50, y: 50 }, currentStatus: 'stale', accessibilityFeatures: [] },
    { id: 'gate', name: '出入口', coordinates: { x: 80, y: 80 }, currentStatus: 'pending', accessibilityFeatures: ['轮椅坡道'] },
  ],
  observations: [
    { placeId: 'gym', facilityType: 'elevator', issueType: 'unavailable' },
    { placeId: 'gate', facilityType: 'accessible_parking', issueType: 'missing' },
  ],
};
const markers = selectPlaceMarkers(fixture);
assert.deepEqual(markers[0].facilityTypes, ['accessible_restroom', 'elevator']);
assert.ok(markers[1].facilityTypes.includes('elevator'), 'faults remain records, not availability claims');
assert.ok(!markers[2].facilityTypes.includes('accessible_parking'), 'missing facilities must not become known facilities');
const visible = (layers) => applyMapLayers(markers, layers).filter((marker) => !marker.hidden);
assert.equal(visible(['inspection']).length, 3);
assert.equal(visible(['accessible_restroom']).length, 1);
assert.equal(visible(['accessible_restroom', 'elevator']).length, 2);
assert.equal(visible(['inspection', 'accessible_restroom', 'elevator']).length, 3);
assert.equal(visible([]).length, 0);
assert.deepEqual(visible(['accessible_restroom', 'elevator'])[0].visibleFacilities, ['accessible_restroom', 'elevator']);
assert.equal(new Set(visible(['accessible_restroom', 'elevator']).map((marker) => marker.placeId)).size, 2);
assert.equal(applyMapLayers(markers, [])[0].lng, markers[0].lng, 'hidden marker data remains available to route planning');
assert.ok(facilityGlyphSvg('accessible_restroom').includes('WC'));
assert.ok(facilityGlyphSvg('elevator').includes('<rect'));
console.log('PASS: default inspection, OR multiselect, combined facilities, empty layers, missing/fault records, route-data preservation.');
