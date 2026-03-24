import { Router, Request, Response } from 'express';
import { monitorService } from '../services/monitorService';
import { ScheduleMonitorConfig } from '../types';

export const scheduleMonitorRouter: Router = Router();

scheduleMonitorRouter.post('/start', (req: Request, res: Response) => {
  const config: ScheduleMonitorConfig = req.body;

  if (!config.startTime || !config.endTime) {
    res.status(400).json({
      success: false,
      message: '请提供开始时间和结束时间',
    });
    return;
  }

  res.json(monitorService.start(config));
});

scheduleMonitorRouter.post('/stop', (_req: Request, res: Response) => {
  res.json(monitorService.stop());
});

scheduleMonitorRouter.get('/status', (_req: Request, res: Response) => {
  res.json(monitorService.getStatus());
});

scheduleMonitorRouter.get('/results', (_req: Request, res: Response) => {
  res.json(monitorService.getResults());
});

scheduleMonitorRouter.delete('/results', (_req: Request, res: Response) => {
  monitorService.clearResults();
  res.json({ success: true, message: '结果已清空' });
});

scheduleMonitorRouter.get('/config', (_req: Request, res: Response) => {
  res.json({
    feishuWebhook: monitorService.getFeishuWebhook(),
    departments: monitorService.getDepartments(),
  });
});

scheduleMonitorRouter.post('/config', (req: Request, res: Response) => {
  const { feishuWebhook } = req.body as { feishuWebhook?: string };
  if (typeof feishuWebhook === 'string' && feishuWebhook.trim()) {
    monitorService.setFeishuWebhook(feishuWebhook.trim());
  }

  res.json({ success: true, message: '配置已保存' });
});

scheduleMonitorRouter.post('/departments/sync', async (_req: Request, res: Response) => {
  try {
    const departments = await monitorService.syncDepartments();
    res.json({
      success: true,
      message: `已同步 ${departments.length} 个科室`,
      count: departments.length,
      departments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '同步科室列表失败',
      count: 0,
      departments: [],
    });
  }
});
