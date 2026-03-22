import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  DatePicker,
  Button,
  Space,
  message,
  Statistic,
  Row,
  Col,
  Table,
  Tag,
  Typography,
  Divider,
  InputNumber,
  Checkbox,
  Descriptions,
  Input,
} from 'antd';
import {
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { monitorApi } from '../api/monitor';
import { MonitorStatus, MonitorResult, ScheduleMonitorConfig, DEPARTMENTS } from '../types';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface DoctorDetail {
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
}

interface MonitorResultData {
  doctors: DoctorDetail[];
  summary: {
    totalRemain: number;
    totalNumber: number;
    departments: {
      name: string;
      doctors: number;
      remainNumber: number;
      totalNumber: number;
    }[];
  };
}

const MonitorPanel: React.FC = () => {
  const [form] = Form.useForm();
  const [status, setStatus] = useState<MonitorStatus>({
    isRunning: false,
    startTime: null,
    endTime: null,
    lastCheckTime: null,
    nextCheckTime: null,
  });
  const [results, setResults] = useState<MonitorResult[]>([]);
  const [loading, setLoading] = useState(false);

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
        interval: (values.interval || 1) * 60 * 1000,
        deptIds: values.deptIds || DEPARTMENTS.map(d => d.deptId),
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

  const columns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '状态',
      dataIndex: 'success',
      key: 'success',
      width: 80,
      render: (success: boolean) => (
        <Tag color={success ? 'success' : 'error'}>
          {success ? '成功' : '失败'}
        </Tag>
      ),
    },
    {
      title: '剩余号源',
      key: 'remainNumber',
      width: 100,
      render: (_: unknown, record: MonitorResult) => {
        if (!record.success || !record.data) return '-';
        const data = record.data as MonitorResultData;
        return (
          <Text strong style={{ color: data.summary.totalRemain > 0 ? '#3f8600' : '#cf1322' }}>
            {data.summary.totalRemain}/{data.summary.totalNumber}
          </Text>
        );
      },
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
    },
  ];

  const expandedRowRender = (record: MonitorResult) => {
    if (!record.success || !record.data) return null;
    const data = record.data as MonitorResultData;

    const doctorColumns = [
      { title: '医生', dataIndex: 'name', key: 'name', width: 100 },
      { title: '职称', dataIndex: 'title', key: 'title', width: 100 },
      { title: '门诊', dataIndex: 'deptName', key: 'deptName', width: 150 },
      { title: '日期', dataIndex: 'date', key: 'date', width: 120 },
      { 
        title: '剩余/总数', 
        key: 'numbers',
        width: 100,
        render: (_: unknown, doctor: DoctorDetail) => (
          <Text style={{ color: doctor.remainNumber > 0 ? '#3f8600' : '#999' }}>
            {doctor.remainNumber}/{doctor.totalNumber}
          </Text>
        )
      },
    ];

    const expandedDoctorRender = (doctor: DoctorDetail) => {
      const timeSlotColumns = [
        { title: '时段', dataIndex: 'period', key: 'period', width: 80 },
        { title: '诊室', dataIndex: 'room', key: 'room', width: 80 },
        { title: '开始时间', dataIndex: 'beginTime', key: 'beginTime', width: 150 },
        { title: '结束时间', dataIndex: 'endTime', key: 'endTime', width: 150 },
        { 
          title: '剩余/总数', 
          key: 'numbers',
          render: (_: unknown, slot: { remainNumber: number; totalNumber: number }) => (
            <Text style={{ color: slot.remainNumber > 0 ? '#3f8600' : '#999' }}>
              {slot.remainNumber}/{slot.totalNumber}
            </Text>
          )
        },
      ];

      const allTimeSlots = doctor.schedules.flatMap(schedule => 
        schedule.timeSlots.map(slot => ({
          period: schedule.period,
          room: schedule.room,
          ...slot
        }))
      );

      return (
        <Table
          dataSource={allTimeSlots}
          columns={timeSlotColumns}
          pagination={false}
          size="small"
          rowKey={(record) => `${record.period}-${record.beginTime}`}
        />
      );
    };

    return (
      <div style={{ padding: '12px' }}>
        <Descriptions bordered size="small" column={4} style={{ marginBottom: 16 }}>
          {data.summary.departments.map(dept => (
            <Descriptions.Item key={dept.name} label={dept.name}>
              <Text style={{ color: dept.remainNumber > 0 ? '#3f8600' : '#999' }}>
                {dept.remainNumber}/{dept.totalNumber} ({dept.doctors}位医生)
              </Text>
            </Descriptions.Item>
          ))}
        </Descriptions>
        
        <Table
          dataSource={data.doctors}
          columns={doctorColumns}
          pagination={false}
          size="small"
          rowKey="id"
          expandable={{
            expandedRowRender: expandedDoctorRender,
            rowExpandable: (doctor) => doctor.schedules.length > 0,
          }}
        />
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>医院排班系统监听服务</Title>
      <Divider />

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="监听配置" bordered={false}>
            <Form form={form} layout="inline">
              <Form.Item
                name="timeRange"
                label="监听时间范围"
                rules={[{ required: true, message: '请选择时间范围' }]}
              >
                <RangePicker
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  disabled={status.isRunning}
                />
              </Form.Item>
              <Form.Item
                name="interval"
                label="轮询频率(分钟)"
                initialValue={1}
                rules={[{ required: true, message: '请输入轮询频率' }]}
              >
                <InputNumber
                  min={1}
                  max={60}
                  step={1}
                  disabled={status.isRunning}
                  style={{ width: 100 }}
                />
              </Form.Item>
              <Form.Item
                name="deptIds"
                label="监听门诊"
                initialValue={DEPARTMENTS.map(d => d.deptId)}
              >
                <Checkbox.Group disabled={status.isRunning}>
                  {DEPARTMENTS.map(dept => (
                    <Checkbox key={dept.deptId} value={dept.deptId}>
                      {dept.name}
                    </Checkbox>
                  ))}
                </Checkbox.Group>
              </Form.Item>
              <Form.Item
                name="feishuWebhook"
                label="飞书通知地址"
                extra="可选，填写飞书机器人Webhook地址"
              >
                <Input
                  placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
                  disabled={status.isRunning}
                  style={{ width: 350 }}
                />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={handleStart}
                    loading={loading}
                    disabled={status.isRunning}
                  >
                    启动监听
                  </Button>
                  <Button
                    danger
                    icon={<StopOutlined />}
                    onClick={handleStop}
                    loading={loading}
                    disabled={!status.isRunning}
                  >
                    停止监听
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      fetchStatus();
                      fetchResults();
                    }}
                  >
                    刷新状态
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={24}>
          <Card title="监听状态" bordered={false}>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="运行状态"
                  value={status.isRunning ? '运行中' : '已停止'}
                  valueStyle={{
                    color: status.isRunning ? '#3f8600' : '#cf1322',
                  }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="起始时间"
                  value={
                    status.startTime
                      ? dayjs(status.startTime).format('YYYY-MM-DD HH:mm:ss')
                      : '-'
                  }
                  valueStyle={{ fontSize: '16px' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="结束时间"
                  value={
                    status.endTime
                      ? dayjs(status.endTime).format('YYYY-MM-DD HH:mm:ss')
                      : '-'
                  }
                  valueStyle={{ fontSize: '16px' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="下次检查"
                  value={
                    status.nextCheckTime
                      ? dayjs(status.nextCheckTime).format('HH:mm:ss')
                      : '-'
                  }
                  valueStyle={{ fontSize: '16px' }}
                />
              </Col>
            </Row>
            <Divider />
            <Row gutter={16}>
              <Col span={12}>
                <Text type="secondary">上次检查时间：</Text>
                <Text>
                  {status.lastCheckTime
                    ? dayjs(status.lastCheckTime).format('YYYY-MM-DD HH:mm:ss')
                    : '-'}
                </Text>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={24}>
          <Card
            title="监听结果"
            bordered={false}
            extra={
              <Button
                icon={<ClearOutlined />}
                onClick={handleClearResults}
                size="small"
              >
                清空结果
              </Button>
            }
          >
            <Table
              dataSource={results}
              columns={columns}
              rowKey="timestamp"
              pagination={{ pageSize: 10 }}
              size="small"
              expandable={{
                expandedRowRender,
                rowExpandable: (record) => !!(record.success && record.data),
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MonitorPanel;
