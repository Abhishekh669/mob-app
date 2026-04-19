export interface RestaurantSettings {
  id: string;

  name: string;
  slogan?: string;
  logo_url?: string;

  phone?: string;
  email?: string;

  address?: string;
  country?: string;
  state?: string;
  city?: string;

  created_at: string;
  updated_at: string;
}
