import { Request, Response } from 'express';
import * as activityType from 'src/services/common/AdminActivityType';
import ReqBaseInfo,{GameItemInfo} from 'src/services/common/BaseDataObject';
import { ResultInfo,ResultCode,getResultForm } from 'src/common/ResponseManager';
import * as svcManager from 'src/services/common/CommonServiceProcessor';
import * as validator from './BlockchainServiceParamValidator';



// 유저스왑로그 정보
export interface UserSwapLogInfo {
    logID: number,
    userID: string,
    originTokenID: number,
    targetTokenID: number,
    swapRateID: number,
    gasFee: number,
    originValue: number,
    targetValue: number,
    swapTx: string,
    swapState: number,
    timestamp: string
}

// 유동성풀 로그 정보
export interface LiquidPoolLogInfo {
    logID: number,
    liquidPoolID: number,
    tokenID: number,
    userActionType: number,
    userActionValue: number,
    userWalletAddress: string,
    timestamp: string 
}

// 유저스왑 테이블 조회 요청정보
export interface ReqQueryUserSwapTableInfo extends ReqBaseInfo {
    baseTime:string,
    baseDirection:boolean,
    displayNum:number,
    timeIntervalType:number,
    offsetValue:number
};

// 유동성풀 테이블 조회 요청정보
export interface ReqQueryLiquidPoolDataInfo extends ReqBaseInfo {
    tokenType: number,
    logOnly: boolean,
    pageNo: number
};

// 지갑주소로 유저정보 조회 요청정보
export interface ReqGetUserByWalletAddressInfo extends ReqBaseInfo {
    walletAddress: string
};

// 요청 파라메터에 설정된 값을 ReqQueryUserSwapTableInfo 타입 객체로 변환
export const convertReqParamToQueryUserSwapTable = async (req:Request):Promise<ResultInfo> => {

        // 요청 파라메터의 유효성 체크
        const resultInfo: ResultInfo = await validator.getValidatedReqParamOfQueryUserSwapTableInfo(req);
        if (resultInfo.resultCode !== ResultCode.SUCCESS) {
            return resultInfo;
        }
        
        const info:ReqQueryUserSwapTableInfo = {
            adminID: resultInfo.data['adminID'],
            authToken: resultInfo.data['authToken'],
            serverType: resultInfo.data['serverType'],
            baseTime: resultInfo.data['baseTime'],
            baseDirection: resultInfo.data['baseDirection'],
            displayNum: resultInfo.data['displayNum'],
            timeIntervalType: resultInfo.data['timeIntervalType'],
            offsetValue: resultInfo.data['offsetValue']
        };
        resultInfo.data = info;
        return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqQueryLiquidPoolDataInfo 타입 객체로 변환
export const convertReqParamToQueryLiquidPoolData = async (req:Request):Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfQueryLiquidPoolDataInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const info:ReqQueryLiquidPoolDataInfo = {
        adminID: resultInfo.data['adminID'],
        authToken: resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        tokenType: resultInfo.data['tokenType'],
        logOnly: resultInfo.data['logOnly'],
        pageNo: resultInfo.data['pageNo']
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqGetUserByWalletAddressInfo 타입 객체로 변환
export const convertReqParamToGetUserByWalletAddress = async (req:Request):Promise<ResultInfo> => {

    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfGetUserByWalletAddress(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const info:ReqGetUserByWalletAddressInfo = {
        adminID: resultInfo.data['adminID'],
        authToken: resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        walletAddress: resultInfo.data['walletAddress']
    };
    resultInfo.data = info;
    return resultInfo;
};