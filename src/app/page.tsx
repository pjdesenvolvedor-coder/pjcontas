import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { subscriptionServices } from '@/lib/data';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function Home() {
  return (
    <div>
      <section className="py-20 md:py-32 bg-card">
        <div className="container mx-auto text-center px-4 md:px-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-primary font-headline">
            Your Favorite Streams, One Simple Subscription
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-foreground/80">
            Discover, bundle, and save on streaming services. Can't decide? Let
            our AI guide you to the perfect entertainment package.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="#services">Explore Services</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/recommendations">
                Get AI Recommendation <ArrowRight className="ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="services" className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 font-headline">
            Available Streaming Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {subscriptionServices.map((service) => (
              <Card
                key={service.id}
                className="flex flex-col overflow-hidden hover:shadow-xl transition-shadow duration-300 rounded-lg"
              >
                <CardHeader>
                  <div className="relative w-full h-24 mb-4">
                    <Image
                      src={service.logoUrl}
                      alt={`${service.name} logo`}
                      width={200}
                      height={100}
                      className="object-contain w-auto h-auto mx-auto"
                      data-ai-hint={service.imageHint}
                    />
                  </div>
                  <CardTitle className="text-center">{service.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-muted-foreground text-sm line-clamp-3">
                    {service.description}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full bg-primary hover:bg-primary/90">
                    <Link href={`/subscriptions/${service.id}`}>
                      View Plans <ArrowRight className="ml-2" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
