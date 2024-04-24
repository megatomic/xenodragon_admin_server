import {Request, Response, NextFunction, Router} from 'express';
import fs from 'fs';
import axios from 'axios';

import {ResultCode,ResultInfo,getResultForm,ReqValidationErrorMsg} from 'src/common/ResponseManager';
import {DBSOURCE_ADMIN,DBSOURCE_GAMESERVER,getSQLDataManager} from 'src/common/db/DataManagerFactory';
import * as eventDataHandler from './EventServiceDataHandler';
import * as accountDataHandler from 'src/services/accounts/AccountServiceDataHandler';
import * as cmnSvcProcessor from 'src/services/common/CommonServiceProcessor';
import * as serviceLogger from 'src/services/common/ServiceLogger';
import SQLDataManager from 'src/common/db/SQLDataManager';
import ReqBaseInfo from 'src/services/common/BaseDataObject';
import * as ado from 'src/services/accounts/AccountDataObject';
import * as edo from 'src/services/events/EventDataObject';
import * as aclManager from 'src/services/common/AdminACLManager';
import * as activityType from 'src/services/common/AdminActivityType';
import * as Utils from 'src/common/Utils';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { bool } from 'aws-sdk/clients/signer';
import { check } from 'express-validator';

dayjs.extend(utc);

require('dotenv').config();

const router = Router();


// 토큰 유효성과 요청을 실행할 권한이 있는지 체크하는 함수
async function preprocessEventRequest(req:Request, res:Response, sqlDataManager:SQLDataManager, reqInfo:ReqBaseInfo, policyKey:string):Promise<any> {

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
        resultInfo.message = ReqValidationErrorMsg[ResultCode.ACL_USER_NOT_AUTHORIZED.toString()];
        resultInfo.resultCode = ResultCode.ACL_USER_NOT_AUTHORIZED;
        resultInfo.data = {policyKey,aclInfo:loginAccountInfo.aclInfo};
        console.log('[ERROR] resultInfo=',resultInfo);
    }

    return resultInfo;
}


// 이벤트 목록 조회
const queryEventList = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] queryEventList()");

    try {
      // 요청 파라메터 유효성 체크 및 요청 객체로 변환
      let resultInfo = await edo.convertReqParamToLoginRewardEventListInfo(req);
      if(resultInfo.resultCode !== ResultCode.SUCCESS) {
          cmnSvcProcessor.sendResponse(res,resultInfo,null)
          return;
      }
      const reqEventListInfo:edo.ReqEventListInfo = resultInfo.data;

      const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqEventListInfo.serverType);

      // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
      resultInfo = await preprocessEventRequest(req, res, sqlDataManager, reqEventListInfo, aclManager.ACL_POLICY_ALL);
      if(resultInfo.resultCode !== ResultCode.SUCCESS) {
          cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
          return;
      }

      const loginAccountInfo:ado.AccountInfo = resultInfo.data;

      // DB에서 이벤트 목록 조회
      const dbQueryInfo = await eventDataHandler.queryDBEventList(sqlDataManager,reqEventListInfo,parseInt(<string>process.env.QUERY_NUM_PERPAGE));
      if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
          cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
          return;
      }

      // 이벤트 목록 조회 활동로그 DB에 저장
      // const logDetailInfo:string = `{"eventType":${reqEventListInfo.eventType},"queryFilterInfo":${reqEventListInfo.queryFilterInfo}}`;
      // cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqEventListInfo.adminID,activityType.ADMINACTIVITY_TYPE_EVENT_LOGINREWARD_NEW,logDetailInfo);

      cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);

    } catch(err) {
      console.log(err);

      const resultInfo = {
          resultCode: ResultCode.SYSTEM_INTERNALERROR,
          message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
          data:err
      };

      cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] queryEventList()");
};
router.get('/list', queryEventList);


// 게임서버로 프리메세지(접속보상) 전송하기
const sendPreMessageToGameserver = async (serverType:string,msgID:number,msgType:number,presetTitle:string,langPresetID:number,rewardPresetID:number,titleTable:any,bodyTable:any,startTime:string,endTime:string,rewardData:any) => {

    let resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
    try {
      const preMsgInfo = {
        "MessageType": msgType,
        "MessageName": presetTitle,
        "MessagePresetId": langPresetID,
        "RewardPresetId": rewardPresetID,
        "MessageBegin": startTime.replace(" ","T"),
        "MessageEnd": endTime.replace(" ","T")
     };

      let targetURL = cmnSvcProcessor.getGameServerURL(serverType,`/Resource/PreMessages/Write/${msgID}`);

      // const ENGLISH_LANG_CODE = 10;
      // const msgPresetLangTable = [];
      // let engTitle = "";
      // let engContent = "";
      // for(let i=0;i<titleTable.length;i++) {
      //   if(bodyTable[i].langCode === ENGLISH_LANG_CODE) { // 영어
      //     msgPresetLangTable.push({"LanguageId":bodyTable[i].langCode,"MessageSubject":titleTable[i].content,"MessageBody":bodyTable[i].content});
      //     engTitle = titleTable[i].content;
      //     engContent = bodyTable[i].content;
      //   } else if(titleTable[i].content.trim() !== "" && bodyTable[i].content.trim() !== "") {
      //     msgPresetLangTable.push({"LanguageId":bodyTable[i].langCode,"MessageSubject":titleTable[i].content,"MessageBody":bodyTable[i].content});
      //   }
      // }

      // // 만일 영어이외의 언어에 대해 제목/내용이 없다면 영어로 대체함.
      // for(let i=0;i<titleTable.length;i++) {
      //   if(bodyTable[i].langCode !== ENGLISH_LANG_CODE) {
      //     if(titleTable[i].content.trim() === "" || bodyTable[i].content.trim() === "") {
      //       msgPresetLangTable.push({"LanguageId":bodyTable[i].langCode,"MessageSubject":engTitle,"MessageBody":engContent});
      //     }
      //   }
      // }

      // preMsgInfo.MessagePreset.MessagePresetLanguages = msgPresetLangTable;
      // preMsgInfo.RewardPreset.RewardPresetItems = rewardData;
  
      console.log('[GAME SERVER] preMsgInfo=',JSON.stringify(preMsgInfo,null,2));
      console.log('[GAME SERVER] targetURL=',targetURL);

      const res = await axios.post(targetURL,preMsgInfo,{headers:{'Content-Security-Policy': 'upgrade-insecure-requests'}});
      console.log('[GAME SERVER] response=',JSON.stringify(res.data,null,2));
  
      if(res.status !== 200) {
        resultInfo.resultCode = ResultCode.ADMINAPI_LOGINREWARD_FAILED;
        resultInfo.message = ReqValidationErrorMsg[ResultCode.ADMINAPI_LOGINREWARD_FAILED.toString()];
        resultInfo.data = {status:res.status};
      }

      // const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_GAMESERVER,serverType);
      // const dbmsInfo = sqlDataManager.getDBMSInfo();

      // const messageNo = msgID;
      // const presetType = 0;
      // const messageType = 0;
      // const messageName = "test message1";
      // const rewardItemList = rewardData;

      // // 테이블:reward_preset
      // let sqlStatements = '';
      // const fieldNameList2 = `(RewardName, PresetCount, SupportItem, UpdatedAt, CreatedAt)`;
      // const fieldValueList2 = `("${messageName}", ${rewardItemList.length}, '', "${dayjs().utc().format()}", "${dayjs().utc().format()}")`;
      // sqlStatements = `insert into ${dbmsInfo.gameDatabase}.reward_preset ${fieldNameList2} values ${fieldValueList2};`;

      // let resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);
      // const rewardPresetID = resultInfo.data.insertId;

      // // 테이블:message_preset
      // const fieldNameList3 = `(PresetName, PresetCount, SupportLanguage, UpdatedAt, CreatedAt)`;
      // const fieldValueList3 = `("${messageName}", ${titleTable.length}, 1, "${dayjs().utc().format()}", "${dayjs().utc().format()}")`;
      // sqlStatements = `insert into ${dbmsInfo.gameDatabase}.message_preset ${fieldNameList3} values ${fieldValueList3};`;

      // resultInfo = await sqlDataManager.querySQL(sqlStatements, null);
      // const messagePresetID = resultInfo.data.insertId;

      // // 테이블:pre_message
      // const fieldNameList5 = `(MessageNo, PresetType, MessageType, MessageName, UserCount, UserList, MessagePresetId, RewardPresetId, MessageBegin, MessageEnd, UpdatedAt, CreatedAt)`;
      // const fieldValueList5 = `(${messageNo}, ${presetType}, ${messageType}, "${messageName}", 0, 0, ${messagePresetID}, ${rewardPresetID}, "${startTime}", "${endTime}", "${dayjs().utc().format()}", "${dayjs().utc().format()}")`;
      // sqlStatements = `insert into ${dbmsInfo.gameDatabase}.pre_message ${fieldNameList5} values ${fieldValueList5};`;

      // // 테이블:reward_preset_item
      // for(let rewardItem of rewardItemList) {
      // const fieldNameList1 = `(PresetId, ItemType, ItemId, Quantity, Rate, UpdatedAt, CreatedAt)`;
      // const fieldValueList1 = `(${rewardPresetID}, ${rewardItem.ItemType}, ${rewardItem.ItemId}, ${rewardItem.Quantity}, 10000, "${dayjs().utc().format()}", "${dayjs().utc().format()}")`;
      // sqlStatements += `insert into ${dbmsInfo.gameDatabase}.reward_preset_item ${fieldNameList1} values ${fieldValueList1};`;
      // }

      // // 테이블:message_preset_language
      // for(let i=0;i<titleTable.length;i++) {
      //   if(titleTable[i].content.trim() !== '') {
      //     const fieldNameList4 = `(PresetId, LanguageId, MessageSubject, MessageBody, UpdatedAt, CreatedAt)`;
      //     const fieldValueList4 = `(${messagePresetID}, ${titleTable[i].langCode}, '${titleTable[i].content}','${bodyTable[i].content}', "${dayjs().utc().format()}", "${dayjs().utc().format()}")`;
      //     sqlStatements += `insert into ${dbmsInfo.gameDatabase}.message_preset_language ${fieldNameList4} values ${fieldValueList4};`;
      //   }
      // }


      // resultInfo = await sqlDataManager.querySQL(sqlStatements, null);

      // resultInfo.data.insertId;

      // const res = 'ok';//await axios.post(targetURL,msgList,{ headers: {'Content-type': 'application/json'} });
  
      // console.log('[GAME SERVER] response=',res);
      return true;
      
    } catch(err) {
      console.log(err);
    
      resultInfo.resultCode = ResultCode.ADMINAPI_LOGINREWARD_FAILED;
      resultInfo.message = ReqValidationErrorMsg[ResultCode.ADMINAPI_LOGINREWARD_FAILED.toString()];
      resultInfo.data = err;
  
      return false;
    }
  };

// 접속보상 이벤트 항목 등록
const registerNewEvent = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] registerNewEvent()");

    try {
      // 요청 파라메터 유효성 체크 및 요청 객체로 변환
      let resultInfo = await edo.convertReqParamToRegisterLoginRewardEventInfo(req);
      if(resultInfo.resultCode !== ResultCode.SUCCESS) {
          cmnSvcProcessor.sendResponse(res,resultInfo,null)
          return;
      }
      const reqRegisterEventInfo:edo.ReqRegisterEventInfo = resultInfo.data;

      const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqRegisterEventInfo.serverType);

      // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
      resultInfo = await preprocessEventRequest(req, res, sqlDataManager, reqRegisterEventInfo, aclManager.ACL_POLICY_EVENT_LOGINREWARD_REGISTER);
      if(resultInfo.resultCode !== ResultCode.SUCCESS) {
          cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
          return;
      }

      const loginAccountInfo:ado.AccountInfo = resultInfo.data;

      // 새 공지사항 추가
      const dbUpdateInfo = await eventDataHandler.registerDBNewEvent(sqlDataManager,reqRegisterEventInfo);
      if(dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
          cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);
          return;
      }

      const startTimeUTC = dayjs(reqRegisterEventInfo.startTime.trim()).utc().format();
      const endTimeUTC = dayjs(reqRegisterEventInfo.endTime.trim()).utc().format();

      const result1 = await sendPreMessageToGameserver(
          reqRegisterEventInfo.serverType,
          dbUpdateInfo.data.insertId,
          1,
          reqRegisterEventInfo.presetTitle,
          reqRegisterEventInfo.langPresetID,
          reqRegisterEventInfo.rewardPresetID,
          reqRegisterEventInfo.titleTable,
          reqRegisterEventInfo.contentTable,
          startTimeUTC,
          endTimeUTC,
          reqRegisterEventInfo.rewardData
      );

      if(result1 === false) {
          resultInfo.resultCode = ResultCode.EVENT_SENDNEWEVENT_SENDEVENTTOGAMESERVER_FAILED;
          resultInfo.message = ReqValidationErrorMsg[ResultCode.EVENT_SENDNEWEVENT_SENDEVENTTOGAMESERVER_FAILED.toString()];
          cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
          return;
      }

      // 등록한 이벤트항목에 대한 event_id값 추출
      console.log('registerDBNewEvent() insert id=',dbUpdateInfo.data.insertId);

      // 새 이벤트 등록 활동로그 DB에 저장
      const logDetailInfo:string = `{"eventType":${reqRegisterEventInfo.eventType},"title":${JSON.stringify(reqRegisterEventInfo.titleTable)},"content":${JSON.stringify(reqRegisterEventInfo.contentTable)},"startTime":${reqRegisterEventInfo.startTime},"endTime":${reqRegisterEventInfo.endTime},"rewardData":${reqRegisterEventInfo.rewardData},"activiationFlag":${reqRegisterEventInfo.activationFlag}}`;
      await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqRegisterEventInfo.adminID,activityType.ADMINACTIVITY_TYPE_EVENT_LOGINREWARD_NEW,logDetailInfo);

      cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);

    } catch(err) {
      console.log(err);

      const resultInfo = {
          resultCode: ResultCode.SYSTEM_INTERNALERROR,
          message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
          data:err
      };

      cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] registerNewEvent()");
};
router.post('/new', registerNewEvent);


// 게임서버로 프리메세지(접속보상) 업데이트 요청하기
// 게임서버에서 해당 이벤트 메세지 삭제 처리
const updatePreMessageFromGameserver = async (serverType:string,msgID:number,msgType:number,langPresetID:number,rewardPresetID:number,titleTable:any,bodyTable:any,startTime:string,endTime:string,rewardData:any) => {

  try {
    const msgList = [];
    const msgInfo = {
      "NoticeNo":msgID,
      "NoticeType":msgType,
      "Title":"",
      "Body":"",
      "ImageUrl":"",
      "LanguageId":0,
      "NoticeBegin": startTime,
      "NoticeEnd": endTime,
      "RewardItems": JSON.stringify(rewardData)
    };

    let targetURL = cmnSvcProcessor.getGameServerURL(serverType,'/Resource/Notices/Writes');

    for(let i=0;i<titleTable.length;i++) {
      msgInfo.Title = titleTable[i].content;
      msgInfo.Body = bodyTable[i].content;
      msgInfo.LanguageId = bodyTable[i].langCode;
      msgList.push({...msgInfo});
    }

    console.log('[GAME SERVER] msgList=',msgList);
    console.log('[GAME SERVER] targetURL=',targetURL);


    const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_GAMESERVER,serverType);
    const dbmsInfo = sqlDataManager.getDBMSInfo();

    const messageNo = msgID;
    const presetType = 0;
    const messageType = 0;
    const messageName = "test message1";

    const messagePresetID = messageNo;
    const rewardPresetID = messageNo;


      // 테이블:pre_message
      const fieldValueList5 = `PresetType=${presetType}, MessageType=${messageType}, MessageName="${messageName}", UserCount=0, UserList=0, MessagePresetId=${messagePresetID}, RewardPresetId=${rewardPresetID}, MessageBegin="${startTime}", MessageEnd="${endTime}"`;
      let sqlStatements = `update ${dbmsInfo.gameDatabase}.pre_message set ${fieldValueList5} where MessageNo=${msgID};`;

      // 테이블:reward_preset_item
      const rewardItemList = rewardData;
      sqlStatements += `delete from ${dbmsInfo.gameDatabase}.reward_preset_item where PresetId=${rewardPresetID};`;
      for(let rewardItem of rewardItemList) {
      const fieldNameList1 = `(PresetId, ItemType, ItemId, Quantity, Rate, UpdatedAt, CreatedAt)`;
      const fieldValueList1 = `(${rewardPresetID}, ${rewardItem.ItemType}, ${rewardItem.ItemId}, ${rewardItem.Quantity}, 10000, "${dayjs().utc().format()}", "${dayjs().utc().format()}")`;
      sqlStatements += `insert into ${dbmsInfo.gameDatabase}.reward_preset_item ${fieldNameList1} values ${fieldValueList1};`;
      }

      // 테이블:reward_preset
      const fieldValueList2 = `RewardName="${messageName}", PresetCount=${rewardPresetID}`;
      sqlStatements += `update ${dbmsInfo.gameDatabase}.reward_preset set ${fieldValueList2} where id=${rewardPresetID};`;

      // 테이블:message_preset
      const fieldValueList3 = `PresetName="${messageName}", PresetCount=${messagePresetID}`;
      sqlStatements += `update ${dbmsInfo.gameDatabase}.message_preset set ${fieldValueList3} where id=${messagePresetID};`;

      // 테이블:message_preset_language
      sqlStatements += `delete from ${dbmsInfo.gameDatabase}.message_preset_language where PresetId=${messagePresetID};`;
      for(let i=0;i<titleTable.length;i++) {
        if(titleTable[i].content.trim() !== "") {
          const fieldNameList4 = `(PresetId, LanguageId, MessageSubject, MessageBody, UpdatedAt, CreatedAt)`;
          const fieldValueList4 = `(${messagePresetID}, ${titleTable[i].langCode}, '${titleTable[i].content}','${bodyTable[i].content}', "${dayjs().utc().format()}", "${dayjs().utc().format()}")`;
          sqlStatements += `insert into ${dbmsInfo.gameDatabase}.message_preset_language ${fieldNameList4} values ${fieldValueList4};`;
        }
      }

    const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

    const res = 'ok';//await axios.post(targetURL,msgList,{ headers: {'Content-type': 'application/json'} });

    console.log('[GAME SERVER] response=',res);
    return true;
    
  } catch(err) {
    console.log(err);

    return false;
  }
};


// 접속보상 이벤트 수정
const updateEvent = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] updateEvent()");

    try {
      // 요청 파라메터 유효성 체크 및 요청 객체로 변환
      let resultInfo = await edo.convertReqParamToUpdateLoginRewardEventInfo(req);
      if(resultInfo.resultCode !== ResultCode.SUCCESS) {
          cmnSvcProcessor.sendResponse(res,resultInfo,null)
          return;
      }
      const reqUpdateEventInfo:edo.ReqUpdateEventInfo = resultInfo.data;

      const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqUpdateEventInfo.serverType);

      // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
      resultInfo = await preprocessEventRequest(req, res, sqlDataManager, reqUpdateEventInfo, aclManager.ACL_POLICY_EVENT_LOGINREWARD_UPDATE);
      if(resultInfo.resultCode !== ResultCode.SUCCESS) {
          cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
          return;
      }

      const loginAccountInfo:ado.AccountInfo = resultInfo.data;

      // 이벤트 수정
      const dbUpdateInfo = await eventDataHandler.updateDBEvent(sqlDataManager,reqUpdateEventInfo);
      if(dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
          cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);
          return;
      }

      const startTimeUTC = dayjs(reqUpdateEventInfo.startTime.trim()).utc().format();
      const endTimeUTC = dayjs(reqUpdateEventInfo.endTime.trim()).utc().format();

      const result1 = await updatePreMessageFromGameserver(
          reqUpdateEventInfo.serverType,
          reqUpdateEventInfo.eventID,
          1,
          reqUpdateEventInfo.langPresetID,
          reqUpdateEventInfo.rewardPresetID,
          reqUpdateEventInfo.titleTable,
          reqUpdateEventInfo.contentTable,
          startTimeUTC,
          endTimeUTC,
          reqUpdateEventInfo.rewardData
      );

      if(result1 === false) {
          resultInfo.resultCode = ResultCode.EVENT_UPDATEEVENT_UPDATEEVENTTOGAMESERVER_FAILED;
          resultInfo.message = ReqValidationErrorMsg[ResultCode.EVENT_UPDATEEVENT_UPDATEEVENTTOGAMESERVER_FAILED.toString()];
          cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
          return;
      }

      // 이벤트 수정 활동로그 DB에 저장
      const logDetailInfo:string = `{"eventID":${reqUpdateEventInfo.eventID},"title":${JSON.stringify(reqUpdateEventInfo.titleTable)},"content":${JSON.stringify(reqUpdateEventInfo.contentTable)},"startTime":${reqUpdateEventInfo.startTime},"endTime":${reqUpdateEventInfo.endTime},"rewardData":${reqUpdateEventInfo.rewardData},"activiationFlag":${reqUpdateEventInfo.activationFlag}}`;
      await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqUpdateEventInfo.adminID,activityType.ADMINACTIVITY_TYPE_EVENT_LOGINREWARD_UPDATE,logDetailInfo);

      cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);

    } catch(err) {
      console.log(err);

      const resultInfo = {
          resultCode: ResultCode.SYSTEM_INTERNALERROR,
          message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
          data:err
      };

      cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] updateEvent()");
};
router.post('/update', updateEvent);

const checkIfEventOnAirExists = (notificationList: edo.EventInfo[]): ResultInfo => {
    let resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
    let startDate;
    let endDate;
    for (let notiInfo of notificationList) {
      startDate = dayjs(notiInfo.startTime);
      endDate = dayjs(notiInfo.endTime);
      if (startDate.isBefore(dayjs()) === true && endDate.isAfter(dayjs()) === true) {
        resultInfo.resultCode = ResultCode.EVENT_DELETE_ONAIREVENT_NOTALLOWED;
        resultInfo.message = ReqValidationErrorMsg[ResultCode.EVENT_DELETE_ONAIREVENT_NOTALLOWED.toString()];
        break;
      }
    }
  
    return resultInfo;
  };

// 게임서버에서 해당 이벤트 메세지 삭제 처리
const deletePreMessageFromGameserver = async (serverType:string,msgID:number) => {

    const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_GAMESERVER,serverType);
    const dbmsInfo = sqlDataManager.getDBMSInfo();

    let sqlStatements = `delete from ${dbmsInfo.gameDatabase}.pre_message where MessageNo=${msgID};`;
    sqlStatements += `delete from ${dbmsInfo.gameDatabase}.message_preset where PresetCount=${msgID};`;
    sqlStatements += `delete from ${dbmsInfo.gameDatabase}.message_preset_language where PresetId=${msgID};`;
    sqlStatements += `delete from ${dbmsInfo.gameDatabase}.reward_preset where PresetCount=${msgID};`;
    sqlStatements += `delete from ${dbmsInfo.gameDatabase}.reward_preset_item where PresetId=${msgID};`;

    const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);
    console.log('resultInfo=',resultInfo);
};

// 접속보상 이벤트 삭제
const deleteEvents = async (req: Request, res: Response) => {
    serviceLogger.logDebug('##### [START] deleteEvents()');
  
    try {
      // 요청 파라메터 유효성 체크 및 요청 객체로 변환
      let resultInfo = await edo.convertReqParamToDeleteEventsInfo(req);
      if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res, resultInfo, null);
        return;
      }
      const reqDeleteEventsInfo: edo.ReqDeleteEventsInfo = resultInfo.data;
    
      const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqDeleteEventsInfo.serverType);

      // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
      resultInfo = await preprocessEventRequest(req, res, sqlDataManager, reqDeleteEventsInfo, aclManager.ACL_POLICY_EVENT_LOGINREWARD_DELETE);
      if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
        return;
      }
    
      const loginAccountInfo: ado.AccountInfo = resultInfo.data;
    
      // 이벤트 목록을 DB에서 조회
      const reqEventListInfo: edo.ReqEventListInfo = resultInfo.data;
      const dbQueryInfo = await eventDataHandler.queryDBEventListForNotiIDs(sqlDataManager, reqDeleteEventsInfo.eventIDList, parseInt(<string>process.env.QUERY_NUM_PERPAGE));
      if (dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res, dbQueryInfo, sqlDataManager);
        return;
      }
    
      // 삭제요청된 항목중 시행중인 이벤트 항목이 있는지 체크
      resultInfo = checkIfEventOnAirExists(dbQueryInfo.data);
      if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
        return;
      }
    
      // 이벤트 삭제
      const dbUpdateInfo = await eventDataHandler.deleteDBEvents(sqlDataManager, reqDeleteEventsInfo);
      if (dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res, dbUpdateInfo, sqlDataManager);
        return;
      }
    
      await deletePreMessageFromGameserver(reqDeleteEventsInfo.serverType,reqDeleteEventsInfo.eventIDList[0]);


      // 이벤트 삭제 활동로그 DB에 저장
      let idList = '';
      for (let v of reqDeleteEventsInfo.eventIDList) {
        idList += v.toString() + ',';
      }
      const logDetailInfo: string = `{"eventIDList":${idList}}`;
      await cmnSvcProcessor.writeDBActivityLog(sqlDataManager, reqDeleteEventsInfo.adminID, activityType.ADMINACTIVITY_TYPE_EVENT_LOGINREWARD_DELETE, logDetailInfo);
    
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
  
    serviceLogger.logDebug('##### [END] deleteEvents()');
  };
router.post('/delete', deleteEvents);

// 접속보상 이벤트 활성화/비활성화
const updateEventActivation = async (req:Request, res:Response) => {

    serviceLogger.logDebug("##### [START] updateEventActivation()");
    
    try {
      // 요청 파라메터 유효성 체크 및 요청 객체로 변환
      let resultInfo = await edo.convertReqParamToLoginRewardEventActivationInfo(req);
      if(resultInfo.resultCode !== ResultCode.SUCCESS) {
          cmnSvcProcessor.sendResponse(res,resultInfo,null)
          return;
      }
      const reqEventActivationInfo:edo.ReqEventActivationInfo = resultInfo.data;

      const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqEventActivationInfo.serverType);

      // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
      resultInfo = await preprocessEventRequest(req, res, sqlDataManager, reqEventActivationInfo, aclManager.ACL_POLICY_EVENT_LOGINREWARD_ACTIVATION);
      if(resultInfo.resultCode !== ResultCode.SUCCESS) {
          cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
          return;
      }

      const loginAccountInfo:ado.AccountInfo = resultInfo.data;

      // 공지사항 수정
      const dbUpdateInfo = await eventDataHandler.updateDBEventActivation(sqlDataManager,reqEventActivationInfo);
      if(dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
          cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);
          return;
      }

      // 이벤트 활성화/비활성화 활동로그 DB에 저장
      const logDetailInfo:string = `{"eventID":${reqEventActivationInfo.eventID},"activationFlag":${reqEventActivationInfo.activationFlag}}`;
      await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqEventActivationInfo.adminID,activityType.ADMINACTIVITY_TYPE_EVENT_LOGINREWARD_ACTIVATION,logDetailInfo);

      cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);

    } catch(err) {
      console.log(err);

      const resultInfo = {
          resultCode: ResultCode.SYSTEM_INTERNALERROR,
          message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
          data:err
      };

      cmnSvcProcessor.sendResponse(res,resultInfo,null);
    }

    serviceLogger.logDebug("##### [END] updateEventActivation()");
};
router.post('/activation', updateEventActivation);

// 쿠폰 발급 목록 조회
const queryCouponInfoList = async (req:Request, res:Response) => {

  serviceLogger.logDebug("##### [START] queryCouponInfoList()");

  try {
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await edo.convertReqParamToCouponListInfo(req);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,null)
        return;
    }
    const reqCouponListInfo:edo.ReqCouponListInfo = resultInfo.data;

    const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqCouponListInfo.serverType);

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessEventRequest(req, res, sqlDataManager, reqCouponListInfo, aclManager.ACL_POLICY_ALL);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
        return;
    }

    const loginAccountInfo:ado.AccountInfo = resultInfo.data;

    // DB에서 쿠폰 목록 조회
    const dbQueryInfo = await eventDataHandler.queryDBCouponInfoList(sqlDataManager,reqCouponListInfo,parseInt(<string>process.env.QUERY_NUM_PERPAGE));
    if(dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);
        return;
    }

    // 이벤트 목록 조회 활동로그 DB에 저장
    // const logDetailInfo:string = `{"eventType":${reqEventListInfo.eventType},"queryFilterInfo":${reqEventListInfo.queryFilterInfo}}`;
    // cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqEventListInfo.adminID,activityType.ADMINACTIVITY_TYPE_EVENT_LOGINREWARD_NEW,logDetailInfo);

    cmnSvcProcessor.sendResponse(res,dbQueryInfo,sqlDataManager);

  } catch(err) {
    console.log(err);

    const resultInfo = {
        resultCode: ResultCode.SYSTEM_INTERNALERROR,
        message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
        data:err
    };

    cmnSvcProcessor.sendResponse(res,resultInfo,null);
  }

  serviceLogger.logDebug("##### [END] queryCouponInfoList()");
};
router.get('/coupon/list', queryCouponInfoList);


const makeAndSaveCouponPrefixTable = (filePath:string) => {

  const alphaTable=['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
  const resultTable=[];
  let prefix=[];
  for(let i=0;i<alphaTable.length-3;i++) {
    prefix.push(alphaTable[i]);
    for(let j=i+1;j<alphaTable.length-2;j++) {
      prefix.push(alphaTable[j]);
      for(let k=j+1;k<alphaTable.length-1;k++) {
        prefix.push(alphaTable[k]);
        for(let l=k+1;l<alphaTable.length;l++) {
          prefix.push(alphaTable[l]);
          resultTable.push([...prefix]);
          prefix.splice(prefix.length-1,1);
        }
        prefix.splice(prefix.length-1,1);
      }
      prefix.splice(prefix.length-1,1);
    }
    prefix = [];
  }

  fs.writeFileSync(filePath,JSON.stringify(resultTable));
};

const peekAndUpdateCouponPrefixTable = (filePath:string) => {

  let fileExist = false;
  try {
    if (fs.existsSync(filePath)) {
      fileExist = true;
    }
  } catch(err) {
  }

  if(fileExist === false) {
    makeAndSaveCouponPrefixTable(filePath);
  }

  let prefixTableStr = fs.readFileSync(filePath,{encoding:'utf8',flag:'r'});
  let prefixTable = JSON.parse(prefixTableStr);

  if(prefixTable === undefined || prefixTable.length === 0) {
    makeAndSaveCouponPrefixTable(filePath);
  }

  prefixTableStr = fs.readFileSync(filePath,{encoding:'utf8',flag:'r'});
  prefixTable = JSON.parse(prefixTableStr);

  const randIndex = Math.floor(Math.random()*100000)%prefixTable.length;
  const prefix = prefixTable[randIndex];
  prefixTable.splice(randIndex,1);

  fs.writeFileSync(filePath,JSON.stringify(prefixTable));

  return prefix;
};

const generateCouponCode = (digit:number, quantity:number) => {

  const couponCodeTable = [];
  let table1 = peekAndUpdateCouponPrefixTable('./coupon_prefix.dat');
  let numDigit = digit - table1.length - 1;
  if(numDigit < 1) {
    return null;
  }

  const checkTable:any[] = [];

  for(let i=0;i<quantity;i++) {
    let table2 = [...table1];
    let checkEnd = false;
    let numCode = 0;
    while(checkEnd === false) {
      numCode = Math.floor(Math.random()*(9.999999999999999*Math.pow(10,numDigit)-Math.pow(10,numDigit)))+Math.pow(10,numDigit);
      let unique = true;
      for(let num of checkTable) {
        if(num === numCode) {
          unique = false;
          break;
        }
      }
  
      if(unique === true) {
        checkTable.push(numCode);
        checkEnd = true;
      }
    }
  
    while(numCode > 0) {
      table2.push((numCode%10).toString());
      numCode = Math.floor(numCode / 10);
    }
  
    let couponCode = "";
    while(table2.length > 0) {
      const randIndex = Math.floor(Math.random()*100000)%table2.length;
      couponCode += table2[randIndex];
      table2.splice(randIndex,1);
    }
  
    couponCodeTable.push(couponCode);
  }

  for(let i=0;i<couponCodeTable.length;i++) {
    for(let j=0;j<couponCodeTable.length;j++) {
      if(i !== j && couponCodeTable[i] === couponCodeTable[j]) {
        return null;
      }
    }
  }

  return couponCodeTable;
};

const sendCouponInfoToGameserver = async (couponID:number, reqRegisterNewCouponInfo:edo.ReqRegisterNewCouponInfo,couponCodeTable:any):Promise<ResultInfo> => {

  let resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
  try {
    const rewardData = reqRegisterNewCouponInfo.rewardData;

    const table1:any[] = [];
    const couponInfo = {   
      "id": couponID,  // 쿠폰 Info 구별 Key 값
      "couponType": reqRegisterNewCouponInfo.couponType, // 쿠폰 유형
      "messagePresetId": 0, // MessagePreset의 Id값 -> 이걸로 쿠폰 받을 때 내용이 나가는데, 현재 셋은 안되어 있음. 해당 부분도 자동화 필요하면 선택 사항으로 작업 필요함.)
      "itemCount": rewardData.length, //“couponItems” 필드의 배열 갯수
      "pressCount": reqRegisterNewCouponInfo.couponQty, // 생성하거나 사용할 수 있는 갯수
      "couponBegin": reqRegisterNewCouponInfo.startTime.replace(' ','T'), // 쿠폰 사용 시작일
      "couponEnd": reqRegisterNewCouponInfo.endTime.replace(' ','T'), // 쿠폰 사용 종료일
      "couponItems": rewardData,
      "couponBooks": [],
      "isUse": true,
      "messagePreset": {
        "Id": reqRegisterNewCouponInfo.presetID,
        "PresetName": "PresetMessage"+reqRegisterNewCouponInfo.presetID.toString(),
        "messagePresetLanguages": table1
      }
    };

    let targetURL = cmnSvcProcessor.getGameServerURL(reqRegisterNewCouponInfo.serverType,`/Resource/Coupons/Generate/${couponID}/${reqRegisterNewCouponInfo.couponType}/${reqRegisterNewCouponInfo.couponQty}`);
    if(reqRegisterNewCouponInfo.couponType > 0) {
      targetURL = cmnSvcProcessor.getGameServerURL(reqRegisterNewCouponInfo.serverType,`/Resource/Coupons/Generate/${couponID}/${reqRegisterNewCouponInfo.couponType}/${reqRegisterNewCouponInfo.couponQty}?CouponCode=${reqRegisterNewCouponInfo.sharedCouponCode}`);

    } else {
      const couponBookList:any = [];
      for(let couponCode of couponCodeTable) {
        couponBookList.push({"CouponCode":couponCode, "CouponId":couponID});
      }

      couponInfo.couponBooks = couponBookList;
    }

    const langTable:any[] = [];
    let langInfo:any = {};
    for(let i=0;i<reqRegisterNewCouponInfo.contentTable.length;i++) {
      langInfo = {
        "PresetId":0,
        "LanguageId":reqRegisterNewCouponInfo.contentTable[i].langCode,
        "MessageSubject": reqRegisterNewCouponInfo.titleTable[i].content,
        "MessageBody": reqRegisterNewCouponInfo.contentTable[i].content
      };
      langTable.push(langInfo);
    }

    couponInfo.messagePreset.messagePresetLanguages = langTable;

    // const bodyInfo = {
    //   "ToUserId": reqSendMessageInfo.targetUserID,
    //   "MessageType": 0,
    //   "MessageSubject": getTitle(reqSendMessageInfo.titleTable,getLangTypeFromCode(23)),
    //   "MessageBody": getContent(reqSendMessageInfo.contentTable,getLangTypeFromCode(23)),
    //   "UserMessageItems": reqSendMessageInfo.rewardData
    // };

    console.log('[GAME SERVER] couponInfo=',JSON.stringify(couponInfo,null,2));
    console.log('[GAME SERVER] targetURL=',targetURL);

    const res = await axios.post(targetURL,couponInfo,{ headers: {'Content-type': 'application/json'} });

    console.log('[GAME SERVER] response=',res);

    if(res.status !== 200) {
      resultInfo.resultCode = ResultCode.EVENT_COUPON_SENDCOUPONINFOTOGAMESERVER_FAILED;
      resultInfo.message = ReqValidationErrorMsg[ResultCode.EVENT_COUPON_SENDCOUPONINFOTOGAMESERVER_FAILED.toString()];
    } else {
      resultInfo.data = [...couponCodeTable];
    }
    
  } catch(err) {
    console.log(err);

    resultInfo.resultCode = ResultCode.EVENT_COUPON_SENDCOUPONINFOTOGAMESERVER_FAILED;
    resultInfo.message = ReqValidationErrorMsg[ResultCode.EVENT_COUPON_SENDCOUPONINFOTOGAMESERVER_FAILED.toString()];
  }

  return resultInfo;
};

// 새 쿠폰 발급하기
const registerNewCouponInfo = async (req:Request, res:Response) => {

  serviceLogger.logDebug("##### [START] registerNewCouponInfo()");

  try {
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await edo.convertReqParamToRegisterNewCouponInfo(req);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,null)
        return;
    }
    const reqRegisterNewCouponInfo:edo.ReqRegisterNewCouponInfo = resultInfo.data;

    const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqRegisterNewCouponInfo.serverType);

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessEventRequest(req, res, sqlDataManager, reqRegisterNewCouponInfo, aclManager.ACL_POLICY_EVENT_LOGINREWARD_REGISTER);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
        return;
    }

    const loginAccountInfo:ado.AccountInfo = resultInfo.data;

    // 쿠폰 생성
    let couponCodeTable:any = [];
    if(reqRegisterNewCouponInfo.couponType > 0) {
      couponCodeTable.push(reqRegisterNewCouponInfo.sharedCouponCode);
    } else {
      couponCodeTable = generateCouponCode(reqRegisterNewCouponInfo.couponDigit, reqRegisterNewCouponInfo.couponQty);
    }

    if(couponCodeTable === null) {
      resultInfo.resultCode = ResultCode.EVENT_COUPON_SAMECOUPONCODEDETECTED;
      resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()];
      cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
      return;
    }

    // 새 쿠폰정보 추가
    const dbUpdateInfo = await eventDataHandler.registerDBNewCouponInfo(sqlDataManager,reqRegisterNewCouponInfo,couponCodeTable);
    if(dbUpdateInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);
        return;
    }

    // 쿠폰 생성 및 게임서버에 쿠폰정보 전송
    const startTimeUTC = dayjs(reqRegisterNewCouponInfo.startTime.trim()).utc().format();
    const endTimeUTC = dayjs(reqRegisterNewCouponInfo.endTime.trim()).utc().format();

    const result1 = await sendCouponInfoToGameserver(dbUpdateInfo.data.insertId,reqRegisterNewCouponInfo,couponCodeTable);

    if(result1.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
        return;
    }

    // 새 이벤트 등록 활동로그 DB에 저장
    const logDetailInfo:string = `{"couponID":${dbUpdateInfo.data.insertId},"couponType":${reqRegisterNewCouponInfo.couponType},"couponQty":${reqRegisterNewCouponInfo.couponQty},"startTime":${reqRegisterNewCouponInfo.endTime},"endTime":${reqRegisterNewCouponInfo.endTime},"activiationFlag":${reqRegisterNewCouponInfo.activationFlag}}`;
    await cmnSvcProcessor.writeDBActivityLog(sqlDataManager,reqRegisterNewCouponInfo.adminID,activityType.ADMINACTIVITY_TYPE_EVENT_COUPON_NEW,logDetailInfo);

    dbUpdateInfo.data = {couponTable:couponCodeTable,couponType:reqRegisterNewCouponInfo.couponType};
    cmnSvcProcessor.sendResponse(res,dbUpdateInfo,sqlDataManager);

  } catch(err) {
    console.log(err);

    const resultInfo = {
        resultCode: ResultCode.SYSTEM_INTERNALERROR,
        message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
        data:err
    };

    cmnSvcProcessor.sendResponse(res,resultInfo,null);
  }

  serviceLogger.logDebug("##### [END] registerNewCouponInfo()");
};
router.post('/coupon/new', registerNewCouponInfo);

// 메세지 프리셋 목록 조회
const queryMessagePresetInfoList = async (req:Request, res:Response) => {

  serviceLogger.logDebug("##### [START] queryMessagePresetInfoList()");

  try {
    
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await edo.convertReqParamToBasicInfo(req);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,null)
        return;
    }
    const reqPresetListInfo:ReqBaseInfo = resultInfo.data;
    const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqPresetListInfo.serverType);

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessEventRequest(req, res, sqlDataManager, reqPresetListInfo, aclManager.ACL_POLICY_ALL);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
        return;
    }

    // 게임서버에서 메세지 프리셋 정보 조회하기
    let targetURL = cmnSvcProcessor.getGameServerURL(reqPresetListInfo.serverType,'/Resource/Messages/MessagePreset');
    console.log('[GAME SERVER] targetURL=',targetURL);

    const res2 = await axios.get(targetURL,{headers:{'Content-Security-Policy': 'upgrade-insecure-requests'}});
    console.log('[GAME SERVER] response=',JSON.stringify(res2.data,null,2));

    resultInfo.data = res2.data;

    cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);

  } catch(err) {
    console.log(err);

    const resultInfo = {
        resultCode: ResultCode.SYSTEM_INTERNALERROR,
        message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
        data:err
    };

    cmnSvcProcessor.sendResponse(res,resultInfo,null);
  }

  serviceLogger.logDebug("##### [END] queryMessagePresetInfoList()");
};
router.get('/preset/lang/list', queryMessagePresetInfoList);

// 보상 프리셋 목록 조회
const queryRewardPresetInfoList = async (req:Request, res:Response) => {

  serviceLogger.logDebug("##### [START] queryRewardPresetInfoList()");

  try {
    
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await edo.convertReqParamToBasicInfo(req);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,null)
        return;
    }
    const reqPresetListInfo:ReqBaseInfo = resultInfo.data;
    const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqPresetListInfo.serverType);

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessEventRequest(req, res, sqlDataManager, reqPresetListInfo, aclManager.ACL_POLICY_ALL);
    if(resultInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);
        return;
    }

    // 게임서버에서 보상 프리셋 정보 조회하기
    let targetURL = cmnSvcProcessor.getGameServerURL(reqPresetListInfo.serverType,'/Resource/Messages/RewardPreset');
    console.log('[GAME SERVER] targetURL=',targetURL);

    const res2 = await axios.get(targetURL,{headers:{'Content-Security-Policy': 'upgrade-insecure-requests'}});
    console.log('[GAME SERVER] response=',JSON.stringify(res2.data,null,2));

    resultInfo.data = res2.data;

    cmnSvcProcessor.sendResponse(res,resultInfo,sqlDataManager);

  } catch(err) {
    console.log(err);

    const resultInfo = {
        resultCode: ResultCode.SYSTEM_INTERNALERROR,
        message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
        data:err
    };

    cmnSvcProcessor.sendResponse(res,resultInfo,null);
  }

  serviceLogger.logDebug("##### [END] queryMessagePresetInfoList()");
};
router.get('/preset/reward/list', queryRewardPresetInfoList);

export default router;