import * as svcProcessor from 'src/services/common/CommonServiceProcessor';
import { Request, Response, NextFunction } from 'express';
import { ResultInfo, ResultCode, getResultForm, ReqValidationErrorMsg } from 'src/common/ResponseManager';
import SQLDataManager from 'src/common/db/SQLDataManager';
import * as aclManager from 'src/services/common/AdminACLManager';
const { body, header, query, check } = require('express-validator');

// 설정 조회 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfSettingList = async (req: Request): Promise<ResultInfo> => {
  const [adminID, authToken, serverType] = svcProcessor.getReqDataSet(req, ['adminID', 'authToken', 'serverType']);

  // 요청 파라메터에 기대하는 값이 없을 경우
  // if(pageNo === null || pageNo === undefined) {
  //     return getResultForm(ResultCode.INVALID_REQPARAM,"",null);
  // }

  // 페이지번호 유효성 체크
  // let resultInfo = await svcProcessor.checkReqValidationOfPageNo(req, pageNo, ResultCode.INVALID_PAGENO, 'pageNo');
  // if(resultInfo.resultCode !== ResultCode.SUCCESS) {
  //     return resultInfo;
  // }

  // 유저 플레이스탯 키/값의 유효성 체크
  //playStatListStr

  const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
  resultInfo.data = { adminID, authToken, serverType };

  return resultInfo;
};

// 설정 수정 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfUpdateSetting = async (req: Request): Promise<ResultInfo> => {

  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
    'adminID',
    'authToken',
    'serverType'
  ]);

  const bodyData = svcProcessor.getReqBodyData(req);
  console.log('bodyData=',JSON.stringify(bodyData,null,2));

  const {settingItemTable,otpCode} = bodyData;

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (serverType === null || serverType === undefined || settingItemTable === null || settingItemTable === undefined || otpCode === undefined) {
    return getResultForm(ResultCode.INVALID_REQPARAM, '', null);
  }

  let resultInfo = getResultForm(ResultCode.SUCCESS, '', null);

  // 환경설정 키/값의 유효성 체크
  // let itemList = [];
  // try {
  //   itemList = JSON.parse(itemListStr);
  //   for (let item of itemList) {
  //     if (
  //       !(
  //         item.settingID !== undefined &&
  //         item.groupID !== undefined &&
  //         item.itemName !== undefined &&
  //         item.itemValue1 !== undefined &&
  //         item.itemValue2 !== undefined &&
  //         item.itemValue3 !== undefined
  //       )
  //     ) {
  //       resultInfo.resultCode = ResultCode.SETTING_REQPARAM_INVALID_ITEMLIST;
  //       resultInfo.message = ReqValidationErrorMsg[ResultCode.SETTING_REQPARAM_INVALID_ITEMLIST.toString()];
  //       return resultInfo;
  //     }
  //   }
  // } catch (err) {
  //   resultInfo.resultCode = ResultCode.SETTING_REQPARAM_INVALID_ITEMLIST;
  //   resultInfo.message = ReqValidationErrorMsg[ResultCode.SETTING_REQPARAM_INVALID_ITEMLIST.toString()];
  //   return resultInfo;
  // }

  resultInfo.data = { adminID, authToken, serverType, settingItemTable, otpCode };

  return resultInfo;
};

// 클라이언트 설정 수정 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfUpdateClientConfig = async (req: Request): Promise<ResultInfo> => {
  const [adminID, authToken, serverType, clientConfigEnc] = svcProcessor.getReqDataSet(req, ['adminID', 'authToken', 'serverType', 'clientConfigEnc']);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (serverType === null || serverType === undefined || clientConfigEnc === null || clientConfigEnc === undefined) {
    return getResultForm(ResultCode.INVALID_REQPARAM, '', null);
  }

  const clientConfigStr = decodeURIComponent(clientConfigEnc);

  let resultInfo = getResultForm(ResultCode.SUCCESS, '', null);

  // 환경설정 키/값의 유효성 체크
  let clientConfig;
  let itemList = [];
  try {
    clientConfig = JSON.parse(clientConfigStr);

  } catch (err) {
    resultInfo.resultCode = ResultCode.SETTING_REQPARAM_INVALID_CLIENTCONFIG_ITEMLIST;
    resultInfo.message = ReqValidationErrorMsg[ResultCode.SETTING_REQPARAM_INVALID_CLIENTCONFIG_ITEMLIST.toString()];
    return resultInfo;
  }

  resultInfo.data = { adminID, authToken, serverType, clientConfig };

  return resultInfo;
};