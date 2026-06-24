import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';

@Module({
  imports: [HealthModule], // ← 把 health 部门装进总公司
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
