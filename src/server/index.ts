import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { scheduleMonitorRouter } from './routes/scheduleMonitor';
import { monitorService } from './services/monitorService';

const app: Express = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/monitor', scheduleMonitorRouter);

const clientPath = path.join(__dirname, '../../client');
app.use(express.static(clientPath));

app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();

export { app };
