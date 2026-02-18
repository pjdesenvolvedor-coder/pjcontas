'use client';

import Image from 'next/image';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import {
  useDoc,
  useCollection,
  useFirestore,
  useMemoFirebase,
} from '@/firebase';
import {
  doc,
  collection,
  query,
  where,
  type DocumentData,
} from 'firebase/firestore';
import type { Plan, SpecialCouponsConfig, Coupon } from '@/lib/types';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AbandonedCartOffer } from '@/components/abandoned-cart-offer';

// This page is no longer linked from anywhere in the app, 
// but is kept to prevent breaking old links.
// It will now show details for a specific plan ID.
export default function SubscriptionPage() {
  const params = useParams();
  const firestore = useFirestore();

  const planRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'subscriptions', params.id as string) : null),
    [firestore, params.id]
  );
  const { data: plan, isLoading } = useDoc<Plan>(planRef);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-5xl py-12 px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-full max-w-lg" />
          </CardHeader>
          <CardContent className="p-6 md:p-8">
             <Skeleton className="h-64 w-full mt-6" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!plan) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-5xl py-12 px-4 sm:px-6 lg:px-8">
      <Card className="overflow-hidden">
        <CardHeader className="p-0">
           {plan.bannerUrl && (
             <div className="relative h-64 w-full">
                <Image
                  src={plan.bannerUrl}
                  alt={plan.name}
                  fill
                  className="object-cover"
                />
              </div>
           )}
          <div className="bg-card p-6 md:p-8">
                <h1 className="text-3xl md:text-4xl font-bold font-headline text-primary">
                  {plan.name}
                </h1>
                <p className="mt-2 text-base md:text-lg text-muted-foreground">
                  Vendido por: {plan.sellerName}
                </p>
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <Card className="mt-4 border-primary shadow-lg">
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription className="text-3xl font-bold text-primary">
                R$ {plan.price}
                <span className="text-sm font-normal text-muted-foreground">
                  /mês
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{plan.description}</p>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span>Modelo: {plan.accountModel}</span>
                </li>
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                size="lg"
                className="w-full mt-6 bg-accent hover:bg-accent/90"
              >
                <Link
                  href={`/checkout?planId=${plan.id}`}
                >
                  Assinar Agora <ArrowRight className="ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
