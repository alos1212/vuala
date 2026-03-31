"use client"

import type React from "react"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-hot-toast"
import { insuranceComparisonFieldService } from "../../services/insuranceComparisonFieldService"
import type { InsuranceComparisonField, CreateInsuranceComparisonFieldData } from "../../types/insuranceComparisonField"
import InsuranceComparisonFieldList from "./InsuranceComparisonFieldList"
import InsuranceComparisonFieldForm from "./InsuranceComparisonFieldForm"
import { companyService } from "../../services/companyService"
import type { Company } from "../../types/company"

const InsuranceComparisonFieldManager: React.FC = () => {
  const [showForm, setShowForm] = useState(false)
  const [editingField, setEditingField] = useState<InsuranceComparisonField | null>(null)
  const queryClient = useQueryClient()

  // Obtener campos
  const {
    data: fieldsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["insurance-comparison-fields"],
    queryFn: insuranceComparisonFieldService.getAll,
  })

  const fields = fieldsData || []

  // Compañías para asociar beneficios
  const { data: companiesData = [] } = useQuery<Company[]>({
    queryKey: ["companies-all"],
    queryFn: () => companyService.getCompanies(),
  })
  const companies = companiesData || []

  // Crear campo
  const createMutation = useMutation({
    mutationFn: insuranceComparisonFieldService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-comparison-fields"] })
      toast.success("Campo creado exitosamente")
      setShowForm(false)
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || "Error al crear el campo"
      toast.error(errorMessage)
    },
  })

  // Actualizar campo
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateInsuranceComparisonFieldData }) =>
      insuranceComparisonFieldService.update(id, { ...data, id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-comparison-fields"] })
      toast.success("Campo actualizado exitosamente")
      setShowForm(false)
      setEditingField(null)
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || "Error al actualizar el campo"
      toast.error(errorMessage)
    },
  })

  // Eliminar campo
  const deleteMutation = useMutation({
    mutationFn: insuranceComparisonFieldService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-comparison-fields"] })
      toast.success("Campo eliminado exitosamente")
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || "Error al eliminar el campo"
      toast.error(errorMessage)
    },
  })

  // Cambiar orden
  const orderMutation = useMutation({
    mutationFn: ({ id, targetId }: { id: number; targetId: number }) =>
      insuranceComparisonFieldService.updateOrder(id, targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-comparison-fields"] })
      toast.success("Orden actualizado")
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || "Error al actualizar el orden"
      toast.error(errorMessage)
    },
  })

  const handleCreate = () => {
    setEditingField(null)
    setShowForm(true)
  }

  const handleEdit = (field: InsuranceComparisonField) => {
    setEditingField(field)
    setShowForm(true)
  }

  const handleDelete = (id: number) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este campo?")) {
      deleteMutation.mutate(id)
    }
  }

  const handleSubmit = (data: CreateInsuranceComparisonFieldData) => {
    if (editingField) {
      updateMutation.mutate({ id: editingField.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingField(null)
  }

  const handleChangeOrder = (id: number, targetId: number) => {
    orderMutation.mutate({ id, targetId })
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          Error al cargar los campos de comparación
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Beneficios</h1>
          <p className="text-gray-600 mt-1">Gestiona los beneficios de tus seguros</p>
        </div>
        {!showForm && (
          <button
            onClick={handleCreate}
            className="btn btn-primary"
          >
            Nuevo Campo
          </button>
        )}
      </div>

      {/* Contenido */}
      {showForm ? (
        <InsuranceComparisonFieldForm
          field={editingField}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={createMutation.isPending || updateMutation.isPending}
          companies={companies}
        />
      ) : (
        <InsuranceComparisonFieldList
          fields={fields}
          companies={companies}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onChangeOrder={handleChangeOrder}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}

export { InsuranceComparisonFieldManager }
export default InsuranceComparisonFieldManager
