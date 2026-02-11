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
import { Tv, Calendar, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { subscriptionServices } from '@/lib/data';

export default function DashboardPage() {
  // Mock active subscriptions
  const activeSubscriptions = [
    {
      ...subscriptionServices[0], // Netflix
      plan: subscriptionServices[0].plans[2], // Premium
      nextBilling: '2024-08-15',
    },
    {
      ...subscriptionServices[1], // Disney+
      plan: subscriptionServices[1].plans[1], // Premium
      nextBilling: '2024-08-22',
    },
  ];

  return (
    <div className="container mx-auto max-w-5xl py-12 px-4 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <header>
          <h1 className="text-4xl font-bold font-headline text-primary">
            My Account
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Welcome back! Here you can manage your subscriptions.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tv className="h-6 w-6" />
              Active Subscriptions
            </CardTitle>
            <CardDescription>
              Manage your active streaming service subscriptions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Next Billing Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSubscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium flex items-center gap-3">
                      <Image
                        src={sub.logoUrl}
                        alt={sub.name}
                        width={80}
                        height={40}
                        className="object-contain"
                        data-ai-hint={sub.imageHint}
                      />
                      {sub.name}
                    </TableCell>
                    <TableCell>{sub.plan.name}</TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {new Date(sub.nextBilling).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Active
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
