import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { ScheduleMonitorConfig, MonitorStatus, MonitorResult, ScheduleApiResponse, DoctorSchedule, DEPARTMENTS, Department } from '../types';

const APP_ID = "5C7A82A336CB969A121BC3CE74B02CF8";
const APP_SECRET = "8F531809185EFF5CB090F58B6ECA69EE";
const API_BASE_URL = "https://xcx.gy3y.cn/lw/OutPatient";

const DATA_DIR = process.env.NODE_ENV === 'production' ? '/app/data' : path.join(__dirname, '../../');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

interface PersistedConfig {
  feishuWebhook?: string;
}

function loadPersistedConfig(): PersistedConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      console.log('[Config] 加载持久化配置成功');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('[Config] 加载配置文件失败:', error);
  }
  return {};
}

function savePersistedConfig(config: PersistedConfig): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    console.log('[Config] 保存配置成功');
  } catch (error) {
    console.error('[Config] 保存配置文件失败:', error);
  }
}

function generateRequestHeaders(requestData: Record<string, unknown> = {}, openid: string = ""): Record<string, string> {
  const ticks = String(Date.now());
  const nonce = String(Math.floor(Math.random() * 99999999) + 1);

  let c = Object.assign({}, requestData);
  for (let key in c) {
    if (typeof c[key] === 'string') {
      c[key] = (c[key] as string).trim();
    }
  }

  let keys = Object.keys(c).sort((e, r) => e.charCodeAt(0) - r.charCodeAt(0));

  let g = "";
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    let val = c[key];
    if (val == null || Array.isArray(val) || typeof val === 'object') {
      g += key;
    } else {
      g += key + String(val);
    }
  }

  let rawStr = APP_ID + APP_SECRET + ticks + nonce + g;

  let charArray = rawStr.split("");
  charArray.sort((e, r) => e.charCodeAt(0) - r.charCodeAt(0));

  let sortedStr = charArray.join("").replace(/\s*/g, "");

  let sign = crypto.createHash('md5').update(sortedStr, 'utf8').digest('hex').toUpperCase();

  return {
    "AppId": APP_ID,
    "Sign": sign,
    "xweb_xhr": "1",
    "Ticks": ticks,
    "Nonce": nonce,
    "openid": openid,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI MiniProgramEnv/Windows WindowsWechat/WMPF WindowsWechat(0x63090a13) UnifiedPCWindowsWechat(0xf2541721) XWEB/19027",
    "Accept": "text/json",
    "Content-Type": "application/json;charset=UTF-8",
    "Sec-Fetch-Site": "cross-site",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    "Referer": "https://servicewechat.com/wx4d35223b6ad22fb1/185/page-frame.html",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "zh-CN,zh;q=0.9"
  };
}

class MonitorService {
  private isRunning: boolean = false;
  private startTime: string | null = null;
  private endTime: string | null = null;
  private intervalMs: number = 60000;
  private intervalId: NodeJS.Timeout | null = null;
  private lastCheckTime: string | null = null;
  private nextCheckTime: string | null = null;
  private results: MonitorResult[] = [];
  private deptIds: string[] = [];
  private openid: string = "o6irP5QtKpGjoIC2svm3ca0P0dBA";
  private feishuWebhook: string | null = null;

  start(config: ScheduleMonitorConfig): { success: boolean; message: string } {
    if (this.isRunning) {
      console.warn('[Monitor] 监听服务已在运行中');
      return { success: false, message: '监听服务已在运行中' };
    }

    this.startTime = config.startTime;
    this.endTime = config.endTime;
    this.intervalMs = config.interval || 60000;
    this.deptIds = config.deptIds || DEPARTMENTS.map(d => d.deptId);
    if (config.openid) this.openid = config.openid;
    
    if (config.feishuWebhook) {
      this.feishuWebhook = config.feishuWebhook;
      savePersistedConfig({ feishuWebhook: config.feishuWebhook });
    } else {
      const persisted = loadPersistedConfig();
      this.feishuWebhook = persisted.feishuWebhook || null;
    }
    this.isRunning = true;

    console.log(`[Monitor] 启动监听 - 时间范围: ${this.startTime} ~ ${this.endTime}, 轮询间隔: ${this.intervalMs / 1000}秒`);
    console.log(`[Monitor] 监听门诊: ${this.deptIds.join(', ')}`);
    if (this.feishuWebhook) {
      console.log(`[Monitor] 飞书通知: 已配置`);
    }

    this.runCheck();

    this.intervalId = setInterval(() => {
      this.runCheck();
    }, this.intervalMs);

    this.updateNextCheckTime();

    return { success: true, message: '监听服务已启动' };
  }

  stop(): { success: boolean; message: string } {
    if (!this.isRunning) {
      console.warn('[Monitor] 监听服务未在运行');
      return { success: false, message: '监听服务未在运行' };
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    this.nextCheckTime = null;
    console.log('[Monitor] 监听服务已停止');

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
    console.log('[Monitor] 结果已清空');
  }

  getFeishuWebhook(): string | null {
    const config = loadPersistedConfig();
    return config.feishuWebhook || null;
  }

  setFeishuWebhook(webhook: string): void {
    savePersistedConfig({ feishuWebhook: webhook });
    this.feishuWebhook = webhook;
  }

  private updateNextCheckTime(): void {
    if (this.isRunning) {
      this.nextCheckTime = new Date(Date.now() + this.intervalMs).toISOString();
    }
  }

  private async sendFeishuNotification(doctors: {
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
  }[]): Promise<void> {
    if (!this.feishuWebhook) {
      console.log('[Feishu] 未配置 webhook，跳过通知');
      return;
    }

    const availableDoctors = doctors.filter(d => d.remainNumber > 0);
    if (availableDoctors.length === 0) {
      console.log('[Feishu] 无可用号源，跳过通知');
      return;
    }

    const content = availableDoctors.map(doctor => {
      const scheduleInfo = doctor.schedules
        .filter(s => s.remainNumber > 0)
        .map(s => {
          const timeSlotsInfo = s.timeSlots
            .filter(t => t.remainNumber > 0)
            .map(t => `${t.beginTime}-${t.endTime}(${t.remainNumber}号)`)
            .join('、');
          return `${s.period} ${s.room}: ${timeSlotsInfo}`;
        })
        .join('\n');
      
      return `**${doctor.name}** (${doctor.title})\n门诊: ${doctor.deptName}\n日期: ${doctor.date}\n剩余号数: ${doctor.remainNumber}\n出诊时段:\n${scheduleInfo}`;
    }).join('\n\n---\n\n');

    const message = {
      msg_type: 'interactive',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: '🏥 医院号源通知'
          },
          template: 'green'
        },
        elements: [
          {
            tag: 'markdown',
            content: content
          },
          {
            tag: 'note',
            elements: [
              {
                tag: 'plain_text',
                content: `通知时间: ${new Date().toLocaleString('zh-CN')}`
              }
            ]
          }
        ]
      }
    };

    try {
      console.log(`[Feishu] 发送通知 - ${availableDoctors.length}位医生有号`);
      const response = await fetch(this.feishuWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });

      if (response.ok) {
        console.log('[Feishu] 通知发送成功');
      } else {
        console.error('[Feishu] 通知发送失败:', response.status);
      }
    } catch (error) {
      console.error('[Feishu] 通知发送异常:', error);
    }
  }

  private async runCheck(): Promise<void> {
    this.lastCheckTime = new Date().toISOString();
    console.log(`\n[Monitor] ========== 开始查询 ${new Date().toLocaleString('zh-CN')} ==========`);

    try {
      const result = await this.queryAllDepartments();
      this.results.unshift(result);
      if (this.results.length > 100) {
        this.results.pop();
      }

      if (result.success && result.data) {
        const data = result.data as {
          doctors: {
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
          }[];
          summary: {
            totalRemain: number;
            totalNumber: number;
            departments: { name: string; doctors: number; remainNumber: number; totalNumber: number }[];
          };
        };

        console.log(`[Monitor] 查询结果 - 总号源: ${data.summary.totalNumber}, 剩余: ${data.summary.totalRemain}`);

        if (data.summary.totalRemain > 0) {
          console.log('[Monitor] 检测到有号源，准备发送通知并停止监听');
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
      console.error('[Monitor] 查询异常:', error);
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
    const departments = DEPARTMENTS.filter(d => this.deptIds.includes(d.deptId));
    
    const results: { 
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
    }[] = [];

    for (let i = 0; i < departments.length; i++) {
      const dept = departments[i];
      
      if (i > 0) {
        const delay = 500 + Math.random() * 1500;
        console.log(`[Monitor] 等待 ${(delay / 1000).toFixed(2)} 秒后请求下一个门诊...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const result = await this.querySingleDepartment(dept);
      results.push(result);
    }

    let totalDoctors = 0;
    let totalRemain = 0;
    let totalNumber = 0;
    const allDoctors: {
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
    const departmentSummaries: { name: string; doctors: number; remainNumber: number; totalNumber: number }[] = [];

    for (const result of results) {
      if (result.success && result.data) {
        const data = result.data;
        totalDoctors += data.summary.doctors.length;
        totalRemain += data.summary.totalRemain;
        totalNumber += data.summary.totalNumber;
        allDoctors.push(...data.summary.doctors);
        departmentSummaries.push({
          name: result.departmentName,
          doctors: data.summary.doctors.length,
          remainNumber: data.summary.totalRemain,
          totalNumber: data.summary.totalNumber
        });
      }
    }

    return {
      timestamp,
      success: true,
      message: `查询成功，${departments.length}个门诊，共${totalDoctors}位医生，剩余${totalRemain}个号源`,
      data: {
        doctors: allDoctors,
        summary: {
          totalRemain,
          totalNumber,
          departments: departmentSummaries
        }
      }
    };
  }

  private async querySingleDepartment(dept: Department): Promise<{ 
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
  }> {
    const formatDate = (dateStr: string | null): string => {
      if (!dateStr) return '';
      if (dateStr.includes('T')) {
        return dateStr.split('T')[0];
      }
      return dateStr;
    };

    const params: Record<string, string> = {
      deptId: dept.deptId,
      doctorId: "",
      departmentName: dept.name,
      beginDate: formatDate(this.startTime),
      endDate: formatDate(this.endTime),
      isToday: '',
      branchId: dept.branchId
    };

    const queryParams = new URLSearchParams(params);
    const url = `${API_BASE_URL}/getSchedulingList2_0?${queryParams.toString()}`;
    const headers = generateRequestHeaders(params, this.openid);

    console.log(`[API] 请求门诊: ${dept.name}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[API] HTTP错误 ${response.status}:`, errorBody);
        return { success: false, departmentName: dept.name, error: `HTTP错误: ${response.status}` };
      }

      const jsonResponse: ScheduleApiResponse = await response.json();

      if (jsonResponse.code !== 200) {
        console.error(`[API] 业务错误: ${jsonResponse.msg}`);
        return { success: false, departmentName: dept.name, error: `API错误: ${jsonResponse.msg}` };
      }

      const availableSlots = this.extractAvailableSlots(jsonResponse.data);
      console.log(`[API] ${dept.name} - ${jsonResponse.data.length}位医生, 剩余${availableSlots.totalRemain}号`);

      return {
        success: true,
        departmentName: dept.name,
        data: {
          doctors: jsonResponse.data,
          summary: {
            totalRemain: availableSlots.totalRemain,
            totalNumber: availableSlots.totalNumber,
            doctors: availableSlots.doctors
          }
        }
      };
    } catch (error) {
      console.error(`[API] 请求失败:`, error);
      return { 
        success: false, 
        departmentName: dept.name, 
        error: error instanceof Error ? error.message : '请求失败' 
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

    for (const doctor of doctors) {
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
      if(!doctor.scheduleInfo2s)
      {
        continue;
      }
      for (const schedule of doctor.scheduleInfo2s) {
        if (schedule.scheduleStatus === '3') {
          continue;
        }

        let scheduleRemain = 0;
        let scheduleTotal = 0;
        const timeSlots: {
          beginTime: string;
          endTime: string;
          remainNumber: number;
          totalNumber: number;
        }[] = [];

        for (const timeInfo of schedule.timeInfo) {
          const remain = parseInt(timeInfo.remainNumber) || 0;
          const total = parseInt(timeInfo.totalNumber) || 0;
          scheduleRemain += remain;
          scheduleTotal += total;
          timeSlots.push({
            beginTime: timeInfo.beginTime,
            endTime: timeInfo.endTime,
            remainNumber: remain,
            totalNumber: total
          });
        }

        doctorRemain += scheduleRemain;
        doctorTotal += scheduleTotal;

        schedules.push({
          period: schedule.schedulePeriodName,
          room: schedule.consultationRoom,
          remainNumber: scheduleRemain,
          totalNumber: scheduleTotal,
          timeSlots
        });
      }

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
        schedules
      });
    }

    return {
      totalRemain,
      totalNumber,
      doctors: doctorDetails
    };
  }
}

export const monitorService = new MonitorService();
