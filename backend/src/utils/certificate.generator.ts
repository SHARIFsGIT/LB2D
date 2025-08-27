import { Response } from 'express';
import PDFDocument from 'pdfkit';

export const generateCertificate = (
  res: Response,
  userData: {
    name: string;
    email: string;
    score: number;
    level: string;
    date: Date;
  }
) => {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 50
  });

  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=certificate-${userData.level}.pdf`);

  // Pipe to response
  doc.pipe(res);

  // Certificate border
  doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
     .lineWidth(3)
     .stroke('#667eea');

  // Title
  doc.fontSize(36)
     .font('Helvetica-Bold')
     .fillColor('#333')
     .text('CERTIFICATE OF ACHIEVEMENT', 0, 100, {
       align: 'center'
     });

  // Subtitle
  doc.fontSize(20)
     .font('Helvetica')
     .text('LEARN BANGLA TO DEUTSCH - German Language Assessment', 0, 160, {
       align: 'center'
     });

  // Main content
  doc.fontSize(16)
     .text('This is to certify that', 0, 220, {
       align: 'center'
     });

  // Name
  doc.fontSize(28)
     .font('Helvetica-Bold')
     .fillColor('#667eea')
     .text(userData.name, 0, 260, {
       align: 'center'
     });

  // Achievement
  doc.fontSize(16)
     .font('Helvetica')
     .fillColor('#333')
     .text('has successfully completed the assessment with', 0, 310, {
       align: 'center'
     });

  // Score and Level
  doc.fontSize(24)
     .font('Helvetica-Bold')
     .fillColor('#48bb78')
     .text(`Score: ${userData.score}% - Level: ${userData.level}`, 0, 350, {
       align: 'center'
     });

  // Date
  doc.fontSize(14)
     .font('Helvetica')
     .fillColor('#666')
     .text(`Date: ${userData.date.toLocaleDateString()}`, 0, 420, {
       align: 'center'
     });

  // Footer
  doc.fontSize(12)
     .text('Powered by LEARN BANGLA TO DEUTSCH Platform', 0, 500, {
       align: 'center'
     });

  doc.end();
};