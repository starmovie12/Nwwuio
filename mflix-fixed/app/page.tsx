import { redirect } from 'next/navigation';

/**
 * Root page — redirects to admin dashboard
 * Phase 5: Admin panel at /dashboard (using (admin) route group)
 */
export default function HomePage() {
  redirect('/dashboard');
}

