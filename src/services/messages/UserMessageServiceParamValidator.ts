import * as svcProcessor from "src/services/common/CommonServiceProcessor";
import { Request, Response, NextFunction } from "express";
import {
  ResultInfo,
  ResultCode,
  getResultForm,
  ReqValidationErrorMsg,
} from "src/common/ResponseManager";
import SQLDataManager from "src/common/db/SQLDataManager";
import * as aclManager from "src/services/common/AdminACLManager";
import * as mdo from "./UserMessageDataObject";
import * as Utils from "src/common/Utils";
const { body, header, query, check } = require("express-validator");

// 메세지 조회 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfMessageList = async (
  req: Request
): Promise<ResultInfo> => {
  const [adminID, authToken, serverType, msgType, queryFilterInfo, pageNo] =
    svcProcessor.getReqDataSet(req, [
      "adminID",
      "authToken",
      "serverType",
      "msgType",
      "queryFilterInfo",
      "pageNo",
    ]);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (
    serverType === null ||
    serverType === undefined ||
    msgType === null ||
    msgType === undefined ||
    pageNo === null ||
    pageNo === undefined
  ) {
    return getResultForm(ResultCode.INVALID_REQPARAM, "", null);
  }

  // 메세지 타입 유효성 체크
  let resultInfo = await svcProcessor.checkReqValidationOfEnum(
    req,
    parseInt(msgType),
    mdo.USERMESSAGE_TYPE_INBOX,
    mdo.USERMESSAGE_TYPE_PUSHALARM,
    ResultCode.MESSAGE_REQPARAM_INVALID_MSGTYPE,
    "msgType"
  );
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  // 페이지번호 유효성 체크
  resultInfo = await svcProcessor.checkReqValidationOfPageNo(
    req,
    pageNo,
    ResultCode.INVALID_PAGENO,
    "pageNo"
  );
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  // 필터정보 포맷의 유효성 체크
  let queryFilterInfo2 = null;
  try {
    queryFilterInfo2 = JSON.parse(queryFilterInfo);
    if (
      queryFilterInfo2.targetUserID === undefined ||
      queryFilterInfo2.filterStartTime === undefined ||
      queryFilterInfo2.filterEndTime === undefined
    ) {
      resultInfo.resultCode =
        ResultCode.MESSAGE_REQPARAM_INVALID_QUERYFILTERINFO;
      resultInfo.message =
        ReqValidationErrorMsg.VALERRORMSG_INVALID_QUERYFILTER;
      return resultInfo;
    }
  } catch (err) {
    resultInfo.resultCode = ResultCode.MESSAGE_REQPARAM_INVALID_QUERYFILTERINFO;
    resultInfo.message = ReqValidationErrorMsg.VALERRORMSG_INVALID_QUERYFILTER;
    return resultInfo;
  }

  resultInfo.data = {
    adminID,
    authToken,
    serverType,
    msgType,
    queryFilterInfo: queryFilterInfo2,
    pageNo,
  };

  return resultInfo;
};

// 메세지 전송 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfSendMessage = async (
  req: Request
): Promise<ResultInfo> => {
  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(
    req,
    ["adminID", "authToken", "serverType"]
  );

  const bodyData = svcProcessor.getReqBodyData(req);
  console.log(
    `adminID=${adminID}, authToken=${authToken}, serverType=${serverType}`
  );
  console.log("bodyData=", bodyData);

  const {
    msgType,
    targetType,
    targetUserID,
    targetUserIDTable,
    presetTitle,
    langPresetID,
    rewardPresetID,
    titleTable,
    contentTable,
    reservationFlag,
    startTime,
    endTime,
    liveFlag,
    rewardData,
  } = bodyData;

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (
    adminID === undefined ||
    authToken === undefined ||
    serverType === undefined ||
    msgType === undefined ||
    targetType === undefined ||
    reservationFlag === undefined ||
    liveFlag === undefined
  ) {
    return getResultForm(
      ResultCode.INVALID_REQPARAM,
      `${"요청 파라메터 오류:"}${JSON.stringify({
        adminID,
        serverType,
        msgType,
        targetType,
        presetTitle,
        langPresetID,
        rewardPresetID,
        reservationFlag,
        startTime,
        liveFlag,
      })}`,
      null
    );
  }

  // 메세지 타입 유효성 체크
  let resultInfo = await svcProcessor.checkReqValidationOfEnum(
    req,
    msgType,
    mdo.USERMESSAGE_TYPE_INBOX,
    mdo.USERMESSAGE_TYPE_PUSHALARM,
    ResultCode.MESSAGE_REQPARAM_INVALID_MSGTYPE,
    "msgType"
  );
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return getResultForm(ResultCode.INVALID_REQPARAM, "invalid param:6", null);
  }

  // 타겟 타입의 유효성 체크: 타겟타입은 푸쉬메세지 전송시에만 설정됨.
  if (msgType === mdo.USERMESSAGE_TYPE_PUSHALARM) {
    if (
      targetType !== "all" &&
      targetType !== "android" &&
      targetType !== "ios" &&
      targetType !== "user"
    ) {
      return getResultForm(
        ResultCode.INVALID_REQPARAM,
        "invalid param:7",
        null
      );
    }
  }

  // 예약메세지 전송시각에 대한 유효성 체크
  resultInfo = await svcProcessor.checkReqValidationOfDateTime(
    req,
    startTime,
    ResultCode.MESSAGE_REQPARAM_INVALID_STARTTIME,
    "startTime"
  );
  if (resultInfo.resultCode !== ResultCode.SUCCESS && startTime !== "") {
    return resultInfo;
  }
  resultInfo.resultCode = ResultCode.SUCCESS;

  resultInfo.data = {
    adminID,
    authToken,
    serverType,
    msgType,
    targetType,
    targetUserID,
    targetUserIDTable,
    presetTitle,
    langPresetID,
    rewardPresetID,
    titleTable,
    contentTable,
    reservationFlag,
    startTime,
    endTime,
    liveFlag,
    rewardData,
  };

  return resultInfo;
};

// 예약메세지 수정 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfUpdateMessage = async (
  req: Request
): Promise<ResultInfo> => {
  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(
    req,
    ["adminID", "authToken", "serverType"]
  );

  const {
    msgID,
    targetUserID,
    targetUserIDTable,
    titleTable,
    contentTable,
    reservationFlag,
    startTime,
    liveFlag,
    rewardData,
  } = svcProcessor.getReqBodyData(req);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (
    adminID === undefined ||
    authToken === undefined ||
    serverType === undefined ||
    msgID === undefined ||
    titleTable === undefined ||
    contentTable === undefined ||
    reservationFlag === undefined ||
    liveFlag === undefined
  ) {
    return getResultForm(
      ResultCode.INVALID_REQPARAM,
      `${"요청 파라메터 오류:"}${JSON.stringify({
        adminID,
        serverType,
        msgID,
        titleTable,
        contentTable,
        reservationFlag,
        startTime,
        liveFlag,
        rewardData,
      })}`,
      null
    );
  }

  try {
    let found = false;
    for (let title of titleTable) {
      if (
        title.langCode === undefined ||
        title.langValue === undefined ||
        title.content === undefined
      ) {
        break;
      } else if (title.content.trim() !== "") {
        found = true;
      }
    }
    if (found === false) {
      return getResultForm(
        ResultCode.INVALID_REQPARAM,
        "invalid param:3",
        null
      );
    }

    found = false;
    for (let content of contentTable) {
      if (
        content.langCode === undefined ||
        content.langValue === undefined ||
        content.content === undefined
      ) {
        break;
      } else if (content.content.trim() !== "") {
        found = true;
      }
    }
    if (found === false) {
      return getResultForm(
        ResultCode.INVALID_REQPARAM,
        "invalid param:4",
        null
      );
    }
  } catch (err) {
    return getResultForm(ResultCode.INVALID_REQPARAM, "invalid param:5", null);
  }

  // 예약메세지 전송시각에 대한 유효성 체크
  let resultInfo = await svcProcessor.checkReqValidationOfDateTime(
    req,
    startTime,
    ResultCode.MESSAGE_REQPARAM_INVALID_STARTTIME,
    "startTime"
  );
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  // 메세지 활성화/비활성화 여부 플래그값 유효성 체크
  // resultInfo = await svcProcessor.checkReqValidationOfBool(req, activationFlag, ResultCode.MESSAGE_REQPARAM_INVALID_ACTIVATIONFLAG, 'activationFlag');
  // if (resultInfo.resultCode !== ResultCode.SUCCESS) {
  //   return resultInfo;
  // }

  resultInfo.data = {
    adminID,
    authToken,
    msgID,
    targetUserID,
    targetUserIDTable,
    titleTable,
    contentTable,
    reservationFlag,
    startTime,
    liveFlag,
    rewardData,
  };

  return resultInfo;
};

// 메세지 삭제 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfDeleteMessage = async (
  req: Request
): Promise<ResultInfo> => {
  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(
    req,
    ["adminID", "authToken", "serverType"]
  );

  const { msgType, msgIDList } = svcProcessor.getReqBodyData(req);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (
    adminID === undefined ||
    authToken === undefined ||
    serverType === undefined ||
    msgType === undefined ||
    msgIDList === undefined
  ) {
    return getResultForm(ResultCode.INVALID_REQPARAM, "", null);
  }

  // 메세지 타입 유효성 체크
  let resultInfo = await svcProcessor.checkReqValidationOfEnum(
    req,
    msgType,
    mdo.USERMESSAGE_TYPE_INBOX,
    mdo.USERMESSAGE_TYPE_PUSHALARM,
    ResultCode.MESSAGE_REQPARAM_INVALID_MSGTYPE,
    "msgType"
  );
  if (resultInfo.resultCode !== ResultCode.SUCCESS) {
    return resultInfo;
  }

  // 삭제한 메세지ID 목록에 대한 유효성 체크
  resultInfo.data = { adminID, authToken, serverType, msgType, msgIDList };

  return resultInfo;
};

// 언어프리셋 목록 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfLanguagePresetList = async (
  req: Request
): Promise<ResultInfo> => {
  const [adminID, authToken, serverType, queryFilterInfo, presetType, pageNo] =
    svcProcessor.getReqDataSet(req, [
      "adminID",
      "authToken",
      "serverType",
      "queryFilterInfo",
      "presetType",
      "pageNo",
    ]);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (
    serverType === null ||
    serverType === undefined ||
    queryFilterInfo === null ||
    queryFilterInfo === undefined ||
    presetType === undefined ||
    presetType == null ||
    pageNo === null ||
    pageNo === undefined
  ) {
    return getResultForm(ResultCode.INVALID_REQPARAM, "", null);
  }

  const resultInfo = getResultForm(0, "", {
    adminID,
    authToken,
    serverType,
    queryFilterInfo,
    presetType,
    pageNo,
  });

  return resultInfo;
};

export const getValidatedReqParamOfLanguagePreset = async (
  req: Request
): Promise<ResultInfo> => {
  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(
    req,
    ["adminID", "authToken", "serverType"]
  );

  const bodyData = svcProcessor.getReqBodyData(req);
  console.log("bodyData=", bodyData);

  const { presetType, presetID } = bodyData;

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (
    adminID === undefined ||
    authToken === undefined ||
    serverType === undefined ||
    presetType === undefined ||
    presetID === undefined
  ) {
    return getResultForm(ResultCode.INVALID_REQPARAM, "1", null);
  }

  // 삭제한 메세지ID 목록에 대한 유효성 체크
  const resultInfo = getResultForm(0, "", {
    adminID,
    authToken,
    serverType,
    presetType,
    presetID,
  });

  return resultInfo;
};

// 언어프리셋 추가 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfAddLanguagePreset = async (
  req: Request
): Promise<ResultInfo> => {
  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(
    req,
    ["adminID", "authToken", "serverType"]
  );

  const { presetID, bodyInfo } = svcProcessor.getReqBodyData(req);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (
    adminID === undefined ||
    authToken === undefined ||
    serverType === undefined ||
    presetID === undefined ||
    bodyInfo === undefined
  ) {
    return getResultForm(ResultCode.INVALID_REQPARAM, "1", null);
  }

  // 삭제한 메세지ID 목록에 대한 유효성 체크
  const resultInfo = getResultForm(0, "", {
    adminID,
    authToken,
    serverType,
    presetID,
    bodyInfo,
  });

  return resultInfo;
};

// 언어프리셋 수정 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfUpdateLanguagePreset = async (
  req: Request
): Promise<ResultInfo> => {
  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(
    req,
    ["adminID", "authToken", "serverType"]
  );

  const { presetID, bodyInfo } = svcProcessor.getReqBodyData(req);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (
    adminID === undefined ||
    authToken === undefined ||
    serverType === undefined ||
    presetID === undefined ||
    bodyInfo === undefined
  ) {
    return getResultForm(ResultCode.INVALID_REQPARAM, "1", null);
  }

  // 삭제한 메세지ID 목록에 대한 유효성 체크
  const resultInfo = getResultForm(0, "", {
    adminID,
    authToken,
    serverType,
    presetID,
    bodyInfo,
  });

  return resultInfo;
};

// 언어프리셋 삭제 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfDeleteLanguagePreset = async (
  req: Request
): Promise<ResultInfo> => {
  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(
    req,
    ["adminID", "authToken", "serverType"]
  );

  const { presetIDList } = svcProcessor.getReqBodyData(req);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (
    adminID === undefined ||
    authToken === undefined ||
    serverType === undefined ||
    presetIDList === undefined
  ) {
    return getResultForm(ResultCode.INVALID_REQPARAM, "1", null);
  }

  // 삭제한 메세지ID 목록에 대한 유효성 체크
  const resultInfo = getResultForm(0, "", {
    adminID,
    authToken,
    serverType,
    presetIDList,
  });

  return resultInfo;
};

// 보상프리셋 목록 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfRewardPresetList = async (
  req: Request
): Promise<ResultInfo> => {
  const [adminID, authToken, serverType, queryFilterInfo, pageNo] =
    svcProcessor.getReqDataSet(req, [
      "adminID",
      "authToken",
      "serverType",
      "queryFilterInfo",
      "pageNo",
    ]);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (
    serverType === null ||
    serverType === undefined ||
    queryFilterInfo === null ||
    queryFilterInfo === undefined ||
    pageNo === null ||
    pageNo === undefined
  ) {
    return getResultForm(ResultCode.INVALID_REQPARAM, "", null);
  }

  const resultInfo = getResultForm(0, "", {
    adminID,
    authToken,
    serverType,
    queryFilterInfo,
    pageNo,
  });

  return resultInfo;
};

export const getValidatedReqParamOfRewardPreset = async (
  req: Request
): Promise<ResultInfo> => {
  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(
    req,
    ["adminID", "authToken", "serverType"]
  );

  const bodyData = svcProcessor.getReqBodyData(req);
  console.log("bodyData=", bodyData);

  const { presetID } = bodyData;

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (
    adminID === undefined ||
    authToken === undefined ||
    serverType === undefined ||
    presetID === undefined
  ) {
    return getResultForm(ResultCode.INVALID_REQPARAM, "1", null);
  }

  // 삭제한 메세지ID 목록에 대한 유효성 체크
  const resultInfo = getResultForm(0, "", {
    adminID,
    authToken,
    serverType,
    presetID,
  });

  return resultInfo;
};

// 보상프리셋 추가 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfAddRewardPreset = async (
  req: Request
): Promise<ResultInfo> => {
  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(
    req,
    ["adminID", "authToken", "serverType"]
  );

  const bodyData = svcProcessor.getReqBodyData(req);
  console.log("bodyData=", bodyData);

  const { presetID, rewardData } = bodyData;

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (
    adminID === undefined ||
    authToken === undefined ||
    serverType === undefined ||
    presetID === undefined ||
    rewardData === undefined
  ) {
    return getResultForm(ResultCode.INVALID_REQPARAM, "1", null);
  }

  // 삭제한 메세지ID 목록에 대한 유효성 체크
  const resultInfo = getResultForm(0, "", {
    adminID,
    authToken,
    serverType,
    presetID,
    rewardData,
  });

  return resultInfo;
};

// 보상프리셋 수정 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfUpdateRewardPreset = async (
  req: Request
): Promise<ResultInfo> => {
  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(
    req,
    ["adminID", "authToken", "serverType"]
  );

  const bodyData = svcProcessor.getReqBodyData(req);
  console.log("bodyData=", bodyData);

  const { presetID, rewardData } = bodyData;

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (
    adminID === undefined ||
    authToken === undefined ||
    serverType === undefined ||
    presetID === undefined ||
    rewardData === undefined
  ) {
    return getResultForm(ResultCode.INVALID_REQPARAM, "1", null);
  }

  // 삭제한 메세지ID 목록에 대한 유효성 체크
  const resultInfo = getResultForm(0, "", {
    adminID,
    authToken,
    serverType,
    presetID,
    rewardData,
  });

  return resultInfo;
};

// 보상프리셋 삭제 요청 파라메터에 대해 유효성 체크
export const getValidatedReqParamOfDeleteRewardPreset = async (
  req: Request
): Promise<ResultInfo> => {
  const [adminID, authToken, serverType] = svcProcessor.getReqHeaderDataSet(
    req,
    ["adminID", "authToken", "serverType"]
  );

  const { presetIDList } = svcProcessor.getReqBodyData(req);
  console.log("presetIDList=", presetIDList);

  // 요청 파라메터에 기대하는 값이 없을 경우
  if (
    adminID === undefined ||
    authToken === undefined ||
    serverType === undefined ||
    presetIDList === undefined
  ) {
    return getResultForm(ResultCode.INVALID_REQPARAM, "1", null);
  }

  // 삭제한 메세지ID 목록에 대한 유효성 체크
  const resultInfo = getResultForm(0, "", {
    adminID,
    authToken,
    serverType,
    presetIDList,
  });

  return resultInfo;
};
