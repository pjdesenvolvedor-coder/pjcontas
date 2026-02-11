'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tv, Calendar, CheckCircle, Loader2 } from 'lucide-react';
import {
  useUser,
  useCollection,
  useFirestore,
  useMemoFirebase,
  useDoc,
  updateDocumentNonBlocking,
  useAuth,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Plan, UserProfile } from '@/lib/types';
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

// Represents a user's subscription enriched with plan details.
type EnrichedUserSubscription = {
  id: string;
  planName: string;
  serviceName: string;
  nextBilling: string;
  logoUrl?: string; // assuming service details will be fetched
};

const sellerProfileSchema = z.object({
  sellerUsername: z
    .string()
    .min(3, 'O nome de usuário deve ter pelo menos 3 caracteres.')
    .max(20, 'O nome de usuário não pode ter mais de 20 caracteres.'),
  photoURL: z.string().optional(),
});

function SellerProfileCard({
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

  const form = useForm<z.infer<typeof sellerProfileSchema>>({
    resolver: zodResolver(sellerProfileSchema),
    defaultValues: {
      sellerUsername: userProfile.sellerUsername || '',
      photoURL: userProfile.photoURL || '',
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

  function onSubmit(values: z.infer<typeof sellerProfileSchema>) {
    if (!firestore || !userId || !user) return;
    const userRef = doc(firestore, 'users', userId);

    // Update Firestore document
    updateDocumentNonBlocking(userRef, {
      sellerUsername: values.sellerUsername,
      photoURL: values.photoURL,
    });

    // Update Auth profile
    if (
      user &&
      (values.photoURL !== user.photoURL ||
        values.sellerUsername !== userProfile.sellerUsername)
    ) {
      const displayName = `${userProfile.firstName} ${userProfile.lastName || ''}`.trim();
      updateProfile(user, { photoURL: values.photoURL, displayName });
    }

    toast({
      title: 'Perfil atualizado!',
      description: 'Seu perfil de vendedor foi salvo.',
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil de Vendedor</CardTitle>
        <CardDescription>
          Defina seu nome de usuário público e sua foto de perfil.
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
              <FormField
                control={form.control}
                name="sellerUsername"
                render={({ field }) => (
                  <FormItem className="flex-grow w-full">
                    <FormLabel>Nome de Usuário</FormLabel>
                    <FormControl>
                      <Input placeholder="SeuNomeDeVendedor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
  const [activeSubscriptions, setActiveSubscriptions] = useState<
    EnrichedUserSubscription[]
  >([]);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(true);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, `users/${user.uid}`) : null),
    [user?.uid, firestore]
  );
  const { data: userProfile, isLoading: isUserProfileLoading } =
    useDoc<UserProfile>(userDocRef);

  // Memoized reference to the user's subscriptions subcollection
  const userSubscriptionsRef = useMemoFirebase(
    () =>
      user ? collection(firestore, `users/${user.uid}/userSubscriptions`) : null,
    [user?.uid, firestore]
  );

  // Fetch the user's subscription documents
  const { data: userSubscriptions, isLoading: isUserSubscriptionsLoading } =
    useCollection(userSubscriptionsRef);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      setIsLoadingSubscriptions(false);
      return;
    }

    if (userSubscriptions) {
      // Once user subscriptions are loaded, we can't display them yet.
      // We need to fetch the details for each subscription from the main /subscriptions collection.
      // This is a common pattern: fetch relational data.
      const fetchEnrichedData = async () => {
        setIsLoadingSubscriptions(true);
        const enriched: EnrichedUserSubscription[] = [];

        for (const sub of userSubscriptions) {
          // Create a placeholder for now
          enriched.push({
            id: sub.id,
            planName: sub.planName || 'Plano',
            serviceName: sub.serviceName || 'Serviço',
            nextBilling: sub.endDate,
          });
        }

        setActiveSubscriptions(enriched);
        setIsLoadingSubscriptions(false);
      };
      fetchEnrichedData();
    } else if (!isUserSubscriptionsLoading) {
      // If loading is finished and there are no subscriptions
      setIsLoadingSubscriptions(false);
    }
  }, [
    user,
    isUserLoading,
    userSubscriptions,
    isUserSubscriptionsLoading,
    firestore,
  ]);

  const isLoading =
    isUserLoading || isLoadingSubscriptions || isUserProfileLoading;

  return (
    <div className="container mx-auto max-w-5xl py-12 px-4 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl md:text-4xl font-bold font-headline text-primary">
            Minha Conta
          </h1>
          <p className="mt-2 text-base md:text-lg text-muted-foreground">
            Bem-vindo de volta! Aqui você pode gerenciar suas assinaturas.
          </p>
        </header>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          userProfile?.role === 'seller' &&
          user && (
            <SellerProfileCard userProfile={userProfile} userId={user.uid} />
          )
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tv className="h-6 w-6" />
              Assinaturas Ativas
            </CardTitle>
            <CardDescription>
              Gerencie suas assinaturas de serviços de streaming ativas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !user ? (
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">
                  Faça login para ver suas assinaturas.
                </p>
              </div>
            ) : activeSubscriptions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">
                  Você ainda não possui assinaturas ativas.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Próxima Cobrança</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSubscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium flex items-center gap-3">
                        {sub.serviceName}
                      </TableCell>
                      <TableCell>{sub.planName}</TableCell>
                      <TableCell className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(sub.nextBilling).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="default"
                          className="bg-green-100 text-green-800 border-green-200"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Ativa
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
