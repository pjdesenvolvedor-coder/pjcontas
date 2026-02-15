'use client';

import { useEffect, useRef, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import type { Ticket } from '@/lib/types';

// Helper to combine and deduplicate tickets from two arrays
const combineAndDeduplicateTickets = (tickets1: Ticket[] | null, tickets2: Ticket[] | null): Ticket[] => {
    const allTickets = [...(tickets1 || []), ...(tickets2 || [])];
    const uniqueTickets = new Map<string, Ticket>();
    allTickets.forEach(ticket => {
        uniqueTickets.set(ticket.id, ticket);
    });
    return Array.from(uniqueTickets.values());
};

export function TicketNotificationListener() {
    const { user } = useUser();
    const firestore = useFirestore();
    const pathname = usePathname();
    const router = useRouter();
    const { toast } = useToast();
    const previousTicketsRef = useRef<Map<string, Ticket>>(new Map());

    const customerTicketsQuery = useMemoFirebase(
        () => user ? query(collection(firestore, 'tickets'), where('customerId', '==', user.uid)) : null,
        [user, firestore]
    );
    const { data: customerTickets, isLoading: isCustomerLoading } = useCollection<Ticket>(customerTicketsQuery);

    const sellerTicketsQuery = useMemoFirebase(
        () => user ? query(collection(firestore, 'tickets'), where('sellerId', '==', user.uid)) : null,
        [user, firestore]
    );
    const { data: sellerTickets, isLoading: isSellerLoading } = useCollection<Ticket>(sellerTicketsQuery);

    const allTickets = useMemo(() => 
        combineAndDeduplicateTickets(customerTickets, sellerTickets),
    [customerTickets, sellerTickets]);

    useEffect(() => {
        if (!user) {
            previousTicketsRef.current = new Map();
            return;
        }

        if (isCustomerLoading || isSellerLoading) {
            return; // Wait until both queries are done loading
        }

        const currentTicketsMap = new Map(allTickets.map(t => [t.id, t]));
        const previousTicketsMap = previousTicketsRef.current;

        currentTicketsMap.forEach((newTicket) => {
            const oldTicket = previousTicketsMap.get(newTicket.id);

            const isCustomer = newTicket.customerId === user.uid;
            const isSeller = newTicket.sellerId === user.uid;

            let hasNewMessage = false;
            if (isCustomer) {
                if (!oldTicket && newTicket.unreadByCustomerCount > 0) hasNewMessage = true;
                if (oldTicket && newTicket.unreadByCustomerCount > (oldTicket.unreadByCustomerCount || 0)) hasNewMessage = true;
            } else if (isSeller) {
                if (!oldTicket && newTicket.unreadBySellerCount > 0) hasNewMessage = true;
                if (oldTicket && newTicket.unreadBySellerCount > (oldTicket.unreadBySellerCount || 0)) hasNewMessage = true;
            }

            if (hasNewMessage) {
                const ticketUrl = isCustomer ? `/meus-tickets/${newTicket.id}` : `/seller/tickets/${newTicket.id}`;
                
                if (pathname === ticketUrl) {
                    return;
                }

                const title = isCustomer 
                    ? `Nova mensagem de ${newTicket.sellerName || 'Vendedor'}` 
                    : `Nova mensagem de ${newTicket.customerName || 'Comprador'}`;
                
                toast({
                    title: title,
                    description: newTicket.lastMessageText,
                    action: (
                        <ToastAction altText="Ver mensagem" onClick={() => router.push(ticketUrl)}>
                            Ver mensagem
                        </ToastAction>
                    ),
                    duration: 10000,
                });
            }
        });

        previousTicketsRef.current = currentTicketsMap;
    }, [allTickets, user, pathname, toast, router, isCustomerLoading, isSellerLoading]);

    return null;
}
