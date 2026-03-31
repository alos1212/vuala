import type React from "react"
import type { Zone } from "../../types/zone"
import { X, MapPin, Globe, Calendar } from "lucide-react"

interface ZoneDetailProps {
  zone: Zone
  onClose: () => void
  onEdit: () => void
}

export const ZoneDetail: React.FC<ZoneDetailProps> = ({ zone, onClose, onEdit }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="card bg-base-100 shadow-xl w-full max-w-2xl mx-auto">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Detalles de la Zona
          </h2>
          <button onClick={onClose} className="btn btn-sm btn-ghost">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4">
            <div>
              <h3 className="text-2xl font-bold">{zone.name}</h3>
              <p className="text-base-content/70">ID: {zone.id}</p>
            </div>

            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-base-content/70" />
              <span className="font-medium">País:</span>
              <div className="badge badge-secondary">{zone.country?.name || "Sin país asignado"}</div>
            </div>

            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-base-content/70" />
                Estados/Provincias Asociados ({zone.states?.length || 0})
              </h4>
              {zone.states && zone.states.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {zone.states.map((state) => (
                    <div key={state.id} className="badge badge-outline justify-start">
                      {state.name}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-base-content/70 italic">No hay estados asociados</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-base-300">
              <div>
                <p className="text-sm text-base-content/70 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Creado
                </p>
                <p className="font-medium">{formatDate(zone.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-base-content/70 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Actualizado
                </p>
                <p className="font-medium">{formatDate(zone.updated_at)}</p>
              </div>
            </div>
          </div>

          <div className="card-actions justify-end pt-4">
            <button onClick={onClose} className="btn btn-outline">
              Cerrar
            </button>
            <button onClick={onEdit} className="btn btn-primary">
              Editar Zona
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
