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
import { useAuth, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { initiateEmailSignUp } from '@/firebase/non-blocking-login';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc } from 'firebase/firestore';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z
    .string()
    .min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

interface SignupFormProps {
  setOpen: (open: boolean) => void;
}

export function SignupForm({ setOpen }: SignupFormProps) {
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const unsubscribe = onAuthStateChanged(auth, (newUser) => {
      // We only want to act on the successful creation of a user with a matching email
      if (newUser && newUser.email === values.email && !newUser.displayName) {
        unsubscribe(); // Unsubscribe to avoid running this for other auth state changes
        
        // 1. Update user profile
        updateProfile(newUser, { displayName: values.name }).catch(err => console.error("Update profile error", err));

        // 2. Create user document in Firestore
        const userRef = doc(firestore, 'users', newUser.uid);
        const userData = {
            id: newUser.uid,
            email: values.email,
            name: values.name,
            registrationDate: new Date().toISOString(),
        };
        setDocumentNonBlocking(userRef, userData, { merge: false });
        
        toast({
            title: 'Conta Criada!',
            description: 'Você já pode usar o StreamShare.',
        });
        
        setOpen(false);
      }
    });

    initiateEmailSignUp(auth, values.email, values.password);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="name"
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
