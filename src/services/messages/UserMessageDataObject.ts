import { Request, Response } from 'express';
import { ResultInfo, ResultCode, getResultForm } from 'src/common/ResponseManager';
import ReqBaseInfo from 'src/services/common/BaseDataObject';
import * as svcManager from 'src/services/common/CommonServiceProcessor';
import * as validator from './UserMessageServiceParamValidator';

// 메세지 타입
export const USERMESSAGE_TYPE_INBOX = 1; // 우편함 메세지
export const USERMESSAGE_TYPE_PUSHALARM = 2; // 푸쉬 메세지

// 메세지 정보
export interface MessageInfo {
  msgID: number;
  msgType: number; // 메세지 타입
  targetType: number; // 전송 대상 타입:'all', 'android', 'ios', 'user'
  targetUserID: string; // 특정 유저ID
  targetUserIDTable: string[];
  presetTitle: string;
  langPresetID: number;
  rewardPresetID: number;
  titleTable: any;
  contentTable: any;
  reservationFlag: boolean; // 예약메세지 여부
  startTime: string; // 유효기간 시작일
  endTime: string; // 유효기간 종료일
  liveFlag: boolean; // 메세지 전송의 테스트모드 여부
  creationTime: string; // 메세지 생성 시각
  rewardData: any;
}

// 메세지 조회 요청정보
export interface ReqMessageListInfo extends ReqBaseInfo {
  msgType: number;
  queryFilterInfo: any;
  pageNo: number;
}

// 메시지 전송/예약 요청정보
export interface ReqSendMessageInfo extends MessageInfo, ReqBaseInfo {}

// 메시지 수정 요청정보
export interface ReqUpdateMessageInfo extends MessageInfo, ReqBaseInfo {}

// 메세지(들) 삭제 요청정보
export interface ReqDeleteMessagesInfo extends ReqBaseInfo {
  msgType: number;
  msgIDList: number[];
}

// 언어프리셋 목록 요청정보
export interface ReqLanguagePresetListInfo extends ReqBaseInfo {
  queryFilterInfo: any;
  presetType: number;
  pageNo: number;
}

export interface ReqLanguagePresetInfo extends ReqBaseInfo {
  presetType: number;
  presetID: number;
}

// 언어프리셋 추가 요청정보
export interface ReqAddLanguagePresetInfo extends ReqBaseInfo {
  presetID: number;
  bodyInfo: any;
}

// 언어프리셋 수정 요청정보
export interface ReqUpdateLanguagePresetInfo extends ReqBaseInfo {
  presetID: number;
  bodyInfo: any;
}

// 언어프리셋 삭제 요청정보
export interface ReqDeleteLanguagePresetInfo extends ReqBaseInfo {
  presetIDList: number[]
}

// 보상프리셋 목록 요청정보
export interface ReqRewardPresetListInfo extends ReqBaseInfo {
  queryFilterInfo: any;
  pageNo: number;
}

export interface ReqRewardPresetInfo extends ReqBaseInfo {
  presetID: number;
}

// 보상프리셋 추가 요청정보
export interface ReqAddRewardPresetInfo extends ReqBaseInfo {
  presetID: number;
  rewardData: any;
}

// 보상프리셋 수정 요청정보
export interface ReqUpdateRewardPresetInfo extends ReqBaseInfo {
  presetID: number;
  rewardData: any;
}

// 보상프리셋 삭제 요청정보
export interface ReqDeleteRewardPresetInfo extends ReqBaseInfo {
  presetIDList: number[]
}

// 요청 파라메터에 설정된 값을 ReqLobbyNotiListInfo 타입 객체로 변환
export const convertReqParamToMessageListInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfMessageList(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const msgTypeStr = resultInfo.data['msgType'];
  let msgType = -1;
  if (msgTypeStr !== null || msgTypeStr !== undefined) {
    msgType = parseInt(msgTypeStr);
  }

  const info: ReqMessageListInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    msgType: msgType,
    queryFilterInfo: resultInfo.data['queryFilterInfo'],
    pageNo: parseInt(resultInfo.data['pageNo']),
  };
  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqSendMessageInfo 타입 객체로 변환
export const convertReqParamToSendMessageInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfSendMessage(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqSendMessageInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    msgID: -1,
    msgType: resultInfo.data['msgType'],
    targetType: resultInfo.data['targetType'],
    targetUserID: resultInfo.data['targetUserID'],
    targetUserIDTable: resultInfo.data['targetUserIDTable'],
    presetTitle: resultInfo.data['presetTitle'],
    langPresetID: resultInfo.data['langPresetID'],
    titleTable: resultInfo.data['titleTable'],
    contentTable: resultInfo.data['contentTable'],
    rewardPresetID: resultInfo.data['rewardPresetID'],
    reservationFlag: (resultInfo.data['reservationFlag'].toUpperCase() === 'TRUE'?true:false),
    liveFlag: resultInfo.data['liveFlag'],
    startTime: resultInfo.data['startTime'],
    endTime: resultInfo.data['endTime'],
    creationTime: '',
    rewardData: resultInfo.data['rewardData']
  };
  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqUpdateScheduleMessageInfo 타입 객체로 변환
export const convertReqParamToUpdateMessageInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfUpdateMessage(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqSendMessageInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    msgID: resultInfo.data['msgID'],
    msgType: -1,
    targetType: resultInfo.data['targetType'],
    targetUserID: resultInfo.data['targetUserID'],
    targetUserIDTable: resultInfo.data['targetUserIDTable'],
    presetTitle: resultInfo.data['presetTitle'],
    langPresetID: resultInfo.data['langPresetID'],
    rewardPresetID: resultInfo.data['rewardPresetID'],
    titleTable: resultInfo.data['titleTable'],
    contentTable: resultInfo.data['contentTable'],
    reservationFlag: resultInfo.data['reservationFlag'],
    liveFlag: resultInfo.data['liveFlag'],
    startTime: resultInfo.data['startTime'],
    endTime: resultInfo.data['endTime'],
    creationTime: '',
    rewardData: resultInfo.data['rewardData']
  };
  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqDeleteMessagesInfo 타입 객체로 변환
export const convertReqParamToDeleteMessagesInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfDeleteMessage(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const msgIDs = JSON.parse(resultInfo.data['msgIDList']);

  const info: ReqDeleteMessagesInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    msgType: resultInfo.data['msgType'],
    msgIDList: msgIDs,
  };
  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqLanguagePresetListInfo 타입 객체로 변환
export const convertReqParamToLanguagePresetListInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfLanguagePresetList(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqLanguagePresetListInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    queryFilterInfo: resultInfo.data['queryFilterInfo'],
    presetType: parseInt(resultInfo.data['presetType']),
    pageNo: parseInt(resultInfo.data['pageNo'])
  };
  resultInfo.data = info;
  return resultInfo;
};

export const convertReqParamToLanguagePresetInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfLanguagePreset(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqLanguagePresetInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    presetType: resultInfo.data['presetType'],
    presetID: resultInfo.data['presetID']
  };
  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqAddLanguagePresetInfo 타입 객체로 변환
export const convertReqParamToAddLanguagePresetInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfAddLanguagePreset(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqAddLanguagePresetInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    presetID: resultInfo.data['presetID'],
    bodyInfo: resultInfo.data['bodyInfo']
  };
  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqUpdateLanguagePresetInfo 타입 객체로 변환
export const convertReqParamToUpdateLanguagePresetInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfUpdateLanguagePreset(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqUpdateLanguagePresetInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    presetID: resultInfo.data['presetID'],
    bodyInfo: resultInfo.data['bodyInfo']
  };
  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqDeleteLanguagePresetInfo 타입 객체로 변환
export const convertReqParamToDeleteLanguagePresetInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfDeleteLanguagePreset(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqDeleteLanguagePresetInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    presetIDList: resultInfo.data['presetIDList'],
  };
  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqRewardPresetListInfo 타입 객체로 변환
export const convertReqParamToRewardPresetListInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfRewardPresetList(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqRewardPresetListInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    queryFilterInfo: resultInfo.data['queryFilterInfo'],
    pageNo: parseInt(resultInfo.data['pageNo'])
  };
  resultInfo.data = info;
  return resultInfo;
};

export const convertReqParamToRewardPresetInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfRewardPreset(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqRewardPresetInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    presetID: resultInfo.data['presetID']
  };
  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqAddRewardPresetInfo 타입 객체로 변환
export const convertReqParamToAddRewardPresetInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfAddRewardPreset(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqAddRewardPresetInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    presetID: resultInfo.data['presetID'],
    rewardData: resultInfo.data['rewardData']
  };
  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqUpdateRewardPresetInfo 타입 객체로 변환
export const convertReqParamToUpdateRewardPresetInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfUpdateRewardPreset(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqUpdateRewardPresetInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    presetID: resultInfo.data['presetID'],
    rewardData: resultInfo.data['rewardData']
  };
  resultInfo.data = info;
  return resultInfo;
};

// 요청 파라메터에 설정된 값을 ReqDeleteRewardPresetInfo 타입 객체로 변환
export const convertReqParamToDeleteRewardPresetInfo = async (req: Request): Promise<ResultInfo> => {
  // 요청 파라메터의 유효성 체크
  const resultInfo: ResultInfo = await validator.getValidatedReqParamOfDeleteRewardPreset(req);
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  const info: ReqDeleteRewardPresetInfo = {
    adminID: resultInfo.data['adminID'],
    authToken: resultInfo.data['authToken'],
    serverType: resultInfo.data['serverType'],
    presetIDList: resultInfo.data['presetIDList'],
  };
  resultInfo.data = info;
  return resultInfo;
};