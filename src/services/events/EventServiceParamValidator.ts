import * as svcProcessor from 'src/services/common/CommonServiceProcessor';
import { Request, Response, NextFunction } from 'express';
import { ResultInfo, ResultCode, getResultForm, ReqValidationErrorMsg } from 'src/common/ResponseManager';
import SQLDataManager from 'src/common/db/SQLDataManager';
import * as Utils from 'src/common/Utils';
import * as edo from './EventDataObject';

export const getValidatedReqParamOfEventList = async (req: Request): Promise<ResultInfo> => {
  const [adminID, authToken, serverType, eventType, queryFilterInfo, pageNo] = svcProcessor.getReqDataSet(req, ['adminID', 'authToken','serverType', 'eventType', 'queryFilterInfo', 'pageNo']);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (serverType === null || serverType === undefined || eventType === null || eventType === undefined || queryFilterInfo === null || queryFilterInfo === undefined || pageNo === null || pageNo === undefined) {
    return getResultForm(ResultCode.INVALID_REQPARAM, '', null);
  }

  // 이벤트 타입 유효성 체크
  let resultInfo = await svcProcessor.checkReqValidationOfEnum(req, parseInt(eventType), edo.EVENT_TYPE_LOGINREWARD, edo.EVENT_TYPE_LOGINREWARD, ResultCode.EVENT_REQPARAM_INVALID_EVENTTYPE, 'eventType');
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
    if (queryFilterInfo2.titleKeyword === undefined || queryFilterInfo2.filterStartTime === undefined || queryFilterInfo2.filterEndTime === undefined || queryFilterInfo2.filterState === undefined) {
      resultInfo.resultCode = ResultCode.EVENT_REQPARAM_INVALID_QUERYFILTERINFO;
      resultInfo.message = ReqValidationErrorMsg.VALERRORMSG_INVALID_QUERYFILTER;
      return resultInfo;
    }

    queryFilterInfo2.titleKeyword = decodeURIComponent(queryFilterInfo2.titleKeyword);
  } catch (err) {
    resultInfo.resultCode = ResultCode.EVENT_REQPARAM_INVALID_QUERYFILTERINFO;
    resultInfo.message = ReqValidationErrorMsg.VALERRORMSG_INVALID_QUERYFILTER;
    return resultInfo;
  }

  resultInfo.data = { adminID, authToken, serverType, eventType, queryFilterInfo:queryFilterInfo2, pageNo };

  return resultInfo;
};

export const getValidatedReqParamOfRegisterEvent = async (req: Request): Promise<ResultInfo> => {

  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
    'adminID',
    'authToken',
    'serverType'
  ]);

  const bodyData = svcProcessor.getReqBodyData(req);
  const {eventType, presetTitle, langPresetID, rewardPresetID, titleTable, contentTable, rewardData, startTime, endTime, loginStartTime, loginEndTime, activationFlag} = bodyData;

  console.log('bodyData=',JSON.stringify(bodyData,null,2));

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (
    adminID === undefined ||
    authToken === undefined ||
    serverType === undefined ||
    startTime === undefined ||
    endTime === undefined ||
    loginStartTime === undefined ||
    loginEndTime === undefined ||
    activationFlag === undefined ||
    eventType === undefined ||
    presetTitle === undefined ||
    langPresetID === undefined ||
    rewardPresetID === undefined ||
    rewardData === undefined
  ) {
    return getResultForm(ResultCode.INVALID_REQPARAM, '', null);
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

  } catch(err) {
    return getResultForm(ResultCode.INVALID_REQPARAM, 'invalid param:5', null);
  }

  // 이벤트 타입 유효성 체크
  let resultInfo = await svcProcessor.checkReqValidationOfEnum(req, eventType, edo.EVENT_TYPE_LOGINREWARD, edo.EVENT_TYPE_LOGINREWARD, ResultCode.EVENT_REQPARAM_INVALID_EVENTTYPE, 'eventType');
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  // 예약 이벤트 시작시각/종료시각에 대한 유효성 체크
  resultInfo = await svcProcessor.checkReqValidationOfDuration(req, startTime, endTime, 10, ResultCode.EVENT_REQPARAM_INVALID_DURATION, 'start_end_time');
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  // 보상시간대 시작,종료 시각 유효성 체크
  let arr1 = loginStartTime.split(":");
  if(arr1.length !== 2) {
    return resultInfo;
  }
  let hour = parseInt(arr1[0]);
  let min = parseInt(arr1[1]);
  if(hour < 0 || hour > 23 || min < 0 || min > 59) {
    return resultInfo;
  }
  arr1 = loginEndTime.split(":");
  if(arr1.length !== 2) {
    return resultInfo;
  }
  hour = parseInt(arr1[0]);
  min = parseInt(arr1[1]);
  if(hour < 0 || hour > 23 || min < 0 || min > 59) {
    return resultInfo;
  }

  resultInfo.data = { adminID, authToken, serverType, eventType, presetTitle, langPresetID, rewardPresetID, titleTable, contentTable, rewardData, startTime, endTime, loginStartTime, loginEndTime, activationFlag };

  return resultInfo;
};

export const getValidatedReqParamOfUpdateEvent = async (req: Request): Promise<ResultInfo> => {

  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
    'adminID',
    'authToken',
    'serverType'
  ]);

  const {eventID, presetTitle, langPresetID, rewardPresetID, titleTable, contentTable, rewardData, startTime, endTime, loginStartTime, loginEndTime, activationFlag} = svcProcessor.getReqBodyData(req);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (
    adminID === undefined ||
    authToken === undefined ||
    serverType === undefined ||
    startTime === undefined ||
    endTime === undefined ||
    loginStartTime === undefined ||
    loginEndTime === undefined ||
    activationFlag === undefined ||
    presetTitle === undefined ||
    langPresetID === undefined ||
    rewardPresetID === undefined ||
    rewardData === undefined
  ) {
    return getResultForm(ResultCode.INVALID_REQPARAM, '', null);
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

  } catch(err) {
    return getResultForm(ResultCode.INVALID_REQPARAM, 'invalid param:5', null);
  }

  // 예약 이벤트 시작시각/종료시각에 대한 유효성 체크
  let resultInfo = await svcProcessor.checkReqValidationOfDuration(req, startTime, endTime, 10, ResultCode.EVENT_REQPARAM_INVALID_DURATION, 'start_end_time');
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  // 보상시간대 시작,종료 시각 유효성 체크
  let arr1 = loginStartTime.split(":");
  if(arr1.length !== 2) {
    return resultInfo;
  }
  let hour = parseInt(arr1[0]);
  let min = parseInt(arr1[1]);
  if(hour < 0 || hour > 23 || min < 0 || min > 59) {
    return resultInfo;
  }
  arr1 = loginEndTime.split(":");
  if(arr1.length !== 2) {
    return resultInfo;
  }
  hour = parseInt(arr1[0]);
  min = parseInt(arr1[1]);
  if(hour < 0 || hour > 23 || min < 0 || min > 59) {
    return resultInfo;
  }

  resultInfo.data = { adminID, authToken, serverType, eventID, presetTitle, langPresetID, rewardPresetID, titleTable, contentTable, rewardData, startTime, endTime, loginStartTime, loginEndTime, activationFlag };

  return resultInfo;
};

export const getValidatedReqParamOfDeleteEvent = async (req: Request): Promise<ResultInfo> => {

  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
    'adminID',
    'authToken',
    'serverType'
  ]);

  const {eventIDList} = svcProcessor.getReqBodyData(req);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (adminID === undefined || authToken === undefined || serverType === undefined || eventIDList === undefined) {
    return getResultForm(ResultCode.INVALID_REQPARAM, '', null);
  }

  let resultInfo = getResultForm(ResultCode.SUCCESS, '', null);


  // 삭제한 메세지ID 목록에 대한 유효성 체크
  resultInfo.data = { adminID, authToken, serverType, eventIDList };

  return resultInfo;
};

export const getValidatedReqParamOfEventActivation = async (req: Request): Promise<ResultInfo> => {
  const [adminID, authToken, serverType, eventID, activationFlag] = svcProcessor.getReqDataSet(req, ['adminID', 'authToken', 'serverType', 'eventID', 'activationFlag']);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (serverType === null || serverType === undefined || eventID === null || eventID === undefined || activationFlag === null || activationFlag === undefined) {
    return getResultForm(ResultCode.INVALID_REQPARAM, '', null);
  }

  // 대상 아이디 유효성 체크
  let resultInfo = await svcProcessor.checkReqValidationOfAccountID(req, eventID, ResultCode.EVENT_REQPARAM_INVALID_EVENTID, 'eventID');
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  // 등록/해제 플래그에 대한 유효성 체크
  resultInfo = await svcProcessor.checkReqValidationOfBool(req, activationFlag, ResultCode.EVENT_REQPARAM_INVALID_ACTIVATIONFLAG, 'activationFlag');
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  resultInfo.data = { adminID, authToken, serverType, eventID, activationFlag };

  return resultInfo;
};

export const getValidatedReqParamOfCouponList = async (req: Request): Promise<ResultInfo> => {
  const [adminID, authToken, serverType, pageNo] = svcProcessor.getReqDataSet(req, ['adminID', 'authToken', 'serverType', 'pageNo']);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (serverType === null || serverType === undefined || pageNo === null || pageNo === undefined) {
    return getResultForm(ResultCode.INVALID_REQPARAM, '', null);
  }

  // 대상 아이디 유효성 체크
  // let resultInfo = await svcProcessor.checkReqValidationOfAccountID(req, eventID, ResultCode.EVENT_REQPARAM_INVALID_EVENTID, 'eventID');
  // if (resultInfo.resultCode !== ResultCode.SUCCESS) {
  //   return resultInfo;
  // }

  // // 등록/해제 플래그에 대한 유효성 체크
  // resultInfo = await svcProcessor.checkReqValidationOfBool(req, activationFlag, ResultCode.EVENT_REQPARAM_INVALID_ACTIVATIONFLAG, 'activationFlag');
  // if (resultInfo.resultCode !== ResultCode.SUCCESS) {
  //   return resultInfo;
  // }

  let resultInfo = getResultForm(ResultCode.SUCCESS, '', { adminID, authToken, serverType, pageNo });

  return resultInfo;
};

export const getValidatedReqParamOfRegisterNewCoupon = async (req: Request): Promise<ResultInfo> => {

  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
    'adminID',
    'authToken',
    'serverType'
  ]);

  const {newPresetFlag, presetID, titleTable, contentTable, couponType, couponDigit, sharedCouponCode, couponQty, activationFlag, startTime, endTime, rewardData} = svcProcessor.getReqBodyData(req);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (adminID === undefined || authToken === undefined || serverType === undefined || newPresetFlag === undefined || presetID === undefined || titleTable === undefined || contentTable === undefined ||
    couponType === undefined || couponDigit === undefined || sharedCouponCode === undefined || couponQty === undefined || activationFlag === undefined ||
    startTime === undefined || endTime === undefined || rewardData === undefined) {
    return getResultForm(ResultCode.INVALID_REQPARAM, '', null);
  }

  // 메세지 타입 유효성 체크
  // let resultInfo = await svcProcessor.checkReqValidationOfEnum(req, msgType, mdo.USERMESSAGE_TYPE_INBOX, mdo.USERMESSAGE_TYPE_PUSHALARM, ResultCode.MESSAGE_REQPARAM_INVALID_MSGTYPE, 'msgType');
  // if (resultInfo.resultCode !== ResultCode.SUCCESS) {
  //   return resultInfo;
  // }

  let resultInfo = getResultForm(ResultCode.SUCCESS, '', null);

  // 삭제한 메세지ID 목록에 대한 유효성 체크
  resultInfo.data = { adminID, authToken, serverType, newPresetFlag, presetID, titleTable, contentTable, couponType, couponDigit, sharedCouponCode, couponQty, activationFlag, startTime, endTime, rewardData };

  return resultInfo;
};