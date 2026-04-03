import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Grid,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CalendarOutlined,
  ClearOutlined,
  ClockCircleOutlined,
  NotificationOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { monitorApi } from '../api/monitor';
import { Department, MonitorResult, MonitorStatus, ScheduleMonitorConfig } from '../types';

const { Title, Paragraph, Text } = Typography;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

interface TimeSlotDetail {
  beginTime: string;
  endTime: string;
  remainNumber: number;
  totalNumber: number;
}

interface ScheduleDetail {
  period: string;
  room: string;
  remainNumber: number;
  totalNumber: number;
  timeSlots: TimeSlotDetail[];
}

interface DoctorDetail {
  id: string;
  name: string;
  title: string;
  deptName: string;
  date: string;
  remainNumber: number;
  totalNumber: number;
  schedules: ScheduleDetail[];
}

interface DepartmentSummary {
  name: string;
  doctors: number;
  remainNumber: number;
  totalNumber: number;
}

interface MonitorResultData {
  doctors: DoctorDetail[];
  summary: {
    totalRemain: number;
    totalNumber: number;
    departments: DepartmentSummary[];
  };
}

interface SummaryStatCardProps {
  label: string;
  value: string;
  hint?: string;
  accent?: 'success' | 'danger' | 'neutral';
  icon: React.ReactNode;
}

interface MobileResultCardProps {
  result: MonitorResult;
}

interface ResultMetric {
  remain: number;
  total: number;
}

const formatDateTime = (value: string | null, template = 'YYYY-MM-DD HH:mm:ss') =>
  value ? dayjs(value).format(template) : '-';

const getResultData = (result: MonitorResult): MonitorResultData | null => {
  if (!result.success || !result.data) {
    return null;
  }

  return result.data as MonitorResultData;
};

const getMetricTone = (remain: number) => (remain > 0 ? 'success' : 'danger');

const SummaryStatCard: React.FC<SummaryStatCardProps> = ({ label, value, hint, accent = 'neutral', icon }) => (
  <Card className={`summary-card summary-card--${accent}`} bordered={false}>
    <div className="summary-card__icon">{icon}</div>
    <div className="summary-card__body">
      <Text className="summary-card__label">{label}</Text>
      <Text className="summary-card__value">{value}</Text>
      {hint ? <Text className="summary-card__hint">{hint}</Text> : null}
    </div>
  </Card>
);

const DepartmentSummaryList: React.FC<{ departments: DepartmentSummary[] }> = ({ departments }) => {
  if (departments.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无科室汇总" />;
  }

  return (
    <div className="department-summary-list">
      {departments.map((department) => (
        <div className="department-summary-item" key={department.name}>
          <Text className="department-summary-item__name">{department.name}</Text>
          <Text className={`metric-text metric-text--${getMetricTone(department.remainNumber)}`}>
            {department.remainNumber}/{department.totalNumber}
          </Text>
          <Text className="department-summary-item__meta">{department.doctors} 位医生</Text>
        </div>
      ))}
    </div>
  );
};

const DoctorScheduleCard: React.FC<{ doctor: DoctorDetail }> = ({ doctor }) => (
  <Card size="small" className="doctor-card" bordered={false}>
    <div className="doctor-card__header">
      <div>
        <Text className="doctor-card__name">{doctor.name}</Text>
        <Text className="doctor-card__title">{doctor.title || '未填写职称'}</Text>
      </div>
      <Text className={`metric-pill metric-pill--${getMetricTone(doctor.remainNumber)}`}>
        {doctor.remainNumber}/{doctor.totalNumber}
      </Text>
    </div>
    <div className="doctor-card__meta">
      <Text>{doctor.deptName}</Text>
      <Text>{doctor.date}</Text>
    </div>

    <div className="schedule-list">
      {doctor.schedules.map((schedule) => (
        <div className="schedule-card" key={`${doctor.id}-${schedule.period}-${schedule.room}`}>
          <div className="schedule-card__header">
            <Text className="schedule-card__title">
              {schedule.period} · {schedule.room}
            </Text>
            <Text className={`metric-text metric-text--${getMetricTone(schedule.remainNumber)}`}>
              {schedule.remainNumber}/{schedule.totalNumber}
            </Text>
          </div>
          <div className="time-slot-list">
            {schedule.timeSlots.map((slot) => (
              <div className="time-slot-item" key={`${doctor.id}-${schedule.period}-${slot.beginTime}`}>
                <div>
                  <Text className="time-slot-item__time">
                    {slot.beginTime} - {slot.endTime}
                  </Text>
                </div>
                <Text className={`metric-text metric-text--${getMetricTone(slot.remainNumber)}`}>
                  {slot.remainNumber}/{slot.totalNumber}
                </Text>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </Card>
);

const MobileResultCard: React.FC<MobileResultCardProps> = ({ result }) => {
  const data = getResultData(result);
  const metric: ResultMetric | null = data
    ? {
        remain: data.summary.totalRemain,
        total: data.summary.totalNumber,
      }
    : null;

  return (
    <Card className="result-card-mobile" bordered={false}>
      <div className="result-card-mobile__header">
        <div>
          <Text className="result-card-mobile__time">{formatDateTime(result.timestamp)}</Text>
          <div className="result-card-mobile__tags">
            <Tag color={result.success ? 'success' : 'error'}>{result.success ? '成功' : '失败'}</Tag>
            {metric ? (
              <Tag color={metric.remain > 0 ? 'processing' : 'default'}>
                号源 {metric.remain}/{metric.total}
              </Tag>
            ) : null}
          </div>
        </div>
      </div>

      <Paragraph className="result-card-mobile__message">{result.message || '暂无消息'}</Paragraph>

      {data ? (
        <details className="result-card-mobile__details">
          <summary>查看详情</summary>
          <div className="result-card-mobile__content">
            <DepartmentSummaryList departments={data.summary.departments} />
            <div className="doctor-card-list">
              {data.doctors.length > 0 ? (
                data.doctors.map((doctor) => <DoctorScheduleCard doctor={doctor} key={doctor.id} />)
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无医生详情" />
              )}
            </div>
          </div>
        </details>
      ) : null}
    </Card>
  );
};

const MonitorPanel: React.FC = () => {
  const [form] = Form.useForm();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isTablet = screens.md && !screens.xl;

  const [status, setStatus] = useState<MonitorStatus>({
    isRunning: false,
    startTime: null,
    endTime: null,
    lastCheckTime: null,
    nextCheckTime: null,
  });
  const [results, setResults] = useState<MonitorResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingDepartments, setSyncingDepartments] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);

  const fetchStatus = async () => {
    try {
      const statusData = await monitorApi.getStatus();
      setStatus(statusData);
    } catch {
      message.error('获取状态失败');
    }
  };

  const fetchResults = async () => {
    try {
      const resultsData = await monitorApi.getResults();
      setResults(resultsData);
    } catch {
      message.error('获取结果失败');
    }
  };

  const fetchConfig = async () => {
    try {
      const configData = await monitorApi.getConfig();
      if (configData.feishuWebhook) {
        form.setFieldsValue({ feishuWebhook: configData.feishuWebhook });
      }
      if (configData.departments) {
        setDepartments(configData.departments);
      }
    } catch {
      console.log('获取配置失败');
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchResults();
    fetchConfig();
    const interval = setInterval(() => {
      fetchStatus();
      fetchResults();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    try {
      const values = await form.validateFields();
      const startDate = values.timeRange[0].format('YYYY-MM-DD');
      const endDate = values.timeRange[1].format('YYYY-MM-DD');
      const config: ScheduleMonitorConfig = {
        startTime: startDate,
        endTime: endDate,
        interval: (values.interval || 0.5) * 60 * 1000,
        deptIds: values.deptIds || departments.map((department) => department.deptId),
        feishuWebhook: values.feishuWebhook,
      };
      setLoading(true);
      const response = await monitorApi.start(config);
      if (response.success) {
        message.success(response.message);
        fetchStatus();
      } else {
        message.error(response.message);
      }
    } catch {
      message.error('启动失败，请检查配置');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const response = await monitorApi.stop();
      if (response.success) {
        message.success(response.message);
        fetchStatus();
      } else {
        message.error(response.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearResults = async () => {
    try {
      const response = await monitorApi.clearResults();
      if (response.success) {
        message.success(response.message);
        setResults([]);
      }
    } catch {
      message.error('清空失败');
    }
  };

  const handleSyncDepartments = async () => {
    setSyncingDepartments(true);
    try {
      const response = await monitorApi.syncDepartments();
      if (response.success) {
        setDepartments(response.departments);
        message.success(response.message);
      } else {
        message.error(response.message);
      }
    } catch {
      message.error('同步科室列表失败');
    } finally {
      setSyncingDepartments(false);
    }
  };

  const resultColumns: ColumnsType<MonitorResult> = useMemo(
    () => [
      {
        title: '时间',
        dataIndex: 'timestamp',
        key: 'timestamp',
        width: 220,
        render: (text: string) => <Text>{formatDateTime(text)}</Text>,
      },
      {
        title: '状态',
        dataIndex: 'success',
        key: 'success',
        width: 96,
        render: (success: boolean) => <Tag color={success ? 'success' : 'error'}>{success ? '成功' : '失败'}</Tag>,
      },
      {
        title: '剩余号源',
        key: 'remainNumber',
        width: 120,
        render: (_value, record) => {
          const data = getResultData(record);
          if (!data) {
            return <Text type="secondary">-</Text>;
          }

          return (
            <Text className={`metric-text metric-text--${getMetricTone(data.summary.totalRemain)}`}>
              {data.summary.totalRemain}/{data.summary.totalNumber}
            </Text>
          );
        },
      },
      {
        title: '消息',
        dataIndex: 'message',
        key: 'message',
        render: (value: string) => <div className="table-message-cell">{value || '-'}</div>,
      },
    ],
    []
  );

  const expandedRowRender = (record: MonitorResult) => {
    const data = getResultData(record);
    if (!data) {
      return null;
    }

    const doctorColumns: ColumnsType<DoctorDetail> = [
      { title: '医生', dataIndex: 'name', key: 'name', width: 100 },
      { title: '职称', dataIndex: 'title', key: 'title', width: 120 },
      { title: '门诊', dataIndex: 'deptName', key: 'deptName', width: 180 },
      { title: '日期', dataIndex: 'date', key: 'date', width: 120 },
      {
        title: '剩余/总数',
        key: 'numbers',
        width: 110,
        render: (_value, doctor) => (
          <Text className={`metric-text metric-text--${getMetricTone(doctor.remainNumber)}`}>
            {doctor.remainNumber}/{doctor.totalNumber}
          </Text>
        ),
      },
    ];

    const expandedDoctorRender = (doctor: DoctorDetail) => {
      const allTimeSlots = doctor.schedules.flatMap((schedule) =>
        schedule.timeSlots.map((slot) => ({
          period: schedule.period,
          room: schedule.room,
          ...slot,
        }))
      );

      const timeSlotColumns: ColumnsType<(TimeSlotDetail & { period: string; room: string })> = [
        { title: '时段', dataIndex: 'period', key: 'period', width: 80 },
        { title: '诊室', dataIndex: 'room', key: 'room', width: 100 },
        { title: '开始时间', dataIndex: 'beginTime', key: 'beginTime', width: 140 },
        { title: '结束时间', dataIndex: 'endTime', key: 'endTime', width: 140 },
        {
          title: '剩余/总数',
          key: 'numbers',
          width: 110,
          render: (_value, slot) => (
            <Text className={`metric-text metric-text--${getMetricTone(slot.remainNumber)}`}>
              {slot.remainNumber}/{slot.totalNumber}
            </Text>
          ),
        },
      ];

      return (
        <Table
          className="inner-table"
          dataSource={allTimeSlots}
          columns={timeSlotColumns}
          pagination={false}
          size="small"
          rowKey={(item) => `${item.period}-${item.beginTime}-${item.room}`}
          scroll={{ x: 620 }}
        />
      );
    };

    return (
      <div className="expanded-panel">
        <DepartmentSummaryList departments={data.summary.departments} />
        <Table
          className="inner-table"
          dataSource={data.doctors}
          columns={doctorColumns}
          pagination={false}
          size="small"
          rowKey="id"
          expandable={{
            expandedRowRender: expandedDoctorRender,
            rowExpandable: (doctor) => doctor.schedules.length > 0,
          }}
          scroll={{ x: 760 }}
        />
      </div>
    );
  };

  const selectedDepartmentCount = Form.useWatch('deptIds', form)?.length || 0;
  const resultSummary = useMemo(() => {
    return results.reduce(
      (summary, result) => {
        if (result.success) {
          summary.successCount += 1;
        } else {
          summary.failureCount += 1;
        }

        const data = getResultData(result);
        if (data) {
          summary.totalRemain += data.summary.totalRemain;
        }

        return summary;
      },
      { successCount: 0, failureCount: 0, totalRemain: 0 }
    );
  }, [results]);

  return (
    <div className="monitor-page">
      <div className="monitor-page__hero">
        <div className="monitor-page__hero-copy">
          <Text className="eyebrow">医院号源监控</Text>
          <Title className="monitor-page__title">排班监听面板</Title>
          <Paragraph className="monitor-page__subtitle">
            为桌面与移动端重新整理监控流程，配置、状态和结果在一个界面内完成，查看更快，触达更稳。
          </Paragraph>
        </div>
        <div className="monitor-page__hero-meta">
          <Text>已配置门诊 {departments.length} 个</Text>
          <Text>已选门诊 {selectedDepartmentCount || departments.length || 0} 个</Text>
          <Text>结果记录 {results.length} 条</Text>
        </div>
      </div>

      <section className="monitor-section">
        <div className="section-heading">
          <div>
            <Text className="section-heading__eyebrow">Overview</Text>
            <Title level={4} className="section-heading__title">
              监控状态总览
            </Title>
          </div>
        </div>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <SummaryStatCard
              label="运行状态"
              value={status.isRunning ? '运行中' : '已停止'}
              hint={status.isRunning ? '监听任务正在执行轮询' : '当前没有活动任务'}
              accent={status.isRunning ? 'success' : 'danger'}
              icon={<NotificationOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <SummaryStatCard
              label="监听时间范围"
              value={
                status.startTime && status.endTime
                  ? `${dayjs(status.startTime).format('MM-DD')} 至 ${dayjs(status.endTime).format('MM-DD')}`
                  : '-'
              }
              hint={`起始 ${formatDateTime(status.startTime, 'YYYY-MM-DD')}`}
              icon={<CalendarOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <SummaryStatCard
              label="下次检查"
              value={formatDateTime(status.nextCheckTime, 'HH:mm:ss')}
              hint={`上次检查 ${formatDateTime(status.lastCheckTime, 'HH:mm:ss')}`}
              icon={<ClockCircleOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <SummaryStatCard
              label="结果概览"
              value={`${resultSummary.totalRemain} 个剩余号源`}
              hint={`成功 ${resultSummary.successCount} / 失败 ${resultSummary.failureCount}`}
              accent={resultSummary.totalRemain > 0 ? 'success' : 'neutral'}
              icon={<ReloadOutlined />}
            />
          </Col>
        </Row>
      </section>

      <section className="monitor-section">
        <div className="section-heading">
          <div>
            <Text className="section-heading__eyebrow">Config</Text>
            <Title level={4} className="section-heading__title">
              监听配置
            </Title>
          </div>
          <Text className="section-heading__meta">
            {status.isRunning ? '运行中将锁定配置项，避免中途变更。' : '建议至少选择一个门诊；轮询频率最低支持 30 秒。'}
          </Text>
        </div>

        <Card className="panel-card" bordered={false}>
          <Form form={form} layout="vertical">
            <Row gutter={[16, 8]}>
              <Col xs={24} md={12} xl={10}>
                <Form.Item
                  name="timeRange"
                  label="监听时间范围"
                  rules={[{ required: true, message: '请选择时间范围' }]}
                >
                  <RangePicker
                    className="full-width-control"
                    showTime
                    format="YYYY-MM-DD HH:mm:ss"
                    disabled={status.isRunning}
                    size={isMobile ? 'large' : 'middle'}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8} xl={4}>
                <Form.Item
                  name="interval"
                  label="轮询频率"
                  initialValue={0.5}
                  extra="输入 0.5 表示 30 秒，1 表示 1 分钟。"
                  rules={[{ required: true, message: '请输入轮询频率' }]}
                >
                  <InputNumber
                    className="full-width-control"
                    min={0.5}
                    max={60}
                    step={0.5}
                    controls={false}
                    disabled={status.isRunning}
                    size={isMobile ? 'large' : 'middle'}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} xl={10}>
                <Form.Item
                  name="deptIds"
                  label="监听门诊"
                  rules={[{ required: true, message: '请选择至少一个门诊' }]}
                >
                  <Select
                    className="full-width-control"
                    mode="multiple"
                    placeholder="请选择监听门诊"
                    disabled={status.isRunning}
                    allowClear
                    size={isMobile ? 'large' : 'middle'}
                    options={departments.map((department) => ({
                      label: department.name,
                      value: department.deptId,
                    }))}
                    maxTagCount={isMobile ? 1 : isTablet ? 2 : 3}
                  />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item
                  name="feishuWebhook"
                  label="飞书通知地址"
                  extra="可选，填写飞书机器人 Webhook 地址"
                >
                  <Input
                    className="full-width-control"
                    placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
                    disabled={status.isRunning}
                    size={isMobile ? 'large' : 'middle'}
                  />
                </Form.Item>
              </Col>
            </Row>

            <div className={`action-bar ${isMobile ? 'action-bar--mobile' : ''}`}>
              <Space wrap size={[12, 12]} className="action-bar__actions">
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleStart}
                  loading={loading}
                  disabled={status.isRunning}
                  size={isMobile ? 'large' : 'middle'}
                >
                  启动监听
                </Button>
                <Button
                  danger
                  icon={<StopOutlined />}
                  onClick={handleStop}
                  loading={loading}
                  disabled={!status.isRunning}
                  size={isMobile ? 'large' : 'middle'}
                >
                  停止监听
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleSyncDepartments}
                  loading={syncingDepartments}
                  disabled={status.isRunning}
                  size={isMobile ? 'large' : 'middle'}
                >
                  同步科室列表
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    fetchStatus();
                    fetchResults();
                    fetchConfig();
                  }}
                  size={isMobile ? 'large' : 'middle'}
                >
                  刷新状态
                </Button>
              </Space>
            </div>
          </Form>
        </Card>
      </section>

      <section className="monitor-section">
        <div className="section-heading section-heading--results">
          <div>
            <Text className="section-heading__eyebrow">Results</Text>
            <Title level={4} className="section-heading__title">
              监听结果
            </Title>
          </div>
          <Button icon={<ClearOutlined />} onClick={handleClearResults} size={isMobile ? 'middle' : 'small'}>
            清空结果
          </Button>
        </div>

        {results.length === 0 ? (
          <Card className="panel-card panel-card--empty" bordered={false}>
            <Empty description="暂无监听结果，启动监听后将在这里展示最新记录" />
          </Card>
        ) : isMobile ? (
          <div className="result-card-list">
            {results.map((result) => (
              <MobileResultCard key={result.timestamp} result={result} />
            ))}
          </div>
        ) : (
          <Card className="panel-card" bordered={false}>
            <Table
              className="results-table"
              dataSource={results}
              columns={resultColumns}
              rowKey="timestamp"
              pagination={{ pageSize: 10 }}
              expandable={{
                expandedRowRender,
                rowExpandable: (record) => !!getResultData(record),
              }}
              scroll={{ x: 920 }}
            />
          </Card>
        )}
      </section>
    </div>
  );
};

export default MonitorPanel;
