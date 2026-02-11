'use client';

import Link from 'next/link';
import { Menu, Tv2, LogOut, Shield, ShoppingBag, MessageSquare, Home, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { useUser, useAuth, useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { AuthDialog } from '@/components/auth/auth-dialog';
import { signOut } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { doc } from 'firebase/firestore';
import { useEffect } from 'react';

export function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<{ role: string; lastSeen?: string }>(userDocRef);

  useEffect(() => {
    if (user && firestore) {
      const userRef = doc(firestore, 'users', user.uid);
      // Only update if last seen was more than a minute ago to avoid excessive writes
      const now = new Date();
      const lastSeenDate = userData?.lastSeen ? new Date(userData.lastSeen) : new Date(0);
      const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / 60000;
      
      if (diffMinutes > 1) {
          updateDocumentNonBlocking(userRef, {
            lastSeen: now.toISOString()
          });
      }
    }
  }, [user, firestore, userData]);

  const handleLogout = () => {
    signOut(auth);
  };

  const isLoading = isUserLoading || isUserDataLoading;

  const isAdmin = !isLoading && userData?.role === 'admin';
  const isSeller = !isLoading && (userData?.role === 'seller' || userData?.role === 'admin');

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Tv2 className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-primary font-headline">
            StreamShare
          </span>
        </Link>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent>
            <div className="flex flex-col h-full">
               <div className="p-4 border-b">
                 <SheetClose asChild>
                   <Link href="/" className="flex items-center gap-2">
                    <Tv2 className="h-7 w-7 text-primary" />
                    <span className="text-xl font-bold text-primary font-headline">
                      StreamShare
                    </span>
                  </Link>
                 </SheetClose>
              </div>
              
              <nav className="flex-grow p-4 space-y-2">
                 <SheetClose asChild>
                  <Button variant="ghost" className="w-full justify-start text-base" asChild>
                    <Link href="/">
                      <Home className="mr-2"/> Home
                    </Link>
                  </Button>
                </SheetClose>

                {isUserLoading ? (
                  <div className="space-y-2 px-3">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : user ? (
                  <>
                    <SheetClose asChild>
                       <Button variant="ghost" className="w-full justify-start text-base" asChild>
                          <Link href="/dashboard">
                            <UserIcon className="mr-2" /> Minha Conta
                          </Link>
                       </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button variant="ghost" className="w-full justify-start text-base" asChild>
                          <Link href="/meus-tickets">
                            <MessageSquare className="mr-2" /> Meus Tickets
                          </Link>
                      </Button>
                    </SheetClose>
                    {isSeller && (
                      <SheetClose asChild>
                         <Button variant="ghost" className="w-full justify-start text-base" asChild>
                            <Link href="/seller">
                               <ShoppingBag className="mr-2"/> Painel do Vendedor
                            </Link>
                         </Button>
                      </SheetClose>
                    )}
                     {isAdmin && (
                      <SheetClose asChild>
                         <Button variant="ghost" className="w-full justify-start text-base" asChild>
                            <Link href="/admin">
                              <Shield className="mr-2" /> Admin
                            </Link>
                         </Button>
                      </SheetClose>
                    )}
                  </>
                ) : null }
              </nav>

              <div className="p-4 mt-auto border-t">
                {isUserLoading ? (
                   <Skeleton className="h-10 w-full" />
                ) : user ? (
                  <SheetClose asChild>
                    <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-base">
                      <LogOut className="mr-2" /> Sair
                    </Button>
                  </SheetClose>
                ) : (
                   <SheetClose asChild>
                    <AuthDialog />
                   </SheetClose>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
