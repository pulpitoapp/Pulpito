const fs=require('fs');const {B,CH}=require('./lib.js');
const dir='/home/user/pulpito-main/public/dados/planos/';let ok=true;
function err(m){ok=false;console.log('  ERRO',m);}
function checkPlan(f,books,nDias){
  if(!fs.existsSync(dir+f)){err(f+' ausente');return;}
  const p=JSON.parse(fs.readFileSync(dir+f,'utf8'));console.log(f,'nome:',p.nome);
  if(p.dias.length!==nDias)err('dias='+p.dias.length);
  const seen={};let tot=0,max=0,min=99;
  p.dias.forEach(([chs,t],i)=>{if(!t||typeof t!=='string')err('titulo dia '+(i+1));if(!chs.length)err('dia vazio '+(i+1));
    max=Math.max(max,chs.length);min=Math.min(min,chs.length);
    for(const s of chs){if(!/^\d+\.\d+$/.test(s))err('formato '+s);const [b,c]=s.split('.').map(Number);
      if(!books.includes(b)||c<1||c>CH[b])err('cap invalido '+s);seen[s]=(seen[s]||0)+1;tot++;}});
  const exp=[];for(const b of books)for(let c=1;c<=CH[b];c++)exp.push(b+'.'+c);
  const miss=exp.filter(s=>!seen[s]),dup=Object.keys(seen).filter(s=>seen[s]>1);
  if(miss.length)err('faltando '+miss.map(s=>B[+s.split('.')[0]][0]+' '+s.split('.')[1]).join(', '));
  if(dup.length)err('duplicados '+dup.map(s=>B[+s.split('.')[0]][0]+' '+s.split('.')[1]).join(', '));
  console.log('  dias',p.dias.length,'capitulos',tot,'esperado',exp.length,'min/max por dia',min,max,'media',(tot/p.dias.length).toFixed(2));
}
const all=[...Array(66).keys()],ot=[...Array(39).keys()];
checkPlan('cronologico.json',all,365);
checkPlan('antigo-cronologico.json',ot,365);
// harmonia
const h=JSON.parse(fs.readFileSync(dir+'evangelhos.json','utf8'));console.log('evangelhos.json nome:',h.nome,'secoes',h.secoes.length);
const cov={};let np=0,multi=0;
h.secoes.forEach((s,i)=>{if(!s.titulo)err('titulo secao '+i);if(!s.passagens.length)err('secao vazia '+i);
  if(new Set(s.passagens.map(p=>p[0])).size>1)multi++;
  for(const p of s.passagens){np++;const [b,c,a,z]=p;if(p.length!==4||![39,40,41,42].includes(b)){err('passagem '+p);continue;}
    const n=B[b][2][c-1]?B[b][2][c-1].length:0;if(c<1||!n||a<1||z<a||z>n){err('versiculo inexistente '+B[b][0]+' '+c+':'+a+'-'+z+' (cap tem '+n+') na secao '+s.titulo);continue;}
    for(let v=a;v<=z;v++){const k=b+'.'+c+'.'+v;cov[k]=(cov[k]||0)+1;}}});
let miss=[],dupl=0,totv=0;
for(const b of [39,40,41,42])B[b][2].forEach((vs,ci)=>vs.forEach((_,vi)=>{totv++;const k=b+'.'+(ci+1)+'.'+(vi+1);if(!cov[k])miss.push(B[b][0]+' '+(ci+1)+':'+(vi+1));else if(cov[k]>1)dupl++;}));
if(miss.length)err('versiculos sem cobertura: '+miss.join(', '));
console.log('  passagens',np,'secoes com paralelos',multi,'versiculos',totv,'cobertos',totv-miss.length,'repetidos',dupl);
console.log(ok?'VALIDACAO OK':'VALIDACAO FALHOU');
