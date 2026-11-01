export interface Sale {
  id: string;
  propertyId: string;
  title: string;
  description: string;
  storeName?: string;
  validFrom: string;
  validUntil: string;
}

export interface FoodVendor {
  id: string;
  propertyId: string;
  name: string;
  storeName?: string;
  menu: { id: string; name: string; description: string; priceMinor: number; currency: string }[];
}

export interface MallEvent {
  id: string;
  propertyId: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  location: string;
  storeName?: string;
}

export interface MallContentService {
  listSales(propertyId: string): Promise<Sale[]>;
  listFoodVendors(propertyId: string): Promise<FoodVendor[]>;
  listEvents(propertyId: string): Promise<MallEvent[]>;
}
