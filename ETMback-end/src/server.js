import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/db.js';

const port = Number(process.env.PORT) || 5000;
try {
  await connectDatabase();
  app.listen(port, () => console.log(`ETM API listening on ${port}`));
} catch (error) {
  console.error('Unable to start API:', error);
  process.exitCode = 1;
}
