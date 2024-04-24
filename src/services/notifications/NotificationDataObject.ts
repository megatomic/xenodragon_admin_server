import { Request, Response } from 'express';
import ReqBaseInfo from 'src/services/common/BaseDataObject';
import { ResultInfo, ResultCode, getResultForm } from 'src/common/ResponseManager';
import * as svcManager from 'src/services/common/CommonServiceProcessor';
//import {encodeACLInfo, decodeACLInfo} from 'src/services/common/AdminACLManager';
import * as validator from './NotificationServiceParamValidator';

// 공지사항 타입
export const NOTIFICATION_TYPE_MAINTENANCE = 1; // 유지보수 공지사항
export const NOTIFICATION_TYPE_LOBBY = 2; // 로비 공지사항
export const NOTIFICATION_TYPE_WEBSITE = 3; // 웹사이트 공지사항
export const NOTIFICATION_TYPE_SCROLLALARM = 4; // 띠알림 공지사항

// 공지사항 내용 타입
export const NOTIFICATION_DATATYPE_TEXT = 0; // 텍스트
export const NOTIFICATION_DATATYPE_HTML = 1; // HTML 텍스트
export const NOTIFICATION_DATATYPE_URL = 2; // 웹사이트 주소

// 공지사항 정보
export interface NotificationInfo {
  notiID: number;
  creatorID: string;
  notiType: number;
  dataType: number; // 0:text, 1:html, 2:url
  titleTable: any;
  contentTable: any;
  notShowAgainFlag: boolean;
  startTime: string;
  endTime: string;
  activationFlag: boolean;
  creationTime: string;
}

// 공지사항 조회 요청정보
export interface ReqNotiListInfo extends ReqBaseInfo {
  queryFilterInfo: any;
  notiType: number;
  pageNo: number;
}

// 새 공지사항 등록 요청정보
export interface ReqNewNotiInfo extends ReqBaseInfo {
  notiType: number;
  dataType: number;
  titleTable: any;
  contentTable: any;
  notShowAgainFlag: boolean;
  startTime: string;
  endTime: string;
  activationFlag: boolean;
}

// 공지사항 수정 요청정보
export interface ReqUpdateNotiInfo extends ReqBaseInfo {
  notiID: number;
  notiType: number;
  dataType: number;
  titleTable: any;
  contentTable: any;
  notShowAgainFlag: boolean;
  startTime: string;
  endTime: string;
  activationFlag: boolean;
}

// 공지사항 삭제 요청정보
export interface ReqDeleteNotificationsInfo extends ReqBaseInfo {
  notiIDList: number[];
}

// 공지사항 활성화/비활성화 요청정보
export interface ReqNotificationActivationInfo extends ReqBaseInfo {
  notiID: number;
  activationFlag: boolean;
}

// 요청 파라메터에 설정된 값을 ReqLobbyNotiListInfo 타입 객체로 변환
export const convertReqParamToNotiListInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfNotificationList(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqNotiListInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    queryFilterInfo: resultInfo.data['queryFilterInfo'],
    notiType: parseInt(resultInfo.data['notiType']),
    pageNo: parseInt(resultInfo.data['pageNo']),
  };
  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqNewNotiInfo 타입 객체로 변환
export const convertReqParamToNewNotiInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfNewNotification(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  //console.log('resultInfo=',resultInfo.data);

  const info: ReqNewNotiInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    notiType: resultInfo.data['notiType'],
    dataType: resultInfo.data['dataType'],
    titleTable: resultInfo.data['titleTable'],
    contentTable: resultInfo.data['contentTable'],
    notShowAgainFlag: resultInfo.data['notShowAgainFlag'],
    startTime: resultInfo.data['startTime'],
    endTime: resultInfo.data['endTime'],
    activationFlag: resultInfo.data['activationFlag'],
  };
  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqUpdateNotiInfo 타입 객체로 변환
export const convertReqParamToUpdateNotiInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfUpdateNotification(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqUpdateNotiInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    notiID: resultInfo.data['notiID'],
    notiType: resultInfo.data['notiType'],
    dataType: resultInfo.data['dataType'],
    titleTable: resultInfo.data['titleTable'],
    contentTable: resultInfo.data['contentTable'],
    notShowAgainFlag: resultInfo.data['notShowAgainFlag'],
    startTime: resultInfo.data['startTime'],
    endTime: resultInfo.data['endTime'],
    activationFlag: resultInfo.data['activationFlag'],
  };
  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqUpdateNotiInfo 타입 객체로 변환
export const convertReqParamToDeleteNotificationsInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfDeleteNotification(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqDeleteNotificationsInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    notiIDList: resultInfo.data['notiIDList']
  };
  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqNotificationActivationInfo 타입 객체로 변환
export const convertReqParamToNotificationActivationInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfNotificationActivation(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const notiIDs = JSON.parse(resultInfo.data['notiIDList']);

  const info: ReqNotificationActivationInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    notiID: parseInt(resultInfo.data['notiID']),
    activationFlag: resultInfo.data['activationFlag'].toUpperCase() === 'TRUE' ? true : false,
  };
  resultInfo.data = info;
  return resultInfo;
};
