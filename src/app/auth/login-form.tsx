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
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z
    .string()
    .min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

interface LoginFormProps {
  setOpen?: (open: boolean) => void;
  setActiveTab?: (tab: 'login' | 'register') => void;
}

export function LoginForm({ setOpen, setActiveTab }: LoginFormProps) {
  const { toast } = useToast();
  const auth = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const { formState, handleSubmit } = form;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: 'Login bem-sucedido!',
        description: 'Bem-vindo(a) de volta.',
      });
      setOpen?.(false);
    } catch (error: any) {
      console.error("Login error:", error);
      let description = "Ocorreu um erro inesperado. Tente novamente.";
      if (error && typeof error === 'object' && 'code' in error) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            description = 'Email ou senha incorretos. Por favor, verifique e tente novamente.';
            break;
          case 'auth/invalid-email':
            description = 'O formato do email é inválido.';
            break;
          case 'auth/too-many-requests':
            description = 'Muitas tentativas de login. Por favor, tente novamente mais tarde.';
            break;
          default:
            description = 'Ocorreu um erro ao tentar fazer login.';
            break;
        }
      }
      toast({
        variant: "destructive",
        title: 'Falha no login',
        description: description,
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
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
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Entrar
        </Button>

        {setActiveTab && (
          <div className="text-center text-sm text-muted-foreground pt-2">
            Não tem uma conta?{' '}
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto"
              onClick={() => setActiveTab('register')}
            >
              Criar agora
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
