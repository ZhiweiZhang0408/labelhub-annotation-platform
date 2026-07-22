// 列出可分配的"工人"(标注/审核岗位)，供 owner 分配任务时挑人。
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('workers')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TASK_OWNER)
  workers() {
    return this.prisma.user.findMany({
      where: { role: { in: [Role.ANNOTATOR, Role.REVIEWER] } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
  }
}
