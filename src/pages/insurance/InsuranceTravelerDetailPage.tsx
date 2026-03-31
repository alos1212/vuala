import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaEdit, FaSave, FaTimes } from "react-icons/fa";
import { insurancePurchaseService } from "../../services/insurancePurchaseService";
import type { TravelerDetail, TravelerPayload } from "../../types/insurancePurchaseTraveler";
import type { InsuranceTravelerPlanDetail } from "../../types/insuranceTravelerDetail";
import type { PaymentDetail } from "../../types/insurancePurchasePayment";
import { useAuthStore } from "../../stores/authStore";

const formatDateDisplay = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const toDateInputValue = (value?: string | null) => {
  if (!value) return "";
  return value.includes("T") ? value.split("T")[0] ?? "" : value;
};

const InsuranceTravelerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canEditTraveler = useAuthStore((state) => state.hasPermission("insurance.update"));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [traveler, setTraveler] = useState<TravelerDetail | null>(null);
  const [plan, setPlan] = useState<InsuranceTravelerPlanDetail | null>(null);
  const [payments, setPayments] = useState<PaymentDetail[]>([]);
  const [formData, setFormData] = useState<TravelerDetail | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const voucherPath = id ? `/insurance/vouchers/pdf?travelers=${id}` : null;

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    const loadTraveler = async () => {
      try {
        window.dispatchEvent(new CustomEvent('loader:start'));
        setLoading(true);
        const data = await insurancePurchaseService.getTraveler(id);
        if (!controller.signal.aborted) {
          setTraveler(data.traveler);
          setPlan(data.plan ?? null);
          setPayments(data.payments ?? []);
          setFormData({ ...data.traveler });
          setError(null);
        }
      } catch (err) {
        console.error(err);
        if (!controller.signal.aborted) setError("No se pudo cargar el pasajero.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
        window.dispatchEvent(new CustomEvent('loader:end'));
      }
    };
    loadTraveler();
    return () => controller.abort();
  }, [id]);

  const handleBack = () => navigate("/insurance/travelers");

  const handleOpenVoucher = () => {
    if (!voucherPath) return;
    window.open(voucherPath, "_blank", "noopener,noreferrer");
  };

  const handleToggleEdit = () => {
    if (!traveler || !canEditTraveler) return;
    setUpdateSuccess(false);
    setError(null);
    setIsEditing((prev) => {
      if (!prev) {
        setFormData({ ...traveler });
        setFormErrors({});
      }
      return !prev;
    });
  };

  const handleFieldChange = (key: keyof TravelerDetail, value: string) => {
    if (!formData) return;
    setFormData({ ...formData, [key]: value });
  };

  const toggleCanceled = () => {
    if (!formData) return;
    const isCanceled = formData.canceled === true || formData.canceled === 1;
    setFormData({
      ...formData,
      canceled: isCanceled ? 0 : 1,
      canceledAt: isCanceled ? null : new Date().toISOString(),
    });
  };

  const validate = () => {
    if (!formData) return false;
    const errors: Record<string, string> = {};
    if (!formData.firstName || !formData.firstName.trim()) errors.firstName = "Ingresa los nombres.";
    if (!formData.lastName || !formData.lastName.trim()) errors.lastName = "Ingresa los apellidos.";
    if (!formData.documentNumber || !formData.documentNumber.trim()) errors.documentNumber = "Ingresa el número de documento.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!formData || !id || !canEditTraveler) return;
    if (!validate()) return;
    try {
      window.dispatchEvent(new CustomEvent('loader:start'));
      setSaving(true);
      const payload: TravelerPayload = {
        id: formData.id,
        index: formData.index,
        firstName: formData.firstName,
        lastName: formData.lastName,
        documentType: formData.documentType,
        documentNumber: formData.documentNumber,
        birthDate: formData.birthDate ?? "",
        age: formData.age ?? undefined,
        phone: formData.phone ?? undefined,
        email: formData.email ?? undefined,
        address: formData.address ?? undefined,
        city: formData.city ?? undefined,
        country: formData.country ?? undefined,
        voucher: formData.voucher ?? undefined,
        canceled: formData.canceled ? 1 : 0,
        canceledAt: formData.canceledAt ?? undefined,
      };
      const updated = await insurancePurchaseService.updateTraveler(id, payload);
      setTraveler(updated.traveler);
      setPlan(updated.plan ?? null);
      setPayments(updated.payments ?? []);
      setFormData({ ...updated.traveler });
      setIsEditing(false);
      setFormErrors({});
      setUpdateSuccess(true);
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar el pasajero. Inténtalo nuevamente.");
      setUpdateSuccess(false);
    } finally {
      setSaving(false);
      window.dispatchEvent(new CustomEvent('loader:end'));
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button className="btn btn-ghost mb-4" onClick={handleBack}>
          <FaArrowLeft className="mr-2" /> Volver
        </button>
        <div className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (error && !traveler) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <button className="btn btn-ghost" onClick={handleBack}>
          <FaArrowLeft className="mr-2" /> Volver
        </button>
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!traveler || !formData) return null;

  const renderField = (
    label: string,
    value: string | number | null | undefined,
    options?: {
      onChange?: (value: string) => void;
      type?: "text" | "date" | "tel" | "number" | "email";
      disabled?: boolean;
      errorKey?: string;
    }
  ) => {
    const { onChange, type = "text", disabled = false, errorKey } = options ?? {};
    const hasError = errorKey ? Boolean(formErrors[errorKey]) : false;
    const displayValue = value ?? "-";

    if (canEditTraveler && isEditing && onChange) {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[var(--color-secondary)] uppercase">{label}</span>
          <input
            className={`input input-bordered h-11 rounded-2xl bg-white ${hasError ? "input-error" : ""}`}
            type={type}
            value={type === "date" ? toDateInputValue(typeof displayValue === "string" ? displayValue : String(displayValue)) : String(displayValue === "-" ? "" : displayValue)}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
          {hasError && errorKey && <span className="text-error text-xs">{formErrors[errorKey]}</span>}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-[var(--color-secondary)] uppercase">{label}</span>
        <span className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-700">
          {type === "date" ? formatDateDisplay(typeof displayValue === "string" ? displayValue : String(displayValue)) : displayValue}
        </span>
      </div>
    );
  };

  const isCanceled = formData.canceled === 1 || formData.canceled === true;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="btn btn-ghost" onClick={handleBack}>
            <FaArrowLeft className="mr-2" /> Volver
          </button>
          <h1 className="text-2xl font-semibold text-[var(--color-secondary)]">Pasajero #{traveler.index}</h1>
        </div>
        <div className="flex items-center gap-2">
          {voucherPath && (
            <button className="btn btn-outline btn-sm rounded-full px-5" onClick={handleOpenVoucher}>
              Ver voucher
            </button>
          )}
          {canEditTraveler && (
            isEditing ? (
              <>
                <button className="btn btn-outline btn-sm" onClick={handleToggleEdit} disabled={saving}>
                  <FaTimes className="mr-2" /> Cancelar
                </button>
                <button className={`btn btn-primary btn-sm rounded-full px-5 ${saving ? "loading" : ""}`} onClick={handleSave}>
                  {!saving && <FaSave className="mr-2" />} Guardar
                </button>
              </>
            ) : (
              <button className="btn btn-outline btn-sm rounded-full px-5" onClick={handleToggleEdit}>
                <FaEdit className="mr-2" /> Editar
              </button>
            )
          )}
        </div>
      </div>

      {updateSuccess && (
        <div className="alert alert-success rounded-2xl">
          <span>Pasajero actualizado correctamente.</span>
        </div>
      )}

      {error && traveler && (
        <div className="alert alert-error rounded-2xl">
          <span>{error}</span>
        </div>
      )}

      <section className={`bg-white border ${isCanceled ? "border-red-100 bg-red-50" : "border-gray-200 bg-gray-50"} rounded-3xl shadow-sm p-6 space-y-5`}>
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="font-semibold text-[var(--color-secondary)] text-sm uppercase">Información del pasajero</div>
          <button
            type="button"
            className={`btn btn-sm rounded-full ${isCanceled ? "btn-success" : "btn-error text-white"}`}
            onClick={toggleCanceled}
            disabled={!canEditTraveler || !isEditing}
          >
            {isCanceled ? "Reactivar" : "Anular"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderField("Nombres", formData.firstName, { onChange: (value) => handleFieldChange("firstName", value), errorKey: "firstName" })}
          {renderField("Apellidos", formData.lastName, { onChange: (value) => handleFieldChange("lastName", value), errorKey: "lastName" })}
          {renderField("Email", formData.email, { onChange: (value) => handleFieldChange("email", value) })}
          {renderField("Teléfono", formData.phone, { onChange: (value) => handleFieldChange("phone", value) })}
          {renderField("Tipo documento", formData.documentType, { onChange: (value) => handleFieldChange("documentType", value) })}
          {renderField("Número documento", formData.documentNumber, { onChange: (value) => handleFieldChange("documentNumber", value), errorKey: "documentNumber" })}
          {renderField("Fecha de nacimiento", formData.birthDate, { type: "date", onChange: (value) => handleFieldChange("birthDate", value) })}
          {renderField("Dirección", formData.address, { onChange: (value) => handleFieldChange("address", value) })}
          {renderField("Ciudad", formData.city, { onChange: (value) => handleFieldChange("city", value) })}
          {renderField("País", formData.country, { onChange: (value) => handleFieldChange("country", value) })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderField("Voucher", formData.voucher, { onChange: (value) => handleFieldChange("voucher", value) })}
          {renderField("Anulado", isCanceled ? "Sí" : "No")}
          {renderField("Fecha anulación", formData.canceledAt, { type: "date" })}
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
          <div><span className="font-semibold">ID compra:</span> {plan?.purchaseId ?? traveler.purchaseId ?? '-'}</div>
        <div><span className="font-semibold">Creado:</span> {formatDateDisplay(traveler.createdAt)}</div>
        <div><span className="font-semibold">Actualizado:</span> {formatDateDisplay(traveler.updatedAt)}</div>
      </div>
      </section>

      {plan && (
        <section className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 space-y-4">
          <h2 className="text-[var(--color-secondary)] font-semibold uppercase text-sm">Datos del Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {renderField("Plan", plan.planName ?? "-" )}
            {renderField("Tipo", plan.planTypeName ?? "-" )}
            {renderField("Inicio", plan.startDate, { type: "date" })}
            {renderField("Fin", plan.endDate, { type: "date" })}
            {renderField("Origen", plan.originName ?? "-" )}
            {renderField("Destino", plan.destinationName ?? "-" )}
            {renderField("Moneda", plan.currency ?? "-" )}
            {renderField("Valor", plan.amount ?? "-" )}
          </div>
        </section>
      )}

      {payments.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 space-y-4">
          <h2 className="text-[var(--color-secondary)] font-semibold uppercase text-sm">Pago</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {renderField("Plataforma", payments[0].platform ?? "-" )}
            {renderField("Estado", payments[0].status ?? "-" )}
            {renderField("Monto", payments[0].amount ?? "-" )}
            {renderField("Opción de precio", payments[0].priceOption ?? "-" )}
          </div>
        </section>
      )}
    </div>
  );
};

export default InsuranceTravelerDetailPage;
