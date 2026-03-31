import React, { useEffect, useState } from 'react';
import { FaPlus, FaTrash, FaSave, FaEdit } from 'react-icons/fa';
import { additionalValueService } from '../../../services/additionalValueService';
import type { AdditionalValue, AdditionalValuePayload } from '../../../types/additionalValue';

interface Props {
  planId?: number;
}

const defaultForm: AdditionalValuePayload = {
  code: '',
  value_type: 1,
  value_amount: 0,
  currency: 'USD',
  commission_type: 'included',
  is_default: false,
  active: true,
};

const valueTypeLabel: Record<number, string> = {
  1: '%',
  2: 'Valor',
  3: 'Dia',
};

const AdditionalValuesSection: React.FC<Props> = ({ planId }) => {
  const [values, setValues] = useState<AdditionalValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<AdditionalValue | null>(null);
  const [form, setForm] = useState<AdditionalValuePayload>(defaultForm);
  const [error, setError] = useState<string | null>(null);

  const planIsReady = !!planId && planId > 0;

  const loadValues = async () => {
    if (!planIsReady) return;
    setLoading(true);
    setError(null);
    try {
      const data = await additionalValueService.listByPlan(planId as number);
      setValues(data);
    } catch (err: any) {
      console.error('Error cargando valores adicionales', err);
      setError('No se pudieron cargar los valores adicionales.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadValues();
  }, [planId]);

  const handleOpenCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setShowForm(true);
  };

  const handleEdit = (item: AdditionalValue) => {
    setEditing(item);
    setForm({
      code: item.code,
      value_type: item.value_type,
      value_amount: item.value_amount,
      currency: item.currency,
      commission_type: item.commission_type ?? 'included',
      is_default: item.is_default ?? false,
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
        const updated = await additionalValueService.update(editing.id, form);
        setValues((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      } else {
        const created = await additionalValueService.create(planId as number, form);
        setValues((prev) => [created, ...prev]);
      }
      setShowForm(false);
      setEditing(null);
      setForm(defaultForm);
    } catch (err: any) {
      console.error('Error guardando valor adicional', err);
      setError(err?.response?.data?.message || 'No se pudo guardar el valor adicional.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Eliminar este valor adicional?')) return;
    try {
      await additionalValueService.delete(id);
      setValues((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      console.error('Error eliminando valor adicional', err);
    }
  };

  if (!planIsReady) {
    return (
      <div className="alert alert-info mt-6">
        Guarda el plan para poder agregar valores adicionales generales.
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-700">Tarifas</h4>
          <p className="text-sm text-gray-500">Aplica a todo el plan, sin pagina asignada.</p>
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
        <p className="text-sm text-gray-500">Cargando valores adicionales...</p>
      ) : values.length === 0 ? (
        <p className="text-sm text-gray-500">No hay tarifas registradas.</p>
      ) : (
        <>
          <div className="hidden md:block">
          <table className="table table-sm">
            <thead>
              <tr className="text-gray-600 text-sm bg-gray-50">
                <th>Codigo</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Moneda</th>
                <th>Comisión</th>
                <th>Principal</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {values.map((item) => (
                <tr key={item.id}>
                  <td>{item.code}</td>
                  <td>{valueTypeLabel[Number(item.value_type)] ?? item.value_type}</td>
                  <td>{Number(item.value_amount).toFixed(2)}</td>
                  <td>{item.currency}</td>
                  <td>{item.commission_type === 'included' ? 'Neta' : 'Comisionable'}</td>
                  <td>{item.is_default ? 'Si' : 'No'}</td>
                  <td>{item.active ? 'Activo' : 'Inactivo'}</td>
                  <td className="flex gap-2">
                    <button className="btn btn-ghost btn-xs" onClick={() => handleEdit(item)}>
                      <FaEdit />
                    </button>
                      <button className="btn btn-ghost btn-xs text-error" onClick={() => handleDelete(item.id)}>
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {values.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-700">{item.code}</p>
                    <p className="text-xs text-gray-500">{valueTypeLabel[Number(item.value_type)] ?? item.value_type}</p>
                    {item.is_default && <span className="badge badge-success badge-sm mt-1">Principal</span>}
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost btn-xs" onClick={() => handleEdit(item)}>
                      <FaEdit />
                    </button>
                    <button className="btn btn-ghost btn-xs text-error" onClick={() => handleDelete(item.id)}>
                      <FaTrash />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>Valor: {Number(item.value_amount).toFixed(2)}</div>
                  <div>Moneda: {item.currency}</div>
                  <div>Comisión: {item.commission_type === 'included' ? 'Neta' : 'Comisionable'}</div>
                  <div>Estado: {item.active ? 'Activo' : 'Inactivo'}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <input type="checkbox" className="modal-toggle" checked={showForm} readOnly />
      <div className={`modal ${showForm ? 'modal-open' : ''}`}>
        <div className="modal-box w-11/12 max-w-2xl">
          <h3 className="font-bold text-lg mb-3">
            {editing ? 'Editar tarifa' : 'Agregar tarifa'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Codigo</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={form.code}
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                  required
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Tipo</span>
                </label>
              <select
                  className="select select-bordered"
                  value={Number(form.value_type) || 1}
                  onChange={(e) => setForm((prev) => ({ ...prev, value_type: Number(e.target.value) }))}
                >
                  <option value={1}>%</option>
                  <option value={2}>Valor</option>
                  <option value={3}>Dia</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Valor</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={form.value_amount}
                  min={0}
                  step="0.01"
                  onChange={(e) => setForm((prev) => ({ ...prev, value_amount: Number(e.target.value) }))}
                  required
                />
              </div>
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
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Comisión</span>
              </label>
              <select
                className="select select-bordered"
                value={form.commission_type || 'included'}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, commission_type: e.target.value as 'included' | 'not_included' }))
                }
              >
                <option value="included">Neta</option>
                <option value="not_included">Comisionable</option>
              </select>
            </div>

            <div className="flex items-center gap-6">
              <label className="label cursor-pointer gap-3">
                <span className="label-text font-semibold">Principal</span>
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={!!form.is_default}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_default: e.target.checked }))}
                />
              </label>
              <label className="label cursor-pointer gap-3">
                <span className="label-text font-semibold">Activo</span>
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

export default AdditionalValuesSection;
