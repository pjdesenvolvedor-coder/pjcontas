'use client';

import { useState, useEffect } from 'react';
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
  addDocumentNonBlocking,
  useDoc,
} from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Plan, SubscriptionService, Deliverable, UserProfile, Ticket } from '@/lib/types';
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
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription as FormDescriptionComponent,
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PlusCircle,
  Edit,
  Trash,
  Loader2,
  Upload,
  Wallet,
  PackageCheck,
  DollarSign,
  PackagePlus,
  Copy,
  Trash2,
} from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';


const subscriptionSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres."),
  price: z.coerce.number().positive("O preço deve ser um número positivo."),
  serviceId: z.string({ required_error: "Por favor, selecione um serviço." }),
  accountModel: z.enum(['Capturada', 'Acesso Total'], { required_error: "Por favor, selecione o modelo da conta." }),
  features: z.string().min(10, "Liste pelo menos uma característica."),
  bannerUrl: z.string().min(1, "É obrigatório selecionar uma imagem para o anúncio."),
  isBoosted: z.boolean().default(false),
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
      features: subscription?.features.join('\n') || '',
      bannerUrl: subscription?.bannerUrl || '',
      isBoosted: subscription?.isBoosted || false,
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
                        <div>
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
                        </div>
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <div className="grid grid-cols-1 gap-4">
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
        </div>
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
        <FormField
          control={form.control}
          name="isBoosted"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Impulsionar Anúncio</FormLabel>
                <FormDescriptionComponent>
                  Seu anúncio aparecerá na seção de destaque. Taxa de 5%.
                </FormDescriptionComponent>
              </div>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
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

function DeliverablesManagerDialog({
  subscription,
  onClose,
}: {
  subscription: Plan | null;
  onClose: () => void;
}) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [newDeliverableContent, setNewDeliverableContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const deliverablesQuery = useMemoFirebase(() => {
    if (!firestore || !subscription) return null;
    // Order by creation date to show newest first
    return query(collection(firestore, `subscriptions/${subscription.id}/deliverables`));
  }, [firestore, subscription]);

  const { data: deliverables, isLoading } = useCollection<Deliverable>(deliverablesQuery);

  const handleAddDeliverable = async () => {
    if (!newDeliverableContent.trim() || !subscription || !user || !firestore) return;
    setIsAdding(true);
    
    const deliverablesCollection = collection(firestore, `subscriptions/${subscription.id}/deliverables`);
    const newDeliverableData = {
        subscriptionId: subscription.id,
        sellerId: user.uid,
        content: newDeliverableContent.trim(),
        status: 'available' as const,
        createdAt: new Date().toISOString(),
    };

    const newDocRef = await addDocumentNonBlocking(deliverablesCollection, newDeliverableData);

    if (newDocRef) {
        toast({ title: "Entregável adicionado!" });
        setNewDeliverableContent('');
    } else {
        toast({ 
            variant: 'destructive', 
            title: "Falha ao adicionar",
            description: "Verifique as permissões ou tente novamente."
        });
    }
    
    setIsAdding(false);
  };

  const handleDeleteDeliverable = (deliverableId: string) => {
    if (!firestore || !subscription) return;
    const deliverableRef = doc(firestore, `subscriptions/${subscription.id}/deliverables`, deliverableId);
    deleteDocumentNonBlocking(deliverableRef);
    toast({ title: "Entregável removido." });
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado para a área de transferência!" });
  };

  if (!subscription) return null;

  const availableCount = deliverables?.filter(d => d.status === 'available').length || 0;

  return (
    <Dialog open={!!subscription} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[725px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Entregáveis: {subscription.name}</DialogTitle>
          <DialogDescription>
            Adicione ou remova os itens a serem entregues para este anúncio. Itens disponíveis: {availableCount}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-4">
            <div className="flex gap-2">
                <Textarea 
                    placeholder="Cole ou digite o conteúdo a ser entregue (ex: login:senha, link, código...)"
                    value={newDeliverableContent}
                    onChange={(e) => setNewDeliverableContent(e.target.value)}
                    className="flex-grow"
                    rows={3}
                />
                <Button onClick={handleAddDeliverable} disabled={isAdding || !newDeliverableContent.trim()}>
                    {isAdding ? <Loader2 className="animate-spin" /> : <PackagePlus />}
                    <span className="ml-2 hidden sm:inline">Adicionar</span>
                </Button>
            </div>

            <div className="max-h-[40vh] overflow-y-auto pr-2">
              {isLoading && <div className="text-center p-4"><Loader2 className="animate-spin" /></div>}
              {!isLoading && deliverables && deliverables.length > 0 ? (
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Conteúdo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {deliverables.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-mono text-xs truncate max-w-[300px]">{item.content}</TableCell>
                                <TableCell>
                                    <Badge variant={item.status === 'available' ? 'default' : 'secondary'}>{item.status === 'available' ? 'Disponível' : 'Vendido'}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(item.content)}>
                                            <Copy className="h-4 w-4"/>
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteDeliverable(item.id)} className="text-destructive hover:text-destructive/90">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
              ) : (
                !isLoading && <p className="text-center text-muted-foreground p-4">Nenhum item entregável adicionado ainda.</p>
              )}
            </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubscriptionStock({ subscriptionId }: { subscriptionId: string }) {
  const firestore = useFirestore();

  const deliverablesQuery = useMemoFirebase(() => {
    if (!firestore || !subscriptionId) return null;
    return query(
      collection(firestore, `subscriptions/${subscriptionId}/deliverables`),
      where('status', '==', 'available')
    );
  }, [firestore, subscriptionId]);

  const { data: availableDeliverables, isLoading } = useCollection<Deliverable>(deliverablesQuery);

  if (isLoading) {
    return <Skeleton className="h-4 w-8" />;
  }

  return <>{availableDeliverables?.length ?? 0}</>;
}


export function SellerDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Plan | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingSubscriptionId, setDeletingSubscriptionId] = useState<string | null>(null);
  const [managingDeliverablesFor, setManagingDeliverablesFor] = useState<Plan | null>(null);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, `users/${user.uid}`) : null),
    [user?.uid, firestore]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

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
  
  const sellerTicketsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'tickets'), where('sellerId', '==', user.uid)) : null),
    [firestore, user?.uid]
  );
  const { data: sellerTickets, isLoading: isLoadingSellerTickets } = useCollection<Ticket>(sellerTicketsQuery);

  const [dashboardStats, setDashboardStats] = useState({
    availableBalance: 0,
    pendingBalance: 0,
    salesCount30d: 0,
  });

  useEffect(() => {
    if (sellerTickets && subscriptions) {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      let pending = 0;
      let available = 0;
      let salesCount = 0;
      
      const FIXED_SALE_FEE_PERCENTAGE = 9.90;
      const BOOST_FEE_PERCENTAGE = 5;

      sellerTickets.forEach(ticket => {
        const saleDate = new Date(ticket.createdAt);
        const price = ticket.price || 0;
        
        const subscription = subscriptions.find(s => s.id === ticket.subscriptionId);
        const isBoosted = subscription?.isBoosted || false;
        
        let totalFeePercentage = FIXED_SALE_FEE_PERCENTAGE;
        if (isBoosted) {
          totalFeePercentage += BOOST_FEE_PERCENTAGE;
        }

        const netValue = price * (1 - totalFeePercentage / 100);

        if (saleDate >= thirtyDaysAgo) {
          salesCount++;
        }

        const availableDate = new Date(saleDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        if (now >= availableDate) {
          available += netValue;
        } else {
          pending += netValue;
        }
      });

      setDashboardStats({
        availableBalance: available,
        pendingBalance: pending,
        salesCount30d: salesCount,
      });
    }
  }, [sellerTickets, subscriptions]);


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

  const handleManageDeliverables = (subscription: Plan) => {
    setManagingDeliverablesFor(subscription);
  };

  const handleSave = (values: SubscriptionFormData) => {
    if (!user || !firestore || !userProfile) return;

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
      const subRef = doc(firestore, 'subscriptions', editingSubscription.id);
      const updatedData = { 
          ...values, 
          features: featuresArray,
          serviceName: service.name,
          bannerUrl: bannerUrl,
          bannerHint: service.bannerHint,
          sellerId: user.uid,
          sellerName: userProfile.firstName || user.displayName,
          sellerUsername: userProfile.sellerUsername || userProfile.firstName,
          sellerPhotoURL: userProfile.photoURL || user.photoURL,
      };
      setDocumentNonBlocking(subRef, updatedData, { merge: true });
      toast({
        title: 'Anúncio Atualizado!',
        description: 'As alterações no seu anúncio foram salvas.',
      });
    } else {
      const subsCollection = collection(firestore, 'subscriptions');
      const newSubRef = doc(subsCollection);
      const newSubscriptionData = {
        ...values,
        id: newSubRef.id,
        features: featuresArray,
        sellerId: user.uid,
        serviceName: service.name,
        bannerUrl: bannerUrl,
        bannerHint: service.bannerHint,
        sellerName: userProfile.firstName || user.displayName,
        sellerUsername: userProfile.sellerUsername || userProfile.firstName,
        sellerPhotoURL: userProfile.photoURL || user.photoURL,
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
  
  const isLoading = isLoadingServices || isLoadingSubscriptions || isLoadingSellerTickets;

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

      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) setEditingSubscription(null); setIsDialogOpen(isOpen); }}>
          <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
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
      
      <DeliverablesManagerDialog
        subscription={managingDeliverablesFor}
        onClose={() => setManagingDeliverablesFor(null)}
      />

      <div className="space-y-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo Disponível</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">R$ {dashboardStats.availableBalance.toFixed(2)}</div>
                <Button variant="outline" size="sm" className="mt-2" disabled>Retirar</Button>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo a Liberar</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">R$ {dashboardStats.pendingBalance.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  Liberado em 7 dias após a venda.
                </p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vendas (30 dias)</CardTitle>
                <PackageCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{dashboardStats.salesCount30d}</div>
                <p className="text-xs text-muted-foreground">
                Total de vendas concluídas.
                </p>
            </CardContent>
            </Card>
        </div>


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
                        <TableHead>Anúncio</TableHead>
                        <TableHead>Modelo</TableHead>
                        <TableHead>Preço</TableHead>
                        <TableHead>Estoque</TableHead>
                        <TableHead>Tipo Anúncio</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {subscriptions.map((sub) => (
                        <TableRow key={sub.id}>
                        <TableCell>
                          <div className="font-medium">{sub.name}</div>
                          <div className="text-sm text-muted-foreground">{sub.serviceName || services?.find(s => s.id === sub.serviceId)?.name || 'N/A'}</div>
                        </TableCell>
                        <TableCell>{sub.accountModel}</TableCell>
                        <TableCell>R$ {sub.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <SubscriptionStock subscriptionId={sub.id} />
                        </TableCell>
                        <TableCell>
                          {sub.isBoosted ? (
                            <Badge variant="outline" className="text-primary border-primary">Destaque</Badge>
                          ) : (
                            <Badge variant="secondary">Padrão</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleManageDeliverables(sub)} title="Gerenciar Entregáveis">
                                    <PackagePlus className="h-4 w-4" />
                                    <span className="sr-only">Gerenciar Entregáveis</span>
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(sub)} title="Editar Anúncio">
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Editar</span>
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteRequest(sub.id)} className="text-destructive hover:text-destructive/90" title="Apagar Anúncio">
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
