'use client';

import { SellerSidebar } from './seller-sidebar';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/lib/types';

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: userData, isLoading: isUserDataLoading } =
    useDoc<UserProfile>(userDocRef);

  const isLoading = isUserLoading || isUserDataLoading;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isSeller = userData?.role === 'seller' || userData?.role === 'admin';

  if (isSeller) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] bg-background text-foreground">
        <SellerSidebar />
        <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-auto">
          {children}
        </main>
      </div>
    );
  }

  // For customers, provide a standard page container.
  return (
    <div className="container mx-auto max-w-5xl py-12 px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}
