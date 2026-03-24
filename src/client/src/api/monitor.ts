import { ScheduleMonitorConfig, MonitorStatus, MonitorResult, ApiResponse, Department, DepartmentSyncResponse } from '../types';

const API_BASE = '/api/monitor';

export const monitorApi = {
  async start(config: ScheduleMonitorConfig): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    return response.json();
  },

  async stop(): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/stop`, {
      method: 'POST',
    });
    return response.json();
  },

  async getStatus(): Promise<MonitorStatus> {
    const response = await fetch(`${API_BASE}/status`);
    return response.json();
  },

  async getResults(): Promise<MonitorResult[]> {
    const response = await fetch(`${API_BASE}/results`);
    return response.json();
  },

  async clearResults(): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/results`, {
      method: 'DELETE',
    });
    return response.json();
  },

  async getConfig(): Promise<{ feishuWebhook: string | null, departments: Department[] }> {
    const response = await fetch(`${API_BASE}/config`);
    return response.json();
  },

  async saveConfig(feishuWebhook: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ feishuWebhook }),
    });
    return response.json();
  },

  async syncDepartments(): Promise<DepartmentSyncResponse> {
    const response = await fetch(`${API_BASE}/departments/sync`, {
      method: 'POST',
    });
    return response.json();
  },
};
