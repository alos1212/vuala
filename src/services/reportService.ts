import api from "../lib/axios";
import type { InsuranceTravelerReportResponse } from "../types/insuranceReport";

export interface TravelerReportParams {
  type?: "international" | "national" | "all";
  status?: "active" | "canceled";
  voucher?: string;
  agency?: string | number;
  company_id?: string | number;
  document?: string;
  first_name?: string;
  last_name?: string;
  issued_from?: string;
  issued_to?: string;
  departure_from?: string;
  departure_to?: string;
  canceled_from?: string;
  canceled_to?: string;
  per_page?: number;
  page?: number;
}

export const reportService = {
  async getInsuranceTravelers(params: TravelerReportParams) {
    const { data } = await api.get<InsuranceTravelerReportResponse>(
      "/reports/insurance/travelers",
      { params }
    );
    return data;
  },
  async exportInsuranceTravelers(params: TravelerReportParams) {
    const { data, headers } = await api.get<Blob>(
      "/reports/insurance/travelers/export",
      {
        params,
        responseType: "blob",
      }
    );
    const headerFileName = headers["x-file-name"];
    const disposition = headers["content-disposition"] || "";
    const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    const basicMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
    const rawName = headerFileName || (utfMatch?.[1] ? decodeURIComponent(utfMatch[1]) : basicMatch?.[1]);
    const filename = rawName && rawName.trim() ? rawName.trim() : "reporte_seguros.xlsx";
    return { blob: data, filename };
  },
};
