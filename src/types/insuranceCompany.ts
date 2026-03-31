export interface InsuranceCompany {
  id: number;
  name: string;
  logo: string | null;
    logo_url?: string | null;
  contact: string | null;
  phones: string | null;
  terms: string | null;
  terms_url: string | null;
  cashback: number | null;
  national_contact: string | null;
  national_phones: string | null;
  national_terms: string | null;
  national_terms_url: string | null;
  is_insurance: boolean;
  created_at: string;
  updated_at: string;
}
