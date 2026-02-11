'use client';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy, increment } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import type { Ticket, ChatMessage, UserSubscription, Plan, UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, ArrowLeft, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function ChatBubble({ message, isOwnMessage }: { message: ChatMessage; isOwnMessage: boolean }) {
    return (
        <div className={cn("flex items-end gap-2", isOwnMessage ? "justify-end" : "justify-start")}>
            {!isOwnMessage && (
                <Avatar className="h-8 w-8">
                    <AvatarFallback>{message.senderName?.charAt(0) || 'S'}</AvatarFallback>
                </Avatar>
            )}
            <div className={cn(
                "max-w-md rounded-lg px-4 py-2",
                isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                <p className="text-xs text-right mt-1 opacity-70">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
             {isOwnMessage && (
                <Avatar className="h-8 w-8">
                    <AvatarFallback>{message.senderName?.charAt(0) || 'V'}</AvatarFallback>
                </Avatar>
            )}
        </div>
    );
}

function SellerStatus({ seller }: { seller: UserProfile }) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!seller) return null;

    let statusElement: React.ReactNode = null;

    if (isClient && seller.lastSeen) {
        const lastSeenDate = new Date(seller.lastSeen);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / 60000;

        if (diffMinutes < 5) {
            statusElement = <Badge variant="outline" className="border-green-500 bg-green-50 text-green-600">Online</Badge>;
        } else {
            const lastSeenText = formatDistanceToNow(lastSeenDate, { addSuffix: true, locale: ptBR });
            statusElement = <span className="text-xs text-muted-foreground">Visto por último {lastSeenText}</span>;
        }
    } else {
        statusElement = <span className="text-xs text-muted-foreground">Status indisponível</span>;
    }


    return (
        <div className="flex items-center gap-2">
            <span className="font-medium">{seller.sellerUsername || seller.name}</span>
            {statusElement}
        </div>
    );
}

export default function TicketChatPage() {
    const router = useRouter();
    const params = useParams();
    const ticketId = params.id as string;
    
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Ticket
    const ticketRef = useMemoFirebase(() => (firestore && ticketId) ? doc(firestore, 'tickets', ticketId) : null, [firestore, ticketId]);
    const { data: ticket, isLoading: isTicketLoading } = useDoc<Ticket>(ticketRef);

    // Messages
    const messagesQuery = useMemoFirebase(
        () => ticketRef ? query(collection(ticketRef, 'messages'), orderBy('timestamp', 'asc')) : null,
        [ticketRef]
    );
    const { data: messages, isLoading: areMessagesLoading } = useCollection<ChatMessage>(messagesQuery);

    // User Subscription (for purchase details)
    const userSubscriptionRef = useMemoFirebase(() => {
        if (!firestore || !ticket) return null;
        return doc(firestore, 'users', ticket.customerId, 'userSubscriptions', ticket.userSubscriptionId);
    }, [firestore, ticket]);
    const { data: userSubscription, isLoading: isUserSubscriptionLoading } = useDoc<UserSubscription>(userSubscriptionRef);

    // Seller Info
    const sellerRef = useMemoFirebase(() => {
        if (!firestore || !ticket) return null;
        return doc(firestore, 'users', ticket.sellerId);
    }, [firestore, ticket]);
    const { data: sellerData, isLoading: isSellerLoading } = useDoc<UserProfile>(sellerRef);

    // Plan info (for image)
    const planRef = useMemoFirebase(() => {
        if (!firestore || !ticket) return null;
        return doc(firestore, 'subscriptions', ticket.subscriptionId);
    }, [firestore, ticket]);
    const { data: plan, isLoading: isPlanLoading } = useDoc<Plan>(planRef);
    
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Reset unread counter when chat is opened
    useEffect(() => {
        if (!firestore || !ticket || !user || isTicketLoading) return;

        const userIsSeller = user.uid === ticket.sellerId;
        const userIsCustomer = user.uid === ticket.customerId;
        let updatePayload: { [key: string]: any } = {};
        
        if (userIsSeller && ticket.unreadBySellerCount > 0) {
            updatePayload = { unreadBySellerCount: 0 };
        } else if (userIsCustomer && ticket.unreadByCustomerCount > 0) {
            updatePayload = { unreadByCustomerCount: 0 };
        }
        
        if (Object.keys(updatePayload).length > 0) {
            const ticketDocRef = doc(firestore, 'tickets', ticket.id);
            updateDocumentNonBlocking(ticketDocRef, updatePayload);
        }

    }, [isTicketLoading, ticket, user, firestore]);

    const handleSendMessage = () => {
        if (!newMessage.trim() || !user || !ticket || !firestore) return;

        const messagesCollection = collection(firestore, 'tickets', ticket.id, 'messages');
        const messageData = {
            ticketId: ticket.id,
            senderId: user.uid,
            senderName: user.displayName,
            text: newMessage,
            timestamp: new Date().toISOString(),
        };
        addDocumentNonBlocking(messagesCollection, messageData);
        
        const ticketDocRef = doc(firestore, 'tickets', ticket.id);

        const isCustomer = user.uid === ticket.customerId;

        const updatePayload: { 
            lastMessageText: string; 
            lastMessageAt: string;
            unreadBySellerCount?: any;
            unreadByCustomerCount?: any;
        } = {
            lastMessageText: newMessage,
            lastMessageAt: new Date().toISOString(),
        };

        if (isCustomer) {
            updatePayload.unreadBySellerCount = increment(1);
        } else {
            updatePayload.unreadByCustomerCount = increment(1);
        }

        updateDocumentNonBlocking(ticketDocRef, updatePayload);
        
        setNewMessage('');
    };
    
    const isLoading = isUserLoading || isTicketLoading || areMessagesLoading || isUserSubscriptionLoading || isSellerLoading || isPlanLoading;

    if (isLoading) {
        return (
            <div className="container mx-auto max-w-4xl py-8 space-y-8">
                <Skeleton className="h-10 w-1/3" />
                <div className="grid md:grid-cols-3 gap-6">
                    <Skeleton className="h-48 md:col-span-1" />
                    <Skeleton className="h-32 md:col-span-2" />
                </div>
                <Skeleton className="h-[70vh] w-full" />
            </div>
        )
    }

    if (!ticket || !userSubscription) {
        return <div className="container p-4 text-center">Pedido não encontrado.</div>;
    }

    // Security check
    if (user && ticket && user.uid !== ticket.customerId && user.uid !== ticket.sellerId) {
        router.push('/seller/tickets');
        return <div className="container p-4 text-center">Acesso negado. Redirecionando...</div>;
    }
    
    return (
        <div className="container mx-auto max-w-4xl py-8">
            {/* Purchase Details Section */}
            <div className="mb-8 space-y-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/seller/tickets')}>
                        <ArrowLeft />
                    </Button>
                    <h1 className="text-2xl font-bold">Pedido #{ticket.userSubscriptionId.substring(0, 7).toUpperCase()}</h1>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-lg">Detalhes do Pedido</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Pedido:</span>
                                <span>#{ticket.userSubscriptionId.substring(0, 7).toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Data:</span>
                                <span>{new Date(userSubscription.startDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Comprador:</span>
                                <span className="font-medium">{ticket.customerName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Vendedor:</span>
                                {sellerData ? <SellerStatus seller={sellerData} /> : '...'}
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                                <span className="text-muted-foreground">Total:</span>
                                <span className="font-bold text-base">R$ {userSubscription.price.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Status:</span>
                                <Badge variant="secondary" className="bg-green-100 text-green-800">Pagamento Aprovado</Badge>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-lg">Produto</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                {plan?.bannerUrl && (
                                    <div className="relative w-24 h-16 rounded-md overflow-hidden flex-shrink-0">
                                        <Image
                                            src={plan.bannerUrl}
                                            alt={plan.name || 'Banner do plano'}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                )}
                                <div className="flex-grow">
                                    <p className="font-semibold">{ticket.serviceName} - {ticket.planName}</p>
                                    <p className="text-sm text-muted-foreground">{plan?.description}</p>
                                </div>
                                <Button asChild size="sm">
                                    <Link href={`/subscriptions/${userSubscription.serviceId}`}>Ver Anúncio</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Chat Section */}
            <Card className="flex flex-col h-[70vh]">
                <CardHeader className="flex flex-row items-center gap-4 border-b">
                    <Info className="h-5 w-5 text-primary" />
                    <div>
                        <CardTitle>Chat de Suporte e Entrega</CardTitle>
                        <CardDescription>Converse com o {user?.uid === ticket.customerId ? 'vendedor' : 'comprador'} aqui.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="text-center text-xs text-muted-foreground p-3 rounded-lg bg-muted/50 mb-4 border space-y-1">
                        <p>O dinheiro só será liberado para o vendedor em 7 dias para uma maior segurança entre ambos.</p>
                        <p>O suporte será prestado por esse chat!</p>
                    </div>
                    {messages?.map(msg => (
                        <ChatBubble key={msg.id} message={msg} isOwnMessage={msg.senderId === user?.uid} />
                    ))}
                    <div ref={chatEndRef} />
                </CardContent>
                <CardFooter className="p-4 border-t">
                    <form action={handleSendMessage} className="flex w-full items-center space-x-2">
                        <Input 
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            placeholder="Digite sua mensagem..."
                        />
                        <Button type="submit" disabled={!newMessage.trim()}>
                            <Send className="h-4 w-4" />
                            <span className="sr-only">Enviar</span>
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </div>
    );
}
