import * as svcProcessor from 'src/services/common/CommonServiceProcessor';
import { Request, Response, NextFunction } from 'express';
import { ResultInfo, ResultCode, getResultForm, ReqValidationErrorMsg } from 'src/common/ResponseManager';
import SQLDataManager from 'src/common/db/SQLDataManager';
import * as aclManager from 'src/services/common/AdminACLManager';
const { body, header, query, check } = require('express-validator');
import * as Utils from 'src/common/Utils';
import * as ndo from 'src/services/notifications/NotificationDataObject';

export const getValidatedReqParamOfNotificationList = async (req: Request): Promise<ResultInfo> => {
  const [adminID, authToken, serverType, queryFilterInfo, notiType, pageNo] = svcProcessor.getReqDataSet(req, ['adminID', 'authToken', 'serverType', 'queryFilterInfo', 'notiType', 'pageNo']);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (serverType === null || serverType === undefined || queryFilterInfo === null || queryFilterInfo === undefined || notiType === null || notiType === undefined || pageNo === null || pageNo === undefined) {
    return getResultForm(ResultCode.INVALID_REQPARAM, '', null);
  }

  // 공지사항 타입 유효성 체크
  let resultInfo = await svcProcessor.checkReqValidationOfEnum(
    req,
    parseInt(notiType),
    ndo.NOTIFICATION_TYPE_MAINTENANCE,
    ndo.NOTIFICATION_TYPE_SCROLLALARM,
    ResultCode.NOTI_REQPARAM_INVALID_NOTITYPE,
    'notiType'
  );
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  // 페이지번호 유효성 체크
  resultInfo = await svcProcessor.checkReqValidationOfPageNo(req, pageNo, ResultCode.INVALID_PAGENO, 'pageNo');
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  // 필터정보 포맷의 유효성 체크
  let queryFilterInfo2 = null;
  try {
    queryFilterInfo2 = JSON.parse(queryFilterInfo);
    if (queryFilterInfo2.titleKeyword === undefined || queryFilterInfo2.filterStartTime === undefined || queryFilterInfo2.filterEndTime === undefined) {
      resultInfo.resultCode = ResultCode.NOTI_REQPARAM_INVALID_QUERYFILTERINFO;
      resultInfo.message = ReqValidationErrorMsg.VALERRORMSG_INVALID_QUERYFILTER;
      return resultInfo;
    }

    queryFilterInfo2.titleKeyword = decodeURIComponent(queryFilterInfo2.titleKeyword);
  } catch (err) {
    resultInfo.resultCode = ResultCode.NOTI_REQPARAM_INVALID_QUERYFILTERINFO;
    resultInfo.message = ReqValidationErrorMsg.VALERRORMSG_INVALID_QUERYFILTER;
    return resultInfo;
  }

  resultInfo.data = { adminID, authToken, serverType, queryFilterInfo: queryFilterInfo2, notiType, pageNo };

  return resultInfo;
};

export const getValidatedReqParamOfNewNotification = async (req: Request): Promise<ResultInfo> => {

  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
    'adminID',
    'authToken',
    'serverType'
  ]);

  const bodyData = svcProcessor.getReqBodyData(req);
  console.log('bodyData=',JSON.stringify(bodyData));

  const {notiType, dataType, titleTable, contentTable, notShowAgainFlag, startTime, endTime, activationFlag} = bodyData;

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (
    adminID === undefined ||
    authToken === undefined ||
    serverType === undefined ||
    dataType === undefined ||
    titleTable === undefined ||
    contentTable === undefined ||
    notShowAgainFlag === undefined ||
    startTime === undefined ||
    endTime === undefined ||
    activationFlag === undefined ||
    notiType === undefined
  ) {

    console.log("param=",notiType, dataType, titleTable, contentTable, notShowAgainFlag, startTime, endTime, activationFlag);
    return getResultForm(ResultCode.INVALID_REQPARAM, 'invalid param:1', null);
  }

  try {
    let found = false;
    for(let title of titleTable) {
      if(title.langCode === undefined || title.langValue === undefined || title.content === undefined) {
        break;
      } else if(title.content.trim() !== '') {
        found = true;
      }
    }
    if(found === false) {
      return getResultForm(ResultCode.INVALID_REQPARAM, 'invalid param:3', null);
    }

    if(dataType !== ndo.NOTIFICATION_DATATYPE_URL) {
      found = false;
      for(let content of contentTable) {
        if(content.langCode === undefined || content.langValue === undefined || content.content === undefined) {
          break;
        } else if(content.content.trim() !== '') {
          found = true;
        }
      }
      if(found === false) {
        return getResultForm(ResultCode.INVALID_REQPARAM, 'invalid param:4', null);
      }
    }

  } catch(err) {
    return getResultForm(ResultCode.INVALID_REQPARAM, 'invalid param:5', null);
  }

  // 공지사항 타입 유효성 체크
  let resultInfo = await svcProcessor.checkReqValidationOfEnum(
    req,
    notiType,
    ndo.NOTIFICATION_TYPE_MAINTENANCE,
    ndo.NOTIFICATION_TYPE_SCROLLALARM,
    ResultCode.NOTI_REQPARAM_INVALID_NOTITYPE,
    'notiType'
  );
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  // 예약 공지사항 시작시각/종료시각에 대한 유효성 체크
  if (notShowAgainFlag === true) {
    resultInfo = await svcProcessor.checkReqValidationOfDuration(req, startTime, endTime, 10, ResultCode.NOTI_REQPARAM_INVALID_DURATION, 'start_time');
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      resultInfo.message = 'invalid param:7';
      return resultInfo;
    }
  }

  resultInfo.data = { adminID, authToken, serverType, notiType, dataType, titleTable, contentTable, notShowAgainFlag, startTime, endTime, activationFlag };

  return resultInfo;
};

export const getValidatedReqParamOfUpdateNotification = async (req: Request): Promise<ResultInfo> => {

  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
    'adminID',
    'authToken',
    'serverType'
  ]);

  const bodyData = svcProcessor.getReqBodyData(req);
  console.log('bodyData=',JSON.stringify(bodyData));

  const {notiID, notiType, dataType, titleTable, contentTable, notShowAgainFlag, startTime, endTime, activationFlag} = bodyData;

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (
    adminID === undefined ||
    authToken === undefined ||
    dataType === undefined ||
    titleTable === undefined ||
    contentTable === undefined ||
    serverType === undefined ||
    notiID === undefined ||
    notShowAgainFlag === undefined ||
    startTime === undefined ||
    endTime === undefined ||
    activationFlag === undefined ||
    notiType === undefined
  ) {
    return getResultForm(ResultCode.INVALID_REQPARAM, 'invalid param:1', null);
  }

  try {
    let found = false;
    for(let title of titleTable) {
      if(title.langCode === undefined || title.langValue === undefined || title.content === undefined) {
        break;
      } else if(title.content.trim() !== '') {
        found = true;
      }
    }
    if(found === false) {
      return getResultForm(ResultCode.INVALID_REQPARAM, 'invalid param:3', null);
    }

    if(dataType !== ndo.NOTIFICATION_DATATYPE_URL) {
      found = false;
      for(let content of contentTable) {
        if(content.langCode === undefined || content.langValue === undefined || content.content === undefined) {
          break;
        } else if(content.content.trim() !== '') {
          found = true;
        }
      }
      if(found === false) {
        return getResultForm(ResultCode.INVALID_REQPARAM, 'invalid param:4', null);
      }
    }

  } catch(err) {
    return getResultForm(ResultCode.INVALID_REQPARAM, 'invalid param:5', null);
  }

  // 예약 공지사항 시작시각/종료시각에 대한 유효성 체크
  let resultInfo = await svcProcessor.checkReqValidationOfDuration(req, startTime, endTime, 10, ResultCode.NOTI_REQPARAM_INVALID_DURATION, 'start_end_time');
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    resultInfo.message = 'invalid param:7';
    return resultInfo;
  }

  resultInfo.data = { adminID, authToken, serverType, notiID, dataType, notiType, titleTable, contentTable, notShowAgainFlag, startTime, endTime, activationFlag };

  return resultInfo;
};

// 공지사항 삭제 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfDeleteNotification = async (req: Request): Promise<ResultInfo> => {

  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
    'adminID',
    'authToken',
    'serverType'
  ]);

  const body = svcProcessor.getReqBodyData(req);

  console.log('body=',JSON.stringify(req.body,null,2));

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (serverType === undefined || body.notiIDList === undefined) {
    return getResultForm(ResultCode.INVALID_REQPARAM, 'invalid param:1', null);
  }

  let resultInfo = getResultForm(ResultCode.SUCCESS, '', null);

  // 아이디목록에 대한 유효성 체크
  // try {
  //   const notiIDList = JSON.parse(notiIDList);
  // } catch (err) {
  //   resultInfo.resultCode = ResultCode.NOTI_REQPARAM_INVALID_NOTIIDLIST;
  //   resultInfo.message = `notiIDList:${ReqValidationErrorMsg.VALERRORMSG_INVALID_IDLIST}`;
  //   return resultInfo;
  // }

  // 삭제한 메세지ID 목록에 대한 유효성 체크
  resultInfo.data = { adminID, authToken, serverType, notiIDList:body.notiIDList };

  return resultInfo;
};

// 공지사항 활성화/비활성화 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfNotificationActivation = async (req: Request): Promise<ResultInfo> => {
  const [adminID, authToken, serverType, notiID, activationFlag] = svcProcessor.getReqDataSet(req, ['adminID', 'authToken', 'serverType', 'notiID', 'activationFlag']);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (serverType === null || serverType === undefined || notiID === null || notiID === undefined || activationFlag === null || activationFlag === undefined) {
    return getResultForm(ResultCode.INVALID_REQPARAM, '', null);
  }

  // 대상 아이디 유효성 체크
  let resultInfo = await svcProcessor.checkReqValidationOfAccountID(req, notiID, ResultCode.NOTI_REQPARAM_INVALID_NOTIID, 'notiID');
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  // 등록/해제 플래그에 대한 유효성 체크
  resultInfo = await svcProcessor.checkReqValidationOfBool(req, activationFlag, ResultCode.NOTI_REQPARAM_INVALID_ACTIVATIONFLAG, 'activationFlag');
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  resultInfo.data = { adminID, authToken, serverType, notiID, activationFlag };

  return resultInfo;
};
