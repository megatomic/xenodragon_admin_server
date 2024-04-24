import SQLDataManager from 'src/common/db/SQLDataManager';
import {ResultCode, getResultForm, ResultInfo} from 'src/common/ResponseManager';
import * as udo from './UserManagementDataObject';
import * as Utils from 'src/common/Utils';
import * as bdo from 'src/services/common/BaseDataObject';
import dayjs from 'dayjs';
import { Result } from 'express-validator';

//import { encodeACLInfo, decodeACLInfo } from 'src/services/common/AdminACLManager';


// 유저 플레이스탯 키값과 매칭되는 DB 테이블명 맵핑 테이블
const playStatDBFieldMapTable = [
    {statKey:udo.PLAYSTAT_GEM, dbField:'item_gem'},
    {statKey:udo.PLAYSTAT_FREEGEM, dbField:'item_free_gem'},
    {statKey:udo.PLAYSTAT_GOLD, dbField:'item_gold'},
    {statKey:udo.PLAYSTAT_ENERGY, dbField:'item_energy'},
    {statKey:udo.PLAYSTAT_ADV_CHAPTER, dbField:'item_adv_chapter'},
    {statKey:udo.PLAYSTAT_ADV_STAGE, dbField:'item_adv_stage'},
    {statKey:udo.PLAYSTAT_MMR, dbField:'item_mmr'},
    {statKey:udo.PLAYSTAT_AVAILEXPEDITION_SLOT, dbField:'item_availexped_slot'},
    {statKey:udo.PLAYSTAT_DAILYEXPEDITION_COUNT, dbField:'item_exped_count'},
    {statKey:udo.PLAYSTAT_DAILYEGGHELP_COUNT, dbField:'item_egghelp_count'},
    {statKey:udo.PLAYSTAT_TUTORIALSTEP, dbField:'item_tutorial_step'}
];

// 유저 play state 키값을 유저 테이블 필드명으로 변환
export const convertPlayStatKeyToDBTableField = (statKey:number):string => {

    for(let e of playStatDBFieldMapTable) {
        if(e.statKey === statKey) {
            return e.dbField;
        }
    }

    return '';
};

// 유저 테이블 필드명을 play stat 키값으로 변환
export const convertDBTableFieldToPlayStatKey = (dbFieldName:string):number => {

    for(let e of playStatDBFieldMapTable) {
        if(e.dbField === dbFieldName) {
            return e.statKey;
        }
    }

    return -1;
};

// UserGamePlayInfo 객체를 user_info 테이블의 레코드(json)으로 변환
export const convertUserGamePlayInfoToDBRecord = (userInfo:udo.UserGamePlayInfo):any => {

    const recordObj = {
        UID:userInfo.userUID,
        NickName:userInfo.userNick,
        LandUID:userInfo.landUID,
        Gem:userInfo.gem,
        FreeGem:userInfo.freeGem,
        ABP:userInfo.gold,
        Energy:userInfo.energy,
        XDS:userInfo.xds,
        Update_Energy:userInfo.energyConsumeTime,
        SelectTeamIDX:userInfo.activeTeamIndex,
        ClearChapter:userInfo.advClearChapter,
        ClearStage:userInfo.advClearStage,
        MMR:userInfo.mmr,
        Create_Time:userInfo.accountCreateTime,
        LastLogin:userInfo.lastLoginTime,
        ExpeditionSlot:userInfo.availExpeditionSlotNum,
        ExpeditionCnt:userInfo.dailyExpeditionCount,
        EggHelpCount:userInfo.dailyEggHelpCount,
        EggHelpedResetTime:userInfo.eggHelpCountResetTime,
        TutorialStep:userInfo.lastTutorialStep
    };

    return recordObj;
};

// user_info 테이블의 레코드(json)을 UserGamePlayInfo 객체로 변환
export const convertDBRecordToUserGamePlayInfo = (record:any):udo.UserGamePlayInfo => {

    const userInfo:udo.UserGamePlayInfo = {
        userUID: record.UID,
        userNick: record.NickName,
        landUID: record.LandUID,
        gem: record.Gem,
        freeGem: record.FreeGem,
        gold: record.ABP,
        energy: record.Energy,
        xds: record.XDS,
        energyConsumeTime: record.Update_Energy,
        activeTeamIndex: record.SelectTeamIDX,
        advClearChapter: record.ClearChapter,
        advClearStage: record.ClearStage,
        mmr: record.MMR,
        accountCreateTime: record.Create_Time,
        lastLoginTime: record.LastLogin,
        availExpeditionSlotNum: record.ExpeditionSlot,
        dailyExpeditionCount: record.ExpeditionCnt,
        dailyEggHelpCount: record.EggHelpCount,
        eggHelpCountResetTime: record.EggHelpedResetTime,
        lastTutorialStep: record.TutorialStep
    };

    return userInfo;
};

// useractlog_info 테이블의 레코드(json)을 UserActLogInfo 객체로 변환
export const convertDBRecordToUserActLogInfo = (record:any,userNick:string):udo.UserActLogInfo => {

    const actLogInfo:udo.UserActLogInfo = {
        recID: record.Id,
        userID: record.UserId,
        userNick: userNick,
        actionCase: record.ActionCase,
        itemType: record.ItemType,
        itemID: record.ItemId,
        quantity: record.Quantity,
        logTime: record.LogTime,
        logData: record.LogDesc
    };

    return actLogInfo;
};

// userpaylog_info 테이블의 레코드(json)을 UserPayLogInfo 객체로 변환
export const convertDBRecordToUserPayLogInfo = (record:any,userNick:string):udo.UserPayLogInfo => {

    const payLogInfo:udo.UserPayLogInfo = {
        recID: record.Id,
        userID: record.UserId,
        userNick: userNick,
        receiptID: record.OrderId,
        productID: record.ProductId,
        productName:"",
        currency: "",
        price: 0,
        deviceType:record.device_type,
        purchaseState: record.PurchaseState,
        payTime:record.UpdatedAt
    };

    return payLogInfo;
};

// blacklist_info 테이블의 레코드(json)을 BlacklistUserInfo 객체로 변환
export const convertDBRecordToBlacklistUserInfo = (record:any):udo.BlacklistUserInfo => {

    const blacklistUserInfo:udo.BlacklistUserInfo = {
        userID: record.user_id,
        duration: record.duration,
        reason: record.reason,
        autoReleaseFlag: record.autorelease_flag,
        registerTime: record.register_time,
        userData: record.data
    };

    return blacklistUserInfo;
};

// 키워드로 유저 검색
export const queryDBUserList = async (sqlDataManager:SQLDataManager, reqSearchUserInfo:udo.ReqSearchUserInfo, queryNum:number):Promise<any> => {

    let pNo = reqSearchUserInfo.pageNo;
    if(reqSearchUserInfo.pageNo < 1) {
        pNo = 1;
    }

    let blacklistActivation = 0;
    if(reqSearchUserInfo.userType === udo.USER_TYPE_BLACKLIST) {
        blacklistActivation = 1;
    }

    const queryFieldList = 'user_id, user_nick, gem_amount, gold_amount, xds_amount';

    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements = null;
    if(reqSearchUserInfo.searchType === udo.USERSEARCH_TYPE_ALL) {
        sqlStatements = `select ${queryFieldList} from ${dbmsInfo.gameDatabase}.user_info where blacklist_flag=${blacklistActivation} order by creation_time desc limit ${queryNum} offset ${(pNo-1)*queryNum}`;

    } else if(reqSearchUserInfo.searchType === udo.USERSEARCH_TYPE_BYNICKNAME) {
        sqlStatements = `select ${queryFieldList}  from ${dbmsInfo.gameDatabase}.user_info where blacklist_flag=${blacklistActivation} and user_nick like '%${reqSearchUserInfo.searchText.trim()}%' order by creation_time desc limit ${queryNum} offset ${(pNo-1)*queryNum}`;

    } else {
        sqlStatements = `select ${queryFieldList} from ${dbmsInfo.gameDatabase}.user_info where blacklist_flag=${blacklistActivation} and user_id = '${reqSearchUserInfo.searchText.trim()}' order by creation_time desc limit ${queryNum} offset ${(pNo-1)*queryNum}`;
    }

    const resultInfo:ResultInfo = await sqlDataManager.querySQL(sqlStatements,null);

    const userList = [...resultInfo.data];

    let userInfoList:udo.UserGamePlayInfo[] = [];
    let userInfo:udo.UserGamePlayInfo;
    let fieldNameList;
    for(let userRecord of userList[0]) {
        userInfo = convertDBRecordToUserGamePlayInfo(userRecord);
        userInfoList.push(userInfo);
    }
    resultInfo.data = userInfoList;

    return resultInfo;
};

// 유저의 게임플레이 정보 조회
export const queryDBUserPlayInfo = async (sqlDataManager:SQLDataManager, reqUserPlayInfo:udo.ReqUserPlayInfo):Promise<any> => {

    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements = null;
    sqlStatements = `select * from ${dbmsInfo.gameDatabase}.user_info where user_id = '${reqUserPlayInfo.targetUserID.trim()}' `;

    const resultInfo:ResultInfo = await sqlDataManager.querySQL(sqlStatements,null);

    const accountList = [...resultInfo.data];
    resultInfo.data = convertDBRecordToUserGamePlayInfo(accountList[0]);

    return resultInfo;
};

// 유저의 블랙리스트 등록여부 설정사항 갱신
// export const updateDBUserBlacklistActivation = async (sqlDataManager:SQLDataManager, reqBlacklistActivationInfo:udo.ReqBlacklistActivationInfo):Promise<any> => {

//     const dbmsInfo = sqlDataManager.getDBMSInfo();
//     let sqlStatements = `update ${dbmsInfo.gameDatabase}.user_info set blacklist_flag=${reqBlacklistActivationInfo.activationFlag===true?1:0},blacklst_autorel_date=${reqBlacklistActivationInfo.autoReleaseDate} where user_id=${reqBlacklistActivationInfo.targetUserID}`;

//     let resultInfo:ResultInfo = await sqlDataManager.querySQL(sqlStatements,null);

//     return resultInfo;
// };

// 유저 게임플레이 정보의 특정 스탯값 갱신
export const updateDBUserPlayStat = async (sqlDataManager:SQLDataManager, reqUpdateUserPlayStat:udo.ReqUpdateUserPlayStat):Promise<any> => {

    let dbFieldName;
    let dbSetField = 'set ';
    for(let kv of reqUpdateUserPlayStat.userPlayStatList) {
        if(dbSetField !== 'set ') {
            dbSetField += ',';
        }
        dbFieldName = convertPlayStatKeyToDBTableField(kv.playStatKey);
        dbSetField += `${dbFieldName}=${kv.playStatValue} `;
    }

    let resultInfo:ResultInfo = getResultForm(ResultCode.SUCCESS,"",null);
    if(reqUpdateUserPlayStat.userPlayStatList.length === 0) {
        resultInfo.resultCode = ResultCode.DB_UPDATE_FIELD_NOTFOUND;
        return resultInfo;
    }

    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements = `update ${dbmsInfo.gameDatabase}.user_info set ${dbSetField} where user_id=${reqUpdateUserPlayStat.targetUserID}`;

    resultInfo = await sqlDataManager.querySQL(sqlStatements,null);

    return resultInfo;
};

// 유저 활동로그 정보 조회
export const queryDBUserActLogList = async (sqlDataManager:SQLDataManager, userKeyword:string, itemType:number, actionCase:number, durationType:number, pageNo:number, queryNum:number):Promise<any> => {

    let pNo = pageNo;
    if(pageNo < 1) {
        pNo = 1;
    }

    let actLogInfoList: udo.UserActLogInfo[] = [];
    const dbmsInfo = sqlDataManager.getDBMSInfo();

    // 유저ID로 유저닉네임 조회하기
    let sqlStatements = `select Nickname from ${dbmsInfo.gameUserDatabase}.user_nickname where UserId='${userKeyword.trim()}' limit 1;`;
    let resultInfo:ResultInfo = await sqlDataManager.querySQL(sqlStatements,null);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        if (resultInfo.resultCode === ResultCode.DB_QUERY_EMPTY) {
            resultInfo.resultCode = ResultCode.SUCCESS;
            resultInfo.data = actLogInfoList;
        }
        return resultInfo;
    }

    const userNick = resultInfo.data[0].Nickname;

    const queryFieldList = 'Id,UserId,ActionCase,ItemType,ItemId,Quantity,LogDesc,LogTime';
    let whereField1 = `where UserId='${userKeyword.trim()}' `;
    let whereField2 = '';
    let whereField3 = '';
    let whereField4 = '';
  
    if (durationType === 0) {
      let startDate = '1900-01-01 00:00:00';
      let endDate = '2099-12-30 00:00:00';
    } else {
      let startDate='';
      let endDate = dayjs().format('YYYY-MM-DD HH:mm:ss');
      if (durationType === 1) { // 오늘
        startDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss');

      } else if(durationType === 2) { // 최근 일주일
        startDate = dayjs().subtract(1, 'week').format('YYYY-MM-DD HH:mm:ss');

      } else if(durationType === 3) { // 최근 1개월
        startDate = dayjs().subtract(1, 'month').format('YYYY-MM-DD HH:mm:ss');
      } else {
        startDate = dayjs().subtract(1, 'year').format('YYYY-MM-DD HH:mm:ss');
      }

      whereField2 = `and LogTime between '${startDate}' and '${endDate}' `;
    }

    if(actionCase > 0) {
        whereField3 = `and ActionCase=${actionCase} `;
    }

    if(itemType > 0) {
        whereField4 = `and ItemType=${itemType} `;
    }

    sqlStatements = `select ${queryFieldList} from ${dbmsInfo.gameLogDatabase}.item_log ${whereField1} ${whereField2} ${whereField3} ${whereField4} order by logTime desc limit ${queryNum} offset ${(pNo-1)*queryNum};`;
    sqlStatements += `select count(*) from ${dbmsInfo.gameLogDatabase}.item_log ${whereField1} ${whereField2} ${whereField3} ${whereField4};`;

    resultInfo = await sqlDataManager.querySQL(sqlStatements, null);
  
    let logList: any[] = [];
    if (resultInfo.data !== null && resultInfo.data.length > 0) {
      logList = [...resultInfo.data[0]];
    }
  
    let totalRecordCount = logList.length;
    if(resultInfo.data[1][0] !== undefined && resultInfo.data[1][0]['count(*)'] !== undefined) {
      totalRecordCount =   resultInfo.data[1][0]['count(*)'];
    }
  
    if (resultInfo.resultCode === ResultCode.DB_QUERY_EMPTY) {
      resultInfo.resultCode = ResultCode.SUCCESS;
    }
  
    
    let actLogInfo: udo.UserActLogInfo;
    if(logList.length > 0) {
        for (let userRecord of logList) {
            actLogInfo = convertDBRecordToUserActLogInfo(userRecord,userNick);
          actLogInfoList.push(actLogInfo);
        }
    }

    resultInfo.data = {totalCount:totalRecordCount, list:actLogInfoList};

    return resultInfo;
};

// 유저 결제로그 정보 조회
export const queryDBUserPayLogList = async (sqlDataManager:SQLDataManager, userKeyword:string, queryNum:number):Promise<any> => {

    const queryDBFieldList = `Id,UserId,PlatformType,ProductId,OrderId,PurchaseState,UpdatedAt`;

    const dbmsInfo = sqlDataManager.getDBMSInfo();

    let payLogInfoList: udo.UserPayLogInfo[] = [];
    let payLogList: any[] = [];

    // 유저ID로 유저닉네임 조회하기
    let sqlStatements = `select Nickname from ${dbmsInfo.gameUserDatabase}.user_nickname where UserId='${userKeyword.trim()}' limit 1;`;
    let resultInfo:ResultInfo = await sqlDataManager.querySQL(sqlStatements,null);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        if (resultInfo.resultCode === ResultCode.DB_QUERY_EMPTY) {
            resultInfo.resultCode = ResultCode.SUCCESS;
            resultInfo.data = payLogInfoList;
        }
        return resultInfo;
    }

    const userNick = resultInfo.data[0].Nickname;

    sqlStatements = `select ${queryDBFieldList} from ${dbmsInfo.gameUserDatabase}.user_purchase where UserId='${userKeyword.trim()}' order by UpdatedAt desc limit ${queryNum};`;
    resultInfo = await sqlDataManager.querySQL(sqlStatements,null);

    if (resultInfo.data !== null && resultInfo.data.length > 0) {
        payLogList = [...resultInfo.data];
    }

    if (resultInfo.resultCode === ResultCode.DB_QUERY_EMPTY) {
      resultInfo.resultCode = ResultCode.SUCCESS;
    }
  
    let payLogInfo: udo.UserPayLogInfo;
    if(payLogList.length > 0) {
        for (let userRecord of payLogList) {
            payLogInfo = convertDBRecordToUserPayLogInfo(userRecord,userNick);
          payLogInfoList.push(payLogInfo);
        }
    }
    resultInfo.data = payLogInfoList;

    return resultInfo;
};

// 블랙리스트 조회
export const queryBlacklist = async(sqlDataManager:SQLDataManager, reqQueryBlacklistInfo:udo.ReqQueryBlacklistInfo, queryNum:number):Promise<any> => {

    let pNo = reqQueryBlacklistInfo.pageNo;
    if (reqQueryBlacklistInfo.pageNo < 1) {
      pNo = 1;
    }
  
    console.log('----> reqQueryBlacklistInfo.queryFilterInfo=',reqQueryBlacklistInfo.queryFilterInfo);
  
    let whereField = ``;
    if (reqQueryBlacklistInfo.queryFilterInfo.titleKeyword != '') {
      whereField = `where user_id='${reqQueryBlacklistInfo.queryFilterInfo.titleKeyword}'`;
    }
  
    let whereField1 = '';
    let whereField2 = '';
  
    if (reqQueryBlacklistInfo.queryFilterInfo.filterStartTime !== null || reqQueryBlacklistInfo.queryFilterInfo.filterEndTime !== null) {
      let startDate = '1900-01-01 00:00:00';
      let endDate = '2099-12-30 00:00:00';
  
      if (reqQueryBlacklistInfo.queryFilterInfo.filterStartTime !== null) {
        startDate = reqQueryBlacklistInfo.queryFilterInfo.filterStartTime;
      }
  
      if (reqQueryBlacklistInfo.queryFilterInfo.filterEndTime !== null) {
        endDate = reqQueryBlacklistInfo.queryFilterInfo.filterEndTime;
      }

      if(whereField != '') {
        whereField2 = `and register_time between '${startDate}' and '${endDate}'`;
      } else {
        whereField2 = `where register_time between '${startDate}' and '${endDate}'`;
      }
    }
  
    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.blacklist_info ${whereField} ${whereField1} ${whereField2} order by register_time desc limit ${queryNum} offset ${(pNo - 1) * queryNum}`;
  
    const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);
  
    let userList: any[] = [];
    if (resultInfo.data !== null && resultInfo.data.length > 0) {
        userList = [...resultInfo.data];
    }
  
    if (resultInfo.resultCode === ResultCode.DB_QUERY_EMPTY) {
      resultInfo.resultCode = ResultCode.SUCCESS;
    }
  
    let userInfoList: udo.BlacklistUserInfo[] = [];
    let userInfo: udo.BlacklistUserInfo;
    for (let userRecord of userList) {
        userInfo = convertDBRecordToBlacklistUserInfo(userRecord);
        userInfoList.push(userInfo);
    }
    resultInfo.data = userInfoList;
  
    //console.log('resultInfo:', resultInfo);
  
    return resultInfo;
};

// 블랙리스트에 등록
export const addToBlacklist = async(sqlDataManager:SQLDataManager, reqAddUserToBlacklistInfo:udo.ReqAddUserToBlacklistInfo):Promise<any> => {

    const fieldNameList = `(user_id,register_time,duration,autorelease_flag,data,reason)`;
    const dbmsInfo = sqlDataManager.getDBMSInfo();

    let sqlStatements = ``;
    for(let userID of reqAddUserToBlacklistInfo.userIDList) {
        sqlStatements += `insert into ${dbmsInfo.defaultDatabase}.blacklist_info ${fieldNameList} values ('${userID}','${Utils.getStdNowString()}',${reqAddUserToBlacklistInfo.duration},${reqAddUserToBlacklistInfo.autoReleaseFlag===true?1:0},'${reqAddUserToBlacklistInfo.userData}', '${reqAddUserToBlacklistInfo.reason}');`;
    }
    let resultInfo:ResultInfo = await sqlDataManager.querySQL(sqlStatements,null);

    return resultInfo;
};

// 블랙리스트로 부터 해제
export const releaseFromBlacklist = async (sqlDataManager: SQLDataManager, reqReleaseUserFromBlacklist: udo.ReqReleaseUserFromBlacklistInfo): Promise<any> => {
      
    const dbmsInfo = sqlDataManager.getDBMSInfo();
    let sqlStatements = ``;
    for(let userID of reqReleaseUserFromBlacklist.userIDList) {
        sqlStatements +=`delete from ${dbmsInfo.defaultDatabase}.blacklist_info where user_id='${userID}';`;
    }
  
    let resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);
  
    return resultInfo;
  };

// 유저 보상항목 등록
export const registerDBNewRewardToInbox = async (sqlDataManager:SQLDataManager, reqGiveRewardToUserGroupInfo:udo.ReqGiveRewardToUserGroupInfo):Promise<any> => {

    let fieldNVList = `target_type=${reqGiveRewardToUserGroupInfo.filterTargetType},`;

    let deviceType = bdo.DEVICE_TYPE_ALL;
    let userIDList = null;
    if(reqGiveRewardToUserGroupInfo.filterTargetType === udo.INBOX_TARGETTYPE_BYDEVICE) {
        deviceType = reqGiveRewardToUserGroupInfo.deviceType;
    } else if(reqGiveRewardToUserGroupInfo.filterTargetType === udo.INBOX_TARGETTYPE_USERGROUP) {
        userIDList = JSON.stringify(reqGiveRewardToUserGroupInfo.userIDList);
    }
    
    const fieldNameList = `(target_type,device_type,user_id_group,title,content,reward_data,expire_time)`;
    const fieldValueList = [reqGiveRewardToUserGroupInfo.filterTargetType,deviceType,userIDList,reqGiveRewardToUserGroupInfo.title,reqGiveRewardToUserGroupInfo.content,reqGiveRewardToUserGroupInfo.rewardData,reqGiveRewardToUserGroupInfo.expireTime];
    const dbmsInfo = sqlDataManager.getDBMSInfo();

    let sqlStatements = `insert into ${dbmsInfo.defaultDatabase}.notification_info ${fieldNameList} values ?`;
    let resultInfo:ResultInfo = await sqlDataManager.querySQL(sqlStatements,fieldValueList);

    return resultInfo;
};

