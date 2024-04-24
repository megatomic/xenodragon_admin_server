import * as svcProcessor from 'src/services/common/CommonServiceProcessor';
import { Request, Response, NextFunction } from 'express';
import { ResultInfo, ResultCode, getResultForm, ReqValidationErrorMsg } from 'src/common/ResponseManager';
import SQLDataManager from 'src/common/db/SQLDataManager';
import * as aclManager from 'src/services/common/AdminACLManager';
const { body, header, query, check } = require('express-validator');


// 사용자 통계 조회 요청 파라메터에 대한 유효성 체크
export const getValidatedReqParamOfUserStatistics = async (req: Request): Promise<ResultInfo> => {
    const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
        'adminID',
        'authToken',
        'serverType'
    ]);
    
    const bodyData = svcProcessor.getReqBodyData(req);
    
    console.log('bodyData=',bodyData);
    
    const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
    resultInfo.data = { adminID, authToken, serverType, baseTime:bodyData.baseTime, baseDirection:bodyData.baseDirection, displayNum:bodyData.displayNum, timeIntervalType:bodyData.timeIntervalType, offsetValue:bodyData.offsetValue };
    
    return resultInfo;
};

// 재화 통계 조회 요청 파라메터에 대한 유효성 체크
export const getValidatedReqParamOfCashStatistics = async (req: Request): Promise<ResultInfo> => {
    const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
        'adminID',
        'authToken',
        'serverType'
    ]);
    
    const bodyData = svcProcessor.getReqBodyData(req);
    
    console.log('bodyData=',bodyData);
    
    const resultInfo = getResultForm(ResultCode.SUCCESS, '', {});
    resultInfo.data = { adminID, authToken, serverType, baseTime:bodyData.baseTime, baseDirection:bodyData.baseDirection, displayNum:bodyData.displayNum, timeIntervalType:bodyData.timeIntervalType, offsetValue:bodyData.offsetValue };
    
    return resultInfo;
};