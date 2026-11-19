/**
 * Vercel Serverless Function Entry Point
 * Forwards all /api/* requests to our stateless Express application.
 */
import app from '../server/src/app.js';

export default app;
