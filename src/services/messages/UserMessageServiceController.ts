import { Request, Response, NextFunction, Router } from "express";
import dayjs from "dayjs";
import axios from "axios";
import scheduler from "src/services/common/Scheduler";
import {
  ResultCode,
  ResultInfo,
  ReqValidationErrorMsg,
  getResultForm,
} from "src/common/ResponseManager";
import {
  DBSOURCE_ADMIN,
  DBSOURCE_GAMESERVER,
  getSQLDataManager,
} from "src/common/db/DataManagerFactory";
import * as Utils from "src/common/Utils";
import * as userMsgDataHandler from "./UserMessageServiceDataHandler";
import * as accountDataHandler from "src/services/accounts/AccountServiceDataHandler";
import * as cmnSvcProcessor from "src/services/common/CommonServiceProcessor";
import * as serviceLogger from "src/services/common/ServiceLogger";
import SQLDataManager from "src/common/db/SQLDataManager";
import ReqBaseInfo from "src/services/common/BaseDataObject";
import * as ado from "src/services/accounts/AccountDataObject";
import * as mdo from "src/services/messages/UserMessageDataObject";
import * as aclManager from "src/services/common/AdminACLManager";
import * as activityType from "src/services/common/AdminActivityType";

import { langTable } from "src/common/LangTable";
import * as constants from "src/common/constants";
// import utc from 'dayjs/plugin/utc';
// import timezone from 'dayjs/plugin/timezone';

// dayjs.extend(utc);
// dayjs.extend(timezone);

require("dotenv").config();

const router = Router();

const sendPushScheduleFunc = async (param: any) => {
  const reqSendMessageInfo = param;

  const sqlDataManager: SQLDataManager = <SQLDataManager>(
    await getSQLDataManager(DBSOURCE_ADMIN, param.serverType)
  );

  const bodyInfo: any = {
    testMode: false,
    dryRun: reqSendMessageInfo.liveFlag,
    targetType: reqSendMessageInfo.targetType,
    targetUserIDTable: reqSendMessageInfo.targetUserIDTable,
    delay: 1000,
    messageTable: [],
  };

  for (let i = 0; i < reqSendMessageInfo.contentTable.length; i++) {
    bodyInfo.messageTable.push({
      langCode: reqSendMessageInfo.contentTable[i].langCode,
      title: reqSendMessageInfo.titleTable[i].content,
      content: reqSendMessageInfo.contentTable[i].content,
    });
  }

  console.log("[PUSH SERVER] bodyInfo=", bodyInfo);
  let res2;
  if (
    reqSendMessageInfo.serverType.toUpperCase() ===
      constants.SERVER_TYPE_LIVE ||
    reqSendMessageInfo.serverType.toUpperCase() === constants.SERVER_TYPE_QA
  ) {
    res2 = await axios.post(
      `${process.env.LIVE_PUSHSERVER_HOST}/sendmsg`,
      bodyInfo,
      { headers: { "Content-type": "application/json" } }
    );
  } else {
    res2 = await axios.post(
      `${process.env.DEV_PUSHSERVER_HOST}/sendmsg`,
      bodyInfo,
      { headers: { "Content-type": "application/json" } }
    );
  }

  let updateInfo = getResultForm(ResultCode.SUCCESS, "", null);
  const resultInfo = getResultForm(ResultCode.SUCCESS, "", null);
  if (res2.status !== 200) {
    console.log("[PUSH SERVER] response=", res2);
    const errCode = ResultCode.MESSAGE_PUSHSERVER_INTERNALERROR;
    updateInfo = await userMsgDataHandler.updateDBPushMessageState(
      sqlDataManager,
      param.msgID,
      {
        state: 1,
        resultCode: errCode,
        message: ReqValidationErrorMsg[errCode.toString()],
      }
    );
  } else {
    const resultInfo2 = res2.data;

    if (resultInfo2.resultCode !== 0) {
      console.log(
        "[PUSH SERVER] request failed:resultInfo=",
        JSON.stringify(resultInfo2, null, 2)
      );

      let errCode = ResultCode.MESSAGE_PUSHSERVER_INTERNALERROR;
      if (resultInfo2.resultCode === 11) {
        errCode = ResultCode.MESSAGE_PUSHSERVER_SERVERISBUDY;
      }

      updateInfo = await userMsgDataHandler.updateDBPushMessageState(
        sqlDataManager,
        param.msgID,
        {
          state: 1,
          resultCode: errCode,
          message: ReqValidationErrorMsg[errCode.toString()],
        }
      );
    } else {
      updateInfo = await userMsgDataHandler.updateDBPushMessageState(
        sqlDataManager,
        param.msgID,
        { state: 1, resultCode: 0, message: "" }
      );
    }

    resultInfo.data = res2.data.data;
  }

  cmnSvcProcessor.releaseDataManager(sqlDataManager);

  console.log("[PUSH SERVER] 메세지 전송됨:param=", param);

  return resultInfo;
};

scheduler.restartAllJobs("push", sendPushScheduleFunc);

export const enumLangCode = [
  { id: 1, name: "한국어", code: 23 },
  { id: 2, name: "영어", code: 10 },
];

function getLangTypeFromCode(langCode: number) {
  for (let item of enumLangCode) {
    if (item.code === langCode) {
      return item.id - 1;
    }
  }
  return -1;
}

function getLangValue(langCode: number) {
  for (let item of langTable) {
    if (item.code === langCode) {
      return item.value;
    }
  }
  return null;
}

function getLangCode(langValue: string) {
  for (let item of langTable) {
    if (item.value === langValue) {
      return item.code;
    }
  }
  return -1;
}

function getTitle(titleTable: any, langType: number) {
  const langCode = enumLangCode[langType].code;
  const langValue = getLangValue(langCode);

  for (let titleInfo of titleTable) {
    if (titleInfo.langValue === langValue) {
      return titleInfo.content;
    }
  }
  return null;
}

function getContent(contentTable: any, langType: number) {
  const langCode = enumLangCode[langType].code;
  const langValue = getLangValue(langCode);

  for (let contentInfo of contentTable) {
    if (contentInfo.langValue === langValue) {
      return contentInfo.content;
    }
  }
  return null;
}

// 토큰 유효성과 요청을 실행할 권한이 있는지 체크하는 함수
async function preprocessNotificationRequest(
  req: Request,
  res: Response,
  sqlDataManager: SQLDataManager,
  reqInfo: ReqBaseInfo,
  policyKey: string
): Promise<any> {
  // JWT 토큰이 유효한지 체크. 유효하다면 새로 갱신
  let resultInfo = await cmnSvcProcessor.verifyAndIssueJwt(
    req,
    res,
    sqlDataManager,
    <string>reqInfo.adminID,
    <string>reqInfo.authToken
  );
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  // DB로부터 계정 조회
  resultInfo = await accountDataHandler.queryDBAccount(
    sqlDataManager,
    reqInfo.adminID
  );
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const loginAccountInfo: ado.AccountInfo = resultInfo.data;

  // 로그인 유저가 policyType 권한이 있는지 체크
  if (
    aclManager.checkAccessibleWithACL(loginAccountInfo.aclInfo, policyKey) ===
    false
  ) {
    resultInfo.resultCode = ResultCode.ACL_USER_NOT_AUTHORIZED;
    resultInfo.message =
      ReqValidationErrorMsg[ResultCode.ACL_USER_NOT_AUTHORIZED.toString()];
  }

  return resultInfo;
}

const makeRewardPresetInfoForGameServer = (info: any) => {
  const itemList: any = [];
  const bodyInfo = {
    RewardName: info.rewardName,
    RewardPresetItems: itemList,
  };

  for (let info2 of info.rewardPresetItems) {
    const itemInfo: any = {
      ItemType: info2.itemType,
      ItemId: info2.itemId,
      Quantity: info2.quantity,
    };
    bodyInfo.RewardPresetItems.push(itemInfo);
  }
  return bodyInfo;
};

// 메세지 목록 조회
const queryUserMessageList = async (req: Request, res: Response) => {
  serviceLogger.logDebug("##### [START] queryUserMessageList()");

  try {
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await mdo.convertReqParamToMessageListInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, null);
      return;
    }
    const reqMessageListInfo: mdo.ReqMessageListInfo = resultInfo.data;

    const sqlDataManager: SQLDataManager = <SQLDataManager>(
      await getSQLDataManager(DBSOURCE_ADMIN, reqMessageListInfo.serverType)
    );

    // 메세지 타입이 '우편함'인지, '푸쉬알람'인지에 따라 ACL 정책키 결정
    let aclPolicyKey = aclManager.ACL_POLICY_ALL;

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(
      req,
      res,
      sqlDataManager,
      reqMessageListInfo,
      aclPolicyKey
    );
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    const loginAccountInfo: ado.AccountInfo = resultInfo.data;

    // DB에서 메세지 목록 조회
    const dbQueryInfo = await userMsgDataHandler.queryDBMessageList(
      sqlDataManager,
      reqMessageListInfo,
      parseInt(<string>process.env.QUERY_NUM_PERPAGE)
    );
    if (dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, dbQueryInfo, sqlDataManager);
      return;
    }

    // 메세지 목록 조회 활동로그 DB에 저장
    // const logDetailInfo: string = `{"msgType":${reqMessageListInfo.msgType}}`;
    // cmnSvcProcessor.writeDBActivityLog(sqlDataManager, reqMessageListInfo.adminID, activityType.ADMINACTIVITY_TYPE_MESSAGE_VIEWLIST, logDetailInfo);

    cmnSvcProcessor.sendResponse(res, dbQueryInfo, sqlDataManager);
  } catch (err) {
    console.log(err);

    const resultInfo = {
      resultCode: ResultCode.SYSTEM_INTERNALERROR,
      message:
        ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
      data: err,
    };

    cmnSvcProcessor.sendResponse(res, resultInfo, null);
  }

  serviceLogger.logDebug("##### [END] queryUserMessageList()");
};
router.get("/list", queryUserMessageList);

// 메세지 보내기
const sendMessage = async (req: Request, res: Response) => {
  serviceLogger.logDebug("##### [START] sendMessage()");

  try {
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await mdo.convertReqParamToSendMessageInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, null);
      return;
    }
    const reqSendMessageInfo: mdo.ReqSendMessageInfo = resultInfo.data;

    const sqlDataManager: SQLDataManager = <SQLDataManager>(
      await getSQLDataManager(DBSOURCE_ADMIN, reqSendMessageInfo.serverType)
    );

    // 메세지 타입이 '우편함'인지, '푸쉬알람'인지에 따라 ACL 정책키 결정
    let aclPolicyKey = aclManager.ACL_POLICY_MESSAGE_INBOX_SEND;
    if (reqSendMessageInfo.msgType === mdo.USERMESSAGE_TYPE_PUSHALARM) {
      aclPolicyKey = aclManager.ACL_POLICY_MESSAGE_PUSH_SEND;
    }

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(
      req,
      res,
      sqlDataManager,
      reqSendMessageInfo,
      aclPolicyKey
    );
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    let pushReqID = -1;
    let pushJobID = "";
    let dbQueryInfo = getResultForm(0, "", null);
    // 게임서버에 우편함 메세지 보상 전송하기
    if (reqSendMessageInfo.msgType === mdo.USERMESSAGE_TYPE_INBOX) {
      if (reqSendMessageInfo.targetType === constants.MSGTARGET_TYPE_USER) {
        // 일반 메세지
        const messageType = 0;
        for (let i = 0; i < reqSendMessageInfo.targetUserIDTable.length; i++) {
          const bodyInfo = {
            ToUserId: reqSendMessageInfo.targetUserIDTable[i],
            MessageType: 0,
            MessageSubject: getTitle(
              reqSendMessageInfo.titleTable,
              getLangTypeFromCode(10)
            ),
            MessageBody: getContent(
              reqSendMessageInfo.contentTable,
              getLangTypeFromCode(10)
            ),
            UserMessageItems: reqSendMessageInfo.rewardData,
          };

          let targetURL = cmnSvcProcessor.getGameServerURL(
            reqSendMessageInfo.serverType,
            `/User/Messages/Send/${messageType}/${reqSendMessageInfo.targetUserIDTable[i]}`
          );

          console.log("[GAME SERVER] bodyInfo=", bodyInfo);
          console.log("[GAME SERVER] targetURL=", targetURL);

          const res2 = await axios.post(targetURL, bodyInfo, {
            headers: { "Content-type": "application/json" },
          });

          const failUserIDList = [];
          if (res2.status !== 200) {
            console.log("[GAME SERVER] response=", res2);
            failUserIDList.push(reqSendMessageInfo.targetUserID[i]);

            resultInfo.resultCode =
              ResultCode.MESSAGE_SENDNEWMSG_SENDINGTOGAMESERVER_FAILED;
            resultInfo.message =
              ReqValidationErrorMsg[resultInfo.resultCode.toString()];
            resultInfo.data = failUserIDList;
            cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
            return;
          }
        }
      } else {
        // 프리 메세지

        console.log("[PRE-MESSAGE] startTime=", reqSendMessageInfo.startTime);
        console.log("[PRE-MESSAGE] endTime=", reqSendMessageInfo.endTime);

        //const timezoneOffset = Utils.getLocalTimezoneOffset();
        const startTimeUTC =
          reqSendMessageInfo.startTime.replace(" ", "T") + "+09:00";
        const endTimeUTC =
          reqSendMessageInfo.endTime.replace(" ", "T") + "+09:00";

        console.log("[PRE-MESSAGE] startTimeUTC=", startTimeUTC);
        console.log("[PRE-MESSAGE] endTimeUTC=", endTimeUTC);

        const bodyInfo = {
          MessageName: reqSendMessageInfo.presetTitle,
          MessagePresetId: reqSendMessageInfo.langPresetID,
          RewardPresetId: reqSendMessageInfo.rewardPresetID,
          MessageBegin: startTimeUTC,
          MessageEnd: endTimeUTC,
        };

        let targetURL = cmnSvcProcessor.getGameServerURL(
          reqSendMessageInfo.serverType,
          `/Resource/PreMessages/Add/0`
        );

        console.log("[GAME SERVER] bodyInfo=", bodyInfo);
        console.log("[GAME SERVER] targetURL=", targetURL);

        const res2 = await axios.post(targetURL, bodyInfo, {
          headers: { "Content-type": "application/json" },
        });

        if (res2.status !== 200) {
          console.log("[GAME SERVER] response=", res2);

          resultInfo.resultCode =
            ResultCode.MESSAGE_SENDNEWMSG_SENDINGTOGAMESERVER_FAILED;
          resultInfo.message =
            ReqValidationErrorMsg[resultInfo.resultCode.toString()];
          cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
          return;
        }
      }

      // 메세지 송신정보 DB에 갱신
      dbQueryInfo = await userMsgDataHandler.registerDBNewMessage(
        sqlDataManager,
        reqSendMessageInfo
      );
      if (dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res, dbQueryInfo, sqlDataManager);
        return;
      }
    } else {
      // 푸쉬메세지 전송 요청이면,

      reqSendMessageInfo.rewardData = { state: 0, resultCode: 0, message: "" };

      // 메세지 송신정보 DB에 갱신
      dbQueryInfo = await userMsgDataHandler.registerDBNewMessage(
        sqlDataManager,
        reqSendMessageInfo
      );
      if (dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
        cmnSvcProcessor.sendResponse(res, dbQueryInfo, sqlDataManager);
        return;
      }

      reqSendMessageInfo.msgID = dbQueryInfo.data.insertId;

      const startTimeObj = dayjs(reqSendMessageInfo.startTime);
      if (startTimeObj.isBefore(dayjs()) === true) {
        reqSendMessageInfo.reservationFlag = false;
      }

      // 메세지가 예약메세지이면 스케쥴러에 등록!!
      if (reqSendMessageInfo.reservationFlag === true) {
        // 예약 메세지라면 예약시킴.
        const date = dayjs(reqSendMessageInfo.startTime).toDate();
        pushJobID = await scheduler.addJob(
          "push",
          date,
          sendPushScheduleFunc,
          { ...reqSendMessageInfo }
        );

        console.log(
          "[SCHEDULER] message scheduled:" + "pushJobID=" + pushJobID
        );
      } else {
        // 즉시 보냄
        resultInfo = await sendPushScheduleFunc(reqSendMessageInfo);
        pushReqID = resultInfo.data.reqID;

        console.log(
          `[PUSH_SERVER] result=${JSON.stringify(resultInfo, null, 2)}`
        );
      }
    }

    dbQueryInfo = {
      ...dbQueryInfo,
      data: { ...dbQueryInfo.data, reservationFlag:reqSendMessageInfo.reservationFlag, reqID: (reqSendMessageInfo.reservationFlag===true?pushJobID:pushReqID), startTime:reqSendMessageInfo.startTime, failUserIDList: [] },
    };

    // 메세지 전송 활동로그 DB에 저장
    const logDetailInfo: string = `{"msgType":${
      reqSendMessageInfo.msgType
    },"targetUserID":${
      reqSendMessageInfo.targetUserID
    },"title":${JSON.stringify(
      reqSendMessageInfo.titleTable
    )},"content":${JSON.stringify(
      reqSendMessageInfo.contentTable
    )},"liveFlag":${reqSendMessageInfo.liveFlag},"startTime":${
      reqSendMessageInfo.startTime
    },"creationTime":${reqSendMessageInfo.creationTime},"rewardData":${
      reqSendMessageInfo.rewardData
    }}`;
    await cmnSvcProcessor.writeDBActivityLog(
      sqlDataManager,
      reqSendMessageInfo.adminID,
      activityType.ADMINACTIVITY_TYPE_MESSAGE_SEND,
      logDetailInfo
    );

    cmnSvcProcessor.sendResponse(res, dbQueryInfo, sqlDataManager);
  } catch (err) {
    console.log(err);

    const resultInfo = {
      resultCode: ResultCode.SYSTEM_INTERNALERROR,
      message:
        ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
      data: err,
    };

    cmnSvcProcessor.sendResponse(res, resultInfo, null);
  }

  serviceLogger.logDebug("##### [END] sendMessage()");
};
router.post("/send", sendMessage);

// 예약 메세지 수정
const updateScheduledMessage = async (req: Request, res: Response) => {
  serviceLogger.logDebug("##### [START] updateScheduledMessage()");

  try {
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await mdo.convertReqParamToUpdateMessageInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, null);
      return;
    }
    const reqUpdateMessageInfo: mdo.ReqUpdateMessageInfo = resultInfo.data;

    const sqlDataManager: SQLDataManager = <SQLDataManager>(
      await getSQLDataManager(DBSOURCE_ADMIN, reqUpdateMessageInfo.serverType)
    );

    // 메세지 타입이 '우편함'인지, '푸쉬알람'인지에 따라 ACL 정책키 결정
    let aclPolicyKey = aclManager.ACL_POLICY_MESSAGE_INBOX_UPDATE;
    if (reqUpdateMessageInfo.msgType === mdo.USERMESSAGE_TYPE_PUSHALARM) {
      aclPolicyKey = aclManager.ACL_POLICY_MESSAGE_PUSH_UPDATE;
    }

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(
      req,
      res,
      sqlDataManager,
      reqUpdateMessageInfo,
      aclPolicyKey
    );
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    const loginAccountInfo: ado.AccountInfo = resultInfo.data;

    // 수정된 예약메시지 정보를 DB에 갱신
    const dbQueryInfo = await userMsgDataHandler.updateDBMessage(
      sqlDataManager,
      reqUpdateMessageInfo
    );
    if (dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, dbQueryInfo, sqlDataManager);
      return;
    }

    // 공지사항 수정 활동로그 DB에 저장
    const logDetailInfo: string = `{"msgID":${
      reqUpdateMessageInfo.msgID
    },"targetUserID":${reqUpdateMessageInfo.targetUserID},"msgID":${
      reqUpdateMessageInfo.msgID
    },"title":${JSON.stringify(
      reqUpdateMessageInfo.titleTable
    )},"content":${JSON.stringify(
      reqUpdateMessageInfo.contentTable
    )},"liveFlag":${reqUpdateMessageInfo.liveFlag},"startTime":${
      reqUpdateMessageInfo.startTime
    },'rewardData':${reqUpdateMessageInfo.rewardData}}`;
    await cmnSvcProcessor.writeDBActivityLog(
      sqlDataManager,
      reqUpdateMessageInfo.adminID,
      activityType.ADMINACTIVITY_TYPE_MESSAGE_UPDATE,
      logDetailInfo
    );

    cmnSvcProcessor.sendResponse(res, dbQueryInfo, sqlDataManager);
  } catch (err) {
    console.log(err);

    const resultInfo = {
      resultCode: ResultCode.SYSTEM_INTERNALERROR,
      message:
        ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
      data: err,
    };

    cmnSvcProcessor.sendResponse(res, resultInfo, null);
  }

  serviceLogger.logDebug("##### [END] updateScheduledMessage()");
};
router.post("/update", updateScheduledMessage);

// 메세지(들) 삭제
const deleteMessages = async (req: Request, res: Response) => {
  serviceLogger.logDebug("##### [START] deleteMessages()");

  try {
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await mdo.convertReqParamToDeleteMessagesInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, null);
      return;
    }
    const reqDeleteMessagesInfo: mdo.ReqDeleteMessagesInfo = resultInfo.data;

    const sqlDataManager: SQLDataManager = <SQLDataManager>(
      await getSQLDataManager(DBSOURCE_ADMIN, reqDeleteMessagesInfo.serverType)
    );

    // 메세지 타입이 '우편함'인지, '푸쉬알람'인지에 따라 ACL 정책키 결정
    let aclPolicyKey = aclManager.ACL_POLICY_MESSAGE_INBOX_DELETE;
    if (reqDeleteMessagesInfo.msgType === mdo.USERMESSAGE_TYPE_PUSHALARM) {
      aclPolicyKey = aclManager.ACL_POLICY_MESSAGE_PUSH_DELETE;
    }

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(
      req,
      res,
      sqlDataManager,
      reqDeleteMessagesInfo,
      aclPolicyKey
    );
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    const loginAccountInfo: ado.AccountInfo = resultInfo.data;

    // DB에서 메세지(들) 삭제
    const dbQueryInfo = await userMsgDataHandler.deleteDBMessages(
      sqlDataManager,
      reqDeleteMessagesInfo
    );
    if (dbQueryInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, dbQueryInfo, sqlDataManager);
      return;
    }

    // 메세지 삭제 활동로그 DB에 저장
    let idList = "";
    for (let v of reqDeleteMessagesInfo.msgIDList) {
      idList += v.toString() + ",";
    }
    const logDetailInfo: string = `{"msgType":${reqDeleteMessagesInfo.msgType},"msgIDList":${idList}}`;
    await cmnSvcProcessor.writeDBActivityLog(
      sqlDataManager,
      reqDeleteMessagesInfo.adminID,
      activityType.ADMINACTIVITY_TYPE_MESSAGE_DELETE,
      logDetailInfo
    );

    cmnSvcProcessor.sendResponse(res, dbQueryInfo, sqlDataManager);
  } catch (err) {
    console.log(err);

    const resultInfo = {
      resultCode: ResultCode.SYSTEM_INTERNALERROR,
      message:
        ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
      data: err,
    };

    cmnSvcProcessor.sendResponse(res, resultInfo, null);
  }

  serviceLogger.logDebug("##### [END] deleteMessages()");
};
router.post("/delete", deleteMessages);

// 언어프리셋 목록 조회
const queryLanguagePresetList = async (req: Request, res: Response) => {
  serviceLogger.logDebug("##### [START] queryLanguagePresetList()");

  try {
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await mdo.convertReqParamToLanguagePresetListInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, null);
      return;
    }
    const reqLanguagePresetListInfo: mdo.ReqLanguagePresetListInfo =
      resultInfo.data;

    const sqlDataManager: SQLDataManager = <SQLDataManager>(
      await getSQLDataManager(
        DBSOURCE_ADMIN,
        reqLanguagePresetListInfo.serverType
      )
    );

    // 메세지 타입이 '우편함'인지, '푸쉬알람'인지에 따라 ACL 정책키 결정
    let aclPolicyKey = aclManager.ACL_POLICY_ALL;

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(
      req,
      res,
      sqlDataManager,
      reqLanguagePresetListInfo,
      aclPolicyKey
    );
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    const loginAccountInfo: ado.AccountInfo = resultInfo.data;

    // 게임서버에서 처리
    // public enum MessageType
    // {
    //     System = 0,
    //     Notice = 1,
    //     Coupon = 2,
    //     User = 3,
    //     Guild = 4,
    //     Event = 10,
    //     Reward = 11,
    //     Shop = 100
    // }
    let targetURL = cmnSvcProcessor.getGameServerURL(
      reqLanguagePresetListInfo.serverType,
      `/Resource/Messages/MessagePreset/${reqLanguagePresetListInfo.presetType}`
    );
    console.log("[GAME SERVER] targetURL=", targetURL);

    const res2 = await axios.get(targetURL, {
      headers: { "Content-Security-Policy": "upgrade-insecure-requests" },
    });
    console.log("[GAME SERVER] response=", JSON.stringify(res2.data, null, 2));

    if (res2.status !== 200) {
      resultInfo.resultCode = ResultCode.MESSAGE_LANGPRESET_LIST_REQUESTFAILED;
      resultInfo.message =
        ReqValidationErrorMsg[resultInfo.resultCode.toString()];
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    const langPresetTable = res2.data === null ? [] : res2.data.reverse();

    const pageNum = parseInt(<string>process.env.QUERY_NUM_PERPAGE);
    const startIndex =
      pageNum *
      ((reqLanguagePresetListInfo.pageNo < 1
        ? 1
        : reqLanguagePresetListInfo.pageNo) -
        1);
    const endIndex = startIndex + pageNum - 1;

    const langPresetList = [];
    for (let i = 0; i < langPresetTable.length; i++) {
      if (i >= startIndex && i <= endIndex) {
        langPresetList.push(langPresetTable[i]);
      }
    }
    resultInfo.data = {
      totalCount: langPresetTable.length,
      list: langPresetList,
    };

    cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
  } catch (err) {
    console.log(err);

    const resultInfo = {
      resultCode: ResultCode.SYSTEM_INTERNALERROR,
      message:
        ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
      data: err,
    };

    cmnSvcProcessor.sendResponse(res, resultInfo, null);
  }

  serviceLogger.logDebug("##### [END] queryLanguagePresetList()");
};
router.get("/preset/lang/list", queryLanguagePresetList);

// 언어프리셋 항목 조회
const queryLanguagePreset = async (req: Request, res: Response) => {
  serviceLogger.logDebug("##### [START] queryLanguagePreset()");

  try {
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await mdo.convertReqParamToLanguagePresetInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, null);
      return;
    }
    const reqLanguagePresetInfo: mdo.ReqLanguagePresetInfo = resultInfo.data;

    const sqlDataManager: SQLDataManager = <SQLDataManager>(
      await getSQLDataManager(DBSOURCE_ADMIN, reqLanguagePresetInfo.serverType)
    );

    // 메세지 타입이 '우편함'인지, '푸쉬알람'인지에 따라 ACL 정책키 결정
    let aclPolicyKey = aclManager.ACL_POLICY_ALL;

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(
      req,
      res,
      sqlDataManager,
      reqLanguagePresetInfo,
      aclPolicyKey
    );
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    const loginAccountInfo: ado.AccountInfo = resultInfo.data;

    let targetURL = cmnSvcProcessor.getGameServerURL(
      reqLanguagePresetInfo.serverType,
      `/Resource/Messages/MessagePreset/${reqLanguagePresetInfo.presetType}`
    );
    console.log("[GAME SERVER] targetURL=", targetURL);

    const res2 = await axios.get(targetURL, {
      headers: { "Content-Security-Policy": "upgrade-insecure-requests" },
    });
    console.log("[GAME SERVER] response=", JSON.stringify(res2.data, null, 2));

    if (res2.status !== 200) {
      resultInfo.resultCode = ResultCode.MESSAGE_LANGPRESET_LIST_REQUESTFAILED;
      resultInfo.message =
        ReqValidationErrorMsg[resultInfo.resultCode.toString()];
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    let rewardPreset = null;
    for (let i = 0; i < res2.data.length; i++) {
      if (res2.data[i].id === reqLanguagePresetInfo.presetID) {
        rewardPreset = res2.data[i];
        break;
      }
    }
    resultInfo.data = rewardPreset;

    cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
  } catch (err) {
    console.log(err);

    const resultInfo = {
      resultCode: ResultCode.SYSTEM_INTERNALERROR,
      message:
        ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
      data: err,
    };

    cmnSvcProcessor.sendResponse(res, resultInfo, null);
  }

  serviceLogger.logDebug("##### [END] queryLanguagePreset()");
};
router.post("/preset/lang/item", queryLanguagePreset);

// 언어프리셋 추가
const addLanguagePreset = async (req: Request, res: Response) => {
  serviceLogger.logDebug("##### [START] addLanguagePreset()");

  try {
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await mdo.convertReqParamToUpdateLanguagePresetInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, null);
      return;
    }
    const reqAddLanguagePresetInfo: mdo.ReqAddLanguagePresetInfo =
      resultInfo.data;

    const sqlDataManager: SQLDataManager = <SQLDataManager>(
      await getSQLDataManager(
        DBSOURCE_ADMIN,
        reqAddLanguagePresetInfo.serverType
      )
    );

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(
      req,
      res,
      sqlDataManager,
      reqAddLanguagePresetInfo,
      aclManager.ACL_POLICY_MESSAGE_INBOX_SEND
    );
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    const loginAccountInfo: ado.AccountInfo = resultInfo.data;

    // 게임서버에서 처리
    let targetURL = cmnSvcProcessor.getGameServerURL(
      reqAddLanguagePresetInfo.serverType,
      `/Resource/Messages/MessagePresetAdd/${reqAddLanguagePresetInfo.presetID}`
    );
    console.log("[GAME SERVER] targetURL=", targetURL);
    console.log("[GAME SERVER] bodyInfo=", reqAddLanguagePresetInfo.bodyInfo);

    const res2 = await axios.post(
      targetURL,
      reqAddLanguagePresetInfo.bodyInfo,
      { headers: { "Content-Security-Policy": "upgrade-insecure-requests" } }
    );
    console.log("[GAME SERVER] response=", JSON.stringify(res2.data, null, 2));

    if (res2.status !== 200) {
      resultInfo.resultCode = ResultCode.MESSAGE_LANGPRESET_ADD_REQUESTFAILED;
      resultInfo.message =
        ReqValidationErrorMsg[resultInfo.resultCode.toString()];
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    // 언어프리셋 수정 활동로그 DB에 저장
    const logDetailInfo: string = `{"presetID":${
      reqAddLanguagePresetInfo.presetID
    },"bodyInfo":${JSON.stringify(reqAddLanguagePresetInfo.bodyInfo)}}`;
    await cmnSvcProcessor.writeDBActivityLog(
      sqlDataManager,
      reqAddLanguagePresetInfo.adminID,
      activityType.ADMINACTIVITY_TYPE_LANGPRESET_UPDATE,
      logDetailInfo
    );

    cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
  } catch (err) {
    console.log(err);

    const resultInfo = {
      resultCode: ResultCode.SYSTEM_INTERNALERROR,
      message:
        ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
      data: err,
    };

    cmnSvcProcessor.sendResponse(res, resultInfo, null);
  }

  serviceLogger.logDebug("##### [END] addLanguagePreset()");
};
router.post("/preset/lang/add", addLanguagePreset);

// 언어프리셋 수정
const updateLanguagePreset = async (req: Request, res: Response) => {
  serviceLogger.logDebug("##### [START] updateLanguagePreset()");

  try {
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await mdo.convertReqParamToUpdateLanguagePresetInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, null);
      return;
    }
    const reqUpdateLanguagePresetInfo: mdo.ReqUpdateLanguagePresetInfo =
      resultInfo.data;

    const sqlDataManager: SQLDataManager = <SQLDataManager>(
      await getSQLDataManager(
        DBSOURCE_ADMIN,
        reqUpdateLanguagePresetInfo.serverType
      )
    );

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(
      req,
      res,
      sqlDataManager,
      reqUpdateLanguagePresetInfo,
      aclManager.ACL_POLICY_MESSAGE_INBOX_UPDATE
    );
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    const loginAccountInfo: ado.AccountInfo = resultInfo.data;

    // 게임서버에서 처리
    let targetURL = cmnSvcProcessor.getGameServerURL(
      reqUpdateLanguagePresetInfo.serverType,
      `/Resource/Messages/MessagePresetModify/${reqUpdateLanguagePresetInfo.presetID}`
    );
    console.log("[GAME SERVER] targetURL=", targetURL);
    console.log(
      "[GAME SERVER] bodyInfo=",
      reqUpdateLanguagePresetInfo.bodyInfo
    );

    const res2 = await axios.post(
      targetURL,
      reqUpdateLanguagePresetInfo.bodyInfo,
      { headers: { "Content-Security-Policy": "upgrade-insecure-requests" } }
    );
    console.log("[GAME SERVER] response=", JSON.stringify(res2.data, null, 2));

    if (res2.status !== 200) {
      resultInfo.resultCode =
        ResultCode.MESSAGE_LANGPRESET_UPDATE_REQUESTFAILED;
      resultInfo.message =
        ReqValidationErrorMsg[resultInfo.resultCode.toString()];
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    // 언어프리셋 수정 활동로그 DB에 저장
    const logDetailInfo: string = `{"presetID":${
      reqUpdateLanguagePresetInfo.presetID
    },"bodyInfo":${JSON.stringify(reqUpdateLanguagePresetInfo.bodyInfo)}}`;
    await cmnSvcProcessor.writeDBActivityLog(
      sqlDataManager,
      reqUpdateLanguagePresetInfo.adminID,
      activityType.ADMINACTIVITY_TYPE_LANGPRESET_UPDATE,
      logDetailInfo
    );

    cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
  } catch (err) {
    console.log(err);

    const resultInfo = {
      resultCode: ResultCode.SYSTEM_INTERNALERROR,
      message:
        ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
      data: err,
    };

    cmnSvcProcessor.sendResponse(res, resultInfo, null);
  }

  serviceLogger.logDebug("##### [END] updateLanguagePreset()");
};
router.post("/preset/lang/update", updateLanguagePreset);

// 언어프리셋(들) 삭제
const deleteLanguagePresets = async (req: Request, res: Response) => {
  serviceLogger.logDebug("##### [START] deleteLanguagePresets()");

  try {
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await mdo.convertReqParamToDeleteLanguagePresetInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, null);
      return;
    }
    const reqDeleteLanguagePresetInfo: mdo.ReqDeleteLanguagePresetInfo =
      resultInfo.data;

    const sqlDataManager: SQLDataManager = <SQLDataManager>(
      await getSQLDataManager(
        DBSOURCE_ADMIN,
        reqDeleteLanguagePresetInfo.serverType
      )
    );

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(
      req,
      res,
      sqlDataManager,
      reqDeleteLanguagePresetInfo,
      aclManager.ACL_POLICY_MESSAGE_INBOX_DELETE
    );
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    const loginAccountInfo: ado.AccountInfo = resultInfo.data;

    // 게임서버에서 처리
    let targetURL = cmnSvcProcessor.getGameServerURL(
      reqDeleteLanguagePresetInfo.serverType,
      `/Resource/Messages/MessagePresetDelete/${reqDeleteLanguagePresetInfo.presetIDList[0]}`
    );
    console.log("[GAME SERVER] targetURL=", targetURL);

    const res2 = await axios.post(targetURL, {
      headers: { "Content-Security-Policy": "upgrade-insecure-requests" },
    });
    console.log("[GAME SERVER] response=", JSON.stringify(res2.data, null, 2));

    if (res2.status !== 200) {
      resultInfo.resultCode =
        ResultCode.MESSAGE_LANGPRESET_DELETE_REQUESTFAILED;
      resultInfo.message =
        ReqValidationErrorMsg[resultInfo.resultCode.toString()];
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    // 메세지 삭제 활동로그 DB에 저장
    let idList = "";
    for (let v of reqDeleteLanguagePresetInfo.presetIDList) {
      idList += v.toString() + ",";
    }
    const logDetailInfo: string = `{"presetIDList":${idList}}`;
    await cmnSvcProcessor.writeDBActivityLog(
      sqlDataManager,
      reqDeleteLanguagePresetInfo.adminID,
      activityType.ADMINACTIVITY_TYPE_LANGPRESET_DELETE,
      logDetailInfo
    );

    cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
  } catch (err) {
    console.log(err);

    const resultInfo = {
      resultCode: ResultCode.SYSTEM_INTERNALERROR,
      message:
        ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
      data: err,
    };

    cmnSvcProcessor.sendResponse(res, resultInfo, null);
  }

  serviceLogger.logDebug("##### [END] deleteRewardPresets()");
};
router.post("/preset/lang/delete", deleteLanguagePresets);

// 보상프리셋 목록 조회
const queryRewardPresetList = async (req: Request, res: Response) => {
  serviceLogger.logDebug("##### [START] queryRewardPresetList()");

  try {
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await mdo.convertReqParamToRewardPresetListInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, null);
      return;
    }
    const reqRewardPresetListInfo: mdo.ReqRewardPresetListInfo =
      resultInfo.data;

    const sqlDataManager: SQLDataManager = <SQLDataManager>(
      await getSQLDataManager(
        DBSOURCE_ADMIN,
        reqRewardPresetListInfo.serverType
      )
    );

    // 메세지 타입이 '우편함'인지, '푸쉬알람'인지에 따라 ACL 정책키 결정
    let aclPolicyKey = aclManager.ACL_POLICY_ALL;

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(
      req,
      res,
      sqlDataManager,
      reqRewardPresetListInfo,
      aclPolicyKey
    );
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    const loginAccountInfo: ado.AccountInfo = resultInfo.data;

    let targetURL = cmnSvcProcessor.getGameServerURL(
      reqRewardPresetListInfo.serverType,
      `/Resource/Messages/RewardPreset`
    );
    console.log("[GAME SERVER] targetURL=", targetURL);

    const res2 = await axios.get(targetURL, {
      headers: { "Content-Security-Policy": "upgrade-insecure-requests" },
    });
    console.log("[GAME SERVER] response=", JSON.stringify(res2.data, null, 2));

    if (res2.status !== 200) {
      resultInfo.resultCode =
        ResultCode.MESSAGE_REWARDPRESET_LIST_REQUESTFAILED;
      resultInfo.message =
        ReqValidationErrorMsg[resultInfo.resultCode.toString()];
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    const rewardPresetTable = res2.data === null ? [] : res2.data.reverse();

    const pageNum = parseInt(<string>process.env.QUERY_NUM_PERPAGE);
    const startIndex =
      pageNum *
      ((reqRewardPresetListInfo.pageNo < 1
        ? 1
        : reqRewardPresetListInfo.pageNo) -
        1);
    const endIndex = startIndex + pageNum - 1;

    const rewardPresetList = [];
    for (let i = 0; i < rewardPresetTable.length; i++) {
      if (i >= startIndex && i <= endIndex) {
        rewardPresetList.push(rewardPresetTable[i]);
      }
    }
    resultInfo.data = {
      totalCount: rewardPresetTable.length,
      list: rewardPresetList,
    };

    cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
  } catch (err) {
    console.log(err);

    const resultInfo = {
      resultCode: ResultCode.SYSTEM_INTERNALERROR,
      message:
        ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
      data: err,
    };

    cmnSvcProcessor.sendResponse(res, resultInfo, null);
  }

  serviceLogger.logDebug("##### [END] queryRewardPresetList()");
};
router.get("/preset/reward/list", queryRewardPresetList);

// 보상프리셋 항목 조회
const queryRewardPreset = async (req: Request, res: Response) => {
  serviceLogger.logDebug("##### [START] queryRewardPreset()");

  try {
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await mdo.convertReqParamToRewardPresetInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, null);
      return;
    }
    const reqRewardPresetInfo: mdo.ReqRewardPresetInfo = resultInfo.data;

    const sqlDataManager: SQLDataManager = <SQLDataManager>(
      await getSQLDataManager(DBSOURCE_ADMIN, reqRewardPresetInfo.serverType)
    );

    // 메세지 타입이 '우편함'인지, '푸쉬알람'인지에 따라 ACL 정책키 결정
    let aclPolicyKey = aclManager.ACL_POLICY_ALL;

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(
      req,
      res,
      sqlDataManager,
      reqRewardPresetInfo,
      aclPolicyKey
    );
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    const loginAccountInfo: ado.AccountInfo = resultInfo.data;

    let targetURL = cmnSvcProcessor.getGameServerURL(
      reqRewardPresetInfo.serverType,
      `/Resource/Messages/RewardPreset`
    );
    console.log("[GAME SERVER] targetURL=", targetURL);

    const res2 = await axios.get(targetURL, {
      headers: { "Content-Security-Policy": "upgrade-insecure-requests" },
    });
    console.log("[GAME SERVER] response=", JSON.stringify(res2.data, null, 2));

    if (res2.status !== 200) {
      resultInfo.resultCode =
        ResultCode.MESSAGE_REWARDPRESET_LIST_REQUESTFAILED;
      resultInfo.message =
        ReqValidationErrorMsg[resultInfo.resultCode.toString()];
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    let rewardPreset = null;
    for (let i = 0; i < res2.data.length; i++) {
      if (res2.data[i].id === reqRewardPresetInfo.presetID) {
        rewardPreset = res2.data[i];
        break;
      }
    }
    resultInfo.data = rewardPreset;

    cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
  } catch (err) {
    console.log(err);

    const resultInfo = {
      resultCode: ResultCode.SYSTEM_INTERNALERROR,
      message:
        ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
      data: err,
    };

    cmnSvcProcessor.sendResponse(res, resultInfo, null);
  }

  serviceLogger.logDebug("##### [END] queryRewardPreset()");
};
router.post("/preset/reward/item", queryRewardPreset);

// 보상프리셋 추가
const addRewardPreset = async (req: Request, res: Response) => {
  serviceLogger.logDebug("##### [START] addRewardPreset()");

  try {
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await mdo.convertReqParamToAddRewardPresetInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, null);
      return;
    }
    const reqAddRewardPresetInfo: mdo.ReqAddRewardPresetInfo = resultInfo.data;

    const sqlDataManager: SQLDataManager = <SQLDataManager>(
      await getSQLDataManager(DBSOURCE_ADMIN, reqAddRewardPresetInfo.serverType)
    );

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(
      req,
      res,
      sqlDataManager,
      reqAddRewardPresetInfo,
      aclManager.ACL_POLICY_MESSAGE_INBOX_SEND
    );
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    const loginAccountInfo: ado.AccountInfo = resultInfo.data;

    // 게임서버에서 처리
    let targetURL = cmnSvcProcessor.getGameServerURL(
      reqAddRewardPresetInfo.serverType,
      `/Resource/Messages/RewardPresetAdd/${reqAddRewardPresetInfo.presetID}`
    );
    console.log("[GAME SERVER] targetURL=", targetURL);
    const rewardInfo = makeRewardPresetInfoForGameServer(
      reqAddRewardPresetInfo.rewardData
    );
    console.log("[GAME SERVER] bodyInfo=", JSON.stringify(rewardInfo, null, 2));

    const res2 = await axios.post(targetURL, rewardInfo, {
      headers: { "Content-Security-Policy": "upgrade-insecure-requests" },
    });
    console.log("[GAME SERVER] response=", JSON.stringify(res2.data, null, 2));

    if (res2.status !== 200) {
      resultInfo.resultCode = ResultCode.MESSAGE_REWARDPRESET_ADD_REQUESTFAILED;
      resultInfo.message =
        ReqValidationErrorMsg[resultInfo.resultCode.toString()];
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    // 보상프리셋 수정 활동로그 DB에 저장
    const logDetailInfo: string = `{"presetID":${
      reqAddRewardPresetInfo.presetID
    },"rewardData":${JSON.stringify(rewardInfo)}}`;
    await cmnSvcProcessor.writeDBActivityLog(
      sqlDataManager,
      reqAddRewardPresetInfo.adminID,
      activityType.ADMINACTIVITY_TYPE_REWARDPRESET_ADD,
      logDetailInfo
    );

    cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
  } catch (err) {
    console.log(err);

    const resultInfo = {
      resultCode: ResultCode.SYSTEM_INTERNALERROR,
      message:
        ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
      data: err,
    };

    cmnSvcProcessor.sendResponse(res, resultInfo, null);
  }

  serviceLogger.logDebug("##### [END] addRewardPreset()");
};
router.post("/preset/reward/add", addRewardPreset);

// 보상프리셋 수정
const updateRewardPreset = async (req: Request, res: Response) => {
  serviceLogger.logDebug("##### [START] updateRewardPreset()");

  try {
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await mdo.convertReqParamToUpdateRewardPresetInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, null);
      return;
    }
    const reqUpdateRewardPresetInfo: mdo.ReqUpdateRewardPresetInfo =
      resultInfo.data;

    const sqlDataManager: SQLDataManager = <SQLDataManager>(
      await getSQLDataManager(
        DBSOURCE_ADMIN,
        reqUpdateRewardPresetInfo.serverType
      )
    );

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(
      req,
      res,
      sqlDataManager,
      reqUpdateRewardPresetInfo,
      aclManager.ACL_POLICY_MESSAGE_INBOX_UPDATE
    );
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    const loginAccountInfo: ado.AccountInfo = resultInfo.data;

    // 게임서버에서 처리
    let targetURL = cmnSvcProcessor.getGameServerURL(
      reqUpdateRewardPresetInfo.serverType,
      `/Resource/Messages/RewardPresetModify/${reqUpdateRewardPresetInfo.presetID}`
    );
    console.log("[GAME SERVER] targetURL=", targetURL);
    const rewardInfo = makeRewardPresetInfoForGameServer(
      reqUpdateRewardPresetInfo.rewardData
    );
    console.log("[GAME SERVER] bodyInfo=", JSON.stringify(rewardInfo, null, 2));

    const res2 = await axios.post(targetURL, rewardInfo, {
      headers: { "Content-Security-Policy": "upgrade-insecure-requests" },
    });
    console.log("[GAME SERVER] response=", JSON.stringify(res2.data, null, 2));

    if (res2.status !== 200) {
      resultInfo.resultCode =
        ResultCode.MESSAGE_REWARDPRESET_UPDATE_REQUESTFAILED;
      resultInfo.message =
        ReqValidationErrorMsg[resultInfo.resultCode.toString()];
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    // 보상프리셋 수정 활동로그 DB에 저장
    const logDetailInfo: string = `{"presetID":${
      reqUpdateRewardPresetInfo.presetID
    },"rewardData":${JSON.stringify(reqUpdateRewardPresetInfo.rewardData)}}`;
    await cmnSvcProcessor.writeDBActivityLog(
      sqlDataManager,
      reqUpdateRewardPresetInfo.adminID,
      activityType.ADMINACTIVITY_TYPE_REWARDPRESET_UPDATE,
      logDetailInfo
    );

    cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
  } catch (err) {
    console.log(err);

    const resultInfo = {
      resultCode: ResultCode.SYSTEM_INTERNALERROR,
      message:
        ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
      data: err,
    };

    cmnSvcProcessor.sendResponse(res, resultInfo, null);
  }

  serviceLogger.logDebug("##### [END] updateRewardPreset()");
};
router.post("/preset/reward/update", updateRewardPreset);

// 보상프리셋(들) 삭제
const deleteRewardPresets = async (req: Request, res: Response) => {
  serviceLogger.logDebug("##### [START] deleteRewardPresets()");

  try {
    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await mdo.convertReqParamToDeleteRewardPresetInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, null);
      return;
    }
    const reqDeleteRewardPresetInfo: mdo.ReqDeleteRewardPresetInfo =
      resultInfo.data;

    const sqlDataManager: SQLDataManager = <SQLDataManager>(
      await getSQLDataManager(
        DBSOURCE_ADMIN,
        reqDeleteRewardPresetInfo.serverType
      )
    );

    // 토큰 유효성과 요청을 실행할 권한이 있는지 체크
    resultInfo = await preprocessNotificationRequest(
      req,
      res,
      sqlDataManager,
      reqDeleteRewardPresetInfo,
      aclManager.ACL_POLICY_MESSAGE_INBOX_DELETE
    );
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    const loginAccountInfo: ado.AccountInfo = resultInfo.data;

    // 게임서버에서 처리
    let targetURL = cmnSvcProcessor.getGameServerURL(
      reqDeleteRewardPresetInfo.serverType,
      `/Resource/Messages/RewardPresetDelete/${reqDeleteRewardPresetInfo.presetIDList[0]}`
    );
    console.log("[GAME SERVER] targetURL=", targetURL);

    const res2 = await axios.post(targetURL, {
      headers: { "Content-Security-Policy": "upgrade-insecure-requests" },
    });
    console.log("[GAME SERVER] response=", JSON.stringify(res2.data, null, 2));

    if (res2.status !== 200) {
      resultInfo.resultCode =
        ResultCode.MESSAGE_REWARDPRESET_DELETE_REQUESTFAILED;
      resultInfo.message =
        ReqValidationErrorMsg[resultInfo.resultCode.toString()];
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    // 보상프리셋 삭제 활동로그 DB에 저장
    let idList = "";
    for (let v of reqDeleteRewardPresetInfo.presetIDList) {
      idList += v.toString() + ",";
    }
    const logDetailInfo: string = `{"presetIDList":${idList}}`;
    await cmnSvcProcessor.writeDBActivityLog(
      sqlDataManager,
      reqDeleteRewardPresetInfo.adminID,
      activityType.ADMINACTIVITY_TYPE_REWARDPRESET_DELETE,
      logDetailInfo
    );

    cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
  } catch (err) {
    console.log(err);

    const resultInfo = {
      resultCode: ResultCode.SYSTEM_INTERNALERROR,
      message:
        ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
      data: err,
    };

    cmnSvcProcessor.sendResponse(res, resultInfo, null);
  }

  serviceLogger.logDebug("##### [END] deleteRewardPresets()");
};
router.post("/preset/reward/delete", deleteRewardPresets);

export default router;
