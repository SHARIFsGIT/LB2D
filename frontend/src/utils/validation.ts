import { VALIDATION_RULES, REGEX_PATTERNS } from './constants';

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export class ValidationUtils {
  // Email validation
  static validateEmail(email: string): ValidationResult {
    if (!email || email.trim() === '') {
      return { isValid: false, error: 'Email is required' };
    }

    if (email.length > VALIDATION_RULES.EMAIL.MAX_LENGTH) {
      return { isValid: false, error: `Email must not exceed ${VALIDATION_RULES.EMAIL.MAX_LENGTH} characters` };
    }

    if (!REGEX_PATTERNS.EMAIL.test(email)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }

    return { isValid: true };
  }

  // Password validation
  static validatePassword(password: string): ValidationResult {
    if (!password) {
      return { isValid: false, error: 'Password is required' };
    }

    const rules = VALIDATION_RULES.PASSWORD;

    if (password.length < rules.MIN_LENGTH) {
      return { isValid: false, error: `Password must be at least ${rules.MIN_LENGTH} characters long` };
    }

    if (password.length > rules.MAX_LENGTH) {
      return { isValid: false, error: `Password must not exceed ${rules.MAX_LENGTH} characters` };
    }

    if (rules.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one lowercase letter' };
    }

    if (rules.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one uppercase letter' };
    }

    if (rules.REQUIRE_NUMBERS && !/\d/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one number' };
    }

    if (rules.REQUIRE_SPECIAL_CHARS && !/[@$!%*?&]/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one special character (@$!%*?&)' };
    }

    return { isValid: true };
  }

  // Name validation
  static validateName(name: string, fieldName: string = 'Name'): ValidationResult {
    if (!name || name.trim() === '') {
      return { isValid: false, error: `${fieldName} is required` };
    }

    const trimmedName = name.trim();

    if (trimmedName.length < VALIDATION_RULES.NAME.MIN_LENGTH) {
      return { isValid: false, error: `${fieldName} must be at least ${VALIDATION_RULES.NAME.MIN_LENGTH} characters long` };
    }

    if (trimmedName.length > VALIDATION_RULES.NAME.MAX_LENGTH) {
      return { isValid: false, error: `${fieldName} must not exceed ${VALIDATION_RULES.NAME.MAX_LENGTH} characters` };
    }

    // Check for valid characters (letters, spaces, hyphens, apostrophes)
    if (!/^[a-zA-Z\s\-']+$/.test(trimmedName)) {
      return { isValid: false, error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` };
    }

    return { isValid: true };
  }

  // Phone validation
  static validatePhone(phone: string): ValidationResult {
    if (!phone) {
      return { isValid: true }; // Phone is optional
    }

    const cleanPhone = phone.replace(/\s/g, '');

    if (cleanPhone.length < VALIDATION_RULES.PHONE.MIN_LENGTH) {
      return { isValid: false, error: `Phone number must be at least ${VALIDATION_RULES.PHONE.MIN_LENGTH} digits` };
    }

    if (cleanPhone.length > VALIDATION_RULES.PHONE.MAX_LENGTH) {
      return { isValid: false, error: `Phone number must not exceed ${VALIDATION_RULES.PHONE.MAX_LENGTH} digits` };
    }

    if (!REGEX_PATTERNS.PHONE.test(phone)) {
      return { isValid: false, error: 'Please enter a valid phone number' };
    }

    return { isValid: true };
  }

  // Required field validation
  static validateRequired(value: any, fieldName: string): ValidationResult {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
      return { isValid: false, error: `${fieldName} is required` };
    }

    return { isValid: true };
  }

  // String length validation
  static validateLength(value: string, minLength: number, maxLength: number, fieldName: string): ValidationResult {
    if (!value) {
      return { isValid: false, error: `${fieldName} is required` };
    }

    if (value.length < minLength) {
      return { isValid: false, error: `${fieldName} must be at least ${minLength} characters long` };
    }

    if (value.length > maxLength) {
      return { isValid: false, error: `${fieldName} must not exceed ${maxLength} characters` };
    }

    return { isValid: true };
  }

  // Confirm password validation
  static validateConfirmPassword(password: string, confirmPassword: string): ValidationResult {
    if (!confirmPassword) {
      return { isValid: false, error: 'Please confirm your password' };
    }

    if (password !== confirmPassword) {
      return { isValid: false, error: 'Passwords do not match' };
    }

    return { isValid: true };
  }

  // File validation
  static validateFile(file: File, maxSize: number, allowedTypes: string[]): ValidationResult {
    if (!file) {
      return { isValid: false, error: 'Please select a file' };
    }

    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return { isValid: false, error: `File size must not exceed ${maxSizeMB}MB` };
    }

    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'File type is not supported' };
    }

    return { isValid: true };
  }

  // URL validation
  static validateURL(url: string, fieldName: string = 'URL'): ValidationResult {
    if (!url || url.trim() === '') {
      return { isValid: false, error: `${fieldName} is required` };
    }

    try {
      new URL(url);
      return { isValid: true };
    } catch {
      return { isValid: false, error: `Please enter a valid ${fieldName.toLowerCase()}` };
    }
  }

  // Number validation
  static validateNumber(value: any, fieldName: string, min?: number, max?: number): ValidationResult {
    if (value === null || value === undefined || value === '') {
      return { isValid: false, error: `${fieldName} is required` };
    }

    const numValue = Number(value);

    if (isNaN(numValue)) {
      return { isValid: false, error: `${fieldName} must be a valid number` };
    }

    if (min !== undefined && numValue < min) {
      return { isValid: false, error: `${fieldName} must be at least ${min}` };
    }

    if (max !== undefined && numValue > max) {
      return { isValid: false, error: `${fieldName} must not exceed ${max}` };
    }

    return { isValid: true };
  }

  // Date validation
  static validateDate(date: string | Date, fieldName: string = 'Date'): ValidationResult {
    if (!date) {
      return { isValid: false, error: `${fieldName} is required` };
    }

    const dateObj = new Date(date);

    if (isNaN(dateObj.getTime())) {
      return { isValid: false, error: `Please enter a valid ${fieldName.toLowerCase()}` };
    }

    return { isValid: true };
  }

  // Future date validation
  static validateFutureDate(date: string | Date, fieldName: string = 'Date'): ValidationResult {
    const dateValidation = this.validateDate(date, fieldName);
    if (!dateValidation.isValid) {
      return dateValidation;
    }

    const dateObj = new Date(date);
    const now = new Date();

    if (dateObj <= now) {
      return { isValid: false, error: `${fieldName} must be in the future` };
    }

    return { isValid: true };
  }

  // Past date validation
  static validatePastDate(date: string | Date, fieldName: string = 'Date'): ValidationResult {
    const dateValidation = this.validateDate(date, fieldName);
    if (!dateValidation.isValid) {
      return dateValidation;
    }

    const dateObj = new Date(date);
    const now = new Date();

    if (dateObj >= now) {
      return { isValid: false, error: `${fieldName} must be in the past` };
    }

    return { isValid: true };
  }

  // Age validation (18+ years)
  static validateAge(birthDate: string | Date, minAge: number = 18): ValidationResult {
    const dateValidation = this.validatePastDate(birthDate, 'Birth date');
    if (!dateValidation.isValid) {
      return dateValidation;
    }

    const birthDateObj = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
      if (age - 1 < minAge) {
        return { isValid: false, error: `You must be at least ${minAge} years old` };
      }
    } else {
      if (age < minAge) {
        return { isValid: false, error: `You must be at least ${minAge} years old` };
      }
    }

    return { isValid: true };
  }

  // Validate multiple fields
  static validateForm(validations: Array<() => ValidationResult>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const validation of validations) {
      const result = validation();
      if (!result.isValid && result.error) {
        errors.push(result.error);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default ValidationUtils;