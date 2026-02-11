'use client';

import Link from 'next/link';
import { Menu, Tv2, User as UserIcon, LogOut, Shield, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { useUser, useAuth, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { AuthDialog } from '@/components/auth/auth-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { doc } from 'firebase/firestore';

function UserNav({ isAdmin, isSeller }: { isAdmin: boolean, isSeller: boolean }) {
    const { user, isUserLoading } = useUser();
    const auth = useAuth();

    const handleLogout = () => {
        signOut(auth);
    };

    if (isUserLoading) {
        return <Skeleton className="h-10 w-10 rounded-full" />;
    }

    if (!user) {
        return <AuthDialog />;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || ''} />
                        <AvatarFallback>
                            {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/dashboard"><UserIcon className="mr-2" /> Minha Conta</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                      <Link href="/admin"><Shield className="mr-2" /> Admin</Link>
                  </DropdownMenuItem>
                )}
                {isSeller && (
                  <DropdownMenuItem asChild>
                      <Link href="/seller"><ShoppingBag className="mr-2" /> Painel do Vendedor</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2" /> Sair
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function Header() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<{ role: string }>(userDocRef);

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
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            href="/"
            className="text-foreground/80 hover:text-foreground transition-colors"
          >
            Home
          </Link>
          <Link
            href="/recommendations"
            className="text-foreground/80 hover:text-foreground transition-colors"
          >
            Recomendação
          </Link>
          <Link
            href="/dashboard"
            className="text-foreground/80 hover:text-foreground transition-colors"
          >
            Minha Conta
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="text-foreground/80 hover:text-foreground transition-colors"
            >
              Admin
            </Link>
          )}
          {isSeller && (
            <Link
              href="/seller"
              className="text-foreground/80 hover:text-foreground transition-colors"
            >
              Vendedor
            </Link>
          )}
        </nav>
        <div className="hidden md:flex items-center gap-2">
            <UserNav isAdmin={isAdmin} isSeller={isSeller} />
        </div>
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="grid gap-4 py-6">
                <SheetClose asChild>
                  <Link
                    href="/"
                    className="flex w-full items-center py-2 text-lg font-semibold"
                  >
                    Home
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/recommendations"
                    className="flex w-full items-center py-2 text-lg font-semibold"
                  >
                    Recomendação
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/dashboard"
                    className="flex w-full items-center py-2 text-lg font-semibold"
                  >
                    Minha Conta
                  </Link>
                </SheetClose>
                {isAdmin && (
                  <SheetClose asChild>
                    <Link
                      href="/admin"
                      className="flex w-full items-center py-2 text-lg font-semibold"
                    >
                      Admin
                    </Link>
                  </SheetClose>
                )}
                {isSeller && (
                  <SheetClose asChild>
                    <Link
                      href="/seller"
                      className="flex w-full items-center py-2 text-lg font-semibold"
                    >
                      Vendedor
                    </Link>
                  </SheetClose>
                )}
                <div className="flex flex-col items-center gap-2 pt-4">
                    <UserNav isAdmin={isAdmin} isSeller={isSeller} />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
