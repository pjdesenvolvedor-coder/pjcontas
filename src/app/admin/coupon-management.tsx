'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase, setDocument, deleteDocument } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Coupon } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, PlusCircle, Trash, Ticket as CouponIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const couponSchema = z.object({
  name: z.string().min(3, "O nome do cupom deve ter pelo menos 3 caracteres.").toUpperCase(),
  discountPercentage: z.coerce.number().min(1, "O desconto deve ser de no mínimo 1%.").max(100, "O desconto não pode exceder 100%."),
  usageLimit: z.coerce.number().int().min(0, "O limite de uso deve ser 0 ou maior.").default(0),
});

type CouponFormData = z.infer<typeof couponSchema>;

export function CouponManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);

  const couponsQuery = useMemoFirebase(() => collection(firestore, 'coupons'), [firestore]);
  const { data: coupons, isLoading } = useCollection<Coupon>(couponsQuery);

  const form = useForm<CouponFormData>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      name: '',
      discountPercentage: 10,
      usageLimit: 0,
    },
  });
  const { formState, handleSubmit, reset } = form;

  const handleSave = (values: CouponFormData) => {
    const newCouponRef = doc(firestore, 'coupons', values.name);
    const newCouponData = { ...values, id: values.name, usageCount: 0 };

    setDocument(newCouponRef, newCouponData, { merge: false });
    toast({
      title: 'Cupom Criado!',
      description: `O cupom "${values.name}" foi criado com ${values.discountPercentage}% de desconto.`,
    });
    reset();
  };

  const handleDeleteRequest = (coupon: Coupon) => {
    setDeletingCoupon(coupon);
  };

  const handleConfirmDelete = () => {
    if (!deletingCoupon) return;
    const couponRef = doc(firestore, 'coupons', deletingCoupon.id);
    deleteDocument(couponRef);
    toast({
      title: "Cupom apagado!",
      description: `O cupom "${deletingCoupon.name}" foi removido.`,
    });
    setDeletingCoupon(null);
  };

  return (
    <>
      <AlertDialog open={!!deletingCoupon} onOpenChange={(open) => !open && setDeletingCoupon(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cupom "{deletingCoupon?.name}" será permanentemente apagado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Criar Novo Cupom</CardTitle>
            <CardDescription>Crie cupons de desconto para seus clientes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código do Cupom</FormLabel>
                      <FormControl><Input placeholder="EX: PROMO10" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="discountPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desconto (%)</FormLabel>
                      <FormControl><Input type="number" min="1" max="100" placeholder="10" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="usageLimit"
                  render={({ field }) => (
                    <FormItem>
                        <FormLabel>Limite de Usos (Opcional)</FormLabel>
                        <FormControl><Input type="number" min="0" placeholder="0" {...field} /></FormControl>
                        <FormDescription>
                          O número máximo de vezes que o cupom pode ser usado. Deixe 0 para ilimitado.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={formState.isSubmitting} className="w-full">
                  {formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  Criar Cupom
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Cupons Ativos</CardTitle>
            <CardDescription>Lista de todos os cupons de desconto disponíveis.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : coupons && coupons.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Usos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-medium flex items-center gap-2"><CouponIcon className="h-4 w-4 text-primary" /> {coupon.name}</TableCell>
                      <TableCell>{coupon.discountPercentage}%</TableCell>
                      <TableCell>
                        {coupon.usageLimit && coupon.usageLimit > 0
                          ? `${coupon.usageCount || 0} / ${coupon.usageLimit}`
                          : `Ilimitado (${coupon.usageCount || 0})`}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRequest(coupon)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash className="h-4 w-4" />
                          <span className="sr-only">Apagar</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">Nenhum cupom cadastrado.</p>
                <p className="text-sm text-muted-foreground">Use o formulário ao lado para criar um.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
