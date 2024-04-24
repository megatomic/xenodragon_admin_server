const fs = require('fs');
const path = require('path');

const getCsvData = (filename) => {

    const csvPath = path.join(__dirname, '.', filename + '.csv');
    const csv = fs.readFileSync(csvPath, "utf-8");
    var allRows = csv.split(/\n|\r/);
    const tokenTable=[];
    let tokenID;
    let count = 0;
    for(var singleRow = 0; singleRow < allRows.length; singleRow++) {
        tokenID = allRows[singleRow].replaceAll('"','').replaceAll(' ','').replaceAll(',','');
        if(tokenID.trim().length > 0) {
            tokenTable.push(tokenID);
        }
    }
    
    return tokenTable;
}

const getCsvData2 = (filename) => {

    const csvPath = path.join(__dirname, '.', filename + '.csv');
    const csv = fs.readFileSync(csvPath, "utf-8");
    var allRows = csv.split(/\n|\r/);
    let rowStr;
    let count = 0;
    let found = false;
    let cellRows;
    const table1 = [];
    const addressTable = [];
    for(var singleRow = 0; singleRow < allRows.length; singleRow++) {
        if(allRows[singleRow].trim().length > 0) {
            cellRows = allRows[singleRow].split(',');
            found = false;
            for(let address of addressTable) {
                if(address === cellRows[43].trim()) {
                    found = true;
                    break;
                }
            }

            if(found === false) {
                addressTable.push(cellRows[43].trim());
            }

            rowStr = allRows[singleRow]+',[{"ItemType":1."ItemId":0."Quantity":1000}]';
            table1.push(rowStr);
        }
    }
    
    for(let address of addressTable) {
        console.log(address);
    }
    
    return table1;
}

const getCsvData3 = (filename) => {

    const csvPath = path.join(__dirname, '.', filename + '.csv');
    const csv = fs.readFileSync(csvPath, "utf-8");
    var allRows = csv.split(/\n|\r/);
    let rowStr;
    let count = 0;
    let found = false;
    let cellRows;
    const table1 = [];
    let tokenIDStr = "";
    for(var singleRow = 0; singleRow < allRows.length; singleRow++) {
        if(allRows[singleRow].trim().length > 0) {
            cellRows = allRows[singleRow].split(',');
            tokenIDStr += cellRows[0]+",";
        }
    }
    
    console.log(tokenIDStr);
    
    return table1;
}

const putCsvData = (table,filename) => {

    const csvPath = path.join(__dirname, '.', filename + '.csv');
    let rowStr = "";
    for(let row of table) {
        rowStr += row + "\n";
    }
    fs.writeFileSync(csvPath,rowStr);
}

const putCsvData2 = (table,filename) => {

    const csvPath = path.join(__dirname, '.', filename + '.csv');
    let tokenIDStr = "";
    for(let tokenID of table) {
        tokenIDStr += tokenID + "\n";
    }
    fs.writeFileSync(csvPath,tokenIDStr);
}

const inboxRewardInfo = {
    msgLocaleInfo:[
        {
            tag:'package',
            langInfo:[
                {
                    code:10,
                    title:"",
                    content:""
                },
                {
                    code:23,
                    title:"패키지 구매에 대한 보상을 드립니다",
                    content:""
                }
            ]
        },
        {
            tag:'dragon',
            langInfo:[
                {
                    code:10,
                    title:"",
                    content:""
                },
                {
                    code:23,
                    title:"드래곤 구매에 대한 보상을 드립니다.",
                    content:""
                }
            ]
        },
        {
            tag:'gear',
            langInfo:[
                {
                    code:10,
                    title:"",
                    content:""
                },
                {
                    code:23,
                    title:"기어 구매에 대한 보상을 드립니다.",
                    content:""
                }
            ]
        }
    ],
    rewardInfo:[

    ]
};

const generateTable = (rewardInfo, rewardTemplate) => {
    const sendTable = [];
    let count = 1;
    for(let info of rewardInfo) {
        for(let i=0;i<info.dragon;i++) {
            sendTable.push({count:count++,address:info.address,itemType:'dragon',rewardInfo:rewardTemplate.dragon});
        }
        for(let i=0;i<info.gear;i++) {
            sendTable.push({count:count++,address:info.address,itemType:'gear',rewardInfo:rewardTemplate.gear});
        }
        for(let i=0;i<info.package;i++) {
            sendTable.push({count:count++,address:info.address,itemType:'package',rewardInfo:rewardTemplate.package});
        }
    }

    let count2 = 0;
    for(let info of sendTable) {
        console.log(`${info.count},${info.address},${info.itemType},${JSON.stringify(info.rewardInfo).replaceAll(',','.')}`);

        // let userID;
        // if(count2 < 10) {
        //     userID = 'd855fe5b-aaa6-42ba-a6d8-9ccd6132756d';
        // } else if(count2 < 20) {
        //     userID = 'b15c65d6-0a68-4ee7-9fa3-df1c3d855a1e';
        // } else if(count2 < 30) {
        //     userID = '8bd617a6-d5f0-4765-9a64-1707a5f8f7e7';
        // } else if(count2 < 40) {
        //     userID = 'aabbad39-af80-4b89-837c-73f84ba73240';
        // } else {
        //     userID = '77c35eea-2ad3-4610-9155-ed710392053c';
        // }

        // console.log(`${info.count},${userID},${info.itemType},${JSON.stringify(info.rewardInfo).replaceAll(',','.')}`);     
        
        count2++;
    }
};

const tokenTable = getCsvData2(process.argv[2]);

//console.log("tokenTable=",JSON.stringify(tokenTable,null,2));

//putCsvData2(tokenTable,process.argv[2]+"a");
//console.log('inboxRewardInfo=',JSON.stringify(inboxRewardInfo,null,2));

// for(let info of rewardTable.list) {
//     if(info.package > 0) {
//         console.log(info);
//     }
// }