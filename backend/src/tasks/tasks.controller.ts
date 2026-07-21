// ============================================================================
// TasksController —— 任务的最小路由
//   POST /tasks   建任务（仅 TASK_OWNER）
//   GET  /tasks   列出任务（任意登录用户）
// ============================================================================

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreateItemsDto } from './dto/create-items.dto';
import { TasksService } from './tasks.service';

// request.user 的形状（JwtStrategy.validate 的返回）
interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TASK_OWNER)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
    return this.tasks.create(user.id, dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  list() {
    return this.tasks.listAll();
  }

  // W3-2：上传数据 → 生成待标注项（仅负责人）
  @Post(':id/items')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TASK_OWNER)
  createItems(@Param('id') id: string, @Body() dto: CreateItemsDto) {
    return this.tasks.createItems(id, dto.items as unknown as Record<string, unknown>[]);
  }

  // W3-2：发布任务（仅负责人）
  @Post(':id/release')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TASK_OWNER)
  release(@Param('id') id: string) {
    return this.tasks.release(id);
  }
}
