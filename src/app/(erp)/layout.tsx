import {AppShell} from "@/components/layout/app-shell";
import {CompanyProvider} from "@/lib/context/company-context";

export default function ErpLayout({children}:{children:React.ReactNode}){
  return <CompanyProvider><AppShell>{children}</AppShell></CompanyProvider>;
}
