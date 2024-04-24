import * as svcProcessor from 'src/services/common/CommonServiceProcessor';
import { Request, Response, NextFunction } from 'express';
import { ResultInfo, ResultCode, getResultForm, ReqValidationErrorMsg } from 'src/common/ResponseManager';
import SQLDataManager from 'src/common/db/SQLDataManager';
import * as aclManager from 'src/services/common/AdminACLManager';
const { body, header, query, check } = require('express-validator');

// 게임서버 DB테이블 데이터 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfQueryGameDBTableInfo = async (req: Request): Promise<ResultInfo> => {

  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
    'adminID',
    'authToken',
    'serverType'
  ]);

  const bodyData = svcProcessor.getReqBodyData(req);

  console.log('bodyData=',bodyData);

  const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
  resultInfo.data = { adminID, authToken, serverType, dbName:bodyData.dbName, tableName:bodyData.tableName };

  return resultInfo;
};

// 아레나 데이터 저장 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfSaveArenaInfo = async (req: Request): Promise<ResultInfo> => {

    const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
        'adminID',
        'authToken',
        'serverType'
      ]);
    
      const bodyData = svcProcessor.getReqBodyData(req);
  
      console.log('bodyData=',bodyData);
    
      const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
      resultInfo.data = { adminID, authToken, serverType, tableName:bodyData.tableName, tableData:bodyData.tableData };
    
      return resultInfo;
};

// 시즌정보 마켓에 등록 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfRegisterSeasonInfoToMarketInfo = async (req: Request): Promise<ResultInfo> => {

  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
      'adminID',
      'authToken',
      'serverType'
    ]);
  
    const bodyData = svcProcessor.getReqBodyData(req);

    console.log('bodyData=',JSON.stringify(bodyData,null,2));
  
    const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
    resultInfo.data = { adminID, authToken, serverType, seasonInfo:bodyData.seasonInfo, seasonActivationFlag:bodyData.seasonActivationFlag };
  
    return resultInfo;
};

// 마켓 유저정보 조회 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfQueryMarketUserListInfo = async (req: Request): Promise<ResultInfo> => {

  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
      'adminID',
      'authToken',
      'serverType'
    ]);
  
    const bodyData = svcProcessor.getReqBodyData(req);

    console.log('bodyData=',JSON.stringify(bodyData,null,2));
  
    const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
    resultInfo.data = { adminID, authToken, serverType, seasonInfo:bodyData.seasonInfo, itemType:bodyData.itemType, queryFilterInfo:bodyData.queryFilterInfo, pageNo:bodyData.pageNo };
  
    return resultInfo;
};

// NFT정보 마켓에 등록 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfRegisterNFTToMarketInfo = async (req: Request): Promise<ResultInfo> => {

  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
      'adminID',
      'authToken',
      'serverType'
    ]);
  
    const bodyData = svcProcessor.getReqBodyData(req);

    console.log('bodyData=',JSON.stringify(bodyData,null,2));
  
    const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
    resultInfo.data = { adminID, authToken, serverType, seasonInfo:bodyData.seasonInfo, itemType:bodyData.itemType, price:bodyData.price, mintingInfoTable:bodyData.mintingInfoTable };
  
    return resultInfo;
};

// 마켓 게임다운로드주소 조회 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfQueryMarketDownloadURLInfo = async (req: Request): Promise<ResultInfo> => {

  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
      'adminID',
      'authToken',
      'serverType'
    ]);
  
    const bodyData = svcProcessor.getReqBodyData(req);

    console.log('bodyData=',JSON.stringify(bodyData,null,2));
  
    const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
    resultInfo.data = { adminID, authToken, serverType };
  
    return resultInfo;
};

// 마켓 게임다운로드주소 업데이트 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfUpdateMarketDownloadURLInfo = async (req: Request): Promise<ResultInfo> => {

  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
      'adminID',
      'authToken',
      'serverType'
    ]);
  
    const bodyData = svcProcessor.getReqBodyData(req);

    console.log('bodyData=',JSON.stringify(bodyData,null,2));
  
    const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
    resultInfo.data = { adminID, authToken, serverType, apkDownloadURL:bodyData.apkDownloadURL, iosMarketURL:bodyData.iosMarketURL, androidMarketURL:bodyData.androidMarketURL };
  
    return resultInfo;
};

// 마켓 점검설정 정보 조회 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfQueryMarketMaintenanceInfo = async (req: Request): Promise<ResultInfo> => {

  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
      'adminID',
      'authToken',
      'serverType'
    ]);
  
    const bodyData = svcProcessor.getReqBodyData(req);

    console.log('bodyData=',JSON.stringify(bodyData,null,2));
  
    const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
    resultInfo.data = { adminID, authToken, serverType };
  
    return resultInfo;
};

// 마켓 점검설정 정보 업데이트 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfUpdateMarketMaintenanceInfo = async (req: Request): Promise<ResultInfo> => {

  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
      'adminID',
      'authToken',
      'serverType'
    ]);
  
    const bodyData = svcProcessor.getReqBodyData(req);

    console.log('bodyData=',JSON.stringify(bodyData,null,2));
  
    const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
    resultInfo.data = { adminID, authToken, serverType, activeFlag:bodyData.activeFlag, startTime:bodyData.startTime, endTime:bodyData.endTime, title:bodyData.title, content:bodyData.content };
  
    return resultInfo;
};


// 마켓 화이트리스트 조회 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfQueryMarketWhitelistInfo = async (
  req: Request
): Promise<ResultInfo> => {
  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(
    req,
    ["adminID", "authToken", "serverType"]
  );

  const bodyData = svcProcessor.getReqBodyData(req);

  console.log("bodyData=", JSON.stringify(bodyData, null, 2));

  const resultInfo = getResultForm(ResultCode.SUCCESS, "", {});
  resultInfo.data = {
    adminID,
    authToken,
    serverType
  };

  return resultInfo;
};


// 마켓 새 화이트유저 등록 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfRegisterNewMarketWhiteUserInfo = async (
  req: Request
): Promise<ResultInfo> => {
  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(
    req,
    ["adminID", "authToken", "serverType"]
  );

  const bodyData = svcProcessor.getReqBodyData(req);

  console.log("bodyData=", JSON.stringify(bodyData, null, 2));

  const resultInfo = getResultForm(ResultCode.SUCCESS, "", {});
  resultInfo.data = {
    adminID,
    authToken,
    serverType,
    keyword: bodyData.keyword
  };

  return resultInfo;
};


// 마켓 화이트유저 상태변경 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfChangeMarketWhiteUserStateInfo = async (
  req: Request
): Promise<ResultInfo> => {
  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(
    req,
    ["adminID", "authToken", "serverType"]
  );

  const bodyData = svcProcessor.getReqBodyData(req);

  console.log("bodyData=", JSON.stringify(bodyData, null, 2));

  const resultInfo = getResultForm(ResultCode.SUCCESS, "", {});
  resultInfo.data = {
    adminID,
    authToken,
    serverType,
    userID: bodyData.userID,
    activationFlag: bodyData.activationFlag
  };

  return resultInfo;
};