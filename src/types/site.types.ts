export interface Site {
  _id?: string;
  id: string;
  name: string;
  code: string;
  /** Brand IDs authorized at this rooftop (from backend: authorizedBrandIds) */
  authorizedBrands?: string[];
  /** Alias used by backend response */
  authorizedBrandIds?: string[];
  location?: string;
  roPrefix?: string;
  isActive?: boolean;
  address?: string;
  phone?: string;
  state?: string;
}
