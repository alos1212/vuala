import { useState, useEffect } from "react";
import Select from "react-select";
import { FaTimes } from "react-icons/fa";
import type { InsurancePlan, PlanPromotionForm } from "../../../types/insurancePlan";
import { insurancePromotionService } from "../../../services/insurancePromotionService";
import type { InsurancePromotion } from "../../../types/insurancePromotion";
import { geoService } from "../../../services/geoService";
import type { GeoSelect } from "../../../types/zone";
import { companyService } from "../../../services/companyService";
import type { Company } from "../../../types/company";

interface PromotionsProps {
  form: InsurancePlan;
  setForm: React.Dispatch<React.SetStateAction<InsurancePlan>>;
}

export default function Promotions({ form, setForm }: PromotionsProps) {
  const [availablePromos, setAvailablePromos] = useState<InsurancePromotion[]>([]);
  const [availableOrigins, setAvailableOrigins] = useState<GeoSelect[]>([]);
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const fetchCatalogs = async () => {
    setLoading(true);
    try {
      const promos = await insurancePromotionService.getAll(1, 50);
      const origins = await geoService.getContinentsWithCountries();
      const companies = await companyService.getCompanies();
      setAvailablePromos(promos);
      setAvailableOrigins(origins);
      setAvailableCompanies(companies);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPromotion = () => {
    const newPromotion: PlanPromotionForm = {
      id: Date.now(),
      insurance_promotion_id: 0,
      date_from: "",
      date_to: "",
      min_days: "",
      max_days: "",
      origins: [],         // string[]
      pages: [],           // number[] (IDs de compañías)
      apply_to_cost: false,
    };
    setForm((prev) => ({
      ...prev,
      promotions: [...(prev.promotions || []), newPromotion],
    }));
  };

  const handleChange = (index: number, field: keyof PlanPromotionForm, value: any) => {
    const updatedPromos = (form.promotions || []).map((promo, i) =>
      i === index ? { ...promo, [field]: value } : promo
    );
    setForm((prev) => ({ ...prev, promotions: updatedPromos }));
  };

  const handleRemovePromotion = (index: number) => {
    const updatedPromos = (form.promotions || []).filter((_, i) => i !== index);
    setForm((prev) => ({ ...prev, promotions: updatedPromos }));
  };

  return (
    <div className="p-4  rounded-lg">
      <h2 className="text-lg font-semibold mb-2">Promociones del Plan</h2>

      {/* Botón alineado a la derecha */}
      <div className="flex justify-end mb-4">
        <button type="button" onClick={handleAddPromotion} className="btn btn-primary">
          + Asignar promoción
        </button>
      </div>

      {loading && <p>Cargando catálogos...</p>}

      <div className="space-y-4">
        {(form.promotions || []).map((promo, index) => {
          const toggleCompany = (companyId: number) => {
            const checked = promo.pages.includes(companyId);
            const updated = checked
              ? promo.pages.filter((id) => id !== companyId)
              : [...promo.pages, companyId];
            handleChange(index, "pages", updated);
          };

          return (
            <div key={promo.id} className="p-4 border rounded-md bg-base-100 shadow relative">
              {/* Eliminar (icono) arriba a la derecha */}
              <button
                type="button"
                onClick={() => handleRemovePromotion(index)}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                aria-label="Eliminar promoción"
                title="Eliminar promoción"
              >
                <FaTimes />
              </button>

              {/* Select de promoción base */}
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Promoción:</label>
                <select
                  value={promo.insurance_promotion_id}
                  onChange={(e) =>
                    handleChange(index, "insurance_promotion_id", parseInt(e.target.value))
                  }
                  className="select select-bordered w-full"
                >
                  <option value={0}>Seleccione una promoción</option>
                  {availablePromos.map((ap) => (
                    <option key={ap.id} value={ap.id}>
                      {ap.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fechas y días (misma fila) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha desde:</label>
                  <input
                    type="date"
                    value={promo.date_from || ""}
                    max={promo.date_to || undefined}
                    onChange={(e) => handleChange(index, "date_from", e.target.value)}
                    className="input input-bordered w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha hasta:</label>
                  <input
                    type="date"
                    value={promo.date_to || ""}
                    min={promo.date_from || undefined}
                    onChange={(e) => handleChange(index, "date_to", e.target.value)}
                    className="input input-bordered w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mín. días:</label>
                  <input
                    type="number"
                    value={promo.min_days ?? ""}
                    onChange={(e) => handleChange(index, "min_days", e.target.value)}
                    className="input input-bordered w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Máx. días:</label>
                  <input
                    type="number"
                    value={promo.max_days ?? ""}
                    onChange={(e) => handleChange(index, "max_days", e.target.value)}
                    className="input input-bordered w-full"
                  />
                </div>
              </div>

              {/* Orígenes con React-Select */}
              <div className="mt-3">
                <label className="block text-sm font-medium mb-1">Orígenes:</label>
                <Select
                  isMulti
                  options={availableOrigins.map((o) => ({ value: String(o.id), label: o.name }))}
                  value={promo.origins
                    .map((id) => {
                      const origin = availableOrigins.find((o) => String(o.id) === String(id));
                      return origin ? { value: String(origin.id), label: origin.name } : null;
                    })
                    .filter((o): o is { value: string; label: string } => o !== null)}
                  onChange={(selected) =>
                    handleChange(
                      index,
                      "origins",
                      selected ? selected.map((s) => String(s.value)) : []
                    )
                  }
                />
              </div>

              {/* Compañías: pills súper compactos, click en todo el pill */}
              <div className="mt-3">
                <label className="block text-sm font-medium mb-2">Compañías:</label>
                <div className="flex flex-wrap gap-2">
                  {availableCompanies.map((c) => {
                    const checked = promo.pages.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        role="checkbox"
                        aria-checked={checked}
                        tabIndex={0}
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border cursor-pointer transition select-none text-xs
                          ${checked ? "bg-primary text-white border-primary" : "bg-base-100 border-gray-300"}`}
                        onClick={() => toggleCompany(c.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleCompany(c.id);
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs"
                          checked={checked}
                          onChange={() => toggleCompany(c.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="whitespace-nowrap">{c.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Toggle aplicar costo */}
              <div className="flex items-center gap-3 mt-3">
                <span className="text-sm font-medium">Aplicar al costo:</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={promo.apply_to_cost}
                  onChange={(e) => handleChange(index, "apply_to_cost", e.target.checked)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
