import { IsOptional, IsString } from 'class-validator';

// 打回：可附一句批注(为什么打回)。
export class RejectAnnotationDto {
  @IsOptional()
  @IsString()
  comment?: string;
}
