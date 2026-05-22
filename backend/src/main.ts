import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

const REQUIRED_ENV_VARS = [
  'WOMPI_PUBLIC_KEY',
  'WOMPI_PRIVATE_KEY',
  'WOMPI_INTEGRITY_SECRET',
  'EMAIL_USER',
  'EMAIL_PASS',
  'PAGOS_API_KEY',
  'PAGOS_WEBHOOK_SECRET',
];

async function bootstrap() {
  const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error(`[STARTUP ERROR] Variables de entorno faltantes: ${missing.join(', ')}`);
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [process.env.FRONTEND_URL ?? 'http://localhost:3000'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('API Módulo de Pagos')
    .setDescription('Documentación de la API REST del servicio de pagos, cupones y devoluciones')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT ?? 8080;
  await app.listen(port);
  console.log(`Servidor corriendo en puerto ${port}`);

  process.on('SIGTERM', async () => {
    console.log('SIGTERM recibido, apagando servidor...');
    await app.close();
    process.exit(0);
  });
}
bootstrap();