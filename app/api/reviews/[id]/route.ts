import { getDb } from '../../../../db';
import { reviews } from '../../../../db/schema';
import { isAdmin,sameOrigin } from '../../../../lib/admin-auth';
import { eq } from 'drizzle-orm';
import { isDeletableReviewId } from '../../../../lib/review-import';
export const dynamic='force-dynamic';
export async function DELETE(request:Request,context:{params:Promise<{id:string}>}){
  const headers={'Cache-Control':'no-store'};
  if(!await isAdmin()||!sameOrigin(request))return Response.json({error:'접근 권한이 없습니다.'},{status:403,headers});
  const {id}=await context.params;if(!isDeletableReviewId(id))return Response.json({error:'잘못된 요청입니다.'},{status:400,headers});
  try{await getDb().delete(reviews).where(eq(reviews.id,id));return Response.json({ok:true},{headers})}catch{return Response.json({error:'삭제에 실패했습니다.'},{status:503,headers})}
}
