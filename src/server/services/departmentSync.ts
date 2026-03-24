import fs from 'fs';
import { Department } from '../types';

export interface PersistedConfig {
  feishuWebhook?: string;
  departments?: Department[];
}

export interface DeptApiDepartmentNode {
  branchId: string | null;
  departmentId: string | null;
  departmentName: string | null;
  children?: DeptApiDepartmentNode[] | null;
}

export interface DeptApiBranch {
  branchId: string | null;
  hospitalName?: string | null;
  departments?: DeptApiDepartmentNode[] | null;
}

export interface DeptApiResponse {
  code: number;
  msg: string;
  data: DeptApiBranch[];
}

export function mergePersistedConfig(
  current: PersistedConfig,
  patch: Partial<PersistedConfig>
): PersistedConfig {
  return {
    ...current,
    ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)),
  };
}

export function loadPersistedConfig(configFile: string): PersistedConfig {
  try {
    if (fs.existsSync(configFile)) {
      const content = fs.readFileSync(configFile, 'utf-8');
      return JSON.parse(content) as PersistedConfig;
    }
  } catch (error) {
    console.error('[Config] Failed to load persisted config:', error);
  }

  return {};
}

export function savePersistedConfig(configFile: string, patch: Partial<PersistedConfig>): PersistedConfig {
  const merged = mergePersistedConfig(loadPersistedConfig(configFile), patch);

  try {
    fs.writeFileSync(configFile, JSON.stringify(merged, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Config] Failed to save persisted config:', error);
    throw error;
  }

  return merged;
}

export function extractLeafDepartments(response: DeptApiResponse): Department[] {
  const leafDepartments = new Map<string, Department>();

  const visitNode = (node: DeptApiDepartmentNode, fallbackBranchId: string | null) => {
    const branchId = node.branchId || fallbackBranchId || '';
    const deptId = node.departmentId?.trim() || '';
    const name = node.departmentName?.trim() || '';
    const children = (node.children || []).filter(Boolean);

    if (children.length === 0) {
      if (deptId && name && branchId && !leafDepartments.has(deptId)) {
        leafDepartments.set(deptId, { deptId, name, branchId });
      }
      return;
    }

    children.forEach((child) => visitNode(child, branchId));
  };

  response.data.forEach((branch) => {
    (branch.departments || []).forEach((department) => visitNode(department, branch.branchId || ''));
  });

  return Array.from(leafDepartments.values()).sort((left, right) => left.deptId.localeCompare(right.deptId));
}
