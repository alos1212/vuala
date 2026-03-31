"use client"

import React, { useState, useEffect } from "react"
import { FiEdit, FiTrash2, FiArrowUp, FiArrowDown } from "react-icons/fi"
import type { InsuranceComparisonField } from "../../types/insuranceComparisonField"
import type { Company } from "../../types/company"

interface Props {
  fields: InsuranceComparisonField[] | never[]
  companies?: Company[]
  onEdit: (field: InsuranceComparisonField) => void
  onDelete: (id: number) => void
  onChangeOrder: (id: number, targetId: number) => Promise<void> | void
  isLoading: boolean
}

const getFieldTypeInfo = (type: string) => {
  switch (type) {
    case "value":
      return { label: "Valor numérico", className: "badge badge-info" }
    case "text":
      return { label: "Texto libre", className: "badge badge-warning" }
    case "included":
      return { label: "Incluido / No", className: "badge badge-success" }
    default:
      return { label: "Desconocido", className: "badge" }
  }
}

const InsuranceComparisonFieldList: React.FC<Props> = ({
  fields,
  companies = [],
  onEdit,
  onDelete,
  onChangeOrder,
  isLoading,
}) => {
  const [localFields, setLocalFields] = useState<InsuranceComparisonField[]>([])

  useEffect(() => {
    setLocalFields(fields)
  }, [fields])

  if (isLoading) {
    return <div className="text-center py-6">Cargando campos...</div>
  }

  if (localFields.length === 0) {
    return <div className="text-center py-6">No hay campos creados aún</div>
  }

  const sortedFields = [...localFields].sort((a, b) => a.order - b.order)

  const handleChangeOrder = async (id: number, targetId: number) => {
    setLocalFields((prev) => {
      const updated = [...prev]
      const indexA = updated.findIndex((f) => f.id === id)
      const indexB = updated.findIndex((f) => f.id === targetId)

      if (indexA === -1 || indexB === -1) return prev

      const temp = updated[indexA].order
      updated[indexA].order = updated[indexB].order
      updated[indexB].order = temp

      return updated
    })

    await onChangeOrder(id, targetId)
  }

  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      <table className="table w-full">
        {/* Headers solo en desktop */}
        <thead className="hidden md:table-header-group">
          <tr className="bg-gray-100 text-gray-700">
            <th className="px-4 py-2 text-left">Nombre (ES)</th>
            <th className="px-4 py-2 text-left">Name (EN)</th>
            <th className="px-4 py-2 text-left">Compañía</th>
            <th className="px-4 py-2 text-left">Tipo</th>
            <th className="px-4 py-2 text-left">comparador</th>
            <th className="px-4 py-2 text-left">Filtrable</th>
            <th className="px-4 py-2 text-left">Busqueda</th>
            <th className="px-4 py-2 text-center">Orden</th>
            <th className="px-4 py-2 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sortedFields.map((field, index) => {
            const typeInfo = getFieldTypeInfo(field.field_type)
            const prev = sortedFields[index - 1]
            const next = sortedFields[index + 1]

            return (
              <tr key={field.id} className="hover:bg-gray-50">
                {/* Versión Desktop */}
                <td className="px-4 py-2 hidden md:table-cell">{field.name}</td>
                <td className="px-4 py-2 hidden md:table-cell">{field.name_en}</td>
                <td className="px-4 py-2 hidden md:table-cell">
                  {field.company?.name ||
                    companies.find((c) => c.id === field.company_id)?.name ||
                    "—"}
                </td>
                <td className="px-4 py-2 hidden md:table-cell">
                  <span className={`${typeInfo.className} w-auto h-auto px-3 py-1 whitespace-normal break-words leading-normal`}>
                    {typeInfo.label}
                  </span>
                </td>
                <td className="px-4 py-2 hidden md:table-cell">
                  {field.is_comparative ? (
                    <span className="badge badge-success whitespace-nowrap">Sí</span>
                  ) : (
                    <span className="badge badge-ghost whitespace-nowrap">No</span>
                  )}
                </td>
                <td className="px-4 py-2 hidden md:table-cell">
                  {field.is_filterable ? (
                    <span className="badge badge-success whitespace-nowrap">Sí</span>
                  ) : (
                    <span className="badge badge-ghost whitespace-nowrap">No</span>
                  )}
                </td>
                <td className="px-4 py-2 hidden md:table-cell">
                  {field.in_results ? (
                    <span className="badge badge-success whitespace-nowrap">Sí</span>
                  ) : (
                    <span className="badge badge-ghost whitespace-nowrap">No</span>
                  )}
                </td>
                {/* Columna Orden */}
                <td className="px-4 py-2 text-center hidden md:table-cell">
                  <div className="flex gap-1 justify-center">
                    <button
                      disabled={!prev}
                      onClick={() => prev && handleChangeOrder(field.id, prev.order)}
                      className="btn btn-xs btn-outline btn-info"
                      title="Mover arriba"
                    >
                      <FiArrowUp />
                    </button>
                    <button
                      disabled={!next}
                      onClick={() => next && handleChangeOrder(field.id, next.order)}
                      className="btn btn-xs btn-outline btn-info"
                      title="Mover abajo"
                    >
                      <FiArrowDown />
                    </button>
                  </div>
                </td>
                {/* Columna Acciones */}
                <td className="px-4 py-2 text-right whitespace-nowrap hidden md:table-cell">
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => onEdit(field)}
                      className="btn btn-xs btn-outline btn-primary"
                      title="Editar"
                    >
                      <FiEdit />
                    </button>
                    <button
                      onClick={() => onDelete(field.id)}
                      className="btn btn-xs btn-outline btn-error"
                      title="Eliminar"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </td>

                {/* Versión Mobile: Tarjeta apilada */}
                <td colSpan={6} className="md:hidden block p-4 border-t">
                  <div className="space-y-2">
                    <div>
                      <strong>Nombre (ES):</strong> {field.name}
                    </div>
                    <div>
                      <strong>Name (EN):</strong> {field.name_en}
                    </div>
                    <div>
                      <strong>Compañía:</strong>{" "}
                      {field.company?.name ||
                        companies.find((c) => c.id === field.company_id)?.name ||
                        "—"}
                    </div>
                    <div>
                      <strong>Tipo:</strong> <span className={`${typeInfo.className} whitespace-nowrap text-ellipsis overflow-hidden max-w-[120px] inline-block`}>{typeInfo.label}</span>
                    </div>
                    <div>
                      <strong>Filtrable:</strong> {field.is_filterable ? "Sí" : "No"}
                    </div>
                    <div className="flex justify-between mt-2">
                      <div className="flex gap-1">
                        <button
                          disabled={!prev}
                          onClick={() => prev && handleChangeOrder(field.id, prev.id)}
                          className="btn btn-xs btn-outline btn-info"
                          title="Mover arriba"
                        >
                          <FiArrowUp />
                        </button>
                        <button
                          disabled={!next}
                          onClick={() => next && handleChangeOrder(field.id, next.id)}
                          className="btn btn-xs btn-outline btn-info"
                          title="Mover abajo"
                        >
                          <FiArrowDown />
                        </button>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => onEdit(field)}
                          className="btn btn-xs btn-outline btn-primary"
                          title="Editar"
                        >
                          <FiEdit />
                        </button>
                        <button
                          onClick={() => onDelete(field.id)}
                          className="btn btn-xs btn-outline btn-error"
                          title="Eliminar"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default InsuranceComparisonFieldList
