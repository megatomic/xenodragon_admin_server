import { Request, Response } from 'express';
import * as activityType from 'src/services/common/AdminActivityType';
import ReqBaseInfo,{GameItemInfo} from 'src/services/common/BaseDataObject';
import { ResultInfo,ResultCode,getResultForm } from 'src/common/ResponseManager';
import * as svcManager from 'src/services/common/CommonServiceProcessor';
import * as validator from './StatisticsServiceParamValidator';


// 사용자 활동 테이블 조회 요청정보
export interface ReqUserStatisticsInfo extends ReqBaseInfo {
    baseTime:string,
    baseDirection:boolean,
    displayNum:number,
    timeIntervalType:number,
    offsetValue:number
};

// 재화 활동 테이블 조회 요청정보
export interface ReqCashStatisticsInfo extends ReqBaseInfo {
    baseTime:string,
    baseDirection:boolean,
    displayNum:number,
    timeIntervalType:number,
    offsetValue:number
};

// 요청 파라메터에 설정된 값을 ReqUserStatisticsInfo 타입 객체로 변환
export const convertReqParamToQueryUserStatisticsData = async (req:Request):Promise<ResultInfo> => {
    
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfUserStatistics(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const info:ReqUserStatisticsInfo = {
        adminID:resultInfo.data['adminID'],
        authToken:resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        baseTime:resultInfo.data['baseTime'],
        baseDirection:resultInfo.data['baseDirection'],
        displayNum:resultInfo.data['displayNum'],
        timeIntervalType:resultInfo.data['timeIntervalType'],
        offsetValue:resultInfo.data['offsetValue']
    };
    resultInfo.data = info;
    return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqCashStatisticsInfo 타입 객체로 변환
export const convertReqParamToQueryCashStatisticsData = async (req:Request):Promise<ResultInfo> => {
    
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfCashStatistics(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const info:ReqCashStatisticsInfo = {
        adminID:resultInfo.data['adminID'],
        authToken:resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        baseTime:resultInfo.data['baseTime'],
        baseDirection:resultInfo.data['baseDirection'],
        displayNum:resultInfo.data['displayNum'],
        timeIntervalType:resultInfo.data['timeIntervalType'],
        offsetValue:resultInfo.data['offsetValue']
    };
    resultInfo.data = info;
    return resultInfo;
};