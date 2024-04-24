import SQLDataManager from 'src/common/db/SQLDataManager';
import { ResultCode, ResultInfo, getResultForm, ReqValidationErrorMsg } from 'src/common/ResponseManager';
import * as activityType from 'src/services/common/AdminActivityType';
import * as sdo from './StatisticsDataObject';
import * as Utils from 'src/common/Utils';
import dayjs, { ManipulateType } from 'dayjs';
import utc from 'dayjs/plugin/utc';

const generateTimeIntervalTable = (timeOrigin:string, timeIntervalType:number, baseDirection:boolean, displayNum:number, offsetValue:number) => {

    const timeIntervalTable = [];
    const timeIntervalStringTable:ManipulateType[]|undefined[]=['day','week','month'];
    let baseTime2 = dayjs(timeOrigin);
    if(offsetValue > 0) {
        baseTime2 = baseTime2.add(offsetValue,timeIntervalStringTable[timeIntervalType]);
    } else if(offsetValue < 0) {
        baseTime2 = baseTime2.subtract(Math.abs(offsetValue),timeIntervalStringTable[timeIntervalType]);
    }

    let baseTime = null;
    if(timeIntervalType === 0) { // 일단위
        baseTime = baseTime2.set("hour",0).set("minute",0).set("second",0);
        for(let i=0;i<displayNum;i++) {
            if(baseDirection === true) {
                if(i === 0) {
                    timeIntervalTable.push({startTime:baseTime2.format("YYYY-MM-DD HH:mm:ss"),endTime:baseTime.add(1,"day").subtract(1,"millisecond").format("YYYY-MM-DD HH:mm:ss")});
                } else {
                    timeIntervalTable.push({startTime:baseTime.add(i,"day").format("YYYY-MM-DD HH:mm:ss"),endTime:baseTime.add(i+1,"day").subtract(1,"millisecond").format("YYYY-MM-DD HH:mm:ss")});
                }
                
            } else {
                if(i === 0) {
                    timeIntervalTable.push({endTime:baseTime2.format("YYYY-MM-DD HH:mm:ss"),startTime:baseTime.format("YYYY-MM-DD HH:mm:ss")});
                } else {
                    timeIntervalTable.push({endTime:baseTime.subtract(i-1,"day").subtract(1,"millisecond").format("YYYY-MM-DD HH:mm:ss"),startTime:baseTime.subtract(i,"day").format("YYYY-MM-DD HH:mm:ss")});
                }
            }
        }

    } else if(timeIntervalType === 1) { // 주단위
        baseTime = baseTime2.set("hour",0).set("minute",0).set("second",0).add(1,"day");
        for(let i=0;i<displayNum;i++) {
            if(baseDirection === true) { 
                if(i === 0) {
                    timeIntervalTable.push({startTime:baseTime2.format("YYYY-MM-DD HH:mm:ss"),endTime:baseTime.add(1,"week").subtract(1,"millisecond").format("YYYY-MM-DD HH:mm:ss")});
                } else {
                    timeIntervalTable.push({startTime:baseTime.add(i,"week").format("YYYY-MM-DD HH:mm:ss"),endTime:baseTime.add(i+1,"week").subtract(1,"millisecond").format("YYYY-MM-DD HH:mm:ss")});
                }
            } else {
                if(i === 0) {
                    timeIntervalTable.push({endTime:baseTime2.format("YYYY-MM-DD HH:mm:ss"),startTime:baseTime.subtract(1,"week").format("YYYY-MM-DD HH:mm:ss")});
                } else {
                    timeIntervalTable.push({endTime:baseTime.subtract(i,"week").subtract(1,"millisecond").format("YYYY-MM-DD HH:mm:ss"),startTime:baseTime.subtract(i+1,"week").format("YYYY-MM-DD HH:mm:ss")});
                }
            }
        }

    } else { // 월단위
        baseTime = baseTime2.set("hour",0).set("minute",0).set("second",0).set("date",1);
        for(let i=0;i<displayNum;i++) {
            if(baseDirection === true) {
                if(i === 0) {
                    timeIntervalTable.push({startTime:baseTime2.format("YYYY-MM-DD HH:mm:ss"),endTime:baseTime.add(1,"month").subtract(1,"millisecond").format("YYYY-MM-DD HH:mm:ss")});
                } else {
                    timeIntervalTable.push({startTime:baseTime.add(i,"month").format("YYYY-MM-DD HH:mm:ss"),endTime:baseTime.add(i+1,"month").subtract(1,"millisecond").format("YYYY-MM-DD HH:mm:ss")});
                }
            } else {
                if(i === 0) {
                    timeIntervalTable.push({endTime:baseTime2.format("YYYY-MM-DD HH:mm:ss"),startTime:baseTime.format("YYYY-MM-DD HH:mm:ss")});
                } else {
                    timeIntervalTable.push({endTime:baseTime.subtract(i-1,"month").subtract(1,"millisecond").format("YYYY-MM-DD HH:mm:ss"),startTime:baseTime.subtract(i,"month").format("YYYY-MM-DD HH:mm:ss")});
                }
            }
        }
    }

    return timeIntervalTable;
};

// 게임서버 사용자 DB테이블 조회 처리
export const queryDBUserStatisticsTable = async (sqlDataManager: SQLDataManager, reqInfo:sdo.ReqUserStatisticsInfo): Promise<any> => {

    const timeIntervalTable = generateTimeIntervalTable(reqInfo.baseTime,reqInfo.timeIntervalType,reqInfo.baseDirection,reqInfo.displayNum,reqInfo.offsetValue);
    console.log('timeIntervalTable=',timeIntervalTable);

    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements = "";
    
    // 신규/누적 가입수 테이블 조회
    for(let timeIntervalInfo of timeIntervalTable) {
        sqlStatements += `select *, (select SUM(COUNT) FROM bi_system.bi_register_user_count as b where b.RegisteredAt <= a.RegisteredAt) as AccCount FROM bi_system.bi_register_user_count AS a where RegisteredAt between '${timeIntervalInfo.startTime}' and '${timeIntervalInfo.endTime}' order by RegisteredAt desc;`;
    }
    //let sqlStatements2 = `show columns from ${dbName}.${tableName}`; // 컬럼명 조회하기

    //sqlStatements = `select * from xeno_blockchain.user_swap where OriginValue > 100.0;`;
    const resultInfo:ResultInfo = await sqlDataManager.querySQL(sqlStatements,null);
    //console.log('resultInfo=',resultInfo);

    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        resultInfo.resultCode = resultInfo.resultCode;
        resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()];
        return resultInfo;
    }

    const registerInfoTable = [];
    for(let groupInfo of resultInfo.data) {
        let totalCount = 0;
        for(let registerInfo of groupInfo) {
            totalCount +=registerInfo.Count;
        }
        registerInfoTable.push({count:totalCount,accCount:(groupInfo.length === 0?0:groupInfo[0].AccCount)});
    }

    //console.log('registerInfoTable=',registerInfoTable);

    // 게임플레이 수 테이블 조회

    sqlStatements = "";
    for(let timeIntervalInfo of timeIntervalTable) {
        sqlStatements += `select * from bi_system.bi_play_user_count where LogTime between '${timeIntervalInfo.startTime}' and '${timeIntervalInfo.endTime}';`;
    }

    const resultInfo2:ResultInfo = await sqlDataManager.querySQL(sqlStatements,null);

    if(resultInfo2.resultCode !== ResultCode.SUCCESS) {
        resultInfo.resultCode = resultInfo2.resultCode;
        resultInfo.message = ReqValidationErrorMsg[resultInfo2.resultCode.toString()];
        return resultInfo;
    }

    const playInfoTable = [];
    for(let groupInfo of resultInfo2.data) {
        let totalCount = 0;
        for(let playInfo of groupInfo) {
            totalCount +=playInfo.Count;
        }
        playInfoTable.push({count:totalCount});
    }

    // 전체 누적가입자수 조회
    sqlStatements = `select *, (select SUM(COUNT) FROM bi_system.bi_register_user_count as b where b.RegisteredAt <= a.RegisteredAt) as AccCount FROM bi_system.bi_register_user_count AS a order by RegisteredAt desc limit 1;`;
    const resultInfo3:ResultInfo = await sqlDataManager.querySQL(sqlStatements,null);

    if(resultInfo3.resultCode !== ResultCode.SUCCESS) {
        resultInfo.resultCode = resultInfo3.resultCode;
        resultInfo.message = ReqValidationErrorMsg[resultInfo3.resultCode.toString()];
        return resultInfo;
    }

    resultInfo.data = {timeIntervalTable,totalUserRegisterNum:resultInfo3.data[0].AccCount,registerInfoTable:registerInfoTable.reverse(),playInfoTable:playInfoTable.reverse()};

    console.log('resultInfo=',resultInfo.data);

    return resultInfo;
};

// 게임서버 재화 DB테이블 조회
export const queryDBCashStatisticsTable = async (sqlDataManager: SQLDataManager, reqInfo:sdo.ReqCashStatisticsInfo): Promise<any> => {

    const timeIntervalTable = generateTimeIntervalTable(reqInfo.baseTime,reqInfo.timeIntervalType,reqInfo.baseDirection,reqInfo.displayNum,reqInfo.offsetValue);
    console.log('timeIntervalTable=',timeIntervalTable);

    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements = "";
    let sqlStatement2 = "";

    // 골드 테이블 조회
    for(let timeIntervalInfo of timeIntervalTable) {
        sqlStatements += `select a.Gold_AddQuantity,a.Gold_AddCount,b.Gold_UseQuantity,b.Gold_UseCount,a.LogDate from bi_system.bi_gold_add_quantity_and_count as a join bi_system.bi_gold_use_quantity_and_count as b on a.LogDate=b.LogDate where a.LogDate between '${timeIntervalInfo.startTime}' and '${timeIntervalInfo.endTime}' order by a.LogDate desc;`;
    }

    let resultInfo:ResultInfo = await sqlDataManager.querySQL(sqlStatements,null);
    //console.log('resultInfo=',resultInfo);

    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        resultInfo.resultCode = resultInfo.resultCode;
        resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()];
        return resultInfo;
    }

    let groupInfoTable = resultInfo.data;

    sqlStatement2 = `select SUM(a.Gold_AddQuantity) as AddSum, SUM(b.Gold_UseQuantity) as UseSum from bi_system.bi_gold_add_quantity_and_count as a join bi_system.bi_gold_use_quantity_and_count as b on a.LogDate=b.LogDate;`;
    resultInfo = await sqlDataManager.querySQL(sqlStatement2,null);
    console.log('total gold add/use=',resultInfo.data);

    const totalGoldAddNum = resultInfo.data[0].AddSum;
    const totalGoldUseNum = resultInfo.data[0].UseSum;

    let goldInfoTable:object[] = [];
    for(let groupInfo of groupInfoTable) {
        let totalAddQuantityNum = 0;
        let totalAddCountNum = 0;
        let totalUseQuantityNum = 0;
        let totalUseCountNum = 0;
        for(let goldInfo of groupInfo) {
            totalAddQuantityNum += goldInfo.Gold_AddQuantity;
            totalAddCountNum +=goldInfo.Gold_AddCount;
            totalUseQuantityNum += goldInfo.Gold_UseQuantity;
            totalUseCountNum += goldInfo.Gold_UseCount;
        }
        goldInfoTable.push({addQuantity:totalAddQuantityNum,addCount:totalAddCountNum,useQuantity:totalUseQuantityNum,useCount:totalUseCountNum});
    }

    goldInfoTable = goldInfoTable.reverse();

    // 젬 테이블 조회
    sqlStatements = ``;
    for(let timeIntervalInfo of timeIntervalTable) {
        sqlStatements += `select a.GEM_AddQuantity,a.GEM_AddCount,b.GEM_UseQuantity,b.GEM_UseCount,a.LogDate from bi_system.bi_gem_add_quantity_and_count as a join bi_system.bi_gem_use_quantity_and_count as b on a.LogDate=b.LogDate where a.LogDate between '${timeIntervalInfo.startTime}' and '${timeIntervalInfo.endTime}' order by a.LogDate desc;`;
    }

    resultInfo = await sqlDataManager.querySQL(sqlStatements,null);
    //console.log('resultInfo=',resultInfo);

    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        resultInfo.resultCode = resultInfo.resultCode;
        resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()];
        return resultInfo;
    }

    groupInfoTable = resultInfo.data;

    sqlStatement2 = `select SUM(a.GEM_AddQuantity) as AddSum, SUM(b.GEM_UseQuantity) as UseSum from bi_system.bi_gem_add_quantity_and_count as a join bi_system.bi_gem_use_quantity_and_count as b on a.LogDate=b.LogDate;`;
    resultInfo = await sqlDataManager.querySQL(sqlStatement2,null);
    console.log('total gem add/use=',resultInfo.data);

    const totalGemAddNum = resultInfo.data[0].AddSum;
    const totalGemUseNum = resultInfo.data[0].UseSum;

    let gemInfoTable:object[] = [];
    for(let groupInfo of groupInfoTable) {
        let totalAddQuantityNum = 0;
        let totalAddCountNum = 0;
        let totalUseQuantityNum = 0;
        let totalUseCountNum = 0;
        for(let gemInfo of groupInfo) {
            totalAddQuantityNum += gemInfo.GEM_AddQuantity;
            totalAddCountNum +=gemInfo.GEM_AddCount;
            totalUseQuantityNum += gemInfo.GEM_UseQuantity;
            totalUseCountNum += gemInfo.GEM_UseCount;
        }
        gemInfoTable.push({addQuantity:totalAddQuantityNum,addCount:totalAddCountNum,useQuantity:totalUseQuantityNum,useCount:totalUseCountNum});
    }

    gemInfoTable = gemInfoTable.reverse();

    // XDS 테이블 조회
    sqlStatements = ``;
    for(let timeIntervalInfo of timeIntervalTable) {
        sqlStatements += `select a.Quantity as AddQuantity,a.Count as AddCount,b.Quantity as UseQuantity,b.Count as UseCount,a.LogDate from bi_system.bi_xds_add_quantity_and_count as a join bi_system.bi_xds_use_quantity_and_count as b on a.LogDate=b.LogDate where a.LogDate between '${timeIntervalInfo.startTime}' and '${timeIntervalInfo.endTime}' order by a.LogDate desc;`;
    }

    resultInfo = await sqlDataManager.querySQL(sqlStatements,null);
    //console.log('resultInfo=',resultInfo);

    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        resultInfo.resultCode = resultInfo.resultCode;
        resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()];
        return resultInfo;
    }

    groupInfoTable = resultInfo.data;

    sqlStatement2 = `select SUM(a.Quantity) as AddSum, SUM(b.Quantity) as UseSum from bi_system.bi_xds_add_quantity_and_count as a join bi_system.bi_xds_use_quantity_and_count as b on a.LogDate=b.LogDate;`;
    resultInfo = await sqlDataManager.querySQL(sqlStatement2,null);
    console.log('total xds add/use=',resultInfo.data);

    const totalXDSAddNum = resultInfo.data[0].AddSum;
    const totalXDSUseNum = resultInfo.data[0].UseSum;

    let xdsInfoTable:object[] = [];
    for(let groupInfo of groupInfoTable) {
        let totalAddQuantityNum = 0;
        let totalAddCountNum = 0;
        let totalUseQuantityNum = 0;
        let totalUseCountNum = 0;
        for(let xdsInfo of groupInfo) {
            totalAddQuantityNum += xdsInfo.AddQuantity;
            totalAddCountNum +=xdsInfo.AddCount;
            totalUseQuantityNum += xdsInfo.UseQuantity;
            totalUseCountNum += xdsInfo.UseCount;
        }
        xdsInfoTable.push({addQuantity:totalAddQuantityNum,addCount:totalAddCountNum,useQuantity:totalUseQuantityNum,useCount:totalUseCountNum});
    }

    xdsInfoTable = xdsInfoTable.reverse();

    resultInfo.data = {timeIntervalTable,gold:{totalGoldAddNum,totalGoldUseNum,goldInfoTable},gem:{totalGemAddNum,totalGemUseNum,gemInfoTable},xds:{totalXDSAddNum,totalXDSUseNum,xdsInfoTable}};

    console.log('resultInfo=',resultInfo.data);

    return resultInfo;
};