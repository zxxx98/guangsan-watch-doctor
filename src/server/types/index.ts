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
  openid?: string;
  feishuWebhook?: string;
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

export interface ScheduleTimeInfo {
  regId: string;
  timeInterval: string;
  totalNumber: string;
  remainNumber: string;
  beginTime: string;
  endTime: string;
}

export interface ScheduleInfo {
  consultationRoom: string;
  scheduleRemainNumber: string;
  scheduleStatus: string;
  scheduleId: string;
  scheduleType: string;
  schedulePeriodId: string;
  schedulePeriodName: string;
  timeInfo: ScheduleTimeInfo[];
  prompt: string | null;
}

export interface DoctorSchedule {
  doctorImgBase64: string | null;
  registAmt: string | null;
  feeType: string | null;
  scheduleStatusAll: string;
  doctorSort: number;
  titleCode: string;
  branchId: string;
  deptId: string;
  deptName: string;
  doctorId: string;
  doctorName: string;
  doctorTitle: string;
  doctorDesc: string;
  scheduleDate: string;
  scheduleDayOfWeek: string;
  fee: string;
  scheduleInfo2s: ScheduleInfo[];
}

export interface ScheduleApiResponse {
  code: number;
  msg: string;
  data: DoctorSchedule[];
}
