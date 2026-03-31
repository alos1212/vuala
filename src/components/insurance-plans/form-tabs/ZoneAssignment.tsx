import React, { useEffect, useState } from "react";
import type { InsurancePlan } from "../../../types/insurancePlan";
import { zoneService } from "../../../services/zoneService";
import type { Zone } from "../../../types/zone";

interface ZoneAssignmentProps {
  form: InsurancePlan & { zones?: Zone[] | number[] };
  setForm: React.Dispatch<React.SetStateAction<InsurancePlan>>;
}

const ZoneAssignment = ({ form, setForm }: ZoneAssignmentProps) => {
  const [availableZones, setAvailableZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const zones = await zoneService.getAll();
        setAvailableZones(zones);
      } catch (error) {
        console.error("Error al cargar las zonas:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchZones();
  }, []);

  // Normaliza `form.zones` para que siempre sea un array de IDs
  const getCurrentZoneIds = (): number[] => {
    if (!form.zones) return [];
    return form.zones.map((z) => (typeof z === 'object' ? z.id : z));
  };

  const handleZoneToggle = (zoneId: number) => {
    const currentZoneIds = getCurrentZoneIds();
    const isSelected = currentZoneIds.includes(zoneId);

    if (isSelected) {
      const updatedZones = currentZoneIds.filter((id) => id !== zoneId);
      setForm((prev) => ({ ...prev, zones: updatedZones }));
    } else {
      setForm((prev) => ({ ...prev, zones: [...currentZoneIds, zoneId] }));
    }
  };

  const isZoneSelected = (zoneId: number): boolean => {
    const currentZoneIds = getCurrentZoneIds();
    return currentZoneIds.includes(zoneId);
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Asignación de Zonas</h2>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando zonas...</p>
      ) : availableZones.length === 0 ? (
        <p className="text-sm text-gray-500">No hay zonas disponibles.</p>
      ) : (
        <>
          {/* Vista tabla en pantallas medianas y grandes */}
          <div className="hidden md:block overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr className="text-gray-600 text-sm bg-gray-50">
                  <th className="p-3">ID</th>
                  <th className="p-3">Nombre</th>
                  <th className="p-3 text-center">Seleccionado</th>
                </tr>
              </thead>
              <tbody>
                {availableZones.map((zone) => (
                  <tr
                    key={zone.id}
                    onClick={() => handleZoneToggle(zone.id)}
                    className={`hover:bg-blue-100 transition-colors duration-150 cursor-pointer ${
                      isZoneSelected(zone.id) ? "bg-blue-200" : "bg-white"
                    }`}
                  >
                    <td className="p-3">{zone.id}</td>
                    <td className="p-3">{zone.name}</td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isZoneSelected(zone.id)}
                        onChange={() => handleZoneToggle(zone.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="checkbox checkbox-primary checkbox-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vista tarjetas en pantallas pequeñas */}
          <div className="md:hidden space-y-3">
            {availableZones.map((zone) => (
              <div
                key={zone.id}
                onClick={() => handleZoneToggle(zone.id)}
                className={`border rounded-lg p-3 shadow-sm flex items-center justify-between transition-colors duration-150 cursor-pointer ${
                  isZoneSelected(zone.id) ? "bg-blue-200 border-blue-400" : "bg-gray-50 hover:bg-gray-100 border-gray-200"
                }`}
              >
                <div>
                  <p className="font-medium text-gray-700">{zone.name}</p>
                  <p className="text-xs text-gray-500">ID: {zone.id}</p>
                </div>
                <input
                  type="checkbox"
                  checked={isZoneSelected(zone.id)}
                  onChange={() => handleZoneToggle(zone.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="checkbox checkbox-primary"
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ZoneAssignment;
