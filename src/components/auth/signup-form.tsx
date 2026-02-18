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
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, collection, setDoc, addDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { Loader2 } from 'lucide-react';

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
  setActiveTab?: (tab: string) => void;
}

export function SignupForm({ setOpen, setActiveTab }: SignupFormProps) {
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

  const { formState, handleSubmit } = form;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const newUser = userCredential.user;

        const displayName = values.firstName;
        const formattedPhoneNumber = values.phoneNumber.replace(/\D/g, '');

        // 1. Update user profile in Auth
        const profileUpdatePromise = updateProfile(newUser, { displayName });

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
        const userDocPromise = setDoc(userRef, userData, { merge: false });
        
        // 3. Queue welcome message
        let welcomeMessagePromise = Promise.resolve();
        if (formattedPhoneNumber) {
            const pendingMessagesRef = collection(firestore, 'pending_whatsapp_messages');
            welcomeMessagePromise = addDoc(pendingMessagesRef, {
                type: 'welcome',
                recipientPhoneNumber: formattedPhoneNumber,
                createdAt: new Date().toISOString(),
                data: {
                    customerName: values.firstName,
                    customerEmail: values.email,
                }
            });
        }
        
        await Promise.all([profileUpdatePromise, userDocPromise, welcomeMessagePromise]);

        toast({
            title: 'Conta Criada!',
            description: 'Você já pode usar a PJ Contas.',
        });
        
        setOpen?.(false);

    } catch (error) {
        console.error("Signup error:", error);
        let description = "Ocorreu um erro inesperado. Tente novamente.";
        if (error instanceof FirebaseError) {
            switch (error.code) {
                case 'auth/email-already-in-use':
                    description = 'Este endereço de email já está em uso.';
                    break;
                case 'auth/invalid-email':
                    description = 'O endereço de email fornecido é inválido.';
                    break;
                case 'auth/weak-password':
                    description = 'A senha é muito fraca. Tente uma mais forte.';
                    break;
                default:
                    description = 'Ocorreu um erro ao criar a conta.';
                    break;
            }
        }
        toast({
            variant: "destructive",
            title: 'Falha no cadastro',
            description: description,
        });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
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
        <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Criar Conta
        </Button>
        {setActiveTab && (
          <div className="text-center text-sm text-muted-foreground pt-2">
            Já tem uma conta?{' '}
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto"
              onClick={() => setActiveTab('login')}
            >
              Entrar agora
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
