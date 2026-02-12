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
import { useAuth, useFirestore, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { initiateEmailSignUp } from '@/firebase/non-blocking-login';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, collection } from 'firebase/firestore';

const formSchema = z.object({
  firstName: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
  phoneNumber: z.string().min(10, { message: 'Por favor, insira um número de contato válido.' }),
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z
    .string()
    .min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

interface SignupFormProps {
  setOpen?: (open: boolean) => void;
}

export function SignupForm({ setOpen }: SignupFormProps) {
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      phoneNumber: '',
      email: '',
      password: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const unsubscribe = onAuthStateChanged(auth, (newUser) => {
      // We only want to act on the successful creation of a user with a matching email
      if (newUser && newUser.email === values.email && !newUser.displayName) {
        unsubscribe(); // Unsubscribe to avoid running this for other auth state changes
        
        const displayName = values.firstName;
        const formattedPhoneNumber = values.phoneNumber.replace(/\D/g, '');

        // 1. Update user profile in Auth
        updateProfile(newUser, { displayName }).catch(err => console.error("Update profile error", err));

        // 2. Create user document in Firestore
        const userRef = doc(firestore, 'users', newUser.uid);
        const userData = {
            id: newUser.uid,
            email: values.email,
            firstName: values.firstName,
            phoneNumber: formattedPhoneNumber,
            registrationDate: new Date().toISOString(),
            role: 'customer',
        };
        setDocumentNonBlocking(userRef, userData, { merge: false });
        
        // 3. Queue welcome message
        if (formattedPhoneNumber) {
            const pendingMessagesRef = collection(firestore, 'pending_whatsapp_messages');
            addDocumentNonBlocking(pendingMessagesRef, {
                type: 'welcome',
                recipientPhoneNumber: formattedPhoneNumber,
                createdAt: new Date().toISOString(),
                data: {
                    customerName: values.firstName,
                    customerEmail: values.email,
                }
            });
        }

        toast({
            title: 'Conta Criada!',
            description: 'Você já pode usar a PJ Contas.',
        });
        
        setOpen?.(false);
      }
    });

    initiateEmailSignUp(auth, values.email, values.password);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Seu Nome" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número para Contato</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="(00) 00000-0000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-accent hover:bg-accent/90">
          Criar Conta
        </Button>
      </form>
    </Form>
  );
}
