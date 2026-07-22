import { IsArray, IsString } from 'class-validator';

// 设置任务分配给哪些工人。
export class SetAssigneesDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}
