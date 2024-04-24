import * as svcProcessor from 'src/services/common/CommonServiceProcessor';
import {Request,Response,NextFunction} from 'express';
import { ResultInfo, ResultCode, getResultForm, ReqValidationErrorMsg } from 'src/common/ResponseManager';
import SQLDataManager from 'src/common/db/SQLDataManager';
const { body, header, query, check } = require('express-validator');


// 로그인관련 요청 파라메터(관리자ID,암호)에 대해 유효성 체크
export const getValidatedReqParamOfLogin = (req:Request):ResultInfo => {

    const [adminID,adminPW,serverType] = svcProcessor.getReqDataSet(req,['adminID', 'adminPW','serverType']);

    let resultInfo = getResultForm(ResultCode.SUCCESS,"",null);
    resultInfo.data = {adminID,adminPW,serverType};

    return resultInfo;
};

// 로그인후 인증 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfAuth = (req:Request):ResultInfo => {

    const [adminID,authToken,serverType] = svcProcessor.getReqDataSet(req,['adminID', 'authToken', 'serverType']);
    
    let resultInfo = getResultForm(ResultCode.SUCCESS,"",null);
    resultInfo.data = {adminID,authToken,serverType};

    return resultInfo;
};