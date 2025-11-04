import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

enum ActivityTypeForPoints {
  VIDEO_WATCHED = 'VIDEO_WATCHED',
  QUIZ_PASSED = 'QUIZ_PASSED',
  COURSE_COMPLETED = 'COURSE_COMPLETED',
  DISCUSSION_POSTED = 'DISCUSSION_POSTED',
  REVIEW_POSTED = 'REVIEW_POSTED',
}

export class LogActivityDto {
  @ApiProperty({ description: 'Activity type', enum: ActivityTypeForPoints })
  @IsEnum(ActivityTypeForPoints)
  activityType: ActivityTypeForPoints;

  @ApiProperty({ description: 'Entity ID', example: 'clx123' })
  @IsNotEmpty()
  @IsString()
  entityId: string;
}
