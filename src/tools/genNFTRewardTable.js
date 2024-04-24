const fs = require('fs');
const path = require('path');

const rewardTemplate = {
    package:[
        {
            ItemType:3,
            ItemId:0,
            Quantity:200000
        },
        {
            ItemType:4,
            ItemId:0,
            Quantity:10000
        },
        {
            ItemType:103,
            ItemId:0,
            Quantity:2500
        },
        {
            ItemType:23,
            ItemId:2000,
            Quantity:10
        },
        {
            ItemType:23,
            ItemId:2024,
            Quantity:10
        },
        {
            ItemType:23,
            ItemId:2048,
            Quantity:10
        }
    ],
    dragon:[
        {
            ItemType:4,
            ItemId:0,
            Quantity:1000
        },
        {
            ItemType:103,
            ItemId:0,
            Quantity:500
        },
        {
            ItemType:23,
            ItemId:2000,
            Quantity:1
        },
        {
            ItemType:23,
            ItemId:2024,
            Quantity:1
        },
        {
            ItemType:23,
            ItemId:2048,
            Quantity:1
        }
    ],
    gear:[
        {
            ItemType:4,
            ItemId:0,
            Quantity:300
        },
        {
            ItemType:103,
            ItemId:0,
            Quantity:250
        }
    ]
};

const getCsvData = (filename) => {

    const csvPath = path.join(__dirname, '.', filename + '.csv');
    const csv = fs.readFileSync(csvPath, "utf-8");
    var allRows = csv.split(/\n|\r/);
    const rewardTable=[];
    let count = 0;
    for(var singleRow = 0; singleRow < allRows.length; singleRow++) {
        var rowCells = allRows[singleRow].split(',');

        if(rowCells.length < 5 || rowCells[4].trim() === "") {
            continue;
        }

        let found = false;
        let info = null;
        for(var rewardInfo of rewardTable) {
            if(rewardInfo.address === rowCells[4]) {
                found = true;
                info = rewardInfo;
                break;
            }            
        }

        if(rowCells[3].trim() !== '') {
            const packageNo = parseInt(rowCells[3].trim());
            //console.log('packageNo=',packageNo);
            console.log("1-1");
            if(found === true) {
                console.log("1-2");
                if(info.pNo1 === packageNo) {
                    info.pNo2++;
                } else if(info.pNo1 === 0) {
                    info.pNo1 = packageNo;
                    info.pNo2 = 1;
                }
                if(info.pNo2 >= 5) {
                    info.package++;
                    info.pNo1 = 0;
                    info.pNo2 = 0;
                }
            } else {
                console.log("1-3");
                rewardTable.push({no:(++count),address:rowCells[4],dragon:0,gear:0,package:0,pNo1:packageNo,pNo2:1});
            }
        } else {
            console.log("2-1");
            if(found === true) {
                console.log("2-2")
                if(rowCells[2].toUpperCase() === 'DRAGON') {
                    info.dragon++;
                } else if(rowCells[2].toUpperCase() === 'GEAR') {
                    info.gear++;
                }
            } else {
                console.log("2-3");
                if(rowCells[2].toUpperCase() === 'DRAGON') {
                    rewardTable.push({no:(++count),address:rowCells[4],dragon:1,gear:0,package:0,pNo1:0,pNo2:0});
                } else if(rowCells[2].toUpperCase() === 'GEAR') {
                    rewardTable.push({no:(++count),address:rowCells[4],dragon:0,gear:1,package:0,pNo1:0,pNo2:0});
                }
            }
        }
    }
    
    return rewardTable;
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

inboxRewardInfo.rewardInfo = getCsvData(process.argv[2]);

console.log("inboxRewardInfo.rewardInfo=",JSON.stringify(inboxRewardInfo.rewardInfo,null,2));
generateTable(inboxRewardInfo.rewardInfo,rewardTemplate);

//console.log('inboxRewardInfo=',JSON.stringify(inboxRewardInfo,null,2));

// for(let info of rewardTable.list) {
//     if(info.package > 0) {
//         console.log(info);
//     }
// }