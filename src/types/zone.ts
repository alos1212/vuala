export interface Continent {
  id: number;
  name: string;
  code?: string | null;
}

export interface Country {
  id: number;
  name: string;
  code?: string | null;
  continent_id?: number | null;
}

export interface State {
  id: number;
  name: string;
  code?: string | null;
  country_id?: number | null;
}

export interface City {
  id: number;
  name: string;
  state_id?: number | null;
  country_id?: number | null;
}

export interface GeoSelect {
  value: number | string;
  label: string;
  children?: GeoSelect[];
}
