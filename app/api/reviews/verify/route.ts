import {env} from 'cloudflare:workers';
import {isAdmin} from '../../../../lib/admin-auth';
import {targetPhrase} from '../../../../lib/review-cleanup';
import {repeatedPassage} from '../../../../lib/review-long-cleanup';
import {verificationSql} from '../../../../lib/review-verification';
import {resultPhrase,specifiedPassage} from '../../../../lib/review-result-cleanup';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
export async function GET(){
  if(!await isAdmin())return Response.json({error:'접근 권한이 없습니다.'},{status:403,headers});
  try{const result=await env.DB.prepare(verificationSql).bind(targetPhrase,repeatedPassage,resultPhrase,specifiedPassage).first();return Response.json(result,{headers});}
  catch{return Response.json({error:'후기 전체 검증에 실패했습니다.'},{status:503,headers});}
}
