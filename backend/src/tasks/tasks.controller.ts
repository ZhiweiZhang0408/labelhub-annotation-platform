// ============================================================================
// TasksController —— 任务的最小路由
//   POST /tasks   建任务（仅 TASK_OWNER）
//   GET  /tasks   列出任务（任意登录用户）
// ============================================================================

import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateTaskDto } from './dto/create-task.dto';
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
}
