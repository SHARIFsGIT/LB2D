import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CertificatesService } from './certificates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Certificates')
@Controller('certificates')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post('generate/:courseId')
  @ApiOperation({
    summary: 'Generate certificate',
    description: 'Generate certificate for completed course',
  })
  @ApiResponse({ status: 201, description: 'Certificate generated successfully' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  @ApiResponse({ status: 400, description: 'Course not completed' })
  async generateCertificate(
    @CurrentUser('userId') userId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.certificatesService.generateCertificate(userId, courseId);
  }

  @Get('my-certificates')
  @ApiOperation({
    summary: 'Get my certificates',
    description: 'Get all certificates earned by current user',
  })
  @ApiResponse({ status: 200, description: 'Certificates retrieved successfully' })
  async getMyCertificates(@CurrentUser('userId') userId: string) {
    return this.certificatesService.getMyCertificates(userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get certificate by ID',
    description: 'Get certificate details and download URL',
  })
  @ApiResponse({ status: 200, description: 'Certificate retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async getCertificate(@Param('id') id: string) {
    return this.certificatesService.getCertificate(id);
  }

  @Get('verify/:certificateId')
  @Public()
  @ApiOperation({
    summary: 'Verify certificate',
    description: 'Verify certificate authenticity by certificate ID',
  })
  @ApiResponse({ status: 200, description: 'Verification result' })
  async verifyCertificate(@Param('certificateId') certificateId: string) {
    return this.certificatesService.verifyCertificate(certificateId);
  }
}
