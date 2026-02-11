'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
  setDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Plan, SubscriptionService } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, Edit, Trash, Loader2, Upload } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


const subscriptionSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres."),
  price: z.coerce.number().positive("O preço deve ser um número positivo."),
  serviceId: z.string({ required_error: "Por favor, selecione um serviço." }),
  accountModel: z.enum(['Capturada', 'Acesso Total'], { required_error: "Por favor, selecione o modelo da conta." }),
  userLimit: z.coerce.number().int().positive("Deve ser um número inteiro positivo."),
  quality: z.string().min(3, "A qualidade é obrigatória (ex: 1080p, 4K)."),
  features: z.string().min(10, "Liste pelo menos uma característica."),
  bannerUrl: z.string().min(1, "É obrigatório selecionar uma imagem para o anúncio."),
});

type SubscriptionFormData = z.infer<typeof subscriptionSchema>;

function SubscriptionForm({
  services,
  onSave,
  onClose,
  subscription,
}: {
  services: SubscriptionService[];
  onSave: (data: SubscriptionFormData) => void;
  onClose: () => void;
  subscription?: Plan | null;
}) {
  const form = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      name: subscription?.name || '',
      description: subscription?.description || '',
      price: subscription?.price || 0,
      serviceId: subscription?.serviceId || '',
      accountModel: subscription?.accountModel || undefined,
      userLimit: subscription?.userLimit || 1,
      quality: subscription?.quality || '',
      features: subscription?.features.join('\n') || '',
      bannerUrl: subscription?.bannerUrl || '',
    },
  });

  const { formState } = form;
  const [imagePreview, setImagePreview] = useState<string | null>(subscription?.bannerUrl || null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        form.setValue('bannerUrl', result, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
        <FormField
          control={form.control}
          name="serviceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Serviço de Streaming</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!subscription}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="accountModel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Modelo da Conta</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                    <SelectItem value="Capturada">Capturada</SelectItem>
                    <SelectItem value="Acesso Total">Acesso Total</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Anúncio (Plano)</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Premium, Básico" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição do Anúncio</FormLabel>
              <FormControl>
                <Textarea placeholder="Descreva os detalhes do plano" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="bannerUrl"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Imagem do Anúncio</FormLabel>
                    <FormControl>
                        <>
                            <Input
                                id="file-upload"
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => document.getElementById('file-upload')?.click()}
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                Selecionar Imagem
                            </Button>
                            {imagePreview && (
                                <div className="mt-4 relative w-full h-48 border rounded-md overflow-hidden">
                                    <Image
                                        src={imagePreview}
                                        alt="Preview da Imagem"
                                        fill
                                        style={{ objectFit: 'contain' }}
                                    />
                                </div>
                            )}
                        </>
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Preço (mensal)</FormLabel>
                <FormControl>
                    <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="quality"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Qualidade</FormLabel>
                <FormControl>
                    <Input placeholder="Ex: 4K, 1080p" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
          control={form.control}
          name="userLimit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Limite de Usuários</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="features"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Características (uma por linha)</FormLabel>
              <FormControl>
                <Textarea placeholder="- Acesso a todo o catálogo\n- Sem anúncios" {...field} rows={4} />
              </FormControl>
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
                Salvar Anúncio
            </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export function SellerDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Plan | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingSubscriptionId, setDeletingSubscriptionId] = useState<string | null>(null);


  const servicesRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'services') : null),
    [firestore]
  );
  const { data: services, isLoading: isLoadingServices } = useCollection<SubscriptionService>(servicesRef);
  
  const subscriptionsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'subscriptions'), where('sellerId', '==', user.uid)) : null),
    [firestore, user?.uid]
  );
  const { data: subscriptions, isLoading: isLoadingSubscriptions } = useCollection<Plan>(subscriptionsQuery);

  const handleAddNew = () => {
    setEditingSubscription(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (subscription: Plan) => {
    setEditingSubscription(subscription);
    setIsDialogOpen(true);
  };

  const handleDeleteRequest = (subscriptionId: string) => {
    setDeletingSubscriptionId(subscriptionId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deletingSubscriptionId || !firestore) return;
    
    const subRef = doc(firestore, 'subscriptions', deletingSubscriptionId);
    deleteDocumentNonBlocking(subRef);

    toast({
        title: "Anúncio apagado!",
        description: "O anúncio de assinatura foi removido.",
    });

    setIsDeleteDialogOpen(false);
    setDeletingSubscriptionId(null);
  };


  const handleSave = (values: SubscriptionFormData) => {
    if (!user || !firestore) return;

    const featuresArray = values.features.split('\n').filter(f => f.trim() !== '');

    const service = services?.find(s => s.id === values.serviceId);
    if (!service) {
        toast({
            variant: "destructive",
            title: "Erro de Validação",
            description: "Por favor, selecione um serviço válido.",
        });
        return;
    }

    const bannerUrl = values.bannerUrl;

    if (editingSubscription) {
      // Update existing subscription
      const subRef = doc(firestore, 'subscriptions', editingSubscription.id);
      const updatedData = { 
          ...values, 
          features: featuresArray,
          serviceName: service.name, // Denormalized
          bannerUrl: bannerUrl,
          bannerHint: service.bannerHint, // Denormalized
      };
      setDocumentNonBlocking(subRef, updatedData, { merge: true });
      toast({
        title: 'Anúncio Atualizado!',
        description: 'As alterações no seu anúncio foram salvas.',
      });
    } else {
      // Create new subscription
      const subsCollection = collection(firestore, 'subscriptions');
      const newSubRef = doc(subsCollection);
      const newSubscriptionData = {
        ...values,
        id: newSubRef.id,
        features: featuresArray,
        sellerId: user.uid,
        serviceName: service.name, // Denormalized
        bannerUrl: bannerUrl,
        bannerHint: service.bannerHint, // Denormalized
      };
      setDocumentNonBlocking(newSubRef, newSubscriptionData, { merge: false });
      toast({
        title: 'Anúncio Criado!',
        description: 'Seu novo anúncio de assinatura está agora disponível no marketplace.',
      });
    }
    
    setIsDialogOpen(false);
    setEditingSubscription(null);
  };
  
  const isLoading = isLoadingServices || isLoadingSubscriptions;

  return (
    <>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso irá apagar permanentemente o seu anúncio.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeletingSubscriptionId(null)}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Apagar</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                  <DialogTitle>{editingSubscription ? 'Editar Anúncio' : 'Criar Novo Anúncio'}</DialogTitle>
              </DialogHeader>
              {isLoadingServices ? (
                  <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : (
                  <SubscriptionForm 
                      services={services || []} 
                      onSave={handleSave} 
                      onClose={() => setIsDialogOpen(false)} 
                      subscription={editingSubscription}
                  />
              )}
          </DialogContent>
      </Dialog>

      <div className="container mx-auto max-w-7xl py-12 px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Meus Anúncios de Assinatura</CardTitle>
              <CardDescription>
                Gerencie os anúncios de assinatura que você oferece no marketplace.
              </CardDescription>
            </div>
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2" /> Criar Novo Anúncio
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            ) : subscriptions && subscriptions.length > 0 ? (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Serviço</TableHead>
                        <TableHead>Nome do Anúncio</TableHead>
                        <TableHead>Modelo</TableHead>
                        <TableHead>Preço</TableHead>
                        <TableHead>Qualidade</TableHead>
                        <TableHead>Usuários</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {subscriptions.map((sub) => (
                        <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.serviceName || services?.find(s => s.id === sub.serviceId)?.name || 'N/A'}</TableCell>
                        <TableCell>{sub.name}</TableCell>
                        <TableCell>{sub.accountModel}</TableCell>
                        <TableCell>R$ {sub.price.toFixed(2)}</TableCell>
                        <TableCell>{sub.quality}</TableCell>
                        <TableCell>{sub.userLimit}</TableCell>
                        <TableCell className="text-right">
                           <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(sub)}>
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Editar</span>
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteRequest(sub.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
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
                <p className="text-lg text-muted-foreground">Você ainda não cadastrou nenhum anúncio.</p>
                <p className="text-sm text-muted-foreground">Clique em "Criar Novo Anúncio" para começar a vender.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
