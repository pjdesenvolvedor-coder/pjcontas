import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { subscriptionServices } from '@/lib/data';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type SubscriptionPageProps = {
  params: {
    id: string;
  };
};

export default function SubscriptionPage({ params }: SubscriptionPageProps) {
  const service = subscriptionServices.find((s) => s.id === params.id);

  if (!service) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-5xl py-12 px-4 sm:px-6 lg:px-8">
      <Card className="overflow-hidden">
        <CardHeader className="p-0">
          <div className="bg-card p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative w-48 h-24 flex-shrink-0">
                <Image
                  src={service.logoUrl}
                  alt={`${service.name} logo`}
                  width={200}
                  height={100}
                  className="object-contain w-full h-full"
                  data-ai-hint={service.imageHint}
                />
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-4xl font-bold font-headline text-primary">
                  {service.name}
                </h1>
                <p className="mt-2 text-lg text-muted-foreground">
                  {service.longDescription}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <h2 className="text-2xl font-bold text-center mb-6 font-headline">
            Choose Your Plan
          </h2>
          <Tabs defaultValue={service.plans[0].id} className="w-full">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 mx-auto max-w-2xl h-auto">
              {service.plans.map((plan) => (
                <TabsTrigger key={plan.id} value={plan.id} className="py-2">
                  {plan.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {service.plans.map((plan) => (
              <TabsContent key={plan.id} value={plan.id}>
                <Card className="mt-4 border-primary shadow-lg">
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription className="text-3xl font-bold text-primary">
                      ${plan.price}
                      <span className="text-sm font-normal text-muted-foreground">
                        /month
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                          <span>{feature}</span>
                        </li>
                      ))}
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <span>Up to {plan.userLimit} users</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <span>{plan.quality} quality</span>
                      </li>
                    </ul>
                    <Button asChild size="lg" className="w-full mt-6 bg-accent hover:bg-accent/90">
                      <Link
                        href={`/checkout?serviceId=${service.id}&planId=${plan.id}`}
                      >
                        Subscribe Now <ArrowRight className="ml-2" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export async function generateStaticParams() {
  return subscriptionServices.map((service) => ({
    id: service.id,
  }));
}
