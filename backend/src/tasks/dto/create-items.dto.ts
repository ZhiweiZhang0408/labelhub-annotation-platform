import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

const KINDS = ['image', 'text', 'audio', 'video'];

// 一条待标注数据。媒体用 url(base64 data URL)，文本用 text。
class ItemDto {
  @IsIn(KINDS)
  kind: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  url?: string; // 图/音/视：data URL(base64)

  @IsOptional()
  @IsString()
  text?: string; // 文本内容
}

// 批量上传：一次传一组数据项，各生成一条 Annotation(PENDING)。
export class CreateItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items: ItemDto[];
}
