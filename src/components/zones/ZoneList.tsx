import type React from "react"
import { useState, useEffect } from "react"
import { zoneService } from "../../services/zoneService"
import type { Zone } from "../../types/zone"
import { Pencil, Trash2, Plus, Eye } from "lucide-react"

interface ZoneListProps {
  onEdit: (zone: Zone) => void
  onView: (zone: Zone) => void
  onDelete: (zone: Zone) => void
  onAdd: () => void
  refresh: boolean
}

export const ZoneList: React.FC<ZoneListProps> = ({ onEdit, onView, onDelete, onAdd, refresh }) => {
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchZones = async () => {
    try {
      setLoading(true)
      const data = await zoneService.getAll()
      setZones(data)
      setError(null)
    } catch (err) {
      setError("Error al cargar las zonas")
      console.error("Error fetching zones:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchZones()
  }, [refresh])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <span>{error}</span>
        </div>
        <button onClick={fetchZones} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded">
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Administrador de Zonas</h2>
        <button
          onClick={onAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nueva Zona
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {zones.map((zone) => (
          <div key={zone.id} className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow p-6">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-semibold">{zone.name}</h3>
              <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">
                {zone.country?.name || "Sin país"}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Estados asociados:</p>
                <p className="font-medium">{zone.states?.length || 0} estado(s)</p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => onView(zone)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium py-1 px-3 rounded flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  Ver
                </button>
                <button
                  onClick={() => onEdit(zone)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium py-1 px-3 rounded flex items-center gap-1"
                >
                  <Pencil className="h-3 w-3" />
                  Editar
                </button>
                <button
                  onClick={() => onDelete(zone)}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-1 px-3 rounded flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {zones.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No hay zonas registradas</p>
          <button onClick={onAdd} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded">
            Crear primera zona
          </button>
        </div>
      )}
    </div>
  )
}
