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
    const hasInitializedRef = useRef(false); // Tracks if the listener has run at least once with data

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
            // Reset on logout
            previousTicketsRef.current = new Map();
            hasInitializedRef.current = false;
            return;
        }

        if (isCustomerLoading || isSellerLoading) {
            return; // Wait for data to be loaded
        }

        const currentTicketsMap = new Map(allTickets.map(t => [t.id, t]));

        // If this is the first time we've received data after a page load/login,
        // we populate the initial state and don't show any notifications.
        // This prevents spamming the user with toasts for all existing unread messages.
        if (!hasInitializedRef.current) {
            previousTicketsRef.current = currentTicketsMap;
            hasInitializedRef.current = true;
            return;
        }

        const previousTicketsMap = previousTicketsRef.current;

        currentTicketsMap.forEach((newTicket) => {
            const oldTicket = previousTicketsMap.get(newTicket.id);

            const isCustomer = newTicket.customerId === user.uid;
            const isSeller = newTicket.sellerId === user.uid;

            let hasNewMessage = false;
            
            // A new ticket that we haven't seen before has arrived.
            if (!oldTicket) {
                if (isCustomer && (newTicket.unreadByCustomerCount || 0) > 0) {
                    hasNewMessage = true;
                }
                if (isSeller && (newTicket.unreadBySellerCount || 0) > 0) {
                    hasNewMessage = true;
                }
            } 
            // An existing ticket has been updated.
            else {
                if (isCustomer && newTicket.unreadByCustomerCount > (oldTicket.unreadByCustomerCount || 0)) {
                    hasNewMessage = true;
                }
                if (isSeller && newTicket.unreadBySellerCount > (oldTicket.unreadBySellerCount || 0)) {
                    hasNewMessage = true;
                }
            }

            if (hasNewMessage) {
                const ticketUrl = isCustomer ? `/meus-tickets/${newTicket.id}` : `/seller/tickets/${newTicket.id}`;
                
                // Don't show toast if user is already on the relevant ticket page
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

        // Update the reference for the next comparison
        previousTicketsRef.current = currentTicketsMap;

    }, [allTickets, user, pathname, toast, router, isCustomerLoading, isSellerLoading]);

    return null;
}
