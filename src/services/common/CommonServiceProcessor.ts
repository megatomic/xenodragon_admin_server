import dotenv from 'dotenv';
import dayjs from 'dayjs';
require('module-alias/register');
import { Request, Response } from 'express';
import { ResultCode, getResultForm, ResultInfo, sendRes, ReqValidationErrorMsg } from 'src/common/ResponseManager';
import * as dataManagerFactory from 'src/common/db/DataManagerFactory';
import SQLDataManager from 'src/common/db/SQLDataManager';
import JWTManager, { VerifyResultInfo } from 'src/services/common/JWTManager';
import * as accountDataHandler from 'src/services/accounts/AccountServiceDataHandler';
import * as ldo from 'src/services/logs/LogDataObject';
import * as logDataHandler from 'src/services/logs/LogServiceDataHandler';
import * as activityType from 'src/services/common/AdminActivityType';
import * as Utils from 'src/common/Utils';
import { convertDBToAccountRecordInfo, AccountInfo, ACLUnitInfo } from 'src/services/accounts/AccountDataObject';
import { USER_TYPE_BLACKLIST } from '../users/UserManagementDataObject';
import * as aclManager from 'src/services/common/AdminACLManager';

require('dotenv').config();
const { check } = require('express-validator');

const requestIP = require('request-ip');

const REQDATA_LOC = 'HEADER';

export const getReqData = (src:string, req: Request, key: string): any => {
  let value: any = '';
  if (src === 'HEADER') {
    value = <string>req.get(key);
  } else {
    value = <any>req.body[key];
  }

  console.log(`[CommonServiceProcessor] getReqData() key=${key},value=${value}`);
  if (value === undefined) {
    return null;
  } else {
    return value.trim();
  }
};

export const getReqHeaderData = (req: Request, key: string): any => {
  return getReqData('HEADER',req,key);
};

export const getReqDataSet = (req: Request, keyList: string[]): string[] => {
  const dataList: string[] = [];
  for (let key of keyList) {
    dataList.push(getReqData(REQDATA_LOC, req, key));
  }
  return dataList;
};

export const getReqHeaderDataSet = (req: Request, keyList: string[]): string[] => {
  const dataList: string[] = [];
  for (let key of keyList) {
    dataList.push(getReqHeaderData(req, key));
  }
  return dataList;
};

export const getReqBodyData = (req: Request): any => {
  return req.body;
};

export const isLiveOp = (serverType:string): boolean => {

  if(serverType.trim().toUpperCase() === 'LIVE') {
    return true;
  } else {
    return false;
  }
};

export const isQAOp = (serverType:string): boolean => {

  if(serverType.trim().toUpperCase() === 'QA') {
    return true;
  } else {
    return false;
  }
};

export const getGameServerURL = (serverType:string,path:string): string => {

  let targetURL = `${process.env.LOCAL_GAMESERVER_HOST}${path}`;
  if(serverType === 'review') {
    targetURL = `${process.env.REVIEW_GAMESERVER_HOST}${path}`;
  } else if(serverType === 'qa') {
    targetURL = `${process.env.QA_GAMESERVER_HOST}${path}`;      
  } else if(serverType === 'live') {
    targetURL = `${process.env.LIVE_GAMESERVER_HOST}${path}`;
  }

  return targetURL;
};

export const getMarketServerURL = (serverType:string,path:string): string => {

  let targetURL = `${process.env.DEV_MARKETSERVER_HOST}${path}`;
  if(serverType === 'qa') {
    targetURL = `${process.env.QA_MARKETSERVER_HOST}${path}`;
  } else if(serverType === 'live') {
    targetURL = `${process.env.LIVE_MARKETSERVER_HOST}${path}`;
  }

  return targetURL;
};

export const getNFTMetadataBasePath = (serverType:string): string => {

  let basePath = `local/metadata`;
  if(serverType === 'review') {
    basePath = `review/metadata`;
  } else if(serverType === 'qa') {
    basePath = `qa/metadata`;      
  } else if(serverType === 'live') {
    basePath = `live/metadata`;
  }

  return basePath;
};

export const sendResponse = (res: Response, result: ResultInfo, sqlDataManager: SQLDataManager | null) => {

  // 새 인증토큰을 발급하기 전에 요청 파라메터 에러가 발생한 경우는 newAuthToken필드를 설정하지 않음!!
  if(res.getHeader('newauthtoken') !== undefined) {
    result.newAuthToken = res.getHeader('newauthtoken');
  }

  sendRes(res, result);
  releaseDataManager(sqlDataManager);
};

export const releaseDataManager = (sqlDataManager: SQLDataManager | null) => {

  if (sqlDataManager !== null) {
    dataManagerFactory.releaseSQLDataManager(sqlDataManager);
  }
};

export const checkCharSetIfAlphabetic = (text: string) => {
  let reg = /(?=.*?[a-z])(?=.*?[A-Z])/;
  return reg.test(text);
};

export const checkCharSetIfNumbericAndSpecialChars = (text: string) => {
  let reg = /(?=.*?[0-9])(?=.*?[#?!@$%^&*-])/;
  return reg.test(text);
};

// acl과 client ip를 가지고, jw.sign()에 들어갈 payload 포맷을 생성하는 함수
export const makeJWTPayload = (acl: string, clientIP: string) => {
  return {
    acl,
    clientIP,
  };
};

// jwt.verify()을 통해 1차 검증에 성공하여 얻은 payload에 대해 client ip가 동일한지 체크하는 함수
export const verifyJWTPayload = (decodedToken: any, req: Request) => {
  if (decodedToken !== null && decodedToken.clientIP !== undefined && decodedToken.clientIP === requestIP.getClientIp(req)) {
    return true;
  } else {
    return false;
  }
};

// 클라에서 전달받은 jwt를 검증하고 검증이 성공하면 새롭게 유효기한이 설정된 jwt를 발급해서 반환하는 함수
export const verifyAndIssueJwt = async (req: Request, res: Response, sqlDataManager: SQLDataManager, adminID: string, jwtToken: string): Promise<any> => {
  const jwtManager: JWTManager = new JWTManager(adminID === 'MASTER');

  // 이전 토큰이 올바르다면, 기간연장을 위해 새 토큰 발급!!
  let resultInfo = await accountDataHandler.queryDBAccount(sqlDataManager, <string>adminID);

  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    resultInfo.resultCode = ResultCode.AUTH_LOGIN_IDNOTFOUND;
    return resultInfo;
  }

  const accountInfo: AccountInfo = convertDBToAccountRecordInfo(resultInfo.data);

  //const dbAccountACL:string = accountDataHandler.getAccountACLFromRecord(accountInfo);
  const jwtPayload = makeJWTPayload(accountInfo.aclInfo, requestIP.getClientIp(req));
  const token:any = await jwtManager.issueJWT(jwtPayload);

  resultInfo = getResultForm(ResultCode.SUCCESS, '', token);

  // 새 인증토큰을 헤더에 설정
  res.header('newAuthToken',token);

  return resultInfo;
};

// 관리자 활동로그를 DB에 등록하는 함수
export const writeDBActivityLog = async (sqlDataManager: SQLDataManager, adminID: string, activityID: string, activityDetailInfo: string): Promise<any> => {
  const logInfo: ldo.ActivityLogInfo = {
    logID: -1,
    adminID: adminID,
    activityID: activityID,
    activityName: <string>activityType.activityLogNameTable.get(activityID),
    activityDetail: activityDetailInfo,
    creationTime: Utils.getStdNowString(),
  };

  await logDataHandler.registerDBNewActivityLog(sqlDataManager, logInfo);
};

export const encodeMultiLangTable = (table:any) => {

  console.log('table=',table);

  const newTable = [];
  if(table.length > 0) {
    for(let item of table) {
      newTable.push({...item,content:encodeURIComponent(item.content)});
    }
  }

  console.log('newTable=',newTable);
  return newTable;
};

export const decodeMultiLangTable = (table:any) => {

  const newTable = [];
  if(table.length > 0) {
    for(let item of table) {
      newTable.push({...item,content:decodeURIComponent(item.content)});
    }
  }
  return newTable;
};

// 요청파라메터:계정ID(관리자,유저) 유효성 체크
export const checkReqValidationOfAccountID = async (req: Request, accountID: string, errCode: number, tag: string): Promise<ResultInfo> => {
  let resultInfo = getResultForm(ResultCode.SUCCESS, '', null);
  if (accountID !== process.env.MASTERID) {
    const aid = accountID.trim();
    if (aid.length < 4 || aid.length > 20) {
      resultInfo.resultCode = errCode;
      resultInfo.message = `${tag}:${ReqValidationErrorMsg.VALERRORMSG_INVALID_ID}`;
    }
  }
  return resultInfo;
};

// 요청파라메터:계정암호 유효성 체크
export const checkReqValidationOfAccountPW = async (req: Request, accountPW: string, errCode: number, tag: string): Promise<ResultInfo> => {
  let resultInfo = getResultForm(ResultCode.SUCCESS, '', null);

  const pw = accountPW.trim();
  let result = true;
  if (pw.length < 6) {
    result = false;
  } else {
    const check1 = checkCharSetIfAlphabetic(pw);
    const check2 = checkCharSetIfNumbericAndSpecialChars(pw);
    if (check1 === false || check2 === false) {
      result = false;
    }
  }

  if (result === false) {
    resultInfo.resultCode = errCode;
    resultInfo.message = `${tag}:${ReqValidationErrorMsg.VALERRORMSG_INVALID_PW}`;
    return resultInfo;
  }

  return resultInfo;
};

// 요청파라메터:테이블ID 유효성 체크
export const checkReqValidationOfTableID = async (req: Request, tableIDStr: string, errCode: number, tag: string): Promise<ResultInfo> => {
  let resultInfo = getResultForm(ResultCode.SUCCESS, '', null);
  let result = true;
  try {
    if (parseInt(tableIDStr) < 0) {
      result = false;
    }
  } catch (err) {
    result = false;
  }

  if (result === false) {
    resultInfo.resultCode = errCode;
    resultInfo.message = `${tag}:${ReqValidationErrorMsg.VALERRORMSG_INVALID_TABLEID}`;
    return resultInfo;
  }

  return resultInfo;
};

// 요청파라메터:페이지번호 유효성 체크
export const checkReqValidationOfPageNo = async (req: Request, pageNoStr: string, errCode: number, tag: string): Promise<ResultInfo> => {
  let resultInfo = getResultForm(ResultCode.SUCCESS, '', null);

  let pageNo = -1;
  let result = true;
  try {
    pageNo = parseInt(pageNoStr);
    if (pageNo < 0) {
      result = false;
    }
  } catch (err) {
    result = false;
  }

  if (result === false) {
    resultInfo.resultCode = errCode;
    resultInfo.message = `${tag}:${ReqValidationErrorMsg.VALERRORMSG_INVALID_PAGENO}`;
    return resultInfo;
  }
  return resultInfo;
};

// 요청파라메터:부울값 유효성 체크
export const checkReqValidationOfBool = async (req: Request, boolStr: string, errCode: number, tag: string): Promise<ResultInfo> => {
  let resultInfo = getResultForm(ResultCode.SUCCESS, '', null);
  if (boolStr.toUpperCase() !== 'TRUE' && boolStr.toUpperCase() !== 'FALSE') {
    resultInfo.resultCode = errCode;
    resultInfo.message = `${tag}:${ReqValidationErrorMsg.VALERRORMSG_INVALID_BOOLEAN}`;
    return resultInfo;
  }
  return resultInfo;
};

// 요청파라메터:시간값 유효성 체크
export const checkReqValidationOfDateTime = async (req: Request, dateTimeStr: string, errCode: number, tag: string): Promise<ResultInfo> => {
  let resultInfo = getResultForm(ResultCode.SUCCESS, '', null);

  try {
    let date = dayjs(dateTimeStr);
  } catch (err) {
    resultInfo.resultCode = errCode;
    resultInfo.message = `${tag}:${ReqValidationErrorMsg.VALERRORMSG_INVALID_TIME}`;
    return resultInfo;
  }

  return resultInfo;
};

export const checkReqValidationOfDuration = async (req: Request, startTimeStr: string, endTimeStr: string, minDurationPerMin: number, errCode: number, tag: string): Promise<ResultInfo> => {
  let resultInfo = getResultForm(ResultCode.SUCCESS, '', null);

  try {
    let startDate = dayjs(startTimeStr);
    let endDate = dayjs(endTimeStr);
    if (endDate.isBefore(startDate.add(minDurationPerMin, 'minute')) === true) {
      throw 'invalid start/end time duration';
    }
  } catch (err) {
    console.log('4');
    resultInfo.resultCode = errCode;
    resultInfo.message = `${tag}:${ReqValidationErrorMsg.VALERRORMSG_INVALID_TIME}`;
    return resultInfo;
  }

  return resultInfo;
};

// 요청파라메터:ACL 유효성 체크
export const checkReqValidationOfACL = async (req: Request, aclStr: string, errCode: number, tag: string): Promise<ResultInfo> => {
  let resultInfo = getResultForm(ResultCode.SUCCESS, '', null);
  if (aclManager.isValidaACLFormat(aclStr) === false) {
    resultInfo.resultCode = errCode;
    resultInfo.message = `${tag}:${ReqValidationErrorMsg.VALERRORMSG_INVALID_ACL}`;
    return resultInfo;
  }
  return resultInfo;
};

// 요청파라메터:숫자범위값 유효성 체크
export const checkReqValidationOfEnum = async (req: Request, rangeNum: number, minValue: number, maxValue: number, errCode: number, tag: string): Promise<ResultInfo> => {
  let resultInfo = getResultForm(ResultCode.SUCCESS, '', null);
  let result = true;
  if (rangeNum < minValue || rangeNum > maxValue) {
    result = false;
  }

  if (result === false) {
    resultInfo.resultCode = errCode;
    resultInfo.message = `${tag}:${ReqValidationErrorMsg.VALERRORMSG_INVALID_ENUM}`;
    return resultInfo;
  }

  return resultInfo;
};

// 요청파라메터:숫자셋 유효성 체크
export const checkReqValidationOfNumberSet = async (req: Request, numStr: string, checkNumSet: number[], errCode: number, tag: string): Promise<ResultInfo> => {
  let resultInfo = getResultForm(ResultCode.SUCCESS, '', null);
  let result = true;
  try {
    const rangeNum = parseInt(numStr);
    const resultTable = checkNumSet.filter(el=>el===rangeNum);
    if(resultTable.length === 0) {
      result = false;
    }
  } catch (err) {
    result = false;
  }

  if (result === false) {
    resultInfo.resultCode = errCode;
    resultInfo.message = `${tag}:${ReqValidationErrorMsg.VALERRORMSG_INVALID_NUMSET}`;
    return resultInfo;
  }

  return resultInfo;
};

export const escapeSpecialCharsForJSON = (orgStr:string): string => {

  if(orgStr === undefined || orgStr === null || orgStr.trim() === '') {
    return orgStr;
  }

  let result = "";
  for(let i=0;i<orgStr.length;i++) {
    if(orgStr.charAt(i) === "'") {
      result += "'";
    }
    result += orgStr.charAt(i);
  }
  return result;
};

export const unescapeSpecialCharsForJSON = (orgStr:string): string => {

  if(orgStr === undefined || orgStr === null || orgStr.trim() === '') {
    return orgStr;
  }

  let result = orgStr.replace(/[\r]?[\n]/g, '\\n');
  return result;
};

export const checkUserIDValidation = (token:string): boolean => {

  if(token === null || token === undefined) {
    return false;
  }

  const userTokenArray = token.split('-');
  return (userTokenArray !== null && userTokenArray.length !== undefined && userTokenArray.length === 5);
}