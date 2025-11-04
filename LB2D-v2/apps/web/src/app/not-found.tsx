import Link from 'next/link';
import Button from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-yellow-50 to-red-50">
      <div className="text-center px-4">
        <h1 className="text-9xl font-bold bg-gradient-to-r from-green-700 via-red-700 to-yellow-600 bg-clip-text text-transparent mb-4">
          404
        </h1>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex items-center justify-center space-x-4">
          <Link href="/">
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600">
              Go Home
            </Button>
          </Link>
          <Link href="/courses">
            <Button variant="outline">
              Browse Courses
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
