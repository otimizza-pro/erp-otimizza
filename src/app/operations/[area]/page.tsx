import { notFound } from "next/navigation";
import { operationAreas, OperationArea } from "@/modules/operations/catalog";
import { OperationsWorkspace } from "@/components/operations/workspace";
export default async function OperationPage({params}:{params:Promise<{area:string}>}) {const {area}=await params;if(!Object.hasOwn(operationAreas,area))notFound();return <OperationsWorkspace area={area as OperationArea}/>;}
