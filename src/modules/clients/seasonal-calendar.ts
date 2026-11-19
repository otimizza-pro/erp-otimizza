export interface SeasonalDate {date:string;name:string;category:"commercial"|"holiday"|"cultural";}
/** Editorial references, not a declaration of state or municipal public holidays. */
export function seasonalDates(year:number):SeasonalDate[]{
 const result:SeasonalDate[]=[];
 const add=(month:number,day:number,name:string,category:SeasonalDate["category"])=>result.push({date:`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`,name,category});
 const fixed:[number,number,string,SeasonalDate["category"]][]=[
 [1,1,"Ano Novo","holiday"],[1,6,"Dia de Reis","cultural"],[1,30,"Dia da Saudade","cultural"],
 [2,1,"Volta às aulas (período variável)","commercial"],[2,14,"Dia da Amizade / Valentine's Day","commercial"],
 [3,8,"Dia Internacional da Mulher","cultural"],[3,15,"Dia do Consumidor","commercial"],[3,22,"Dia Mundial da Água","cultural"],
 [4,2,"Conscientização sobre o Autismo","cultural"],[4,7,"Dia Mundial da Saúde","cultural"],[4,21,"Tiradentes","holiday"],[4,22,"Dia da Terra","cultural"],[4,23,"Dia Mundial do Livro","cultural"],[4,28,"Segurança e Saúde no Trabalho","cultural"],
 [5,1,"Dia do Trabalho","holiday"],[5,12,"Dia da Enfermagem","cultural"],[5,25,"Dia da Indústria","cultural"],
 [6,5,"Dia Mundial do Meio Ambiente","cultural"],[6,12,"Dia dos Namorados","commercial"],[6,24,"São João / Festas juninas","commercial"],
 [7,10,"Dia da Pizza","commercial"],[7,13,"Dia Mundial do Rock","cultural"],[7,20,"Dia do Amigo","commercial"],[7,26,"Dia dos Avós","commercial"],
 [8,11,"Dia do Estudante","commercial"],[8,27,"Dia do Psicólogo","cultural"],[8,31,"Dia do Nutricionista","cultural"],
 [9,7,"Independência do Brasil","holiday"],[9,9,"Dia do Veterinário","cultural"],[9,15,"Dia do Cliente","commercial"],[9,21,"Dia da Árvore","cultural"],[9,27,"Dia Mundial do Turismo","commercial"],[9,30,"Dia da Secretária","commercial"],
 [10,4,"Dia dos Animais","cultural"],[10,12,"Dia das Crianças","commercial"],[10,12,"Nossa Senhora Aparecida","holiday"],[10,15,"Dia do Professor","commercial"],[10,18,"Dia do Médico","cultural"],[10,25,"Dia do Dentista","cultural"],[10,31,"Halloween","commercial"],
 [11,2,"Finados","holiday"],[11,5,"Dia do Designer","cultural"],[11,11,"Dia dos Solteiros / 11.11","commercial"],[11,12,"Dia do Supermercado","commercial"],[11,14,"Dia Mundial do Diabetes","cultural"],[11,15,"Proclamação da República","holiday"],[11,19,"Dia do Empreendedorismo Feminino","cultural"],[11,20,"Consciência Negra","holiday"],[11,25,"Dia Nacional do Doador de Sangue","cultural"],
 [12,1,"Dia Mundial de Combate à Aids","cultural"],[12,3,"Dia da Pessoa com Deficiência","cultural"],[12,24,"Véspera de Natal","commercial"],[12,25,"Natal","holiday"],[12,31,"Réveillon","commercial"]];
 fixed.forEach(v=>add(...v));
 const nthSunday=(month:number,n:number)=>1+((7-new Date(year,month-1,1).getDay())%7)+(n-1)*7;
 add(5,nthSunday(5,2),"Dia das Mães","commercial");add(8,nthSunday(8,2),"Dia dos Pais","commercial");
 // Black Friday: Friday immediately following the fourth Thursday of November.
 const thanksgiving=1+(4-new Date(year,10,1).getDay()+7)%7+21;
 const relative=(date:Date,days:number,name:string,category:SeasonalDate["category"])=>{const d=new Date(date);d.setDate(d.getDate()+days);add(d.getMonth()+1,d.getDate(),name,category);};
 relative(new Date(year,10,thanksgiving),1,"Black Friday","commercial");relative(new Date(year,10,thanksgiving),4,"Cyber Monday","commercial");
 // Gregorian Easter (Meeus/Jones/Butcher).
 const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),n=h+l-7*m+114;
 const easter=new Date(year,Math.floor(n/31)-1,n%31+1);
 relative(easter,0,"Páscoa","commercial");relative(easter,-47,"Carnaval (verificar calendário local)","cultural");relative(easter,-2,"Sexta-feira da Paixão (verificar calendário local)","cultural");relative(easter,60,"Corpus Christi (verificar calendário local)","cultural");
 return result.sort((a,b)=>a.date.localeCompare(b.date));
}
export const seasonalMonthNotes:Record<number,string>={1:"Verão • férias • Janeiro Branco",2:"Verão • volta às aulas",3:"Verão / outono • mês do consumidor • Março Lilás",4:"Outono • Páscoa conforme o ano",5:"Outono • Dia das Mães • Maio Amarelo",6:"Outono / inverno • festas juninas • Dia dos Namorados",7:"Inverno • férias escolares • Julho Amarelo",8:"Inverno • Dia dos Pais • Agosto Dourado",9:"Inverno / primavera • Semana do Cliente • Setembro Amarelo",10:"Primavera • Dia das Crianças • Outubro Rosa",11:"Primavera • Black Friday • Novembro Azul",12:"Primavera / verão • Natal • Réveillon • Dezembro Vermelho"};
