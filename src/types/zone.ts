export interface Zone {
  id: number
  name: string
  country_id: number
  country?: Country
  states?: State[]
  created_at: string
  updated_at: string
}

export interface Country {
  id: number
  name: string
  code?: string
}

export interface State {
  id: number
  name: string
  country_id: number
}

export interface Continent {
  id: number
  name: string
  countries?: Country[]
}

export interface GeoSelect {
  id: string
  name: string
  type: 'continent' | 'country' | 'state' | 'city'
}

export interface City {
  id: number
  name: string
  state_id: number
}

export interface CreateZoneRequest {
  name: string
  country_id: number
  states?: number[]
}

export interface UpdateZoneRequest {
  name?: string
  country_id?: number
  states?: number[]
}
