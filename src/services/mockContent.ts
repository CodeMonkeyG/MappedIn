import type { MallContentService } from './content';
import { mainLevelStorefronts } from './storefronts';

const delay = () => new Promise<void>((resolve) => window.setTimeout(resolve, 180));
const offers = [
  { title: 'Seasonal savings', offer: '15% off one regular-priced item' },
  { title: 'Mall visit special', offer: 'Buy one, get one 50% off' },
  { title: 'Featured offer', offer: '20% off your purchase' },
  { title: 'Shopper bonus', offer: 'Buy two, get one free' },
] as const;

const promotions = (propertyId: string) => mainLevelStorefronts.map((store, index) => {
  const offer = offers[index % offers.length];
  return {
    id: `promotion-${store.id}`,
    propertyId,
    spaceId: store.id,
    storeName: store.name,
    title: offer.title,
    offer: offer.offer,
    description: `Present this demo offer at ${store.name}. Terms and exclusions may apply.`,
    validFrom: '2026-11-01',
    validUntil: '2026-11-30',
  };
});

export const mockContentService: MallContentService = {
  async listSales(propertyId) {
    await delay();
    return promotions(propertyId);
  },
  async listFoodVendors(propertyId) {
    await delay();
    return [
      { id: 'food-five-guys', propertyId, name: 'Five Guys', storeName: 'Five Guys', menu: [{ id: 'burger', name: 'Classic burger', description: 'Sample menu item.', priceMinor: 1299, currency: 'CAD' }, { id: 'fries', name: 'Fries', description: 'Sample menu item.', priceMinor: 599, currency: 'CAD' }] },
      { id: 'food-starbucks', propertyId, name: 'Starbucks', storeName: 'Starbucks', menu: [{ id: 'coffee', name: 'Brewed coffee', description: 'Sample menu item.', priceMinor: 325, currency: 'CAD' }] },
    ];
  },
  async listEvents(propertyId) {
    await delay();
    return [
      { id: 'event-style', propertyId, title: 'Style showcase', description: 'Sample event details for the client demo.', startsAt: '2026-11-14T13:00:00-05:00', endsAt: '2026-11-14T15:00:00-05:00', location: 'Centre court', storeName: 'H&M' },
      { id: 'event-tasting', propertyId, title: 'Chocolate tasting', description: 'Sample event details for the client demo.', startsAt: '2026-11-21T11:00:00-05:00', endsAt: '2026-11-21T13:00:00-05:00', location: 'Lindt', storeName: 'Lindt' },
    ];
  },
};
