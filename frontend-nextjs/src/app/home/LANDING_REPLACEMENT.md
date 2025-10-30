# Landing Page Migration Plan

The landing page is 838 lines and needs to be migrated. Here's the approach:

## Key Sections to Migrate:
1. Hero section with background image (/hero-bg.jpg)
2. Animated stars (12 stars) on buttons - DONE (AnimatedStars component created)
3. Stats counter animation (250 students, 120 courses, 3 countries, 90% success)
4. Course cards with CEFR levels (A1-C2) and German flag gradients
5. "Why Choose Us" section
6. Testimonials carousel with German flag gradient background
7. Footer

## Next Steps:
Due to file size, I'll create the landing page by directly replacing the current landing/page.tsx

The file needs to be 'use client' since it uses:
- useState for stats, testimonials, courses
- useEffect for animations and API calls
- useRouter for navigation
