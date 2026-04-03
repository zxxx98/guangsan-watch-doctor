import crypto from 'crypto';
import path from 'path';
import {
  ScheduleMonitorConfig,
  MonitorStatus,
  MonitorResult,
  ScheduleApiResponse,
  DoctorSchedule,
  DEPARTMENTS,
  Department,
} from '../types';
import {
  type DeptApiResponse,
  extractLeafDepartments,
  loadPersistedConfig,
  savePersistedConfig,
  sortDepartmentsByPriority,
} from './departmentSync';

const APP_ID = '5C7A82A336CB969A121BC3CE74B02CF8';
const APP_SECRET = '8F531809185EFF5CB090F58B6ECA69EE';
const API_BASE_URL = 'https://xcx.gy3y.cn/lw/OutPatient';
const DEFAULT_BRANCH_ID = '02';
const MIN_INTERVAL_MS = 30 * 1000;
const DEFAULT_OPENID = 'o6irP5QtKpGjoIC2svm3ca0P0dBA';

const DATA_DIR = process.env.NODE_ENV === 'production' ? '/app/data' : path.join(process.cwd(), 'src');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

function getPersistedConfig() {
  return loadPersistedConfig(CONFIG_FILE);
}

function updatePersistedConfig(patch: { feishuWebhook?: string; departments?: Department[] }) {
  return savePersistedConfig(CONFIG_FILE, patch);
}

function generateRequestHeaders(requestData: Record<string, unknown> = {}, openid = ''): Record<string, string> {
  const ticks = String(Date.now());
  const nonce = String(Math.floor(Math.random() * 99999999) + 1);

  const normalized = { ...requestData };
  Object.keys(normalized).forEach((key) => {
    if (typeof normalized[key] === 'string') {
      normalized[key] = (normalized[key] as string).trim();
    }
  });

  const keys = Object.keys(normalized).sort((left, right) => left.charCodeAt(0) - right.charCodeAt(0));

  let payload = '';
  keys.forEach((key) => {
    const value = normalized[key];
    if (value == null || Array.isArray(value) || typeof value === 'object') {
      payload += key;
      return;
    }
    payload += key + String(value);
  });

  const raw = APP_ID + APP_SECRET + ticks + nonce + payload;
  const sorted = raw
    .split('')
    .sort((left, right) => left.charCodeAt(0) - right.charCodeAt(0))
    .join('')
    .replace(/\s*/g, '');

  const sign = crypto.createHash('md5').update(sorted, 'utf8').digest('hex').toUpperCase();

  return {
    AppId: APP_ID,
    Sign: sign,
    xweb_xhr: '1',
    Ticks: ticks,
    Nonce: nonce,
    openid,
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI MiniProgramEnv/Windows WindowsWechat/WMPF WindowsWechat(0x63090a13) UnifiedPCWindowsWechat(0xf2541721) XWEB/19027',
    Accept: 'text/json',
    'Content-Type': 'application/json;charset=UTF-8',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
    Referer: 'https://servicewechat.com/wx4d35223b6ad22fb1/185/page-frame.html',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  };
}

type DoctorNotification = {
  name: string;
  title: string;
  deptName: string;
  date: string;
  remainNumber: number;
  schedules: {
    period: string;
    room: string;
    remainNumber: number;
    totalNumber: number;
    timeSlots: {
      beginTime: string;
      endTime: string;
      remainNumber: number;
      totalNumber: number;
    }[];
  }[];
};

type QueryDepartmentResult = {
  success: boolean;
  departmentName: string;
  data?: {
    doctors: DoctorSchedule[];
    summary: {
      totalRemain: number;
      totalNumber: number;
      doctors: {
        id: string;
        name: string;
        title: string;
        deptName: string;
        date: string;
        remainNumber: number;
        totalNumber: number;
        schedules: {
          period: string;
          room: string;
          remainNumber: number;
          totalNumber: number;
          timeSlots: {
            beginTime: string;
            endTime: string;
            remainNumber: number;
            totalNumber: number;
          }[];
        }[];
      }[];
    };
  };
  error?: string;
};

class MonitorService {
  private isRunning = false;
  private startTime: string | null = null;
  private endTime: string | null = null;
  private intervalMs = MIN_INTERVAL_MS;
  private intervalId: NodeJS.Timeout | null = null;
  private lastCheckTime: string | null = null;
  private nextCheckTime: string | null = null;
  private results: MonitorResult[] = [];
  private deptIds: string[] = [];
  private openid = DEFAULT_OPENID;
  private feishuWebhook: string | null = null;

  start(config: ScheduleMonitorConfig): { success: boolean; message: string } {
    if (this.isRunning) {
      return { success: false, message: '监听服务已在运行中' };
    }

    this.startTime = config.startTime;
    this.endTime = config.endTime;
    this.intervalMs = Math.max(config.interval || MIN_INTERVAL_MS, MIN_INTERVAL_MS);
    this.deptIds = config.deptIds || this.getDepartments().map((department) => department.deptId);
    if (config.openid) {
      this.openid = config.openid;
    }

    if (config.feishuWebhook) {
      this.feishuWebhook = config.feishuWebhook;
      updatePersistedConfig({ feishuWebhook: config.feishuWebhook });
    } else {
      this.feishuWebhook = getPersistedConfig().feishuWebhook || null;
    }

    this.isRunning = true;
    this.runCheck();

    this.intervalId = setInterval(() => {
      this.runCheck();
    }, this.intervalMs);

    this.updateNextCheckTime();

    return { success: true, message: '监听服务已启动' };
  }

  stop(): { success: boolean; message: string } {
    if (!this.isRunning) {
      return { success: false, message: '监听服务未在运行' };
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    this.nextCheckTime = null;
    return { success: true, message: '监听服务已停止' };
  }

  getStatus(): MonitorStatus {
    return {
      isRunning: this.isRunning,
      startTime: this.startTime,
      endTime: this.endTime,
      lastCheckTime: this.lastCheckTime,
      nextCheckTime: this.nextCheckTime,
    };
  }

  getResults(): MonitorResult[] {
    return this.results;
  }

  clearResults(): void {
    this.results = [];
  }

  getFeishuWebhook(): string | null {
    return getPersistedConfig().feishuWebhook || null;
  }

  setFeishuWebhook(webhook: string): void {
    updatePersistedConfig({ feishuWebhook: webhook });
    this.feishuWebhook = webhook;
  }

  getDepartments(): Department[] {
    const persistedDepartments = getPersistedConfig().departments;
    const departments = persistedDepartments && persistedDepartments.length > 0 ? persistedDepartments : DEPARTMENTS;
    return sortDepartmentsByPriority(departments);
  }

  async syncDepartments(): Promise<Department[]> {
    const params = { branchId: DEFAULT_BRANCH_ID };
    const queryParams = new URLSearchParams(params);
    const url = `${API_BASE_URL}/GetDept?${queryParams.toString()}`;
    const headers = generateRequestHeaders(params, this.openid);

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`获取科室列表失败: HTTP ${response.status} ${body}`);
    }

    const json = (await response.json()) as DeptApiResponse;
    if (json.code !== 200) {
      throw new Error(`获取科室列表失败: ${json.msg}`);
    }

    const departments = extractLeafDepartments(json);
    if (departments.length === 0) {
      throw new Error('获取科室列表失败: 未解析到叶子科室');
    }

    const sortedDepartments = sortDepartmentsByPriority(departments);
    updatePersistedConfig({ departments: sortedDepartments });
    return sortedDepartments;
  }

  private updateNextCheckTime(): void {
    if (this.isRunning) {
      this.nextCheckTime = new Date(Date.now() + this.intervalMs).toISOString();
    }
  }

  private async sendFeishuNotification(doctors: DoctorNotification[]): Promise<void> {
    if (!this.feishuWebhook) {
      return;
    }

    const availableDoctors = doctors.filter((doctor) => doctor.remainNumber > 0);
    if (availableDoctors.length === 0) {
      return;
    }

    const content = availableDoctors
      .map((doctor) => {
        const scheduleInfo = doctor.schedules
          .filter((schedule) => schedule.remainNumber > 0)
          .map((schedule) => {
            const timeSlotsInfo = schedule.timeSlots
              .filter((slot) => slot.remainNumber > 0)
              .map((slot) => `${slot.beginTime}-${slot.endTime}(${slot.remainNumber}号)`)
              .join('、');

            return `${schedule.period} ${schedule.room}: ${timeSlotsInfo}`;
          })
          .join('\n');

        return `**${doctor.name}** (${doctor.title})\n门诊: ${doctor.deptName}\n日期: ${doctor.date}\n剩余号数: ${doctor.remainNumber}\n出诊时段:\n${scheduleInfo}`;
      })
      .join('\n\n---\n\n');

    const message = {
      msg_type: 'interactive',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: '医院号源通知',
          },
          template: 'green',
        },
        elements: [
          {
            tag: 'markdown',
            content,
          },
          {
            tag: 'note',
            elements: [
              {
                tag: 'plain_text',
                content: `通知时间: ${new Date().toLocaleString('zh-CN')}`,
              },
            ],
          },
        ],
      },
    };

    try {
      const response = await fetch(this.feishuWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error('[Feishu] Failed to send notification:', response.status);
      }
    } catch (error) {
      console.error('[Feishu] Failed to send notification:', error);
    }
  }

  private async runCheck(): Promise<void> {
    this.lastCheckTime = new Date().toISOString();

    try {
      const result = await this.queryAllDepartments();
      this.results.unshift(result);
      if (this.results.length > 100) {
        this.results.pop();
      }

      if (result.success && result.data) {
        const data = result.data as {
          doctors: DoctorNotification[];
          summary: {
            totalRemain: number;
            totalNumber: number;
            departments: { name: string; doctors: number; remainNumber: number; totalNumber: number }[];
          };
        };

        if (data.summary.totalRemain > 0) {
          await this.sendFeishuNotification(data.doctors);

          if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
          }
          this.isRunning = false;
          this.nextCheckTime = null;
        }
      }
    } catch (error) {
      const errorResult: MonitorResult = {
        timestamp: this.lastCheckTime,
        success: false,
        message: error instanceof Error ? error.message : '查询失败',
      };
      this.results.unshift(errorResult);
      if (this.results.length > 100) {
        this.results.pop();
      }
    }

    this.updateNextCheckTime();
  }

  private async queryAllDepartments(): Promise<MonitorResult> {
    const timestamp = new Date().toISOString();
    const departments = this.getDepartments().filter((department) => this.deptIds.includes(department.deptId));
    const results: QueryDepartmentResult[] = [];

    for (let index = 0; index < departments.length; index += 1) {
      const department = departments[index];

      if (index > 0) {
        const delay = 500 + Math.random() * 1500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      results.push(await this.querySingleDepartment(department));
    }

    let totalDoctors = 0;
    let totalRemain = 0;
    let totalNumber = 0;
    const allDoctors: DoctorNotification[] = [];
    const departmentSummaries: { name: string; doctors: number; remainNumber: number; totalNumber: number }[] = [];

    results.forEach((result) => {
      if (!result.success || !result.data) {
        return;
      }

      totalDoctors += result.data.summary.doctors.length;
      totalRemain += result.data.summary.totalRemain;
      totalNumber += result.data.summary.totalNumber;
      allDoctors.push(...result.data.summary.doctors);
      departmentSummaries.push({
        name: result.departmentName,
        doctors: result.data.summary.doctors.length,
        remainNumber: result.data.summary.totalRemain,
        totalNumber: result.data.summary.totalNumber,
      });
    });

    return {
      timestamp,
      success: true,
      message: `查询成功，共监控 ${departments.length} 个门诊，${totalDoctors} 位医生，剩余 ${totalRemain} 个号源`,
      data: {
        doctors: allDoctors,
        summary: {
          totalRemain,
          totalNumber,
          departments: departmentSummaries,
        },
      },
    };
  }

  private async querySingleDepartment(dept: Department): Promise<QueryDepartmentResult> {
    const formatDate = (dateStr: string | null): string => {
      if (!dateStr) {
        return '';
      }
      return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    };

    const params: Record<string, string> = {
      deptId: dept.deptId,
      doctorId: '',
      departmentName: dept.name,
      beginDate: formatDate(this.startTime),
      endDate: formatDate(this.endTime),
      isToday: '',
      branchId: dept.branchId,
    };

    const queryParams = new URLSearchParams(params);
    const url = `${API_BASE_URL}/getSchedulingList2_0?${queryParams.toString()}`;
    const headers = generateRequestHeaders(params, this.openid);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return { success: false, departmentName: dept.name, error: `HTTP 错误 ${response.status}: ${errorBody}` };
      }

      const jsonResponse = (await response.json()) as ScheduleApiResponse;
      if (jsonResponse.code !== 200) {
        return { success: false, departmentName: dept.name, error: `API 错误: ${jsonResponse.msg}` };
      }

      const availableSlots = this.extractAvailableSlots(jsonResponse.data);
      return {
        success: true,
        departmentName: dept.name,
        data: {
          doctors: jsonResponse.data,
          summary: {
            totalRemain: availableSlots.totalRemain,
            totalNumber: availableSlots.totalNumber,
            doctors: availableSlots.doctors,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        departmentName: dept.name,
        error: error instanceof Error ? error.message : '请求失败',
      };
    }
  }

  private extractAvailableSlots(doctors: DoctorSchedule[]): {
    totalRemain: number;
    totalNumber: number;
    doctors: {
      id: string;
      name: string;
      title: string;
      deptName: string;
      date: string;
      remainNumber: number;
      totalNumber: number;
      schedules: {
        period: string;
        room: string;
        remainNumber: number;
        totalNumber: number;
        timeSlots: {
          beginTime: string;
          endTime: string;
          remainNumber: number;
          totalNumber: number;
        }[];
      }[];
    }[];
  } {
    let totalRemain = 0;
    let totalNumber = 0;
    const doctorDetails: {
      id: string;
      name: string;
      title: string;
      deptName: string;
      date: string;
      remainNumber: number;
      totalNumber: number;
      schedules: {
        period: string;
        room: string;
        remainNumber: number;
        totalNumber: number;
        timeSlots: {
          beginTime: string;
          endTime: string;
          remainNumber: number;
          totalNumber: number;
        }[];
      }[];
    }[] = [];

    doctors.forEach((doctor) => {
      let doctorRemain = 0;
      let doctorTotal = 0;
      const schedules: {
        period: string;
        room: string;
        remainNumber: number;
        totalNumber: number;
        timeSlots: {
          beginTime: string;
          endTime: string;
          remainNumber: number;
          totalNumber: number;
        }[];
      }[] = [];

      if (!doctor.scheduleInfo2s) {
        return;
      }

      doctor.scheduleInfo2s.forEach((schedule) => {
        if (schedule.scheduleStatus === '3') {
          return;
        }

        let scheduleRemain = 0;
        let scheduleTotal = 0;
        const timeSlots: {
          beginTime: string;
          endTime: string;
          remainNumber: number;
          totalNumber: number;
        }[] = [];

        schedule.timeInfo.forEach((timeInfo) => {
          const remain = parseInt(timeInfo.remainNumber, 10) || 0;
          const total = parseInt(timeInfo.totalNumber, 10) || 0;
          scheduleRemain += remain;
          scheduleTotal += total;
          timeSlots.push({
            beginTime: timeInfo.beginTime,
            endTime: timeInfo.endTime,
            remainNumber: remain,
            totalNumber: total,
          });
        });

        doctorRemain += scheduleRemain;
        doctorTotal += scheduleTotal;

        schedules.push({
          period: schedule.schedulePeriodName,
          room: schedule.consultationRoom,
          remainNumber: scheduleRemain,
          totalNumber: scheduleTotal,
          timeSlots,
        });
      });

      totalRemain += doctorRemain;
      totalNumber += doctorTotal;
      doctorDetails.push({
        id: doctor.doctorId,
        name: doctor.doctorName,
        title: doctor.doctorTitle,
        deptName: doctor.deptName,
        date: doctor.scheduleDate,
        remainNumber: doctorRemain,
        totalNumber: doctorTotal,
        schedules,
      });
    });

    return {
      totalRemain,
      totalNumber,
      doctors: doctorDetails,
    };
  }
}

export const monitorService = new MonitorService();
