import { Request, Response } from 'express';
import ReqBaseInfo, { jsonKeyValue } from 'src/services/common/BaseDataObject';
import { ResultInfo, ResultCode, getResultForm } from 'src/common/ResponseManager';
import * as svcManager from 'src/services/common/CommonServiceProcessor';
import * as validator from './NFTServiceParamValidator';


// NFT 속성정보
export interface NFTAttributeInfo {
    reqGroupID: number
    tokenId: string
    packageId: string
    attributeId: string
    itemType: number
    grade: string
    partType: number
    metadata: object
    boxID:number
}

// 활동로그 정보
export interface ActivityLogInfo {
  logID: number
  activityType: number
  activityCount: number
  quantity: number
  desc: string
  reqGroupID: string
  creationTime: string
  data: string
  targetAddress: string
  packageType: number
  packageData: string
  state: number
}

// 전송로그 정보
export interface TransferLogInfo {
  logID: number
  groupID: number
  comment: string
  sourceAddress: string
  targetAddress: string
  quantity: number
  creationTime: string
  data: string
}

// NFT 생성 요청정보
export interface ReqGenerateNFTAttrsInfo extends ReqBaseInfo {
  finalReq: boolean,
  nftType: string
  groupID: number
  packageType: number
  mintingCount: number
  attrIDList: object
  totalAttrIDList: object
  restartMintingCount: boolean
  packageIDTable: string[]
  desc: string
  totalTokenNum: number
}

// 민팅중인 정보를 타 서버DB로 복사하기
export interface ReqCopyMintingInfoToServer extends ReqBaseInfo {
  logID: number
  groupID: number
  targetServerType: string
}

// 민팅중인 정보 삭제 요청정보
export interface ReqDeleteActLogAndData extends ReqBaseInfo {
  logID: number
}

// NFT 속성 삭제 요청정보
export interface ReqDeleteNFTAttrsInfo extends ReqBaseInfo {
  groupID: number
  mintingCount: number
}

// 메타데이터 생성 및 저장 요청정보
export interface ReqUploadMetadataInfo extends ReqBaseInfo {
  logID: number
  groupID: number
  desc: string
  mintingCount: number
}

// 민팅된 NFT의 속성정보 조회 요청정보
export interface ReqMintedNFTAttrListInfo extends ReqBaseInfo {
  itemType: string;
  partType: number;
  startTime: string;
  endTime: string;
}

// 메타데이터 업데이트 요청정보
export interface ReqUpdateMetadataInfo extends ReqBaseInfo {
  metadataInfoList: any
};

// NFT 민팅 요청정보
export interface ReqMintNFTInfo extends ReqBaseInfo {
  logID: number
  finalReq: boolean
  reqGroupID: string
  packageType: number
  packageIDTable: string[]
  mintingCount: number
  desc: string
  mintingInfoList: any[]
  tokenGenData: string
  totalMintingNum: number
}

// 민팅된 NFT 검증 요청정보
export interface ReqCheckNFTInfo extends ReqBaseInfo {

    groupID: number
    mintingCount: number
    quantity: number
}

// NFT 목록조회 요청정보
export interface ReqQueryNFTListInfo extends ReqBaseInfo {
  onlyTokenInfo: boolean
  address: string
  offset: number
  queryNum: number
}

// 토큰ID에 대한 현재 속성값 요청정보
export interface ReqGetNFTCurPropInfo extends ReqBaseInfo {
  tokenID: string
};

// groupID로 NFT 목록조회 요청정보
export interface ReqQueryNFTListForGroupInfo extends ReqBaseInfo {
  groupID: number
  mintingCount: number
  allStates: boolean
}

// NFT 새 활동로그등록 요청정보
export interface ReqNewNFTActLogInfo extends ReqBaseInfo {
  reqGroupID: string
  activityType: number
  activityCount: number
  desc: string
  quantity: number
}

// NFT 소유여부 요청정보
export interface ReqQueryOwnerOfNFTInfo extends ReqBaseInfo {
  address: string
  tokenID: number
}

// NFT 활동로그조회 요청정보
export interface ReqQueryNFTActLogListInfo extends ReqBaseInfo {
    activityType: number
    pageNo: number
    queryNum: number
}

// NFT 전송하기 요청정보
export interface ReqTransferNFTInfo extends ReqBaseInfo {
  finalReq: boolean
  packageIDTable: number[]
  sourceType: number
  groupID: string
  sourceAddress: string
  targetContractAddress: string
  targetAddress: string
  comment: string
  tokenIDList: string[]
  itemInfoList: any[]
  marketTrigger: number
  totalTransferNum: number
}

// NFT 전송로그조회 요청정보
export interface ReqQueryNFTTransferLogListInfo extends ReqBaseInfo {
  pageNo: number
}

// 요청 파라메터에 설정된 값을 ReqGenerateNFTAttrsInfo 타입 객체로 변환
export const convertReqParamToGenerateNFTAttrsInfo = async (req: Request): Promise<ResultInfo> => {
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfGenerateNFTAttrs(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      return resultInfo;
    }
  
    const info: ReqGenerateNFTAttrsInfo = {
      adminID: resultInfo.data['adminID'],
      authToken: resultInfo.data['authToken'],
      serverType: resultInfo.data['serverType'],
      finalReq: resultInfo.data['finalReq'],
      nftType: resultInfo.data['nftType'],
      groupID: resultInfo.data['groupID'],
      packageType: resultInfo.data['packageType'], 
      mintingCount: resultInfo.data['mintingCount'],
      attrIDList: resultInfo.data['attrIDList'],
      totalAttrIDList: resultInfo.data['totalAttrIDList'],
      restartMintingCount: resultInfo.data['restartMintingCount'],
      packageIDTable: resultInfo.data['packageIDTable'],
      desc: resultInfo.data['desc'],
      totalTokenNum: resultInfo.data['totalTokenNum']
    };
    resultInfo.data = info;
    return resultInfo;
  };

// 요청 파라메터에 설정된 값을 ReqCopyMintingInfoToServer 타입 객체로 변환
export const convertReqParamToCopyMintingInfoToServer = async (req: Request): Promise<ResultInfo> => {
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfCopyMintingInfoToServer(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      return resultInfo;
    }
  
    const info: ReqCopyMintingInfoToServer = {
      adminID: resultInfo.data['adminID'],
      authToken: resultInfo.data['authToken'],
      serverType: resultInfo.data['serverType'],
      logID: resultInfo.data['logID'],
      groupID: resultInfo.data['groupID'],
      targetServerType: resultInfo.data['targetServerType']
    };
    resultInfo.data = info;
    return resultInfo;
}

// 요청 파라메터에 설정된 값을 ReqDeleteActLogAndData 타입 객체로 변환
export const convertReqParamToDeleteActLogAndData = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfDeleteActLogAndData(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqDeleteActLogAndData = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    logID: resultInfo.data['logID']
  };
  resultInfo.data = info;
  return resultInfo;
}
  
// 요청 파라메터에 설정된 값을 ReqDeleteNFTAttrsInfo 타입 객체로 변환
export const convertReqParamToDeleteNFTAttrsInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfDeleteNFTAttrs(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqDeleteNFTAttrsInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    groupID: resultInfo.data['groupID'],
    mintingCount: resultInfo.data['mintingCount']
  };
  resultInfo.data = info;
  return resultInfo;
};

  // 요청 파라메터에 설정된 값을 ReqUploadMetadataInfo 타입 객체로 변환
export const convertReqParamToUploadMetadataInfo = async (req: Request): Promise<ResultInfo> => {
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfUploadMetadata(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      return resultInfo;
    }
  
    const info: ReqUploadMetadataInfo = {
      adminID: resultInfo.data['adminID'],
      authToken: resultInfo.data['authToken'],
      serverType: resultInfo.data['serverType'],
      logID: resultInfo.data['logID'],
      groupID: resultInfo.data['groupID'],
      desc: resultInfo.data['desc'],
      mintingCount: resultInfo.data['mintingCount']
    };
    resultInfo.data = info;
    return resultInfo;
  };

// 요청 파라메터에 설정된 값을 ReqMintedNFTAttrListInfo 타입 객체로 변환
export const convertReqParamToQueryMintedNFTAttrInfoList = async (req: Request): Promise<ResultInfo> => {
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfQueryMintedNFTAttrList(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      return resultInfo;
    }
  
    const info: ReqMintedNFTAttrListInfo = {
      adminID: resultInfo.data['adminID'],
      authToken: resultInfo.data['authToken'],
      serverType: resultInfo.data['serverType'],
      itemType: resultInfo.data['itemType'],
      partType: resultInfo.data['partType'],
      startTime: resultInfo.data['startTime'],
      endTime: resultInfo.data['endTime']
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqUpdateMetadataInfo 타입 객체로 변환
export const convertReqParamToUpdateMetadataInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfUpdateMetadata(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqUpdateMetadataInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    metadataInfoList: resultInfo.data['metadataInfoList']
  };
  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqGenerateNFTAttrsInfo 타입 객체로 변환
export const convertReqParamToMintNFTInfo = async (req: Request): Promise<ResultInfo> => {
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfMintNFT(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      return resultInfo;
    }
  
    const info: ReqMintNFTInfo = {
      adminID: resultInfo.data['adminID'],
      authToken: resultInfo.data['authToken'],
      serverType: resultInfo.data['serverType'],
      logID: resultInfo.data['logID'],
      finalReq: resultInfo.data['finalReq'],
      reqGroupID: resultInfo.data['reqGroupID'],
      packageType: resultInfo.data['packageType'],
      packageIDTable: resultInfo.data['packageIDTable'],
      mintingCount: resultInfo.data['mintingCount'],
      desc: resultInfo.data['desc'],
      mintingInfoList: resultInfo.data['mintingInfoList'],
      tokenGenData: resultInfo.data['tokenGenData'],
      totalMintingNum: resultInfo.data['totalMintingNum']
    };
    resultInfo.data = info;
    return resultInfo;
  };

  // 요청 파라메터에 설정된 값을 ReqCheckNFTInfo 타입 객체로 변환
  export const convertReqParamToCheckNFTInfo = async (req: Request): Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfCheckNFT(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      return resultInfo;
    }
  
    const info: ReqCheckNFTInfo = {
      adminID: resultInfo.data['adminID'],
      authToken: resultInfo.data['authToken'],
      serverType: resultInfo.data['serverType'],
      groupID: resultInfo.data['groupID'],
      mintingCount: resultInfo.data['mintingCount'],
      quantity: resultInfo.data['quantity']
    };
    resultInfo.data = info;
    return resultInfo;
  };

  // 요청 파라메터에 설정된 값을 ReqQueryNFTListInfo 타입 객체로 변환
  export const convertReqParamToQueryNFTList = async (req: Request): Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfQueryNFTList(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      return resultInfo;
    }
  
    const info: ReqQueryNFTListInfo = {
      adminID: resultInfo.data['adminID'],
      authToken: resultInfo.data['authToken'],
      serverType: resultInfo.data['serverType'],
      address: resultInfo.data['address'],
      onlyTokenInfo: resultInfo.data['onlyTokenInfo'],
      offset: parseInt(resultInfo.data['offset']),
      queryNum: parseInt(resultInfo.data['queryNum'])
    };
    resultInfo.data = info;
    return resultInfo;
  };

  // 요청 파라메터에 설정된 값을 ReqGetNFTCurPropInfo 타입 객체로 변환
  export const convertReqParamToGetNFTCurProp = async (req: Request): Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfGetNFTCurProp(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      return resultInfo;
    }
  
    const info: ReqGetNFTCurPropInfo = {
      adminID: resultInfo.data['adminID'],
      authToken: resultInfo.data['authToken'],
      serverType: resultInfo.data['serverType'],
      tokenID: resultInfo.data['tokenID']
    };
    resultInfo.data = info;
    return resultInfo;
  };

  // 요청 파라메터에 설정된 값을 ReqQueryNFTListForGroupInfo 타입 객체로 변환
  export const convertReqParamToQueryNFTListForGroup = async (req: Request): Promise<ResultInfo> => {

        // 요청 파라메터의 유효성 체크
        const resultInfo: ResultInfo = await validator.getValidatedReqParamOfQueryNFTListForGroup(req);
        if (resultInfo.resultCode !== ResultCode.SUCCESS) {
          return resultInfo;
        }
      
        const info: ReqQueryNFTListForGroupInfo = {
          adminID: resultInfo.data['adminID'],
          authToken: resultInfo.data['authToken'],
          serverType: resultInfo.data['serverType'],
          groupID: resultInfo.data['groupID'],
          mintingCount: parseInt(resultInfo.data['mintingCount']),
          allStates: resultInfo.data['allStates']
        };
        resultInfo.data = info;
        return resultInfo;
  };

  // 요청 파라메터에 설정된 값을 ReqQueryOwnerOfNFT 타입 객체로 변환
  export const convertReqParamToQueryOwnerOfNFT = async (req: Request): Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfQueryOwnerOfNFT(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      return resultInfo;
    }
  
    const info: ReqQueryOwnerOfNFTInfo = {
      adminID: resultInfo.data['adminID'],
      authToken: resultInfo.data['authToken'],
      serverType: resultInfo.data['serverType'],
      address: resultInfo.data['address'],
      tokenID: resultInfo.data['tokenID']
    };
    resultInfo.data = info;
    return resultInfo;
  };

  // 요청 파라메터에 설정된 값을 ReqQueryNFTActLogListInfo 타입 객체로 변환
  export const convertReqParamToQueryNFTActLogListInfo = async (req: Request): Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfQueryNFTActLogList(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      return resultInfo;
    }
  
    const info: ReqQueryNFTActLogListInfo = {
      adminID: resultInfo.data['adminID'],
      authToken: resultInfo.data['authToken'],
      serverType: resultInfo.data['serverType'],
      activityType: resultInfo.data['activityType'],
      pageNo: resultInfo.data['pageNo'],
      queryNum: resultInfo.data['queryNum']
    };
    resultInfo.data = info;
    return resultInfo;
  };

  // 요청 파라메터에 설정된 값을 ReqTansferNFTInfo 타입 객체로 변환
  export const convertReqParamToTransferNFT = async (req: Request): Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfTransferNFT(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      return resultInfo;
    }
  
    const info: ReqTransferNFTInfo = {
      adminID: resultInfo.data['adminID'],
      authToken: resultInfo.data['authToken'],
      serverType: resultInfo.data['serverType'],
      finalReq: resultInfo.data['finalReq'],
      packageIDTable: resultInfo.data['packageIDTable'],
      sourceType: resultInfo.data['sourceType'],
      groupID: resultInfo.data['groupID'],
      sourceAddress: resultInfo.data['sourceAddress'],
      targetContractAddress: resultInfo.data['targetContractAddress'],
      targetAddress: resultInfo.data['targetAddress'],
      comment: resultInfo.data['comment'],
      tokenIDList: resultInfo.data['tokenIDList'],
      itemInfoList: resultInfo.data['itemInfoList'],
      marketTrigger: parseInt(resultInfo.data['marketTrigger']),
      totalTransferNum: resultInfo.data['totalTransferNum']
    };
    resultInfo.data = info;
    return resultInfo;
  };

  // 요청 파라메터에 설정된 값을 ReqQueryNFTTransferLogListInfo 타입 객체로 변환
  export const convertReqParamToQueryNFTTransferLogListInfo = async (req: Request): Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfQueryNFTTransferLogList(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      return resultInfo;
    }
  
    const info: ReqQueryNFTTransferLogListInfo = {
      adminID: resultInfo.data['adminID'],
      authToken: resultInfo.data['authToken'],
      serverType: resultInfo.data['serverType'],
      pageNo: resultInfo.data['pageNo']
    };
    resultInfo.data = info;
    return resultInfo;
  };
  