import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilitamos CORS para que tu frontend (puerto 3000) pueda hablar con este backend
  app.enableCors(); 
  
  // Cambiamos el puerto al 4000 para que no pelee con Next.js
  await app.listen(process.env.PORT ?? 4000); 
}
bootstrap();