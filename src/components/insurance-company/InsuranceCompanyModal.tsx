import { useState, useEffect, useRef } from "react";
import {
  FaBuilding,
  FaPhoneAlt,
  FaLink,
  FaPercent,
  FaFileUpload,
  FaTimes,
} from "react-icons/fa";
import { insuranceCompanyService } from "../../services/insuranceCompanyService";
import type { InsuranceCompany } from "../../types/insuranceCompany";
import TiptapEditor from "../ui/TiptapEditor";

interface InsuranceCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: InsuranceCompany | null;
  onSave: () => void;
}

export default function InsuranceCompanyModal({
  isOpen,
  onClose,
  company,
  onSave,
}: InsuranceCompanyModalProps) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phones, setPhones] = useState("");
  const [nationalContact, setNationalContact] = useState("");
  const [nationalPhones, setNationalPhones] = useState("");
  const [cashback, setCashback] = useState<number | "">("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [termsUrl, setTermsUrl] = useState("");
  const [nationalTermsUrl, setNationalTermsUrl] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);

  const logoObjectUrlRef = useRef<string | null>(null);

  // Sincronizar estado cada vez que se abre el modal
  useEffect(() => {
    if (!isOpen) return;

    if (company) {
      // Editar
      setName(company.name ?? "");
      setContact(company.contact ?? "");
      setPhones(company.phones ?? "");
      setNationalContact(company.national_contact ?? "");
      setNationalPhones(company.national_phones ?? "");
      setCashback(company.cashback ?? "");
      setTermsUrl(company.terms_url ?? "");
      setNationalTermsUrl(company.national_terms_url ?? "");
      setLogoFile(null);
      setLogoPreview(company.logo_url ?? company.logo ?? null);
      setFileInputKey((k) => k + 1);
    } else {
      // Nuevo
      clearForm();
    }
  }, [isOpen, company]);

  // Limpiar object URL cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (logoObjectUrlRef.current) {
        URL.revokeObjectURL(logoObjectUrlRef.current);
        logoObjectUrlRef.current = null;
      }
    };
  }, []);

  const clearForm = () => {
    setName("");
    setContact("");
    setPhones("");
    setNationalContact("");
    setNationalPhones("");
    setCashback("");
    setLogoFile(null);
    setLogoPreview(null);
    setTermsUrl("");
    setNationalTermsUrl("");
    setFileInputKey((k) => k + 1);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (logoObjectUrlRef.current) {
      URL.revokeObjectURL(logoObjectUrlRef.current);
      logoObjectUrlRef.current = null;
    }
    if (file) {
      const obj = URL.createObjectURL(file);
      logoObjectUrlRef.current = obj;
      setLogoPreview(obj);
      setLogoFile(file);
    } else {
      setLogoFile(null);
      setLogoPreview(company?.logo_url ?? company?.logo ?? null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", name);
    formData.append("contact", contact ?? "");
    formData.append("phones", phones ?? "");
    formData.append("national_contact", nationalContact ?? "");
    formData.append("national_phones", nationalPhones ?? "");
    if (cashback !== "") formData.append("cashback", String(cashback));
    if (logoFile) formData.append("logo", logoFile);
    if (termsUrl) formData.append("terms_url", termsUrl);
    if (nationalTermsUrl) formData.append("national_terms_url", nationalTermsUrl);

    try {
      if (company) {
        await insuranceCompanyService.updateInsuranceCompany(company.id, formData);
      } else {
        await insuranceCompanyService.createInsuranceCompany(formData);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error("Error al guardar la compañía:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-4xl rounded-2xl shadow-xl p-6 bg-white relative">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-xl flex items-center gap-2">
            <FaBuilding className="text-primary" />
            {company ? "Editar Compañía de Seguros" : "Agregar Compañía de Seguros"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm btn-ghost"
            title="Cerrar"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Nombre */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Nombre</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Logo */}
          <div className="form-control">
            <label className="label flex gap-2 items-center">
              <FaFileUpload />
              <span className="label-text">Logo</span>
            </label>

            <input
              key={fileInputKey}
              type="file"
              className="file-input file-input-bordered w-full"
              onChange={handleFileChange}
              accept="image/*"
            />

            {logoPreview && (
              <div className="mt-3">
                <span className="text-sm block mb-1">Preview:</span>
                <img src={logoPreview} alt="logo preview" className="h-16 object-contain" />
              </div>
            )}
          </div>

          {/* Contactos */}
          <div className="form-control">
            <label className="label flex gap-2 items-center">
              <FaPhoneAlt />
              <span className="label-text">Contacto Internacional</span>
            </label>
            <TiptapEditor
              content={contact}
              onChange={setContact}
              placeholder="contacto@empresa.com"
            />
          </div>

          <div className="form-control">
            <label className="label flex gap-2 items-center">
              <FaPhoneAlt />
              <span className="label-text">Teléfonos Internacionales</span>
            </label>
            <TiptapEditor
              content={phones}
              onChange={setPhones}
              placeholder="+1234567890, +1987654321"
            />
          </div>

          {/* Contacto Nacional */}
          <div className="form-control">
            <label className="label flex gap-2 items-center">
              <FaPhoneAlt />
              <span className="label-text">Contacto Nacional</span>
            </label>
            <TiptapEditor
              content={nationalContact}
              onChange={setNationalContact}
              placeholder="contacto_nacional@empresa.com"
            />
          </div>

          <div className="form-control">
            <label className="label flex gap-2 items-center">
              <FaPhoneAlt />
              <span className="label-text">Teléfonos Nacionales</span>
            </label>
            <TiptapEditor
              content={nationalPhones}
              onChange={setNationalPhones}
              placeholder="3123456789, 3216549870"
            />
          </div>

          {/* Cashback */}
          <div className="form-control">
            <label className="label flex gap-2 items-center">
              <FaPercent />
              <span className="label-text">Cashback</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={cashback}
              onChange={(e) =>
                setCashback(e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          </div>

          {/* URLs */}
          <div className="form-control">
            <label className="label flex gap-2 items-center">
              <FaLink />
              <span className="label-text">URL de Términos y Condiciones</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={termsUrl}
              onChange={(e) => setTermsUrl(e.target.value)}
            />
          </div>

          <div className="form-control">
            <label className="label flex gap-2 items-center">
              <FaLink />
              <span className="label-text">URL de Términos y Condiciones Nacionales</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={nationalTermsUrl}
              onChange={(e) => setNationalTermsUrl(e.target.value)}
            />
          </div>

          <div className="modal-action flex justify-end gap-4 pt-4">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
