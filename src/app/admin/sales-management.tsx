'use client';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useMemo } from 'react';
import type { Ticket } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign } from 'lucide-react';

export function SalesManagement() {
  const firestore = useFirestore();
  
  const ticketsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'tickets'), orderBy('createdAt', 'desc')) : null,
    [firestore]
  );

  const { data: tickets, isLoading } = useCollection<Ticket>(ticketsQuery);

  const totalRevenue = useMemo(() => {
    return tickets?.reduce((acc, ticket) => acc + (ticket.price || 0), 0) || 0;
  }, [tickets]);

  return (
    <div className="space-y-6">
       <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
              {isLoading ? (
                  <Skeleton className="h-8 w-1/4" />
              ) : (
                <div className="text-2xl font-bold">R$ {totalRevenue.toFixed(2)}</div>
              )}
              <p className="text-xs text-muted-foreground">
                  Soma de todas as vendas aprovadas na plataforma.
              </p>
          </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Relatório de Vendas</CardTitle>
          <CardDescription>Visualize todas as vendas realizadas no marketplace.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : tickets && tickets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                        <div className="font-medium">{ticket.serviceName}</div>
                        <div className="text-sm text-muted-foreground">{ticket.planName}</div>
                    </TableCell>
                    <TableCell>{ticket.customerName}</TableCell>
                    <TableCell>{ticket.customerPhone || 'N/A'}</TableCell>
                    <TableCell>{ticket.sellerName}</TableCell>
                    <TableCell className="text-right">R$ {ticket.price.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">Nenhuma venda encontrada.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
