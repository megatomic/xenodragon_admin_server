import { Request, Response } from 'express';
import * as activityType from 'src/services/common/AdminActivityType';
import ReqBaseInfo,{GameItemInfo} from 'src/services/common/BaseDataObject';
import { ResultInfo,ResultCode,getResultForm } from 'src/common/ResponseManager';
import * as svcManager from 'src/services/common/CommonServiceProcessor';
import * as validator from './LogServiceParamValidator';

// 로그 필터 타입
export const FILTER_TYPE_NONE = 1;
export const FILTER_TYPE_BYADMIN = 2;
export const FILTER_TYPE_BYACTIVITY = 3;


// 활동로그 정보
export interface ActivityLogInfo {
    logID: number
    adminID: string
    activityID: string
    activityName: string
    activityDetail: string
    creationTime: string
}

// 활동로그 목록 요청정보
export interface ReqActivityLogListInfo extends ReqBaseInfo {
    queryFilterInfo: any,
    pageNo: number
};

// 요청 파라메터에 설정된 값을 ReqActivityLogListInfo 타입 객체로 변환
export const convertReqParamToActivityLogListInfo = async (req:Request):Promise<ResultInfo> => {
    
    // 요청 파라메터의 유효성 체크
    const resultInfo: ResultInfo = await validator.getValidatedReqParamOfActivityLogList(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
        return resultInfo;
    }
    
    const info:ReqActivityLogListInfo = {
        adminID:resultInfo.data['adminID'],
        authToken:resultInfo.data['authToken'],
        serverType: resultInfo.data['serverType'],
        queryFilterInfo:resultInfo.data['queryFilterInfo'],
        pageNo:parseInt(resultInfo.data['pageNo'])
    };
    resultInfo.data = info;
    return resultInfo;
};