import { Request, Response, NextFunction, Router } from 'express';
import axios from 'axios';

import scheduler from 'src/services/common/Scheduler';
import { ResultCode, ResultInfo, getResultForm, ReqValidationErrorMsg } from 'src/common/ResponseManager';
import {DBSOURCE_ADMIN,DBSOURCE_GAMESERVER,getSQLDataManager} from 'src/common/db/DataManagerFactory';
import * as notiDataHandler from './NotificationServiceDataHandler';
import * as accountDataHandler from 'src/services/accounts/AccountServiceDataHandler';
import * as cmnSvcProcessor from 'src/services/common/CommonServiceProcessor';
import * as serviceLogger from 'src/services/common/ServiceLogger';
import SQLDataManager from 'src/common/db/SQLDataManager';
import ReqBaseInfo from 'src/services/common/BaseDataObject';
import * as ado from 'src/services/accounts/AccountDataObject';
import * as ndo from 'src/services/notifications/NotificationDataObject';
import * as aclManager from 'src/services/common/AdminACLManager';
import * as activityType from 'src/services/common/AdminActivityType';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { bool } from 'aws-sdk/clients/signer';

dayjs.extend(utc);

require('dotenv').config();

const router = Router();

const scheduleJobFunc = (param:any) => {
  console.log('----> 공지사항 전송됨:param=',param);
};

scheduler.restartAllJobs('notification',scheduleJobFunc);

// 토큰 유효성과 요청을 실행할 권한이 있는지 체크하는 함수
async function preprocessNotificationRequest(req: Request, res: Response, sqlDataManager: SQLDataManager, reqInfo: ReqBaseInfo, policyKey: string): Promise<any> {
  // JWT 토큰이 유효한지 체크. 유효하다면 새로 갱신
  let resultInfo = await cmnSvcProcessor.verifyAndIssueJwt(req, res, sqlDataManager, <string>reqInfo.adminID, <string>reqInfo.authToken);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  // DB로부터 계정 조회
  resultInfo = await accountDataHandler.queryDBAccount(sqlDataManager, reqInfo.adminID.trim());
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const loginAccountInfo: ado.AccountInfo = resultInfo.data; //ado.convertDBToAccountRecordInfo(resultInfo.data,false);

  //console.log('loginAccountInfo.aclInfo=',loginAccountInfo.aclInfo,',policyKey=',policyKey);

  // 로그인 유저가 policyType 권한이 있는지 체크
  if (aclManager.checkAccessibleWithACL(loginAccountInfo.aclInfo, policyKey) === false) {
    resultInfo.message = ReqValidationErrorMsg[ResultCode.ACL_USER_NOT_AUTHORIZED.toString()] + `(${policyKey})`;
    resultInfo.resultCode = ResultCode.ACL_USER_NOT_AUTHORIZED;
  }

  return resultInfo;
}

// 공지사항 조회
const queryNotificationList = async (req: Request, res: Response) => {
  serviceLogger.logDebug('##### [START] queryNotificationList()');

  try {
   // 요청 파라메터 유효성 체크 및 요청 객체로 변환
   let resultInfo = await ndo.convertReqParamToNotiListInfo(req);
   if (resultInfo.resultCode !== ResultCode.SUCCESS) {
     cmnSvcProcessor.sendResponse(res, resultInfo, null);
     return;
   }
   const reqNotiListInfo: ndo.ReqNotiListInfo = resultInfo.data;
 
   const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqNotiListInfo.serverType);
 
   // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
   resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqNotiListInfo, aclManager.ACL_POLICY_ALL);
   if (resultInfo.resultCode !== ResultCode.SUCCESS) {
     cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
     return;
   }
 
   const loginAccountInfo: ado.AccountInfo = resultInfo.data;
 
   // 공지사항 목록을 DB에서 조회
   const dbQueryInfo = await notiDataHandler.queryDBNotificationList(sqlDataManager, reqNotiListInfo, parseInt(<string>process.env.QUERY_NUM_PERPAGE));
   if (dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
     cmnSvcProcessor.sendResponse(res, dbQueryInfo, sqlDataManager);
     return;
   }
 
   // 공지사항 조회 활동로그 DB에 저장
   // const logDetailInfo: string = `{"notiType":${reqNotiListInfo.notiType}}`;
   // cmnSvcProcessor.writeDBActivityLog(sqlDataManager, reqNotiListInfo.adminID, activityType.ADMINACTIVITY_TYPE_NOTIFICATION_VIEWLIST, logDetailInfo);
 
   cmnSvcProcessor.sendResponse(res, dbQueryInfo, sqlDataManager);

  } catch(err) {
    console.log(err);

    const resultInfo = {
        resultCode: ResultCode.SYSTEM_INTERNALERROR,
        message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
        data:err
    };

    cmnSvcProcessor.sendResponse(res,resultInfo,null);
  }

  serviceLogger.logDebug('##### [END] queryNotificationList()');
};
router.get('/list', queryNotificationList);

// 게임서버로 공지사항 전송하기
const sendNotificationToGameserver = async (serverType:string,notiID:number,dataType:number,notiType:number,titleTable:any,bodyTable:any,closeable:bool,startTime:string,endTime:string) => {

  try {
    const notiList = [];
    const notiInfo = {
      "NoticeNo":notiID,
      "NoticeType":notiType,
      "DataType":dataType,
      "Title":"",
      "Body":"",
      "CloseAble":closeable,
      "ImageUrl":"",
      "LanguageId":0,
      "NoticeBegin": startTime,
      "NoticeEnd": endTime
    };

    let targetURL = cmnSvcProcessor.getGameServerURL(serverType,'/Resource/Notices/Writes');

    for(let i=0;i<titleTable.length;i++) {
      notiInfo.Title = titleTable[i].content;
      notiInfo.Body = bodyTable[i].content;
      notiInfo.LanguageId = bodyTable[i].langCode;
      notiList.push({...notiInfo});
    }

    console.log('[GAME SERVER] notiList=',notiList);
    console.log('[GAME SERVER] targetURL=',targetURL);

    const res = await axios.post(targetURL,notiList,{ headers: {'Content-type': 'application/json'} });

    console.log('[GAME SERVER] response=',res);
    return true;
    
  } catch(err) {
    console.log(err);

    return false;
  }
};


// 새 공지사항 등록
const registerNewNotification = async (req: Request, res: Response) => {
  serviceLogger.logDebug('##### [START] registerNewNotification()');

  try {
  // 요청 파라메터 유효성 체크 및 요청 객체로 변환
  let resultInfo = await ndo.convertReqParamToNewNotiInfo(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    cmnSvcProcessor.sendResponse(res, resultInfo, null);
    return;
  }
  const reqNewNotiInfo: ndo.ReqNewNotiInfo = resultInfo.data;

  const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqNewNotiInfo.serverType);

  // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
  resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqNewNotiInfo, aclManager.ACL_POLICY_NOTIFICATION_LINESCROLL_REGISTER);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
    return;
  }

  const loginAccountInfo: ado.AccountInfo = resultInfo.data;

  // 새 공지사항 추가
  const dbUpdateInfo = await notiDataHandler.registerDBNewNotification(sqlDataManager, reqNewNotiInfo);
  if (dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
    cmnSvcProcessor.sendResponse(res, dbUpdateInfo, sqlDataManager);
    return;
  }
  
  // 게임서버에 공지사항 전송하기
  const startTime = reqNewNotiInfo.startTime;
  const endTime = reqNewNotiInfo.endTime;
  const startTimeUTC = dayjs(reqNewNotiInfo.startTime.trim()).utc().format();
  const endTimeUTC = dayjs(reqNewNotiInfo.endTime.trim()).utc().format();

  console.log(`[NEW] startTime=${startTime}, startTimeUTC=${startTimeUTC}, endTime=${endTime}, endTimeUTC=${endTimeUTC}`);

  const result1 = await sendNotificationToGameserver(
        reqNewNotiInfo.serverType,
        dbUpdateInfo.data.insertId,
        reqNewNotiInfo.dataType,
        (reqNewNotiInfo.notiType === ndo.NOTIFICATION_TYPE_LOBBY?1:2),
        reqNewNotiInfo.titleTable,
        reqNewNotiInfo.contentTable,
        reqNewNotiInfo.notShowAgainFlag,
        startTimeUTC,
        endTimeUTC
  );

  if(result1 === false) {
    resultInfo.resultCode = ResultCode.NOTI_SENDNEWNOTI_SENDNOTITOGAMESERVER_FAILED;
    resultInfo.message = ReqValidationErrorMsg[ResultCode.NOTI_SENDNEWNOTI_SENDNOTITOGAMESERVER_FAILED.toString()];
    cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
    return;
  }

  // 새 공지사항 등록 활동로그 DB에 저장
  const logDetailInfo: string = `{"creatorID":${reqNewNotiInfo.adminID},"notiType":${reqNewNotiInfo.notiType},"title":${cmnSvcProcessor.escapeSpecialCharsForJSON(JSON.stringify(reqNewNotiInfo.titleTable))},"content":${cmnSvcProcessor.escapeSpecialCharsForJSON(JSON.stringify(reqNewNotiInfo.contentTable))},"activationFlag":${reqNewNotiInfo.activationFlag}}`;
  await cmnSvcProcessor.writeDBActivityLog(sqlDataManager, reqNewNotiInfo.adminID, activityType.ADMINACTIVITY_TYPE_NOTIFICATION_NEW, logDetailInfo);

  cmnSvcProcessor.sendResponse(res, dbUpdateInfo, sqlDataManager);

  } catch(err) {
    console.log(err);

    const resultInfo = {
        resultCode: ResultCode.SYSTEM_INTERNALERROR,
        message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
        data:err
    };

    cmnSvcProcessor.sendResponse(res,resultInfo,null);
  }

  serviceLogger.logDebug('##### [END] registerNewNotification()');
};
router.post('/new', registerNewNotification);

// 공지사항 수정
const updateNotification = async (req: Request, res: Response) => {
  serviceLogger.logDebug('##### [START] updateNotification()');

  try {
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await ndo.convertReqParamToUpdateNotiInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, null);
      return;
    }
    const reqUpdateNotiInfo: ndo.ReqUpdateNotiInfo = resultInfo.data;

    console.log('reqUpdateNotiInfo=',reqUpdateNotiInfo);

    const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqUpdateNotiInfo.serverType);

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqUpdateNotiInfo, aclManager.ACL_POLICY_NOTIFICATION_LINESCROLL_REGISTER);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    const loginAccountInfo: ado.AccountInfo = resultInfo.data;

    // 공지사항 수정
    const dbUpdateInfo = await notiDataHandler.updateDBNotification(sqlDataManager, reqUpdateNotiInfo);
    if (dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, dbUpdateInfo, sqlDataManager);
      return;
    }

    //console.log('dbUpdateInfo=',dbUpdateInfo);

      // 게임서버에 공지사항 전송하기
      const startTime = reqUpdateNotiInfo.startTime;
      const endTime = reqUpdateNotiInfo.endTime;
      const startTimeUTC = dayjs(reqUpdateNotiInfo.startTime.trim()).utc().format();
      const endTimeUTC = dayjs(reqUpdateNotiInfo.endTime.trim()).utc().format();

      console.log(`[UPDATE] startTime=${startTime}, startTimeUTC=${startTimeUTC}, endTime=${endTime}, endTimeUTC=${endTimeUTC}`);

      const result1 = await sendNotificationToGameserver(
        reqUpdateNotiInfo.serverType,
        reqUpdateNotiInfo.notiID,
        reqUpdateNotiInfo.dataType,
        (reqUpdateNotiInfo.notiType === ndo.NOTIFICATION_TYPE_LOBBY?1:2),
        reqUpdateNotiInfo.titleTable,
        reqUpdateNotiInfo.contentTable,
        reqUpdateNotiInfo.notShowAgainFlag,
        startTimeUTC,
        endTimeUTC
      );

      if(result1 === false) {
        resultInfo.resultCode = ResultCode.NOTI_UPDATENOTI_UPDATENOTITOGAMESERVER_FAILED;
        resultInfo.message = ReqValidationErrorMsg[ResultCode.NOTI_UPDATENOTI_UPDATENOTITOGAMESERVER_FAILED.toString()];
        cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
        return;
      }

    // 공지사항 수정 활동로그 DB에 저장
    const logDetailInfo: string = `{"notiID":${reqUpdateNotiInfo.notiID},"title":${JSON.stringify(reqUpdateNotiInfo.titleTable)},"content":${JSON.stringify(reqUpdateNotiInfo.contentTable)},"activationFlag":${reqUpdateNotiInfo.activationFlag}}`;
    await cmnSvcProcessor.writeDBActivityLog(sqlDataManager, reqUpdateNotiInfo.adminID, activityType.ADMINACTIVITY_TYPE_NOTIFICATION_UPDATE, logDetailInfo);

    cmnSvcProcessor.sendResponse(res, dbUpdateInfo, sqlDataManager);

  } catch(err) {
    console.log(err);

    const resultInfo = {
        resultCode: ResultCode.SYSTEM_INTERNALERROR,
        message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
        data:err
    };

    cmnSvcProcessor.sendResponse(res,resultInfo,null);
  }

  serviceLogger.logDebug('##### [END] updateNotification()');
};
router.post('/update', updateNotification);

const checkIfNotificationOnAirExists = (notificationList: ndo.NotificationInfo[]): ResultInfo => {
  let resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
  let startDate;
  let endDate;
  for (let notiInfo of notificationList) {
    startDate = dayjs(notiInfo.startTime);
    endDate = dayjs(notiInfo.endTime);
    if (startDate.isBefore(dayjs()) === true && endDate.isAfter(dayjs()) === true) {
      resultInfo.resultCode = ResultCode.NOTI_DELETE_ONAIRNOTI_NOTALLOWED;
      resultInfo.message = ReqValidationErrorMsg[ResultCode.NOTI_DELETE_ONAIRNOTI_NOTALLOWED.toString()];
      break;
    }
  }

  return resultInfo;
};

// 공지사항 삭제
const deleteNotifications = async (req: Request, res: Response) => {
  serviceLogger.logDebug('##### [START] deleteNotifications()');

  try {
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await ndo.convertReqParamToDeleteNotificationsInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, null);
      return;
    }
    const reqDeleteNotificationsInfo: ndo.ReqDeleteNotificationsInfo = resultInfo.data;

    const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqDeleteNotificationsInfo.serverType);

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqDeleteNotificationsInfo, aclManager.ACL_POLICY_NOTIFICATION_LINESCROLL_DELETE);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    const loginAccountInfo: ado.AccountInfo = resultInfo.data;

    // 공지사항 목록을 DB에서 조회
    const reqNotiListInfo: ndo.ReqNotiListInfo = resultInfo.data;
    const dbQueryInfo = await notiDataHandler.queryDBNotiListForNotiIDs(sqlDataManager, reqDeleteNotificationsInfo.notiIDList, parseInt(<string>process.env.QUERY_NUM_PERPAGE));
    if (dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, dbQueryInfo, sqlDataManager);
      return;
    }

    // 삭제요청된 항목중 공지중인 항목이 있는지 체크
    resultInfo = checkIfNotificationOnAirExists(dbQueryInfo.data);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    // 공지사항 삭제
    const dbUpdateInfo = await notiDataHandler.deleteDBNotifications(sqlDataManager, reqDeleteNotificationsInfo);
    if (dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, dbUpdateInfo, sqlDataManager);
      return;
    }

    // 게임서버에 공지사항 삭제 요청
    // try {
    //   const bodyInfo = [];
    //   for(let id of reqDeleteNotificationsInfo.notiIDList) {
    //     bodyInfo.push({"Id":id});
    //   }

    //   let targetURL = `${process.env.LOCAL_GAMESERVER_HOST}/Resource/Notices/Deletes`;
    //   if(reqDeleteNotificationsInfo.serverType === 'dev') {
    //     targetURL = `${process.env.REVIEW_GAMESERVER_HOST}/Resource/Notices/Deletes`;
    //   } else if(reqDeleteNotificationsInfo.serverType === 'live') {
    //     targetURL = `${process.env.LIVE_GAMESERVER_HOST}/Resource/Notices/Deletes`;
    //   }

    //   console.log('[GAME SERVER] bodyInfo=',bodyInfo);
    //   console.log('[GAME SERVER] targetURL=',targetURL);

    //   const res = await axios.post(targetURL,bodyInfo,{ headers: {'Content-type': 'application/json'} });

    //   console.log('[GAME SERVER] response=',res);
      
    // } catch(err) {
    //   console.log(err);

    //   resultInfo.resultCode = ResultCode.NOTI_DELETENOTI_DELETENOTITOGAMESERVER_FAILED;
    //   resultInfo.message = ReqValidationErrorMsg[ResultCode.NOTI_DELETENOTI_DELETENOTITOGAMESERVER_FAILED.toString()];
    //   cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
    //   return;
    // }

    // 공지사항 삭제 활동로그 DB에 저장
    let idList = '';
    for (let v of reqDeleteNotificationsInfo.notiIDList) {
      idList += v.toString() + ',';
    }
    const logDetailInfo: string = `{"notiIDList":${idList}}`;
    await cmnSvcProcessor.writeDBActivityLog(sqlDataManager, reqDeleteNotificationsInfo.adminID, activityType.ADMINACTIVITY_TYPE_NOTIFICATION_DELETE, logDetailInfo);

    cmnSvcProcessor.sendResponse(res, dbUpdateInfo, sqlDataManager);

  } catch(err) {
    console.log(err);

    const resultInfo = {
        resultCode: ResultCode.SYSTEM_INTERNALERROR,
        message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
        data:err
    };

    cmnSvcProcessor.sendResponse(res,resultInfo,null);
  }

  serviceLogger.logDebug('##### [END] deleteNotifications()');
};
router.post('/delete', deleteNotifications);

// 공지사항 활성화/비활성화
const updateNotificationActivation = async (req: Request, res: Response) => {
  serviceLogger.logDebug('##### [START] updateNotificationActivation()');

  try {
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await ndo.convertReqParamToNotificationActivationInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, null);
      return;
    }
    const reqEventActivationInfo: ndo.ReqNotificationActivationInfo = resultInfo.data;

    const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqEventActivationInfo.serverType);

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(req, res, sqlDataManager, reqEventActivationInfo, aclManager.ACL_POLICY_NOTIFICATION_LINESCROLL_REGISTER);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    const loginAccountInfo: ado.AccountInfo = resultInfo.data;

    // 공지사항 수정
    const dbUpdateInfo = await notiDataHandler.updateDBNotificationActivation(sqlDataManager, reqEventActivationInfo);
    if (dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, dbUpdateInfo, sqlDataManager);
      return;
    }

    // 공지사항 활성화/비활성화 활동로그 DB에 저장
    const logDetailInfo: string = `{"notiID":${reqEventActivationInfo.notiID},"activationFlag":${reqEventActivationInfo.activationFlag}}`;
    await cmnSvcProcessor.writeDBActivityLog(sqlDataManager, reqEventActivationInfo.adminID, activityType.ADMINACTIVITY_TYPE_NOTIFICATION_ACTIVATION, logDetailInfo);

    cmnSvcProcessor.sendResponse(res, dbUpdateInfo, sqlDataManager);
    
  } catch(err) {
    console.log(err);

    const resultInfo = {
        resultCode: ResultCode.SYSTEM_INTERNALERROR,
        message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
        data:err
    };

    cmnSvcProcessor.sendResponse(res,resultInfo,null);
  }

  serviceLogger.logDebug('##### [END] updateNotificationActivation()');
};
router.get('/activation', updateNotificationActivation);

export default router;
