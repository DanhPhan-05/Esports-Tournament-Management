import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import passport from './config/passport.js';
import { issueCsrfToken, requireCsrf } from './middlewares/csrf.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(passport.initialize());
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/csrf', issueCsrfToken);
app.use('/api', requireCsrf);
app.use(notFound);
app.use(errorHandler);

export default app;
