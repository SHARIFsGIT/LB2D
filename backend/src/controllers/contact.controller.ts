import { NextFunction, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.middleware';
import emailService from '../services/email.service';

// Handle contact form submission
export const sendContactForm = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  const { name, email, subject, message } = req.body;

  // Validate required fields
  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address'
    });
  }

  // Validate message length
  if (message.length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Message must be at least 10 characters long'
    });
  }

  if (message.length > 2000) {
    return res.status(400).json({
      success: false,
      message: 'Message must be less than 2000 characters'
    });
  }

  try {
    // Send email to admin
    await emailService.sendContactFormEmail({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim()
    });

    return res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully! We will get back to you soon.'
    });
  } catch (error: any) {
    console.error('Failed to send contact form email:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later or contact us directly.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get contact information
export const getContactInfo = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  return res.status(200).json({
    success: true,
    data: {
      email: 'learnbangla2deutsch@gmail.com',
      phone: '+880-XXX-XXXXXX',
      whatsapp: '+880-XXX-XXXXXX',
      website: 'www.learnbangla2deutsch.com',
      address: 'Dhaka, Bangladesh',
      officeHours: {
        bangladesh: {
          weekdays: '9:00 AM - 9:00 PM',
          saturday: '10:00 AM - 6:00 PM',
          sunday: '2:00 PM - 8:00 PM'
        },
        germany: {
          weekdays: '5:00 AM - 5:00 PM',
          saturday: '6:00 AM - 2:00 PM',
          sunday: '10:00 AM - 4:00 PM'
        }
      }
    }
  });
});