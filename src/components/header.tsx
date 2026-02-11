'use client';

import Link from 'next/link';
import { Menu, Tv2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';

export function Header() {
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
            Get Recommendation
          </Link>
          <Link
            href="/dashboard"
            className="text-foreground/80 hover:text-foreground transition-colors"
          >
            My Account
          </Link>
        </nav>
        <div className="hidden md:flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Log In</Link>
          </Button>
          <Button size="sm" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="/signup">Sign Up</Link>
          </Button>
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
                    Get Recommendation
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/dashboard"
                    className="flex w-full items-center py-2 text-lg font-semibold"
                  >
                    My Account
                  </Link>
                </SheetClose>
                <div className="flex flex-col gap-2 pt-4">
                  <SheetClose asChild>
                    <Button variant="ghost" asChild>
                      <Link href="/login">Log In</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                     <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                      <Link href="/signup">Sign Up</Link>
                    </Button>
                  </SheetClose>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
