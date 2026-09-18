import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

const DEFAULT_PORT = 8080;

/**
 * Allow the configured web origin plus Vercel preview hostnames, which are
 * generated per deployment and so cannot be listed literally.
 */
function buildCorsOrigin(): (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void {
  const configured = (process.env.WEB_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const previewPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;

  return (origin, cb) => {
    if (!origin) return cb(null, true); // curl, same-origin, server-to-server
    if (configured.includes(origin)) return cb(null, true);
    if (previewPattern.test(origin)) return cb(null, true);
    cb(null, false);
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: buildCorsOrigin(), methods: ['GET', 'POST'] });
  await app.listen(process.env.PORT ?? DEFAULT_PORT);
}
await bootstrap();
