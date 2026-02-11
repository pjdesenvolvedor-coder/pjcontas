'use client';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import type { Ticket, ChatMessage } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

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
                <p className="text-sm">{message.text}</p>
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

export default function TicketChatPage() {
    const router = useRouter();
    const params = useParams();
    const ticketId = params.id as string;
    
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    const ticketRef = useMemoFirebase(() => (firestore && ticketId) ? doc(firestore, 'tickets', ticketId) : null, [firestore, ticketId]);
    const { data: ticket, isLoading: isTicketLoading } = useDoc<Ticket>(ticketRef);

    const messagesQuery = useMemoFirebase(
        () => ticketRef ? query(collection(ticketRef, 'messages'), orderBy('timestamp', 'asc')) : null,
        [ticketRef]
    );
    const { data: messages, isLoading: areMessagesLoading } = useCollection<ChatMessage>(messagesQuery);
    
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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
        updateDocumentNonBlocking(ticketDocRef, {
            lastMessageText: newMessage,
            lastMessageAt: new Date().toISOString(),
        });
        
        setNewMessage('');
    };
    
    const isLoading = isUserLoading || isTicketLoading || areMessagesLoading;

    if (isLoading) {
        return <div className="container p-4"><Skeleton className="h-[80vh] w-full" /></div>
    }

    if (!ticket) {
        return <div className="container p-4 text-center">Ticket não encontrado.</div>;
    }

    // Security check
    if (user && ticket && user.uid !== ticket.customerId && user.uid !== ticket.sellerId) {
        router.push('/meus-tickets');
        return <div className="container p-4 text-center">Acesso negado. Redirecionando...</div>;
    }
    
    return (
        <div className="container mx-auto max-w-3xl py-8">
            <Card className="flex flex-col h-[85vh]">
                <CardHeader className="flex flex-row items-center gap-4 border-b">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/meus-tickets')}>
                        <ArrowLeft />
                    </Button>
                    <div>
                        <CardTitle>{ticket.serviceName} - {ticket.planName}</CardTitle>
                        <CardDescription>Ticket #{ticket.id.substring(0, 6)}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
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
