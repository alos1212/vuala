import React, { useState, useEffect } from "react";
import Select from "react-select";
import type { InsurancePlan } from "../../../types/insurancePlan";
import type { GeoSelect } from "../../../types/zone";
import { geoService } from "../../../services/geoService";

interface OriginsDestinationsProps {
  form: InsurancePlan;
  setForm: React.Dispatch<React.SetStateAction<InsurancePlan>>;
}

export default function OriginsDestinations({
  form,
  setForm,
}: OriginsDestinationsProps) {
  const [geoOptions, setGeoOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 🔹 Convierte "a,b,c" → ["a","b","c"]
  const parseIds = (value?: string): string[] =>
    value ? value.split(",").map((v) => v.trim()).filter(Boolean) : [];

  // 🔹 Convierte ["a","b","c"] → "a,b,c"
  const joinIds = (values: string[]): string => values.join(",");

  // 🔹 Cargar datos geográficos
  useEffect(() => {
    const fetchGeoData = async () => {
      try {
        const data: GeoSelect[] = await geoService.getContinentsWithCountries();
        const options = data.map((g) => ({
          value: g.id,
          label: `${g.name} (${g.type})`,
        }));
        setGeoOptions(options);
      } catch (error) {
        console.error("Error al cargar datos geográficos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchGeoData();
  }, []);

  // 🔹 Obtener valores seleccionados del form para react-select
  const getSelectedOptions = (field: keyof InsurancePlan) => {
    const ids = parseIds(form[field] as unknown as string);
    return geoOptions.filter((opt) => ids.includes(opt.value));
  };

  // 🔹 Actualizar el form al seleccionar
  const handleChange = (field: "origins" | "destinations" | "exceptions", selected: any) => {
    const ids = selected ? selected.map((s: any) => s.value) : [];
    setForm((prev) => ({
      ...prev,
      [field]: joinIds(ids),
    }));
  };

  if (loading) return <div>Cargando datos geográficos...</div>;

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold mb-4">Orígenes, Destinos y Excepciones</h2>

      {/* ORÍGENES */}
      <div>
        <label className="block font-semibold mb-2">Orígenes</label>
        <Select
          isMulti
          options={geoOptions}
          value={getSelectedOptions("origins")}
          onChange={(selected) => handleChange("origins", selected)}
          placeholder="Selecciona los orígenes..."
          className="react-select-container"
          classNamePrefix="react-select"
        />
      </div>

      {/* DESTINOS */}
      <div>
        <label className="block font-semibold mb-2">Destinos</label>
        <Select
          isMulti
          options={geoOptions}
          value={getSelectedOptions("destinations")}
          onChange={(selected) => handleChange("destinations", selected)}
          placeholder="Selecciona los destinos..."
          className="react-select-container"
          classNamePrefix="react-select"
        />
      </div>

      {/* EXCEPCIONES */}
      <div>
        <label className="block font-semibold mb-2">Excepciones</label>
        <Select
          isMulti
          options={geoOptions}
          value={getSelectedOptions("exceptions")}
          onChange={(selected) => handleChange("exceptions", selected)}
          placeholder="Selecciona las excepciones..."
          className="react-select-container"
          classNamePrefix="react-select"
        />
      </div>
    </div>
  );
}
