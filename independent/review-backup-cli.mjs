import {backupReviews} from './src/review-backup.mjs';
const directory=process.env.REVIEW_BACKUP_DIRECTORY;
if(!directory)throw Error('REVIEW_BACKUP_DIRECTORY is required');
const result=await backupReviews({base:process.env.SUPABASE_URL,key:process.env.SUPABASE_PUBLISHABLE_KEY,directory});
console.log(JSON.stringify({count:result.count,sha256:result.sha256,createdAt:result.createdAt}));
