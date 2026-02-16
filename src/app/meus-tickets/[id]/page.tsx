'use client';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy, increment } from 'firebase/firestore';
import { useEffect, useRef, useState, useMemo, useLayoutEffect } from 'react';
import type { Ticket, ChatMessage, UserSubscription, Plan, UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, ArrowLeft, Info, Phone, Copy, Loader2, CheckCircle, QrCode, Upload, Paperclip, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { generatePixAction, checkPixStatusAction } from '@/app/checkout/actions';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type PixDetails = {
  id: string;
  qr_code: string;
  qr_code_base64: string;
};

function MediaUploadPrompt({ ticket, seller, requestMessage }: { ticket: Ticket, seller: UserProfile, requestMessage: string }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const ticketId = ticket.id;

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user || !firestore || !seller) return;

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({ variant: 'destructive', title: 'Arquivo muito grande', description: 'Por favor, envie um arquivo menor que 5MB.' });
            return;
        }

        setIsUploading(true);

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const imageUrl = reader.result as string;

            const messagesCollection = collection(firestore, 'tickets', ticketId, 'messages');
            
            // Customer's media response
            const customerMessageData: Omit<ChatMessage, 'id'> = {
                ticketId: ticketId,
                senderId: user.uid,
                senderName: user.displayName,
                text: ``, // No text needed for the image itself
                timestamp: new Date().toISOString(),
                type: 'media_response',
                payload: { imageUrl }
            };
            addDocumentNonBlocking(messagesCollection, customerMessageData);

            const ticketDocRef = doc(firestore, 'tickets', ticketId);
            const initialUpdatePayload = {
                lastMessageText: 'O cliente enviou uma imagem.',
                lastMessageAt: new Date().toISOString(),
                unreadBySellerCount: increment(1),
            };
            updateDocumentNonBlocking(ticketDocRef, initialUpdatePayload);
            
            toast({ title: "Mídia enviada com sucesso!" });
            
            // Send automatic message from seller after a delay
            setTimeout(() => {
                const sellerMessageData: Omit<ChatMessage, 'id'> = {
                    ticketId: ticketId,
                    senderId: seller.id,
                    senderName: seller.sellerUsername || seller.firstName,
                    text: 'Foto recebida. Aguarde, estamos analisando.',
                    timestamp: new Date().toISOString(),
                    type: 'text'
                };
                addDocumentNonBlocking(messagesCollection, sellerMessageData);

                // Update ticket again with the seller's auto-reply
                const finalUpdatePayload = {
                    lastMessageText: sellerMessageData.text,
                    lastMessageAt: sellerMessageData.timestamp,
                    unreadByCustomerCount: increment(1), // Notify customer of the new message
                };
                updateDocumentNonBlocking(ticketDocRef, finalUpdatePayload);

            }, 1500);

            setIsUploading(false);
        };
        reader.onerror = (error) => {
            console.error("File reading error:", error);
            toast({ variant: 'destructive', title: 'Erro ao ler arquivo', description: 'Não foi possível processar o arquivo. Tente novamente.' });
            setIsUploading(false);
        }
    };

    return (
        <div className="flex justify-start my-2">
             <Card className="bg-muted border-dashed max-w-md">
                <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                    <p className="text-sm text-muted-foreground font-medium">{requestMessage}</p>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {isUploading ? 'Enviando...' : 'Enviar Mídia'}
                    </Button>
                </CardContent>
            </Card>
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

    // Renewal State
    const [isRenewing, setIsRenewing] = useState(false);
    const [renewalPixDetails, setRenewalPixDetails] = useState<PixDetails | null>(null);
    const [renewalPaymentStatus, setRenewalPaymentStatus] = useState('pending');


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

    const activeMediaRequest = useMemo(() => {
        if (!messages || !user) return null;
    
        // Find all media requests sent by the other party (the seller)
        const mediaRequests = messages.filter(m => m.type === 'media_request' && m.senderId !== user.uid);
        if (mediaRequests.length === 0) return null;
    
        // Get the last one
        const lastRequest = mediaRequests[mediaRequests.length - 1];
    
        // Check if there is a media_response from the customer after this last request
        const hasResponse = messages.some(m => 
            m.type === 'media_response' && 
            m.senderId === user.uid && 
            new Date(m.timestamp) > new Date(lastRequest.timestamp)
        );
    
        // If there's already a response, the request is not active
        if (hasResponse) {
            return null;
        }
    
        // Otherwise, this is the active, unfulfilled request
        return lastRequest;
    }, [messages, user]);
    
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
        } else {
            updatePayload.unreadByCustomerCount = increment(1);
        }

        updateDocumentNonBlocking(ticketDocRef, updatePayload);
        
        setNewMessage('');
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    };

    const isExpired = userSubscription ? new Date() > new Date(userSubscription.endDate) : false;
    
    const handleRenew = async () => {
        if (!userSubscription) return;
        setIsRenewing(true);
        setRenewalPaymentStatus('pending');
        setRenewalPixDetails(null);

        const valueInCents = Math.round(userSubscription.price * 100);
        const pixResult = await generatePixAction(valueInCents);
        
        if (pixResult.error || !pixResult.id || !pixResult.qr_code || !pixResult.qr_code_base64) {
             toast({
                variant: 'destructive',
                title: 'Erro ao gerar PIX para renovação',
                description: pixResult.error || 'Não foi possível obter os detalhes do PIX.'
            });
            setIsRenewing(false);
            return;
        }
        
        setRenewalPixDetails({
            id: pixResult.id,
            qr_code: pixResult.qr_code,
            qr_code_base64: pixResult.qr_code_base64
        });
    };

    useEffect(() => {
        if (!renewalPixDetails?.id || renewalPaymentStatus === 'paid' || !isRenewing) {
          return;
        }

        const intervalId = setInterval(async () => {
          const result = await checkPixStatusAction(renewalPixDetails.id);
          if (result.status === 'paid') {
            setRenewalPaymentStatus('paid');
            clearInterval(intervalId);
          }
        }, 5000);

        return () => clearInterval(intervalId);
    }, [renewalPixDetails, renewalPaymentStatus, isRenewing]);
    
    useEffect(() => {
        if (renewalPaymentStatus === 'paid' && firestore && userSubscriptionRef && ticketRef) {
            
            const newEndDate = new Date();
            newEndDate.setDate(newEndDate.getDate() + 30);

            updateDocumentNonBlocking(userSubscriptionRef, { endDate: newEndDate.toISOString() });
            
            const messagesCollection = collection(firestore, 'tickets', ticketRef.id, 'messages');
            const renewalMessage = {
                ticketId: ticketRef.id,
                senderId: 'system',
                senderName: 'Sistema',
                text: `✅ Assinatura renovada com sucesso! Novo vencimento em ${newEndDate.toLocaleDateString('pt-BR')}.`,
                timestamp: new Date().toISOString(),
            };
            addDocumentNonBlocking(messagesCollection, renewalMessage);

            const ticketUpdatePayload = {
                lastMessageText: 'Assinatura renovada com sucesso!',
                lastMessageAt: new Date().toISOString(),
                unreadBySellerCount: increment(1),
                unreadByCustomerCount: 0, 
            };
            updateDocumentNonBlocking(ticketRef, ticketUpdatePayload);

            toast({
                title: 'Assinatura Renovada!',
                description: 'Seu acesso foi reestabelecido.',
            });
            setIsRenewing(false);
            setRenewalPixDetails(null);
            setRenewalPaymentStatus('pending');
        }
    }, [renewalPaymentStatus, firestore, userSubscriptionRef, ticketRef, toast]);
    
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Código PIX copiado!" });
    };

    const isLoading = isUserLoading || isTicketLoading || areMessagesLoading || isUserSubscriptionLoading || isSellerLoading || isPlanLoading || isCustomerLoading;

    function ChatBubble({ message, isOwnMessage, onViewImage }: { message: ChatMessage; isOwnMessage: boolean; onViewImage: (url: string) => void; }) {
        const isSystemMessage = message.senderId === 'system';
        
        if (isSystemMessage) {
            return (
                <div className="text-center text-xs text-muted-foreground p-2 my-2 rounded-md bg-muted/50 border">
                    {message.text}
                </div>
            )
        }
    
        // This is the customer view.
        if (message.type === 'media_request') {
            if (activeMediaRequest?.id === message.id) {
                if (!ticket || !sellerData) {
                    return (
                        <div className="flex justify-start my-2">
                             <Card className="bg-muted border-dashed max-w-md">
                                <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </CardContent>
                            </Card>
                        </div>
                    );
                }
                return <MediaUploadPrompt ticket={ticket} seller={sellerData} requestMessage={message.text} />;
            }
            // For older/fulfilled requests, just show the message text in a standard bubble.
            return (
                <div className={cn("flex items-end gap-2", "justify-start")}>
                     <Avatar className="h-8 w-8"><AvatarFallback>{message.senderName?.charAt(0) || 'S'}</AvatarFallback></Avatar>
                    <div className="max-w-md rounded-lg px-4 py-3 bg-muted border">
                        <div className="flex items-center gap-3 text-muted-foreground">
                            <Paperclip className="h-5 w-5" />
                            <p className="text-sm font-medium">{message.text}</p>
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
                    {!isOwnMessage && ( <Avatar className="h-8 w-8"><AvatarFallback>{message.senderName?.charAt(0) || 'S'}</AvatarFallback></Avatar> )}
                    <div className={cn("max-w-xs md:max-w-sm rounded-lg p-2", isOwnMessage ? "bg-primary" : "bg-muted")}>
                        {message.text && <p className={cn("text-sm mb-2 px-1", isOwnMessage ? "text-primary-foreground" : "")}>{message.text}</p>}
                        <div onClick={() => onViewImage(imageUrl)} className="cursor-pointer">
                            <Image src={imageUrl} alt="Mídia enviada" width={250} height={250} className="rounded-md object-cover" unoptimized />
                        </div>
                        <p className="text-xs text-right mt-1 opacity-70 px-1">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    {isOwnMessage && ( <Avatar className="h-8 w-8"><AvatarFallback>{user?.displayName?.charAt(0) || 'C'}</AvatarFallback></Avatar> )}
                </div>
            )
        }
    
        // Default text bubble
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
                        <AvatarFallback>{user?.displayName?.charAt(0) || 'C'}</AvatarFallback>
                    </Avatar>
                )}
            </div>
        );
    }

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
        router.push('/meus-tickets');
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

            <Dialog open={isRenewing && !!renewalPixDetails} onOpenChange={(open) => { if(!open) setIsRenewing(false)}}>
                <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><QrCode /> Renovar com PIX</DialogTitle>
                        <DialogDescription>Escaneie ou copie o código para renovar sua assinatura.</DialogDescription>
                    </DialogHeader>
                    {renewalPaymentStatus === 'pending' && renewalPixDetails ? (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div className="p-4 bg-white rounded-lg border">
                                <Image src={renewalPixDetails.qr_code_base64} alt="PIX QR Code" width={200} height={200} unoptimized />
                            </div>
                            <p className="text-sm text-muted-foreground">Aguardando pagamento...</p>
                            <div className="w-full space-y-2">
                                <Label htmlFor="pix-code" className="sr-only">PIX Copia e Cola</Label>
                                <div className="flex items-center gap-2">
                                    <Input id="pix-code" readOnly value={renewalPixDetails.qr_code} onClick={() => copyToClipboard(renewalPixDetails.qr_code)} className="truncate cursor-pointer" />
                                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(renewalPixDetails.qr_code)}><Copy className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </div>
                    ) : renewalPaymentStatus === 'paid' ? (
                         <div className="flex flex-col items-center gap-4 py-8 text-center">
                            <CheckCircle className="h-16 w-16 text-green-600" />
                            <h3 className="text-xl font-bold">Pagamento Aprovado!</h3>
                            <p className="text-muted-foreground">Reativando sua assinatura...</p>
                            <Loader2 className="h-8 w-8 animate-spin text-primary mt-2" />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 py-8 text-center">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="text-muted-foreground">Gerando PIX...</p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRenewing(false)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Purchase Details Section */}
            <div className="mb-8 space-y-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/meus-tickets')}>
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
                            <h3 className="text-2xl font-bold text-destructive">Sua Assinatura Venceu</h3>
                            <p className="text-muted-foreground">Renove para continuar conversando e manter seu acesso.</p>
                            <Button onClick={handleRenew} disabled={isRenewing}>
                                {isRenewing ? <Loader2 className="animate-spin" /> : "Renovar Assinatura"}
                            </Button>
                        </div>
                    )}
                </div>
                <CardFooter className="p-4 border-t">
                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex w-full items-center space-x-2">
                        <Textarea 
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={isExpired ? "Renove para enviar mensagens" : "Digite sua mensagem..."}
                            disabled={isExpired || !user}
                            rows={1}
                            className="resize-none"
                        />
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
