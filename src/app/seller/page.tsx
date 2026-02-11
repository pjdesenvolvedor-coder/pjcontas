'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { SellerDashboard } from './seller-dashboard';

type UserProfile = {
  role: 'admin' | 'customer' | 'seller';
};

export default function SellerPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    const isDataLoaded = !isUserLoading && !isUserDataLoading;
    if (isDataLoaded) {
      if (!user) {
        router.push('/dashboard');
      } else if (userData && userData.role !== 'seller' && userData.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [user, userData, isUserLoading, isUserDataLoading, router]);

  const isLoading = isUserLoading || isUserDataLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }
  
  if (userData?.role !== 'seller' && userData?.role !== 'admin') {
    return (
       <div className="flex h-screen w-full items-center justify-center">
            <p>Redirecionando...</p>
        </div>
    );
  }

  return <SellerDashboard />;
}
