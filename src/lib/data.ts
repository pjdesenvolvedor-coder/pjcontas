import type { SubscriptionService } from './types';
import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string) => PlaceHolderImages.find(img => img.id === id);

export const subscriptionServices: SubscriptionService[] = [
  {
    id: 'netflix',
    name: 'Netflix',
    description: 'Endless entertainment with a vast library of movies, TV shows, and original content.',
    longDescription: 'Netflix is a streaming service that offers a wide variety of award-winning TV shows, movies, anime, documentaries, and more on thousands of internet-connected devices. You can watch as much as you want, whenever you want without a single commercial – all for one low monthly price.',
    logoUrl: getImage('netflix-logo')?.imageUrl ?? '',
    imageHint: getImage('netflix-logo')?.imageHint ?? '',
    bannerUrl: getImage('netflix-banner')?.imageUrl ?? '',
    bannerHint: getImage('netflix-banner')?.imageHint ?? '',
    plans: [
      { id: 'netflix-basic', name: 'Basic with ads', price: 6.99, features: ['Ad-supported', 'Limited library'], userLimit: 1, quality: '720p HD' },
      { id: 'netflix-standard', name: 'Standard', price: 15.49, features: ['Ad-free', 'Full library', 'Downloads on 2 devices'], userLimit: 2, quality: '1080p Full HD' },
      { id: 'netflix-premium', name: 'Premium', price: 22.99, features: ['Ad-free', 'Full library', 'Downloads on 6 devices', 'Spatial audio'], userLimit: 4, quality: '4K Ultra HD' },
    ],
  },
  {
    id: 'disney-plus',
    name: 'Disney+',
    description: 'The home of Disney, Pixar, Marvel, Star Wars, and National Geographic.',
    longDescription: 'Disney+ is the streaming home of your favorite stories. With unlimited entertainment from Disney, Pixar, Marvel, Star Wars and National Geographic, there\'s always something to explore. Watch the latest releases, Original series and movies, classic films, and so much more.',
    logoUrl: getImage('disney-plus-logo')?.imageUrl ?? '',
    imageHint: getImage('disney-plus-logo')?.imageHint ?? '',
    bannerUrl: getImage('disney-plus-banner')?.imageUrl ?? '',
    bannerHint: getImage('disney-plus-banner')?.imageHint ?? '',
    plans: [
      { id: 'disney-basic', name: 'Basic (with Ads)', price: 7.99, features: ['Ad-supported', 'Full library'], userLimit: 4, quality: '4K Ultra HD' },
      { id: 'disney-premium', name: 'Premium', price: 13.99, features: ['Ad-free', 'Downloads', 'Full library'], userLimit: 4, quality: '4K Ultra HD' },
    ],
  },
  {
    id: 'hbo-max',
    name: 'HBO Max',
    description: 'Stream all of HBO, plus hit movies, exclusive originals, and addictive series.',
    longDescription: 'HBO Max is a streaming platform that bundles all of HBO together with even more of your favorite movies and TV series, plus new Max Originals. Get comfortable, because you’ve got 100 years of epic entertainment in your hands.',
    logoUrl: getImage('hbo-max-logo')?.imageUrl ?? '',
    imageHint: getImage('hbo-max-logo')?.imageHint ?? '',
    bannerUrl: getImage('hbo-max-banner')?.imageUrl ?? '',
    bannerHint: getImage('hbo-max-banner')?.imageHint ?? '',
    plans: [
      { id: 'hbo-with-ads', name: 'With Ads', price: 9.99, features: ['Ad-supported', '100+ movies in 4K'], userLimit: 2, quality: '1080p HD' },
      { id: 'hbo-ad-free', name: 'Ad-Free', price: 15.99, features: ['Ad-free', '30 downloads', '100+ movies in 4K'], userLimit: 2, quality: '4K Ultra HD' },
    ],
  },
  {
    id: 'prime-video',
    name: 'Prime Video',
    description: 'Included with Amazon Prime, featuring originals and a vast catalog of movies.',
    longDescription: 'Watch movies, TV, and sports, including Amazon Originals like The Boys, The Marvelous Mrs. Maisel, and Tom Clancy’s Jack Ryan as well as recommendations just for you. App features: Rent or buy new-release movies and popular TV shows. Multi-user profiles create personalized entertainment experiences.',
    logoUrl: getImage('prime-video-logo')?.imageUrl ?? '',
    imageHint: getImage('prime-video-logo')?.imageHint ?? '',
    bannerUrl: getImage('prime-video-banner')?.imageUrl ?? '',
    bannerHint: getImage('prime-video-banner')?.imageHint ?? '',
    plans: [
      { id: 'prime-monthly', name: 'Prime Monthly', price: 14.99, features: ['Included with Amazon Prime', 'Live sports', 'Rent/buy options'], userLimit: 3, quality: '4K Ultra HD' },
      { id: 'prime-annual', name: 'Prime Annual', price: 139.00, features: ['Yearly subscription', 'Included with Amazon Prime'], userLimit: 3, quality: '4K Ultra HD' },
    ],
  },
  {
    id: 'hulu',
    name: 'Hulu',
    description: 'Access a huge streaming library with the latest episodes and classic shows.',
    longDescription: 'Hulu is the leading premium streaming service offering live and on-demand TV and movies, with and without commercials, both in and outside the home. Get exclusive series, hit movies, Originals, kids shows, and more.',
    logoUrl: getImage('hulu-logo')?.imageUrl ?? '',
    imageHint: getImage('hulu-logo')?.imageHint ?? '',
    bannerUrl: getImage('hulu-banner')?.imageUrl ?? '',
    bannerHint: getImage('hulu-banner')?.imageHint ?? '',
    plans: [
      { id: 'hulu-with-ads', name: 'With Ads', price: 7.99, features: ['Ad-supported', 'Full library access'], userLimit: 2, quality: '1080p HD' },
      { id: 'hulu-no-ads', name: 'No Ads', price: 17.99, features: ['Ad-free', 'Downloads', 'Full library access'], userLimit: 2, quality: '1080p HD' },
    ],
  },
  {
    id: 'apple-tv-plus',
    name: 'Apple TV+',
    description: 'Critically acclaimed Apple Original series and films. All ad-free.',
    longDescription: 'Apple TV+ is a streaming service featuring Apple Originals — award-winning series, compelling dramas, groundbreaking documentaries, kids’ entertainment, comedies, and more — with new Apple Originals added every month.',
    logoUrl: getImage('apple-tv-plus-logo')?.imageUrl ?? '',
    imageHint: getImage('apple-tv-plus-logo')?.imageHint ?? '',
    bannerUrl: getImage('apple-tv-plus-banner')?.imageUrl ?? '',
    bannerHint: getImage('apple-tv-plus-banner')?.imageHint ?? '',
    plans: [
      { id: 'apple-monthly', name: 'Monthly', price: 9.99, features: ['Ad-free', 'Family sharing (6 users)', 'Downloads'], userLimit: 6, quality: '4K Ultra HD' },
    ],
  },
];
