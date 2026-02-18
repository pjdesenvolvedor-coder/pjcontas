'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, setDocument, addDocument } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  phoneNumber: z.string().min(10, { message: 'Por favor, insira um número de contato válido.' }),
});

interface CompleteGoogleSignupFormProps {
  user: User;
  onComplete: () => void;
}

export function CompleteGoogleSignupForm({ user, onComplete }: CompleteGoogleSignupFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phoneNumber: '',
    },
  });

  const { formState, handleSubmit } = form;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) return;

    try {
        const formattedPhoneNumber = values.phoneNumber.replace(/\D/g, '');

        const userRef = doc(firestore, 'users', user.uid);
        const userData = {
            id: user.uid,
            email: user.email,
            firstName: user.displayName,
            photoURL: user.photoURL,
            phoneNumber: formattedPhoneNumber,
            registrationDate: new Date().toISOString(),
            role: 'customer',
        };
        const userDocPromise = setDocument(userRef, userData, { merge: false });

        let welcomeMessagePromise = Promise.resolve();
        if (formattedPhoneNumber) {
            const pendingMessagesRef = collection(firestore, 'pending_whatsapp_messages');
            welcomeMessagePromise = addDocument(pendingMessagesRef, {
                type: 'welcome',
                recipientPhoneNumber: formattedPhoneNumber,
                createdAt: new Date().toISOString(),
                data: {
                    customerName: user.displayName,
                    customerEmail: user.email,
                }
            });
        }
        
        await Promise.all([userDocPromise, welcomeMessagePromise]);

        toast({
            title: 'Cadastro Concluído!',
            description: 'Sua conta foi criada com sucesso.',
        });
        
        onComplete();

    } catch (error) {
        console.error("Google Signup completion error:", error);
        toast({
            variant: "destructive",
            title: 'Falha ao concluir cadastro',
            description: 'Não foi possível salvar suas informações. Tente novamente.',
        });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormItem>
            <FormLabel>Nome</FormLabel>
            <FormControl>
                <Input readOnly value={user.displayName || ''} className="cursor-not-allowed bg-muted/50"/>
            </FormControl>
        </FormItem>
        <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
                <Input type="email" readOnly value={user.email || ''} className="cursor-not-allowed bg-muted/50"/>
            </FormControl>
        </FormItem>
        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número para Contato</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="(00) 00000-0000" {...field} autoFocus />
              </FormControl>
               <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-primary" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar e Continuar
        </Button>
      </form>
    </Form>
  );
}
