import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/db.js';

const port = Number(process.env.PORT) || 5000;
try {
  if (!process.env.COOKIE_SECRET || !process.env.JWT_SECRET) throw new Error('COOKIE_SECRET and JWT_SECRET are required');
  await connectDatabase();
  app.listen(port, () => console.log(`ETM API listening on ${port}`));
} catch (error) {
  console.error('Unable to start API:', error);
  process.exitCode = 1;
}
