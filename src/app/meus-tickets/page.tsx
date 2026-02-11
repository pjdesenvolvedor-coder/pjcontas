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

export default function MyTicketsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const customerTicketsQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'tickets'), where('customerId', '==', user.uid)) : null,
    [user, firestore]
  );

  const { data: customerTickets, isLoading: isLoadingCustomer } = useCollection<Ticket>(customerTicketsQuery);

  const isLoading = isUserLoading || isLoadingCustomer;

  const sortedTickets = customerTickets?.sort((a, b) => 
    new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  ) || [];

  return (
    <div className="container mx-auto max-w-5xl py-12 px-4 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MessageSquare /> Meus Tickets</CardTitle>
          <CardDescription>Conversas sobre suas compras. Para ver tickets de vendas, acesse o painel do vendedor.</CardDescription>
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
                  const unreadCount = ticket.unreadByCustomerCount || 0;

                  return (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <div className="font-medium">{ticket.serviceName}</div>
                      <div className="text-sm text-muted-foreground">{ticket.planName}</div>
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
                        <Link href={`/meus-tickets/${ticket.id}`}>
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
              <p className="text-lg text-muted-foreground">Nenhum ticket de compra encontrado.</p>
              <p className="text-sm text-muted-foreground">Tickets de suporte para suas compras aparecerão aqui.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
