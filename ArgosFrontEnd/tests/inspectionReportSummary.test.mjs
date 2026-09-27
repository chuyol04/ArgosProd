// Run: node --experimental-strip-types --test tests/inspectionReportSummary.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { groupInspectionsByShift, summarizeInspectionDetails } from '../src/lib/inspectionReportSummary.ts';

test('screen consolidates by day/shift without duplicating boxes, hours or defects', () => {
  const fullTime = { inspection_mode: 'full_time', inspection_rate_per_hour: 100 };
  const details = [
    { id: 1, inspection_date: '2026-09-24', shift: '1', inspected_pieces: 1100, accepted_pieces: 1091, rejected_pieces: 9, reworked_pieces: 2, hours: '2.5', serial_numbers: [{ serial_number: 'A' }, { serial_number: 'B' }] },
    { id: 2, inspection_date: '2026-09-24T00:00:00.000Z', shift: '1', inspected_pieces: '1100', accepted_pieces: 1095, rejected_pieces: 5, reworked_pieces: 1, hours: 3, serial_numbers: [{ lot_number: 'LOT' }] },
    { id: 3, inspection_date: '2026-09-24', shift: '2', inspected_pieces: 100, accepted_pieces: 100, rejected_pieces: 0, hours: 1, serial_numbers: [] },
    { id: 4, inspection_date: '2026-09-25', shift: '1', inspected_pieces: 50, accepted_pieces: 50, rejected_pieces: 0, hours: 1, serial_numbers: [] },
  ];
  const incidents = [
    { inspection_detail_id: 1, defect_name: 'EXCESO DE MATERIAL', quantity: 9 },
    { inspection_detail_id: 2, defect_name: ' exceso  de material ', quantity: '5' },
    { inspection_detail_id: 2, defect_name: 'Rebaba', quantity: 2 },
    { inspection_detail_id: 3, defect_name: 'Rebaba', quantity: 1 },
  ];
  const original = structuredClone({ details, incidents });
  const groups = groupInspectionsByShift(details);
  assert.deepEqual(groups.map(([key, rows]) => [key, rows.map((row) => row.id)]), [
    ['2026-09-24::1', [1, 2]], ['2026-09-24::2', [3]], ['2026-09-25::1', [4]],
  ]);
  const group = groups[0][1];
  const groupIncidents = incidents.filter((incident) => group.some((detail) => detail.id === incident.inspection_detail_id));
  assert.deepEqual(summarizeInspectionDetails(group, groupIncidents, fullTime), {
    inspected: 2200, accepted: 2186, rejected: 14, reworked: 3, hours: 5.5,
    defects: [{ name: 'EXCESO DE MATERIAL', quantity: 14 }, { name: 'Rebaba', quantity: 2 }],
  });
  assert.equal(summarizeInspectionDetails(group, groupIncidents, { ...fullTime, inspection_mode: 'rate' }).hours, 22);
  assert.equal(summarizeInspectionDetails(group, [], { inspection_mode: 'rate', inspection_rate_per_hour: null }).hours, 5.5);
  assert.deepEqual(summarizeInspectionDetails([], [], fullTime), { inspected: 0, accepted: 0, rejected: 0, reworked: 0, hours: 0, defects: [] });
  assert.deepEqual(groupInspectionsByShift([]), []);
  assert.deepEqual({ details, incidents }, original); // Excel retains the original detail data.
});
