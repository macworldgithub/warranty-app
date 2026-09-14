export interface Site {
  _id?: string;
  id: string;
  name: string;
  code: string;
  authorizedBrands?: string[];
  address?: string;
  phone?: string;
  state?: string;
}
