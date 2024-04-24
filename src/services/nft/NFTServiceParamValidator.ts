import * as svcProcessor from 'src/services/common/CommonServiceProcessor';
import { Request, Response, NextFunction } from 'express';
import { ResultInfo, ResultCode, getResultForm, ReqValidationErrorMsg } from 'src/common/ResponseManager';
import SQLDataManager from 'src/common/db/SQLDataManager';
import * as aclManager from 'src/services/common/AdminACLManager';
import { constants } from 'buffer';
import * as constants2 from 'src/common/constants';
const { body, header, query, check } = require('express-validator');

// NFT 생성 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfGenerateNFTAttrs = async (req: Request): Promise<ResultInfo> => {

    const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
        'adminID',
        'authToken',
        'serverType'
      ]);
    
    const bodyData = svcProcessor.getReqBodyData(req);
      console.log('bodyData=',bodyData);

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
  resultInfo.data = { adminID, authToken, serverType, finalReq:bodyData.finalReq, nftType:bodyData.type, packageType:bodyData.packageType, packageIDTable:bodyData.packageIDTable,mintingCount:bodyData.mintingCount, groupID:bodyData.groupID, attrIDList:bodyData.attrIDQtyPairList, totalAttrIDList:bodyData.totalAttrIDQtyPairList, restartMintingCount:bodyData.restartMintingCount, desc:bodyData.desc, totalTokenNum:bodyData.totalTokenNum };

  return resultInfo;
};

// 민팅정보 복사 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfCopyMintingInfoToServer = async (req: Request): Promise<ResultInfo> => {

  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
    'adminID',
    'authToken',
    'serverType'
  ]);

  const bodyData = svcProcessor.getReqBodyData(req);
  console.log('bodyData=',bodyData);

  const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});

  if(serverType === bodyData.targetServerType || (bodyData.targetServerType.toUpperCase() !== constants2.SERVER_TYPE_INTERNAL &&
    bodyData.targetServerType.toUpperCase() !== constants2.SERVER_TYPE_QA &&
    bodyData.targetServerType.toUpperCase() !== constants2.SERVER_TYPE_REVIEW &&
    bodyData.targetServerType.toUpperCase() !== constants2.SERVER_TYPE_LIVE)) {

      resultInfo.resultCode = ResultCode.INVALID_REQPARAM;
      resultInfo.message = ReqValidationErrorMsg[resultInfo.resultCode.toString()];
      return resultInfo;
  }

  resultInfo.data = { adminID, authToken, serverType, logID:bodyData.logID, groupID:bodyData.groupID, targetServerType:bodyData.targetServerType };

  return resultInfo;
};

// 민팅정보 삭제 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfDeleteActLogAndData = async (req: Request): Promise<ResultInfo> => {

  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
      'adminID',
      'authToken',
      'serverType'
    ]);
  
  const bodyData = svcProcessor.getReqBodyData(req);
    console.log('bodyData=',bodyData);

  const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
  resultInfo.data = { adminID, authToken, serverType, logID:bodyData.logID };

  return resultInfo;
};

// NFT 생성 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfDeleteNFTAttrs = async (req: Request): Promise<ResultInfo> => {

  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
      'adminID',
      'authToken',
      'serverType'
    ]);
  
  const bodyData = svcProcessor.getReqBodyData(req);
    console.log('bodyData=',bodyData);

  const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
  resultInfo.data = { adminID, authToken, serverType, groupID:bodyData.groupID,mintingCount:bodyData.mintingCount };

  return resultInfo;
};

// 메타데이터 생성 및 스토리지 저장 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfUploadMetadata = async (req: Request): Promise<ResultInfo> => {
  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
    'adminID',
    'authToken',
    'serverType'
  ]);

  const bodyData = svcProcessor.getReqBodyData(req);
  console.log('bodyData=',bodyData);

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
  resultInfo.data = { adminID, authToken, serverType, logID:bodyData.logID, groupID:bodyData.groupID, desc:bodyData.desc, mintingCount:bodyData.mintingCount };

  return resultInfo;
};

// 민팅된 NFT의 속성정보 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfQueryMintedNFTAttrList = async (req: Request): Promise<ResultInfo> => {
  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
    'adminID',
    'authToken',
    'serverType'
  ]);

  const bodyData = svcProcessor.getReqBodyData(req);
  console.log('bodyData=',bodyData);
  
  const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
  resultInfo.data = { adminID, authToken, serverType, itemType:bodyData.itemType, partType:bodyData.partType, startTime:bodyData.startTime, endTime:bodyData.endTime };

  return resultInfo;
};

// 메타데이터 업데이트 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfUpdateMetadata = async (req: Request): Promise<ResultInfo> => {
  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
    'adminID',
    'authToken',
    'serverType'
  ]);

  const bodyData = svcProcessor.getReqBodyData(req);
  console.log('bodyData=',bodyData);
  
  const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
  resultInfo.data = { adminID, authToken, serverType, metadataInfoList:bodyData.metadataInfoList };

  return resultInfo;
};

// NFT 민팅 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfMintNFT = async (req: Request): Promise<ResultInfo> => {
  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
    'adminID',
    'authToken',
    'serverType'
  ]);

  const bodyData = svcProcessor.getReqBodyData(req);
  
    console.log('bodyData=',bodyData);

    const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
    if(bodyData.mintingInfoList === undefined || bodyData.mintingInfoList.length === 0) {
      resultInfo.resultCode = ResultCode.INVALID_REQPARAM;
      resultInfo.message = ReqValidationErrorMsg[ResultCode.INVALID_REQPARAM.toString()]+"(bodyData.mintingInfoList)";
      return resultInfo;
    }
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
  
    
    resultInfo.data = { adminID, authToken, serverType, logID:bodyData.logID,finalReq:bodyData.finalReq,reqGroupID:bodyData.reqGroupID, packageType:bodyData.packageType, packageIDTable:bodyData.packageIDTable, desc:bodyData.desc, mintingCount:bodyData.mintingCount, mintingInfoList:bodyData.mintingInfoList, tokenGenData:bodyData.tokenGenData, totalMintingNum:bodyData.totalMintingNum };
  
    return resultInfo;
  };

  // 민팅된 NFT 검증 요청 파라메터에 대한 유효성 체크
  export const getValidatedReqParamOfCheckNFT = async (req: Request): Promise<ResultInfo> => {

    const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
      'adminID',
      'authToken',
      'serverType'
    ]);
  
    const bodyData = svcProcessor.getReqBodyData(req);

    console.log('bodyData=',bodyData);

    const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
    if(bodyData.groupID === undefined || bodyData.mintingCount === undefined || bodyData.quantity === undefined) {
      resultInfo.resultCode = ResultCode.INVALID_REQPARAM;
      resultInfo.message = ReqValidationErrorMsg[ResultCode.INVALID_REQPARAM.toString()];
      return resultInfo;
    }
    
    resultInfo.data = { adminID, authToken, serverType, groupID:bodyData.groupID, mintingCount:bodyData.mintingCount, quantity:bodyData.quantity };
  
    return resultInfo;
  };

  // NFT 목록 요청 파라메터에 대한 유효성 체크
  export const getValidatedReqParamOfQueryNFTList = async (req: Request): Promise<ResultInfo> => {
    const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
      'adminID',
      'authToken',
      'serverType'
    ]);
  
    const bodyData = svcProcessor.getReqBodyData(req);

    console.log('bodyData=',bodyData);
  
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
    resultInfo.data = { adminID, authToken, serverType, onlyTokenInfo:bodyData.onlyTokenInfo, address:bodyData.address, offset:bodyData.offset, queryNum:bodyData.queryNum };
  
    return resultInfo;
  };

  // 토큰ID에 대한 현재 속성정보 요청 파라메터에 대한 유효성 체크
  export const getValidatedReqParamOfGetNFTCurProp = async (req: Request): Promise<ResultInfo> => {
    const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
      'adminID',
      'authToken',
      'serverType'
    ]);
  
    const bodyData = svcProcessor.getReqBodyData(req);

    console.log('bodyData=',bodyData);
  
    const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
    resultInfo.data = { adminID, authToken, serverType, tokenID:bodyData.tokenID };
  
    return resultInfo;
  };

  // groupID에 대한 NFT 목록 요청 파라메터에 대한 유효성 체크
  export const getValidatedReqParamOfQueryNFTListForGroup = async (req: Request): Promise<ResultInfo> => {
    const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
      'adminID',
      'authToken',
      'serverType'
    ]);
  
    const bodyData = svcProcessor.getReqBodyData(req);

    console.log('bodyData=',bodyData);
      
    const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
    resultInfo.data = { adminID, authToken, serverType, groupID:bodyData.groupID, mintingCount:(bodyData.mintingCount === undefined?-1:bodyData.mintingCount), allStates:bodyData.allStates };

    return resultInfo;

  };

  // NFT 소유여부 요청 파라메터에 대한 유효성 체크
  export const getValidatedReqParamOfQueryOwnerOfNFT = async (req: Request): Promise<ResultInfo> => {
    const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
      'adminID',
      'authToken',
      'serverType'
    ]);
  
    const bodyData = svcProcessor.getReqBodyData(req);

    console.log('bodyData=',bodyData);
    
    const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
    resultInfo.data = { adminID, authToken, serverType, address:bodyData.address, tokenID:bodyData.tokenID };
  
    return resultInfo;
  };

  // NFT 활동로그목록 요청 파라메터에 대한 유효성 체크
  export const getValidatedReqParamOfQueryNFTActLogList = async (req: Request): Promise<ResultInfo> => {
    const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
      'adminID',
      'authToken',
      'serverType'
    ]);
  
    const bodyData = svcProcessor.getReqBodyData(req);

    console.log('bodyData=',bodyData);
  
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
    resultInfo.data = { adminID, authToken, serverType, activityType:bodyData.activityType, pageNo:bodyData.pageNo, queryNum:bodyData.queryNum };
  
    return resultInfo;

  };

  // NFT 전송 요청 파라메터에 대한 유효성 체크
  export const getValidatedReqParamOfTransferNFT = async (req: Request): Promise<ResultInfo> => {

    const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
      'adminID',
      'authToken',
      'serverType'
    ]);
  
    const bodyData = svcProcessor.getReqBodyData(req);

    console.log('bodyData=',bodyData);
  
    const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
    resultInfo.data = { adminID, authToken, serverType, finalReq:bodyData.finalReq, packageIDTable:bodyData.packageIDTable, sourceType:bodyData.sourceType, groupID:bodyData.groupID, sourceAddress:bodyData.sourceAddress, targetContractAddress:bodyData.targetContractAddress, targetAddress:bodyData.targetAddress, comment:bodyData.comment, tokenIDList:bodyData.tokenIDList, itemInfoList:bodyData.itemInfoList, marketTrigger:bodyData.marketTrigger, totalTransferNum:bodyData.totalTransferNum };
  
    return resultInfo;
  };

  // NFT 활동로그목록 요청 파라메터에 대한 유효성 체크
  export const getValidatedReqParamOfQueryNFTTransferLogList = async (req: Request): Promise<ResultInfo> => {
    const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
      'adminID',
      'authToken',
      'serverType'
    ]);
  
    const bodyData = svcProcessor.getReqBodyData(req);

    console.log('bodyData=',bodyData);
  
    const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
    resultInfo.data = { adminID, authToken, serverType, pageNo:bodyData.pageNo };
  
    return resultInfo;
  };