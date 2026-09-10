import test from 'node:test';
import assert from 'node:assert/strict';
import { expandSerialAndDefectRows, getExportHours } from '../lib/helpers/reportExcelHelpers.js';

test('RATE uses inspected pieces divided by rate; FULL TIME keeps worked hours', () => {
  assert.equal(getExportHours('rate', 7, 100, 4), 0.07);
  assert.equal(getExportHours('rate', null, 100, 4), null);
  assert.equal(getExportHours('full_time', 7, null, 4), 4);
});

test('serials and lots expand downward without duplicating defects', () => {
  const serialLots = Array.from({ length: 5 }, (_, index) => ({
    serial_number: `SN-${index + 1}`,
    lot_number: `LOT-${index + 1}`,
  }));
  const rows = expandSerialAndDefectRows(serialLots, [{ defect_name: 'Rayón' }]);

  assert.equal(rows.length, 5);
  assert.deepEqual(rows.map((row) => row.serialLot.serial_number), ['SN-1', 'SN-2', 'SN-3', 'SN-4', 'SN-5']);
  assert.equal(rows.filter((row) => row.incident).length, 1);
  assert.equal(rows.filter((row) => row.carriesMetrics).length, 1);
});
