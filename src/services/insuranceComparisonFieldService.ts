import  api  from "../lib/axios"
import type {
  InsuranceComparisonField,
  CreateInsuranceComparisonFieldData,
  UpdateInsuranceComparisonFieldData,
} from "../types/insuranceComparisonField"

export const insuranceComparisonFieldService = {
  // Obtener todos los campos
  getAll: async (): Promise<InsuranceComparisonField[]> => {
    const response = await api.get("/insurance-comparison-fields")
    return response.data
  },

  // Obtener un campo por ID
  getById: async (id: number): Promise<{ data: InsuranceComparisonField }> => {
    const response = await api.get(`/insurance-comparison-fields/${id}`)
    return response.data
  },

  // Crear nuevo campo
  create: async (data: CreateInsuranceComparisonFieldData): Promise<{ data: InsuranceComparisonField }> => {
    const response = await api.post("/insurance-comparison-fields", data)
    return response.data
  },

  // Actualizar campo
  update: async (id: number, data: UpdateInsuranceComparisonFieldData): Promise<{ data: InsuranceComparisonField }> => {
    const response = await api.put(`/insurance-comparison-fields/${id}`, data)
    return response.data
  },

  // Eliminar campo
  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/insurance-comparison-fields/${id}`)
    return response.data
  },

  // 🔹 Cambiar orden (intercambia con el campo que tenga ese orden)
  updateOrder: async (id: number, newOrder: number): Promise<{ data: InsuranceComparisonField }> => {
    const response = await api.patch(`/insurance-comparison-fields/${id}/order`, { order: newOrder })
    return response.data
  },
}
