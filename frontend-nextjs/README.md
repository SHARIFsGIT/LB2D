# LB2D Frontend - Next.js 14 Migration

## 🎯 Overview

This is the **next-generation frontend** for Learn Bangla to Deutsch (LB2D), built with modern technologies and enterprise-grade architecture. This migration transforms the application into a **100% SEO-optimized, performant, and professional** e-learning platform.

## ⚡ Tech Stack

### Core Framework
- **Next.js 14** - App Router with Server Components
- **React 18** - Latest features including Suspense & Streaming
- **TypeScript 5** - Strict mode for maximum type safety

### UI & Styling
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **Radix UI** - Headless, accessible UI primitives
- **shadcn/ui** - Beautiful, customizable components
- **Framer Motion** - Smooth animations
- **Lucide React** - Modern icon library

### State Management
- **Redux Toolkit** - Global state management
- **Redux Persist** - State persistence
- **Zustand** (ready) - Lightweight state alternative
- **React Query** (ready) - Server state management

### Form & Validation
- **React Hook Form** - Performant form handling
- **Zod** - TypeScript-first schema validation

### API & HTTP
- **Axios** - HTTP client with interceptors
- **Custom API Client** - Retry logic, error handling, token refresh

### SEO & Performance
- **next-seo** - SEO optimization
- **next-sitemap** - Automatic sitemap generation
- **Sharp** - Image optimization
- **JSON-LD** - Structured data for search engines

### Security
- **DOMPurify** - XSS protection
- **Validator.js** - Input validation
- **Crypto-JS** - Encryption for sensitive data
- **Secure Headers** - CSP, HSTS, X-Frame-Options

### Payment & Features
- **Stripe** - Payment processing
- **React Player** - Video playback
- **jsPDF** - PDF certificate generation
- **js-cookie** - Secure cookie management

## 📁 Project Structure

```
frontend-nextjs/
├── public/                      # Static assets
│   ├── images/                  # Images
│   └── fonts/                   # Custom fonts
│
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (public)/           # Public routes group
│   │   │   ├── landing/        # Landing page
│   │   │   ├── about/          # About page
│   │   │   └── contact/        # Contact page
│   │   ├── (auth)/             # Auth routes group
│   │   │   ├── login/          # Login page
│   │   │   ├── register/       # Register page
│   │   │   └── reset-password/ # Password reset
│   │   ├── (protected)/        # Protected routes
│   │   │   ├── dashboard/      # User dashboard
│   │   │   ├── courses/        # Course pages
│   │   │   ├── profile/        # User profile
│   │   │   └── admin/          # Admin pages
│   │   ├── layout.tsx          # Root layout
│   │   ├── globals.css         # Global styles
│   │   └── page.tsx            # Root redirect
│   │
│   ├── components/              # Reusable components
│   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...
│   │   ├── layout/             # Layout components
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Providers.tsx
│   │   └── common/             # Common components
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorBoundary.tsx
│   │       └── SEOHead.tsx
│   │
│   ├── features/               # Feature modules (domain-driven)
│   │   ├── auth/              # Authentication feature
│   │   │   ├── components/    # Auth-specific components
│   │   │   ├── hooks/         # Auth hooks
│   │   │   ├── api/           # Auth API calls
│   │   │   └── utils/         # Auth utilities
│   │   ├── courses/           # Courses feature
│   │   ├── assessments/       # Assessment feature
│   │   ├── admin/             # Admin feature
│   │   ├── supervisor/        # Supervisor feature
│   │   └── dashboard/         # Dashboard feature
│   │
│   ├── lib/                    # Core libraries
│   │   ├── api/               # API client
│   │   │   └── client.ts      # Axios instance with interceptors
│   │   ├── auth/              # Auth utilities
│   │   │   └── token.ts       # Token management
│   │   ├── seo/               # SEO utilities
│   │   │   └── metadata.ts    # Metadata generators
│   │   ├── security/          # Security utilities
│   │   └── utils/             # Utility functions
│   │       ├── cn.ts          # Class name merger
│   │       ├── format.ts      # Formatters
│   │       └── validation.ts  # Validators
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.ts         # Authentication hook
│   │   ├── useDebounce.ts     # Debounce hook
│   │   └── useIntersection.ts # Intersection observer
│   │
│   ├── store/                  # Redux store
│   │   ├── slices/            # Redux slices
│   │   │   ├── authSlice.ts
│   │   │   └── ...
│   │   └── index.ts           # Store configuration
│   │
│   ├── types/                  # TypeScript types
│   │   └── index.ts           # All type definitions
│   │
│   ├── config/                 # Configuration
│   │   └── app.config.ts      # App configuration
│   │
│   └── styles/                 # Additional styles
│
├── .env.local.example          # Environment variables template
├── .eslintrc.json             # ESLint configuration
├── .gitignore                 # Git ignore rules
├── .prettierrc                # Prettier configuration
├── next.config.js             # Next.js configuration
├── next-sitemap.config.js     # Sitemap configuration
├── package.json               # Dependencies
├── postcss.config.js          # PostCSS configuration
├── tailwind.config.ts         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

## 🏗️ Architecture Principles

### 1. Feature-Based Organization
Instead of grouping by technical concerns (components, hooks, etc.), we organize by **business features**. Each feature is self-contained with its own components, hooks, and API calls.

**Benefits:**
- Better scalability
- Easier to understand
- Simpler to maintain
- Clear boundaries

### 2. Clean Code Standards
- **DRY** (Don't Repeat Yourself)
- **SOLID** principles
- **Separation of Concerns**
- **Single Responsibility**
- **Type Safety** (strict TypeScript)

### 3. Performance Optimization
- **Server Components** by default
- **Code Splitting** automatic
- **Image Optimization** with Next/Image
- **Lazy Loading** for heavy components
- **Memoization** for expensive calculations

### 4. SEO Best Practices
- **Dynamic Metadata** for every page
- **Structured Data** (JSON-LD)
- **Semantic HTML**
- **OpenGraph & Twitter Cards**
- **Sitemap & Robots.txt**
- **Canonical URLs**

### 5. Security First
- **Input Validation** on all forms
- **XSS Protection** with DOMPurify
- **CSRF Protection**
- **Secure Headers** (CSP, HSTS, etc.)
- **Token Encryption**
- **Rate Limiting** (backend)

### 6. Accessibility (WCAG 2.1 AA)
- **ARIA Labels**
- **Keyboard Navigation**
- **Focus Management**
- **Screen Reader Support**
- **Color Contrast**

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` with your configuration:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_key_here
   # ... other variables
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

### Available Scripts

- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run type-check` - Run TypeScript type checking
- `npm run format` - Format code with Prettier
- `npm run analyze` - Analyze bundle size

## 📝 Migration Guide

### Migrating a Page from Old Frontend

Follow these steps to migrate any page from the old React frontend:

#### Step 1: Create Page Structure

```typescript
// src/app/(group)/page-name/page.tsx
import { Metadata } from 'next';
import { generateMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generateMetadata({
  title: 'Your Page Title',
  description: 'Your page description for SEO',
  keywords: ['keyword1', 'keyword2'],
});

export default async function PageName() {
  return (
    <main>
      {/* Your page content */}
    </main>
  );
}
```

#### Step 2: Extract Components

Move reusable parts into components:

```typescript
// src/features/feature-name/components/ComponentName.tsx
'use client'; // Only if client-side features needed

import { FC } from 'react';

interface Props {
  // Define props
}

export const ComponentName: FC<Props> = ({ ...props }) => {
  return (
    // Component JSX
  );
};
```

#### Step 3: Create API Calls

```typescript
// src/features/feature-name/api/index.ts
import { apiClient } from '@/lib/api/client';
import { YourType } from '@/types';

export const featureApi = {
  getItems: async () => {
    return apiClient.get<YourType[]>('/your-endpoint');
  },

  createItem: async (data: YourType) => {
    return apiClient.post<YourType>('/your-endpoint', data);
  },
};
```

#### Step 4: Add Custom Hooks

```typescript
// src/features/feature-name/hooks/useFeature.ts
'use client';

import { useState, useEffect } from 'react';
import { featureApi } from '../api';

export function useFeature() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch data
  }, []);

  return { data, loading };
}
```

#### Step 5: Add SEO & Structured Data

```typescript
import { generateCourseJsonLd } from '@/lib/seo/metadata';

export default function CoursePage() {
  const jsonLd = generateCourseJsonLd({
    name: 'Course Name',
    description: 'Course Description',
    provider: 'LB2D',
    url: 'https://lb2d.com/courses/course-name',
    price: 99,
    currency: 'EUR',
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Page content */}
    </>
  );
}
```

### Route Groups

Use route groups to organize pages:

- `(public)` - Public pages (Landing, About, Contact)
- `(auth)` - Authentication pages (Login, Register)
- `(protected)` - Protected pages (Dashboard, Profile)
- `(admin)` - Admin pages
- `(supervisor)` - Supervisor pages

## 🎨 Creating UI Components

### Using shadcn/ui

Add components using the CLI (when available) or create manually:

```bash
# When shadcn CLI is configured
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
```

### Manual Component Creation

```typescript
// src/components/ui/button.tsx
import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
```

## 🔐 Authentication Flow

```typescript
// Login example
import { useDispatch } from 'react-redux';
import { setCredentials } from '@/store/slices/authSlice';
import { apiClient } from '@/lib/api/client';

const handleLogin = async (email: string, password: string) => {
  try {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
      deviceInfo: getDeviceInfo(),
    });

    const { user, accessToken, refreshToken } = response.data;

    dispatch(setCredentials({ user, accessToken, refreshToken }));

    // Redirect based on role
    if (user.role === 'admin') {
      router.push('/admin/dashboard');
    } else if (user.role === 'supervisor') {
      router.push('/supervisor/dashboard');
    } else {
      router.push('/dashboard');
    }
  } catch (error) {
    // Handle error
  }
};
```

## 🛡️ Protected Routes

```typescript
// src/components/common/ProtectedRoute.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectCurrentUser } from '@/store/slices/authSlice';

export function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: string[];
}) {
  const router = useRouter();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectCurrentUser);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (requiredRole && user && !requiredRole.includes(user.role)) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, requiredRole, router]);

  if (!isAuthenticated) return null;

  if (requiredRole && user && !requiredRole.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
```

## 📊 Performance Monitoring

### Core Web Vitals

Monitor these metrics:
- **LCP** (Largest Contentful Paint) - < 2.5s
- **FID** (First Input Delay) - < 100ms
- **CLS** (Cumulative Layout Shift) - < 0.1

### Bundle Analysis

```bash
npm run analyze
```

This generates a visual report of your bundle size.

## 🧪 Testing Strategy

### Unit Tests (TO BE ADDED)
```bash
npm test
```

### E2E Tests (TO BE ADDED)
```bash
npm run test:e2e
```

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

### Other Platforms

Build and deploy the `.next` folder:

```bash
npm run build
# Deploy the .next folder and node_modules
```

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Radix UI](https://www.radix-ui.com)
- [Redux Toolkit](https://redux-toolkit.js.org)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Create a pull request

## 📄 License

Proprietary - All rights reserved

---

**Built with ❤️ by the LB2D Team**
