'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PlusCircle, Edit, Trash, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SubscriptionService } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


type UserProfile = {
  role: 'admin' | 'customer';
};

const serviceSchema = z.object({
  name: z.string().min(2, "O nome é obrigatório."),
  description: z.string().min(10, "A descrição curta é obrigatória."),
  longDescription: z.string().min(20, "A descrição longa é obrigatória."),
  logoUrl: z.string().url("URL do logo inválida."),
  imageHint: z.string().optional(),
  bannerUrl: z.string().url("URL do banner inválida."),
  bannerHint: z.string().optional(),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

function ServiceForm({
  onSave,
  onClose,
  service,
}: {
  onSave: (data: ServiceFormData) => void;
  onClose: () => void;
  service?: SubscriptionService | null;
}) {
  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: service?.name || '',
      description: service?.description || '',
      longDescription: service?.longDescription || '',
      logoUrl: service?.logoUrl || '',
      imageHint: service?.imageHint || '',
      bannerUrl: service?.bannerUrl || '',
      bannerHint: service?.bannerHint || '',
    },
  });

  const { formState } = form;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Serviço</FormLabel>
              <FormControl><Input placeholder="Ex: Netflix" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição Curta</FormLabel>
              <FormControl><Textarea placeholder="Uma descrição breve para listas" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="longDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição Longa</FormLabel>
              <FormControl><Textarea placeholder="Uma descrição detalhada para a página do serviço" {...field} rows={4} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="logoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL do Logo</FormLabel>
              <FormControl><Input placeholder="https://..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="imageHint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dica para IA (Logo)</FormLabel>
              <FormControl><Input placeholder="Ex: streaming service" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bannerUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL do Banner</FormLabel>
              <FormControl><Input placeholder="https://..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="bannerHint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dica para IA (Banner)</FormLabel>
              <FormControl><Input placeholder="Ex: movie collage" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Serviço
            </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function ServiceManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<SubscriptionService | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);

  const servicesRef = useMemoFirebase(() => collection(firestore, 'services'), [firestore]);
  const { data: services, isLoading } = useCollection<SubscriptionService>(servicesRef);

  const defaultServices: Omit<SubscriptionService, 'id'>[] = [
    {
      name: 'Netflix',
      description: 'Filmes, séries e muito mais.',
      longDescription: 'Ampla variedade de séries, filmes e documentários premiados.',
      logoUrl: 'https://picsum.photos/seed/netflixlogo/200/100',
      imageHint: 'streaming service logo',
      bannerUrl: 'https://picsum.photos/seed/netflixbanner/600/400',
      bannerHint: 'movie collage',
    },
    {
      name: 'Disney+',
      description: 'O melhor da Disney, Pixar, Marvel.',
      longDescription: 'O serviço de streaming para fãs da Disney, Pixar, Marvel, Star Wars e National Geographic.',
      logoUrl: 'https://picsum.photos/seed/disneylogo/200/100',
      imageHint: 'streaming service logo',
      bannerUrl: 'https://picsum.photos/seed/disneybanner/600/400',
      bannerHint: 'fantasy castle',
    },
    {
      name: 'Max',
      description: 'Todo o conteúdo da HBO e mais.',
      longDescription: 'Max combina todo o conteúdo da HBO com ainda mais filmes, séries e Max Originals.',
      logoUrl: 'https://picsum.photos/seed/maxlogo/200/100',
      imageHint: 'streaming service logo',
      bannerUrl: 'https://picsum.photos/seed/maxbanner/600/400',
      bannerHint: 'dragon fire',
    },
    {
        name: 'Paramount+',
        description: 'Um mundo de entretenimento.',
        longDescription: 'Milhares de horas de entretenimento com sucessos de bilheteria, séries originais e programas aclamados.',
        logoUrl: 'https://picsum.photos/seed/paramountlogo/200/100',
        imageHint: 'streaming service logo',
        bannerUrl: 'https://picsum.photos/seed/paramountbanner/600/400',
        bannerHint: 'mountain peak',
    },
    {
      name: 'Prime Video',
      description: 'Da Amazon, para você.',
      longDescription: 'Desfrute de filmes e séries populares, incluindo os premiados Amazon Originals.',
      logoUrl: 'https://picsum.photos/seed/primelogo/200/100',
      imageHint: 'streaming service logo',
      bannerUrl: 'https://picsum.photos/seed/primebanner/600/400',
      bannerHint: 'action explosion',
    },
    {
      name: 'Globo Play',
      description: 'O conteúdo da Globo, ao vivo e online.',
      longDescription: 'Assista à programação da Globo, canais ao vivo, filmes, séries brasileiras e conteúdos exclusivos.',
      logoUrl: 'https://picsum.photos/seed/globologo/200/100',
      imageHint: 'brazilian flag',
      bannerUrl: 'https://picsum.photos/seed/globobanner/600/400',
      bannerHint: 'brazilian culture',
    },
    {
      name: 'Spotify',
      description: 'Música para todos.',
      longDescription: 'Um serviço de streaming de música, podcast e vídeo que dá acesso a milhões de músicas e outros conteúdos.',
      logoUrl: 'https://picsum.photos/seed/spotifylogo/200/100',
      imageHint: 'music notes',
      bannerUrl: 'https://picsum.photos/seed/spotifybanner/600/400',
      bannerHint: 'audio waveform',
    },
  ];

  const handleSeedServices = () => {
    if (!firestore) return;
    const servicesCollection = collection(firestore, 'services');

    defaultServices.forEach(serviceData => {
        const newServiceRef = doc(servicesCollection);
        const newService = { ...serviceData, id: newServiceRef.id };
        setDocumentNonBlocking(newServiceRef, newService, { merge: false });
    });

    toast({
        title: "Serviços adicionados!",
        description: "Os serviços de streaming padrão foram adicionados ao marketplace.",
    });
  };

  const handleAddNew = () => {
    setEditingService(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (service: SubscriptionService) => {
    setEditingService(service);
    setIsDialogOpen(true);
  };

  const handleDeleteRequest = (serviceId: string) => {
    setDeletingServiceId(serviceId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deletingServiceId) return;
    
    const serviceRef = doc(firestore, 'services', deletingServiceId);
    deleteDocumentNonBlocking(serviceRef);

    toast({
        title: "Serviço apagado!",
        description: "O serviço de streaming foi removido.",
    });

    setIsDeleteDialogOpen(false);
    setDeletingServiceId(null);
  };
  
  const handleSave = (values: ServiceFormData) => {
    if (editingService) {
      // Update
      const serviceRef = doc(firestore, 'services', editingService.id);
      setDocumentNonBlocking(serviceRef, values, { merge: true });
      toast({
        title: 'Serviço Atualizado!',
        description: 'As alterações foram salvas.',
      });
    } else {
      // Create
      const newServiceRef = doc(collection(firestore, 'services'));
      const newServiceData = { ...values, id: newServiceRef.id };
      setDocumentNonBlocking(newServiceRef, newServiceData, { merge: false });
      toast({
        title: 'Serviço Criado!',
        description: 'O novo serviço de streaming está disponível.',
      });
    }
    
    setIsDialogOpen(false);
    setEditingService(null);
  };

  return (
    <>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá apagar permanentemente o serviço.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingServiceId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) setEditingService(null); setIsDialogOpen(isOpen); }}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Editar Serviço' : 'Adicionar Novo Serviço'}</DialogTitle>
          </DialogHeader>
          <ServiceForm 
            onSave={handleSave} 
            onClose={() => setIsDialogOpen(false)} 
            service={editingService}
          />
        </DialogContent>
      </Dialog>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Serviços de Streaming</CardTitle>
            <CardDescription>Adicione, edite ou remova os serviços disponíveis no seu marketplace.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!isLoading && services?.length === 0 && (
              <Button onClick={handleSeedServices} variant="secondary">
                Adicionar Serviços Padrão
              </Button>
            )}
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2" /> Adicionar Serviço
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : services && services.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>{service.description}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(service)}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRequest(service.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash className="h-4 w-4" />
                          <span className="sr-only">Apagar</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">Nenhum serviço cadastrado.</p>
              <p className="text-sm text-muted-foreground">Clique em "Adicionar Serviço" ou "Adicionar Serviços Padrão" para começar.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}


export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    const isDataLoaded = !isUserLoading && !isUserDataLoading;
    if (isDataLoaded) {
      if (!user) {
        router.push('/dashboard');
      } else if (userData && userData.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [user, userData, isUserLoading, isUserDataLoading, router]);

  const isLoading = isUserLoading || isUserDataLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-5xl py-12 px-4 sm:px-6 lg:px-8 space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-6 w-1/2" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (userData?.role !== 'admin') {
    return null;
  }

  return (
    <div className="container mx-auto max-w-5xl py-12 px-4 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold font-headline text-primary">
          Painel do Administrador
        </h1>
        <p className="mt-2 text-base md:text-lg text-muted-foreground">
          Gerencie todos os aspectos do seu marketplace.
        </p>
      </header>
      
      <Tabs defaultValue="services" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="services">Serviços</TabsTrigger>
          <TabsTrigger value="users" disabled>Usuários</TabsTrigger>
        </TabsList>
        <TabsContent value="services" className="mt-6">
          <ServiceManagement />
        </TabsContent>
        <TabsContent value="users">
          {/* Placeholder for future user management */}
        </TabsContent>
      </Tabs>

    </div>
  );
}
