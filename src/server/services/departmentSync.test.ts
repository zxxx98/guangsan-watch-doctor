import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractLeafDepartments,
  mergePersistedConfig,
  type DeptApiResponse,
  type PersistedConfig,
} from './departmentSync';

test('extractLeafDepartments returns deduplicated leaf departments from api tree', () => {
  const response: DeptApiResponse = {
    code: 200,
    msg: 'success',
    data: [
      {
        branchId: '02',
        hospitalName: 'Test Hospital',
        departments: [
          {
            branchId: '02',
            departmentId: 'parent-a',
            departmentName: 'Parent A',
            children: [
              {
                branchId: '02',
                departmentId: 'leaf-a1',
                departmentName: 'Leaf A1',
                children: [],
              },
              {
                branchId: '02',
                departmentId: 'branch-a2',
                departmentName: 'Branch A2',
                children: [
                  {
                    branchId: '02',
                    departmentId: 'leaf-a2',
                    departmentName: 'Leaf A2',
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            branchId: '02',
            departmentId: 'duplicate-wrapper',
            departmentName: 'Duplicate Wrapper',
            children: [
              {
                branchId: '02',
                departmentId: 'leaf-a2',
                departmentName: 'Leaf A2',
                children: [],
              },
            ],
          },
        ],
      },
    ],
  };

  assert.deepEqual(extractLeafDepartments(response), [
    { deptId: 'leaf-a1', name: 'Leaf A1', branchId: '02' },
    { deptId: 'leaf-a2', name: 'Leaf A2', branchId: '02' },
  ]);
});

test('mergePersistedConfig preserves unrelated persisted fields while updating departments', () => {
  const current: PersistedConfig = {
    feishuWebhook: 'https://example.com/hook',
  };

  const merged = mergePersistedConfig(current, {
    departments: [{ deptId: 'leaf-a1', name: 'Leaf A1', branchId: '02' }],
  });

  assert.equal(merged.feishuWebhook, 'https://example.com/hook');
  assert.deepEqual(merged.departments, [{ deptId: 'leaf-a1', name: 'Leaf A1', branchId: '02' }]);
});

test('mergePersistedConfig preserves departments while updating webhook', () => {
  const current: PersistedConfig = {
    departments: [{ deptId: 'leaf-a1', name: 'Leaf A1', branchId: '02' }],
  };

  const merged = mergePersistedConfig(current, {
    feishuWebhook: 'https://example.com/updated-hook',
  });

  assert.equal(merged.feishuWebhook, 'https://example.com/updated-hook');
  assert.deepEqual(merged.departments, [{ deptId: 'leaf-a1', name: 'Leaf A1', branchId: '02' }]);
});
