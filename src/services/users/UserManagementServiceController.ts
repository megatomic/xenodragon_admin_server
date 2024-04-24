import {Request, Response, NextFunction, Router} from 'express';
import scheduler from 'src/services/common/Scheduler';
import {ResultCode,ResultInfo,ReqValidationErrorMsg} from 'src/common/ResponseManager';
import {DBSOURCE_ADMIN,DBSOURCE_GAMESERVER,getSQLDataManager} from 'src/common/db/DataManagerFactory';
import * as userDataHandler from './UserManagementServiceDataHandler';
import * as accountDataHandler from 'src/services/accounts/AccountServiceDataHandler';
import * as cmnSvcProcessor from 'src/services/common/CommonServiceProcessor';
import * as serviceLogger from 'src/services/common/ServiceLogger';
import SQLDataManager from 'src/common/db/SQLDataManager';
import ReqBaseInfo from 'src/services/common/BaseDataObject';
import * as ado from 'src/services/accounts/AccountDataObject';
import * as udo from 'src/services/users/UserManagementDataObject';
import * as aclManager from 'src/services/common/AdminACLManager';
import * as activityType from 'src/services/common/AdminActivityType';

import dayjs from 'dayjs';

require('dotenv').config();

const router = Router();

// 기간이 만료되면 자동으로 블랙리스트에서 해제시킴.
const scheduleJobFunc = async (param:any) => {

    const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,param.serverType);

    const adminID = param.adminID;
    const userIDList = param.data;
    const reqReleaseUserFromBlacklistInfo:udo.ReqReleaseUserFromBlacklistInfo = {adminID:'',authToken:'',serverType:'',userIDList:userIDList};

    const dbUpdateInfo = await userDataHandler.releaseFromBlacklist(sqlDataManager,reqReleaseUserFromBlacklistInfo);
    if(dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
        serviceLogger.logError('BLACKLIST_RELEASE',adminID,`DB ERROR::can't release user from blacklist(userIDList=${userIDList}`);
    }

    // 블랙리스트 해제 로그를 DB에 저장
    const logDetailInfo:string = `{"userIDList":${JSON.stringify(reqReleaseUserFromBlacklistInfo.userIDList)}, autoReleaseFlag:true`;
    await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqReleaseUserFromBlacklistInfo.adminID,activityType.ADMINACTIVITY_TYPE_USER_RELEASEFROMBLACKLIST,logDetailInfo);
  };
  
  scheduler.restartAllJobs('user',scheduleJobFunc);

// 토큰 유효성과 요청을 실행할 권한이 있는지 체크하는 함수
async function preprocessNotificationRequest(req:Request, res:Response, sqlDataManager:SQLDataManager, reqInfo:ReqBaseInfo, policyKey:string):Promise<any> {

    // JWT 토큰이 유효한지 체크. 유효하다면 새로 갱신
    let resultInfo = await cmnSvcProcessor.verifyAndIssueJwt(req,res, sqlDataManager,<string>reqInfo.adminID,<string>reqInfo.authToken);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }

    // DB로부터 계정 조회
    resultInfo = await accountDataHandler.queryDBAccount(sqlDataManager,reqInfo.adminID);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }

    const loginAccountInfo: ado.AccountInfo = resultInfo.data;
    
    // 로그인 유저가 policyType 권한이 있는지 체크
    if(aclManager.checkAccessibleWithACL(loginAccountInfo.aclInfo,policyKey) === false) {
        resultInfo.resultCode = ResultCode.ACL_USER_NOT_AUTHORIZED;
        resultInfo.message = ReqValidationErrorMsg[ResultCode.ACL_USER_NOT_AUTHORIZED.toString()];
    }

    return resultInfo;
}


// 유저 목록 조회
const queryUserList = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] queryUserList()");
    

    
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await udo.convertReqParamToSearchUserInfo(req);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,null)
        return;
    }
    const reqSearchUserInfo:udo.ReqSearchUserInfo = resultInfo.data;

    const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqSearchUserInfo.serverType);

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqSearchUserInfo, aclManager.ACL_POLICY_USER_VIEWLIST);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
        return;
    }

    const loginAccountInfo:ado.AccountInfo = resultInfo.data;

    // 입력값으로 매칭되는 사용자를 DB에서 검색
    const dbQueryInfo = await userDataHandler.queryDBUserList(sqlDataManager,reqSearchUserInfo,parseInt(<string>process.env.QUERY_NUM_PERPAGE));
    if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
        return;
    }

    // 유저목록 조회 활동로그 DB에 저장
    const logDetailInfo:string = `{"userType":${reqSearchUserInfo.userType}, "searchType":${reqSearchUserInfo.searchType}, "searchText":${reqSearchUserInfo.searchText}}`;
    await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqSearchUserInfo.adminID,activityType.ADMINACTIVITY_TYPE_USER_VIEWLIST,logDetailInfo);

    cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);

    serviceLogger.logDebug("##### [END] queryUserList()");
};
router.get('/list', queryUserList);

// 유저 게임플레이 정보 조회
const getUserPlayInfo = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] getUserPlayInfo()");
    

    
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await udo.convertReqParamToUserPlayInfo(req);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,null)
        return;
    }
    const reqUserPlayInfo:udo.ReqUserPlayInfo = resultInfo.data;

    const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqUserPlayInfo.serverType);

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqUserPlayInfo, aclManager.ACL_POLICY_USER_VIEWDETAIL);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
        return;
    }

    const loginAccountInfo:ado.AccountInfo = resultInfo.data;

    // 해당 유저의 게임플레이 정보를 DB에서 조회
    const dbQueryInfo = await userDataHandler.queryDBUserPlayInfo(sqlDataManager,reqUserPlayInfo);
    if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
        return;
    }

    // 유저상세정보 조회 활동로그 DB에 저장
    const logDetailInfo:string = `{"targetUserID":${reqUserPlayInfo.targetUserID}}`;
    await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqUserPlayInfo.adminID,activityType.ADMINACTIVITY_TYPE_USER_VIEWDETAIL,logDetailInfo);

    cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);

    serviceLogger.logDebug("##### [END] getUserPlayInfo()");
};
router.get('/playinfo', getUserPlayInfo);

// 유저 활동로그 조회
const queryUserActivityLogs = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] queryUserActivityLogs()");
    
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await udo.convertReqParamToUserActLogsInfo(req);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,null)
        return;
    }
    const reqUserActLogsInfo:udo.ReqQueryUserActLogsInfo = resultInfo.data;

    const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqUserActLogsInfo.serverType);
    const sqlDataManager2:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_GAMESERVER,reqUserActLogsInfo.serverType);

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqUserActLogsInfo, aclManager.ACL_POLICY_USER_VIEWDETAIL);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
        cmnSvcProcessor.releaseDataManager(sqlDataManager2);
        return;
    }

    const loginAccountInfo:ado.AccountInfo = resultInfo.data;

    // 게임DB에서 해당 유저의 활동로그 조회
    const dbQueryInfo = await userDataHandler.queryDBUserActLogList(sqlDataManager2,reqUserActLogsInfo.queryFilterInfo.userKeyword,reqUserActLogsInfo.queryFilterInfo.filterItemType,reqUserActLogsInfo.queryFilterInfo.filterActionCase,reqUserActLogsInfo.queryFilterInfo.filterDurationType,reqUserActLogsInfo.pageNo,reqUserActLogsInfo.queryNum);
    if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
        cmnSvcProcessor.releaseDataManager(sqlDataManager2);
        return;
    }

    // 유저목록 조회 활동로그 DB에 저장
    // const logDetailInfo:string = `{"userType":${reqSearchUserInfo.userType}, "searchType":${reqSearchUserInfo.searchType}, "searchText":${reqSearchUserInfo.searchText}}`;
    // cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqSearchUserInfo.adminID,activityType.ADMINACTIVITY_TYPE_USER_VIEWLIST,logDetailInfo);

    cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
    cmnSvcProcessor.releaseDataManager(sqlDataManager2);

    serviceLogger.logDebug("##### [END] queryUserActivityLogs()");
};
router.post('/query/useractlog', queryUserActivityLogs);

// 유저 결제정보 조회
const queryUserPayLogs = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] queryUserPayLogs()");
    
    
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await udo.convertReqParamToUserPayLogsInfo(req);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,null)
        return;
    }
    const reqUserPayLogsInfo:udo.ReqQueryUserPayLogsInfo = resultInfo.data;

    const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqUserPayLogsInfo.serverType);
    const sqlDataManager2:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_GAMESERVER,reqUserPayLogsInfo.serverType);

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqUserPayLogsInfo, aclManager.ACL_POLICY_USER_PAYLOG_VIEWLIST);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
        cmnSvcProcessor.releaseDataManager(sqlDataManager2);
        return;
    }

    const loginAccountInfo:ado.AccountInfo = resultInfo.data;

    // 게임DB에서 해당 유저의 결제로그 조회
    const dbQueryInfo = await userDataHandler.queryDBUserPayLogList(sqlDataManager2,reqUserPayLogsInfo.queryFilterInfo.userKeyword,100);
    if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
        cmnSvcProcessor.releaseDataManager(sqlDataManager2);
        return;
    }

    // 유저목록 조회 활동로그 DB에 저장
    // const logDetailInfo:string = `{"userType":${reqSearchUserInfo.userType}, "searchType":${reqSearchUserInfo.searchType}, "searchText":${reqSearchUserInfo.searchText}}`;
    // cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqSearchUserInfo.adminID,activityType.ADMINACTIVITY_TYPE_USER_VIEWLIST,logDetailInfo);

    cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
    cmnSvcProcessor.releaseDataManager(sqlDataManager2);

    serviceLogger.logDebug("##### [END] queryUserPayLogs()");
};
router.post('/query/userpaylog', queryUserPayLogs);


// 블랙리스트 조회
const queryBlacklist = async (req:Request, res:Response) => {
    
    serviceLogger.logDebug("##### [START] queryBlacklist()");
    

    
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await udo.convertReqParamToQueryBlacklist(req);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,null)
        return;
    }
    const reqQueryBlacklistInfo:udo.ReqQueryBlacklistInfo = resultInfo.data;

    const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqQueryBlacklistInfo.serverType);

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqQueryBlacklistInfo, aclManager.ACL_POLICY_ALL);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
        return;
    }

    const loginAccountInfo:ado.AccountInfo = resultInfo.data;

    // 입력값으로 매칭되는 사용자를 DB에서 검색
    const dbQueryInfo = await userDataHandler.queryBlacklist(sqlDataManager,reqQueryBlacklistInfo,parseInt(<string>process.env.QUERY_NUM_PERPAGE));
    if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
        return;
    }

    // 유저목록 조회 활동로그 DB에 저장
    // const logDetailInfo:string = `{"userType":${reqSearchUserInfo.userType}, "searchType":${reqSearchUserInfo.searchType}, "searchText":${reqSearchUserInfo.searchText}}`;
    // cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqSearchUserInfo.adminID,activityType.ADMINACTIVITY_TYPE_USER_VIEWLIST,logDetailInfo);

    cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);

    serviceLogger.logDebug("##### [END] queryBlacklist()");
};
router.get('/blacklist/list', queryBlacklist);


// 특정 유저(들)을 블랙리스트로 등록
const registerUserToBlacklist = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] registerUserToBlacklist()");
    

    
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await udo.convertReqParamToAddUserToBlacklist(req);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,null)
        return;
    }
    const reqAddUserToBlacklistInfo:udo.ReqAddUserToBlacklistInfo = resultInfo.data;

    const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqAddUserToBlacklistInfo.serverType);

    //console.log('---> result.data=',resultInfo.data,',reqAddUserToBlacklistInfo=',reqAddUserToBlacklistInfo);

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqAddUserToBlacklistInfo, aclManager.ACL_POLICY_USER_MANAGEBLACKLIST);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
        return;
    }

    const loginAccountInfo:ado.AccountInfo = resultInfo.data;

    // 해당 유저(들)을 블랙리스트로 DB에 저장
    const dbUpdateInfo = await userDataHandler.addToBlacklist(sqlDataManager,reqAddUserToBlacklistInfo);
    if(dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);
        return;
    }

    // 블랙리스트해제가 자동이면, 스케쥴러 작동!!
    if(reqAddUserToBlacklistInfo.autoReleaseFlag === true) {
        for(let userID of reqAddUserToBlacklistInfo.userIDList) {
            const date = dayjs().add(reqAddUserToBlacklistInfo.duration,'hour').toDate();
            scheduler.addJob(`user-blacklist-${userID}`,date,scheduleJobFunc,{adminID:reqAddUserToBlacklistInfo.adminID,serverType:reqAddUserToBlacklistInfo.serverType,data:reqAddUserToBlacklistInfo.userIDList});
        }
      }

    // 블랙리스트 등록 로그를 DB에 저장
    const logDetailInfo:string = `{"userIDList":${JSON.stringify(reqAddUserToBlacklistInfo.userIDList)},"duration":${reqAddUserToBlacklistInfo.duration}},"autoReleaseFlag":${reqAddUserToBlacklistInfo.autoReleaseFlag}`;
    await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqAddUserToBlacklistInfo.adminID,activityType.ADMINACTIVITY_TYPE_USER_ADDTOBLACKLIST,logDetailInfo);

    cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);

    serviceLogger.logDebug("##### [END] registerUserToBlacklist()");
};
router.get('/blacklist/register', registerUserToBlacklist);

// 특정 유저(들)을 블랙리스트에서 해제
const releaseUserFromBlacklist = async (req:Request, res:Response) => {
    serviceLogger.logDebug("##### [START] releaseUserFromBlacklist()");
    

    
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await udo.convertReqParamToReleaseUserFromBlacklist(req);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,null)
        return;
    }
    const reqReleaseUserFromBlacklistInfo:udo.ReqReleaseUserFromBlacklistInfo = resultInfo.data;

    const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqReleaseUserFromBlacklistInfo.serverType);

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqReleaseUserFromBlacklistInfo, aclManager.ACL_POLICY_USER_MANAGEBLACKLIST);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
        return;
    }

    const loginAccountInfo:ado.AccountInfo = resultInfo.data;

    // 해당 유저(들)을 블랙리스트로 DB에 저장
    const dbUpdateInfo = await userDataHandler.releaseFromBlacklist(sqlDataManager,reqReleaseUserFromBlacklistInfo);
    if(dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);
        return;
    }

    // 블랙리스트 등록 로그를 DB에 저장
    const logDetailInfo:string = `{"userIDList":${JSON.stringify(reqReleaseUserFromBlacklistInfo.userIDList)}`;
    await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqReleaseUserFromBlacklistInfo.adminID,activityType.ADMINACTIVITY_TYPE_USER_RELEASEFROMBLACKLIST,logDetailInfo);

    cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);

    serviceLogger.logDebug("##### [END] releaseUserFromBlacklist()");
};
router.get('/blacklist/release', releaseUserFromBlacklist);

// 유저 개별보상 지급
const giveRewardToUserGroup = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] giveRewardToUserGroup()");
    


    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await udo.convertReqParamToRewardToUserGroup(req);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,null)
        return;
    }
    const reqGiveRewardToUserGroupInfo:udo.ReqGiveRewardToUserGroupInfo = resultInfo.data;

    const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqGiveRewardToUserGroupInfo.serverType);

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqGiveRewardToUserGroupInfo, aclManager.ACL_POLICY_USER_REWARDTOUSERGROUP);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
        return;
    }

    const loginAccountInfo:ado.AccountInfo = resultInfo.data;

    // 새 공지사항 추가
    const dbUpdateInfo = await userDataHandler.registerDBNewRewardToInbox(sqlDataManager,reqGiveRewardToUserGroupInfo);
    if(dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);
        return;
    }

    // 보상등록 활동로그 DB에 저장
    // const logDetailInfo:string = `{"eventType":${reqRegisterEventInfo.eventType},"title":${reqRegisterEventInfo.title},"content":${reqRegisterEventInfo.content},"reservedEvent":${reqRegisterEventInfo.reservedEvent},"startTime":${reqRegisterEventInfo.startTime},"endTime":${reqRegisterEventInfo.endTime},"data":${reqRegisterEventInfo.data},"activiationFlag":${reqRegisterEventInfo.activationFlag}}`;
    // cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqGiveRewardToUserGroupInfo.adminID,activityType.ADMINACTIVITY_TYPE_USER_REWARDTOUSERGROUP,logDetailInfo);

    cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);

    serviceLogger.logDebug("##### [END] giveRewardToUserGroup()");
};
router.get('/rewardtouser', giveRewardToUserGroup);

// 유저 게임플레이 정보 수정
const updateUserPlayInfo = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] updateUserPlayInfo()");
    
    
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await udo.convertReqParamToUpdateUserPlayStat(req);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,null)
        return;
    }
    const reqUpdateUserPlayStat:udo.ReqUpdateUserPlayStat = resultInfo.data;

    const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqUpdateUserPlayStat.serverType);

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqUpdateUserPlayStat, aclManager.ACL_POLICY_USER_UPDATE);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
        return;
    }

    const loginAccountInfo:ado.AccountInfo = resultInfo.data;

    // 해당 유저의 수정된 게임플레이 정보를 DB에 저장
    const dbUpdateInfo = await userDataHandler.updateDBUserPlayStat(sqlDataManager,reqUpdateUserPlayStat);
    if(dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);
        return;
    }

    // 유저정보 수정 활동로그 DB에 저장
    let playStatList = '';
    for(let kv of reqUpdateUserPlayStat.userPlayStatList) {
        playStatList += `${kv.playStatKey}=${kv.playStatValue} `;
    }

    const logDetailInfo:string = `{"playStatList":${playStatList}}`;
    await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqUpdateUserPlayStat.adminID,activityType.ADMINACTIVITY_TYPE_USER_UPDATE,logDetailInfo);

    cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);

    serviceLogger.logDebug("##### [END] updateUserPlayInfo()");
};
router.get('/updateplayinfo', updateUserPlayInfo);

export default router;