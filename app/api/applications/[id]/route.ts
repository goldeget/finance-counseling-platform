import { getDb } from '../../../../db';
import { applications } from '../../../../db/schema';
import { isAdmin,sameOrigin } from '../../../../lib/admin-auth';
import { eq } from 'drizzle-orm';
export const dynamic='force-dynamic';
export async function DELETE(request:Request,context:{params:Promise<{id:string}>}) {
  if(!await isAdmin()||!sameOrigin(request))return Response.json({error:'접근 권한이 없습니다.'},{status:403,headers:{'Cache-Control':'no-store'}});
  const {id}=await context.params;
  if(!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:'잘못된 요청입니다.'},{status:400,headers:{'Cache-Control':'no-store'}});
  try{await getDb().delete(applications).where(eq(applications.id,id));return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'삭제에 실패했습니다.'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
