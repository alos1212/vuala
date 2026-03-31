import api from "../lib/axios"
import type { Zone, CreateZoneRequest, UpdateZoneRequest } from "../types/zone"

export const zoneService = {
  // Obtener todas las zonas
  getAll: async (): Promise<Zone[]> => {
    const response = await api.get<Zone[]>("/zones")
    return response.data
  },

  // Obtener una zona específica
  getById: async (id: number): Promise<Zone> => {
    const response = await api.get<Zone>(`/zones/${id}`)
    return response.data
  },

  // Crear nueva zona
  create: async (data: CreateZoneRequest): Promise<Zone> => {
    const response = await api.post<Zone>("/zones", data)
    return response.data
  },

  // Actualizar zona
  update: async (id: number, data: UpdateZoneRequest): Promise<Zone> => {
    const response = await api.put<Zone>(`/zones/${id}`, data)
    return response.data
  },

  // Eliminar zona
  delete: async (id: number): Promise<void> => {
    await api.delete(`/zones/${id}`)
  },
}
