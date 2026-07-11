import { Module } from '@nestjs/common';
import { FormSchemaController } from './form-schema.controller';
import { FormSchemaService } from './form-schema.service';

// 组装本功能：一个 controller + 一个 service。
// PrismaService 来自 @Global 的 PrismaModule，无需在这里 imports；
// RolesGuard 以类形式传给 @UseGuards，Nest 会自动 DI 实例化，也无需注册。
@Module({
  controllers: [FormSchemaController],
  providers: [FormSchemaService],
})
export class FormSchemaModule {}
