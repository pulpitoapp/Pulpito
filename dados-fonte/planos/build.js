const fs=require('fs');const {parseDays,parseHarm}=require('./lib.js');
const out='/home/user/pulpito-main/public/dados/planos/';fs.mkdirSync(out,{recursive:true});
const at=parseDays('crono-at.txt'),nt=parseDays('crono-nt.txt'),atSo=parseDays('at-so.txt');
const lines=(head,key,arr)=>'{'+JSON.stringify(head).slice(1,-1)+',"'+key+'":[\n'+arr.map(x=>JSON.stringify(x)).join(',\n')+'\n]}\n';
fs.writeFileSync(out+'cronologico.json',lines({nome:'Bíblia em ordem cronológica'},'dias',[...at,...nt]));
fs.writeFileSync(out+'antigo-cronologico.json',lines({nome:'Antigo Testamento em ordem cronológica'},'dias',atSo));
fs.writeFileSync(out+'evangelhos.json',lines({nome:'Os Evangelhos em harmonia'},'secoes',parseHarm('harmonia.txt')));
