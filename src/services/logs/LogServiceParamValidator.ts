import * as svcProcessor from 'src/services/common/CommonServiceProcessor';
import { Request, Response, NextFunction } from 'express';
import { ResultInfo, ResultCode, getResultForm, ReqValidationErrorMsg } from 'src/common/ResponseManager';
import SQLDataManager from 'src/common/db/SQLDataManager';
import * as aclManager from 'src/services/common/AdminACLManager';
const { body, header, query, check } = require('express-validator');

// 활동로그 조회 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfActivityLogList = async (req: Request): Promise<ResultInfo> => {
  const [adminID, authToken, serverType, queryFilterInfo, pageNo] = svcProcessor.getReqDataSet(req, ['adminID', 'authToken', 'serverType', 'queryFilterInfo', 'pageNo']);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (serverType === null || serverType === undefined || queryFilterInfo === null || queryFilterInfo === undefined || pageNo === null || pageNo === undefined) {
    return getResultForm(ResultCode.INVALID_REQPARAM, '', null);
  }

  // 페이지번호 유효성 체크
  let resultInfo = await svcProcessor.checkReqValidationOfPageNo(req, pageNo, ResultCode.INVALID_PAGENO, 'pageNo');
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  // 필터정보 포맷의 유효성 체크
  let queryFilterInfo2 = null;
  try {
    queryFilterInfo2 = JSON.parse(queryFilterInfo);
    if (queryFilterInfo2.titleKeyword === undefined || queryFilterInfo2.filterActivityType === undefined || queryFilterInfo2.filterStartTime === undefined || queryFilterInfo2.filterEndTime === undefined) {
      resultInfo.resultCode = ResultCode.NOTI_REQPARAM_INVALID_QUERYFILTERINFO;
      resultInfo.message = ReqValidationErrorMsg.VALERRORMSG_INVALID_QUERYFILTER;
      return resultInfo;
    }

    queryFilterInfo2.titleKeyword = decodeURIComponent(queryFilterInfo2.titleKeyword);
  } catch (err) {
    resultInfo.resultCode = ResultCode.NOTI_REQPARAM_INVALID_QUERYFILTERINFO;
    resultInfo.message = ReqValidationErrorMsg.VALERRORMSG_INVALID_QUERYFILTER;
    return resultInfo;
  }

  resultInfo.data = { adminID, authToken, serverType, queryFilterInfo: queryFilterInfo2, pageNo };

  return resultInfo;
};
