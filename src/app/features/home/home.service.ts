import { Injectable } from '@angular/core';

export interface Listing {
  id: string;
  title: string;
  price: number;
  location: string;
  city: string;
  type: 'Apartment' | 'House' | 'Studio' | string;
  image: string;
}

@Injectable({ providedIn: 'root' })
export class HomeService {
  readonly listings: Listing[] = [
    {
      id: '1',
      title: 'Modern Apartment',
      price: 1200,
      location: 'Downtown',
      city: 'San Francisco',
      type: 'Apartment',
      image: 'https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&w=1600&auto=format&fit=crop'
    },
    {
      id: '2',
      title: 'Cozy House',
      price: 1800,
      location: 'Quiet Suburb',
      city: 'Austin',
      type: 'House',
      image: 'https://images.unsplash.com/photo-1560185008-b033106af2fb?q=80&w=1600&auto=format&fit=crop'
    },
    {
      id: '3',
      title: 'Stylish Studio',
      price: 900,
      location: 'City Center',
      city: 'New York',
      type: 'Studio',
      image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1600&auto=format&fit=crop'
    },
    {
      id: '4',
      title: 'Spacious House',
      price: 2200,
      location: 'Green District',
      city: 'Seattle',
      type: 'House',
      image: 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?q=80&w=1600&auto=format&fit=crop'
    }
  ];
}


