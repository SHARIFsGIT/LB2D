import { Router } from 'express';
import {
  sendContactForm,
  getContactInfo
} from '../controllers/contact.controller';

const router = Router();

// Public routes
router.post('/send', sendContactForm);
router.get('/info', getContactInfo);

export default router;