import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool, PoolClient } from "pg";
const mocks = vi.hoisted(() => ({ environment: { DATABASE_URL:"postgresql://user:pass@localhost/prod",DATABASE_URL_TEST:"postgresql://user:pass@localhost/test",DIRECT_URL:undefined as string|undefined,SUPABASE_PROJECT_REF:undefined }, pool:vi.fn() }));
vi.mock("@/lib/env", () => ({getEnv:()=>mocks.environment}));
vi.mock("pg", () => ({default:{Pool:mocks.pool}}));
import {afterCommit, createPoolConfig, getDbPool, getMigrationDbPool, withTransaction} from "@/lib/db/pool";

afterEach(()=>{delete global.__dbPool;vi.unstubAllEnvs();vi.clearAllMocks();});
describe("Database safety",()=>{
 it("retains URL parameters when sslmode is the first parameter",()=>{
  const config=createPoolConfig("postgresql://user:pass@localhost/test?sslmode=require&application_name=erp");
  const url=new URL(config.connectionString);
  expect(url.searchParams.get("application_name")).toBe("erp");
  expect(url.searchParams.has("sslmode")).toBe(false);
 });
 it("uses the isolated test DB even if NODE_ENV was inherited as development",()=>{
  vi.stubEnv("NODE_ENV","development");vi.stubEnv("VITEST","true");
  getDbPool();
  expect(mocks.pool.mock.calls[0][0].connectionString).toContain("/test");
 });
 it("blocks migration tests pointed at the production database",()=>{
  vi.stubEnv("NODE_ENV","development");vi.stubEnv("VITEST","true");
  const original=mocks.environment.DATABASE_URL_TEST;
  mocks.environment.DATABASE_URL_TEST=mocks.environment.DATABASE_URL;
  try{expect(()=>getMigrationDbPool()).toThrow(/FAIL-CLOSED/);}finally{mocks.environment.DATABASE_URL_TEST=original;}
 });
 it("allows a longer connection window only for migration CLI connections",()=>{
  getMigrationDbPool();
  expect(mocks.pool.mock.calls[0][0]).toMatchObject({max:1,connectionTimeoutMillis:30000});
  expect(createPoolConfig(mocks.environment.DATABASE_URL_TEST).connectionTimeoutMillis).toBe(5000);
 });
});

describe("Transaction guarantees",()=>{
 let commands:string[], released:boolean, client:PoolClient;
 beforeEach(()=>{
  commands=[];released=false;
  client={query:vi.fn(async (sql:string)=>{commands.push(sql);return {command:sql,rows:[]};}),release:vi.fn(()=>{released=true;})} as unknown as PoolClient;
  global.__dbPool={connect:vi.fn(async()=>client)} as unknown as Pool;
 });
 it("runs external deletion only after commit and connection release",async()=>{
  const effect=vi.fn(async()=>{expect(released).toBe(true);expect(commands).toContain("COMMIT");});
  await withTransaction(async c=>{afterCommit(c,effect);return 7;});
  expect(effect).toHaveBeenCalledOnce();expect(client.release).toHaveBeenCalledOnce();
 });
 it("never executes external deletion when SQL rolls back",async()=>{
  const effect=vi.fn(async()=>{});
  await expect(withTransaction(async c=>{afterCommit(c,effect);throw new Error("FK");})).rejects.toThrow("FK");
  expect(commands).toContain("ROLLBACK");expect(effect).not.toHaveBeenCalled();
 });
 it("does not report an aborted transaction as committed",async()=>{
  vi.mocked(client.query).mockImplementation((async (sql:string)=>({command:sql==="COMMIT"?"ROLLBACK":sql,rows:[]})) as typeof client.query);
  const effect=vi.fn(async()=>{});
  await expect(withTransaction(async c=>{afterCommit(c,effect);})).rejects.toThrow(/abortada/);
  expect(effect).not.toHaveBeenCalled();expect(client.release).toHaveBeenCalledOnce();
 });
});
