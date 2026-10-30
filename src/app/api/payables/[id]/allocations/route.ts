import { NextResponse } from "next/server";
import { SupplierService } from "@/modules/suppliers/service";
import { getDbPool } from "@/lib/db/pool";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pool = getDbPool();
    const query = `
      SELECT 
        pa.id,
        pa.payable_id as "payableId",
        pa.contract_id as "contractId",
        c.contract_number as "contractNumber",
        cl.name as "clientName",
        pa.contract_item_id as "contractItemId",
        pa.service_id as "serviceId",
        s.name as "serviceName",
        pa.allocated_amount::float as "allocatedAmount",
        pa.coverage_start_date::text as "coverageStartDate",
        pa.coverage_end_date::text as "coverageEndDate",
        pa.cost_periodicity as "costPeriodicity",
        pa.status,
        pa.cancellation_reason as "cancellationReason",
        pa.canceled_at as "canceledAt",
        pa.notes,
        pa.created_at as "createdAt"
      FROM payable_allocations pa
      LEFT JOIN contracts c ON c.id = pa.contract_id
      LEFT JOIN clients cl ON cl.id = c.client_id
      LEFT JOIN services s ON s.id = pa.service_id
      WHERE pa.payable_id = $1
      ORDER BY pa.created_at DESC;
    `;
    const { rows } = await pool.query(query, [id]);
    return NextResponse.json(rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao listar rateios do título.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const allocation = await SupplierService.allocatePayable({
      ...body,
      payableId: id,
    });
    return NextResponse.json(allocation, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao realizar rateio.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
