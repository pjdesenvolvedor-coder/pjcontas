'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tv, Calendar, CheckCircle } from 'lucide-react';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Represents a user's subscription enriched with plan details.
type EnrichedUserSubscription = {
  id: string;
  planName: string;
  serviceName: string;
  nextBilling: string;
  logoUrl?: string; // assuming service details will be fetched
};

export default function UserPurchasesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [activeSubscriptions, setActiveSubscriptions] = useState<EnrichedUserSubscription[]>([]);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(true);

  // Memoized reference to the user's subscriptions subcollection
  const userSubscriptionsRef = useMemoFirebase(
    () => (user ? collection(firestore, `users/${user.uid}/userSubscriptions`) : null),
    [user?.uid, firestore]
  );
  
  // Fetch the user's subscription documents
  const { data: userSubscriptions, isLoading: isUserSubscriptionsLoading } = useCollection(userSubscriptionsRef);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      setIsLoadingSubscriptions(false);
      return;
    }
    
    if (userSubscriptions) {
      const fetchEnrichedData = async () => {
        setIsLoadingSubscriptions(true);
        const enriched: EnrichedUserSubscription[] = [];

        for (const sub of userSubscriptions) {
           enriched.push({
            id: sub.id,
            planName: sub.planName || 'Plano',
            serviceName: sub.serviceName || 'Serviço',
            nextBilling: sub.endDate,
          });
        }
        
        setActiveSubscriptions(enriched);
        setIsLoadingSubscriptions(false);
      };
      fetchEnrichedData();
    } else if (!isUserSubscriptionsLoading) {
      setIsLoadingSubscriptions(false);
    }
  }, [user, isUserLoading, userSubscriptions, isUserSubscriptionsLoading, firestore]);

  const isLoading = isUserLoading || isLoadingSubscriptions;
  
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-bold font-headline text-primary">
          Minhas Compras
        </h1>
        <p className="mt-2 text-base md:text-lg text-muted-foreground">
          Aqui você pode gerenciar as assinaturas que você comprou.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tv className="h-6 w-6" />
            Assinaturas Ativas
          </CardTitle>
          <CardDescription>
            Gerencie suas assinaturas de serviços de streaming ativas.
          </CardDescription>
        </CardHeader>
        <CardContent>
           {isLoading ? (
            <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
          ) : !user ? (
             <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">
                Faça login para ver suas assinaturas.
              </p>
            </div>
          ) : activeSubscriptions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">
                Você ainda não possui assinaturas ativas.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Próxima Cobrança</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSubscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium flex items-center gap-3">
                      {sub.serviceName}
                    </TableCell>
                    <TableCell>{sub.planName}</TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {new Date(sub.nextBilling).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="default"
                        className="bg-green-100 text-green-800 border-green-200"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Ativa
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
