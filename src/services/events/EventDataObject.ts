import { Request, Response } from 'express';
import ReqBaseInfo, { GameItemInfo } from 'src/services/common/BaseDataObject';
import { ResultInfo, ResultCode, getResultForm } from 'src/common/ResponseManager';
import * as svcManager from 'src/services/common/CommonServiceProcessor';
import * as validator from './EventServiceParamValidator';

import * as svcProcessor from 'src/services/common/CommonServiceProcessor';

// 이벤트 타입
export const EVENT_TYPE_LOGINREWARD = 1; // 접속보상 이벤트

// 이벤트 진행타입
export const EVENTPROG_TYPE_INACTIVE = 1;
export const EVENTPROG_TYPE_READY = 2;
export const EVENTPROG_TYPE_ONAIR = 3;
export const EVENTPROG_TYPE_ENDED = 4;

// json 문자열을 GameItemInfo 리스트로 변환
export const getItemListFromJsonString = (jsonItemListStr: string): GameItemInfo[] => {
  const itemList: GameItemInfo[] = [];
  const json = JSON.parse(jsonItemListStr);
  for (let kv of json) {
    itemList.push({ itemID: kv.id, itemValue: kv.value });
  }

  return itemList;
};

// GameItemInfo 리스트를 json 문자열로 변환
export const getJsonStringFromItemList = (itemList: GameItemInfo[]): string => {
  const json = [];
  for (let item of itemList) {
    json.push({ id: item.itemID, value: item.itemValue });
  }

  return JSON.stringify(json);
};

// 이벤트 정보
export interface EventInfo {
  eventID: number;
  eventType: number;
  presetTitle: string;
  langPresetID: number;
  rewardPresetID: number;
  titleTable: any;
  contentTable: any;
  rewardData: string;
  startTime: string;
  endTime: string;
  loginStartTime: string;
  loginEndTime: string;
  activationFlag: boolean;
  creationTime: string;
}

// 쿠폰 정보
export interface CouponInfo {
  couponID: number;
  couponType: number;
  couponDigit: number;
  sharedCouponCode: string;
  couponQty: number;
  titleTable: any;
  contentTable: any;
  rewardData: string;
  startTime: string;
  endTime: string;
  activationFlag: boolean;
  creationTime: string;
  couponData: string;
}

// 접속보상 이벤트 목록 요청정보
export interface ReqEventListInfo extends ReqBaseInfo {
  eventType: number;
  queryFilterInfo: any;
  pageNo: number;
}

// 접속보상 이벤트항목 등록 요청정보
export interface ReqRegisterEventInfo extends EventInfo, ReqBaseInfo {
  serverType: string;
}

// 접속보상 이벤트항목 수정 요청정보
export interface ReqUpdateEventInfo extends EventInfo, ReqBaseInfo {
  serverType: string;
}

// 접속보상 이벤트항목 삭제 요청정보
export interface ReqDeleteEventsInfo extends ReqBaseInfo {
  serverType: string;
  eventIDList: number[];
}

// 접속보상 이벤트항목 활성화/비활성화 요청정보
export interface ReqEventActivationInfo extends ReqBaseInfo {
  eventID: number;
  activationFlag: boolean;
}

// 쿠폰 발급목록 조회 요청정보
export interface ReqCouponListInfo extends ReqBaseInfo {
  pageNo: number;
}

// 새 쿠폰 발급하기 요청정보
export interface ReqRegisterNewCouponInfo extends ReqBaseInfo {
  newPresetFlag: boolean;
  presetID: number;
  titleTable: any;
  contentTable: any;
  couponType: number;
  couponDigit: number;
  sharedCouponCode: string;
  couponQty: number;
  activationFlag: boolean;
  startTime: string;
  endTime: string;
  rewardData: string;
}

export const convertReqParamToBasicInfo = async (req: Request): Promise<ResultInfo> => {

  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(req, [
    'adminID',
    'authToken',
    'serverType'
  ]);

  const info: ReqBaseInfo = {
    adminID,
    authToken,
    serverType
  };

  return getResultForm(ResultCode.SUCCESS, '', info);
};

// 요청 파라메터에 설정된 값을 ReqLoginRewardEventListInfo 타입 객체로 변환
export const convertReqParamToLoginRewardEventListInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfEventList(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqEventListInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    eventType: parseInt(resultInfo.data['eventType']),
    queryFilterInfo: resultInfo.data['queryFilterInfo'],
    pageNo: parseInt(resultInfo.data['pageNo']),
  };
  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqUpdateLoginRewardEventInfo 타입 객체로 변환
export const convertReqParamToRegisterLoginRewardEventInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfRegisterEvent(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqRegisterEventInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    eventID: -1,
    eventType: resultInfo.data['eventType'],
    presetTitle: resultInfo.data['presetTitle'],
    langPresetID: resultInfo.data['langPresetID'],
    rewardPresetID: resultInfo.data['rewardPresetID'],
    titleTable: resultInfo.data['titleTable'],
    contentTable: resultInfo.data['contentTable'],
    rewardData: resultInfo.data['rewardData'],
    startTime: resultInfo.data['startTime'],
    endTime: resultInfo.data['endTime'],
    loginStartTime: resultInfo.data['loginStartTime'],
    loginEndTime: resultInfo.data['loginEndTime'],
    activationFlag: resultInfo.data['activationFlag'],
    creationTime: '',
  };
  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqUpdateLoginRewardEventInfo 타입 객체로 변환
export const convertReqParamToUpdateLoginRewardEventInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfUpdateEvent(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqUpdateEventInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    eventID: resultInfo.data['eventID'],
    eventType: -1,
    presetTitle: resultInfo.data['presetTitle'],
    langPresetID: resultInfo.data['langPresetID'],
    rewardPresetID: resultInfo.data['rewardPresetID'],
    titleTable: resultInfo.data['titleTable'],
    contentTable: resultInfo.data['contentTable'],
    rewardData: resultInfo.data['rewardData'],
    startTime: resultInfo.data['startTime'],
    endTime: resultInfo.data['endTime'],
    loginStartTime: resultInfo.data['loginStartTime'],
    loginEndTime: resultInfo.data['loginEndTime'],
    activationFlag: resultInfo.data['activationFlag'],
    creationTime: '',
  };
  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqDeleteEventsInfo 타입 객체로 변환
export const convertReqParamToDeleteEventsInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfDeleteEvent(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqDeleteEventsInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    eventIDList: resultInfo.data['eventIDList'],
  };

  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqLoginRewardEventActivationInfo 타입 객체로 변환
export const convertReqParamToLoginRewardEventActivationInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfEventActivation(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqEventActivationInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    eventID: parseInt(resultInfo.data['targetAdminID']),
    activationFlag: resultInfo.data['activationFlag'].toUpperCase() === 'TRUE' ? true : false,
  };
  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqCouponListInfo 타입 객체로 변환
export const convertReqParamToCouponListInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfCouponList(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqCouponListInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    pageNo: parseInt(resultInfo.data['pageNo']),
  };
  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqRegisterNewCouponInfo 타입 객체로 변환
export const convertReqParamToRegisterNewCouponInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfRegisterNewCoupon(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqRegisterNewCouponInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],

    newPresetFlag: resultInfo.data['newPresetFlag'],
    presetID: resultInfo.data['presetID'],
    titleTable: resultInfo.data['titleTable'],
    contentTable: resultInfo.data['contentTable'],
    couponType: resultInfo.data['couponType'],
    couponDigit: resultInfo.data['couponDigit'],
    sharedCouponCode: resultInfo.data['sharedCouponCode'],
    couponQty: resultInfo.data['couponQty'],
    activationFlag: resultInfo.data['activationFlag'],
    startTime: resultInfo.data['startTime'],
    endTime: resultInfo.data['endTime'],
    rewardData: resultInfo.data['rewardData'],
  };
  resultInfo.data = info;
  return resultInfo;
};