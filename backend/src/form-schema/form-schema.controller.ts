// ============================================================================
// FormSchemaController —— 表单 Schema 的两个 REST 路由
// ----------------------------------------------------------------------------
// 路由挂在 /tasks/:taskId/form-schema 下，语义上"表单是任务的子资源"。
//   PUT  /tasks/:taskId/form-schema  存/更新（幂等，故用 PUT 不用 POST）
//   GET  /tasks/:taskId/form-schema  读回
// ============================================================================

import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UpsertFormSchemaDto } from './dto/upsert-form-schema.dto';
import { FormSchemaService } from './form-schema.service';

@Controller('tasks/:taskId/form-schema')
export class FormSchemaController {
  constructor(private readonly formSchema: FormSchemaService) {}

  // 存/更新：先过 JWT 认证拿到 user，再由 RolesGuard 限定只有任务负责人可写。
  // 注：这里只做"角色"级别的门禁；"只有【这个任务的】owner 才能改"这种
  // 资源归属校验属于 W3 工作流，届时再补。
  @Put()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TASK_OWNER)
  upsert(
    @Param('taskId') taskId: string,
    @Body() dto: UpsertFormSchemaDto,
  ) {
    return this.formSchema.upsert(taskId, dto);
  }

  // 读：标注员要读它来渲染表单，故任意登录用户皆可，只需 JWT。
  @Get()
  @UseGuards(AuthGuard('jwt'))
  get(@Param('taskId') taskId: string) {
    return this.formSchema.get(taskId);
  }
}
