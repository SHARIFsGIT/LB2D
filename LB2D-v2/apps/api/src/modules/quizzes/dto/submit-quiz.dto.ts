import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsNotEmpty } from 'class-validator';

export class SubmitQuizDto {
  @ApiProperty({
    example: { 'question1_id': 'answer1', 'question2_id': 'answer2' },
    description: 'Map of question IDs to user answers',
  })
  @IsObject()
  @IsNotEmpty()
  answers: Record<string, any>;
}
