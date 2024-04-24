const arr1:number[] = [2,5,7,2,5];
const arr2:number[] = [...arr1];

for(let i in arr2) {
    console.log(arr2[i]);
}


for(let v of arr2) {
    console.log(v);
}