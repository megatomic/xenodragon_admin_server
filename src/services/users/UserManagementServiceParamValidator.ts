import * as svcProcessor from 'src/services/common/CommonServiceProcessor';
import { Request, Response, NextFunction } from 'express';
import { ResultInfo, ResultCode, getResultForm, ReqValidationErrorMsg } from 'src/common/ResponseManager';
import SQLDataManager from 'src/common/db/SQLDataManager';
import * as aclManager from 'src/services/common/AdminACLManager';
import * as udo from './UserManagementDataObject';
const { body, header, query, check } = require('express-validator');
import * as Utils from 'src/common/Utils';
import * as bdo from 'src/services/common/BaseDataObject';

// 유저검색 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfSearchUser = async (req: Request): Promise<ResultInfo> => {
  const [adminID, authToken, userType, searchType, searchText, pageNo] = svcProcessor.getReqDataSet(req, ['adminID', 'authToken', 'userType', 'searchType', 'searchText', 'pageNo']);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (
    userType === null ||
    userType === undefined ||
    searchType === null ||
    searchType === undefined ||
    searchText === null ||
    searchText === undefined ||
    searchText.trim() === '' ||
    pageNo === null ||
    pageNo === undefined
  ) {
    return getResultForm(ResultCode.INVALID_REQPARAM, '', null);
  }

  // 유저타입 유효성 체크
  let resultInfo = await svcProcessor.checkReqValidationOfEnum(req, parseInt(userType), udo.USER_TYPE_NORMAL, udo.USER_TYPE_BLACKLIST, ResultCode.USER_REQPARAM_INVALID_USERTYPE, 'userType');
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  // 검색타입 유효성 체크
  resultInfo = await svcProcessor.checkReqValidationOfEnum(req, parseInt(searchType), udo.USERSEARCH_TYPE_ALL, udo.USERSEARCH_TYPE_BYNICKNAME, ResultCode.USER_REQPARAM_INVALID_SEARCHTYPE, 'searchType');
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  // 페이지번호 유효성 체크
  resultInfo = await svcProcessor.checkReqValidationOfPageNo(req, pageNo, ResultCode.INVALID_PAGENO, 'pageNo');
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  resultInfo.data = { adminID, authToken, userType, searchType, searchText, pageNo };

  return resultInfo;
};

// 유저 상세정보 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfGetPlayStat = async (req: Request): Promise<ResultInfo> => {
  const [adminID, authToken, targetUserID] = svcProcessor.getReqDataSet(req, ['adminID', 'authToken', 'targetUserID']);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (targetUserID === null || targetUserID === undefined) {
    return getResultForm(ResultCode.INVALID_REQPARAM, '', null);
  }

  // 대상 아이디 유효성 체크
  let resultInfo = await svcProcessor.checkReqValidationOfAccountID(req, targetUserID, ResultCode.USER_REQPARAM_INVALID_USERID, 'targetUserID');
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  resultInfo.data = { adminID, authToken, targetUserID };

  return resultInfo;
};

// 블랙리스트 등록/해제 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfBlacklistActivation = async (req: Request): Promise<ResultInfo> => {
  const [adminID, authToken, targetUserID, activationFlag, autoReleaseDate] = svcProcessor.getReqDataSet(req, ['adminID', 'authToken', 'targetUserID', 'activationFlag', 'autoReleaseDate']);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (targetUserID === null || targetUserID === undefined || activationFlag === null || activationFlag === undefined || autoReleaseDate === null || autoReleaseDate === undefined) {
    return getResultForm(ResultCode.INVALID_REQPARAM, '', null);
  }

  // 대상 아이디 유효성 체크
  let resultInfo = await svcProcessor.checkReqValidationOfAccountID(req, targetUserID, ResultCode.USER_REQPARAM_INVALID_USERID, 'targetUserID');
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  // 등록/해제 플래그에 대한 유효성 체크
  resultInfo = await svcProcessor.checkReqValidationOfBool(req, activationFlag, ResultCode.USER_REQPARAM_INVALID_ACTIVATION, 'activationFlag');
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  // 자동해제 시각에 대한 유효성 체크
  resultInfo = await svcProcessor.checkReqValidationOfDateTime(req, autoReleaseDate, ResultCode.USER_REQPARAM_INVALID_AUTORELEASETIME, 'autoReleaseDate');
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  resultInfo.data = { adminID, authToken, targetUserID, activationFlag, autoReleaseDate };

  return resultInfo;
};

// 유저정보 수정 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfUpdatePlayStat = async (req: Request): Promise<ResultInfo> => {
  const [adminID, authToken, targetUserID, playStatListStr] = svcProcessor.getReqDataSet(req, ['adminID', 'authToken', 'targetUserID', 'playStatListStr']);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (targetUserID === null || targetUserID === undefined || playStatListStr === null || playStatListStr === undefined) {
    return getResultForm(ResultCode.INVALID_REQPARAM, '', null);
  }

  // 대상 아이디 유효성 체크
  let resultInfo = await svcProcessor.checkReqValidationOfAccountID(req, targetUserID, ResultCode.USER_REQPARAM_INVALID_USERID, 'targetUserID');
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  // 유저 플레이스탯 키/값의 유효성 체크
  //playStatListStr

  resultInfo.data = { adminID, authToken, targetUserID, playStatListStr };

  return resultInfo;
};

// 유저 활동로그 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfUserActLogsInfo = async (req: Request): Promise<ResultInfo> => {

  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
    'adminID',
    'authToken',
    'serverType'
  ]);

  const bodyData = svcProcessor.getReqBodyData(req);

  console.log('bodyData=',JSON.stringify(bodyData,null,2));

  const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
  resultInfo.data = { adminID, authToken, serverType, queryFilterInfo:bodyData.queryFilterInfo, pageNo:bodyData.pageNo, queryNum:bodyData.queryNum };

  return resultInfo;
};

// 유저 결제정보 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfUserPayLogsInfo = async (req: Request): Promise<ResultInfo> => {

  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
    'adminID',
    'authToken',
    'serverType'
  ]);

  const bodyData = svcProcessor.getReqBodyData(req);

  console.log('bodyData=',JSON.stringify(bodyData,null,2));

  const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
  resultInfo.data = { adminID, authToken, serverType, queryFilterInfo:bodyData.queryFilterInfo, pageNo:bodyData.pageNo };

  return resultInfo;
};

// 블랙리스트 목록 조회 요청 파라메터에 대한 유효성 체크
export const getValidatedReqParamOfQueryBlacklist = async (req: Request): Promise<ResultInfo> => {

  const [adminID, authToken, queryFilterInfo, pageNo] = svcProcessor.getReqDataSet(req, ['adminID', 'authToken', 'queryFilterInfo', 'pageNo']);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (pageNo === null || pageNo === undefined) {
    return getResultForm(ResultCode.INVALID_REQPARAM, '', null);
  }

  // 페이지번호 유효성 체크
  let resultInfo = await svcProcessor.checkReqValidationOfPageNo(req, pageNo, ResultCode.INVALID_PAGENO, 'pageNo');
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

    // 필터정보 포맷의 유효성 체크
    let queryFilterInfo2 = null;
    try {
      queryFilterInfo2 = JSON.parse(queryFilterInfo);
      if (queryFilterInfo2.titleKeyword === undefined || queryFilterInfo2.deviceType === undefined || queryFilterInfo2.filterStartTime === undefined || queryFilterInfo2.filterEndTime === undefined) {
        resultInfo.resultCode = ResultCode.USER_REQPARAM_INVALID_QUERYFILTERINFO;
        resultInfo.message = ReqValidationErrorMsg.VALERRORMSG_INVALID_QUERYFILTER;
        return resultInfo;
      }  
   } catch (err) {
      resultInfo.resultCode = ResultCode.USER_REQPARAM_INVALID_QUERYFILTERINFO;
      resultInfo.message = ReqValidationErrorMsg.VALERRORMSG_INVALID_QUERYFILTER;
      return resultInfo;
    }

  resultInfo.data = { adminID, authToken, queryFilterInfo:queryFilterInfo2, pageNo };

  return resultInfo;
};

// 블랙리스트 등록 요청 파라메터에 대한 유효성 체크
export const getValidatedReqParamOfAddUserToBlacklist = async (req: Request): Promise<ResultInfo> => {
  const [adminID, authToken, userIDListStr, reason, duration, autoReleaseFlag] = svcProcessor.getReqDataSet(req, [
    'adminID',
    'authToken',
    'userIDList',
    'reason',
    'duration',
    'autoReleaseFlag'
  ]);

  const reason2 = decodeURIComponent(reason);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (
    reason2 === null ||
    reason2 === undefined ||
    autoReleaseFlag === null ||
    autoReleaseFlag === undefined ||
    duration === null ||
    duration === undefined
  ) {
    return getResultForm(ResultCode.INVALID_REQPARAM, '', null);
  }

  // 예약 공지사항 여부 플래그값 유효성 체크
  let resultInfo = await svcProcessor.checkReqValidationOfBool(req, autoReleaseFlag, ResultCode.USER_REQPARAM_INVALID_AUTORELEASEFLAG, 'autoReleaseFlag');
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  let result = true;
  try {
    const userIDList = JSON.parse(userIDListStr);
    if(userIDList.length === undefined || userIDList.length === 0) {
      result = false;
    }
  } catch(e) {
    result = false;
  }
  
  if(result === false) {
    resultInfo.resultCode = ResultCode.USER_REQPARAM_ADDTOBLACKLIST_INVALID_USERIDLIST;
    resultInfo.message = ReqValidationErrorMsg[ResultCode.VALERRORMSG_INVALID_USERIDLIST.toString()];
    return resultInfo;
  }

  // 블랙리스트 기간이 최대 30일을 넘어갈 수 없음.
  const durationInt = parseInt(duration);
  if(durationInt > 24*30) {
    resultInfo.resultCode = ResultCode.USER_REQPARAM_ADDTOBLACKLIST_DURATIONISTOOBIG;
    resultInfo.message = ReqValidationErrorMsg[ResultCode.USER_REQPARAM_ADDTOBLACKLIST_DURATIONISTOOBIG.toString()];
    return resultInfo;
  }

  // 기간이 '영구'이면서, autoReleaseFlag값이 'true'이면 오류!!
  if(autoReleaseFlag.toUpperCase() === 'TRUE' && durationInt <= 0) {
    resultInfo.resultCode = ResultCode.USER_REQPARAM_ADDTOBLACKLIST_AUTORELEASEFLAG_MISMATCHED_FOR_UNLIMITEDDURATION;
    resultInfo.message = ReqValidationErrorMsg[ResultCode.USER_REQPARAM_ADDTOBLACKLIST_AUTORELEASEFLAG_MISMATCHED_FOR_UNLIMITEDDURATION.toString()];
    return resultInfo;
  }

  resultInfo.data = { adminID, authToken, userIDList:userIDListStr, reason:reason2, duration, autoReleaseFlag };

  console.log('resultInfo.data=',resultInfo.data,',reason2=',reason2);

  return resultInfo;
};

// 블랙리스트 해제 요청 파라메터에 대한 유효성 체크
export const getValidatedReqParamOfReleaseUserFromBlacklist = async (req: Request): Promise<ResultInfo> => {
  const [adminID, authToken, userIDListStr] = svcProcessor.getReqDataSet(req, [
    'adminID',
    'authToken',
    'userIDList'
  ]);

  let resultInfo = getResultForm(ResultCode.SUCCESS, '', null);
  let result = true;
  try {
    const userIDList = JSON.parse(userIDListStr);
    if(userIDList.length === undefined || userIDList.length === 0) {
      result = false;
    }
  } catch(e) {
    result = false;
  }
  
  if(result === false) {
    resultInfo.resultCode = ResultCode.USER_REQPARAM_RELEASEFROMBLACKLIST_INVALID_USERIDLIST;
    resultInfo.message = ReqValidationErrorMsg[ResultCode.VALERRORMSG_INVALID_USERIDLIST.toString()];
    return resultInfo;
  }

  resultInfo.data = { adminID, authToken, userIDList:userIDListStr };

  return resultInfo;
};


// 유저 보상지급 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfRewardToUserGroupInfo = async (req: Request): Promise<ResultInfo> => {
  const [adminID, authToken, filterTargetType, deviceType, userIDList, title, content, rewardData, expireTime] = svcProcessor.getReqDataSet(req, [
    'adminID',
    'authToken',
    'filterTargetType',
    'deviceType',
    'userIDList',
    'title',
    'content',
    'rewardData',
    'expireTime',
  ]);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (
    filterTargetType === null ||
    filterTargetType === undefined ||
    userIDList === null ||
    userIDList === undefined ||
    title === null ||
    title === undefined ||
    content === null ||
    content === undefined ||
    rewardData === null ||
    rewardData === undefined ||
    expireTime === null ||
    expireTime === undefined
  ) {
    return getResultForm(ResultCode.INVALID_REQPARAM, '', null);
  }

  // 필터 유효성 체크
  let resultInfo = await svcProcessor.checkReqValidationOfEnum(
    req,
    parseInt(filterTargetType),
    udo.INBOX_TARGETTYPE_ALL,
    udo.INBOX_TARGETTYPE_USERGROUP,
    ResultCode.USER_REQPARAM_INVALID_REWARDTOUSER_FILTERTARGETTYPE1,
    'filterTargetType'
  );
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }
  const filter1 = parseInt(filterTargetType);
  if (filter1 === udo.INBOX_TARGETTYPE_BYDEVICE) {
    // 모바일 기기 타입 유효성 체크
    resultInfo = await svcProcessor.checkReqValidationOfEnum(req, parseInt(deviceType), bdo.DEVICE_TYPE_IOS, bdo.DEVICE_TYPE_ANDROID, ResultCode.USER_REQPARAM_INVALID_REWARDTOUSER_DEVICETYPE, 'deviceType');
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      return resultInfo;
    }
  } else if (filter1 === udo.INBOX_TARGETTYPE_USERGROUP) {
    // 사용자ID목록의 유효성 체크
    try {
      const userIDArray = JSON.parse(userIDList);
      if (userIDArray.length === undefined || userIDArray.length === 0) {
        resultInfo.resultCode = ResultCode.USER_REQPARAM_INVALID_REWARDTOUSER_USERIDLIST;
        return resultInfo;
      }
    } catch (err) {
      resultInfo.resultCode = ResultCode.USER_REQPARAM_INVALID_REWARDTOUSER_USERIDLIST;
      return resultInfo;
    }
  }

  // 기한만료 시각에 대한 유효성 체크
  resultInfo = await svcProcessor.checkReqValidationOfDateTime(req, expireTime, ResultCode.USER_REQPARAM_INVALID_EXPIREDATE, 'expireTime');
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  resultInfo.data = { adminID, authToken, filterTargetType, userIDList, title, content, rewardData, expireTime };

  return resultInfo;
};
