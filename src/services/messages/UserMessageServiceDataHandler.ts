import SQLDataManager from 'src/common/db/SQLDataManager';
import { ResultCode, ResultInfo } from 'src/common/ResponseManager';
import * as mdo from './UserMessageDataObject';
import * as Utils from 'src/common/Utils';
import * as cmnSvcProcessor from 'src/services/common/CommonServiceProcessor';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

// MessageInfo 객체를 message_info 테이블의 레코드(json)으로 변환
export const convertEventInfoToDBRecord = (msgInfo: mdo.MessageInfo): any => {
  const recordObj = {
    msg_id: msgInfo.msgID,
    msg_type: msgInfo.msgType,
    target_type: msgInfo.targetType,
    target_user_id: msgInfo.targetUserID,
    title: JSON.stringify(msgInfo.titleTable),
    content: JSON.stringify(msgInfo.contentTable),
    reservation_flag: msgInfo.reservationFlag === true ? 1 : 0,
    activation_flag: msgInfo.liveFlag === true ? 1 : 0,
    start_time: msgInfo.startTime,
    creation_time: msgInfo.creationTime,
    reward_data: JSON.stringify(msgInfo.rewardData)
  };

  return recordObj;
};

// message_info 테이블의 레코드(json)을 EventInfo 객체로 변환
export const convertDBRecordToMsgInfo = (record: any): mdo.MessageInfo => {

  const msgInfo: mdo.MessageInfo = {
    msgID: record.msg_id,
    msgType: record.msg_type,
    targetType: record.target_type,
    targetUserID: record.target_user_id,
    targetUserIDTable: [],
    presetTitle:'',
    langPresetID:0,
    rewardPresetID:0,
    titleTable: JSON.parse(cmnSvcProcessor.unescapeSpecialCharsForJSON(record.title)),
    contentTable: JSON.parse(cmnSvcProcessor.unescapeSpecialCharsForJSON(record.content)),
    rewardData: (record.msg_type === mdo.USERMESSAGE_TYPE_INBOX?JSON.parse(record.reward_data):record.reward_data),
    reservationFlag: record.reservation_flag === 1 ? true : false,
    liveFlag: record.activation_flag === 1 ? true : false,
    startTime: record.start_time,
    endTime: record.start_time,
    creationTime: record.creation_time
  };

  return msgInfo;
};

// 우편함/푸쉬 메세지 조회
export const queryDBMessageList = async (sqlDataManager: SQLDataManager, reqMessageListInfo: mdo.ReqMessageListInfo, queryNum: number): Promise<any> => {
  let pNo = reqMessageListInfo.pageNo;
  if (reqMessageListInfo.pageNo < 1) {
    pNo = 1;
  }

  console.log('----> reqMessageListInfo.queryFilterInfo=',reqMessageListInfo.queryFilterInfo);

  let whereField = ``;
  if (reqMessageListInfo.msgType === mdo.USERMESSAGE_TYPE_INBOX || reqMessageListInfo.msgType === mdo.USERMESSAGE_TYPE_PUSHALARM) {
    whereField = `where msg_type=${reqMessageListInfo.msgType}`;
  }

  let whereField1 = '';
  let whereField2 = '';
  if (reqMessageListInfo.queryFilterInfo.targetUserID !== null && reqMessageListInfo.queryFilterInfo.targetUserID.trim() !== '') {
    whereField1 = `and binary target_user_id like '%${reqMessageListInfo.queryFilterInfo.targetUserID.trim()}%'`;
  }

  if (reqMessageListInfo.queryFilterInfo.filterStartTime !== '' || reqMessageListInfo.queryFilterInfo.filterEndTime !== '') {
    let startDate = '1900-01-01 00:00:00';
    let endDate = '2099-12-30 00:00:00';

    if (reqMessageListInfo.queryFilterInfo.filterStartTime !== '') {
      startDate = reqMessageListInfo.queryFilterInfo.filterStartTime;
    }

    if (reqMessageListInfo.queryFilterInfo.filterEndTime !== '') {
      endDate = reqMessageListInfo.queryFilterInfo.filterEndTime;
    }
    whereField2 = `and creation_time between '${startDate}' and '${endDate}'`;
  }

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `select * from ${dbmsInfo.defaultDatabase}.message_info ${whereField} ${whereField1} ${whereField2} order by creation_time desc limit ${queryNum} offset ${(pNo - 1) * queryNum};`;
  sqlStatements += `select count(*) from ${dbmsInfo.defaultDatabase}.message_info;`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  let msgList: any[] = [];
  if (resultInfo.data !== null && resultInfo.data.length > 0) {
    msgList = [...resultInfo.data[0]];
  }

  let totalRecordCount = msgList.length;
  if(resultInfo.data[1][0] !== undefined && resultInfo.data[1][0]['count(*)'] !== undefined) {
    totalRecordCount =   resultInfo.data[1][0]['count(*)'];
  }

  if (resultInfo.resultCode === ResultCode.DB_QUERY_EMPTY) {
    resultInfo.resultCode = ResultCode.SUCCESS;
  }

  let msgInfoList: mdo.MessageInfo[] = [];
  let msgInfo: mdo.MessageInfo;
  for (let msgRecord of msgList) {
    msgInfo = convertDBRecordToMsgInfo(msgRecord);
    msgInfoList.push(msgInfo);
  }
  resultInfo.data = {totalCount:totalRecordCount, list:msgInfoList};

  //console.log('resultInfo:', resultInfo);

  return resultInfo;
};

// 새 메세지 정보 등록
export const registerDBNewMessage = async (sqlDataManager: SQLDataManager, reqSendMessageSentInfo: mdo.ReqSendMessageInfo): Promise<any> => {
  const fieldNameList = `(msg_type, target_type, target_user_id, title, content, activation_flag, reservation_flag, start_time, creation_time, reward_data)`;
  const fieldValueList = `(${reqSendMessageSentInfo.msgType}, '${reqSendMessageSentInfo.targetType}', '${reqSendMessageSentInfo.targetUserID}', '${cmnSvcProcessor.escapeSpecialCharsForJSON(JSON.stringify(reqSendMessageSentInfo.titleTable))}', '${cmnSvcProcessor.escapeSpecialCharsForJSON(JSON.stringify(reqSendMessageSentInfo.contentTable))}', ${
    reqSendMessageSentInfo.liveFlag === true ? 1 : 0
  }, ${reqSendMessageSentInfo.reservationFlag === true ? 1 : 0}, '${
    reqSendMessageSentInfo.startTime === '' ? Utils.getStdNowString() : reqSendMessageSentInfo.startTime
  }', '${Utils.getStdNowString()}', '${JSON.stringify(reqSendMessageSentInfo.rewardData)}')`;

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `insert into ${dbmsInfo.defaultDatabase}.message_info ${fieldNameList} values ${fieldValueList}`;

  let resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  return resultInfo;
};

// 예약 메세지 정보 갱신
export const updateDBMessage = async (sqlDataManager: SQLDataManager, reqUpdateMessageInfo: mdo.ReqUpdateMessageInfo): Promise<any> => {
  console.log('>>>>> reqUpdateMessageInfo=', reqUpdateMessageInfo);

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `update ${dbmsInfo.defaultDatabase}.message_info set target_type="${reqUpdateMessageInfo.targetType}",target_user_id="${reqUpdateMessageInfo.targetUserID}",title="${cmnSvcProcessor.escapeSpecialCharsForJSON(JSON.stringify(reqUpdateMessageInfo.titleTable))}",content="${cmnSvcProcessor.escapeSpecialCharsForJSON(JSON.stringify(reqUpdateMessageInfo.contentTable))}",reservation_flag=${reqUpdateMessageInfo.reservationFlag},activation_flag=${reqUpdateMessageInfo.liveFlag},start_time='${reqUpdateMessageInfo.startTime}',reward_data='${JSON.stringify(reqUpdateMessageInfo.rewardData)}' where msg_id=${reqUpdateMessageInfo.msgID}`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  return resultInfo;
};

// 예약 메세지 상태 갱신
export const updateDBPushMessageState = async (sqlDataManager: SQLDataManager, msgID:number, messageState:any): Promise<any> => {
  
  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `update ${dbmsInfo.defaultDatabase}.message_info set reward_data='${JSON.stringify(messageState)}' where msg_id=${msgID}`;

  const resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  return resultInfo;
};

// 우편함/푸쉬 메세지(들) 삭제
export const deleteDBMessages = async (sqlDataManager: SQLDataManager, reqDeleteMessagesInfo: mdo.ReqDeleteMessagesInfo): Promise<any> => {
  let idListStr = '(';
  for (let v of reqDeleteMessagesInfo.msgIDList) {
    if (idListStr !== '(') {
      idListStr += ',';
    }
    idListStr += v.toString();
  }

  idListStr += ')';

  const dbmsInfo = sqlDataManager.getDBMSInfo();
  let sqlStatements = `delete from ${dbmsInfo.defaultDatabase}.message_info where msg_type = ${reqDeleteMessagesInfo.msgType} and msg_id in ${idListStr}`;

  let resultInfo: ResultInfo = await sqlDataManager.querySQL(sqlStatements, null);

  return resultInfo;
};
