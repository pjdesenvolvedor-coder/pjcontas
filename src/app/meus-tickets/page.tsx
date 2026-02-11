'use client';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useEffect, useState, useRef } from 'react';
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
  const ticketsRef = useRef<Ticket[]>();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize the audio element once on component mount.
  useEffect(() => {
    // A simple, short pling sound as a base64 data URI.
    audioRef.current = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABgAAABkYXRhAwAAAAA=');
    
    // Most browsers block audio that is not initiated by user interaction.
    // To work around this, we can try to "unlock" audio playback on the first click anywhere on the page.
    const unlockAudio = () => {
        // Calling load() can be enough to signal user interaction to the browser.
        audioRef.current?.load();
        document.body.removeEventListener('click', unlockAudio);
    };
    document.body.addEventListener('click', unlockAudio);

    return () => {
        document.body.removeEventListener('click', unlockAudio);
    }
  }, []);

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
      
      const sorted = Array.from(combined.values()).sort((a, b) => 
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );
      
      // Check for new messages and play notification sound
      if (ticketsRef.current && user && audioRef.current) {
        // A flag to ensure we only play the sound once per batch of updates.
        let soundPlayed = false;
        sorted.forEach(newTicket => {
          if (soundPlayed) return;

          const oldTicket = ticketsRef.current!.find(t => t.id === newTicket.id);
          if (oldTicket) {
            const isSeller = user.uid === newTicket.sellerId;
            const isCustomer = user.uid === newTicket.customerId;

            const sellerHasNew = isSeller && (newTicket.unreadBySellerCount || 0) > (oldTicket.unreadBySellerCount || 0);
            const customerHasNew = isCustomer && (newTicket.unreadByCustomerCount || 0) > (oldTicket.unreadByCustomerCount || 0);

            if (sellerHasNew || customerHasNew) {
              audioRef.current?.play().catch(e => console.error("Audio play failed:", e));
              soundPlayed = true;
            }
          }
        });
      }

      setAllTickets(sorted);
      ticketsRef.current = sorted; // Update the ref with the new tickets
    }
  }, [customerTickets, sellerTickets, isUserLoading, isLoadingCustomer, isLoadingSeller, user]);


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
                {allTickets.map((ticket) => {
                  const isSeller = user?.uid === ticket.sellerId;
                  const unreadCount = isSeller ? (ticket.unreadBySellerCount || 0) : (ticket.unreadByCustomerCount || 0);

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
                )})}
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
