import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// 建任务请求体。title 必填，description 可选。
export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;
}
