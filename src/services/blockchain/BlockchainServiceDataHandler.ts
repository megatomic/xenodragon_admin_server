import SQLDataManager from 'src/common/db/SQLDataManager';
import { ResultCode, ResultInfo, getResultForm, ReqValidationErrorMsg } from 'src/common/ResponseManager';
import * as activityType from 'src/services/common/AdminActivityType';
import * as bdo from './BlockchainDataObject';
import * as Utils from 'src/common/Utils';
import dayjs, { ManipulateType } from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

// 유저 스왑현황 테이블을 내부 객체로 변환
export const convertDBRecordToUserSwapLogInfo = (record: any): bdo.UserSwapLogInfo => {
    const logInfo: bdo.UserSwapLogInfo = {
        logID: record.Id,
        userID: record.UserId,
        originTokenID: record.OriginTokenId,
        targetTokenID: record.TargetTokenId,
        swapRateID: record.SwapRateId,
        gasFee: record.GasFee,
        originValue: record.OriginValue,
        targetValue: record.TargetValue,
        swapTx: record.SwapTx,
        swapState: record.SwapState,
        timestamp: record.UpdatedAt
    };
  
    return logInfo;
  };

// 유저 스왑현황 로그 테이블을 내부 객체로 변환
export const convertDBRecordToLiquidPoolLogInfo = (record: any): bdo.LiquidPoolLogInfo => {
    const logInfo: bdo.LiquidPoolLogInfo = {
        logID: record.Id,
        liquidPoolID: record.LiquidPoolId,
        tokenID: record.TokenId,
        userActionType: record.ActionCase,
        userActionValue: record.ActionValue,
        userWalletAddress: record.ActionSource,
        timestamp: record.UpdatedAt
    };
  
    return logInfo;
};

// 게임서버 유동성풀 현황 조회 처리
export const getDBLiquidPoolStateInfo = async (sqlDataManager: SQLDataManager): Promise<any> => {

    const dbmsInfo = sqlDataManager.getDBMSInfo();

    let sqlStatements = `select TotalQty from ${dbmsInfo.gameBlockchainDatabase}.liquid_pool_state where LiquidPoolId=1;`;

    let resultInfo:ResultInfo = await sqlDataManager.querySQL(sqlStatements,null);
    if(resultInfo.resultCode != ResultCode.SUCCESS) {
        return resultInfo;
    }

    //console.log(`totalQty=${JSON.stringify(resultInfo.data)}`);

    const totalXDC = parseFloat(resultInfo.data[0].TotalQty);
    const totalXDS = parseFloat(resultInfo.data[1].TotalQty);

    sqlStatements = `select SUM(OriginValue) as XDS_IN, SUM(TargetValue) as XDC_OUT from ${dbmsInfo.gameBlockchainDatabase}.user_swap where OriginTokenId=5 and SwapState=9;
                    select SUM(OriginValue) as XDC_IN, SUM(TargetValue) as XDS_OUT from ${dbmsInfo.gameBlockchainDatabase}.user_swap where OriginTokenId=4 and SwapState=9;
    `;

    resultInfo = await sqlDataManager.querySQL(sqlStatements,null);
    if(resultInfo.resultCode != ResultCode.SUCCESS) {
        return resultInfo;
    }

    //console.log(`user_swap=${JSON.stringify(resultInfo.data)}`);

    const totalXDSIn = parseFloat(resultInfo.data[0][0].XDS_IN) - parseFloat(resultInfo.data[1][0].XDS_OUT);
    const totalXDCIn = parseFloat(resultInfo.data[1][0].XDC_IN) - parseFloat(resultInfo.data[0][0].XDC_OUT);

    //console.log(`data=${JSON.stringify(resultInfo.data,null,2)}`);
    const xdcPoolTotal = totalXDC + totalXDCIn;//resultInfo.data[0].ServiceOwn;
    const xdcUserTotal = 0;//resultInfo.data[0].UserOwn;
    const xdsPoolTotal = totalXDS + totalXDSIn;//resultInfo.data[1].ServiceOwn;
    const xdsUserTotal = 0;//resultInfo.data[1].UserOwn;

    resultInfo.data = {xdcPoolTotal,xdcUserTotal,xdsPoolTotal,xdsUserTotal};

    return resultInfo;
};

// 게임서버 유동성풀 거래로그 조회 처리
export const queryDBLiquidPoolLogTable = async (sqlDataManager: SQLDataManager, tokenType: number, pageNo: number, queryNum:number): Promise<any> => {

    let pNo = pageNo;
    if (pageNo < 1) {
      pNo = 1;
    }

    let whereFields = '';
    if(tokenType > 0) {
        whereFields = `where TokenId=${tokenType===1?5:4}`;
    }

    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements = `select * from ${dbmsInfo.gameBlockchainDatabase}.liquid_pool_action ${whereFields} order by UpdatedAt desc limit ${queryNum} offset ${(pNo - 1) * queryNum};`;
    sqlStatements += `select count(*) from ${dbmsInfo.gameBlockchainDatabase}.liquid_pool_action ${whereFields};`;

    const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);
  
    let logList: any[] = [];
    if (resultInfo.data !== null && resultInfo.data.length > 0) {
      logList = [...resultInfo.data[0]];
    }
  
    let totalRecordCount = logList.length;
    if(resultInfo.data[1][0] !== undefined && resultInfo.data[1][0]['count(*)'] !== undefined) {
      totalRecordCount =   resultInfo.data[1][0]['count(*)'];
    }
  
    console.log('totalRecCount=',totalRecordCount);
  
    if (resultInfo.resultCode === ResultCode.DB_QUERY_EMPTY) {
      resultInfo.resultCode = ResultCode.SUCCESS;
    }
  
    const logInfoList: bdo.LiquidPoolLogInfo[] = [];
    let logInfo: bdo.LiquidPoolLogInfo;
    for (let logRecord of logList) {
      logInfo = convertDBRecordToLiquidPoolLogInfo(logRecord);
      logInfoList.push(logInfo);
    }
    resultInfo.data = {totalCount:totalRecordCount, list:logInfoList};
  
    return resultInfo;
};

// 게임서버 DB테이블 조회 처리
export const queryUserSwapLogTable = async (sqlDataManager: SQLDataManager, reqInfo:bdo.ReqQueryUserSwapTableInfo): Promise<any> => {

    const timeIntervalStringTable:ManipulateType[]|undefined[]=['hour','day','week','month'];
    let baseTime2 = dayjs(reqInfo.baseTime);
    if(reqInfo.offsetValue > 0) {
        baseTime2 = baseTime2.add(reqInfo.offsetValue,timeIntervalStringTable[reqInfo.timeIntervalType]);
    } else if(reqInfo.offsetValue < 0) {
        baseTime2 = baseTime2.subtract(Math.abs(reqInfo.offsetValue),timeIntervalStringTable[reqInfo.timeIntervalType]);
    }

    const timeIntervalTable = [];
    let baseTime = null;
    if(reqInfo.timeIntervalType === 0) { // 시간단위
        baseTime = baseTime2.set("minute",0).set("second",0);
        for(let i=0;i<reqInfo.displayNum;i++) {
            if(reqInfo.baseDirection === true) {
                if(i === 0) {
                    timeIntervalTable.push({startTime:baseTime2.format("YYYY-MM-DD HH:mm:ss"),endTime:baseTime.add(i+1,"hour").subtract(1,"millisecond").format("YYYY-MM-DD HH:mm:ss")});
                } else {
                    timeIntervalTable.push({startTime:baseTime.add(i,"hour").format("YYYY-MM-DD HH:mm:ss"),endTime:baseTime.add(i+1,"hour").subtract(1,"millisecond").format("YYYY-MM-DD HH:mm:ss")});
                }
            } else {
                if(i === 0) {
                    timeIntervalTable.push({endTime:baseTime2.format("YYYY-MM-DD HH:mm:ss"),startTime:baseTime.format("YYYY-MM-DD HH:mm:ss")});
                } else {
                    timeIntervalTable.push({endTime:baseTime.subtract(i-1,"hour").subtract(1,"millisecond").format("YYYY-MM-DD HH:mm:ss"),startTime:baseTime.subtract(i,"hour").format("YYYY-MM-DD HH:mm:ss")});
                }
            }
        }
        
    } else if(reqInfo.timeIntervalType === 1) { // 일단위
        baseTime = baseTime2.set("hour",0).set("minute",0).set("second",0);
        for(let i=0;i<reqInfo.displayNum;i++) {
            if(reqInfo.baseDirection === true) {
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

    } else if(reqInfo.timeIntervalType === 2) { // 주단위
        baseTime = baseTime2.set("hour",0).set("minute",0).set("second",0).add(1,"day");
        for(let i=0;i<reqInfo.displayNum;i++) {
            if(reqInfo.baseDirection === true) { 
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
        for(let i=0;i<reqInfo.displayNum;i++) {
            if(reqInfo.baseDirection === true) {
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

    console.log('timeIntervalTable=',timeIntervalTable);

    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements = "";
    
    for(let timeIntervalInfo of timeIntervalTable) {
        sqlStatements += `select * from ${dbmsInfo.gameBlockchainDatabase}.user_swap where SwapState=9 and UpdatedAt between '${timeIntervalInfo.startTime}' and '${timeIntervalInfo.endTime}';`;
    }
    //let sqlStatements2 = `show columns from ${dbName}.${tableName}`; // 컬럼명 조회하기

    //sqlStatements = `select * from xeno_blockchain.user_swap where OriginValue > 100.0;`;
    let resultInfo:ResultInfo = await sqlDataManager.querySQL(sqlStatements,null);

    //console.log('resultInfo.data=',resultInfo.data);

    const userSwapInfoTable:any[] = [];
    const swapInfoTable = [];
    for(let groupInfo of resultInfo.data) {
        let xdcToXDSSwapNum = 0;
        let xdsToXDCSwapNum = 0;
        let fromXDCSum = 0.0;
        let toXDSSum = 0.0;
        let fromXDSSum = 0.0;
        let toXDCSum = 0.0;
        let userInfo;
        for(let swapInfo of groupInfo) {
            userInfo = null;
            for(let info of userSwapInfoTable) {
                if(info.userId === swapInfo.UserId) {
                    userInfo = info;
                    break;
                }
            }

            if(userInfo === null) {
                userInfo = {userId:swapInfo.UserId,userNick:"",xds2xdc:0,xdc2xds:0};
                userSwapInfoTable.push(userInfo);
            }
            if(swapInfo.OriginTokenId === 4 && swapInfo.TargetTokenId === 5) {
                xdcToXDSSwapNum++;
                fromXDCSum += parseFloat(swapInfo.OriginValue);
                toXDSSum += parseFloat(swapInfo.TargetValue);

                userInfo.xdc2xds += parseInt(swapInfo.TargetValue);

            } else if(swapInfo.OriginTokenId === 5 && swapInfo.TargetTokenId === 4) {
                xdsToXDCSwapNum++;
                fromXDSSum += parseFloat(swapInfo.OriginValue);
                toXDCSum += parseFloat(swapInfo.TargetValue);

                userInfo.xds2xdc += parseInt(swapInfo.TargetValue);
            }
        }

        swapInfoTable.push({xdc2xdsNum:xdcToXDSSwapNum,fromXDCTotal:fromXDCSum,toXDSTotal:toXDSSum,xds2xdcNum:xdsToXDCSwapNum,fromXDSTotal:fromXDSSum,toXDCTotal:toXDCSum});
    }

    console.log("userSwapInfoTable=",JSON.stringify(userSwapInfoTable,null,2));

    const func1 = (a:any,b:any):number => {
        if(a.xds2xdc < b.xds2xdc) return 1;
        else if(a.xds2xdc > b.xds2xdc) return -1;
        else return 0;
    };
    userSwapInfoTable.sort(func1);
    const userSwapInfoTable2 = [];
    if(userSwapInfoTable.length > 0) {
        for(let i=0;i<10;i++) {
            if(userSwapInfoTable.length > i && userSwapInfoTable[i] !== null) {
                userSwapInfoTable2.push(userSwapInfoTable[i]);
            }
        }
    }

    console.log('userSwapInfoTable2=',JSON.stringify(userSwapInfoTable2,null,2));

    if(userSwapInfoTable2.length > 0) {
        // 스왑 유저ID로 유저닉네임 조회하기
        sqlStatements = "";
        for(let userSwapInfo of userSwapInfoTable2) {
            sqlStatements += `select UserId,Nickname from ${dbmsInfo.gameUserDatabase}.user_nickname where UserId='${userSwapInfo.userId}';`;
        }
        resultInfo = await sqlDataManager.querySQL(sqlStatements,null);
        for(let table1 of resultInfo.data) {
            for(let userSwapInfo of userSwapInfoTable2) {
                if(userSwapInfo.userId === table1[0].UserId) {
                    userSwapInfo.userNick = table1[0].Nickname;
                    break;
                }
            }
        }
    }

    console.log('swapNumTable=',swapInfoTable);

    resultInfo.data = {timeIntervalTable,swapInfoTable,userSwapInfoTable:userSwapInfoTable2};

    return resultInfo;
};

// 지갑주소로 유저닉네임 조회 처리
export const queryUserNicknameByWalletAddress = async (sqlDataManager: SQLDataManager, walletAddress: string): Promise<any> => {

    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements = `select C.Nickname from xeno_blockchain.user_wallet as A join xeno_blockchain.wallet_info as B join xeno_user.user_nickname as C on A.WalletId=B.Id and A.UserId=C.UserId where B.WalletAddress='${walletAddress}';`;

    const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);
  
    console.log('[DBMS] resultInfo=',JSON.stringify(resultInfo));

    if (resultInfo.resultCode === ResultCode.DB_QUERY_EMPTY) {
        resultInfo.resultCode = ResultCode.SUCCESS;
    }

    if(resultInfo.resultCode === ResultCode.SUCCESS) {
        resultInfo.data = resultInfo.data.length > 0 ? resultInfo.data[0].Nickname : null;
    }
  
    return resultInfo;
};