import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { IEnrollment } from '../models/Enrollment.model';
import { ICourse } from '../models/Course.model';
import { IUser } from '../models/User.model';
import { IPayment } from '../models/Payment.model';

export class CertificateService {
  private certificatesDir: string;

  constructor() {
    this.certificatesDir = path.join(process.cwd(), 'certificates');
    // Create certificates directory if it doesn't exist
    if (!fs.existsSync(this.certificatesDir)) {
      fs.mkdirSync(this.certificatesDir, { recursive: true });
    }
  }

  // Generate enrollment certificate
  async generateEnrollmentCertificate(
    user: IUser,
    course: ICourse,
    payment: IPayment,
    enrollment: IEnrollment
  ): Promise<{ filePath: string; fileName: string }> {
    const fileName = `enrollment-certificate-${user._id}-${course._id}-${Date.now()}.pdf`;
    const filePath = path.join(this.certificatesDir, fileName);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Certificate styling
        const primaryColor = '#10b981'; // Green
        const secondaryColor = '#374151'; // Gray
        const accentColor = '#f59e0b'; // Amber

        // Header with logo area
        doc.rect(0, 0, doc.page.width, 120)
           .fill(primaryColor);

        doc.fontSize(32)
           .fillColor('white')
           .text('Learn Bangla to Deutsch', 50, 40, { align: 'center' });

        doc.fontSize(14)
           .text('German Language Learning Platform', 50, 80, { align: 'center' });

        // Certificate title
        doc.fillColor(primaryColor)
           .fontSize(28)
           .text('ENROLLMENT CERTIFICATE', 50, 160, { align: 'center' });

        // Decorative line
        doc.moveTo(150, 200)
           .lineTo(doc.page.width - 150, 200)
           .stroke(accentColor)
           .lineWidth(3);

        // Certificate content
        doc.fillColor(secondaryColor)
           .fontSize(16)
           .text('This is to certify that', 50, 250, { align: 'center' });

        doc.fontSize(24)
           .fillColor(primaryColor)
           .text((`${user.firstName} ${user.lastName}`).toUpperCase(), 50, 280, { align: 'center' });

        doc.fontSize(16)
           .fillColor(secondaryColor)
           .text('has successfully enrolled in', 50, 320, { align: 'center' });

        doc.fontSize(20)
           .fillColor(primaryColor)
           .text(`${course.title} (${course.level})`, 50, 350, { align: 'center' });

        // Course details box
        const detailsY = 400;
        doc.rect(100, detailsY, doc.page.width - 200, 120)
           .fillAndStroke('#f8fafc', '#e2e8f0')
           .lineWidth(1);

        doc.fontSize(12)
           .fillColor(secondaryColor)
           .text('Course Details:', 120, detailsY + 15);

        doc.text(`Instructor: ${course.instructor}`, 120, detailsY + 35);
        doc.text(`Duration: ${course.duration} weeks`, 120, detailsY + 50);
        doc.text(`Start Date: ${new Date(course.startDate).toLocaleDateString()}`, 120, detailsY + 65);
        doc.text(`Schedule: ${course.schedule.days.join(', ')} at ${course.schedule.time}`, 120, detailsY + 80);

        // Payment information
        const paymentY = 560;
        doc.fontSize(14)
           .fillColor(primaryColor)
           .text('Payment Confirmation', 50, paymentY);

        doc.fontSize(10)
           .fillColor(secondaryColor)
           .text(`Transaction ID: ${payment.transactionId}`, 50, paymentY + 20);
        doc.text(`Amount: ${payment.currency} ${payment.amount}`, 50, paymentY + 35);
        doc.text(`Payment Date: ${new Date(payment.paymentDate).toLocaleDateString()}`, 50, paymentY + 50);

        // Certificate number and date
        doc.fontSize(10)
           .text(`Certificate No: ENR-${enrollment._id}`, 300, paymentY + 20);
        doc.text(`Issue Date: ${new Date().toLocaleDateString()}`, 300, paymentY + 35);

        // Digital signature area
        doc.fontSize(12)
           .fillColor(primaryColor)
           .text('Digitally Generated Certificate', 50, 680, { align: 'center' });

        doc.fontSize(10)
           .fillColor(secondaryColor)
           .text('Learn Bangla to Deutsch - Making German Accessible for Bengali Speakers', 50, 700, { align: 'center' });
        doc.text('📧 support@learnbangla2deutsch.com | 🌐 www.learnbangla2deutsch.com', 50, 715, { align: 'center' });

        // Border
        doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
           .stroke(primaryColor)
           .lineWidth(2);

        // Inner decorative border
        doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
           .stroke(accentColor)
           .lineWidth(1);

        doc.end();

        stream.on('finish', () => {
          resolve({ filePath, fileName });
        });

        stream.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Generate course completion certificate
  async generateCompletionCertificate(
    user: IUser,
    course: ICourse,
    enrollment: IEnrollment
  ): Promise<{ filePath: string; fileName: string }> {
    const fileName = `completion-certificate-${user._id}-${course._id}-${Date.now()}.pdf`;
    const filePath = path.join(this.certificatesDir, fileName);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Certificate styling
        const primaryColor = '#3b82f6'; // Blue
        const secondaryColor = '#374151'; // Gray
        const accentColor = '#f59e0b'; // Amber

        // Header with logo area
        doc.rect(0, 0, doc.page.width, 120)
           .fill(primaryColor);

        doc.fontSize(32)
           .fillColor('white')
           .text('Learn Bangla to Deutsch', 50, 40, { align: 'center' });

        doc.fontSize(14)
           .text('German Language Learning Platform', 50, 80, { align: 'center' });

        // Certificate title
        doc.fillColor(primaryColor)
           .fontSize(28)
           .text('CERTIFICATE OF COMPLETION', 50, 160, { align: 'center' });

        // Decorative line
        doc.moveTo(150, 200)
           .lineTo(doc.page.width - 150, 200)
           .stroke(accentColor)
           .lineWidth(3);

        // Certificate content
        doc.fillColor(secondaryColor)
           .fontSize(16)
           .text('This is to certify that', 50, 250, { align: 'center' });

        doc.fontSize(24)
           .fillColor(primaryColor)
           .text((`${user.firstName} ${user.lastName}`).toUpperCase(), 50, 280, { align: 'center' });

        doc.fontSize(16)
           .fillColor(secondaryColor)
           .text('has successfully completed', 50, 320, { align: 'center' });

        doc.fontSize(20)
           .fillColor(primaryColor)
           .text(`${course.title} (${course.level})`, 50, 350, { align: 'center' });

        // Achievement details
        const achievementY = 400;
        doc.rect(100, achievementY, doc.page.width - 200, 140)
           .fillAndStroke('#f0f9ff', '#bfdbfe')
           .lineWidth(1);

        doc.fontSize(12)
           .fillColor(secondaryColor)
           .text('Course Achievement:', 120, achievementY + 15);

        doc.text(`German Language Level: ${course.level} (CEFR Standard)`, 120, achievementY + 35);
        doc.text(`Course Duration: ${course.duration} weeks`, 120, achievementY + 50);
        doc.text(`Completion Progress: ${enrollment.progress.percentage}%`, 120, achievementY + 65);
        doc.text(`Instructor: ${course.instructor}`, 120, achievementY + 80);
        doc.text(`Completion Date: ${new Date().toLocaleDateString()}`, 120, achievementY + 95);

        // Skills acquired
        if (course.features && course.features.length > 0) {
          doc.fontSize(10)
             .text('Skills Acquired: ' + course.features.slice(0, 3).join(', '), 120, achievementY + 115);
        }

        // Certificate footer
        doc.fontSize(12)
           .fillColor(primaryColor)
           .text('Authorized Digital Certificate', 50, 600, { align: 'center' });

        doc.fontSize(10)
           .fillColor(secondaryColor)
           .text(`Certificate ID: COMP-${enrollment._id}`, 50, 630);
        doc.text(`Issue Date: ${new Date().toLocaleDateString()}`, 300, 630);

        // Signature area
        doc.fontSize(12)
           .fillColor(primaryColor)
           .text('Learn Bangla to Deutsch - Certified German Language Training', 50, 680, { align: 'center' });

        doc.fontSize(10)
           .fillColor(secondaryColor)
           .text('📧 support@learnbangla2deutsch.com | 🌐 www.learnbangla2deutsch.com', 50, 700, { align: 'center' });

        // Border
        doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
           .stroke(primaryColor)
           .lineWidth(2);

        // Inner decorative border
        doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
           .stroke(accentColor)
           .lineWidth(1);

        doc.end();

        stream.on('finish', () => {
          resolve({ filePath, fileName });
        });

        stream.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Get certificate by file path
  getCertificate(fileName: string): string | null {
    const filePath = path.join(this.certificatesDir, fileName);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    return null;
  }

  // Delete certificate
  deleteCertificate(fileName: string): boolean {
    try {
      const filePath = path.join(this.certificatesDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting certificate:', error);
      return false;
    }
  }

  // List all certificates for a user
  getUserCertificates(userId: string): string[] {
    try {
      const files = fs.readdirSync(this.certificatesDir);
      return files.filter(file => file.includes(userId));
    } catch (error) {
      console.error('Error listing certificates:', error);
      return [];
    }
  }
}

export default new CertificateService();