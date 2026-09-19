import 'dotenv/config';
import express from 'express';
import { router } from './routes.js';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use('/api', router);
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
});
const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Relay311 API listening on ${port}`));
