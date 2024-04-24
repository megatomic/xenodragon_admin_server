let table1=['1111111','2222222','3333333','4444444','5555555','6666666','7777777','8888888','9999999','0000000'];
let randIndex;


while(table1.length>0) {
   randIndex = Math.floor(Math.random()*table1.length); 
   console.log('randIndex=',randIndex,',item=',table1[randIndex]);
   table1.splice(randIndex,1);
   console.log('table=',table1);
}
