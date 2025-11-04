import Link from 'next/link';
import { Facebook, Twitter, Linkedin, Instagram, Youtube, Mail } from 'lucide-react';
import { appConfig } from '@/config/app.config';
import { Separator } from '@/components/ui/separator';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    company: [
      { label: 'About Us', href: '/about' },
      { label: 'Courses', href: '/courses' },
      { label: 'Contact', href: '/contact' },
      { label: 'Privacy Policy', href: '/privacy' },
    ],
    resources: [
      { label: 'Blog', href: '/blog' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Support', href: '/support' },
      { label: 'Terms of Service', href: '/terms' },
    ],
    courses: [
      { label: 'A1 - Beginner', href: '/courses?level=A1' },
      { label: 'A2 - Elementary', href: '/courses?level=A2' },
      { label: 'B1 - Intermediate', href: '/courses?level=B1' },
      { label: 'B2 - Upper Intermediate', href: '/courses?level=B2' },
    ],
  };

  const socialLinks = [
    { Icon: Facebook, href: appConfig.social.facebook, label: 'Facebook' },
    { Icon: Twitter, href: appConfig.social.twitter, label: 'Twitter' },
    { Icon: Linkedin, href: appConfig.social.linkedin, label: 'LinkedIn' },
    { Icon: Instagram, href: appConfig.social.instagram, label: 'Instagram' },
    { Icon: Youtube, href: appConfig.social.youtube, label: 'YouTube' },
  ];

  return (
    <footer className="border-t bg-muted/40">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* About */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Learn Bangla to Deutsch</h3>
            <p className="text-sm text-muted-foreground">
              Master German language from Bengali with expert-led courses, interactive
              assessments, and comprehensive learning materials.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-primary"
                  aria-label={label}
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Resources</h3>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Courses */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Popular Courses</h3>
            <ul className="space-y-2">
              {footerLinks.courses.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Bottom */}
        <div className="flex flex-col items-center justify-between space-y-4 text-sm text-muted-foreground md:flex-row md:space-y-0">
          <p>
            © {currentYear} {appConfig.app.name}. All rights reserved.
          </p>
          <div className="flex items-center space-x-1">
            <Mail className="h-4 w-4" />
            <a
              href={`mailto:${appConfig.app.contactEmail}`}
              className="hover:text-primary"
            >
              {appConfig.app.contactEmail}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
