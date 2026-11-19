import {describe,it,expect} from "vitest";
import {readJsonResponse} from "../../src/lib/http/read-json-response";

describe("API response handling",()=>{
  it("preserves the server error so callers can report the actual failure",async()=>{
    const data=await readJsonResponse(new Response(JSON.stringify({success:false,error:"Saldo insuficiente"}),{status:503}));
    expect(data).toEqual({success:false,error:"Saldo insuficiente"});
  });
  it("reports an empty response without pretending the request succeeded",async()=>{
    await expect(readJsonResponse(new Response("",{status:502}))).rejects.toThrow("resposta vazia (HTTP 502)");
  });
  it("handles platform HTML without exposing it to the user",async()=>{
    await expect(readJsonResponse(new Response("<html>proxy failure</html>",{status:502}))).rejects.toThrow("resposta inválida (HTTP 502)");
  });
  it("explains a platform timeout and advises checking saved materials",async()=>{
    await expect(readJsonResponse(new Response("",{status:504}))).rejects.toThrow("Atualize os materiais salvos");
  });
  it("asks the user to log in when the session expired",async()=>{
    await expect(readJsonResponse(new Response("",{status:401}))).rejects.toThrow("Sua sessão expirou");
  });
  it("rejects null or primitive JSON responses",async()=>{
    await expect(readJsonResponse(new Response("null"))).rejects.toThrow("formato inesperado");
  });
});
