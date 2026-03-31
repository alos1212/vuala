"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { zoneService } from "../../services/zoneService"
import { geoService } from "../../services/geoService"
import type { Zone, Country, State, CreateZoneRequest, UpdateZoneRequest } from "../../types/zone"
import { X } from "lucide-react"

interface ZoneFormProps {
  zone?: Zone
  onSave: () => void
  onCancel: () => void
}

export const ZoneForm: React.FC<ZoneFormProps> = ({ zone, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: zone?.name || "",
    country_id: zone?.country_id ? zone.country_id.toString() : "",
    states: zone?.states?.map((s) => s.id) || [],
  })

  const [countries, setCountries] = useState<Country[]>([])
  const [states, setStates] = useState<State[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchContinentsWithCountries()
  }, [])

  useEffect(() => {
    const countryId = Number(formData.country_id)
    if (formData.country_id && countryId > 0) {
      fetchStatesByCountry(countryId)
    } else {
      setStates([])
      setFormData((prev) => ({ ...prev, states: [] }))
    }
  }, [formData.country_id])

  const fetchContinentsWithCountries = async () => {
    try {
      const allCountries = await geoService.getCountriesByContinent(0)
     //const allCountries = continents.flatMap((continent) => continent.countries || [])
      setCountries(allCountries)
    } catch (err) {
      console.error("Error fetching countries:", err)
      setError("Error al cargar los países")
    }
  }

  const fetchStatesByCountry = async (countryId: number) => {
    try {
      setLoading(true)
      const statesData = await geoService.getStatesByCountry(countryId)
      setStates(statesData)
    } catch (err) {
      console.error("Error fetching states:", err)
      setError("Error al cargar los estados")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      setError("El nombre es requerido")
      return
    }

    console.log("[v0] FormData completo antes de validar:", formData)
    console.log("[v0] country_id como string:", formData.country_id, "longitud:", formData.country_id.length)

    if (!formData.country_id || formData.country_id.trim() === "") {
      setError("Debe seleccionar un país válido")
      return
    }

    const countryId = Number(formData.country_id)
    console.log(
      "[v0] Conversión a número - original:",
      formData.country_id,
      "convertido:",
      countryId,
      "es NaN:",
      isNaN(countryId),
    )

    if (isNaN(countryId) || countryId <= 0) {
      setError("El país seleccionado no es válido")
      return
    }

    try {
      setSaving(true)
      setError(null)

      const data: CreateZoneRequest | UpdateZoneRequest = {
        name: formData.name.trim(),
        country_id: countryId,
        states: formData.states,
      }

      console.log("[v0] Datos finales para envío:", data)
      console.log(
        "[v0] country_id final - tipo:",
        typeof data.country_id,
        "valor:",
        data.country_id,
        "es null:",
        data.country_id === null,
      )

      if (data.country_id === null || data.country_id === undefined || data.country_id <= 0) {
        throw new Error("country_id inválido antes del envío")
      }

      if (zone) {
        await zoneService.update(zone.id, data)
      } else {
        await zoneService.create(data as CreateZoneRequest)
      }

      onSave()
    } catch (err: any) {
      console.log("[v0] Error completo:", err)
      console.log("[v0] Error response:", err.response)
      console.log("[v0] Error data:", err.response?.data)
      console.log("[v0] Error status:", err.response?.status)
      console.log("[v0] Error headers:", err.response?.headers)

      if (err.response?.data?.errors) {
        const errors = err.response.data.errors
        console.log("[v0] Errores de validación específicos:", errors)
        const errorMessages = Object.values(errors).flat().join(", ")
        setError(`Errores de validación: ${errorMessages}`)
      } else {
        setError(err.response?.data?.message || "Error al guardar la zona")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleStateToggle = (stateId: number) => {
    setFormData((prev) => ({
      ...prev,
      states: prev.states.includes(stateId) ? prev.states.filter((id) => id !== stateId) : [...prev.states, stateId],
    }))
  }

  return (
    <div className="card bg-base-100 shadow-xl w-full max-w-2xl mx-auto">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title text-xl">{zone ? "Editar Zona" : "Nueva Zona"}</h2>
          <button onClick={onCancel} className="btn btn-sm btn-ghost">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          <div className="form-control">
            <label className="label">
              <span className="label-text">Nombre de la Zona *</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ingrese el nombre de la zona"
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">País *</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={formData.country_id}
              onChange={(e) => {
                const selectedValue = e.target.value
                console.log(
                  "[v0] País seleccionado - valor:",
                  selectedValue,
                  "tipo:",
                  typeof selectedValue,
                  "es vacío:",
                  selectedValue === "",
                )

                if (selectedValue && selectedValue !== "") {
                  console.log("[v0] Actualizando country_id a:", selectedValue)
                  setFormData((prev) => ({ ...prev, country_id: selectedValue }))
                } else {
                  console.log("[v0] Limpiando country_id")
                  setFormData((prev) => ({ ...prev, country_id: "", states: [] }))
                }
              }}
              required
            >
              <option value="">Seleccione un país</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id.toString()}>
                  {country.name}
                </option>
              ))}
            </select>
            <div className="label">
              <span className="label-text-alt">Valor actual: "{formData.country_id}"</span>
            </div>
          </div>

          {states.length > 0 && (
            <div className="form-control">
              <label className="label">
                <span className="label-text">Estados/Provincias</span>
              </label>
              {loading ? (
                <div className="flex justify-center py-4">
                  <span className="loading loading-spinner loading-md text-primary"></span>
                </div>
              ) : (
                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3">
                    {states.map((state) => (
                      <div key={state.id} className="form-control">
                        <label className="label cursor-pointer justify-start gap-2">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-primary"
                            checked={formData.states.includes(state.id)}
                            onChange={() => handleStateToggle(state.id)}
                          />
                          <span className="label-text text-sm">{state.name}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="label">
                <span className="label-text-alt">Estados seleccionados: {formData.states.length}</span>
              </div>
            </div>
          )}

          <div className="card-actions justify-end pt-4">
            <button type="button" onClick={onCancel} className="btn btn-outline">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Guardando...
                </>
              ) : zone ? (
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
