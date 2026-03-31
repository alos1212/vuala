"use client"

import type React from "react"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-hot-toast"
import type { InsurancePromotion, InsurancePromotionCreateData } from "../../types/insurancePromotion"
import { insurancePromotionService } from "../../services/insurancePromotionService"
import InsurancePromotionList from "./InsurancePromotionList"
import InsurancePromotionForm from "./InsurancePromotionForm"

type ViewMode = "list" | "create" | "edit" | "view"

export const InsurancePromotionManager: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [selectedPromotion, setSelectedPromotion] = useState<InsurancePromotion | null>(null)
  const [currentPage] = useState(1)

  const queryClient = useQueryClient()

  const { data: promotionsData, isLoading } = useQuery({
    queryKey: ["insurance-promotions", currentPage],
    queryFn: () => insurancePromotionService.getAll(currentPage, 10),
    staleTime: 5 * 60 * 1000, // 5 minutos
  })

  console.log("[v0] Promotions data received:", promotionsData)
  console.log("[v0] Is loading:", isLoading)

  const createMutation = useMutation({
    mutationFn: insurancePromotionService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-promotions"] })
      toast.success("Promoción creada exitosamente")
      setViewMode("list")
    },
    onError: (error: any) => {
      console.error("[v0] Error al crear promoción:", error)
      const errorMessage = error.response?.data?.message || "Error al crear la promoción"
      toast.error(errorMessage)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: InsurancePromotionCreateData }) =>
      insurancePromotionService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-promotions"] })
      toast.success("Promoción actualizada exitosamente")
      setViewMode("list")
      setSelectedPromotion(null)
    },
    onError: (error: any) => {
      console.error("[v0] Error al actualizar promoción:", error)
      const errorMessage = error.response?.data?.message || "Error al actualizar la promoción"
      toast.error(errorMessage)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: insurancePromotionService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-promotions"] })
      toast.success("Promoción eliminada exitosamente")
    },
    onError: (error: any) => {
      console.error("[v0] Error al eliminar promoción:", error)
      const errorMessage = error.response?.data?.message || "Error al eliminar la promoción"
      toast.error(errorMessage)
    },
  })

  const handleCreate = () => {
    setSelectedPromotion(null)
    setViewMode("create")
  }

  const handleEdit = (promotion: InsurancePromotion) => {
    setSelectedPromotion(promotion)
    setViewMode("edit")
  }



  const handleDelete = (id: number) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta promoción?")) {
      deleteMutation.mutate(id)
    }
  }

  const handleSubmit = (data: InsurancePromotionCreateData) => {
    if (selectedPromotion) {
      updateMutation.mutate({ id: selectedPromotion.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleCancel = () => {
    setViewMode("list")
    setSelectedPromotion(null)
  }

 const promotions: InsurancePromotion[] =
  Array.isArray(promotionsData) 
    ? promotionsData 
    : promotionsData || [];


  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Promociones de Seguros</h1>
        {viewMode === "list" && (
          <button onClick={handleCreate} className="btn btn-primary">
            Nueva Promoción
          </button>
        )}
      </div>

      {viewMode === "list" && (
        <InsurancePromotionList
          promotions={promotions}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      )}

      {(viewMode === "create" || viewMode === "edit") && (
        <InsurancePromotionForm
          promotion={selectedPromotion || undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {viewMode === "view" && selectedPromotion && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-header">
            <h2 className="card-title text-2xl">Detalles de la Promoción</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <strong>Nombre:</strong> {selectedPromotion.name}
              </div>
              <div>
                <strong>Tipo:</strong> {selectedPromotion.relation === 1 ? "Intervalo" : "Edad"}
              </div>
              {selectedPromotion.relation === 1 && (
                <>
                  <div>
                    <strong>Intervalo:</strong>{" "}
                    {selectedPromotion.interval === 1
                      ? "Para Todos"
                      : selectedPromotion.interval === 2
                        ? "2 en 2"
                        : selectedPromotion.interval === 3
                          ? "3 en 3"
                          : "-"}
                  </div>
                  <div>
                    <strong>Descuentos:</strong>
                    <ul className="list-disc list-inside ml-4">
                      <li>Descuento 1: {selectedPromotion.interval1}%</li>
                      {selectedPromotion.interval2 && <li>Descuento 2: {selectedPromotion.interval2}%</li>}
                      {selectedPromotion.interval3 && <li>Descuento 3: {selectedPromotion.interval3}%</li>}
                    </ul>
                  </div>
                </>
              )}
              {selectedPromotion.relation === 2 && (
                <>
                  <div>
                    <strong>Rango de Edad:</strong> {selectedPromotion.start_age} - {selectedPromotion.end_age} años
                  </div>
                  <div>
                    <strong>Descuento:</strong> {selectedPromotion.discount}%
                  </div>
                </>
              )}
            </div>
            <div className="card-actions justify-end mt-4">
              <button onClick={handleCancel} className="btn btn-ghost">
                Cerrar
              </button>
              <button onClick={() => handleEdit(selectedPromotion)} className="btn btn-primary">
                Editar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InsurancePromotionManager
