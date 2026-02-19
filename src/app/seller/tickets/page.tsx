'use client';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import Link from 'next/link';
import type { Ticket } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, ArrowRight } from 'lucide-react';
import React from 'react';

export default function SellerTicketsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const sellerTicketsQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'tickets'), where('sellerId', '==', user.uid)) : null,
    [user, firestore]
  );

  const { data: sellerTickets, isLoading: isLoadingSeller } = useCollection<Ticket>(sellerTicketsQuery);

  const isLoading = isUserLoading || isLoadingSeller;

  const sortedTickets = React.useMemo(() => {
    return sellerTickets?.sort((a, b) => {
      const unreadA = a.unreadBySellerCount || 0;
      const unreadB = b.unreadBySellerCount || 0;
      // Prioritize tickets with unread messages
      if (unreadA > 0 && unreadB === 0) return -1;
      if (unreadB > 0 && unreadA === 0) return 1;
      // If both have or don't have unread, sort by last message date
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    }) || [];
  }, [sellerTickets]);


  return (
    <div className="container mx-auto max-w-5xl py-12 px-4 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MessageSquare /> Tickets de Vendas</CardTitle>
          <CardDescription>Conversas sobre suas vendas.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : sortedTickets.length > 0 ? (
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
                {sortedTickets.map((ticket) => {
                  const unreadCount = ticket.unreadBySellerCount || 0;

                  return (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <div className="font-medium">{ticket.planName}</div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <Badge variant="destructive" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full p-0">
                                    {unreadCount}
                                </Badge>
                            )}
                            <span className="truncate">{ticket.lastMessageText}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'}>{ticket.status === 'open' ? 'Aberto' : 'Fechado'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/seller/tickets/${ticket.id}`}>
                          Ver <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">Nenhum ticket de venda encontrado.</p>
              <p className="text-sm text-muted-foreground">Tickets de suporte para suas vendas aparecerão aqui.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
