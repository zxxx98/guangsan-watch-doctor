import React from 'react';
import { Layout } from 'antd';
import MonitorPanel from './components/MonitorPanel';

const { Content } = Layout;

const App: React.FC = () => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content>
        <MonitorPanel />
      </Content>
    </Layout>
  );
};

export default App;
