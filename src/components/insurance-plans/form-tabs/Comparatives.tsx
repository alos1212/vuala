import type { InsurancePlan } from '../../../types/insurancePlan';
import { insuranceComparisonFieldService } from '../../../services/insuranceComparisonFieldService';
import type { InsuranceComparisonField } from '../../../types/insuranceComparisonField';
import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { FaPlus, FaTrash, FaDownload, FaUpload } from 'react-icons/fa';
import type { Comparative } from '../../../types/insurancePlan';
import * as XLSX from 'xlsx';

interface ComparativesProps {
  form: InsurancePlan;
  setForm: React.Dispatch<React.SetStateAction<InsurancePlan>>;
}

export default ({ form, setForm }: ComparativesProps) => {
  const [availableFields, setAvailableFields] = useState<InsuranceComparisonField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [didAutofill, setDidAutofill] = useState<boolean>(false);
  const [prevCompanyId, setPrevCompanyId] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [removedComparatives, setRemovedComparatives] = useState<number[]>([]);

  useEffect(() => {
    const fetchFields = async () => {
      const data = await insuranceComparisonFieldService.getAll();
      setAvailableFields(data);
    };
    fetchFields();
  }, []);

  // Autoasignar beneficios por defecto
  useEffect(() => {
    if (!availableFields.length) return;

    const currentCompany = form.company_id || null;
    const hasComparatives = (form.comparatives || []).length > 0;
    const isEditMode = Boolean(form.id && form.id !== 0);

    // Normaliza orden si viene sin él desde backend
    if (hasComparatives) {
      const withOrder = (form.comparatives || []).map((c, idx) => ({
        ...c,
        order: c.order ?? idx + 1,
      }));
      if (withOrder.some((c, idx) => c.order !== idx + 1)) {
        setForm((prev) => ({ ...prev, comparatives: withOrder }));
      }
    }

    // Set de IDs ya presentes
    const existingIds = new Set(
      (form.comparatives || []).map((c) => c.insurance_comparison_field_id)
    );

    // Beneficios aplicables: generales + de la compañía (si hay)
    const applicable = availableFields.filter(
      (field) =>
        !field.company_id || (currentCompany !== null && field.company_id === currentCompany)
    );

    if (!isEditMode) {
      if (!hasComparatives && !didAutofill) {
        const defaults: Comparative[] = applicable.map((field, idx) => ({
          insurance_comparison_field_id: field.id,
          order: idx + 1,
          value1: '',
          value2: '',
          text: field.name,
          text_en: field.name_en,
        }));
        setForm((prev) => ({ ...prev, comparatives: defaults }));
        setDidAutofill(true);
        setPrevCompanyId(currentCompany);
        setRemovedComparatives([]);
        return;
      }

      if (prevCompanyId !== currentCompany && currentCompany !== null) {
        const missing = applicable.filter(
          (field) => !existingIds.has(field.id) && !removedComparatives.includes(field.id)
        );
        if (missing.length) {
          const toAppend: Comparative[] = missing.map((field, idx) => ({
            insurance_comparison_field_id: field.id,
            order: (form.comparatives?.length || 0) + idx + 1,
            value1: '',
            value2: '',
            text: field.name,
            text_en: field.name_en,
          }));
          setForm((prev) => ({
            ...prev,
            comparatives: [...(prev.comparatives || []), ...toAppend],
          }));
        }
        setPrevCompanyId(currentCompany);
      }
      return;
    }

    if (prevCompanyId !== currentCompany) {
      setPrevCompanyId(currentCompany);
    }
  }, [
    availableFields,
    form.company_id,
    form.comparatives,
    didAutofill,
    setForm,
    prevCompanyId,
    removedComparatives,
  ]);

  const handleAddComparative = () => {
    if (selectedFieldId === null) return;
    const selectedField = availableFields.find((f) => f.id === selectedFieldId);
    if (!selectedField) return;

    const idExists = form.comparatives?.some(
      (c: Comparative) => c.insurance_comparison_field_id === selectedFieldId
    );
    if (idExists) {
      alert('Este campo ya fue añadido.');
      return;
    }

    const newComparative: Comparative = {
      insurance_comparison_field_id: selectedFieldId,
      order: (form.comparatives?.length || 0) + 1,
      value1: '',
      value2: '',
      text: selectedField.name,
      text_en: selectedField.name_en
    };

    setForm((prev) => ({
      ...prev,
      comparatives: [...(prev.comparatives || []), newComparative],
    }));
    setSelectedFieldId(null);
    setRemovedComparatives((prev) => prev.filter((id) => id !== selectedFieldId));
  };

  const ensureComparative = (field: InsuranceComparisonField): Comparative => ({
    insurance_comparison_field_id: field.id,
    order: (form.comparatives?.length || 0) + 1,
    value1: '',
    value2: '',
    text: field.name,
    text_en: field.name_en,
  });

  const handleRemoveComparative = (insurance_comparison_field_id: number) => {
    setForm((prev) => {
      const filtered = (prev.comparatives || []).filter(
        (c: Comparative) => c.insurance_comparison_field_id !== insurance_comparison_field_id
      );
      const withOrder = filtered.map((c, idx) => ({ ...c, order: idx + 1 }));
      return { ...prev, comparatives: withOrder };
    });
    setRemovedComparatives((prev) =>
      prev.includes(insurance_comparison_field_id)
        ? prev
        : [...prev, insurance_comparison_field_id]
    );
  };

  const handleComparativeChange = (
    index: number,
    key: 'value1' | 'value2' | 'text' | 'text_en',
    value: string | number
  ) => {
    const newComparatives = [...(form.comparatives || [])];
    if (key === 'text' || key === 'text_en') {
      newComparatives[index][key] = "" + value;
    } else {
      newComparatives[index][key] = value;
    }
    const withOrder = newComparatives.map((c, idx) => ({ ...c, order: idx + 1 }));
    setForm((prev) => ({ ...prev, comparatives: withOrder }));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const list = [...(form.comparatives || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    [list[index], list[targetIndex]] = [list[targetIndex], list[index]];
    const withOrder = list.map((item, idx) => ({ ...item, order: idx + 1 }));
    setForm((prev) => ({ ...prev, comparatives: withOrder }));
  };

  const downloadTemplate = () => {
    const headers = ['field_id', 'nombre', 'nombre_en', 'valor1', 'valor2'];

    const rows = (form.comparatives || [])
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((comp) => {
        const field = availableFields.find(
          (f) => f.id === comp.insurance_comparison_field_id
        );

        const fallbackName = field?.name || '';
        const fallbackNameEn = field?.name_en || '';

        // Para campos sin valores numéricos, mantener el valor actual tal cual
        return [
          comp.insurance_comparison_field_id,
          comp.text || fallbackName,
          comp.text_en || fallbackNameEn,
          comp.value1 ?? '',
          comp.value2 ?? '',
        ];
      });

    // Si no hay comparativos aún, usa la plantilla genérica
    const rowsToUse = rows.length
      ? rows
      : availableFields.map((field) => {
          if (field.field_type === 'included') {
            return [field.id, field.name, field.name_en, 'yes/no', '-'];
          }
          if (field.field_type === 'value') {
            return [field.id, field.name, field.name_en, '-', '0'];
          }
          return [field.id, field.name, field.name_en, '-', '-'];
        });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rowsToUse]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Beneficios');

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'beneficios_plantilla.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadTemplate = (file: File) => {
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      if (!data) return;

      try {
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (!rows.length) {
          setUploadError('El archivo está vacío.');
          return;
        }

        const headers = rows[0].map((h: string) => (h || '').toString().trim().toLowerCase());
        const idx = (name: string) => headers.indexOf(name);
        const idxField = idx('field_id');
        if (idxField === -1) {
          setUploadError('La plantilla debe incluir la columna field_id.');
          return;
        }
        const idxNombre = idx('nombre');
        const idxNombreEn = idx('nombre_en');
        const idxV1 = idx('valor1');
        const idxV2 = idx('valor2');

        const current = [...(form.comparatives || [])];
        const byId = new Map<number, Comparative>();
        current.forEach((c) => byId.set(c.insurance_comparison_field_id, c));

        rows.slice(1).forEach((cols) => {
          const fieldId = Number(cols[idxField]);
          if (!fieldId) return;
          const field = availableFields.find((f) => f.id === fieldId);
          if (!field) return;

          const nombre = idxNombre >= 0 ? cols[idxNombre] : field.name;
          const nombreEn = idxNombreEn >= 0 ? cols[idxNombreEn] : field.name_en;
          const val1 = idxV1 >= 0 ? cols[idxV1] : '';
          const val2 = idxV2 >= 0 ? cols[idxV2] : '';

          const base = byId.get(fieldId) ?? ensureComparative(field);

          const cleanVal1 = (val1 ?? '').toString();
          const cleanVal2 = (val2 ?? '').toString();

          base.value1 = field.field_type === 'included'
            ? cleanVal1.toLowerCase()
            : cleanVal1;

          if (field.field_type === 'value') {
            base.value2 =
              cleanVal2 && cleanVal2 !== '-'
                ? Number(cleanVal2)
                : 0;
          } else {
            base.value2 = cleanVal2;
          }
          base.text = nombre || field.name;
          base.text_en = nombreEn || field.name_en;
          byId.set(fieldId, base);
        });

        const merged = Array.from(byId.values());
        const normalized = merged
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((item, idx) => ({ ...item, order: idx + 1 }));
        setForm((prev) => ({ ...prev, comparatives: normalized }));
      } catch (err) {
        console.error(err);
        setUploadError('No se pudo leer el archivo Excel.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUploadInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadTemplate(file);
      e.target.value = '';
    }
  };

  const getAvailableFields = () => {
    const addedIds = form.comparatives?.map(
      (c: Comparative) => c.insurance_comparison_field_id
    ) || [];
    return availableFields.filter((field) => !addedIds.includes(field.id));
  };

  const renderComparativeInputs = (comparative: Comparative, index: number) => {
    const field = availableFields.find(
      (f) => f.id === comparative.insurance_comparison_field_id
    );
    if (!field) return null;

    return (
      <div key={index} className="card bg-base-200 shadow-md p-3 mb-2 w-full">
        <div className="flex flex-wrap items-center w-full gap-2">
          <input type="text" value={comparative.text}
            onChange={(e) => handleComparativeChange(index, 'text', e.target.value)}
            placeholder="Texto"
            className="input input-bordered flex-1 min-w-[200px] p-2"
          />
          <input
            type="text"
            value={comparative.text_en}
            onChange={(e) => handleComparativeChange(index, 'text_en', e.target.value)}
            placeholder="Texto en ingles"
            className="input input-bordered flex-1 min-w-[200px] p-2"
          />
          {field.field_type === 'value' && (
            <>
              <input
                type="text"
                value={comparative.value1 as string}
                onChange={(e) => handleComparativeChange(index, 'value1', e.target.value)}
                placeholder="Texto"
                className="input input-bordered w-48 p-2"
              />
              <input
                type="number"
                value={comparative.value2 as number}
                onChange={(e) => handleComparativeChange(index, 'value2', e.target.value)}
                placeholder="Número"
                className="input input-bordered w-48 p-2"
              />
            </>
          )}
          {field.field_type === 'text' && (
            <>
              <input
                type="text"
                value={comparative.value1 as string}
                onChange={(e) => handleComparativeChange(index, 'value1', e.target.value)}
                placeholder="Español"
                className="input input-bordered w-48 p-2"
              />
              <input
                type="text"
                value={comparative.value2 as string}
                onChange={(e) => handleComparativeChange(index, 'value2', e.target.value)}
                placeholder="Inglés"
                className="input input-bordered w-48 p-2"
              />
            </>
          )}
          {field.field_type === 'included' && (
            <select
              value={comparative.value1 as string}
              onChange={(e) => handleComparativeChange(index, 'value1', e.target.value)}
              className="select select-bordered w-48 p-2"
            >
              <option value="">¿Incluido?</option>
              <option value="yes">Sí</option>
              <option value="no">No</option>
            </select>
          )}
          <button
            onClick={() => handleRemoveComparative(comparative.insurance_comparison_field_id)}
            className="btn btn-sm btn-error btn-square"
          >
            <FaTrash />
          </button>
          <div className="flex flex-col gap-1 ml-2">
            <button
              type="button"
              className="btn btn-xs btn-outline"
              onClick={() => handleMove(index, 'up')}
              disabled={index === 0}
              title="Mover arriba"
            >
              ↑
            </button>
            <button
              type="button"
              className="btn btn-xs btn-outline"
              onClick={() => handleMove(index, 'down')}
              disabled={index === (form.comparatives?.length || 0) - 1}
              title="Mover abajo"
            >
              ↓
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 w-full">
      <h2 className="text-2xl font-bold mb-4">Beneficios</h2>
      <div className="flex flex-wrap gap-2 mb-4 w-full">
        <select
          value={selectedFieldId || ''}
          onChange={(e) => setSelectedFieldId(Number(e.target.value))}
          className="select select-bordered flex-1 min-w-[200px] p-2"
        >
          <option value="" disabled>
            Selecciona un campo...
          </option>
          {getAvailableFields().map((field) => (
            <option key={field.id} value={field.id}>
              {field.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleAddComparative}
          disabled={!selectedFieldId}
          className="btn btn-primary btn-square"
        >
          <FaPlus />
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={downloadTemplate}
        >
          <FaDownload className="mr-2" /> Descargar guía
        </button>
        <label className="btn btn-outline gap-2 cursor-pointer">
          <FaUpload />
          Cargar guía
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleUploadInput}
          />
        </label>
      </div>
      {uploadError && (
        <div className="alert alert-warning mb-4">
          <span>{uploadError}</span>
        </div>
      )}
      <div className="space-y-2 w-full">
        {form.comparatives?.map((comparative, index) => (
          <div key={index} className="w-full">
            {renderComparativeInputs(comparative, index)}
          </div>
        ))}
      </div>
    </div>
  );
};
