import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const files={landing:'../public/landing.html',reviews:'../public/reviews.html',progress:'../public/consultation-progress.mjs',admin:'./admin.html',favicon:'../public/favicon.svg'};
const content=Object.entries(files).map(([name,path])=>'export const '+name+'='+JSON.stringify(readFileSync(new URL(path,import.meta.url),'utf8'))+';').join('\n')+'\n';
mkdirSync(new URL('./dist/',import.meta.url),{recursive:true});
writeFileSync(new URL('./dist/assets.mjs',import.meta.url),content);
console.log('Static assets prepared.');
