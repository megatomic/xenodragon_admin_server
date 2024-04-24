import dotenv from 'dotenv';
import path from 'path';
require('module-alias/register');
import express, { Express, Request, Response, NextFunction } from 'express';
import routeTable from '../settings/routes';
import * as svcProcessor from 'src/services/common/CommonServiceProcessor';
import { ResultInfo, ResultCode, getResultForm, ReqValidationErrorMsg } from 'src/common/ResponseManager';
const { check } = require('express-validator');
import JWTManager, { VerifyResultInfo } from 'src/services/common/JWTManager';
import scheduler from 'src/services/common/Scheduler';
import * as serviceLogger from 'src/services/common/ServiceLogger';
import * as CryptoManager from './common/CryptoManager';

// .env파일 경로 지정하여 읽어오기
(() => {
  const result = dotenv.config({ path: path.join(__dirname, '..', '.env') }); // .env 파일의 경로를 dotenv.config에 넘겨주고 성공여부를 저장함
  if (result.parsed == undefined)
    // .env 파일 parsing 성공 여부 확인
    throw new Error('Cannot loaded environment variables file.'); // parsing 실패 시 Throwing
})();

const fs = require('fs');
const cors = require('cors');

const app: Express = express();

app.use(cors({ credentials: true, origin: '*' }));

app.use(express.json({limit: '100mb'}));
app.use(express.urlencoded({ extended: true }));


// 라우터 호출전 파라메터 일반 유효성 체크
const processCommonValidation: any = async (req: Request, res: Response, next: NextFunction) => {
  let resultInfo = getResultForm(ResultCode.SUCCESS, '', null);
  const adminID = svcProcessor.getReqHeaderData(req, 'adminID');

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (adminID === null || adminID === undefined) {
    resultInfo.resultCode = ResultCode.INVALID_REQPARAM;
    resultInfo.message = `adminID:${adminID}`;
    svcProcessor.sendResponse(res, resultInfo, null);
    return;
  }

  // 로그인 요청인지 아닌지
  if (req.originalUrl.indexOf('/auth/login') >= 0) {
    const adminPW = svcProcessor.getReqHeaderData(req, 'adminPW');

    // 요청 파라메터에 기대하는 값이 없을 경우
    if (adminPW === null || adminPW === undefined) {
      resultInfo.resultCode = ResultCode.INVALID_REQPARAM;
      resultInfo.message = `adminPW:${adminPW}`;
      svcProcessor.sendResponse(res, resultInfo, null);
      return;
    }

    // 관리자 아이디 유효성 체크
    let validator = check('adminID', ReqValidationErrorMsg.VALERRORMSG_INVALID_ID).trim().notEmpty().isLength({ min: 4, max: 20 });
    let result = await validator.run(req);
    let errorList = result.errors;

    if (errorList.length > 0) {
      resultInfo.resultCode = ResultCode.AUTH_LOGIN_INVALID_IDFORMAT;
      resultInfo.message = `adminID:${errorList[0].msg}`;
      svcProcessor.sendResponse(res, resultInfo, null);
      return;
    }

    // 관리자 암호 유효성 체크
    validator = check('adminPW', ReqValidationErrorMsg.VALERRORMSG_INVALID_PW)
      .trim()
      .notEmpty()
      .isLength({ min: 6 })
      .custom((adminPW: string) => {
        const check1 = svcProcessor.checkCharSetIfAlphabetic(adminPW);
        const check2 = svcProcessor.checkCharSetIfNumbericAndSpecialChars(adminPW);
        if (check1 && check2) {
          return true;
        } else {
          return false;
        }
      });
    result = await validator.run(req);
    errorList = result.errors;

    if (errorList.length > 0) {
      resultInfo.resultCode = ResultCode.AUTH_LOGIN_INVALID_PWFORMAT;
      resultInfo.message = `adminPW:${errorList[0].msg}`;
      svcProcessor.sendResponse(res, resultInfo, null);
      return;
    }
  } else {
    const authToken = svcProcessor.getReqHeaderData(req, 'authToken');

    // 요청 파라메터에 기대하는 값이 없을 경우
    if (authToken === null || authToken === undefined) {
      resultInfo.resultCode = ResultCode.INVALID_REQPARAM;
      resultInfo.message = `authToken:${authToken}`;
      svcProcessor.sendResponse(res, resultInfo, null);
      return;
    }

    // 인증토큰 유효성 체크
    const jwtManager: JWTManager = new JWTManager(adminID === 'MASTER');
    const verifyResult: VerifyResultInfo = <VerifyResultInfo>await jwtManager.verifyJWT(authToken);

    // 토큰이 올바로 디코딩되지 않았거나, 클라이언트IP가 변경되었다면 무효!!
    if (verifyResult.resultCode !== ResultCode.SUCCESS || svcProcessor.verifyJWTPayload(verifyResult.decodedToken, req) === false) {
      if (verifyResult.resultCode === ResultCode.TOKEN_EXPIRED) {
        resultInfo.resultCode = ResultCode.AUTH_AUTHTOKEN_EXPIRED;
        resultInfo.message = ReqValidationErrorMsg[ResultCode.AUTH_AUTHTOKEN_EXPIRED.toString()];
      } else {
        resultInfo.resultCode = ResultCode.AUTH_INVALID_AUTHTOKEN;
        resultInfo.message = ReqValidationErrorMsg[ResultCode.AUTH_INVALID_AUTHTOKEN.toString()];
      }
      
      svcProcessor.sendResponse(res, resultInfo, null);
      return;
    }
  }

  next();
};

// 각 요청 서비스를 처리할 라우터 로딩하기
routeTable.map(async (routeItem) => {
  const router = await import(`./services/${routeItem.name}`);
  app.use(`${routeItem.path}`, await processCommonValidation, router.default);
});

app.get('/api/test', async (req: Request, res: Response) => {
  res.status(200).send('hello!');
});

// 서버 시작
app.listen(process.env.PORT, () => {
  serviceLogger.logInfo(null, null, `server started on ${process.env.PORT} port.`);
});
