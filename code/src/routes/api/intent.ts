import { createFileRoute } from "@tanstack/react-router";
import { compileProposal, proposalSchema } from "../../lib/three-layer";

const SYSTEM = `你是选股产品的意图理解器，不是股票分析师。用户会说“我觉得公司稳定，未来有前景”等普通语言，绝不要求用户知道财务指标。把每个投资意图拆解为候选量化口径，生成可检查、可修改的规则草案。仅输出JSON，字段为 intents:[{phrase,meaning,uncertainty?}], rules:[{metric,op,value,value2?,origin,rationale,isHardConstraint}], clarifications:[string]。可用字段仅 revenue_growth,net_profit_growth,roe,gross_margin,pe,pb,debt_ratio,volatility_60d,max_drawdown_1y；运算符仅 >=,>,<=,<,between。阈值属于AI建议而不是用户的硬约束；解释代理指标的局限。不能编造金融数据、股票或选股结果；有歧义时提问。`;
export const Route = createFileRoute("/api/intent")({
 server:{handlers:{POST:async({request})=>{
  const origin=request.headers.get("origin");
  if(origin&&new URL(origin).origin!==new URL(request.url).origin)return Response.json({error:"cross_origin_denied"},{status:403});
  let input:unknown;
  try{input=await request.json()}catch{return Response.json({error:"invalid_json"},{status:400})}
  const query=(input as {query?:unknown})?.query;
  if(typeof query!=="string"||query.trim().length<3||query.length>500)return Response.json({error:"invalid_query"},{status:400});
  const key=process.env.OPENAI_API_KEY;
  if(!key)return Response.json({error:"llm_not_configured",message:"未配置服务端 LLM，不能将关键词规则冒充 AI 理解"},{status:503});
  const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),18000);
  try{
   const response=await fetch("https://api.openai.com/v1/chat/completions",{
    method:"POST",signal:ctrl.signal,headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},
    body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-4o-mini",temperature:0,response_format:{type:"json_object"},messages:[{role:"system",content:SYSTEM},{role:"user",content:query}]}),
   });
   if(!response.ok)throw new Error("llm_http_"+response.status);
   const body=await response.json();
   const raw=body?.choices?.[0]?.message?.content;
   if(typeof raw!=="string")throw new Error("empty_llm_output");
   const proposal=proposalSchema.parse(JSON.parse(raw));
   const compiled=compileProposal(proposal);
   return Response.json({mode:"llm_proposal",proposal,compiled,requiresConfirmation:true},{headers:{"Cache-Control":"no-store"}});
  }catch{return Response.json({error:"llm_failed",message:"LLM 输出不可用或未通过规则校验，未生成虚构结果"},{status:502})}
  finally{clearTimeout(timeout)}
 }}}
});
