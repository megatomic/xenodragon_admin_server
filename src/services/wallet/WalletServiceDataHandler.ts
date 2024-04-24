import SQLDataManager from 'src/common/db/SQLDataManager';
import { ResultCode, ResultInfo } from 'src/common/ResponseManager';
import * as activityType from 'src/services/common/AdminActivityType';
import * as wdo from './WalletDataObject';
import * as Utils from 'src/common/Utils';

// wallet_info 테이블의 레코드(json)을 WalletInfo 객체로 변환
export const convertDBRecordToWalletInfo = (record: any): wdo.WalletInfo => {
  const walletInfo: wdo.WalletInfo = {
    walletID: record.wallet_id,
    walletName: record.wallet_name,
    walletAddress: record.wallet_address,
    walletKey: record.wallet_key,
    balanceInfo:{ksta:0,nst:0,xdc:0},
    walletData: record.wallet_data,
    creationTime: record.creation_time,
    updateTime: record.update_time
  };

  return walletInfo;
};

// 지갑 목록 조회
export const queryDBWalletList = async (sqlDataManager: SQLDataManager, queryNum: number): Promise<any> => {

    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.wallet_info order by creation_time asc;`;
  
    const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, {totalCount:0,list:[]});

    const walletList2 = [];
    if(resultInfo.resultCode === ResultCode.DB_QUERY_EMPTY) {
        resultInfo.resultCode = ResultCode.SUCCESS;
        resultInfo.data = {totalCount:0,list:[]};

    } else {
        const walletList = [...resultInfo.data];
        for(let walletInfo of walletList) {
            walletList2.push(convertDBRecordToWalletInfo(walletInfo));
        }
        resultInfo.data = {totalCount:walletList2.length, list:walletList2};
    }
    
    return resultInfo;
};

// 주소로 지갑 조회
export const queryDBWallet = async (sqlDataManager: SQLDataManager, walletAddress:string): Promise<any> => {

    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.wallet_info where wallet_address='${walletAddress}';`;
  
    const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, {totalCount:0,list:[]});

    if(resultInfo.resultCode === ResultCode.SUCCESS) {
        const walletList = [...resultInfo.data];
        resultInfo.data = convertDBRecordToWalletInfo(walletList[0]);
    } else {
        console.log('[DB] resultInfo=',JSON.stringify(resultInfo,null,2));
    }
    
    return resultInfo;
};

// 태그로 지갑 조회
export const queryDBWalletByTag = async (sqlDataManager: SQLDataManager, tagName:string): Promise<any> => {

    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.wallet_info where wallet_name='${tagName}';`;
  
    const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, {totalCount:0,list:[]});

    if(resultInfo.resultCode === ResultCode.SUCCESS) {
        const walletList = [...resultInfo.data];
        resultInfo.data = convertDBRecordToWalletInfo(walletList[0]);
    } else {
        console.log('[DB] resultInfo=',JSON.stringify(resultInfo,null,2));
    }
    
    return resultInfo;
};

// 새 지갑 등록
export const addDBNewWallet = async (sqlDataManager: SQLDataManager, reqAddWalletInfo: wdo.ReqAddWalletInfo): Promise<any> => {

    const fieldNameList = `(wallet_address,wallet_name,wallet_key,creation_time,update_time)`;
    const fieldValueList = `('${reqAddWalletInfo.walletAddress}','${reqAddWalletInfo.walletName}','${reqAddWalletInfo.walletKey}','${Utils.getStdNowString()}','${Utils.getStdNowString()}')`;
  
    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements = `insert into ${dbmsInfo.defaultDatabase}.wallet_info ${fieldNameList} values ${fieldValueList}`;
  
    let resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);
  
    console.log('resultInfo=',resultInfo.data);

    return resultInfo;
};
  
// 지갑정보 갱신
export const updateDBWalletInfo = async (sqlDataManager: SQLDataManager, reqUpdateWalletInfo: wdo.ReqUpdateWalletInfo): Promise<any> => {
    //const itemListStr = edo.getJsonStringFromItemList(reqUpdateEventInfo.rewardItemList);
  
    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements = `update ${dbmsInfo.defaultDatabase}.wallet_info set wallet_name='${reqUpdateWalletInfo.walletName}',wallet_key='${reqUpdateWalletInfo.walletKey}',update_time='${Utils.getStdNowString()}' where wallet_address='${reqUpdateWalletInfo.walletAddress}';`;
    const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);
  
    return resultInfo;
};
  
// 지갑 삭제
export const deleteDBWallet = async (sqlDataManager: SQLDataManager, reqDeleteWalletInfo: wdo.ReqDeleteWalletInfo): Promise<any> => {

    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements = `delete from ${dbmsInfo.defaultDatabase}.wallet_info where wallet_address="${reqDeleteWalletInfo.walletAddress}";`;

    let resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

    return resultInfo;
};
