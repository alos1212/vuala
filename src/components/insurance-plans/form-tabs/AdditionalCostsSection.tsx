import React, { useEffect, useMemo, useState } from 'react';
import { FaPlus, FaTrash, FaSave, FaEdit } from 'react-icons/fa';
import { additionalCostService } from '../../../services/additionalCostService';
import { companyService } from '../../../services/companyService';
import type { AdditionalCost, AdditionalCostPayload } from '../../../types/additionalCost';
import type { Company } from '../../../types/company';

interface Props {
  planId?: number;
}

const defaultForm: AdditionalCostPayload = {
  company_id: '',
  name: '',
  cost_type: 1,
  cost_value: 0,
  currency: 'USD',
  active: true,
};

const costTypeLabel: Record<number, string> = {
  1: 'Archivo',
  2: 'Dia',
  3: '%',
  4: 'Total',
};

const AdditionalCostsSection: React.FC<Props> = ({ planId }) => {
  const [costs, setCosts] = useState<AdditionalCost[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<AdditionalCost | null>(null);
  const [form, setForm] = useState<AdditionalCostPayload>(defaultForm);
  const [error, setError] = useState<string | null>(null);

  const planIsReady = !!planId && planId > 0;

  const companyOptions = useMemo(() => companies ?? [], [companies]);

  const loadCompanies = async () => {
    try {
      const data = await companyService.getCompanies();
      setCompanies(data);
    } catch (err) {
      console.error('Error cargando companias', err);
    }
  };

  const loadCosts = async () => {
    if (!planIsReady) return;
    setLoading(true);
    setError(null);
    try {
      const data = await additionalCostService.listByPlan(planId as number);
      setCosts(data);
    } catch (err: any) {
      console.error('Error cargando costos adicionales', err);
      setError('No se pudieron cargar los costos adicionales.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    loadCosts();
  }, [planId]);

  const handleOpenCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setShowForm(true);
  };

  const handleEdit = (item: AdditionalCost) => {
    setEditing(item);
    setForm({
      company_id: item.company_id,
      name: item.name,
      cost_type: item.cost_type,
      cost_value: item.cost_value,
      currency: item.currency,
      active: item.active,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planIsReady) return;
    setSaving(true);
    setError(null);

    try {
      if (editing?.id) {
        const updated = await additionalCostService.update(editing.id, form);
        setCosts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await additionalCostService.create(planId as number, form);
        setCosts((prev) => [created, ...prev]);
      }
      setShowForm(false);
      setEditing(null);
      setForm(defaultForm);
    } catch (err: any) {
      console.error('Error guardando costo adicional', err);
      setError(err?.response?.data?.message || 'No se pudo guardar el costo adicional.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Eliminar este costo adicional?')) return;
    try {
      await additionalCostService.delete(id);
      setCosts((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Error eliminando costo adicional', err);
    }
  };

  const getCompanyName = (companyId: number) =>
    companyOptions.find((c) => c.id === companyId)?.name || `ID ${companyId}`;

  if (!planIsReady) {
    return (
      <div className="alert alert-info mt-6">
        Guarda el plan para poder agregar costos adicionales por pagina.
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-700">Costos adicionales por pagina</h4>
          <p className="text-sm text-gray-500">Asigna cargos especificos a cada pagina/compania.</p>
        </div>
        <button className="btn btn-sm btn-primary" onClick={handleOpenCreate}>
          <FaPlus className="mr-1" /> Agregar
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Cargando costos adicionales...</p>
      ) : costs.length === 0 ? (
        <p className="text-sm text-gray-500">No hay costos adicionales registrados.</p>
      ) : (
        <>
          <div className="hidden md:block">
            <table className="table table-sm">
              <thead>
                <tr className="text-gray-600 text-sm bg-gray-50">
                  <th>Etiqueta</th>
                  <th>Pagina / Compania</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th>Moneda</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {costs.map((costo) => (
                  <tr key={costo.id}>
                    <td>{costo.name}</td>
                    <td>{getCompanyName(costo.company_id)}</td>
                    <td>{costTypeLabel[Number(costo.cost_type)] ?? costo.cost_type}</td>
                    <td>{Number(costo.cost_value).toFixed(2)}</td>
                    <td>{costo.currency}</td>
                    <td>{costo.active ? 'Activo' : 'Inactivo'}</td>
                    <td className="flex gap-2">
                      <button className="btn btn-ghost btn-xs" onClick={() => handleEdit(costo)}>
                        <FaEdit />
                      </button>
                      <button className="btn btn-ghost btn-xs text-error" onClick={() => handleDelete(costo.id)}>
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {costs.map((costo) => (
              <div key={costo.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-700">{costo.name}</p>
                    <p className="text-xs text-gray-500">{getCompanyName(costo.company_id)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost btn-xs" onClick={() => handleEdit(costo)}>
                      <FaEdit />
                    </button>
                    <button className="btn btn-ghost btn-xs text-error" onClick={() => handleDelete(costo.id)}>
                      <FaTrash />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>Tipo: {costTypeLabel[Number(costo.cost_type)] ?? costo.cost_type}</div>
                  <div>Valor: {Number(costo.cost_value).toFixed(2)}</div>
                  <div>Moneda: {costo.currency}</div>
                  <div>Estado: {costo.active ? 'Activo' : 'Inactivo'}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      <input type="checkbox" className="modal-toggle" checked={showForm} readOnly />
      <div className={`modal ${showForm ? 'modal-open' : ''}`}>
        <div className="modal-box w-11/12 max-w-2xl">
          <h3 className="font-bold text-lg mb-3">
            {editing ? 'Editar costo adicional' : 'Agregar costo adicional'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Pagina / Compania</span>
                </label>
                <select
                  className="select select-bordered"
                  value={form.company_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, company_id: Number(e.target.value) }))}
                  required
                >
                  <option value="">Seleccione</option>
                  {companyOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Etiqueta</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Tipo de costo</span>
                </label>
              <select
                  className="select select-bordered"
                  value={Number(form.cost_type) || 1}
                  onChange={(e) => setForm((prev) => ({ ...prev, cost_type: Number(e.target.value) }))}
                >
                  <option value={1}>Archivo</option>
                  <option value={2}>Dia</option>
                  <option value={3}>%</option>
                  <option value={4}>Total</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Valor</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={form.cost_value}
                  min={0}
                  step="0.01"
                  onChange={(e) => setForm((prev) => ({ ...prev, cost_value: Number(e.target.value) }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Moneda</span>
                </label>
                <select
                  className="select select-bordered"
                  value={form.currency}
                  onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
                >
                  <option value="USD">USD</option>
                  <option value="COP">COP</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <label className="label cursor-pointer mt-6 md:mt-10">
                <span className="label-text mr-3 font-semibold">Activo</span>
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={!!form.active}
                  onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                />
              </label>
            </div>

            <div className="modal-action">
              <button type="button" className="btn" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
              <button type="submit" className={`btn btn-primary ${saving ? 'loading' : ''}`}>
                <FaSave className="mr-1" /> Guardar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdditionalCostsSection;
