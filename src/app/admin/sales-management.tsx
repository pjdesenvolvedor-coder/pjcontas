'use client';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useMemo, useState } from 'react';
import type { Ticket } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function SalesManagement() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  
  const ticketsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'tickets'), orderBy('createdAt', 'desc')) : null,
    [firestore]
  );

  const { data: tickets, isLoading } = useCollection<Ticket>(ticketsQuery);

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    const lowercasedSearch = searchTerm.toLowerCase();
    if (!lowercasedSearch) return tickets;

    return tickets.filter(ticket =>
        (ticket.planName?.toLowerCase().includes(lowercasedSearch)) ||
        (ticket.customerName?.toLowerCase().includes(lowercasedSearch)) ||
        (ticket.customerPhone?.includes(searchTerm)) ||
        (ticket.sellerName?.toLowerCase().includes(lowercasedSearch))
    );
  }, [tickets, searchTerm]);

  const totalRevenue = useMemo(() => {
    return filteredTickets?.reduce((acc, ticket) => acc + (ticket.price || 0), 0) || 0;
  }, [filteredTickets]);

  return (
    <div className="space-y-6">
       <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita {searchTerm ? '(Filtrada)' : 'Total'}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
              {isLoading ? (
                  <Skeleton className="h-8 w-1/4" />
              ) : (
                <div className="text-2xl font-bold">R$ {totalRevenue.toFixed(2)}</div>
              )}
              <p className="text-xs text-muted-foreground">
                  Soma de todas as vendas {searchTerm ? 'correspondentes à busca' : 'aprovadas na plataforma'}.
              </p>
          </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Relatório de Vendas</CardTitle>
          <CardDescription>Visualize e pesquise todas as vendas realizadas no marketplace.</CardDescription>
           <div className="relative pt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por cliente, contato, produto, vendedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10"
              />
            </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredTickets && filteredTickets.length > 0 ? (
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
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                        <div className="font-medium">{ticket.planName}</div>
                    </TableCell>
                    <TableCell>{ticket.customerName}</TableCell>
                    <TableCell>{ticket.customerPhone || 'N/A'}</TableCell>
                    <TableCell>{ticket.sellerName}</TableCell>
                    <TableCell className="text-right">R$ {(ticket.price || 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">{searchTerm ? 'Nenhuma venda encontrada para sua busca.' : 'Nenhuma venda encontrada.'}</p>
              {searchTerm && <p className="text-sm text-muted-foreground">Tente um termo de busca diferente.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
