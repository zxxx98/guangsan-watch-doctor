import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { scheduleMonitorRouter } from './routes/scheduleMonitor';
import { monitorService } from './services/monitorService';

const app: Express = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/monitor', scheduleMonitorRouter);

const possiblePaths = [
  path.join(__dirname, 'client'),
  path.join(__dirname, '../client'),
  path.join(__dirname, '../../client'),
];

const clientPath = possiblePaths.find(p => fs.existsSync(path.join(p, 'index.html')));

if (clientPath) {
  app.use(express.static(clientPath));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });
} else {
  console.warn('Client directory not found, static files will not be served');
}

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();

export { app };
