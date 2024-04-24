import { Request, Response, NextFunction, Router } from 'express';
import { ResultCode, getResultForm, ReqValidationErrorMsg } from 'src/common/ResponseManager';
import {DBSOURCE_ADMIN,DBSOURCE_GAMESERVER,getSQLDataManager} from 'src/common/db/DataManagerFactory';
import * as accountDataHandler from 'src/services/accounts/AccountServiceDataHandler';
import * as cmnSvcProcessor from 'src/services/common/CommonServiceProcessor';
import * as aclManager from 'src/services/common/AdminACLManager';
import * as serviceLogger from 'src/services/common/ServiceLogger';
import SQLDataManager from 'src/common/db/SQLDataManager';
import { createHashedPassword, makePasswordHashed } from 'src/common/CryptoManager';
import * as aao from 'src/services/auth/AuthDataObject';
import * as ado from 'src/services/accounts/AccountDataObject';
import * as activityType from 'src/services/common/AdminActivityType';
import JWTManager from 'src/services/common/JWTManager';
import * as Utils from 'src/common/Utils';

const requestIP = require('request-ip');

const router = Router();

// 로그인 처리 및 JWT 발급
const login = async (req: Request, res: Response): Promise<any> => {
  
  serviceLogger.logDebug('##### [START] login()');

  try {
    const obj1 = {
      list:[{id:1, name:'yspark'},{id:2, name:'megatomic'}]
    };
    console.log('base64=',Utils.encodeBase64(JSON.stringify(obj1)));


    // 요청 파라메터 유효성 체크 및 요청 객체로 변환
    let resultInfo = await aao.convertReqParamToLoginInfo(req);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      cmnSvcProcessor.sendResponse(res, resultInfo, null);
      return;
    }
    const reqLoginInfo: aao.ReqLoginInfo = resultInfo.data;

    const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,reqLoginInfo.serverType);

    const { passwordHash, salt } = await createHashedPassword('Nstep6262!');
    console.log(`passwordHashed=${passwordHash}, salt=${salt}`);

    console.log(JSON.stringify(aclManager.createBaseACLObj()));

    resultInfo = await accountDataHandler.queryDBAccount(sqlDataManager, reqLoginInfo.adminID);
    if (resultInfo.resultCode !== ResultCode.SUCCESS) {
      resultInfo.resultCode = ResultCode.AUTH_LOGIN_IDNOTFOUND;
      resultInfo.message = ReqValidationErrorMsg[ResultCode.AUTH_LOGIN_IDNOTFOUND.toString()];
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    const loginAccountInfo: ado.AccountInfo = resultInfo.data; //ado.convertDBToAccountRecordInfo(resultInfo.data,false);

    const hashedPW = await makePasswordHashed(reqLoginInfo.adminPW, loginAccountInfo.accountPWSalt);

    serviceLogger.logDebug(`hashedPW:${hashedPW}, dbAccountPW:${loginAccountInfo.accountPW}`);

    // 해당 사용자가 비활성화되었다면 로그인 실패
    if (loginAccountInfo.activationFlag === false) {
      resultInfo.resultCode = ResultCode.AUTH_LOGIN_ACCOUNTDISINACTIVE;
      resultInfo.message = ReqValidationErrorMsg[ResultCode.AUTH_LOGIN_ACCOUNTDISINACTIVE];
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    // 입력된 암호가 DB에 저장된 것과 일치하는지 체크
    if (hashedPW !== loginAccountInfo.accountPW) {
      resultInfo.resultCode = ResultCode.AUTH_LOGIN_PWMISMATCHED;
      resultInfo.message = ReqValidationErrorMsg[ResultCode.AUTH_LOGIN_PWMISMATCHED];
      cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
      return;
    }

    // 관리자타입에 따라 적합한 JWT 발급
    const jwtManager: JWTManager = new JWTManager(reqLoginInfo.adminID === 'MASTER');
    const jwtPayload = cmnSvcProcessor.makeJWTPayload(loginAccountInfo.aclInfo, requestIP.getClientIp(req));
    const token = await jwtManager.issueJWT(jwtPayload);

    loginAccountInfo.accountPW = '';
    loginAccountInfo.accountPWSalt = '';
    resultInfo = getResultForm(ResultCode.SUCCESS, '', { adminID: reqLoginInfo.adminID, authToken: token, tokenExpireTime:jwtManager.getExpireTimeInSec(), accountInfo: loginAccountInfo });

    serviceLogger.logDebug(JSON.stringify(resultInfo));

    // 로그인 활동로그 DB에 저장
    await cmnSvcProcessor.writeDBActivityLog(sqlDataManager, reqLoginInfo.adminID, activityType.ADMINACTIVITY_TYPE_AUTH_LOGIN, '');

    cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);

  } catch(err) {
    console.log(err);

    const resultInfo = {
        resultCode: ResultCode.SYSTEM_INTERNALERROR,
        message: ReqValidationErrorMsg[ResultCode.SYSTEM_INTERNALERROR.toString()],
        data:err
    };

    cmnSvcProcessor.sendResponse(res,resultInfo,null);
  }

  serviceLogger.logDebug('##### [END] login()');
};
router.get('/login', login);

// 로그아웃
const logout = async (req: Request, res: Response): Promise<any> => {
  serviceLogger.logDebug('##### [START] logout()');

  // 요청 파라메터 유효성 체크 및 요청 객체로 변환
  let resultInfo = await aao.convertReqParamToAuthInfo(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    cmnSvcProcessor.sendResponse(res, resultInfo, null);
    return;
  }
  const authInfo: aao.ReqAuthInfo = resultInfo.data;

  const sqlDataManager:SQLDataManager = <SQLDataManager> await getSQLDataManager(DBSOURCE_ADMIN,authInfo.serverType);

  resultInfo = await cmnSvcProcessor.verifyAndIssueJwt(req, res, sqlDataManager, <string>authInfo.adminID, <string>authInfo.authToken);

  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    serviceLogger.logDebug(resultInfo.message);
    cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);
    return;
  }

  // 로그아웃 활동로그 DB에 저장
  await cmnSvcProcessor.writeDBActivityLog(sqlDataManager, authInfo.adminID, activityType.ADMINACTIVITY_TYPE_AUTH_LOGOUT, '');

  cmnSvcProcessor.sendResponse(res, resultInfo, sqlDataManager);

  serviceLogger.logDebug('##### [END] logout()');
};
router.get('/logout', logout);

export default router;
