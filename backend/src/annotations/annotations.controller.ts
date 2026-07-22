// ============================================================================
// AnnotationsController —— 标注员端路由
//   POST /tasks/:taskId/annotations/claim  领取下一条(仅 ANNOTATOR)
//   POST /annotations/:id/submit           提交标注(仅 ANNOTATOR，本人)
//   GET  /tasks/:taskId/progress           任务进度(任意登录用户)
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
import { Prisma, Role } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SubmitAnnotationDto } from './dto/submit-annotation.dto';
import { RejectAnnotationDto } from './dto/reject-annotation.dto';
import { AnnotationsService } from './annotations.service';

interface AuthUser {
  id: string;
}

@Controller()
export class AnnotationsController {
  constructor(private readonly annotations: AnnotationsService) {}

  @Post('tasks/:taskId/annotations/claim')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ANNOTATOR, Role.REVIEWER)
  claim(@Param('taskId') taskId: string, @CurrentUser() user: AuthUser) {
    return this.annotations.claimNext(taskId, user.id);
  }

  @Post('annotations/:id/submit')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ANNOTATOR, Role.REVIEWER)
  submit(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: SubmitAnnotationDto,
  ) {
    return this.annotations.submit(
      id,
      user.id,
      dto.result as unknown as Prisma.InputJsonValue,
    );
  }

  @Get('tasks/:taskId/progress')
  @UseGuards(AuthGuard('jwt'))
  progress(@Param('taskId') taskId: string) {
    return this.annotations.progress(taskId);
  }

  // ── 审核员 ──
  @Get('tasks/:taskId/review-queue')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ANNOTATOR, Role.REVIEWER)
  reviewQueue(@Param('taskId') taskId: string) {
    return this.annotations.reviewQueue(taskId);
  }

  @Post('annotations/:id/approve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ANNOTATOR, Role.REVIEWER)
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.annotations.approve(id, user.id);
  }

  @Post('annotations/:id/reject')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ANNOTATOR, Role.REVIEWER)
  reject(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: RejectAnnotationDto,
  ) {
    return this.annotations.reject(id, user.id, dto.comment);
  }
}
