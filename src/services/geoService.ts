import api from "../lib/axios"
import type { Continent, Country, State, City, GeoSelect } from "../types/zone"

export const geoService = {
  // Obtener países
  getCountries: async (): Promise<Country[]> => {
    const response = await api.get<Country[]>("/countries")
    return response.data
  },

  // Obtener continentes
  getContinents: async (): Promise<Continent[]> => {
    const response = await api.get<Continent[]>("/continents")
    return response.data
  },

  // Obtener países por continente
  getCountriesByContinent: async (continentId: number): Promise<Country[]> => {
    const response = await api.get<Country[]>(`/continents/${continentId}/countries`)
    return response.data
  },

  // Obtener estados por país
  getStatesByCountry: async (countryId: number): Promise<State[]> => {
    const response = await api.get<State[]>(`/countries/${countryId}/states`)
    return response.data
  },

  // Obtener ciudades por estado
  getCitiesByState: async (stateId: number): Promise<City[]> => {
    const response = await api.get<City[]>(`/states/${stateId}/cities`)
    return response.data
  },

  // Obtener ciudades por país
  getCitiesByCountry: async (countryId: number): Promise<City[]> => {
    const response = await api.get<City[]>(`/countries/${countryId}/cities`)
    return response.data
  },

  // Obtener continentes con países
  getContinentsWithCountries: async (): Promise<GeoSelect[]> => {
    const response = await api.get<GeoSelect[]>("/select/continents-countries")
    return response.data
  },

  getCountryCitiesSelect: async (countryId: number): Promise<GeoSelect[]> => {
    const response = await api.get<GeoSelect[]>(`/select/countries/${countryId}/cities`)
    return response.data
  },

  // Obtener país con ciudades
  getCountryWithCities: async (countryId: number): Promise<Country> => {
    const response = await api.get<Country>(`/countries/${countryId}/with-cities`)
    return response.data
  },
}
