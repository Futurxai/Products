import { Link } from 'react-router-dom';
import { Seo } from '@/components/Seo';

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <Seo title="Page Not Found" description="The page you're looking for doesn't exist." path="/404" />
      <h1 className="text-6xl font-extrabold text-brand-700">404</h1>
      <p className="mt-4 text-gray-600">Sorry, we couldn&apos;t find that page.</p>
      <Link to="/" className="btn-primary mt-6">Back to Home</Link>
    </div>
  );
}
