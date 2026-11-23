import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextRequest, NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db/pool";
import { addProjectTimeEntry } from "@/modules/projects/service";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const { id: projectId } = await params;

    const res = await query(
      `
      SELECT 
        pat.id,
        pat.project_id as "projectId",
        pat.task_id as "taskId",
        t.title as "taskTitle",
        pat.description,
        pat.started_at as "startedAt",
        pat.last_started_at as "lastStartedAt",
        pat.accumulated_seconds as "accumulatedSeconds",
        pat.is_running as "isRunning",
        pat.hourly_rate as "hourlyRate",
        CASE 
          WHEN pat.is_running THEN 
            pat.accumulated_seconds + GREATEST(0, EXTRACT(EPOCH FROM (NOW() - pat.last_started_at))::int)
          ELSE 
            pat.accumulated_seconds 
        END as "currentSeconds"
      FROM public.project_active_timers pat
      LEFT JOIN public.project_tasks t ON t.id = pat.task_id
      WHERE pat.project_id = $1
      ORDER BY pat.is_running DESC, pat.updated_at DESC
      `,
      [projectId]
    );

    return NextResponse.json({ success: true, timers: res.rows });
  } catch (error: unknown) {
    console.error("Erro ao buscar timers ativos do projeto:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao buscar timers." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const { id: projectId } = await params;
    const body = await req.json();
    const { action, timerId, taskId, description, hourlyRate } = body;

    if (!action || !["START", "PAUSE", "RESUME", "STOP", "DISCARD"].includes(action)) {
      return NextResponse.json({ error: "Ação de cronômetro inválida." }, { status: 400 });
    }

    if (action === "START") {
      // Verificar se já existe timer ativo para este projeto / tarefa
      let existingRes;
      if (taskId) {
        existingRes = await query(
          `SELECT * FROM public.project_active_timers WHERE project_id = $1 AND task_id = $2 LIMIT 1`,
          [projectId, taskId]
        );
      } else {
        existingRes = await query(
          `SELECT * FROM public.project_active_timers WHERE project_id = $1 AND task_id IS NULL LIMIT 1`,
          [projectId]
        );
      }

      if (existingRes.rows.length > 0) {
        const timer = existingRes.rows[0];
        // Se estava pausado, retoma
        if (!timer.is_running) {
          const updateRes = await query(
            `UPDATE public.project_active_timers 
             SET is_running = true, last_started_at = NOW(), updated_at = NOW() 
             WHERE id = $1 
             RETURNING *`,
            [timer.id]
          );
          return NextResponse.json({ success: true, timer: updateRes.rows[0], message: "Cronômetro retomado." });
        }
        return NextResponse.json({ success: true, timer, message: "Cronômetro já está em execução." });
      }

      // Se for tarefa, buscar título para preencher descrição padrão
      let defaultDesc = description?.trim() || "";
      if (!defaultDesc && taskId) {
        const taskRes = await query(`SELECT title FROM public.project_tasks WHERE id = $1`, [taskId]);
        if (taskRes.rows.length > 0) {
          defaultDesc = taskRes.rows[0].title;
        }
      }

      const insertRes = await query(
        `
        INSERT INTO public.project_active_timers (
          project_id, task_id, description, hourly_rate, started_at, last_started_at, accumulated_seconds, is_running
        ) VALUES ($1, $2, $3, $4, NOW(), NOW(), 0, true)
        RETURNING *
        `,
        [projectId, taskId || null, defaultDesc || "Atividade Operacional", Number(hourlyRate) || 0]
      );

      return NextResponse.json({ success: true, timer: insertRes.rows[0], message: "Cronômetro iniciado." }, { status: 201 });
    }

    if (action === "PAUSE") {
      const timerRes = await query(
        `SELECT * FROM public.project_active_timers 
         WHERE project_id = $1 AND (id = $2 OR task_id = $3 OR ($2 IS NULL AND $3 IS NULL)) 
         ORDER BY updated_at DESC LIMIT 1`,
        [projectId, timerId || null, taskId || null]
      );

      if (timerRes.rows.length === 0) {
        return NextResponse.json({ error: "Nenhum cronômetro ativo encontrado." }, { status: 404 });
      }

      const timer = timerRes.rows[0];
      if (timer.is_running) {
        const updateRes = await query(
          `
          UPDATE public.project_active_timers
          SET 
            accumulated_seconds = accumulated_seconds + GREATEST(0, EXTRACT(EPOCH FROM (NOW() - last_started_at))::int),
            is_running = false,
            updated_at = NOW()
          WHERE id = $1
          RETURNING *
          `,
          [timer.id]
        );
        return NextResponse.json({ success: true, timer: updateRes.rows[0], message: "Cronômetro pausado." });
      }

      return NextResponse.json({ success: true, timer, message: "Cronômetro já estava pausado." });
    }

    if (action === "RESUME") {
      const timerRes = await query(
        `SELECT * FROM public.project_active_timers 
         WHERE project_id = $1 AND (id = $2 OR task_id = $3 OR ($2 IS NULL AND $3 IS NULL)) 
         ORDER BY updated_at DESC LIMIT 1`,
        [projectId, timerId || null, taskId || null]
      );

      if (timerRes.rows.length === 0) {
        return NextResponse.json({ error: "Nenhum cronômetro ativo encontrado." }, { status: 404 });
      }

      const timer = timerRes.rows[0];
      const updateRes = await query(
        `
        UPDATE public.project_active_timers
        SET is_running = true, last_started_at = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [timer.id]
      );
      return NextResponse.json({ success: true, timer: updateRes.rows[0], message: "Cronômetro retomado." });
    }

    if (action === "STOP") {
      return await withTransaction(async (client) => {
        const timerRes = await client.query(
          `SELECT pat.*, t.title as task_title 
           FROM public.project_active_timers pat
           LEFT JOIN public.project_tasks t ON t.id = pat.task_id
           WHERE pat.project_id = $1 AND (pat.id = $2 OR pat.task_id = $3 OR ($2 IS NULL AND $3 IS NULL))
           ORDER BY pat.updated_at DESC LIMIT 1`,
          [projectId, timerId || null, taskId || null]
        );

        if (timerRes.rows.length === 0) {
          throw new Error("Nenhum cronômetro encontrado para finalizar.");
        }

        const timer = timerRes.rows[0];

        // Calcular tempo total em segundos
        let totalSeconds = Number(timer.accumulated_seconds) || 0;
        if (timer.is_running && timer.last_started_at) {
          const diff = Math.floor((Date.now() - new Date(timer.last_started_at).getTime()) / 1000);
          if (diff > 0) totalSeconds += diff;
        }

        // Converter para horas decimais com precisão (mínimo de 0.02h = ~1 minuto)
        const rawHours = totalSeconds / 3600;
        const finalHours = Math.max(0.02, Math.round(rawHours * 100) / 100);

        const finalDesc = description?.trim() || timer.description || timer.task_title || "Atividade no projeto";
        const finalRate = hourlyRate !== undefined ? Number(hourlyRate) : Number(timer.hourly_rate) || 0;

        // Gravar no histórico oficial de apontamentos
        const entry = await addProjectTimeEntry({
          projectId,
          taskId: timer.task_id || undefined,
          entryDate: new Date().toISOString().split("T")[0],
          hours: finalHours,
          description: finalDesc,
          hourlyRate: finalRate,
        });

        // Remover da lista de timers ativos
        await client.query(`DELETE FROM public.project_active_timers WHERE id = $1`, [timer.id]);

        return NextResponse.json({
          success: true,
          entry,
          totalSeconds,
          hours: finalHours,
          message: `Apontamento de ${finalHours}h finalizado e registrado com sucesso.`,
        });
      });
    }

    if (action === "DISCARD") {
      const deleteRes = await query(
        `DELETE FROM public.project_active_timers 
         WHERE project_id = $1 AND (id = $2 OR task_id = $3 OR ($2 IS NULL AND $3 IS NULL))
         RETURNING id`,
        [projectId, timerId || null, taskId || null]
      );

      return NextResponse.json({
        success: true,
        deletedCount: deleteRes.rowCount,
        message: "Cronômetro descartado sem registrar horas.",
      });
    }

    return NextResponse.json({ error: "Ação não suportada." }, { status: 400 });
  } catch (error: unknown) {
    console.error("Erro ao gerenciar cronômetro do projeto:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao processar cronômetro." },
      { status: 500 }
    );
  }
}
