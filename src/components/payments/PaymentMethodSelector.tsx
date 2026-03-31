import React, { useEffect, useState } from "react";
import type { PaymentSelection, WompiMethod } from "../../types/payment";
import { wompiService, type FinancialInstitution } from "../../services/wompiService";

interface Props {
  value?: PaymentSelection;
  onChange?: (sel: PaymentSelection) => void;
  errors?: Record<string, string>;
  allowAgencyCredit?: boolean;
  agencyCode?: number | string | null;
}

const wompiItems: { key: WompiMethod; label: string; img: string; code: number }[] = [
  { key: "CARD", label: "Usa tus Tarjetas", img: "https://agencias.bookingassistance.co/assets/admin/imagenes/pago4.png", code: 2 },
  { key: "BANCOLOMBIA_TRANSFER", label: "Transfiere con tu cuenta Bancolombia", img: "https://agencias.bookingassistance.co/assets/admin/imagenes/pago2.png", code: 3 },
  { key: "CASH", label: "Paga en efectivo en un Corresponsal Bancario", img: "https://agencias.bookingassistance.co/assets/admin/imagenes/pago1.png", code: 4 },
  { key: "NEQUI", label: "Nequi", img: "https://agencias.bookingassistance.co/assets/admin/imagenes/pago3.png", code: 5 },
  { key: "PSE", label: "PSE", img: "https://agencias.bookingassistance.co/assets/admin/imagenes/pago5.png", code: 6 },
];

const PaymentMethodSelector: React.FC<Props> = ({ value, onChange, errors, allowAgencyCredit = true, agencyCode = 1 }) => {
  const defaultSelection: PaymentSelection = allowAgencyCredit
    ? { platform: "agency", agencyCode: agencyCode ?? 1 }
    : { platform: "wompi", method: "CARD" };
  const [selection, setSelection] = useState<PaymentSelection>(
    value || defaultSelection
  );

  useEffect(() => { onChange?.(selection); }, [selection, onChange]);

  useEffect(() => {
    if (!value) return;
    setSelection(value);
  }, [value]);

  useEffect(() => {
    if (allowAgencyCredit) return;
    setSelection((prev) => {
      if (prev.platform !== "agency") return prev;
      return { platform: "wompi", method: "CARD" };
    });
  }, [allowAgencyCredit]);

  const isWompi = selection.platform === "wompi";
  const wompiMethod = isWompi ? selection.method : undefined;

  const pickAgency = () => {
    if (!allowAgencyCredit) return;
    setSelection({ platform: "agency", agencyCode: agencyCode ?? 1 });
  };
  const pickWompi = (method: WompiMethod) =>
    setSelection((prev) => ({
      platform: "wompi",
      method,
      billingEmail: prev.platform === "wompi" ? prev.billingEmail : undefined,
      data: prev.platform === "wompi" ? prev.data : undefined,
    }));

  const setBillingEmail = (email: string) => {
    setSelection((prev) => {
      if (prev.platform !== "wompi") return prev;
      return { ...prev, billingEmail: email };
    });
  };
  const setData = (key: string, val: string) => {
    setSelection((prev) => {
      if (prev.platform !== "wompi") return prev;
      return { ...prev, data: { ...(prev.data || {}), [key]: val } };
    });
  };
  const getData = (key: string): string => {
    if (selection.platform !== "wompi") return "";
    const val = selection.data?.[key];
    return typeof val === "string" ? val : val != null ? String(val) : "";
  };

  // Helpers for card UI
  const [cardNumberDisplay, setCardNumberDisplay] = useState<string>("");
  const [cardBrand, setCardBrand] = useState<"visa" | "mastercard" | "amex" | "unknown">("unknown");
  const detectBrand = (digits: string) => {
    if (/^3[47]/.test(digits)) return "amex" as const;
    if (/^4/.test(digits)) return "visa" as const;
    if (/^(5[1-5]|2(2[2-9]|[3-6][0-9]|7[01]|720))/.test(digits)) return "mastercard" as const;
    return "unknown" as const;
  };
  const formatCardNumber = (digits: string, brand: string) => {
    if (brand === "amex") {
      const a = digits.slice(0, 4);
      const b = digits.slice(4, 10);
      const c = digits.slice(10, 15);
      return [a, b, c].filter(Boolean).join(" ");
    }
    const groups = digits.match(/.{1,4}/g) || [];
    return groups.join(" ");
  };
  const handleCardNumberChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    // provisional brand by first digits or current brand if fits
    const b = detectBrand(digits);
    setCardBrand(b);
    const maxLen = b === "amex" ? 15 : 16;
    const trimmed = digits.slice(0, maxLen);
    const display = formatCardNumber(trimmed, b);
    setCardNumberDisplay(display);
    setData("cardNumber", trimmed);
    setData("cardBrand", b);
  };

  const [banks, setBanks] = useState<FinancialInstitution[]>([]);
  useEffect(() => {
    if (selection.platform === "wompi" && selection.method === "PSE") {
      wompiService.getFinancialInstitutions().then(setBanks).catch(() => setBanks([]));
    }
  }, [selection.platform, (selection as any).method]);

  // Using image icons per provided spec; no icon component needed.

  const fieldError = (key: string) => errors?.[key];
  const digitsOnly = (value: string) => value.replace(/\D/g, "");
  const labelClass = "block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1";

  return (
    <div className="space-y-4">
      <hr />
      <h3 className="text-lg font-semibold">Medio de pago</h3>
      {/* hidden form compatibility */}
      <input type="hidden" name="metodopago" id="metodopago" value={selection.platform === 'agency' ? 1 : wompiItems.find(w => w.key === wompiMethod)?.code || 1} />
      <input type="hidden" name="email-facturacion" id="email-facturacion" value={(selection as any).billingEmail || ""} />

      <div className="space-y-4">
        {/* Agencia */}
        {allowAgencyCredit && (
          <div>
            <div className={`card card-compact border bg-base-100 ${selection.platform === 'agency' ? 'border-blue-800 ring-2 ring-blue-200' : 'border-base-300 hover:border-primary'} transition rounded-xl` }>
              <div className="card-body p-3 md:p-4">
                <label className="flex flex-col gap-3 cursor-pointer">
                  <span className="font-medium text-sm text-gray-700">Crédito Agencia</span>
                  <div className="flex items-center justify-between gap-3">
                    <input type="radio" name="mediopago" id="credito-agencia" value={1} className="radio radio-primary radio-sm" checked={selection.platform === 'agency'} onChange={pickAgency} />
                    <img src="/images/payments/pago1.svg" alt="Credito Agencia" className="h-5" />
                  </div>
                </label>
              </div>
            </div>
            {selection.platform === 'agency' && (
              <div className="info-medio card border bg-base-100 mt-2" id="mediopago1">
                <div className="card-body p-3 md:p-4">
                <h4 className="font-semibold mb-2 text-sm">Paga con crédito agencia</h4>
                <div className="text-sm">El valor se descontará de tu cupo y deberás pagarlo más adelante.</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Wompi items stacked; details under each */}
        {wompiItems.map((it) => {
          const selected = selection.platform === 'wompi' && wompiMethod === it.key;
          return (
            <div key={it.key}>
              <div className={`card card-compact border bg-base-100 ${selected ? 'border-blue-800 ring-2 ring-blue-200' : 'border-base-300 hover:border-primary'} transition rounded-xl`}>
                <div className="card-body p-3 md:p-4">
                  <label className="flex flex-col gap-3 cursor-pointer">
                    <span className="font-medium text-sm text-gray-700">{it.label}</span>
                    <div className="flex items-center justify-between gap-3">
                      <input type="radio" name="mediopago" id={it.key} value={it.code} className="radio radio-primary radio-sm" checked={selected} onChange={() => pickWompi(it.key)} />
                      <img src={`/images/payments/pago${it.code}.svg`} alt={it.label} className="h-5" />
                    </div>
                  </label>
                </div>
              </div>

              {selected && wompiMethod === 'CARD' && (
                <div id="mediopago2" className="info-medio card border bg-base-100 mt-2">
                  <div className="card-body p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="form-control md:col-span-2">
                      <label className={labelClass} htmlFor="card-billing-email">Email de facturación</label>
                      <input
                        id="card-billing-email"
                        type="email"
                        className={`input input-bordered input-sm w-full email-facturacion ${fieldError('billingEmail') ? 'input-error' : ''}`}
                        value={selection.platform === 'wompi' ? (selection.billingEmail ?? '') : ''}
                        onChange={(e)=>setBillingEmail(e.target.value)}
                      />
                      {fieldError('billingEmail') && <span className="text-xs text-error mt-1">{fieldError('billingEmail')}</span>}
                    </div>
                    <div className="form-control md:col-span-2">
                      <label className={labelClass} htmlFor="card-number">Número de la tarjeta</label>
                      <div className={`input input-bordered input-sm flex items-center justify-between gap-2 p-0 pl-3 ${fieldError('cardNumber') || fieldError('cardBrand') ? 'input-error' : ''}`}>
                        <input
                          id="card-number"
                          className="grow bg-transparent px-0 focus:outline-none"
                          placeholder={cardBrand === 'amex' ? '#### ###### #####' : '#### #### #### ####'}
                          value={cardNumberDisplay}
                          onChange={(e)=>handleCardNumberChange(e.target.value)}
                          inputMode="numeric"
                        />
                        <img
                          src={cardBrand === 'visa' ? '/images/cards/visa.svg' : cardBrand === 'mastercard' ? '/images/cards/mastercard.svg' : cardBrand === 'amex' ? '/images/cards/amex.svg' : '/images/cards/visa.svg'}
                          alt="brand"
                          className="h-5 mr-2 opacity-80"
                        />
                      </div>
                      <div className="mt-1 text-[10px] text-gray-500">Se detecta automáticamente: {cardBrand === 'unknown' ? '—' : cardBrand.toUpperCase()}</div>
                      {(fieldError('cardNumber') || fieldError('cardBrand')) && (
                        <span className="text-xs text-error mt-1">{fieldError('cardNumber') || fieldError('cardBrand')}</span>
                      )}
                    </div>
                    {/* Expiración y CVC lado a lado, cada input con su label arriba */}
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                      <div className="form-control">
                        <label className={labelClass} htmlFor="card-expiration-month">Mes</label>
                        <select
                          id="card-expiration-month"
                          className={`select select-bordered select-sm w-full ${fieldError('expirationMonth') ? 'select-error' : ''}`}
                          value={selection.platform === 'wompi' ? getData('expirationMonth') : ''}
                          onChange={(e)=>setData('expirationMonth', e.target.value)}
                        >
                          <option value="" disabled>Mes</option>
                          {Array.from({length:12}).map((_,i)=>{
                            const v = String(i+1).padStart(2,'0');
                            return <option key={v} value={v}>{v}</option>
                          })}
                        </select>
                        {fieldError('expirationMonth') && <span className="text-xs text-error mt-1">{fieldError('expirationMonth')}</span>}
                      </div>
                      <div className="form-control">
                        <label className={labelClass} htmlFor="card-expiration-year">Año</label>
                        <select
                          id="card-expiration-year"
                          className={`select select-bordered select-sm w-full ${fieldError('expirationYear') ? 'select-error' : ''}`}
                          value={selection.platform === 'wompi' ? getData('expirationYear') : ''}
                          onChange={(e)=>setData('expirationYear', e.target.value)}
                        >
                          <option value="">Año</option>
                          {Array.from({length:15}).map((_,i)=>{
                            const y = 25 + i; return <option key={y} value={y}>{y}</option>
                          })}
                        </select>
                        {fieldError('expirationYear') && <span className="text-xs text-error mt-1">{fieldError('expirationYear')}</span>}
                      </div>
                      <div className="form-control md:col-span-2">
                        <label className={labelClass} htmlFor="card-cvc">CVC</label>
                        <input
                          id="card-cvc"
                          className={`input input-bordered input-sm ${fieldError('cvc') ? 'input-error' : ''}`}
                          placeholder={cardBrand==='amex'?'4 dígitos':'3 dígitos'}
                          inputMode="numeric"
                          maxLength={cardBrand === 'amex' ? 4 : 3}
                          value={selection.platform === 'wompi' ? getData('cvc') : ''}
                          onChange={(e)=>{
                            const digits = digitsOnly(e.target.value).slice(0, cardBrand === 'amex' ? 4 : 3);
                            setData('cvc', digits);
                          }}
                        />
                        {fieldError('cvc') && <span className="text-xs text-error mt-1">{fieldError('cvc')}</span>}
                      </div>
                    </div>
                    {/* Nombre en la tarjeta a todo el ancho */}
                    <div className="form-control md:col-span-2">
                      <label className={labelClass} htmlFor="card-holder-name">Nombre en la tarjeta</label>
                      <input
                        id="card-holder-name"
                        className={`input input-bordered input-sm ${fieldError('cardName') ? 'input-error' : ''}`}
                        placeholder="Como aparece en la tarjeta"
                        value={selection.platform === 'wompi' ? getData('cardName') : ''}
                        onChange={(e)=>setData('cardName', e.target.value)}
                      />
                      {fieldError('cardName') && <span className="text-xs text-error mt-1">{fieldError('cardName')}</span>}
                    </div>
                    {/* Identificación del tarjetahabiente con labels por campo */}
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3 max-w-xl">
                      <div className="form-control">
                        <label className={labelClass} htmlFor="card-document-type">Tipo de documento</label>
                        <select
                          id="card-document-type"
                          className={`select select-bordered select-sm ${fieldError('cardholderDocumentType') ? 'select-error' : ''}`}
                          value={selection.platform === 'wompi' ? getData('cardholderDocumentType') : ''}
                          onChange={(e)=>setData('cardholderDocumentType', e.target.value)}
                        >
                          {['CC','CE','NIT','PP','TI','DNI','RG','OTHER'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        {fieldError('cardholderDocumentType') && <span className="text-xs text-error mt-1">{fieldError('cardholderDocumentType')}</span>}
                      </div>
                      <div className="form-control md:col-span-2">
                        <label className={labelClass} htmlFor="card-document-number">Número de documento</label>
                        <input
                          id="card-document-number"
                          className={`input input-bordered input-sm ${fieldError('cardholderDocumentNumber') ? 'input-error' : ''}`}
                          inputMode="numeric"
                          pattern="\\d*"
                          value={selection.platform === 'wompi' ? getData('cardholderDocumentNumber') : ''}
                          onChange={(e)=>{
                            const digits = digitsOnly(e.target.value).slice(0, 20);
                            setData('cardholderDocumentNumber', digits);
                          }}
                        />
                        {fieldError('cardholderDocumentNumber') && <span className="text-xs text-error mt-1">{fieldError('cardholderDocumentNumber')}</span>}
                      </div>
                    </div>
                    <div className="form-control md:col-span-2 max-w-xs">
                      <label className={labelClass} htmlFor="card-installments">Cuotas</label>
                      <select
                        id="card-installments"
                        className={`select select-bordered select-sm ${fieldError('installments') ? 'select-error' : ''}`}
                        value={selection.platform === 'wompi' ? getData('installments') : ''}
                        onChange={(e)=>setData('installments', e.target.value)}
                      >
                        <option value="" disabled>Selecciona</option>
                        {Array.from({length:36}).map((_,i)=> <option key={i+1} value={String(i+1)}>{i+1}</option>)}
                      </select>
                      {fieldError('installments') && <span className="text-xs text-error mt-1">{fieldError('installments')}</span>}
                    </div>
                    <div className="form-control md:col-span-2">
                      <span className={labelClass}>Aceptación de términos</span>
                      <label className="cursor-pointer inline-flex items-start gap-2">
                        <input
                          type="checkbox"
                          className={`checkbox checkbox-xs ${fieldError('termsAccepted') ? 'checkbox-error' : ''}`}
                          checked={selection.platform === 'wompi' ? getData('termsAccepted') === '1' : false}
                          onChange={(e)=>setData('termsAccepted', e.target.checked ? '1':'0')}
                        />
                        <span className="text-xs md:text-sm">Acepto haber leído los <a className="link" target="_blank" href="https://wompi.com/assets/downloadble/reglamento-Usuarios-Colombia.pdf">Términos y Condiciones y la Política de Privacidad</a>.</span>
                      </label>
                      {fieldError('termsAccepted') && <span className="text-xs text-error mt-1">{fieldError('termsAccepted')}</span>}
                    </div>
                  </div>
                </div>
              )}

              {selected && wompiMethod === 'BANCOLOMBIA_TRANSFER' && (
                <div id="mediopago3" className="info-medio card border bg-base-100 mt-2">
                  <div className="card-body p-3 md:p-4 space-y-4">
                  <h4 className="font-semibold">Paga con Bancolombia</h4>
                  <div className="text-center">
                    <img src="https://agencias.bookingassistance.co/assets/admin/imagenes/pago2.png" alt="Bancolombia" className="mx-auto h-8" />
                    <div>Usa tu <strong>de ahorros o corriente</strong>, recuerda tener activa la <strong>clave dinámica</strong> en la App.</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className={labelClass} htmlFor="bancolombia-billing-email">Email de facturación</label>
                      <input
                        id="bancolombia-billing-email"
                        type="email"
                        className={`input input-bordered input-sm email-facturacion ${fieldError('billingEmail') ? 'input-error' : ''}`}
                        required
                        value={selection.platform === 'wompi' ? (selection.billingEmail ?? '') : ''}
                        onChange={(e)=>setBillingEmail(e.target.value)}
                      />
                      {fieldError('billingEmail') && <span className="text-xs text-error mt-1">{fieldError('billingEmail')}</span>}
                    </div>
                    <div className="form-control">
                      <label className={labelClass} htmlFor="bancolombia-user-type">Tipo de persona</label>
                      <select
                        id="bancolombia-user-type"
                        className={`select select-bordered select-sm ${fieldError('userType') ? 'select-error' : ''}`}
                        value={selection.platform === 'wompi' ? getData('userType') || 'PERSON' : 'PERSON'}
                        onChange={(e)=>setData('userType', e.target.value)}
                      >
                        <option value="PERSON">Persona natural</option>
                        <option value="BUSINESS" disabled>Persona jurídica (no disponible aún)</option>
                      </select>
                      {fieldError('userType') && <span className="text-xs text-error mt-1">{fieldError('userType')}</span>}
                    </div>
                  </div>
                  <div className="form-control">
                    <span className={labelClass}>Aceptación de términos</span>
                    <label className="cursor-pointer inline-flex items-start gap-2 mt-1">
                      <input
                        type="checkbox"
                        className={`checkbox checkbox-xs ${fieldError('termsAccepted') ? 'checkbox-error' : ''}`}
                        required
                        checked={selection.platform === 'wompi' ? getData('termsAccepted') === '1' : false}
                        onChange={(e)=>setData('termsAccepted', e.target.checked ? '1':'0')}
                      />
                      <span className="text-xs md:text-sm">Acepto haber leído los <a className="link" target="_blank" href="https://wompi.com/assets/downloadble/reglamento-Usuarios-Colombia.pdf">Términos y Condiciones y la Política de Privacidad</a>.</span>
                    </label>
                    {fieldError('termsAccepted') && <span className="text-xs text-error mt-1">{fieldError('termsAccepted')}</span>}
                  </div>
                </div>
              </div>
              )}

              {selected && wompiMethod === 'CASH' && (
                <div id="mediopago4" className="info-medio card border bg-base-100 mt-2">
                  <div className="card-body p-3 md:p-4 space-y-4">
                  <h4 className="font-semibold">Paga en efectivo</h4>
                  <div className="text-center">
                    <img src="https://agencias.bookingassistance.co/assets/admin/imagenes/pago1.png" alt="Efectivo" className="mx-auto h-8" />
                    <div>Acércate a un <strong>Corresponsal Bancario Bancolombia</strong> en las próximas 72 horas y realiza tu pago con las instrucciones del siguiente paso.</div>
                  </div>
                  <div className="form-control">
                    <label className={labelClass} htmlFor="cash-billing-email">Email de facturación</label>
                    <input
                      id="cash-billing-email"
                      type="email"
                      className={`input input-bordered input-sm email-facturacion ${fieldError('billingEmail') ? 'input-error' : ''}`}
                      value={selection.platform === 'wompi' ? (selection.billingEmail ?? '') : ''}
                      onChange={(e)=>setBillingEmail(e.target.value)}
                    />
                    {fieldError('billingEmail') && <span className="text-xs text-error mt-1">{fieldError('billingEmail')}</span>}
                  </div>
                  <div className="form-control">
                    <span className={labelClass}>Aceptación de términos</span>
                    <label className="cursor-pointer inline-flex items-start gap-2 mt-1">
                      <input
                        type="checkbox"
                        className={`checkbox checkbox-xs ${fieldError('termsAccepted') ? 'checkbox-error' : ''}`}
                        checked={selection.platform === 'wompi' ? getData('termsAccepted') === '1' : false}
                        onChange={(e)=>setData('termsAccepted', e.target.checked ? '1':'0')}
                      />
                      <span className="text-xs md:text-sm">Acepto haber leído los <a className="link" target="_blank" href="https://wompi.com/assets/downloadble/reglamento-Usuarios-Colombia.pdf">Términos y Condiciones y la Política de Privacidad</a>.</span>
                    </label>
                    {fieldError('termsAccepted') && <span className="text-xs text-error mt-1">{fieldError('termsAccepted')}</span>}
                  </div>
                </div>
              </div>
              )}

              {selected && wompiMethod === 'NEQUI' && (
                <div id="mediopago5" className="info-medio card border bg-base-100 mt-2">
                  <div className="card-body p-3 md:p-4 space-y-4">
                  <h4 className="font-semibold">Paga con Nequi</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className={labelClass} htmlFor="nequi-billing-email">Email de facturación</label>
                      <input
                        id="nequi-billing-email"
                        type="email"
                        className={`input input-bordered input-sm email-facturacion ${fieldError('billingEmail') ? 'input-error' : ''}`}
                        value={selection.platform === 'wompi' ? (selection.billingEmail ?? '') : ''}
                        onChange={(e)=>setBillingEmail(e.target.value)}
                      />
                      {fieldError('billingEmail') && <span className="text-xs text-error mt-1">{fieldError('billingEmail')}</span>}
                    </div>
                    <div className="form-control">
                      <label className={labelClass} htmlFor="nequi-phone">Número celular de tu cuenta Nequi</label>
                      <input
                        id="nequi-phone"
                        type="text"
                        inputMode="numeric"
                        pattern="\\d*"
                        className={`input input-bordered input-sm ${fieldError('nequiPhone') ? 'input-error' : ''}`}
                        value={selection.platform === 'wompi' ? getData('nequiPhone') : ''}
                        onChange={(e)=>{
                          const digits = digitsOnly(e.target.value).slice(0, 20);
                          setData('nequiPhone', digits);
                        }}
                      />
                      <div className="text-xs text-gray-500 mt-1">Recibirás una notificación push en tu celular.</div>
                      {fieldError('nequiPhone') && <span className="text-xs text-error mt-1">{fieldError('nequiPhone')}</span>}
                    </div>
                  </div>
                  <div className="form-control">
                    <span className={labelClass}>Aceptación de términos</span>
                    <label className="cursor-pointer inline-flex items-start gap-2 mt-1">
                      <input
                        type="checkbox"
                        className={`checkbox checkbox-xs ${fieldError('termsAccepted') ? 'checkbox-error' : ''}`}
                        checked={selection.platform === 'wompi' ? getData('termsAccepted') === '1' : false}
                        onChange={(e)=>setData('termsAccepted', e.target.checked ? '1':'0')}
                      />
                      <span className="text-xs md:text-sm">Acepto haber leído los <a className="link" target="_blank" href="https://wompi.com/assets/downloadble/reglamento-Usuarios-Colombia.pdf">Términos y Condiciones y la Política de Privacidad</a>.</span>
                    </label>
                    {fieldError('termsAccepted') && <span className="text-xs text-error mt-1">{fieldError('termsAccepted')}</span>}
                  </div>
                </div>
              </div>
              )}

              {selected && wompiMethod === 'PSE' && (
                <div id="mediopago6" className="info-medio card border bg-base-100 mt-2">
                  <div className="card-body p-3 md:p-4 space-y-4">
                  <h4 className="font-semibold">Paga con PSE</h4>
                  {!banks.length && (
                    <div className="alert alert-warning text-sm">
                      Servicio PSE temporalmente fuera de servicio. Inténtalo de nuevo más tarde.
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className={labelClass} htmlFor="pse-billing-email">Email de facturación</label>
                      <input
                        id="pse-billing-email"
                        type="email"
                        className={`input input-bordered input-sm email-facturacion ${fieldError('billingEmail') ? 'input-error' : ''}`}
                        value={selection.platform === 'wompi' ? (selection.billingEmail ?? '') : ''}
                        onChange={(e)=>setBillingEmail(e.target.value)}
                      />
                      {fieldError('billingEmail') && <span className="text-xs text-error mt-1">{fieldError('billingEmail')}</span>}
                    </div>
                    <div className="form-control">
                      <label className={labelClass} htmlFor="pse-customer-type">Tipo de persona</label>
                      <select
                        name="tipopersonapse"
                        id="pse-customer-type"
                        className={`select select-bordered select-sm ${fieldError('pseCustomerType') ? 'select-error' : ''}`}
                        value={selection.platform === 'wompi' ? getData('pseCustomerType') || '0' : '0'}
                        onChange={(e)=>setData('pseCustomerType', e.target.value)}
                      >
                        <option value="0">Natural</option>
                        <option value="1">Jurídica</option>
                      </select>
                      {fieldError('pseCustomerType') && <span className="text-xs text-error mt-1">{fieldError('pseCustomerType')}</span>}
                    </div>
                    <div className="form-control">
                      <label className={labelClass} htmlFor="pse-bank-code">Selecciona tu banco</label>
                      <select
                        name="bancopse"
                        id="pse-bank-code"
                        className={`select select-bordered select-sm ${fieldError('pseBankCode') ? 'select-error' : ''}`}
                        value={selection.platform === 'wompi' ? getData('pseBankCode') || '0' : '0'}
                        onChange={(e)=>setData('pseBankCode', e.target.value)}
                        disabled={!banks.length}
                      >
                        <option value="0">A continuación seleccione su banco</option>
                        {banks.map((b) => (
                          <option key={b.code} value={b.code}>{b.name}</option>
                        ))}
                      </select>
                      {fieldError('pseBankCode') && <span className="text-xs text-error mt-1">{fieldError('pseBankCode')}</span>}
                    </div>
                    <div className="form-control">
                      <label className={labelClass} htmlFor="pse-document-type">Tipo de documento</label>
                      <select
                        name="tipodocumentopse"
                        id="pse-document-type"
                        className={`select select-bordered select-sm ${fieldError('pseDocumentType') ? 'select-error' : ''}`}
                        value={selection.platform === 'wompi' ? getData('pseDocumentType') : ''}
                        onChange={(e)=>setData('pseDocumentType', e.target.value)}
                      >
                        <option value="">- Escoge un tipo de documento -</option>
                        <option value="CC">CC - Cédula de ciudadanía</option>
                        <option value="CE">CE - Cédula de extranjería</option>
                        <option value="NIT">NIT - Número de identificación tributaria</option>
                      </select>
                      {fieldError('pseDocumentType') && <span className="text-xs text-error mt-1">{fieldError('pseDocumentType')}</span>}
                    </div>
                    <div className="form-control">
                      <label className={labelClass} htmlFor="pse-document-number">Número de documento</label>
                      <input
                        type="text"
                        name="nodocumentopse"
                        id="pse-document-number"
                        className={`input input-bordered input-sm ${fieldError('pseDocumentNumber') ? 'input-error' : ''}`}
                        inputMode="numeric"
                        pattern="\\d*"
                        value={selection.platform === 'wompi' ? getData('pseDocumentNumber') : ''}
                        onChange={(e)=>{
                          const digits = digitsOnly(e.target.value).slice(0, 20);
                          setData('pseDocumentNumber', digits);
                        }}
                      />
                      {fieldError('pseDocumentNumber') && <span className="text-xs text-error mt-1">{fieldError('pseDocumentNumber')}</span>}
                    </div>
                  </div>
                  <div className="form-control">
                    <span className={labelClass}>Aceptación de términos</span>
                    <label className="cursor-pointer inline-flex items-start gap-2 mt-1">
                      <input
                        type="checkbox"
                        className={`checkbox checkbox-xs ${fieldError('termsAccepted') ? 'checkbox-error' : ''}`}
                        checked={selection.platform === 'wompi' ? getData('termsAccepted') === '1' : false}
                        onChange={(e)=>setData('termsAccepted', e.target.checked ? '1':'0')}
                      />
                      <span className="text-xs md:text-sm">Acepto haber leído los <a className="link" target="_blank" href="https://wompi.com/assets/downloadble/reglamento-Usuarios-Colombia.pdf">Términos y Condiciones y la Política de Privacidad</a>.</span>
                    </label>
                    {fieldError('termsAccepted') && <span className="text-xs text-error mt-1">{fieldError('termsAccepted')}</span>}
                  </div>
                </div>
              </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
