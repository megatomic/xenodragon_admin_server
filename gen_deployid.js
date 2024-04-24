const fs = require('fs');
const dayjs = require('dayjs');

const today = dayjs();
const todayYear = today.get('year');
const todayMonth = today.get('month')+1;
const todayDate = today.get('date');

let template={year:todayYear,month:todayMonth,date:todayDate,postFix1:1,postFix2:1};

const makeDeployID = (tt) => {
	const table1 = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];

	//console.log('tt=',tt);

	const yearStr = tt.year.toString().substr(2,2);
	
	let monthStr = tt.month.toString();
	if(todayMonth < 10) {
		monthStr = "0"+monthStr;
	}
	
	let dateStr = tt.date.toString();
	if(todayDate < 10) {
		dateStr = "0"+dateStr;
	}

	return `${yearStr}${monthStr}${dateStr}${table1[tt.postFix1-1]}${table1[tt.postFix2-1]}`;
};

fs.readFile("./count.txt","utf8",(err,data) => {
	if(!err) {
		const oldData = JSON.parse(data);
		if(oldData.year === todayYear && oldData.month === todayMonth && oldData.date === todayDate) {
			if(oldData.postFix2 < 26) {
				oldData.postFix2++;
			} else {
				oldData.postFix1++;
				oldData.postFix2=1;
			}
			template = oldData;
		}
	}
	fs.writeFileSync("./count.txt",JSON.stringify(template));
	console.log(makeDeployID(template));
});
