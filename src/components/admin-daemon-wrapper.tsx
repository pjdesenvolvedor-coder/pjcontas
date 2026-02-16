'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { WhatsAppMessageDaemon } from '@/app/admin/whatsapp-message-daemon';

export function AdminDaemonWrapper() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserProfile>(userDocRef);

  const isLoading = isUserLoading || isUserDataLoading;
  
  if (isLoading || !userData) {
    return null;
  }

  if (userData.role === 'admin') {
    return <WhatsAppMessageDaemon />;
  }

  return null;
}
