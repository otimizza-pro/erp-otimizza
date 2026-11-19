// Stable persistence key for the internal brand, separate from customer portfolios.
export const INTERNAL_COMPANY_ID="00000000-0000-4000-8000-000000000001";
export function contentCompanyId(company:{id:string;isOtimizza:boolean}){return company.isOtimizza?INTERNAL_COMPANY_ID:company.id;}
