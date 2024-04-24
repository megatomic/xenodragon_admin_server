import { Request, Response } from 'express';
import * as activityType from 'src/services/common/AdminActivityType';
import ReqBaseInfo,{GameItemInfo} from 'src/services/common/BaseDataObject';
import { ResultInfo,ResultCode,getResultForm } from 'src/common/ResponseManager';
import * as svcManager from 'src/services/common/CommonServiceProcessor';
import * as validator from './ToolServiceParamValidator';
import { stringifiedJson } from 'aws-sdk/clients/customerprofiles';


// 활동로그 정보
export interface MarketUserInfo {
    userID: string
    name: string
    email: string
    walletAddress: string
    nationCode: string
    timestamp: string
}

// 활동로그 정보
export interface ActivityLogInfo {
    logID: number
    adminID: string
    activityID: string
    activityName: string
    activityDetail: string
    creationTime: string
}

// 게임서버 DB 테이블 조회 요청정보
export interface ReqQueryDBTableInfo extends ReqBaseInfo {
    dbName: string
    tableName: string
};

// 활동로그 목록 요청정보
export interface ReqSaveArenaInfo extends ReqBaseInfo {
    tableName: string
    tableData: any
};

// 마켓에 시즌정보 등록 요청정보
export interface ReqRegisterSeasonInfoToMarketInfo extends ReqBaseInfo {
    seasonInfo: any
    seasonActivationFlag: boolean
};

// 마켓 유저정보 조회 요청정보
export interface ReqQueryMarketUserListInfo extends ReqBaseInfo {
    queryFilterInfo: any
    pageNo: number
};

// 마켓에 NFT등록 요청정보
export interface ReqRegisterNFTToMarketInfo extends ReqBaseInfo {
    seasonInfo: any
    itemType: string
    price: number
    mintingInfoTable: any
};

// 게임 다운로드정보 업데이트 요청정보
export interface ReqUpdateMarketDownloadURLInfo extends ReqBaseInfo {
    apkDownloadURL: string
    iosMarketURL: string
    androidMarketURL: string
};

// 마켓 점겅정보 업데이트 요청정보
export interface ReqUpdateMarketMaintenanceInfo extends ReqBaseInfo {
    activeFlag: boolean
    startTime: string
    endTime: string
    title: string
    content: string
};

// 마켓 화이트유저목록 조회 요청정보
export interface ReqQueryMarketWhitelistInfo extends ReqBaseInfo {
};

// 마켓에 새 화이트유저 등록 요청정보
export interface ReqRegisterNewMarketWhiteUserInfo extends ReqBaseInfo {
  keyword: string;
};

// 마켓 화이트유저 상태변경 요청정보
export interface ReqChangeMarketWhiteUserStateInfo extends ReqBaseInfo {
    userID: string
    activationFlag: boolean
};

// 요청 파라메터에 설정된 값을 ReqQueryDBTableInfo 타입 객체로 변환
export const convertReqParamToQueryGameDBTable = async (req:Request):Promise<ResultInfo> => {

        // 요청 파라메터의 유효성 체크
        const resultInfo: ResultInfo = await validator.getValidatedReqParamOfQueryGameDBTableInfo(req);
        if (resultInfo.resultCode !== ResultCode.SUCCESS) {
            return resultInfo;
        }
        
        const info:ReqQueryDBTableInfo = {
            adminID: resultInfo.data['adminID'],
            authToken: resultInfo.data['authToken'],
            serverType: resultInfo.data['serverType'],
            dbName: resultInfo.data['dbName'],
            tableName: resultInfo.data['tableName']
        };
        resultInfo.data = info;
        return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqSaveArenaInfo 타입 객체로 변환
export const convertReqParamToSaveArenaInfo = async (req:Request):Promise<ResultInfo> => {
    
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfSaveArenaInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const info:ReqSaveArenaInfo = {
        adminID: resultInfo.data['adminID'],
        authToken: resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        tableName: resultInfo.data['tableName'],
        tableData: resultInfo.data['tableData']
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqRegisterSeasonInfoToMarketInfo 타입 객체로 변환
export const convertReqParamToRegisterSeasonInfoToMarket = async (req:Request):Promise<ResultInfo> => {
    
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfRegisterSeasonInfoToMarketInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const info:ReqRegisterSeasonInfoToMarketInfo = {
        adminID: resultInfo.data['adminID'],
        authToken: resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        seasonInfo: resultInfo.data['seasonInfo'],
        seasonActivationFlag: resultInfo.data['seasonActivationFlag']
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqQueryMarketUserListInfo 타입 객체로 변환
export const convertReqParamToQueryMarketUserList = async (req:Request):Promise<ResultInfo> => {
    
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfQueryMarketUserListInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const info: ReqQueryMarketUserListInfo = {
      adminID: resultInfo.data["adminID"],
      authToken: resultInfo.data["authToken"],
      serverType: resultInfo.data["serverType"],
      queryFilterInfo: resultInfo.data["queryFilterInfo"],
      pageNo: resultInfo.data["pageNo"],
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqRegisterNFTToMarketInfo 타입 객체로 변환
export const convertReqParamToRegisterNFTToMarket = async (req:Request):Promise<ResultInfo> => {
    
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfRegisterNFTToMarketInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const info:ReqRegisterNFTToMarketInfo = {
        adminID: resultInfo.data['adminID'],
        authToken: resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        seasonInfo: resultInfo.data['seasonInfo'],
        itemType: resultInfo.data['itemType'],
        price: resultInfo.data['price'],
        mintingInfoTable: resultInfo.data['mintingInfoTable']
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqBaseInfo 타입 객체로 변환
export const convertReqParamToQueryMarketDownloadURLInfo = async (req:Request):Promise<ResultInfo> => {
    
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfQueryMarketDownloadURLInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const info:ReqBaseInfo = {
        adminID: resultInfo.data['adminID'],
        authToken: resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType']
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqUpdateMarketDownloadURLInfo 타입 객체로 변환
export const convertReqParamToUpdateMarketDownloadURLInfo = async (req:Request):Promise<ResultInfo> => {
    
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfUpdateMarketDownloadURLInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const info:ReqUpdateMarketDownloadURLInfo = {
        adminID: resultInfo.data['adminID'],
        authToken: resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        apkDownloadURL: resultInfo.data['apkDownloadURL'],
        iosMarketURL: resultInfo.data['iosMarketURL'],
        androidMarketURL: resultInfo.data['androidMarketURL']
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqBaseInfo 타입 객체로 변환
export const convertReqParamToQueryMarketMaintenanceLInfo = async (req:Request):Promise<ResultInfo> => {
    
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfQueryMarketMaintenanceInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const info:ReqBaseInfo = {
        adminID: resultInfo.data['adminID'],
        authToken: resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType']
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqUpdateMarketMaintenanceInfo 타입 객체로 변환
export const convertReqParamToUpdateMarketMaintenanceLInfo = async (req:Request):Promise<ResultInfo> => {
    
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfUpdateMarketMaintenanceInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const info:ReqUpdateMarketMaintenanceInfo = {
        adminID: resultInfo.data['adminID'],
        authToken: resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        activeFlag: resultInfo.data['activeFlag'],
        startTime: resultInfo.data['startTime'],
        endTime: resultInfo.data['endTime'],
        title: resultInfo.data['title'],
        content: resultInfo.data['content']
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqQueryMarketWhitelistInfo 타입 객체로 변환
export const convertReqParamToQueryMarketWhitelistInfo = async (
  req: Request
): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo =
    await validator.getValidatedReqParamOfQueryMarketWhitelistInfo(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqQueryMarketWhitelistInfo = {
    adminID: resultInfo.data["adminID"],
    authToken: resultInfo.data["authToken"],
    serverType: resultInfo.data["serverType"],
  };
  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqRegisterNewMarketWhiteUserInfo 타입 객체로 변환
export const convertReqParamToRegisterNewMarketWhiteUserInfo = async (
  req: Request
): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo =
    await validator.getValidatedReqParamOfRegisterNewMarketWhiteUserInfo(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqRegisterNewMarketWhiteUserInfo = {
    adminID: resultInfo.data["adminID"],
    authToken: resultInfo.data["authToken"],
    serverType: resultInfo.data["serverType"],
    keyword: resultInfo.data["keyword"],
  };
  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqChangeMarketWhiteUserStateInfo 타입 객체로 변환
export const convertReqParamToChangeMarketWhiteUserStateInfo = async (
  req: Request
): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo =
    await validator.getValidatedReqParamOfChangeMarketWhiteUserStateInfo(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqChangeMarketWhiteUserStateInfo = {
    adminID: resultInfo.data["adminID"],
    authToken: resultInfo.data["authToken"],
    serverType: resultInfo.data["serverType"],
    userID: resultInfo.data["userID"],
    activationFlag: resultInfo.data["activationFlag"],
  };
  resultInfo.data = info;
  return resultInfo;
};