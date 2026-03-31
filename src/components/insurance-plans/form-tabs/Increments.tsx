import React from "react";
import type { Increment, InsurancePlan } from "../../../types/insurancePlan";

interface IncrementsProps {
  form: InsurancePlan & { increments?: Increment[] };
  setForm: React.Dispatch<React.SetStateAction<InsurancePlan>>;
}

const Increments = ({ form, setForm }: IncrementsProps) => {
  const increments = form.increments || [];

  const handleChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    const updated = increments.map((inc, i) =>
      i === index ? { ...inc, [name]: value } : inc
    );
    setForm((prev) => ({ ...prev, increments: updated }));
  };

  const handleAdd = () => {
    setForm((prev) => ({
      ...prev,
      increments: [...increments, { age_from: 0, age_to: 0, percentage: 0 }],
    }));
  };

  const handleRemove = (index: number) => {
    const updated = increments.filter((_, i) => i !== index);
    setForm((prev) => ({ ...prev, increments: updated }));
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Incrementos</h2>

      {increments.length === 0 && (
        <p className="text-sm text-gray-500 mb-3">
          No hay incrementos agregados todavía.
        </p>
      )}

      {/* Vista tabla en pantallas medianas y grandes */}
      <div className="hidden md:block overflow-x-auto">
        <table className="table table-sm w-full">
          <thead>
            <tr className="text-gray-600 text-sm">
              <th>Edad Desde</th>
              <th>Edad Hasta</th>
              <th>% Incremento</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {increments.map((inc, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td>
                  <input
                    type="number"
                    name="age_from"
                    value={inc.age_from}
                    onChange={(e) => handleChange(index, e)}
                    className="input input-bordered input-xs w-full"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    name="age_to"
                    value={inc.age_to}
                    onChange={(e) => handleChange(index, e)}
                    className="input input-bordered input-xs w-full"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    name="percentage"
                    value={inc.percentage}
                    onChange={(e) => handleChange(index, e)}
                    className="input input-bordered input-xs w-full"
                  />
                </td>
                <td className="text-center">
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="btn btn-outline btn-error btn-xs"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista tarjetas en pantallas pequeñas */}
      <div className="md:hidden space-y-3">
        {increments.map((inc, index) => (
          <div
            key={index}
            className="border rounded-lg p-3 bg-gray-50 shadow-sm space-y-2"
          >
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-600">Edad Desde</label>
                <input
                  type="number"
                  name="age_from"
                  value={inc.age_from}
                  onChange={(e) => handleChange(index, e)}
                  className="input input-bordered input-xs w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Edad Hasta</label>
                <input
                  type="number"
                  name="age_to"
                  value={inc.age_to}
                  onChange={(e) => handleChange(index, e)}
                  className="input input-bordered input-xs w-full"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-600">% Incremento</label>
              <input
                type="number"
                name="percentage"
                value={inc.percentage}
                onChange={(e) => handleChange(index, e)}
                className="input input-bordered input-xs w-full"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="btn btn-outline btn-error btn-xs"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleAdd}
          className="btn btn-primary btn-sm rounded-full px-4"
        >
          + Crear Incremento
        </button>
      </div>
    </div>
  );
};

export default Increments;
