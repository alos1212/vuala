import  api  from "../lib/axios"
import type { InsurancePromotion, InsurancePromotionCreateData } from "../types/insurancePromotion"
import type { ApiResponse } from "../types/api"

export const insurancePromotionService = {
  // Obtener todas las promociones
  getAll: async (page = 1, limit = 10): Promise<InsurancePromotion[]> => {
    console.log("[v0] Obteniendo promociones de seguros, página:", page)
    const response = await api.get(`/insurance-promotions?page=${page}&limit=${limit}`)
    console.log("[v0] Respuesta promociones:", response.data)
    return response.data
  },

  // Obtener una promoción por ID
  getById: async (id: number): Promise<ApiResponse<InsurancePromotion>> => {
    console.log("[v0] Obteniendo promoción por ID:", id)
    const response = await api.get(`/insurance-promotions/${id}`)
    console.log("[v0] Respuesta promoción:", response.data)
    return response.data
  },

  // Crear nueva promoción
  create: async (data: InsurancePromotionCreateData): Promise<ApiResponse<InsurancePromotion>> => {
    console.log("[v0] Creando promoción con datos:", data)
    console.log("[v0] Tipo de relation:", typeof data.relation, "Valor:", data.relation)

    const response = await api.post("/insurance-promotions", data)
    console.log("[v0] Respuesta crear promoción:", response.data)
    return response.data
  },

  // Actualizar promoción
  update: async (id: number, data: InsurancePromotionCreateData): Promise<ApiResponse<InsurancePromotion>> => {
    console.log("[v0] Actualizando promoción ID:", id, "con datos:", data)
    const response = await api.put(`/insurance-promotions/${id}`, data)
    console.log("[v0] Respuesta actualizar promoción:", response.data)
    return response.data
  },

  // Eliminar promoción
  delete: async (id: number): Promise<ApiResponse<null>> => {
    console.log("[v0] Eliminando promoción ID:", id)
    const response = await api.delete(`/insurance-promotions/${id}`)
    console.log("[v0] Respuesta eliminar promoción:", response.data)
    return response.data
  },
}
