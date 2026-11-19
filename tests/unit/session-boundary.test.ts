import {afterEach,describe,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
const auth=vi.hoisted(()=>({getUser:vi.fn()}));
vi.mock("@supabase/ssr",()=>({createServerClient:()=>({auth})}));
import {updateSession} from "@/lib/supabase/middleware";
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
describe("Central authentication boundary",()=>{
 it("fails closed when authentication configuration is missing",async()=>{
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","");vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY","");
  expect((await updateSession(new NextRequest("https://erp.test/api/clients"))).status).toBe(503);
 });
 it.each(["/api/clients","/api/health","/api/health-other"])("returns 401 JSON for private API %s",async path=>{
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://supabase.test");vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY","public-key");
  auth.getUser.mockResolvedValue({data:{user:null}});
  const response=await updateSession(new NextRequest("https://erp.test"+path));
  expect(response.status).toBe(401);expect(response.headers.get("location")).toBeNull();
 });
 it("retains public access to token-based briefings",async()=>{
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://supabase.test");vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY","public-key");
  auth.getUser.mockResolvedValue({data:{user:null}});
  const response=await updateSession(new NextRequest("https://erp.test/api/briefing/token"));
  expect(response.status).toBe(200);expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
 });
});
