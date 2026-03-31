import type React from "react"
import { useState } from "react"
import { zoneService } from "../../services/zoneService"
import type { Zone } from "../../types/zone"
import { ZoneList } from "./ZoneList"
import { ZoneForm } from "./ZoneForm"
import { ZoneDetail } from "./ZoneDetail"
import { AlertTriangle } from "lucide-react"

type ViewMode = "list" | "form" | "detail"

export const ZoneManager: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [refresh, setRefresh] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [zoneToDelete, setZoneToDelete] = useState<Zone | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleAdd = () => {
    setSelectedZone(null)
    setViewMode("form")
  }

  const handleEdit = (zone: Zone) => {
    setSelectedZone(zone)
    setViewMode("form")
  }

  const handleView = (zone: Zone) => {
    setSelectedZone(zone)
    setViewMode("detail")
  }

  const handleDelete = (zone: Zone) => {
    setZoneToDelete(zone)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!zoneToDelete) return

    try {
      setDeleting(true)
      await zoneService.delete(zoneToDelete.id)
      setRefresh(!refresh)
      setShowDeleteConfirm(false)
      setZoneToDelete(null)
    } catch (error) {
      console.error("Error deleting zone:", error)
      alert("Error al eliminar la zona")
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = () => {
    setViewMode("list")
    setSelectedZone(null)
    setRefresh(!refresh)
  }

  const handleCancel = () => {
    setViewMode("list")
    setSelectedZone(null)
  }

  const handleDetailEdit = () => {
    setViewMode("form")
  }

  const handleDetailClose = () => {
    setViewMode("list")
    setSelectedZone(null)
  }

  return (
    <div className="container mx-auto p-6">
      {viewMode === "list" && (
        <ZoneList onAdd={handleAdd} onEdit={handleEdit} onView={handleView} onDelete={handleDelete} refresh={refresh} />
      )}

      {viewMode === "form" && <ZoneForm zone={selectedZone || undefined} onSave={handleSave} onCancel={handleCancel} />}

      {viewMode === "detail" && selectedZone && (
        <ZoneDetail zone={selectedZone} onClose={handleDetailClose} onEdit={handleDetailEdit} />
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && zoneToDelete && (
        <div className="modal modal-open">
          <div className="modal-box">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-error" />
              <h3 className="text-lg font-semibold">Confirmar Eliminación</h3>
            </div>
            <p className="text-base-content/70 mb-6">
              ¿Está seguro que desea eliminar la zona "{zoneToDelete.name}"? Esta acción no se puede deshacer.
            </p>
            <div className="modal-action">
              <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting} className="btn btn-outline">
                Cancelar
              </button>
              <button onClick={confirmDelete} disabled={deleting} className="btn btn-error">
                {deleting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Eliminando...
                  </>
                ) : (
                  "Eliminar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
