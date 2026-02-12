'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  useUser,
  useFirestore,
  useMemoFirebase,
  useDoc,
  updateDocumentNonBlocking,
  useAuth,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import { useState } from 'react';
import { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { updateProfile } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

const userProfileSchema = z.object({
  firstName: z
    .string()
    .min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  phoneNumber: z.string().min(10, 'Insira um número de contato válido.'),
  photoURL: z.string().optional(),
  sellerUsername: z.string().optional(),
});


function UserProfileCard({
  userProfile,
  userId,
}: {
  userProfile: UserProfile;
  userId: string;
}) {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(
    userProfile.photoURL || null
  );

  const form = useForm<z.infer<typeof userProfileSchema>>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      firstName: userProfile.firstName || '',
      phoneNumber: userProfile.phoneNumber || '',
      photoURL: userProfile.photoURL || '',
      sellerUsername: userProfile.sellerUsername || '',
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        form.setValue('photoURL', result, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  function onSubmit(values: z.infer<typeof userProfileSchema>) {
    if (!firestore || !userId || !user) return;
    const userRef = doc(firestore, 'users', userId);

    const formattedPhoneNumber = values.phoneNumber?.replace(/\D/g, '');

    const updateData: Partial<UserProfile> = {
      firstName: values.firstName,
      phoneNumber: formattedPhoneNumber,
      photoURL: values.photoURL,
    };
    if (userProfile.role === 'seller') {
      updateData.sellerUsername = values.sellerUsername;
    }

    // Update Firestore document
    updateDocumentNonBlocking(userRef, updateData);

    // Update Auth profile
    if (
      user &&
      (values.photoURL !== user.photoURL ||
        values.firstName !== user.displayName)
    ) {
      updateProfile(user, { photoURL: values.photoURL, displayName: values.firstName });
    }

    toast({
      title: 'Perfil atualizado!',
      description: 'Suas informações foram salvas.',
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações Pessoais</CardTitle>
        <CardDescription>
          Gerencie suas informações e, se for vendedor, seu perfil público.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={imagePreview || user?.photoURL || undefined} />
                  <AvatarFallback>{userProfile.firstName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <Input
                  id="photo-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('photo-upload')?.click()}
                >
                  Alterar Foto
                </Button>
              </div>
              <div className="flex-grow w-full space-y-4">
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
              </div>
            </div>
            
             {userProfile.role === 'seller' && (
                <FormField
                    control={form.control}
                    name="sellerUsername"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nome de Usuário (Público)</FormLabel>
                        <FormControl>
                        <Input placeholder="SeuNomeDeVendedor" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
             )}

            <FormField
              control={form.control}
              name="photoURL"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full sm:w-auto"
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                'Salvar Perfil'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}


export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, `users/${user.uid}`) : null),
    [user?.uid, firestore]
  );
  const { data: userProfile, isLoading: isUserProfileLoading } =
    useDoc<UserProfile>(userDocRef);

  const isLoading = isUserLoading || isUserProfileLoading;

  return (
    <div className="container mx-auto max-w-5xl py-12 px-4 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl md:text-4xl font-bold font-headline text-primary">
            Minha Conta
          </h1>
          <p className="mt-2 text-base md:text-lg text-muted-foreground">
            Bem-vindo de volta! Aqui você pode gerenciar suas informações.
          </p>
        </header>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : user && userProfile ? (
            <UserProfileCard userProfile={userProfile} userId={user.uid} />
        ) : (
             <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">
                  Faça login para ver suas informações.
                </p>
            </div>
        )}
      </div>
    </div>
  );
}
