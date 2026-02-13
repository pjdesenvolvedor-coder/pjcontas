'use client';

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserSubscription } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { differenceInDays } from 'date-fns';
import React from 'react';
import { cn } from '@/lib/utils';

function PurchaseCard({ purchase }: { purchase: UserSubscription }) {
  if (!purchase.ticketId) {
    return (
        <Card className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:shadow-lg group opacity-50">
           <div className="relative h-32 w-full overflow-hidden bg-muted"></div>
            <CardContent className="flex flex-1 flex-col justify-between p-4">
                 <div>
                    <h3 className="font-bold text-lg truncate">{purchase.planName}</h3>
                </div>
                <p className="p-4 text-sm text-center text-muted-foreground">Ticket ainda não gerado.</p>
            </CardContent>
        </Card>
    );
  }

  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  let expirationText = 'Calculando...';
  let badgeVariant: "outline" | "destructive" = "outline";
  let isExpired = false;

  if (isClient) {
    const endDate = new Date(purchase.endDate);
    const today = new Date();
    const daysRemaining = differenceInDays(endDate, today);

    isExpired = daysRemaining < 0;

    if (daysRemaining < 0) {
      expirationText = 'Expirado';
    } else if (daysRemaining === 0) {
      expirationText = 'Expira hoje';
    } else if (daysRemaining === 1) {
      expirationText = 'Expira em 1 dia';
    } else {
      expirationText = `Expira em ${daysRemaining} dias`;
    }

    if (daysRemaining < 3) {
      badgeVariant = 'destructive';
    }
  }


  return (
    <Link href={`/meus-tickets/${purchase.ticketId}`}>
      <Card className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:shadow-lg group h-full">
        <div className="relative h-32 w-full overflow-hidden">
          <Image
            src={purchase.bannerUrl || 'https://placehold.co/600x400/2196F3/FFFFFF/png?text=Anuncio'}
            alt={purchase.planName}
            fill
            className={cn(
              "object-cover transition-transform duration-300 group-hover:scale-105",
              isExpired && "blur-sm"
            )}
          />
           {isExpired && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
              <p className="text-white text-center font-semibold">Clique aqui para renovar a assinatura</p>
            </div>
          )}
        </div>
        <CardContent className="flex flex-1 flex-col justify-between p-4">
          <div>
            <h3 className="font-bold text-lg truncate">{purchase.planName}</h3>
          </div>
          <div className="mt-2">
            <Badge variant={badgeVariant}>
              {expirationText}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}


export default function UserPurchasesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // Memoized reference to the user's subscriptions subcollection
  const userSubscriptionsRef = useMemoFirebase(
    () => (user ? collection(firestore, `users/${user.uid}/userSubscriptions`) : null),
    [user?.uid, firestore]
  );
  
  // Fetch the user's subscription documents
  const { data: userSubscriptions, isLoading: isUserSubscriptionsLoading } = useCollection<UserSubscription>(userSubscriptionsRef);

  const isLoading = isUserLoading || isUserSubscriptionsLoading;
  
  const validPurchases = React.useMemo(() => 
    userSubscriptions?.filter(p => p.ticketId && p.bannerUrl) || [],
    [userSubscriptions]
  );
  
  const renderSkeletons = (count = 4) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(count)].map((_, i) => (
        <Card key={i} className="overflow-hidden rounded-xl">
          <Skeleton className="h-32 w-full" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-8 w-full mt-2" />
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-bold font-headline text-primary">
          Minhas Compras
        </h1>
        <p className="mt-2 text-base md:text-lg text-muted-foreground">
          Acesse suas compras para visualizar os detalhes e obter suporte.
        </p>
      </header>

      <div className="w-full">
         {isLoading ? (
           renderSkeletons()
          ) : !user ? (
             <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">
                Faça login para ver suas compras.
              </p>
            </div>
          ) : validPurchases.length > 0 ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {validPurchases.map((purchase) => (
                  <PurchaseCard key={purchase.id} purchase={purchase} />
                ))}
              </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">
                Você ainda não fez nenhuma compra.
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
