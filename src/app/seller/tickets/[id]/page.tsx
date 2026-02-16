'use client';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy, increment } from 'firebase/firestore';
import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import type { Ticket, ChatMessage, UserSubscription, Plan, UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, ArrowLeft, Info, Phone, AlertCircle, Paperclip, Loader2, Upload, X, LifeBuoy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const supportSchema = z.object({
  email: z.string().email("Por favor, insira um email válido."),
  password: z.string().min(1, "A senha é obrigatória."),
});

type SupportFormData = z.infer<typeof supportSchema>;

function SupportDialog({ 
    isOpen, 
    onClose, 
    onSubmit,
    productName 
} : { 
    isOpen: boolean; 
    onClose: () => void; 
    onSubmit: (data: SupportFormData) => void;
    productName: string;
}) {
    const form = useForm<SupportFormData>({
        resolver: zodResolver(supportSchema),
        defaultValues: { email: '', password: '' }
    });
    
    const { formState: { isSubmitting }, handleSubmit, control } = form;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>Enviar Acesso de Suporte</DialogTitle>
                    <DialogDescription>
                        Forneça os dados de acesso para o produto: <span className="font-bold">{productName}</span>.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email de Acesso</FormLabel>
                                    <FormControl><Input placeholder="email@exemplo.com" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Senha de Acesso</FormLabel>
                                    <FormControl><Input type="text" placeholder="senha" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Enviar Mensagem
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function ChatBubble({ message, isOwnMessage, onViewImage }: { message: ChatMessage; isOwnMessage: boolean; onViewImage: (url: string) => void; }) {
    const isSystemMessage = message.senderId === 'system';
    
    if (isSystemMessage) {
        return (
            <div className="text-center text-xs text-muted-foreground p-2 my-2 rounded-md bg-muted/50 border">
                {message.text}
            </div>
        )
    }

    // This is the seller view.
    if (message.type === 'media_request') { // Requests are always from the seller in this view
         return (
            <div className="flex justify-end my-2">
                <div className="max-w-md rounded-lg px-4 py-3 bg-muted border">
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <Paperclip className="h-5 w-5" />
                        <p className="text-sm font-medium">Você solicitou uma mídia ao cliente.</p>
                    </div>
                     <p className="text-xs text-right mt-1 opacity-70">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
            </div>
        )
    }

    // Media response from either party
    if (message.type === 'media_response' && message.payload?.imageUrl) {
        const imageUrl = message.payload.imageUrl;
        return (
            <div className={cn("flex items-end gap-2", isOwnMessage ? "justify-end" : "justify-start")}>
                {!isOwnMessage && ( <Avatar className="h-8 w-8"><AvatarFallback>{message.senderName?.charAt(0) || 'C'}</AvatarFallback></Avatar> )}
                <div className={cn("max-w-xs md:max-w-sm rounded-lg p-2", isOwnMessage ? "bg-primary" : "bg-muted")}>
                    <div onClick={() => onViewImage(imageUrl)} className="cursor-pointer">
                        <Image src={imageUrl} alt="Mídia enviada" width={250} height={250} className="rounded-md object-cover" unoptimized />
                    </div>
                    {message.text && <p className={cn("text-sm mt-2 px-1", isOwnMessage ? "text-primary-foreground" : "")}>{message.text}</p>}
                    <p className="text-xs text-right mt-1 opacity-70 px-1">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                {isOwnMessage && ( <Avatar className="h-8 w-8"><AvatarFallback>{message.senderName?.charAt(0) || 'V'}</AvatarFallback></Avatar> )}
            </div>
        )
    }

    // Default text bubble
    return (
        <div className={cn("flex items-end gap-2", isOwnMessage ? "justify-end" : "justify-start")}>
            {!isOwnMessage && (
                <Avatar className="h-8 w-8">
                    <AvatarFallback>{message.senderName?.charAt(0) || 'C'}</AvatarFallback>
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
            <span className="font-medium">{seller.sellerUsername || seller.firstName}</span>
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
    const { toast } = useToast();
    const [newMessage, setNewMessage] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);

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

     // Customer Info
    const customerRef = useMemoFirebase(() => (ticket ? doc(firestore, 'users', ticket.customerId) : null), [ticket, firestore]);
    const { data: customerData, isLoading: isCustomerLoading } = useDoc<UserProfile>(customerRef);

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
    
    useLayoutEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
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
            type: 'text' as const,
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
        } else { // Seller is sending
            updatePayload.unreadByCustomerCount = increment(1);

            // Send WhatsApp notification if customer is offline
            if (customerData) {
                const fiveMinutesAgo = new Date().getTime() - (5 * 60 * 1000);
                const lastSeenTime = customerData.lastSeen ? new Date(customerData.lastSeen).getTime() : 0;
                
                const isCustomerOnline = lastSeenTime > fiveMinutesAgo;

                if (!isCustomerOnline && customerData.phoneNumber) {
                    const pendingMessagesRef = collection(firestore, 'pending_whatsapp_messages');
                    addDocumentNonBlocking(pendingMessagesRef, {
                        type: 'ticket_notification',
                        recipientPhoneNumber: customerData.phoneNumber,
                        createdAt: new Date().toISOString(),
                        data: {
                            customerName: customerData.firstName,
                            sellerName: sellerData?.firstName || user.displayName,
                            ticketId: ticket.id,
                        }
                    });
                }
            }
        }

        updateDocumentNonBlocking(ticketDocRef, updatePayload);
        
        setNewMessage('');
    };

    const handleSendSupportMessage = (data: SupportFormData) => {
        if (!user || !ticket || !firestore) return;
    
        const productName = ticket.serviceName || "Produto";
        const messageText = `🔴 ${productName.toUpperCase()} SUPORTE🔴\n\n> ✉️ Email: ${data.email}\n> 🔑 Senha: ${data.password}\n\n🚨 Proibido altera senha da conta ou dos perfis 🚨`;
    
        const messagesCollection = collection(firestore, 'tickets', ticket.id, 'messages');
        const messageData = {
            ticketId: ticket.id,
            senderId: user.uid,
            senderName: user.displayName,
            text: messageText,
            timestamp: new Date().toISOString(),
            type: 'text' as const,
        };
        addDocumentNonBlocking(messagesCollection, messageData);
        
        const ticketDocRef = doc(firestore, 'tickets', ticket.id);
    
        const updatePayload = {
            lastMessageText: `Acesso de suporte enviado para ${productName}.`,
            lastMessageAt: new Date().toISOString(),
            unreadByCustomerCount: increment(1),
        };
    
        updateDocumentNonBlocking(ticketDocRef, updatePayload);
        
        toast({
            title: "Mensagem de suporte enviada!",
            description: "Os dados de acesso foram enviados ao cliente.",
        });
    
        setIsSupportDialogOpen(false);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    };

    const handleRequestMedia = () => {
        if (!user || !ticket || !firestore) return;

        const messagesCollection = collection(firestore, 'tickets', ticket.id, 'messages');
        const messageData: Omit<ChatMessage, 'id'> = {
            ticketId: ticket.id,
            senderId: user.uid,
            senderName: user.displayName,
            text: 'O vendedor solicitou uma foto do erro para melhor suporte.',
            timestamp: new Date().toISOString(),
            type: 'media_request',
        };
        addDocumentNonBlocking(messagesCollection, messageData);
        
        const ticketDocRef = doc(firestore, 'tickets', ticket.id);
        const updatePayload = {
            lastMessageText: 'Você solicitou um anexo ao cliente.',
            lastMessageAt: new Date().toISOString(),
            unreadByCustomerCount: increment(1),
        };
        updateDocumentNonBlocking(ticketDocRef, updatePayload);
        
        toast({ title: "Solicitação enviada", description: "O cliente foi notificado para enviar uma mídia." });
    };
    
    const isLoading = isUserLoading || isTicketLoading || areMessagesLoading || isUserSubscriptionLoading || isSellerLoading || isPlanLoading || isCustomerLoading;
    const isExpired = userSubscription ? new Date() > new Date(userSubscription.endDate) : false;

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

    const isSellerView = user?.uid === ticket.sellerId;
    
    return (
        <div className="container mx-auto max-w-4xl py-8">
            <Dialog open={!!viewingImage} onOpenChange={(open) => !open && setViewingImage(null)}>
                <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-w-4xl w-auto p-0 bg-transparent border-none">
                    {viewingImage && <Image src={viewingImage} alt="Mídia em tela cheia" width={1200} height={800} className="w-full h-auto object-contain rounded-lg" unoptimized />}
                </DialogContent>
            </Dialog>

            <SupportDialog 
                isOpen={isSupportDialogOpen}
                onClose={() => setIsSupportDialogOpen(false)}
                onSubmit={handleSendSupportMessage}
                productName={ticket?.serviceName || ''}
            />

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
                            {isSellerView && customerData?.phoneNumber && (
                                <div className="flex justify-between items-center text-primary font-medium pt-2 border-t mt-2">
                                    <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> Contato:</span>
                                    <span>{customerData.phoneNumber}</span>
                                </div>
                            )}
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
                <div ref={chatContainerRef} className="relative flex-1 overflow-y-auto">
                    <CardContent className="p-4 space-y-4">
                        <div className="text-center text-xs text-muted-foreground p-3 rounded-lg bg-muted/50 mb-4 border space-y-1">
                            <p>O dinheiro só será liberado para o vendedor em 7 dias para uma maior segurança entre ambos.</p>
                            <p>O suporte será prestado por esse chat!</p>
                        </div>
                        {messages?.map(msg => (
                            <ChatBubble key={msg.id} message={msg} isOwnMessage={msg.senderId === user?.uid} onViewImage={setViewingImage} />
                        ))}
                    </CardContent>
                    
                    {isExpired && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 gap-4 p-4 text-center">
                            <AlertCircle className="w-12 h-12 text-destructive"/>
                            <h3 className="text-xl font-bold text-destructive">Assinatura Vencida</h3>
                            <p className="text-muted-foreground">O chat está bloqueado pois a assinatura do cliente expirou. Aguardando renovação.</p>
                        </div>
                    )}
                </div>

                <CardFooter className="p-4 border-t">
                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex w-full items-center space-x-2">
                        <Textarea 
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={isExpired ? "Chat bloqueado até a renovação" : "Digite sua mensagem..."}
                            disabled={isExpired || !user}
                            rows={1}
                            className="resize-none"
                        />
                         {isSellerView && (
                            <Button type="button" variant="outline" size="icon" onClick={() => setIsSupportDialogOpen(true)} disabled={isExpired || !user} title="Enviar Acesso de Suporte">
                                <LifeBuoy className="h-4 w-4" />
                                <span className="sr-only">Enviar Acesso de Suporte</span>
                            </Button>
                        )}
                         {isSellerView && (
                            <Button type="button" variant="outline" size="icon" onClick={handleRequestMedia} disabled={isExpired || !user} title="Solicitar Mídia">
                                <Paperclip className="h-4 w-4" />
                                <span className="sr-only">Solicitar Mídia</span>
                            </Button>
                        )}
                        <Button type="submit" disabled={!newMessage.trim() || isExpired || !user}>
                            <Send className="h-4 w-4" />
                            <span className="sr-only">Enviar</span>
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </div>
    );
}
