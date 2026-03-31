"use client"

import type React from "react"
import type { InsurancePromotion } from "../../types/insurancePromotion"
import { Pencil, Trash2, Percent, Calendar, Users } from "lucide-react"

interface InsurancePromotionListProps {
  promotions: InsurancePromotion[]
  onEdit: (promotion: InsurancePromotion) => void
  onDelete: (id: number) => void
  onAdd?: () => void
  isLoading?: boolean
}

export const InsurancePromotionList: React.FC<InsurancePromotionListProps> = ({
  promotions,
  onEdit,
  onDelete,
  onAdd,
  isLoading = false,
}) => {
  console.log("[v0] Promotions data:", promotions)

  const getRelationText = (relation: number) => {
    return relation === 1 ? "Intervalo" : "Edad"
  }

  const getIntervalText = (interval?: number) => {
    if (!interval) return "-"
    switch (interval) {
      case 1:
        return "Para Todos"
      case 2:
        return "2 en 2"
      case 3:
        return "3 en 3"
      default:
        return "-"
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
     

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {promotions.map((promotion) => {
          console.log("[v0] Individual promotion:", promotion)
          console.log("[v0] Relation:", promotion.relation, "Type:", typeof promotion.relation)

          return (
            <div key={promotion.id} className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow p-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold">{promotion.name}</h3>
                <span
                  className={`text-xs font-medium px-2.5 py-0.5 rounded ${
                    Number(promotion.relation) === 1 ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                  }`}
                >
                  {getRelationText(Number(promotion.relation))}
                </span>
              </div>

              <div className="space-y-3">
                {Number(promotion.relation) === 1 ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <p className="text-sm text-gray-600">Intervalo: {getIntervalText(promotion.interval)}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {promotion.interval1 !== null && promotion.interval1 !== undefined && (
                        <div className="bg-blue-50 p-2 rounded text-center">
                          <div className="text-xs text-gray-600">1er</div>
                          <div className="font-semibold text-blue-600">{promotion.interval1}%</div>
                        </div>
                      )}
                      {promotion.interval2 !== null && promotion.interval2 !== undefined && (
                        <div className="bg-green-50 p-2 rounded text-center">
                          <div className="text-xs text-gray-600">2do</div>
                          <div className="font-semibold text-green-600">{promotion.interval2}%</div>
                        </div>
                      )}
                      {promotion.interval3 !== null && promotion.interval3 !== undefined && (
                        <div className="bg-purple-50 p-2 rounded text-center">
                          <div className="text-xs text-gray-600">3er</div>
                          <div className="font-semibold text-purple-600">{promotion.interval3}%</div>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      Debug: interval1={promotion.interval1}, interval2={promotion.interval2}, interval3=
                      {promotion.interval3}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <p className="text-sm text-gray-600">Rango de edad:</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <div className="text-center">
                        <div className="text-sm text-gray-600">
                          {promotion.start_age && promotion.end_age
                            ? `${promotion.start_age} - ${promotion.end_age} años`
                            : "Sin rango definido"}
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <Percent className="h-4 w-4 text-green-600" />
                          <span className="font-semibold text-green-600 text-lg">
                            {promotion.discount ? `${promotion.discount}%` : "0%"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      Debug: start_age={promotion.start_age}, end_age={promotion.end_age}, discount={promotion.discount}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onEdit(promotion)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium py-1 px-3 rounded flex items-center gap-1"
                  >
                    <Pencil className="h-3 w-3" />
                    Editar
                  </button>
                  <button
                    onClick={() => onDelete(promotion.id)}
                    className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-1 px-3 rounded flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {promotions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No hay promociones registradas</p>
          <button onClick={onAdd} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded">
            Crear primera promoción
          </button>
        </div>
      )}
    </div>
  )
}

export default InsurancePromotionList
