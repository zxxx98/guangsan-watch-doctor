export interface Department {
  deptId: string;
  name: string;
  branchId: string;
}

export const DEPARTMENTS: Department[] = [
  { deptId: "0001102103101", name: "产科专家门诊(黄埔)", branchId: "02" },
  { deptId: "0001102103102", name: "产科普通门诊(黄埔)", branchId: "02" },
  { deptId: "0001102102101", name: "妇科普通门诊(黄埔)", branchId: "02" },
  { deptId: "0001102102102", name: "妇科专家门诊(黄埔)", branchId: "02" },
];

export interface ScheduleMonitorConfig {
  startTime: string;
  endTime: string;
  interval?: number;
  deptIds?: string[];
  feishuWebhook?: string;
  targetDoctorName?: string;
  stopOnAvailable?: boolean;
}

export interface MonitorStatus {
  isRunning: boolean;
  startTime: string | null;
  endTime: string | null;
  lastCheckTime: string | null;
  nextCheckTime: string | null;
}

export interface MonitorResult {
  timestamp: string;
  success: boolean;
  message: string;
  data?: unknown;
}

export interface ApiResponse {
  success: boolean;
  message: string;
}

export interface DepartmentSyncResponse extends ApiResponse {
  count: number;
  departments: Department[];
}
