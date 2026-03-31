"use client"

import type React from "react"
import { useState } from "react"
import type {
  InsurancePromotion,
  InsurancePromotionFormData,
  InsurancePromotionCreateData,
} from "../../types/insurancePromotion"

interface InsurancePromotionFormProps {
  promotion?: InsurancePromotion
  onSubmit: (data: InsurancePromotionCreateData) => void
  onCancel: () => void
  isLoading?: boolean
}

export const InsurancePromotionForm: React.FC<InsurancePromotionFormProps> = ({
  promotion,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<InsurancePromotionFormData>({
    name: promotion?.name || "",
    relation: promotion?.relation ? promotion.relation.toString() : "1",
    interval: promotion?.interval ? promotion.interval.toString() : "1",
    interval1: promotion?.interval1 ? promotion.interval1.toString() : "",
    interval2: promotion?.interval2 ? promotion.interval2.toString() : "",
    interval3: promotion?.interval3 ? promotion.interval3.toString() : "",
    start_age: promotion?.start_age ? promotion.start_age.toString() : "",
    end_age: promotion?.end_age ? promotion.end_age.toString() : "",
    discount: promotion?.discount ? promotion.discount.toString() : "",
  })

  const [errors, setErrors] = useState<string[]>([])

  const showIntervalFields = formData.relation === "1"
  const showAgeFields = formData.relation === "2"

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    console.log("[v0] Cambio en campo:", name, "Valor:", value)

    if (name === "interval") {
      setFormData((prev) => {
        const newData = { ...prev, [name]: value }

        // Si cambia a "Para Todos" (1), limpiar interval2 e interval3
        if (value === "1") {
          newData.interval2 = ""
          newData.interval3 = ""
        }
        // Si cambia a "2 en 2" (2), limpiar interval3
        else if (value === "2") {
          newData.interval3 = ""
        }

        return newData
      })
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }

    if (errors.length > 0) {
      setErrors([])
    }
  }

  const validateForm = (): boolean => {
    const newErrors: string[] = []

    if (!formData.name.trim()) {
      newErrors.push("El nombre es requerido")
    }

    if (showIntervalFields) {
      if (!formData.interval1.trim()) {
        newErrors.push("El descuento es requerido")
      }
      if (formData.interval === "2" && !formData.interval2.trim()) {
        newErrors.push('El descuento 2 es requerido para intervalo "2 en 2"')
      }
      if (formData.interval === "3" && (!formData.interval2.trim() || !formData.interval3.trim())) {
        newErrors.push('Los descuentos 2 y 3 son requeridos para intervalo "3 en 3"')
      }
    }

    if (showAgeFields) {
      if (!formData.start_age.trim()) {
        newErrors.push("La edad inicial es requerida")
      }
      if (!formData.end_age.trim()) {
        newErrors.push("La edad final es requerida")
      }
      if (!formData.discount.trim()) {
        newErrors.push("El descuento es requerido")
      }

      const startAge = Number(formData.start_age)
      const endAge = Number(formData.end_age)
      if (startAge && endAge && startAge >= endAge) {
        newErrors.push("La edad inicial debe ser menor que la edad final")
      }
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const submitData: InsurancePromotionCreateData = {
      name: formData.name.trim(),
      relation: Number(formData.relation),
    }

    if (showIntervalFields) {
      submitData.interval = Number(formData.interval)
      submitData.interval1 = Number(formData.interval1)
      if (formData.interval2) submitData.interval2 = Number(formData.interval2)
      if (formData.interval3) submitData.interval3 = Number(formData.interval3)
    }

    if (showAgeFields) {
      submitData.start_age = Number(formData.start_age)
      submitData.end_age = Number(formData.end_age)
      submitData.discount = Number(formData.discount)
    }

    console.log("[v0] Enviando datos de promoción:", submitData)
    onSubmit(submitData)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-2xl p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold">{promotion ? "Editar Promoción" : "Nueva Promoción"}</h2>
            <p className="text-blue-100 text-sm">Configure los descuentos para promociones de seguros</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-b-2xl shadow-xl border border-gray-100">
        {errors.length > 0 && (
          <div className="m-6 mb-0">
            <div className="alert alert-error bg-red-50 border-red-200 text-red-800">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h3 className="font-semibold text-red-800">Errores de validación:</h3>
                  <ul className="mt-1 space-y-1">
                    {errors.map((error, index) => (
                      <li key={index} className="text-sm">
                        • {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Información Básica</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Nombre de la Promoción *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input input-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  placeholder="Ej: Descuento Familiar 2024"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Tipo de Descuento *</label>
                <select
                  name="relation"
                  value={formData.relation}
                  onChange={handleInputChange}
                  className="select select-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="1">📊 Por Intervalo de Pólizas</option>
                  <option value="2">🎂 Por Rango de Edad</option>
                </select>
              </div>
            </div>
          </div>

          {showIntervalFields && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold">Configuración por Intervalo</h3>
                </div>
                <p className="text-green-100 text-sm mt-1">Defina descuentos según la cantidad de pólizas</p>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Tipo de Intervalo</label>
                    <select
                      name="interval"
                      value={formData.interval}
                      onChange={handleInputChange}
                      className="select select-bordered w-full focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="1">🌟 Para Todos</option>
                      <option value="2">📈 2 en 2</option>
                      <option value="3">🚀 3 en 3</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Descuento Principal *</label>
                    <div className="relative">
                      <input
                        type="number"
                        name="interval1"
                        value={formData.interval1}
                        onChange={handleInputChange}
                        className="input input-bordered w-full pr-12 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="15"
                        min="0"
                        max="100"
             
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-green-600 font-medium">%</span>
                      </div>
                    </div>
                  </div>

                  {(formData.interval === "2" || formData.interval === "3") && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Descuento Secundario *</label>
                      <div className="relative">
                        <input
                          type="number"
                          name="interval2"
                          value={formData.interval2}
                          onChange={handleInputChange}
                          className="input input-bordered w-full pr-12 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="20"
                          min="0"
                          max="100"
                           
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-green-600 font-medium">%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.interval === "3" && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Descuento Terciario *</label>
                      <div className="relative">
                        <input
                          type="number"
                          name="interval3"
                          value={formData.interval3}
                          onChange={handleInputChange}
                          className="input input-bordered w-full pr-12 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="25"
                          min="0"
                          max="100"
                           
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-green-600 font-medium">%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {showAgeFields && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold">Configuración por Edad</h3>
                </div>
                <p className="text-purple-100 text-sm mt-1">Defina descuentos según el rango de edad del asegurado</p>
              </div>

              <div className="p-6">
                <div className="bg-white rounded-xl p-4 border border-purple-100">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Configuración del Descuento por Edad
                  </label>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-gray-600">Personas entre</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        name="start_age"
                        value={formData.start_age}
                        onChange={handleInputChange}
                        className="input input-bordered input-sm w-20 text-center focus:ring-2 focus:ring-purple-500"
                        placeholder="18"
                        min="0"
                        max="120"
                      />
                      <span className="text-xs text-gray-500">años</span>
                    </div>
                    <span className="text-gray-600">y</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        name="end_age"
                        value={formData.end_age}
                        onChange={handleInputChange}
                        className="input input-bordered input-sm w-20 text-center focus:ring-2 focus:ring-purple-500"
                        placeholder="65"
                        min="0"
                        max="120"
                      />
                      <span className="text-xs text-gray-500">años</span>
                    </div>
                    <span className="text-gray-600">reciben un descuento del</span>
                    <div className="relative">
                      <input
                        type="number"
                        name="discount"
                        value={formData.discount}
                        onChange={handleInputChange}
                        className="input input-bordered input-sm w-20 pr-8 text-center focus:ring-2 focus:ring-purple-500"
                        placeholder="10"
                        min="0"
                        max="100"
                         
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                        <span className="text-purple-600 font-medium text-xs">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-ghost hover:bg-gray-100 transition-colors duration-200"
              disabled={isLoading}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-none text-white shadow-lg hover:shadow-xl transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Guardando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {promotion ? "Actualizar Promoción" : "Crear Promoción"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default InsurancePromotionForm
