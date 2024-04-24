import { Response } from 'express';

export const ResultCode: any = {
  SUCCESS: 0, // 성공
  INVALID_REQPARAM: 1, // 요청 객체읜 파라메터의 형식이 잘못된 경우.
  SYSTEM_INTERNALERROR: 3, // 요청 처리중 내부 오류.
  TOKEN_VERIFY_FAILED: 4, // 토큰 검증에 실패하였음.
  TOKEN_EXPIRED: 5, // 토큰의 유효기간이 지남.
  OTP_VERIFICATION_FAILED: 6, // OTP 검증에 실패하였습니다.
  INVALID_PAGENO: 10, // 조회용 페이지번호가 유효하지 않음.

  // ACL 관련
  ACL_USER_NOT_AUTHORIZED: 21, // 해당 액션에 대한 권한이 없음.

  // DB 관련
  DB_QUERY_INTERNALERROR: 31, // DB 쿼리중 DBMS 내부 오류
  DB_QUERY_EMPTY: 32, // DB 쿼리 결과값이 없음
  DB_UPDATE_FIELD_NOTFOUND: 33, // DB 업데이트시 해당 필드없음
  DB_INSERT_DUPLICATEDKEY_FOUND: 34, // 레코드 추가시 중복된 키값 존재

  // 외부서비스 관련
  ADMINAPI_NFT_GENERATEFAILED: 60, // 게임서버 어드민 API에서 NFT속성정보를 생성하는데 실패.
  ADMINAPI_NFT_CONFIRMFAILED: 61, // 게임서버 어드민 API에서 NFT민팅 확정하는데 실패.
  ADMINAPI_SWAP_XDS2XDC_FAILED: 62, // XDS에서 XDC 스왑정보 전송처리중 실패.
  ADMINAPI_SWAP_XDC2XDS_FAILED: 63, // XDC에서 XDS 스왑정보 전송처리중 실패.
  ADMINAPI_LOGINREWARD_FAILED: 65, // 게임서버 어드민 API에서 접속보상 처리 중 실패.
  ADMINAPI_NFT_GETCURPROP_FAILED: 66, // 게임서버 어드민 API에서 토큰ID에 대한 속성정보 조회시 실패.
  ADMINAPI_NFT_QUERYMINTEDATTRLIST_FAILED: 67, // 어드민API에서 토큰ID에 대해 민팅된 속성정보 조회 처리중 실패.

  MARKETAPI_TRANSFER_FAILED: 70, // 마켓서버에 NFT정보 전송중 내부 오류로 실패.

  AWS_S3_UPLOADOBJ_FAIL: 80,
  AWS_S3_DOWNLOADOBJ_FAIL: 81,

  // 로그인/로그아웃 관련
  AUTH_INVALID_AUTHTOKEN: 101, // 유효하지 않은 인증토큰
  AUTH_AUTHTOKEN_EXPIRED: 102, // 인증토큰의 유효기간 만료
  AUTH_LOGIN_FAILED: 105,
  AUTH_LOGIN_ACCOUNT_NOTFOUND: 111, // DB에 관련 account 정보가 없음.
  AUTH_LOGIN_INVALID_IDFORMAT: 115, // adminID 형식이 잘못되었음.(4자리 이상 20자리 이하)
  AUTH_LOGIN_INVALID_PWFORMAT: 116, // adminPW 형식이 잘못되었음.(4자리 이상 영문대소문자,특수문자 각 1개씩 포함.)
  AUTH_LOGIN_IDNOTFOUND: 117, // adminID가 존재하지 않음.
  AUTH_LOGIN_PWMISMATCHED: 118, // adminPW 암호가 DB의 것과 일치하지 않음.
  AUTH_LOGIN_ACCOUNTDISINACTIVE: 119, // 해당 계정이 비활성화되었음.
  AUTH_LOGIN_SERVERACCESSDENIED: 120, // 해당 운영툴 서버에 접근권한이 없음.

  // 계정 관련
  ACCOUNT_REQPARAM_INVALID_IDFORMAT: 211,
  ACCOUNT_REQPARAM_INVALID_PWFORMAT: 212,
  ACCOUNT_REQPARAM_INVALID_ACLFORMAT: 213,
  ACCOUNT_REQPARAM_INVALID_TARGETID: 214,
  ACCOUNT_REQPARAM_INVALID_ACTIVATIONFLAG: 215,
  ACCOUNT_NEWADMIN_NEWCONFIRM_MISMATCHED: 221, // 새 비밀번호와 확인용 비밀번호가 다름
  ACCOUNT_NEWADMIN_ALREADY_EXIST: 222, // 해당 계정ID가 이미 DB에 존재함.
  ACCOUNT_CHANGEPW_CURPW_MISMATCHED: 223, // 기존 비밀번호가 DB에 저장된 것과 다름
  ACCOUNT_CHANGEPW_INVALID_NEWPASSWORD: 224, // 새 비밀번호 형식이 부적절합니다.
  ACCOUNT_CHANGEPW_NEWCONFIRM_MISMATCHED: 225, // 새 비밀번호와 확인용 비밀번호가 다름
  ACCOUNT_DELETE_MASTERID_NOTALLOWED: 226, // 마스터ID는 누구도 지울 수 없음
  ACCOUNT_ACTIVATION_MASTERID_NOTALLOWED: 227, // 마스터ID는 활성화/비활성화할 수 없음

  // 이벤트 관련
  EVENT_REQPARAM_INVALID_QUERYFILTERINFO: 310, // 요청파라메터:queryFilterInfo값이 유효하지 않음.
  EVENT_REQPARAM_INVALID_PARAM: 311,
  EVENT_REQPARAM_INVALID_EVENTID: 312,
  EVENT_REQPARAM_INVALID_EVENTTYPE: 313,
  EVENT_REQPARAM_INVALID_FILTERTYPE: 314,
  EVENT_REQPARAM_INVALID_RESERVEDEVENTFLAG: 315,
  EVENT_REQPARAM_INVALID_DURATION: 316,
  EVENT_REQPARAM_INVALID_ACTIVATIONFLAG: 317,
  EVENT_REQPARAM_INVALID_AUTORELEASETIME: 318,
  EVENT_REQPARAM_INVALID_DATA: 319,
  EVENT_REQPARAM_INVALID_EVENTIDLIST: 320,
  EVENT_DELETE_ONAIREVENT_NOTALLOWED: 321, // 현재 시행중인 이벤트는 삭제할 수 없음.
  EVENT_SENDNEWEVENT_SENDEVENTTOGAMESERVER_FAILED: 330, // 게임서버에서 새 이벤트 프리메세지를 처리중 오류가 발생하였습니다.
  EVENT_UPDATEEVENT_UPDATEEVENTTOGAMESERVER_FAILED: 331, // 게임서버에서 이벤트 프리메세지를 업데이트중 오류가 발생하였습니다.
  EVENT_DELETEEVENT_DELETEEVENTTOGAMESERVER_FAILED: 332, // 게임서버에서 이벤트 프리메세지를 삭제중 오류가 발생하였습니다.
  EVENT_COUPON_SENDCOUPONINFOTOGAMESERVER_FAILED: 340, // 게임서버에서 새 쿠폰정보 프리메세지를 처리중 오류가 발생하였습니다.
  EVENT_COUPON_SAMECOUPONCODEDETECTED: 341, // 동일한 쿠폰코드가 생성되었습니다. 

  // 활동로그 관련
  LOG_REQPARAM_INVALID_FILTER_ADMINID: 411,
  LOG_REQPARAM_INVALID_FILTER_ACTIVITYID: 412,

  // 메세지 관련
  MESSAGE_REQPARAM_INVALID_QUERYFILTERINFO: 511,
  MESSAGE_REQPARAM_INVALID_MSGTYPE: 512,
  MESSAGE_REQPARAM_INVALID_MSGIDLIST: 513,
  MESSAGE_REQPARAM_INVALID_RESERVEDFLAG: 514,
  MESSAGE_REQPARAM_INVALID_STARTTIME: 515,
  MESSAGE_REQPARAM_INVALID_RESERVATIONFLAG: 516,
  MESSAGE_REQPARAM_INVALID_ACTIVATIONFLAG: 517,
  MESSAGE_SENDNEWMSG_SENDINGTOGAMESERVER_FAILED: 518,
  MESSAGE_SENDNEWMSG_SENDINGTOPUSHSERVER_FAILED: 519,
  MESSAGE_PUSHSERVER_REQUESTFAILED: 530,
  MESSAGE_PUSHSERVER_SERVERISBUDY:531,
  MESSAGE_PUSHSERVER_INTERNALERROR:532,

  MESSAGE_LANGPRESET_LIST_REQUESTFAILED: 540,
  MESSAGE_LANGPRESET_ADD_REQUESTFAILED: 541,
  MESSAGE_LANGPRESET_UPDATE_REQUESTFAILED: 542,
  MESSAGE_LANGPRESET_DELETE_REQUESTFAILED: 543,

  MESSAGE_REWARDPRESET_LIST_REQUESTFAILED: 545,
  MESSAGE_REWARDPRESET_ADD_REQUESTFAILED: 546,
  MESSAGE_REWARDPRESET_UPDATE_REQUESTFAILED: 547,
  MESSAGE_REWARDPRESET_DELETE_REQUESTFAILED: 548,

  // 공지사항 관련
  NOTI_REQPARAM_INVALID_QUERYFILTERINFO: 611, // 요청파라메터:queryFilterInfo값이 유효하지 않음.
  NOTI_REQPARAM_INVALID_NOTIID: 612, // 요청파라메터:notiID값이 유효하지 않음.
  NOTI_REQPARAM_INVALID_NOTITYPE: 613, // 요청파라메터:notiType값이 범위에 있지 않음.
  NOTI_REQPARAM_INVALID_SCHEDULENOTIFLAG: 614, // 요청파라메터:예약 공지사항 여부 플래그값이 유효하지 않음.
  NOTI_REQPARAM_INVALID_DURATION: 615, //요청파라메터:예약 공지사항 시작시각/종료시각 값이 유효하지 않음.
  NOTI_REQPARAM_INVALID_ACTIVATIONFLAG: 616, // 요청파라메터:공지사항 활성화/비활성화 값이 유효하지 않음.
  NOTI_REQPARAM_INVALID_NOTIIDLIST: 617, // 요청파라메터:공지사항 삭제를 위한 notiID 목록값이 유효하지 않음.
  NOTI_DELETE_ONAIRNOTI_NOTALLOWED: 618, // 현재 공지중인 공지사항은 삭제할 수 없음.
  NOTI_SENDNEWNOTI_SENDNOTITOGAMESERVER_FAILED:650, // 새 공지사항을 game server에서 처리중 오류.
  NOTI_UPDATENOTI_UPDATENOTITOGAMESERVER_FAILED:651, // 업데이트된 공지사항을 game server에서 처리중 오류.
  NOTI_DELETENOTI_DELETENOTITOGAMESERVER_FAILED:652, // game server에서 공지사항 삭제처리 중 오류.

  // 도구 관련
  TOOL_REQPARAM_INVALID_TABLENAME: 810,
  TOOL_ARENA_UPDATE_TABLENOTFOUND: 820, // 해당 테이블이 DB에 존재하지 않습니다.

  // 유저 관련
  USER_REQPARAM_INVALID_QUERYFILTERINFO: 910,
  USER_REQPARAM_INVALID_USERID: 911,
  USER_REQPARAM_INVALID_USERTYPE: 912,
  USER_REQPARAM_INVALID_ACTIVATION: 913,
  USER_REQPARAM_INVALID_AUTORELEASETIME: 914,
  USER_REQPARAM_INVALID_SEARCHTYPE: 915,
  USER_REQPARAM_ACTLOG_INVALID_FILTERTYPE1: 916,
  USER_REQPARAM_ACTLOG_INVALID_FILTERTYPE2: 917,
  USER_REQPARAM_ACTLOG_INVALID_FILTERTYPE3: 918,
  USER_REQPARAM_ACTLOG_INVALID_USERID: 919,
  USER_REQPARAM_ACTLOG_INVALID_ACTGROUPID: 920,
  USER_REQPARAM_ACTLOG_INVALID_DURATION: 921,
  USER_REQPARAM_PAYLOG_INVALID_FILTERTYPE1: 922,
  USER_REQPARAM_PAYLOG_INVALID_FILTERTYPE2: 923,
  USER_REQPARAM_PAYLOG_INVALID_FILTERTYPE3: 924,
  USER_REQPARAM_PAYLOG_INVALID_DEVICETYPE: 925,
  USER_REQPARAM_REWARDTOUSER_INVALID_FILTERTARGETTYPE1: 926,
  USER_REQPARAM_REWARDTOUSER_INVALID_FILTERTARGETTYPE2: 927,
  USER_REQPARAM_REWARDTOUSER_INVALID_DEVICETYPE: 928,
  USER_REQPARAM_REWARDTOUSER_INVALID_USERIDLIST: 929,
  USER_REQPARAM_REWARDTOUSER_INVALID_EXPIREDATE: 930,
  USER_REQPARAM_ADDTOBLACKLIST_INVALID_USERIDLIST:933,
  USER_REQPARAM_RELEASEFROMBLACKLIST_INVALID_USERIDLIST:934,
  USER_REQPARAM_ADDTOBLACKLIST_AUTORELEASEFLAG_MISMATCHED_FOR_UNLIMITEDDURATION:935,
  USER_REQPARAM_ADDTOBLACKLIST_DURATIONISTOOBIG: 936,

  // 설정 관련
  SETTING_REQPARAM_INVALID_ITEMLIST: 1001,
  SETTING_REQPARAM_INVALID_CLIENTCONFIG_ITEMLIST: 1002,
  SETTING_NFT_UPDATEMETADATAURI_FAILED: 1003,
  SETTING_CLIENTCONFIG_DOWNLOADFROMS3_FAILED: 1011,
  SETTING_CLIENTCONFIG_UPLOADTOS3_FAILED: 1012,

  // 블록체인 관련
  NFT_CONTRACT_MINTING_FAIL: 1101,
  NFT_CONTRACT_TRANSFER_FAIL: 1102,
  NFT_CONTRACT_MINTING_FAIL_INVALIDADDRESS: 1103,
  NFT_CONTRACT_TRANSFER_FAIL_INVALIDADDRESS: 1104,
  NFT_CONTRACT_GETNFTLIST_FAIL: 1105,
  NFT_ERC20TOKEN_TRANSFER_FAIL: 1106,
  NFT_METADATA_QUERY_FAIL: 1120,
  NFT_METADATA_UPDATE_FAIL: 1121,
  NFT_MINTING_SAMETOKEN_EXIST1: 1130,
  NFT_MINTING_SAMETOKEN_EXIST2: 1131,
  NFT_MINTINGLIST_CANT_DELETE_MINTEDITEM: 1132,
  NFT_CONTRACT_ISOWNER_FAIL: 1133,
  WALLET_CANT_FIND_MARKETOPADDRESS: 1134,

  NFTCHECK_QUANITTY_NOTMISMATCHED: 1140,
  NFTCHECK_NFT_INTEGRITY_ALREADYTRANSFERED: 1141,
  NFTCHECK_NFT_INTEGRITY_TOKENIDNOTFOUND: 1142,
  NFTCHECK_METADATA_INTEGRITY_ACCESSFAILED: 1143,

  ERC20TOKEN_BALANCE_GET_FAILED: 1150,

  // 마켓 관련
  MARKET_BALANCE_GET_FAILED: 1170,
  MARKET_BALANCE_DRAGON_TRANSFER_FAILED: 1171,
  MARKET_BALANCE_GEAR_TRANSFER_FAILED: 1172,
  MARKET_BALANCE_PACKAGE_TRANSFER_FAILED: 1173,
  MARKET_BALANCE_NOTENOUGH_TOKEN: 1174,
  MARKET_BALANCE_C2C_CONTRACT1_TRANSFER_FAILED: 1178,
  MARKET_BALANCE_C2C_CONTRACT2_TRANSFER_FAILED: 1179,
  MARKET_REGISTER_NFT_NO_SEASONINFO: 1180,
  MARKET_REGISTER_NFT_INSERTERROR1: 1181,
  MARKET_REGISTER_NFT_INSERTERROR2: 1182,
  MARKET_REGISTER_NFT_INSERTERROR3: 1183,
  MARKET_CONTRACT_GETINFO_FAILED: 1185,
  MARKET_B2C_CONTRACT_SETTING_FAILED: 1186,
  MARKET_C2C_CONTRACT_SETTING_FAILED: 1187
};

export const ReqValidationErrorMsg: any = {
  VALERRORMSG_INVALID_ID: '아이디 형식이 유효하지 않습니다.',
  VALERRORMSG_INVALID_IDLIST: '아이디목록 형식이 유효하지 않습니다.',
  VALERRORMSG_INVALID_PW: '비밀번호 형식이 유효하지 않습니다.',
  VALERRORMSG_INVALID_ACL: 'ACL형식이 유효하지 않습니다.',
  VALERRORMSG_INVALID_PAGENO: '페이지번호가 유효하지 않습니다.',
  VALERRORMSG_INVALID_BOOLEAN: 'boolean값이 유효하지 않습니다.',
  VALERRORMSG_INVALID_TIME: '타임형식이 유효하지 않습니다.',
  VALERRORMSG_INVALID_ENUM: 'ENUM 값이 유효하지 않습니다.',
  VALERRORMSG_INVALID_TABLEID: '테이블ID값이 유효하지 않습니다.',
  VALERRORMSG_INVALID_QUERYFILTER: '쿼리필터값이 유효하지 않습니다',
  VALERRORMSG_INVALID_NUMSET: '숫자값이 정해진 값들중 하나가 아닙니다',
  VALERRORMSG_INVALID_USERIDLIST: '유저ID 배열값이 유효하지 않습니다',

  [ResultCode.OTP_VERIFICATION_FAILED.toString()]: '입력하신 OTP 코드가 서버 검증에서 실패하였습니다.',
  [ResultCode.INVALID_REQPARAM.toString()]: '제공한 요청 파라메터중 올바르지 않은 값이 있습니다.',
  [ResultCode.DB_QUERY_INTERNALERROR.toString()]: 'DB,테이블이 존재하지 않거나 쿼리문 자체에 오류가 있습니다.',
  [ResultCode.DB_QUERY_EMPTY.toString()]: '쿼리 결과값이 없습니다.',
  [ResultCode.DB_INSERT_DUPLICATEDKEY_FOUND.toString()]: '레코드를 추가하는중 중복된 키값이 존재합니다.',
  [ResultCode.SYSTEM_INTERNALERROR.toString()]: '요청처리중 내부 오류가 발생하였습니다.',
  [ResultCode.ADMINAPI_NFT_GENERATEFAILED.toString()]: '어드민API에서 NFT속성을 생성하는데 실패하였습니다.',
  [ResultCode.AWS_S3_UPLOADOBJ_FAIL.toString()]: 'AWS S3에 파일 업로드중 실패하였습니다.',
  [ResultCode.ADMINAPI_SWAP_XDS2XDC_FAILED.toString()]: 'XDS에서 XDC 스왑정보 전송처리중 실패하였습니다.',
  [ResultCode.ADMINAPI_SWAP_XDC2XDS_FAILED.toString()]: 'XDC에서 XDS 스왑정보 전송처리중 실패하였습니다.',
  [ResultCode.MARKETAPI_TRANSFER_FAILED.toString()]: '마켓서버에서 NFT정보 처리중 오류가 발생하였습니다.',
  [ResultCode.ADMINAPI_LOGINREWARD_FAILED.toString()]: '어드민API에서 접속보상 처리중 오류가 발생하였습니다.',
  [ResultCode.ADMINAPI_NFT_GETCURPROP_FAILED.toString()]: '어드민API에서 토큰ID에 대한 현재 속성정보 처리중 오류가 발생하였습니다.',
  [ResultCode.ADMINAPI_NFT_QUERYMINTEDATTRLIST_FAILED.toString()]: '어드민API에서 토큰ID에 대해 민팅된 속성정보 조회 처리중 오류가 발생하였습니다.',

  [ResultCode.NFT_CONTRACT_MINTING_FAIL.toString()]: '컨트랙트에서 민팅처리에 실패하였습니다.',
  [ResultCode.NFT_CONTRACT_TRANSFER_FAIL.toString()]: '컨트랙트에서 전송처리에 실패하였습니다.',
  [ResultCode.NFT_CONTRACT_MINTING_FAIL_INVALIDADDRESS.toString()]: '컨트랙트에서 민팅처리에 실패하였습니다:(유효하지 않은 주소)',
  [ResultCode.NFT_CONTRACT_TRANSFER_FAIL_INVALIDADDRESS.toString()]: '컨트랙트에서 전송처리에 실패하였습니다:(유효하지 않은 주소)',
  [ResultCode.NFT_CONTRACT_GETNFTLIST_FAIL.toString()]: '컨트랙트에서 NFT목록을 가져오는데 실패하였습니다.',
  [ResultCode.NFT_ERC20TOKEN_TRANSFER_FAIL.toString()]: 'ERC20 토큰을 전송하는 중 오류가 발생하였습니다.',
  [ResultCode.NFT_METADATA_QUERY_FAIL.toString()]: '컨트랙트에서 메타데이터 URI를 조회하는데 실패하였습니다.',
  [ResultCode.NFT_METADATA_UPDATE_FAIL.toString()]: '컨트랙트에 메타데이터 URI를 설정하는데 실패하였습니다.',
  [ResultCode.NFT_CONTRACT_ISOWNER_FAIL.toString()]: '컨트랙트에서 지갑주소의 특정 토큰 소유여부를 조회하는데 실패하였습니다.',
  [ResultCode.WALLET_CANT_FIND_MARKETOPADDRESS.toString()]: '마켓운영자 정보를 조회하는데 실패하였습니다.',
  [ResultCode.NFT_MINTING_SAMETOKEN_EXIST1.toString()]: '새로 민팅할 토큰들중에 중복된 토큰ID가 존재합니다.',
  [ResultCode.NFT_MINTING_SAMETOKEN_EXIST2.toString()]: '기존 민팅한 토큰과 새로 민팅할 토큰 사이에 중복된 토큰ID가 존재합니다.',

  [ResultCode.NFT_MINTINGLIST_CANT_DELETE_MINTEDITEM.toString()]: '이미 민팅완료된 항목은 삭제할 수 없습니다.',

  [ResultCode.AUTH_LOGIN_ACCOUNTDISINACTIVE.toString()]: '해당 계정이 비활성화되었습니다. MASTER에게 문의하세요.',
  [ResultCode.AUTH_LOGIN_PWMISMATCHED.toString()]: '비밀번호가 일치하지 않습니다.',
  [ResultCode.AUTH_LOGIN_IDNOTFOUND.toString()]: '해당 ID가 존재하지 않습니다.',
  [ResultCode.AUTH_LOGIN_SERVERACCESSDENIED.toString()]: '해당 서버에 로그인할 수 있는 권한이 없습니다.',

  [ResultCode.AUTH_AUTHTOKEN_EXPIRED.toString()]: '인증토큰의 유효기간이 만료되었거나 다른 유저가 동시에 로그인되어 있습니다.',
  [ResultCode.AUTH_INVALID_AUTHTOKEN.toString()]: '인증토큰의 포맷이 유효하지 않습니다.',
  [ResultCode.ACCOUNT_CHANGEPW_NEWCONFIRM_MISMATCHED.toString()]: '새 비밀번호와 확인용 비밀버호가 다릅니다.',
  [ResultCode.ACCOUNT_CHANGEPW_CURPW_MISMATCHED.toString()]: '비밀번호가 일치하지 않습니다.',
  [ResultCode.ACCOUNT_CHANGEPW_INVALID_NEWPASSWORD.toString()]: '새 비밀번호 형식이 올바르지 않습니다.',
  [ResultCode.ACCOUNT_DELETE_MASTERID_NOTALLOWED.toString()]: '마스터 계정은 삭제할 수 없습니다.',
  [ResultCode.ACCOUNT_ACTIVATION_MASTERID_NOTALLOWED.toString()]: '마스터 계정은 활성화/비활성화할 수 없습니다.',
  [ResultCode.ACCOUNT_NEWADMIN_ALREADY_EXIST.toString()]: '같은 계정ID가 이미 존재합니다.',
  [ResultCode.ACL_USER_NOT_AUTHORIZED.toString()]: '해당 액션에 대한 권한이 없습니다.',
  [ResultCode.NOTI_DELETE_ONAIRNOTI_NOTALLOWED.toString()]: '현재 공지중인 공지사항은 삭제할 수 없습니다.',

  [ResultCode.EVENT_REQPARAM_INVALID_DATA.toString()]: '보상 데이터 포맷이 유효하지 않습니다.',
  [ResultCode.EVENT_DELETE_ONAIREVENT_NOTALLOWED.toString()]: '현재 시행중인 이벤트는 삭제할 수 없습니다.',

  [ResultCode.USER_REQPARAM_ADDTOBLACKLIST_DURATIONISTOOBIG.toString()]: '블랙리스트 기간이 최대 30일을 넘을 수 없습니다.',
  [ResultCode.USER_REQPARAM_ADDTOBLACKLIST_AUTORELEASEFLAG_MISMATCHED_FOR_UNLIMITEDDURATION.toString()]: '기간이 설정되지 않은 블랙리스트 등록 요청은 해제타입이 자동이 될 수 없습니다.',

  [ResultCode.SETTING_REQPARAM_INVALID_ITEMLIST.toString()]: '설정값의 형식이 올바르지 않습니다.',
  [ResultCode.SETTING_REQPARAM_INVALID_CLIENTCONFIG_ITEMLIST.toString()]: '클라이언트 설정값의 형식이 올바르지 않습니다.',
  [ResultCode.SETTING_NFT_UPDATEMETADATAURI_FAILED.toString()]: '메타데이터 기본URI를 컨트랙트에 업데이트하는 중 오류가 발생하였습니다.',

  [ResultCode.SETTING_CLIENTCONFIG_DOWNLOADFROMS3_FAILED.toString()]: '클라이언트 설정정보를 S3에서 다운로드하는데 오류가 발생하였습니다.',
  [ResultCode.SETTING_CLIENTCONFIG_UPLOADTOS3_FAILED.toString()]: '클라이언트 설정정보를 S3에 업로드하는데 오류가 발생하였습니다.',

  [ResultCode.MESSAGE_SENDNEWMSG_SENDINGTOGAMESERVER_FAILED.toString()]: '게임서버에서 보상설정 처리중 오류가 발생하였습니다.',
  [ResultCode.MESSAGE_SENDNEWMSG_SENDINGTOPUSHSERVER_FAILED.toString()]: '푸쉬서버에서 메세지 처리중 오류가 발생하였습니다.',

  [ResultCode.NOTI_SENDNEWNOTI_SENDNOTITOGAMESERVER_FAILED.toString()]: '게임서버에서 새 공지사항 처리중 오류가 발생하였습니다.',
  [ResultCode.NOTI_UPDATENOTI_UPDATENOTITOGAMESERVER_FAILED.toString()]: '게임서버에서 공지사항 업데이트중 오류가 발생하였습니다.',
  [ResultCode.NOTI_DELETENOTI_DELETENOTITOGAMESERVER_FAILED.toString()]: '게임서버에서 공지사항 삭제중 오류가 발생하였습니다.',

  [ResultCode.EVENT_SENDNEWEVENT_SENDEVENTTOGAMESERVER_FAILED.toString()]: '게임서버에서 새 이벤트 프리메세지를 처리중 오류가 발생하였습니다.',
  [ResultCode.EVENT_UPDATEEVENT_UPDATEEVENTTOGAMESERVER_FAILED.toString()]: '게임서버에서 이벤트 프리메세지를 업데이트중 오류가 발생하였습니다.',
  [ResultCode.EVENT_DELETEEVENT_DELETEEVENTTOGAMESERVER_FAILED.toString()]: '게임서버에서 이벤트 프리메세지를 삭제중 오류가 발생하였습니다.',

  [ResultCode.EVENT_COUPON_SENDCOUPONINFOTOGAMESERVER_FAILED.toString()]: '게임서버에서 새 쿠폰정보 프리메세지를 처리중 오류가 발생하였습니다.',
  [ResultCode.EVENT_COUPON_SAMECOUPONCODEDETECTED.toString()]: '동일한 쿠폰코드가 생성후 발견되었습니다. 다시 생성요청 해주세요.',

  [ResultCode.MESSAGE_PUSHSERVER_REQUESTFAILED.toString()]: '푸쉬서버가 요청을 처리하는 중 오류가 발생하였습니다.',
  [ResultCode.MESSAGE_PUSHSERVER_SERVERISBUDY.toString()]: '현재 푸쉬서버가 다른 요청을 처리중이므로 나중에 다시 요청해주세요.',
  [ResultCode.MESSAGE_PUSHSERVER_INTERNALERROR.toString()]: '푸쉬서버 내부 오류가 발생하였습니다.',

  [ResultCode.MESSAGE_LANGPRESET_LIST_REQUESTFAILED.toString()]: '언어프리셋 목록조회 요청중 서버에서 오류가 발생하였습니다.',
  [ResultCode.MESSAGE_LANGPRESET_ADD_REQUESTFAILED.toString()]: '언어프리셋 추가 요청중 서버에서 오류가 발생하였습니다.',
  [ResultCode.MESSAGE_LANGPRESET_UPDATE_REQUESTFAILED.toString()]: '언어프리셋 업데이트 요청중 서버에서 오류가 발생하였습니다.',
  [ResultCode.MESSAGE_LANGPRESET_DELETE_REQUESTFAILED.toString()]: '언어프리셋 삭제 요청중 서버에서 오류가 발생하였습니다.',
  [ResultCode.MESSAGE_REWARDPRESET_LIST_REQUESTFAILED.toString()]: '보상프리셋 목록조회 요청중 서버에서 오류가 발생하였습니다.',
  [ResultCode.MESSAGE_REWARDPRESET_ADD_REQUESTFAILED.toString()]: '보상프리셋 추가 요청중 서버에서 오류가 발생하였습니다.',
  [ResultCode.MESSAGE_REWARDPRESET_UPDATE_REQUESTFAILED.toString()]: '보상프리셋 업데이트 요청중 서버에서 오류가 발생하였습니다.',
  [ResultCode.MESSAGE_REWARDPRESET_DELETE_REQUESTFAILED.toString()]: '보상프리셋 삭제 요청중 서버에서 오류가 발생하였습니다.',

  [ResultCode.NFTCHECK_QUANITTY_NOTMISMATCHED.toString()]: 'NFT 검증중 DB에 존재하는 토큰의 수량이 주어진 값과 일치하지 않습니다.',
  [ResultCode.NFTCHECK_NFT_INTEGRITY_ALREADYTRANSFERED.toString()]: 'NFT 검증중 해당 NFT들이 이미 다른 주소로 전송되었습니다.',
  [ResultCode.NFTCHECK_NFT_INTEGRITY_TOKENIDNOTFOUND.toString()]: 'NFT 검증중 DB에 존재하는 토큰ID가 컨트랙트내에 존재하지 않습니다.',
  [ResultCode.NFTCHECK_METADATA_INTEGRITY_ACCESSFAILED.toString()]: '컨트랙트에서 받은 메타데이터를 S3에서 찾을 수 없습니다.',

  [ResultCode.ERC20TOKEN_BALANCE_GET_FAILED.toString()]: '지갑주소로 부터 코인잔액을 조회하는 중 오류가 발생하였습니다.',

  [ResultCode.MARKET_BALANCE_GET_FAILED.toString()]: '마켓 판매 컨트랙트에서 매출잔액을 조회하는 중 오류가 발생하였습니다.',
  [ResultCode.MARKET_BALANCE_DRAGON_TRANSFER_FAILED.toString()]: '마켓 판매 컨트랙트(드래곤)에서 매출잔액을 타 지갑으로 전송하는 중 오류가 발생하였습니다.',
  [ResultCode.MARKET_BALANCE_GEAR_TRANSFER_FAILED.toString()]: '마켓 판매 컨트랙트(기어)에서 매출잔액을 타 지갑으로 전송하는 중 오류가 발생하였습니다.',
  [ResultCode.MARKET_BALANCE_PACKAGE_TRANSFER_FAILED.toString()]: '마켓 판매 컨트랙트(패키지)에서 매출잔액을 타 지갑으로 전송하는 중 오류가 발생하였습니다.',
  [ResultCode.MARKET_BALANCE_NOTENOUGH_TOKEN.toString()]: '마켓 판매 컨트랙트에 잔액이 부족합니다.',
  [ResultCode.MARKET_BALANCE_C2C_CONTRACT1_TRANSFER_FAILED.toString()]: '마켓 판매 컨트랙트1(C2C)에서 매출잔액을 타 지갑으로 전송하는 중 오류가 발생하였습니다.',
  [ResultCode.MARKET_BALANCE_C2C_CONTRACT2_TRANSFER_FAILED.toString()]: '마켓 판매 컨트랙트2(C2C)에서 매출잔액을 타 지갑으로 전송하는 중 오류가 발생하였습니다.',
  [ResultCode.MARKET_REGISTER_NFT_NO_SEASONINFO.toString()]: '해당 아이템타입에 대한 시즌정보가 테이블에 존재하지 않습니다.',
  [ResultCode.MARKET_REGISTER_NFT_INSERTERROR1.toString()]: 'NFT정보를 item_shop 테이블에 등록시 오류가 발생하였습니다.',
  [ResultCode.MARKET_REGISTER_NFT_INSERTERROR2.toString()]: 'NFT정보를 item_shop_cards 테이블에 등록시 오류가 발생하였습니다.',
  [ResultCode.MARKET_REGISTER_NFT_INSERTERROR3.toString()]: 'NFT정보를 item_shop_cards_idx 테이블에 등록시 오류가 발생하였습니다.',
  [ResultCode.MARKET_CONTRACT_GETINFO_FAILED.toString()]: 'B2C/C2C 컨트랙트에서 정보를 가져오는데 실패하였습니다.',
  [ResultCode.MARKET_B2C_CONTRACT_SETTING_FAILED.toString()]: 'B2C 설정정보를 컨트랙트에 저장하는데 실패하였습니다.',
  [ResultCode.MARKET_C2C_CONTRACT_SETTING_FAILED.toString()]: 'C2C 설정정보를 컨트랙트에 저장하는데 실패하였습니다.',

  [ResultCode.TOOL_ARENA_UPDATE_TABLENOTFOUND.toString()]: '테이블명에 대한 테이블이 DB에 존재하지 않습니다.'
};

// 응답 정보
export type ResultInfo = {
  resultCode: number;
  message: string;
  data: any;
  newAuthToken?: any;
};

const resultFormStr = `{"result":${ResultCode.SUCCESS},"message":"","data":{}}`;

// 응답폼 생성 함수
export const getResultForm = (resultCode: number, message: string, data: any): ResultInfo => {
  const resultForm: ResultInfo = { resultCode, message: message, data: data };

  return resultForm;
};

export const sendRes = (res: Response, result: ResultInfo) => {
  res.status(200).json(result);
};
