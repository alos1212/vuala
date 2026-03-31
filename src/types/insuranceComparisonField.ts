export interface InsuranceComparisonField {
  id: number
  name: string
  name_en: string
  field_type: "value" | "text" | "included"
  is_filterable: boolean
  is_comparative: boolean
  in_results: boolean
  company_id?: number | null
  company?: { id: number; name: string }
  order: number
  created_at: string
  updated_at: string
}

export interface CreateInsuranceComparisonFieldData {
  name: string
  name_en: string
  field_type: "value" | "text" | "included"
  is_filterable: boolean
  is_comparative: boolean
  in_results: boolean
  company_id?: number | null
}

export interface UpdateInsuranceComparisonFieldData extends CreateInsuranceComparisonFieldData {
  id: number
}

export interface InsuranceComparisonFieldResponse {
  data: InsuranceComparisonField[]
  message?: string
}
