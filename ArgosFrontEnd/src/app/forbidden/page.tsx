'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-center px-4">
      <h1 className="text-6xl font-bold text-red-500">403</h1>
      <h2 className="text-2xl font-semibold mt-4 mb-2">Access Denied</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Sorry, you do not have permission to access this page.
      </p>
      <Link href="/home">
        <Button>Go to Home</Button>
      </Link>
    </div>
  );
}
