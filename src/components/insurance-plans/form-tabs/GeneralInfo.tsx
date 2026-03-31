import React, { useEffect, useState } from "react";
import type { InsurancePlan } from "../../../types/insurancePlan";
import type { InsuranceCompany } from "../../../types/insuranceCompany";
import { insurancePlanTypeService } from "../../../services/insurancePlanTypeService";
import { insurancePlanCategoryService } from "../../../services/insurancePlanCategoryService";

interface GeneralInfoProps {
  form: InsurancePlan;
  setForm: React.Dispatch<React.SetStateAction<InsurancePlan>>;
  companies: InsuranceCompany[];
}

export default function GeneralInfo({ form, setForm, companies }: GeneralInfoProps) {
  const [categories, setCategories] = useState<{ id: string; value: string }[]>([]);
  const [planTypes, setPlanTypes] = useState<{ id: string; value: string }[]>([]);
  const [forOptions] = useState<{ id: string; value: string }[]>([
    { id: "0", value: "Todos" },
    { id: "1", value: "Viajeros" },
    { id: "2", value: "Grupos" },
  ]);

  useEffect(() => {
    async function fetchData() {
      const planCategories = await insurancePlanCategoryService.getInsurancePlanCategories();
      const fetchedCategories = planCategories.map((plan) => ({
        id: plan.id.toString(),
        value: plan.name,
      }));
      const planTypes = await insurancePlanTypeService.getInsurancePlanTypes();
      const fetchedPlanTypes = planTypes.map((plan) => ({
        id: plan.id.toString(),
        value: plan.name,
      }));
      setCategories(fetchedCategories);
      setPlanTypes(fetchedPlanTypes);
    }
    fetchData();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, type, value, checked } = target;
    let newValue: any;
    if (type === "checkbox" && name !== "plan_type") {
      newValue = checked ? 1 : 0;
    } else if (type === "number") {
      newValue = value === "" ? "" : Number(value);
    } else {
      newValue = value;
    }
    setForm((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  return (
    <div>
      <h2 className="col-span-full text-xl font-semibold text-gray-800">
        Información General
      </h2>
      {/* Mantener value_by sin mostrar el campo */}
      <input type="hidden" name="value_by" value={(form as any).value_by ?? ""} readOnly />

      {/* Compañía + Estado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5 mt-6">
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Compañía:</span>
          </label>
          <select
            name="company_id"
            value={(form as any).company_id ?? ""}
            onChange={handleChange}
            className="select select-bordered w-full"
          >
            <option value="">Selecciona una compañía</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-control w-full flex items-center justify-between">
          <label className="label cursor-pointer">
            <span className="label-text">Estado</span>
          </label>
          <input
            type="checkbox"
            name="status"
            checked={Number((form as any).status) === 1}
            onChange={handleChange}
            className="toggle toggle-primary toggle-lg"
          />
        </div>
      </div>

      {/* Resto de los campos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Código */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Código:</span>
          </label>
          <input
            type="text"
            name="code"
            value={(form as any).code ?? ""}
            onChange={handleChange}
            className="input input-bordered w-full"
            required
          />
        </div>

        {/* Nombre */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Nombre:</span>
          </label>
          <input
            type="text"
            name="name"
            value={(form as any).name ?? ""}
            onChange={handleChange}
            className="input input-bordered w-full"
            required
          />
        </div>

        {/* Edad Mínima */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Edad Mínima:</span>
          </label>
          <input
            type="number"
            name="minimum_age"
            value={(form as any).minimum_age ?? ""}
            onChange={handleChange}
            className="input input-bordered w-full"
          />
        </div>

        {/* Edad Máxima */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Edad Máxima:</span>
          </label>
          <input
            type="number"
            name="maximum_age"
            value={(form as any).maximum_age ?? ""}
            onChange={handleChange}
            className="input input-bordered w-full"
          />
        </div>

        {/* Días Mínimos */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Días Mínimos:</span>
          </label>
          <input
            type="number"
            name="minimum_days"
            value={(form as any).minimum_days ?? ""}
            onChange={handleChange}
            className="input input-bordered w-full"
          />
        </div>

        {/* Días Máximos */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Días Máximos:</span>
          </label>
          <input
            type="number"
            name="maximum_days"
            value={(form as any).maximum_days ?? ""}
            onChange={handleChange}
            className="input input-bordered w-full"
          />
        </div>

        {/* Plan Especial */}
        <div className="form-control w-full flex items-center justify-between">
          <label className="label cursor-pointer">
            <span className="label-text">Plan Especial:</span>
          </label>
          <input
            type="checkbox"
            name="special"
            checked={Number((form as any).special) === 1}
            onChange={handleChange}
            className="toggle toggle-primary"
          />
        </div>

        {/* Descuento */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Descuento (%):</span>
          </label>
          <input
            type="number"
            name="discount"
            value={(form as any).discount ?? ""}
            onChange={handleChange}
            className="input input-bordered w-full"
          />
        </div>

        {/* Categoría */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Categoría de Plan:</span>
          </label>
          <select
            name="category"
            value={(form as any).category ?? ""}
            onChange={handleChange}
            className="select select-bordered w-full"
          >
            <option value="">Seleccione categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.value}
              </option>
            ))}
          </select>
        </div>

        

        {/* Para */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Plan Para:</span>
          </label>
          <select
            name="for"
            value={(form as any).for ?? ""}
            onChange={handleChange}
            className="select select-bordered w-full"
          >
            <option value="">Seleccione</option>
            {forOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.value}
              </option>
            ))}
          </select>
        </div>

        {/* Valores y costos ahora se gestionan en la pestaña Valores */}

        {/* Pago Especial */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Pago Especial:</span>
          </label>
          <select
            name="special_payment"
            value={(form as any).special_payment ?? "0"}
            onChange={handleChange}
            className="select select-bordered w-full"
          >
            <option value="0">Normal</option>
            <option value="1">Precompra</option>
          </select>
        </div>

        {/* Valor Cobertura */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Valor de Cobertura:</span>
          </label>
          <input
            type="number"
            name="coverage_value"
            value={(form as any).coverage_value ?? ""}
            onChange={handleChange}
            className="input input-bordered w-full"
          />
        </div>

        {/* Relevancia */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Relevancia:</span>
          </label>
          <select
            name="relevance"
            value={(form as any).relevance ?? ""}
            onChange={handleChange}
            className="select select-bordered w-full"
          >
            <option value="">Seleccione</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de Plan (checkboxes) */}
        <div className="form-control w-full col-span-1 md:col-span-2 lg:col-span-2">
          <label className="label">
            <span className="label-text">Tipo de Plan:</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {planTypes.map((p) => (
              <label key={p.id} className="label cursor-pointer flex items-center gap-2">
                <input
                  type="checkbox"
                  name="plan_type"
                  value={p.id}
                  checked={((form as any).plan_type ?? "").split(",").includes(p.id)}
                  onChange={(e) => {
                    const value = e.target.value;
                    const currentValues = ((form as any).plan_type ?? "").split(",").filter(Boolean);
                    let newValues: string[];
                    if (currentValues.includes(value)) {
                      newValues = currentValues.filter((v: string) => v !== value);
                    } else {
                      newValues = [...currentValues, value];
                    }
                    setForm((prev) => ({
                      ...prev,
                      plan_type: newValues.join(","),
                    }));
                  }}
                  className="checkbox checkbox-primary"
                />
                <span>{p.value}</span>
              </label>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
