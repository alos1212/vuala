"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { InsuranceComparisonField, CreateInsuranceComparisonFieldData } from "../../types/insuranceComparisonField"
import { X } from "lucide-react"
import type { Company } from "../../types/company"

interface InsuranceComparisonFieldFormProps {
  field?: InsuranceComparisonField | null
  onSubmit: (data: CreateInsuranceComparisonFieldData) => void
  onCancel: () => void
  isLoading?: boolean
  companies?: Company[]
}

const InsuranceComparisonFieldForm: React.FC<InsuranceComparisonFieldFormProps> = ({
  field,
  onSubmit,
  onCancel,
  isLoading = false,
  companies = [],
}) => {
  const [formData, setFormData] = useState<CreateInsuranceComparisonFieldData>({
    name: field?.name || "",
    name_en: field?.name_en || "",
    field_type: field?.field_type || "text",
    is_filterable: field?.is_filterable || false,
    is_comparative: field?.is_filterable || false,
    in_results: field?.is_filterable || false,
    company_id: field?.company_id ?? null,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (field) {
      setFormData({
        name: field.name,
        name_en: field.name_en,
        field_type: field.field_type,
        is_filterable: field.is_filterable,
        is_comparative: field.is_comparative,
        in_results: field.in_results,
        company_id: field.company_id ?? null,
      })
    }
  }, [field])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    console.log("[v0] Campo cambiado:", name, type === "checkbox" ? checked : value)

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "company_id"
          ? value ? Number(value) : null
          : value,
    }))

    // Limpiar error del campo
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "El nombre en español es requerido"
    }

    if (!formData.name_en.trim()) {
      newErrors.name_en = "El nombre en inglés es requerido"
    }

    if (!formData.field_type) {
      newErrors.field_type = "El tipo de campo es requerido"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    console.log("[v0] Enviando formulario:", formData)

    if (!validateForm()) {
      console.log("[v0] Errores de validación:", errors)
      return
    }

    onSubmit(formData)
  }

  const getFieldTypeLabel = (type: string) => {
    switch (type) {
      case "value":
        return "Valor Numérico"
      case "text":
        return "Texto"
      case "included":
        return "Incluido"
      default:
        return type
    }
  }

  return (
    <div className="card bg-base-100 shadow-xl w-full container mx-auto">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title text-xl">{field ? "Editar Campo" : "Nuevo Campo"}</h2>
          <button onClick={onCancel} className="btn btn-sm btn-ghost">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {Object.keys(errors).length > 0 && (
            <div className="alert alert-error">
              <span>
                {Object.values(errors).map((error, index) => (
                  <div key={index}>• {error}</div>
                ))}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Nombre (Español) *</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="input input-bordered w-full"
                placeholder="Ej: Cobertura médica"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Nombre (Inglés) *</span>
              </label>
              <input
                type="text"
                name="name_en"
                value={formData.name_en}
                onChange={handleInputChange}
                className="input input-bordered w-full"
                placeholder="Ex: Medical coverage"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Compañía / Aseguradora</span>
              </label>
              <select
                name="company_id"
                value={formData.company_id ?? ""}
                onChange={handleInputChange}
                className="select select-bordered w-full"
              >
                <option value="">Todas</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              <div className="label">
                <span className="label-text-alt">Asignar beneficia sólo a esta compañía (opcional).</span>
              </div>
            </div>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Tipo de Campo *</span>
            </label>
            <select
              name="field_type"
              value={formData.field_type}
              onChange={handleInputChange}
              className="select select-bordered w-full"
              required
            >
              <option value="text">Texto</option>
              <option value="value">Valor Numérico</option>
              <option value="included">Incluido</option>
            </select>
            <div className="label">
              <span className="label-text-alt">Tipo actual: {getFieldTypeLabel(formData.field_type)}</span>
            </div>
          </div>

          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-2">
              <input
                type="checkbox"
                name="is_filterable"
                checked={formData.is_filterable}
                onChange={handleInputChange}
                className="checkbox checkbox-primary"
              />
              <div>
                <span className="label-text">Campo Filtrable</span>
                <div className="label">
                  <span className="label-text-alt"> Permite usar este campo como filtro en las comparaciones </span>
                </div>
              </div>
            </label>
          </div>
           <div className="form-control">
            <label className="label cursor-pointer justify-start gap-2">
              <input
                type="checkbox"
                name="is_comparative"
                checked={formData.is_comparative}
                onChange={handleInputChange}
                className="checkbox checkbox-primary"
              />
              <div>
                <span className="label-text">Campo de Comparador</span>
                <div className="label">
                  <span className="label-text-alt">Permite usar este campo para comparar con los otros planes</span>
                </div>
              </div>
              
            </label>
          </div>
           <div className="form-control">
            <label className="label cursor-pointer justify-start gap-2">
              <input
                type="checkbox"
                name="in_results"
                checked={formData.in_results}
                onChange={handleInputChange}
                className="checkbox checkbox-primary"
              />
              <div>
                <span className="label-text">Campo  que se va a mostrar en las busquedas</span>
                <div className="label">
                  <span className="label-text-alt">Permite usar este campo para mostrar en las busquedas</span>
                </div>
              </div>
              
            </label>
          </div>

          <div className="card-actions justify-end pt-4">
            <button type="button" onClick={onCancel} className="btn btn-outline">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading} className="btn btn-primary">
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Guardando...
                </>
              ) : field ? (
                "Actualizar"
              ) : (
                "Crear"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default InsuranceComparisonFieldForm
