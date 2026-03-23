import { Router, Request, Response } from 'express';
import { monitorService } from '../services/monitorService';
import { ScheduleMonitorConfig } from '../types';

export const scheduleMonitorRouter: Router = Router();

scheduleMonitorRouter.post('/start', (req: Request, res: Response) => {
  const config: ScheduleMonitorConfig = req.body;

  if (!config.startTime || !config.endTime) {
    res.status(400).json({
      success: false,
      message: '请提供起始时间和结束时间',
    });
    return;
  }

  const result = monitorService.start(config);
  res.json(result);
});

scheduleMonitorRouter.post('/stop', (req: Request, res: Response) => {
  const result = monitorService.stop();
  res.json(result);
});

scheduleMonitorRouter.get('/status', (req: Request, res: Response) => {
  const status = monitorService.getStatus();
  res.json(status);
});

scheduleMonitorRouter.get('/results', (req: Request, res: Response) => {
  const results = monitorService.getResults();
  res.json(results);
});

scheduleMonitorRouter.delete('/results', (req: Request, res: Response) => {
  monitorService.clearResults();
  res.json({ success: true, message: '结果已清空' });
});

scheduleMonitorRouter.get('/config', (req: Request, res: Response) => {
  const feishuWebhook = monitorService.getFeishuWebhook();
  const departments = monitorService.getDepartments();
  res.json({ feishuWebhook, departments });
});

scheduleMonitorRouter.post('/config', (req: Request, res: Response) => {
  const { feishuWebhook } = req.body;
  if (feishuWebhook) {
    monitorService.setFeishuWebhook(feishuWebhook);
  }
  res.json({ success: true, message: '配置已保存' });
});
