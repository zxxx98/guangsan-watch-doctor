import test from 'node:test';
import assert from 'node:assert/strict';
import { filterDoctorNotifications, shouldStopMonitoring } from './monitorFilters';

const sampleDoctors = [
  {
    id: '1',
    name: '黄蓓',
    title: '副主任医师',
    deptName: '妇科专家门诊',
    date: '2026-04-17',
    remainNumber: 2,
    totalNumber: 10,
    schedules: [],
  },
  {
    id: '2',
    name: '林琳',
    title: '副主任医师',
    deptName: '产科专家门诊',
    date: '2026-04-17',
    remainNumber: 1,
    totalNumber: 8,
    schedules: [],
  },
];

test('filterDoctorNotifications returns all doctors when no target doctor is configured', () => {
  assert.deepEqual(filterDoctorNotifications(sampleDoctors, ''), sampleDoctors);
  assert.deepEqual(filterDoctorNotifications(sampleDoctors, undefined), sampleDoctors);
});

test('filterDoctorNotifications matches doctor names by trimmed partial text', () => {
  assert.deepEqual(filterDoctorNotifications(sampleDoctors, '  黄蓓 '), [sampleDoctors[0]]);
  assert.deepEqual(filterDoctorNotifications(sampleDoctors, '琳'), [sampleDoctors[1]]);
});

test('shouldStopMonitoring respects the stop-on-available switch', () => {
  assert.equal(shouldStopMonitoring({ stopOnAvailable: true, totalRemain: 1 }), true);
  assert.equal(shouldStopMonitoring({ stopOnAvailable: false, totalRemain: 3 }), false);
  assert.equal(shouldStopMonitoring({ stopOnAvailable: true, totalRemain: 0 }), false);
});
