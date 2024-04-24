import SQLDataManager from 'src/common/db/SQLDataManager';
import {ResultCode, ResultInfo} from 'src/common/ResponseManager';
import { ACLUnitInfo } from './AccountDataObject';
import * as Utils from 'src/common/Utils';
import * as ado from 'src/services/accounts/AccountDataObject';
//import { encodeACLInfo, decodeACLInfo } from 'src/services/common/AdminACLManager';


// AccountInfo 객체를 account_info 테이블의 레코드(json)으로 변환
export const convertAccountInfoToDBRecord = (accountInfo:ado.AccountInfo):any => {

    const recordObj = {
        seq_no:accountInfo.seqNo,
        account_id:accountInfo.accountID,
        account_nick:accountInfo.accountNick,
        account_pw:accountInfo.accountPW,
        account_pw_salt:accountInfo.accountPWSalt,
        acl_info:accountInfo.aclInfo,
        activation_flag:(accountInfo.activationFlag === true?1:0),
        creation_time:accountInfo.creationTime
    };

    return recordObj;
};

// account_info 테이블의 레코드(json)을 AccountInfo 객체로 변환
export const convertDBRecordToAccountInfo = (record:any):ado.AccountInfo => {

    const userInfo:ado.AccountInfo = {
        seqNo:record.seq_no,
        accountID:record.account_id,
        accountNick:record.account_nick,
        accountPW:record.account_pw,
        accountPWSalt:record.account_pw_salt,
        aclInfo:record.acl_info,
        serverACL:record.server_acl,
        activationFlag:(record.activation_flag===1?true:false),
        creationTime:record.creation_time
    };

    return userInfo;
};


// 특정 계정ID에 대한 계정정보 조회
export const queryDBAccount = async (sqlDataManager:SQLDataManager, accountID:string):Promise<any> => {

    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.account_info where account_id ='${accountID}'`;

    const resultInfo:ResultInfo = await sqlDataManager.querySQL(sqlStatements,null);
    if(resultInfo.data.length > 0) {
        resultInfo.data = convertDBRecordToAccountInfo(resultInfo.data[0]);
    } else {
        resultInfo.data = [];
    }

    return resultInfo;
};

// 전체 계정정보 목록 조회
export const queryDBAccountList = async (sqlDataManager:SQLDataManager,reqAccListInfo:ado.ReqAdminListInfo,queryNum:number):Promise<any> => {

    let pNo = reqAccListInfo.pageNo;
    if(reqAccListInfo.pageNo < 1) {
        pNo = 1;
    }

    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.account_info order by creation_time desc limit ${queryNum} offset ${(pNo-1)*queryNum};`;
    sqlStatements += `select count(*) from ${dbmsInfo.defaultDatabase}.account_info;`;

    let resultInfo:ResultInfo = await sqlDataManager.querySQL(sqlStatements,null);
  
    let accountList: any[] = [];
    if (resultInfo.data !== null && resultInfo.data.length > 0) {
        accountList = [...resultInfo.data[0]];
    }

    let totalRecordCount = accountList.length;
    if(resultInfo.data[1][0] !== undefined && resultInfo.data[1][0]['count(*)'] !== undefined) {
      totalRecordCount =   resultInfo.data[1][0]['count(*)'];
    }

    let accountInfoList:ado.AccountInfo[] = [];
    let accountInfo:ado.AccountInfo;
    let fieldNameList;
    for(let accountRecord of accountList) {
        accountInfo = convertDBRecordToAccountInfo(accountRecord);
        accountInfo.accountPW = '';
        accountInfo.accountPWSalt = '';
        accountInfoList.push(accountInfo);
    }

    resultInfo.data = {totalCount:totalRecordCount, list:accountInfoList};

    return resultInfo;
};

// 계정 암호 hash,salt 값 갱신
export const updateDBAccountPassword = async (sqlDataManager:SQLDataManager, accountID:string, password:string, salt:string):Promise<any> => {

    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements = `update ${dbmsInfo.defaultDatabase}.account_info set account_pw="${password}", account_pw_salt="${salt}" where account_id = '${accountID}'`;

    let resultInfo:ResultInfo = await sqlDataManager.querySQL(sqlStatements,null);

    return resultInfo;
};

// 새 계정 등록
export const registerDBNewAccount = async (sqlDataManager:SQLDataManager, reqNewAdminInfo:ado.ReqNewAdminInfo, password:string, salt:string):Promise<any> => {

    const fieldNameList = `(account_id, account_nick, account_pw, account_pw_salt, creation_time, activation_flag, acl_info, server_acl)`;
    const fieldValueList = `'${reqNewAdminInfo.newAdminID}','${reqNewAdminInfo.newAdminNick}','${password}','${salt}','${Utils.getStdNowString()}',1,'${reqNewAdminInfo.newAdminACLInfo}', '${reqNewAdminInfo.newAdminServerACL}'`;

    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements = `insert into ${dbmsInfo.defaultDatabase}.account_info ${fieldNameList} values (${fieldValueList})`;

    let resultInfo:ResultInfo = await sqlDataManager.querySQL(sqlStatements,null);

    return resultInfo;
};

// 계정의 ACL을 갱신
export const updateDBAccountInfo = async (sqlDataManager:SQLDataManager, reqModifyAccInfo:ado.ReqModifyAccountInfo):Promise<any> => {

    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements = `update ${dbmsInfo.defaultDatabase}.account_info set account_nick='${reqModifyAccInfo.targetAccountNick}',acl_info='${reqModifyAccInfo.targetAccountACLInfo}',server_acl='${JSON.stringify(reqModifyAccInfo.targetAccountServerACL)}' where account_id = '${reqModifyAccInfo.targetAccountID}'`;

    let resultInfo:ResultInfo = await sqlDataManager.querySQL(sqlStatements,null);

    return resultInfo;
};

// 계정 활성화/비활성화
export const updateDBAccountActivation = async (sqlDataManager:SQLDataManager, reqAdminActivInfo:ado.ReqAdminActivationInfo):Promise<any> => {

    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements = '';
    
    for(let i=0;i<reqAdminActivInfo.targetAdminIDList.length;i++) {
        sqlStatements +=`update ${dbmsInfo.defaultDatabase}.account_info set activation_flag=${reqAdminActivInfo.activationFlagList[i]===true?1:0} where account_id = '${reqAdminActivInfo.targetAdminIDList[i]}';`;
    }
    
    let resultInfo:ResultInfo = await sqlDataManager.querySQL(sqlStatements,null);

    return resultInfo;
};

// 계정 삭제
export const deleteDBAccount = async (sqlDataManager:SQLDataManager, reqAdminDelInfo:ado.ReqAdminDeleteInfo):Promise<any> => {

    let targetIDList = '';
    for(let i=0;i<reqAdminDelInfo.targetAdminIDList.length;i++) {
        targetIDList += '"'+reqAdminDelInfo.targetAdminIDList[i]+'"';
        if(i+1 < reqAdminDelInfo.targetAdminIDList.length) {
            targetIDList += ',';
        }
    }

    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements = `delete from ${dbmsInfo.defaultDatabase}.account_info where account_id in (${targetIDList})`;

    let resultInfo:ResultInfo = await sqlDataManager.querySQL(sqlStatements,null);

    return resultInfo;
};