import { isAdmin } from '../../../lib/admin-auth';
import { getChatGPTUser,chatGPTSignInPath } from '../../chatgpt-auth';
import ReviewAdmin from './panel';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getChatGPTUser();if(!user)return <main style={{padding:32}}><h1>운영자 로그인</h1><a href={chatGPTSignInPath('/admin/reviews')} target="_top">로그인하기</a></main>;if(!await isAdmin())return <main style={{padding:32}}><h1>접근 권한이 없습니다.</h1></main>;return <ReviewAdmin/>}
