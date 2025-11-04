import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { StorageService } from '@/common/storage/storage.service';
import { EmailService } from '@/common/email/email.service';
import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CertificatesService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private emailService: EmailService,
  ) {}

  /**
   * Generate certificate for completed course
   */
  async generateCertificate(userId: string, courseId: string) {
    // Check enrollment and completion
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        course: {
          select: {
            title: true,
            level: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    if (enrollment.status !== 'COMPLETED' && enrollment.progress < 100) {
      throw new BadRequestException('Course not completed yet');
    }

    // Check if certificate already exists
    const existingCertificate = await this.prisma.certificate.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existingCertificate) {
      return {
        message: 'Certificate already issued',
        certificate: existingCertificate,
      };
    }

    // Generate unique certificate ID
    const certificateId = `LB2D-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Generate PDF
    const pdfBuffer = await this.generatePDF(
      `${enrollment.user.firstName} ${enrollment.user.lastName}`,
      enrollment.course.title,
      enrollment.completedAt || new Date(),
      certificateId,
    );

    // Upload PDF to storage
    const fileUrl = await this.uploadPDF(
      pdfBuffer,
      `certificates/${userId}/${courseId}.pdf`,
    );

    // Create certificate record
    const certificate = await this.prisma.certificate.create({
      data: {
        userId,
        courseId,
        certificateId,
        fileUrl,
        studentName: `${enrollment.user.firstName} ${enrollment.user.lastName}`,
        courseName: enrollment.course.title,
        completionDate: enrollment.completedAt || new Date(),
      },
    });

    // Send certificate email (async, non-blocking)
    this.emailService.sendCertificateEmail(
      enrollment.user.email,
      enrollment.user.firstName,
      enrollment.course.title,
      certificateId,
      fileUrl,
    ).catch(err => console.error('Failed to send certificate email:', err));

    return {
      message: 'Certificate generated successfully',
      certificate,
    };
  }

  /**
   * Get user's certificates
   */
  async getMyCertificates(userId: string) {
    const certificates = await this.prisma.certificate.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            level: true,
          },
        },
      },
      orderBy: {
        issuedAt: 'desc',
      },
    });

    return { certificates };
  }

  /**
   * Get certificate by ID
   */
  async getCertificate(id: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        course: {
          select: {
            title: true,
            level: true,
          },
        },
      },
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    return { certificate };
  }

  /**
   * Verify certificate by certificate ID
   */
  async verifyCertificate(certificateId: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { certificateId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        course: {
          select: {
            title: true,
            level: true,
          },
        },
      },
    });

    if (!certificate) {
      return {
        valid: false,
        message: 'Certificate not found',
      };
    }

    return {
      valid: true,
      message: 'Certificate is valid',
      certificate: {
        certificateId: certificate.certificateId,
        studentName: certificate.studentName,
        courseName: certificate.courseName,
        completionDate: certificate.completionDate,
        issuedAt: certificate.issuedAt,
      },
    };
  }

  /**
   * Generate PDF certificate
   */
  private async generatePDF(
    studentName: string,
    courseName: string,
    completionDate: Date,
    certificateId: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 50, bottom: 50, left: 72, right: 72 },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header with gradient background effect
      doc.rect(0, 0, doc.page.width, 200).fill('#10b981');
      doc.rect(0, 0, doc.page.width, 200).fillOpacity(0.1).fill('#f59e0b');

      // Title
      doc
        .fontSize(48)
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .text('Certificate of Completion', 0, 80, {
          align: 'center',
        });

      // Subtitle
      doc
        .fontSize(20)
        .fillColor('#ffffff')
        .font('Helvetica')
        .text('Learn Bangla to Deutsch', 0, 140, {
          align: 'center',
        });

      // Certificate content
      doc.fillColor('#000000');

      doc
        .fontSize(16)
        .font('Helvetica')
        .text('This is to certify that', 0, 250, {
          align: 'center',
        });

      doc
        .fontSize(36)
        .font('Helvetica-Bold')
        .text(studentName, 0, 290, {
          align: 'center',
        });

      doc
        .fontSize(16)
        .font('Helvetica')
        .text('has successfully completed the course', 0, 350, {
          align: 'center',
        });

      doc
        .fontSize(28)
        .font('Helvetica-Bold')
        .fillColor('#10b981')
        .text(courseName, 0, 390, {
          align: 'center',
        });

      doc.fillColor('#000000');

      doc
        .fontSize(14)
        .font('Helvetica')
        .text(
          `Date of Completion: ${completionDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}`,
          0,
          460,
          {
            align: 'center',
          },
        );

      // Certificate ID
      doc
        .fontSize(10)
        .fillColor('#6b7280')
        .text(`Certificate ID: ${certificateId}`, 0, 520, {
          align: 'center',
        });

      // Footer
      doc
        .fontSize(10)
        .fillColor('#6b7280')
        .text('Verify at: https://lb2d.com/verify-certificate', 0, 545, {
          align: 'center',
        });

      doc.end();
    });
  }

  /**
   * Upload PDF to storage
   */
  private async uploadPDF(buffer: Buffer, key: string): Promise<string> {
    // Create a mock file object for the storage service
    const file = {
      buffer,
      originalname: key.split('/').pop() || 'certificate.pdf',
      mimetype: 'application/pdf',
    } as Express.Multer.File;

    return this.storageService.uploadFile(file, key.split('/').slice(0, -1).join('/'));
  }
}
