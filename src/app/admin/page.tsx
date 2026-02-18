'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PlusCircle, Edit, Trash, Loader2, MoreHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile as UserProfileType, Ticket } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WhatsAppManager } from './whatsapp-manager';
import { WhatsappMessageManager } from './whatsapp-message-manager';
import { CouponManagement } from './coupon-management';
import { PaymentProviderManager } from './payment-provider-manager';
import { SpecialCouponsManager } from './special-coupons-manager';
import { SalesManagement } from './sales-management';
import { SellerSidebar } from '../seller/seller-sidebar';


function UserManagement() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();

  const usersRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading } = useCollection<UserProfileType>(usersRef);

  const [isUserDeleteDialogOpen, setIsUserDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfileType | null>(null);

  const handleToggleAdmin = (userToUpdate: UserProfileType) => {
    if (!firestore || !userToUpdate) return;
    
    if (currentUser?.uid === userToUpdate.id) {
        toast({ variant: "destructive", title: "Ação não permitida", description: "Você não pode alterar sua própria função." });
        return;
    }

    const adminCount = users?.filter(u => u.role === 'admin').length || 0;
    if (userToUpdate.role === 'admin' && adminCount <= 1) {
        toast({ variant: "destructive", title: "Ação não permitida", description: "Não é possível remover o único administrador do sistema." });
        return;
    }

    const userRef = doc(firestore, 'users', userToUpdate.id);
    const newRole = userToUpdate.role === 'admin' ? 'customer' : 'admin';

    updateDoc(userRef, { role: newRole });
    toast({
      title: "Função do Usuário Atualizada!",
      description: `${userToUpdate.firstName} agora é ${newRole === 'admin' ? 'administrador(a)' : 'cliente'}.`
    });
  };

  const handleDeleteUserRequest = (userToDelete: UserProfileType) => {
    if (currentUser?.uid === userToDelete.id) {
        toast({ variant: "destructive", title: "Ação não permitida", description: "Você não pode apagar sua própria conta." });
        return;
    }
    setSelectedUser(userToDelete);
    setIsUserDeleteDialogOpen(true);
  };

  const handleConfirmUserDelete = () => {
    if (!selectedUser || !firestore) return;

    const userRef = doc(firestore, 'users', selectedUser.id);
    deleteDoc(userRef);

    toast({
      title: "Usuário Apagado!",
      description: "O registro do usuário foi removido do sistema."
    });
    
    setIsUserDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  return (
    <>
      <AlertDialog open={isUserDeleteDialogOpen} onOpenChange={setIsUserDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá apagar permanentemente o registro de usuário, mas a conta de autenticação permanecerá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedUser(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUserDelete} className="bg-destructive hover:bg-destructive/90">Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Usuários</CardTitle>
          <CardDescription>Visualize e gerencie todos os usuários do sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : users && users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Data de Registro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.firstName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={
                        user.role === 'admin' ? 'destructive' :
                        user.role === 'seller' ? 'secondary' : 'outline'
                      }>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(user.registrationDate).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleToggleAdmin(user)}>
                            {user.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteUserRequest(user)}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            Apagar usuário
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">Nenhum usuário encontrado.</p>
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
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'users';


  const userDocRef = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserProfileType>(userDocRef);

  const sellerTicketsQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'tickets'), where('sellerId', '==', user.uid)) : null,
    [user, firestore]
  );
  const { data: sellerTickets, isLoading: isLoadingSellerTickets } = useCollection<Ticket>(sellerTicketsQuery);

  const unreadTicketsCount = useMemo(() => {
    if (!sellerTickets) return 0;
    return sellerTickets.reduce((acc, ticket) => acc + (ticket.unreadBySellerCount || 0), 0);
  }, [sellerTickets]);


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

  const isLoading = isUserLoading || isUserDataLoading || isLoadingSellerTickets;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (userData?.role !== 'admin') {
    return null;
  }
  
  const renderContent = () => {
    switch (currentTab) {
      case 'users':
        return <UserManagement />;
      case 'sales':
        return <SalesManagement />;
      case 'coupons':
        return <CouponManagement />;
      case 'special_coupons':
        return <SpecialCouponsManager />;
      case 'payments':
        return <PaymentProviderManager />;
      case 'whatsapp':
        return <WhatsAppManager />;
      case 'mensagens':
        return <WhatsappMessageManager />;
      default:
        return <UserManagement />;
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-background text-foreground">
      <SellerSidebar unreadTicketsCount={unreadTicketsCount} isAdmin={true} />
      <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-auto">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold font-headline text-primary">
            Painel do Administrador
          </h1>
          <p className="mt-2 text-base md:text-lg text-muted-foreground">
            Gerencie todos os aspectos do seu marketplace.
          </p>
        </header>
        
        <div className="w-full">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
