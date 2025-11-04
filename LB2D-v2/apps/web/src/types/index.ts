// Common type definitions for the application

export interface Course {
  id: string;
  title: string;
  description: string;
  level: string;
  price: number;
  // Add other course fields as needed
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
  profilePhoto?: string;
  isEmailVerified: boolean;
}

// Re-export for compatibility
export type { User as UserType };

// SEO Props
export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  canonicalUrl?: string;
}

// Add createdAt and isActive to User interface
declare module '@/store/authStore' {
  interface User {
    createdAt?: string;
    isActive?: boolean;
  }
}
