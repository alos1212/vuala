import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaSave, FaArrowLeft } from 'react-icons/fa';
import { insurancePlanService } from '../../services/insurancePlanService';
import { insuranceCompanyService } from '../../services/insuranceCompanyService';
import { additionalCostService } from '../../services/additionalCostService';
import { additionalValueService } from '../../services/additionalValueService';
import type { InsurancePlan } from '../../types/insurancePlan';
import type { InsuranceCompany } from '../../types/insuranceCompany';
import type { AdditionalCostPayload } from '../../types/additionalCost';
import type { AdditionalValuePayload } from '../../types/additionalValue';
import GeneralInfo from '../../components/insurance-plans/form-tabs/GeneralInfo';
import Comparatives from '../../components/insurance-plans/form-tabs/Comparatives';
import OriginsDestinations from '../../components/insurance-plans/form-tabs/OriginsDestinations';
import Promotions from '../../components/insurance-plans/form-tabs/Promotions';
import Increments from '../../components/insurance-plans/form-tabs/Increments';
import ZoneAssignment from '../../components/insurance-plans/form-tabs/ZoneAssignment';
import PageAssignment from '../../components/insurance-plans/form-tabs/PageAssignment';
import ValuesTab from '../../components/insurance-plans/form-tabs/ValuesTab';

export const InsurancePlanFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [activeTab, setActiveTab] = useState('general');
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [form, setForm] = useState<InsurancePlan>({
    id: 0,
    company_id: 0,
    code: '',
    name: '',
    status: 0,
    minimum_age: 0,
    maximum_age: 0,
    minimum_days: 0,
    maximum_days: 0,
    discount: 0,
    category: '',
    for: '',
    value_of: '1',
    value_per_day: 0,
    cost_of: '1',
    cost_value: 0,
    currency: '',
    national: 0,
    special: 0,
    special_payment: 0,
    deleted: 0,
    coverage_value: 0,
    relevance: 0,
    comparatives: [],
    origins: "",
    destinations: "",
    promotions: [],
    companies: [],
  });
  const navigate = useNavigate();

  const validateForm = (): boolean => {
  const newErrors: string[] = [];

  // Validar que 'code' no esté vacío
  if (!form.code.trim()) {
    newErrors.push("El código es obligatorio.");
  }

  // Validar que 'name' no esté vacío
  if (!form.name.trim()) {
    newErrors.push("El nombre es obligatorio.");
  }

  if(!form.company_id || form.company_id === 0) {
    newErrors.push("La compañía es obligatoria.");
  }

  // Validar otros campos según sea necesario
  // Ejemplo: if (!form.category) newErrors.push("La categoría es obligatoria.");

  // Actualizar el estado de errores
  setErrors(newErrors);

  // Retornar 'true' si no hay errores
  return newErrors.length === 0;
};

  const fetchCompanies = async () => {
    const data = await insuranceCompanyService.getInsuranceCompanies();
    console.log(data);
    setCompanies(data);
  };

  const getCurrentZoneIds = (): number[] => {
    if (!form.zones || form.zones.length === 0) return [];

    // Verifica si todos los elementos son números
    const isAlreadyFormatted = form.zones.every((z) => typeof z === 'number');
    // Si ya está formateado, retorna el array directamente
    if (isAlreadyFormatted) {
      return form.zones as number[];
    }

    // Si no, aplica el mapeo para extraer los `id`
    return form.zones.map((z) => (typeof z === 'object' ? z.id : z));
  };

  const getCurrentCompanyIds = (): number[] => {
    if (!form.companies || form.companies.length === 0) return [];

    // Verifica si todos los elementos son números
    const isAlreadyFormatted = form.companies.every((c): c is number => typeof c === 'number');

    // Si ya está formateado, retorna el array como number[]
    if (isAlreadyFormatted) {
      return form.companies as number[];
    }

    // Si no, aplica el mapeo para extraer los `id`
    return form.companies.map((c) => (typeof c === 'object' ? c.id : c));
  };


  const fetchPlan = async (id: number) => {
    console.log("Fetching plan with ID:", id);
    const plan = await insurancePlanService.getInsurancePlan(id);
    setForm(plan);
  };

  const cloneExtrasToNewPlan = async (sourcePlanId: number, targetPlanId: number) => {
    if (!sourcePlanId || !targetPlanId) return;

    try {
      const [additionalValues, additionalCosts] = await Promise.all([
        additionalValueService.listByPlan(sourcePlanId),
        additionalCostService.listByPlan(sourcePlanId),
      ]);

      const valuePayloads = additionalValues.map<Promise<unknown>>((value) => {
        const payload: AdditionalValuePayload = {
          code: value.code,
          value_type: value.value_type,
          value_amount: value.value_amount,
          currency: value.currency,
          commission_type: value.commission_type ?? 'included',
          is_default: value.is_default ?? false,
          active: value.active,
        };
        return additionalValueService.create(targetPlanId, payload);
      });

      const costPayloads = additionalCosts.map<Promise<unknown>>((cost) => {
        const payload: AdditionalCostPayload = {
          company_id: cost.company_id,
          name: cost.name,
          cost_type: cost.cost_type,
          cost_value: cost.cost_value,
          currency: cost.currency,
          active: cost.active,
        };
        return additionalCostService.create(targetPlanId, payload);
      });

      await Promise.all([...valuePayloads, ...costPayloads]);
    } catch (err) {
      console.error('Error duplicando tarifas y costos adicionales', err);
    }
  };

  const changeZoneAndCompanies = () => {
    if (form?.id) { // Verifica que el plan ya esté cargado
      const currentZoneIds = getCurrentZoneIds();
      const currentCompanyIds = getCurrentCompanyIds();

      // Reemplaza completamente `zones` y `companies` con los nuevos valores
      setForm((prev) => ({
        ...prev,
        zones: currentZoneIds, // Asigna directamente el array
        companies: currentCompanyIds // Asigna directamente el array
      }));
    }
  }

 const handleSubmit = async (e: React.FormEvent | boolean) => {
  // Si el evento es un booleano (desde "Guardar como nuevo"), crea un nuevo evento vacío
  const isSaveAsNew = typeof e === 'boolean' ? e : false;
  const event = typeof e !== 'boolean' ? e : null;

  if (event) {
    event.preventDefault();
  }

  if (!validateForm()) {
    return; // Detener el envío si hay errores
  }

  const formData = new FormData();
  Object.entries(form).forEach(([key, value]) => {
    if ( key === 'id') {
      // Al insertar como nuevo, omitimos el ID existente
      return;
    }
    if (Array.isArray(value)) {
      // Si se guarda como nuevo, limpiar IDs de comparativos
      if ( key === 'comparatives') {
        const sanitized = (value as any[]).map((item, idx) => {
          const copy = { ...(item || {}) };
          delete copy.id;
          delete copy.insurance_plan_id;
          // Asegurar orden secuencial
          copy.order = idx + 1;
          return copy;
        });
        formData.append(key, JSON.stringify(sanitized));
        return;
      }
      formData.append(key, JSON.stringify(value));
    } else {
      const normalized = value === null || value === undefined ? '' : String(value);
      formData.append(key, normalized);
    }
  });

  try {
    if (isSaveAsNew || !isEdit) {
      // Si es "Guardar como nuevo" o es un nuevo registro, usa create
      const createdPlan = await insurancePlanService.createInsurancePlan(formData);

      // Al clonar, duplicamos también tarifas y costos adicionales al nuevo plan
      if (isSaveAsNew && isEdit && id && createdPlan?.id) {
        await cloneExtrasToNewPlan(Number(id), createdPlan.id);
      }
    } else {
      // Si es edición normal, usa update
      await insurancePlanService.updateInsurancePlan(Number(id), formData);
    }
    navigate('/insurance-plans');
  } catch (error) {
    console.error('Error al guardar el plan:', error);
  }
};


  useEffect(() => {
    fetchCompanies();
    if (isEdit) {
      fetchPlan(Number(id));
    }
  }, []);

  useEffect(() => {
    console.log("Form updated:", form.id);
    changeZoneAndCompanies();
  }, [form.id]);

  useEffect(() => {
    console.log(form);
  }, [form]);

  return (
    <div className="px-4 py-6">
      <div className="container mx-auto">
        {/* Encabezado */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {isEdit ? 'Editar Plan de Seguro' : 'Crear Nuevo Plan de Seguro'}
          </h1>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-outline btn-neutral"
              onClick={() => navigate('/insurance-plans')}
            >
              <FaArrowLeft className="mr-1" /> Volver
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={(e) => handleSubmit(e)}
            >
              <FaSave className="mr-1" /> Guardar
            </button>
            {isEdit && (
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => handleSubmit(true)} // Pasa `true` para indicar que es "Guardar como nuevo"
      >
        <FaSave className="mr-1" /> Guardar como nuevo
      </button>
    )}
          </div>
        </div>
      {errors.length > 0 && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong className="font-bold">Por favor, corrige los siguientes errores:</strong>
              <ul className="list-disc pl-5 mt-2">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        {/* Formulario */}
        <div className="bg-white shadow-md rounded-lg p-6">
          {/* Tabs */}
          <div role="tablist" className="tabs tabs-lifted">
            <a
              role="tab"
              className={`tab ${activeTab === 'general' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              Información General
            </a>
            <a
              role="tab"
              className={`tab ${activeTab === 'comparatives' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('comparatives')}
            >
              Beneficios
            </a>
            <a
              role="tab"
              className={`tab ${activeTab === 'origins-destinations' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('origins-destinations')}
            >
              Orígenes y Destinos
            </a>
            <a
              role="tab"
              className={`tab ${activeTab === 'promotions' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('promotions')}
            >
              Promociones
            </a>
            <a
              role="tab"
              className={`tab ${activeTab === 'increments' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('increments')}
            >
              Incrementos
            </a>
            <a
              role="tab"
              className={`tab ${activeTab === 'values' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('values')}
            >
              Valores
            </a>
            <a
              role="tab"
              className={`tab ${activeTab === 'zone-assignment' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('zone-assignment')}
            >
              Asignación de Zonas
            </a>
            <a
              role="tab"
              className={`tab ${activeTab === 'page-assignment' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('page-assignment')}
            >
              Asignación de Páginas
            </a>
          </div>

          {/* Contenido de las pestañas */}
          <div className="mt-4 box-tab-content">
            {activeTab === 'general' && (
              <div>
                <GeneralInfo form={form} setForm={setForm} companies={companies} />
              </div>
            )}
            {activeTab === 'comparatives' && (
              <Comparatives form={form} setForm={setForm} />
            )}
            {activeTab === 'origins-destinations' && (
              <OriginsDestinations form={form} setForm={setForm} />
            )}
            {activeTab === 'promotions' && (
              <Promotions form={form} setForm={setForm} />
            )}
            {activeTab === 'increments' && (
              <Increments form={form} setForm={setForm} />
            )}
            {activeTab === 'values' && (
              <ValuesTab form={form} setForm={setForm} />
            )}
            {activeTab === 'zone-assignment' && (
              <ZoneAssignment form={form} setForm={setForm} />
            )}
            {activeTab === 'page-assignment' && (
              <PageAssignment form={form} setForm={setForm} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsurancePlanFormPage;
