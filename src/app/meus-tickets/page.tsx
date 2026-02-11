'use client';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Ticket } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, ArrowRight } from 'lucide-react';

export default function MyTicketsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const customerTicketsQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'tickets'), where('customerId', '==', user.uid)) : null,
    [user, firestore]
  );
  const sellerTicketsQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'tickets'), where('sellerId', '==', user.uid)) : null,
    [user, firestore]
  );

  const { data: customerTickets, isLoading: isLoadingCustomer } = useCollection<Ticket>(customerTicketsQuery);
  const { data: sellerTickets, isLoading: isLoadingSeller } = useCollection<Ticket>(sellerTicketsQuery);

  useEffect(() => {
    const loading = isUserLoading || isLoadingCustomer || isLoadingSeller;
    setIsLoading(loading);
    if (!loading) {
      const combined = new Map<string, Ticket>();
      customerTickets?.forEach(t => combined.set(t.id, t));
      sellerTickets?.forEach(t => combined.set(t.id, t));
      
      // Sort after combining
      const sorted = Array.from(combined.values()).sort((a, b) => 
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );
      
      setAllTickets(sorted);
    }
  }, [customerTickets, sellerTickets, isUserLoading, isLoadingCustomer, isLoadingSeller]);


  return (
    <div className="container mx-auto max-w-5xl py-12 px-4 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MessageSquare /> Meus Tickets</CardTitle>
          <CardDescription>Conversas sobre suas compras e vendas.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : allTickets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Anúncio</TableHead>
                  <TableHead>Última Mensagem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <div className="font-medium">{ticket.serviceName}</div>
                      <div className="text-sm text-muted-foreground">{ticket.planName}</div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{ticket.lastMessageText}</TableCell>
                    <TableCell>
                      <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'}>{ticket.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/meus-tickets/${ticket.id}`}>
                          Ver <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">Nenhum ticket encontrado.</p>
              <p className="text-sm text-muted-foreground">Tickets de suporte para suas compras e vendas aparecerão aqui.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
