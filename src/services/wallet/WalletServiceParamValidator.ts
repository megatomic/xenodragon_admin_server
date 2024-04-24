import * as svcProcessor from 'src/services/common/CommonServiceProcessor';
import {Request,Response,NextFunction} from 'express';
import { ResultInfo, ResultCode, getResultForm, ReqValidationErrorMsg } from 'src/common/ResponseManager';
import SQLDataManager from 'src/common/db/SQLDataManager';
const { body, header, query, check } = require('express-validator');


// 지갑의 잔액정보 조회 요청 파라메터에 대한 유효성 체크
export const getValidatedReqParamOfGetWalletBalance = async (req: Request): Promise<ResultInfo> => {

  // marketcontract/list

  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
    'adminID',
    'authToken',
    'serverType'
  ]);

  const bodyData = svcProcessor.getReqBodyData(req);

  console.log('bodyData=',bodyData);

  const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
  resultInfo.data = { adminID, authToken, serverType, address:bodyData.address };

  return resultInfo;
}

// 지갑목록 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfWalletList = (req:Request):ResultInfo => {

    const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
        'adminID',
        'authToken',
        'serverType'
      ]);
    
    const bodyData = svcProcessor.getReqBodyData(req);
      console.log('bodyData=',bodyData);
  
    const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
    resultInfo.data = { adminID, authToken, serverType };
  
    return resultInfo;
};

// 지갑추가 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfAddWallet = (req:Request):ResultInfo => {

    const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
        'adminID',
        'authToken',
        'serverType'
      ]);
    
    const bodyData = svcProcessor.getReqBodyData(req);
      console.log('bodyData=',bodyData);
  
    const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
    resultInfo.data = { adminID, authToken, serverType, walletName:bodyData.walletName, walletAddress:bodyData.walletAddress, walletKey:bodyData.walletKey };
  
    return resultInfo;
};

// 지갑수정 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfUpdateWallet = (req:Request):ResultInfo => {

    const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
        'adminID',
        'authToken',
        'serverType'
      ]);
    
    const bodyData = svcProcessor.getReqBodyData(req);
      console.log('bodyData=',bodyData);
  
    const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
    resultInfo.data = { adminID, authToken, serverType, walletAddress:bodyData.walletAddress, walletName:bodyData.walletName, walletKey:bodyData.walletKey };
  
    return resultInfo;
};

// 지갑수정 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfDeleteWallet = (req:Request):ResultInfo => {

    const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
        'adminID',
        'authToken',
        'serverType'
      ]);
    
    const bodyData = svcProcessor.getReqBodyData(req);
      console.log('bodyData=',bodyData);
  
    const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
    resultInfo.data = { adminID, authToken, serverType, walletAddress:bodyData.walletAddress };
  
    return resultInfo;
};

// ERC20 토큰 전송 요청 파라메터에 대한 유효성 체크
export const getValidatedReqParamOfTransferToken = async (req: Request): Promise<ResultInfo> => {
  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
    'adminID',
    'authToken',
    'serverType'
  ]);

  const bodyData = svcProcessor.getReqBodyData(req);

  console.log('bodyData=',bodyData);

  const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
  resultInfo.data = { adminID, authToken, serverType, initReq:bodyData.initReq, senderWalletAddress:bodyData.senderWalletAddress, tokenInfo:bodyData.tokenInfo, targetAddressList:bodyData.targetAddressList };

  return resultInfo;
};

// 마켓 매출관리 컨트랙트의 정보 조회 요청 파라메터에 대한 유효성 체크
export const getValidatedReqParamOfGetMarketContractInfo = async (req: Request): Promise<ResultInfo> => {
  
  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
    'adminID',
    'authToken',
    'serverType'
  ]);

  const bodyData = svcProcessor.getReqBodyData(req);

  console.log('bodyData=',bodyData);

  const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
  resultInfo.data = { adminID, authToken, serverType, contractType:bodyData.contractType, balanceInfo:bodyData.balanceInfo };

  return resultInfo;
}

// 마켓 컨트랙트내 특정 코인/토큰 잔고를 지갑으로 전송처리 요청 파라메터에 대한 유효성 체크
export const getValidatedReqParamOfTransferMarketBalanceToAddress = async (req: Request): Promise<ResultInfo> => {

  // marketcontract/list

  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
    'adminID',
    'authToken',
    'serverType'
  ]);

  const bodyData = svcProcessor.getReqBodyData(req);

  console.log('bodyData=',bodyData);

  const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
  resultInfo.data = { adminID, authToken, serverType, ownerAddress:bodyData.ownerAddress, contractType:bodyData.contractType, itemType:bodyData.itemType, tokenType:bodyData.tokenType, amount:bodyData.amount, targetAddress:bodyData.targetAddress  };

  return resultInfo;
}

// 마켓 컨트랙트내 설정정보 조회 요청 파라메터에 대한 유효성 체크
export const getValidatedReqParamOfQueryMarketContractSettingInfo = async (req: Request): Promise<ResultInfo> => {
  
  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
    'adminID',
    'authToken',
    'serverType'
  ]);

  const bodyData = svcProcessor.getReqBodyData(req);

  console.log('bodyData=',bodyData);

  const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
  resultInfo.data = { adminID, authToken, serverType, contractType:bodyData.contractType };

  return resultInfo;
}

// 마켓 컨트랙트내 설정정보 업데이트 요청 파라메터에 대한 유효성 체크
export const getValidatedReqParamOfUpdateMarketContractSettingInfo = async (req: Request): Promise<ResultInfo> => {
  
  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
    'adminID',
    'authToken',
    'serverType'
  ]);

  const bodyData = svcProcessor.getReqBodyData(req);

  console.log('bodyData=',bodyData);

  const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
  resultInfo.data = { adminID, authToken, serverType, contractType:bodyData.contractType, contractSettingInfo:bodyData.contractSettingInfo };

  return resultInfo;
}