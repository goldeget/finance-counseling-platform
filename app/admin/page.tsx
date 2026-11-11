import { isAdmin } from '../../lib/admin-auth';
import { getChatGPTUser, chatGPTSignInPath } from '../chatgpt-auth';
import AdminPanel from './panel';
export const dynamic='force-dynamic';
export default async function AdminPage() {
  const user=await getChatGPTUser();
  if(!user) return <main style={{fontFamily:'sans-serif',padding:32}}><h1>운영자 로그인</h1><p>운영자 계정으로 로그인해 주세요.</p><a href={chatGPTSignInPath('/admin')} target="_top">로그인하기</a></main>;
  if(!await isAdmin()) return <main style={{fontFamily:'sans-serif',padding:32}}><h1>접근 권한이 없습니다.</h1><p>운영자 계정으로 로그인해 주세요.</p></main>;
  return <AdminPanel/>;
}
