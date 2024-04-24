import { ACLUnitInfo } from '../accounts/AccountDataObject';

export const ACL_POLICY_NONE = 'NONE';
export const ACL_POLICY_ALL = 'ALL';

// {ACC:[{'P020100':1}],USR:[{'P030102':0}],NOT:[],MIB:[],MPU:[],ELF:[],ALO:[],SET:[]}

// 계정 관련
export const ACL_POLOCIY_GROUPCODE_ACCOUNT = 'ACC';
export const ACL_POLICY_ACCOUNT_ALL = 'P0200';
export const ACL_POLICY_ACCOUNT_VIEWLIST = 'P0201'; // 계정 목록 조회
export const ACL_POLICY_ACCOUNT_REGISTER = 'P0202'; // 새 계정 등록,수정(자기 계정 정보는 무조건 변경가능)
export const ACL_POLICY_ACCOUNT_CHANGEACL = 'P0203'; // 기존 계정 권한 변경
export const ACL_POLICY_ACCOUNT_ACTIVATION = 'P0204'; // 기존 계정 활성화 관리
export const ACL_POLICY_ACCOUNT_DELETE = 'P0205'; // 기존 계정 삭제
export const ACL_POLICY_ACCOUNT_CHANGEPW = 'P0206'; // 비밀번호 변경(자기 계정 비밀번호는 무조건 변경가능)

// 유저 관련
export const ACL_POLOCIY_GROUPCODE_USER = 'USR';
export const ACL_POLICY_USER_ALL = 'P0300';
export const ACL_POLICY_USER_VIEWLIST = 'P0301'; // 유저 목록 조회
export const ACL_POLICY_USER_VIEWDETAIL = 'P0302'; // 유저 세부 정보 보기(활동로그 포함)
export const ACL_POLICY_USER_MANAGEBLACKLIST = 'P0303'; // 블랙 리스트 관리
export const ACL_POLICY_USER_UPDATE = 'P0305'; // 유저 정보 수정
export const ACL_POLICY_USER_PAYLOG_VIEWLIST = 'P0307'; // 유저 결제정보 조회
export const ACL_POLICY_USER_REWARDTOUSERGROUP = 'P0308'; // 유저에게 보상 주기

// 공지사항 관련
export const ACL_POLOCIY_GROUPCODE_NOTIFICATION = 'NOT';
export const ACL_POLICY_NOTIFICATION_ALL = 'P0400';
export const ACL_POLICY_NOTIFICATION_VIEWLIST = 'P0401';
export const ACL_POLICY_NOTIFICATION_MAINTAIN_REGISTER = 'P0402'; // 새 유지보수 공지사항 등록,수정
export const ACL_POLICY_NOTIFICATION_MAINTAIN_DELETE = 'P0404'; // 기존 유지보수 공지사항 삭제
export const ACL_POLICY_NOTIFICATION_LOBBY_REGISTER = 'P0412'; // 새 로비 공지사항 등록,수정
export const ACL_POLICY_NOTIFICATION_LOBBY_DELETE = 'P0414'; // 기존 로비 공지사항 삭제
export const ACL_POLICY_NOTIFICATION_WEBSITE_REGISTER = 'P0422'; // 새 웹사이트 공지사항 등록,수정
export const ACL_POLICY_NOTIFICATION_WEBSITE_DELETE = 'P0424'; // 기존 웹사이트 공지사항 삭제
export const ACL_POLICY_NOTIFICATION_LINESCROLL_REGISTER = 'P0432'; // 새 띠알림 공지사항 등록,수정
export const ACL_POLICY_NOTIFICATION_LINESCROLL_DELETE = 'P0434'; // 기존 띠알림 공지사항 삭제

// 우편함 메세지 관련
export const ACL_POLOCIY_GROUPCODE_MESSAGE_INBOX = 'MIB';
export const ACL_POLICY_MESSAGE_INBOX_ALL = 'P0500';
export const ACL_POLICY_MESSAGE_INBOX_VIEWLIST = 'P0501';
export const ACL_POLICY_MESSAGE_INBOX_SEND = 'P0502'; // 새 우편함 등록
export const ACL_POLICY_MESSAGE_INBOX_UPDATE = 'P0503'; // 기존 우편함 수정
export const ACL_POLICY_MESSAGE_INBOX_DELETE = 'P0504'; // 기존 우편함 삭제

// 푸쉬알람 메세지 관련
export const ACL_POLOCIY_GROUPCODE_MESSAGE_PUSH = 'MPU';
export const ACL_POLICY_MESSAGE_PUSH_ALL = 'P0600';
export const ACL_POLICY_MESSAGE_PUSH_VIEWLIST = 'P0601';
export const ACL_POLICY_MESSAGE_PUSH_SEND = 'P0602'; // 새 푸쉬알람 등록
export const ACL_POLICY_MESSAGE_PUSH_UPDATE = 'P0603'; // 기존 푸쉬알람 수정
export const ACL_POLICY_MESSAGE_PUSH_DELETE = 'P0604'; // 기존 푸쉬알람 삭제

// 이벤트 관련
export const ACL_POLOCIY_GROUPCODE_EVENT_LOGINREWARD = 'ELR';
export const ACL_POLICY_EVENT_LOGINREWARD_ALL = 'P0700';
export const ACL_POLICY_EVENT_LOGINREWARD_VIEWLIST = 'P0701';
export const ACL_POLICY_EVENT_LOGINREWARD_REGISTER = 'P0702'; // 새 이벤트 등록
export const ACL_POLICY_EVENT_LOGINREWARD_UPDATE = 'P0703'; // 기존 이벤트 수정
export const ACL_POLICY_EVENT_LOGINREWARD_DELETE = 'P0704'; // 기존 이벤트 삭제
export const ACL_POLICY_EVENT_LOGINREWARD_ACTIVATION = 'P0705';

// 활동로그/시스템로그 관련
export const ACL_POLOCIY_GROUPCODE_ACTIVITYLOG = 'ALO';
export const ACL_POLICY_ACTIVITYLOG_ALL = 'P0800';
export const ACL_POLICY_ACTIVITYLOG_VIEWLIST = 'P0801'; // 계정활동 로그 보기
export const ACL_POLICY_SYSTEMLOG_VIEWLIST = 'P0802'; // 시스템 로그 보기

// 환경설정 관련
export const ACL_POLOCIY_GROUPCODE_SETTING = 'SET';
export const ACL_POLICY_SETTING_ALL = 'P0900';
export const ACL_POLICY_SETTING_VIEW = 'P0901'; // 환경설정 보기
export const ACL_POLICY_SETTING_UPDATE = 'P0902'; // 환경설정 수정

// NFT 관련
export const ACL_POLOCIY_GROUPCODE_NFT = 'NFT';
export const ACL_POLOCIY_NFT_ALL = 'P1000';
export const ACL_POLOCIY_NFT_MINT = 'P1001'; // NFT 민팅
export const ACL_POLOCIY_NFT_BURN = 'P1002'; // NFT 소각

export const ACLKeyLabelMap = [
  // 계정
  { k: ACL_POLICY_ACCOUNT_VIEWLIST, l: '계정목록 조회' },
  { k: ACL_POLICY_ACCOUNT_REGISTER, l: '새계정 등록/수정' },
  { k: ACL_POLICY_ACCOUNT_CHANGEACL, l: '계정권한 변경' },
  { k: ACL_POLICY_ACCOUNT_ACTIVATION, l: '계정 활성화 관리' },
  { k: ACL_POLICY_ACCOUNT_DELETE, l: '계정 삭제' },
  { k: ACL_POLICY_ACCOUNT_CHANGEPW, l: '비밀번호 변경' },
  // 유저
  { k: ACL_POLICY_USER_VIEWLIST, l: '유저목록 조회' },
  { k: ACL_POLICY_USER_VIEWDETAIL, l: '유저 상세보기' },
  { k: ACL_POLICY_USER_MANAGEBLACKLIST, l: '블랙리스트 관리' },
  { k: ACL_POLICY_USER_UPDATE, l: '유저정보 수정' },
  { k: ACL_POLICY_USER_PAYLOG_VIEWLIST, l: '유저 결제정보 조회' },
  { k: ACL_POLICY_USER_REWARDTOUSERGROUP, l: '유저 보상주기' },
  // 공지사항
  { k: ACL_POLICY_NOTIFICATION_MAINTAIN_REGISTER, l: '새 유지보수 공지사항 등록/수정' },
  { k: ACL_POLICY_NOTIFICATION_MAINTAIN_DELETE, l: '유지보수 공지사항 삭제' },
  { k: ACL_POLICY_NOTIFICATION_LOBBY_REGISTER, l: '새 로비 공지사항 등록/수정' },
  { k: ACL_POLICY_NOTIFICATION_LOBBY_DELETE, l: '로비 공지사항 삭제' },
  { k: ACL_POLICY_NOTIFICATION_WEBSITE_REGISTER, l: '새 웹사이트 공지사항 등록/수정' },
  { k: ACL_POLICY_NOTIFICATION_WEBSITE_DELETE, l: '웹사이트 공지사항 삭제' },
  { k: ACL_POLICY_NOTIFICATION_LINESCROLL_REGISTER, l: '띠알림 공지사항 등록/수정' },
  { k: ACL_POLICY_NOTIFICATION_LINESCROLL_DELETE, l: '띠알림 공지사항 삭제' },
  // 우편함
  { k: ACL_POLICY_MESSAGE_INBOX_SEND, l: '새 우편함 등록' },
  { k: ACL_POLICY_MESSAGE_INBOX_UPDATE, l: '우편함 수정' },
  { k: ACL_POLICY_MESSAGE_INBOX_DELETE, l: '우편함 삭제' },
  // 푸쉬알림
  { k: ACL_POLICY_MESSAGE_PUSH_SEND, l: '새 푸쉬알람 등록' },
  { k: ACL_POLICY_MESSAGE_PUSH_UPDATE, l: '푸쉬알람 수정' },
  { k: ACL_POLICY_MESSAGE_PUSH_DELETE, l: '푸쉬알람 삭제' },
  // 이벤트
  { k: ACL_POLICY_EVENT_LOGINREWARD_REGISTER, l: '새 이벤트 등록' },
  { k: ACL_POLICY_EVENT_LOGINREWARD_UPDATE, l: '이벤트 수정' },
  { k: ACL_POLICY_EVENT_LOGINREWARD_DELETE, l: '이벤트 삭제' },
  // 활동로그/시스템로그
  { k: ACL_POLICY_ACTIVITYLOG_VIEWLIST, l: '계정활동 로그 보기' },
  { k: ACL_POLICY_SYSTEMLOG_VIEWLIST, l: '시스템 로그 보기' },
  // 환경설정
  { k: ACL_POLICY_SETTING_VIEW, l: '환경설정 보기' },
  { k: ACL_POLICY_SETTING_UPDATE, l: '환경설정 수정' },
  // NFT
  { k: ACL_POLOCIY_NFT_MINT, l: 'NFT 민팅'},
  { k: ACL_POLOCIY_NFT_BURN, l: 'NFT 소각'}

];

// 디폴트 ACL목록값 생성
export const createBaseACLObj = () => {
  const wholeACL: any = {
    [ACL_POLOCIY_GROUPCODE_ACCOUNT]: [],
    [ACL_POLOCIY_GROUPCODE_USER]: [],
    [ACL_POLOCIY_GROUPCODE_NOTIFICATION]: [],
    [ACL_POLOCIY_GROUPCODE_MESSAGE_INBOX]: [],
    [ACL_POLOCIY_GROUPCODE_MESSAGE_PUSH]: [],
    [ACL_POLOCIY_GROUPCODE_EVENT_LOGINREWARD]: [],
    [ACL_POLOCIY_GROUPCODE_ACTIVITYLOG]: [],
    [ACL_POLOCIY_GROUPCODE_SETTING]: [],
    [ACL_POLOCIY_GROUPCODE_NFT]: [],
  };

  wholeACL[ACL_POLOCIY_GROUPCODE_ACCOUNT].push({ k: ACL_POLICY_ACCOUNT_VIEWLIST, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_ACCOUNT].push({ k: ACL_POLICY_ACCOUNT_REGISTER, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_ACCOUNT].push({ k: ACL_POLICY_ACCOUNT_CHANGEACL, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_ACCOUNT].push({ k: ACL_POLICY_ACCOUNT_ACTIVATION, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_ACCOUNT].push({ k: ACL_POLICY_ACCOUNT_DELETE, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_ACCOUNT].push({ k: ACL_POLICY_ACCOUNT_CHANGEPW, v: 0 });

  wholeACL[ACL_POLOCIY_GROUPCODE_USER].push({ k: ACL_POLICY_USER_VIEWLIST, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_USER].push({ k: ACL_POLICY_USER_VIEWDETAIL, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_USER].push({ k: ACL_POLICY_USER_MANAGEBLACKLIST, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_USER].push({ k: ACL_POLICY_USER_UPDATE, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_USER].push({ k: ACL_POLICY_USER_PAYLOG_VIEWLIST, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_USER].push({ k: ACL_POLICY_USER_REWARDTOUSERGROUP, v: 0 });

  wholeACL[ACL_POLOCIY_GROUPCODE_ACCOUNT].push({ k: ACL_POLICY_ACCOUNT_VIEWLIST, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_ACCOUNT].push({ k: ACL_POLICY_ACCOUNT_REGISTER, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_ACCOUNT].push({ k: ACL_POLICY_ACCOUNT_CHANGEACL, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_ACCOUNT].push({ k: ACL_POLICY_ACCOUNT_ACTIVATION, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_ACCOUNT].push({ k: ACL_POLICY_ACCOUNT_DELETE, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_ACCOUNT].push({ k: ACL_POLICY_ACCOUNT_CHANGEPW, v: 0 });

  wholeACL[ACL_POLOCIY_GROUPCODE_USER].push({ k: ACL_POLICY_USER_VIEWLIST, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_USER].push({ k: ACL_POLICY_USER_VIEWDETAIL, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_USER].push({ k: ACL_POLICY_USER_MANAGEBLACKLIST, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_USER].push({ k: ACL_POLICY_USER_UPDATE, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_USER].push({ k: ACL_POLICY_USER_PAYLOG_VIEWLIST, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_USER].push({ k: ACL_POLICY_USER_REWARDTOUSERGROUP, v: 0 });

  wholeACL[ACL_POLOCIY_GROUPCODE_NOTIFICATION].push({ k: ACL_POLICY_NOTIFICATION_MAINTAIN_REGISTER, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_NOTIFICATION].push({ k: ACL_POLICY_NOTIFICATION_MAINTAIN_DELETE, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_NOTIFICATION].push({ k: ACL_POLICY_NOTIFICATION_LOBBY_REGISTER, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_NOTIFICATION].push({ k: ACL_POLICY_NOTIFICATION_LOBBY_DELETE, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_NOTIFICATION].push({ k: ACL_POLICY_NOTIFICATION_WEBSITE_REGISTER, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_NOTIFICATION].push({ k: ACL_POLICY_NOTIFICATION_WEBSITE_DELETE, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_NOTIFICATION].push({ k: ACL_POLICY_NOTIFICATION_LINESCROLL_REGISTER, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_NOTIFICATION].push({ k: ACL_POLICY_NOTIFICATION_LINESCROLL_DELETE, v: 0 });

  wholeACL[ACL_POLOCIY_GROUPCODE_MESSAGE_INBOX].push({ k: ACL_POLICY_MESSAGE_INBOX_SEND, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_MESSAGE_INBOX].push({ k: ACL_POLICY_MESSAGE_INBOX_UPDATE, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_MESSAGE_INBOX].push({ k: ACL_POLICY_MESSAGE_INBOX_DELETE, v: 0 });

  wholeACL[ACL_POLOCIY_GROUPCODE_MESSAGE_PUSH].push({ k: ACL_POLICY_MESSAGE_PUSH_SEND, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_MESSAGE_PUSH].push({ k: ACL_POLICY_MESSAGE_PUSH_UPDATE, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_MESSAGE_PUSH].push({ k: ACL_POLICY_MESSAGE_PUSH_DELETE, v: 0 });

  wholeACL[ACL_POLOCIY_GROUPCODE_EVENT_LOGINREWARD].push({ k: ACL_POLICY_EVENT_LOGINREWARD_REGISTER, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_EVENT_LOGINREWARD].push({ k: ACL_POLICY_EVENT_LOGINREWARD_UPDATE, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_EVENT_LOGINREWARD].push({ k: ACL_POLICY_EVENT_LOGINREWARD_DELETE, v: 0 });

  wholeACL[ACL_POLOCIY_GROUPCODE_ACTIVITYLOG].push({ k: ACL_POLICY_ACTIVITYLOG_VIEWLIST, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_ACTIVITYLOG].push({ k: ACL_POLICY_SYSTEMLOG_VIEWLIST, v: 0 });

  wholeACL[ACL_POLOCIY_GROUPCODE_SETTING].push({ k: ACL_POLICY_SETTING_VIEW, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_SETTING].push({ k: ACL_POLICY_SETTING_UPDATE, v: 0 });

  wholeACL[ACL_POLOCIY_GROUPCODE_NFT].push({ k: ACL_POLOCIY_NFT_MINT, v: 0 });
  wholeACL[ACL_POLOCIY_GROUPCODE_NFT].push({ k: ACL_POLOCIY_NFT_BURN, v: 0 });

  return wholeACL;
};

// {ACC:{'P020100':1},USR:{'P030102':0}}

const groupCodeTable: object[] = [
  { k: 'P02', v: ACL_POLOCIY_GROUPCODE_ACCOUNT },
  { k: 'P03', v: ACL_POLOCIY_GROUPCODE_USER },
  { k: 'P04', v: ACL_POLOCIY_GROUPCODE_NOTIFICATION },
  { k: 'P05', v: ACL_POLOCIY_GROUPCODE_MESSAGE_INBOX },
  { k: 'P06', v: ACL_POLOCIY_GROUPCODE_MESSAGE_PUSH },
  { k: 'P07', v: ACL_POLOCIY_GROUPCODE_EVENT_LOGINREWARD },
  { k: 'P08', v: ACL_POLOCIY_GROUPCODE_ACTIVITYLOG },
  { k: 'P09', v: ACL_POLOCIY_GROUPCODE_SETTING },
  { k: 'P10', v: ACL_POLOCIY_GROUPCODE_NFT },
];

export const getGroupCode = (aclPolicyKey: string): string | null => {
  const prefix = aclPolicyKey.substring(0, 3);
  const result = groupCodeTable.filter((e: any) => e.k === prefix);
  if (result === null || result.length === 0) {
    return null;
  } else {
    const obj: any = result[0];
    return obj['v'];
  }
};

export const isValidGroupCode = (groupCode: string): boolean => {
  const result = groupCodeTable.filter((e: any) => e['k'] === groupCode);
  if (result === null || result.length === 0) {
    return false;
  } else {
    return true;
  }
};

export const updateACL = (baseACL: any, aclToUpdate: any): any => {
  let newACL = { ...baseACL };

  let groupACL;
  for (let acl of aclToUpdate) {
    newACL = updateACLUnitValue(newACL, acl.k, acl.v);
  }

  return newACL;
};

export const updateACLUnitValue = (acl: any, unitKey: string, unitValue: number): object | null => {
  if (acl === null || acl === undefined || unitKey === null || unitKey === undefined || (unitValue !== 0 && unitValue !== 1)) {
    return null;
  }

  const groupCode = getGroupCode(unitKey);

  console.log('groupCode=', groupCode);
  if (groupCode === null) {
    return null;
  }

  const aclGroup = getACLGroup(acl, groupCode);
  for (let aclUnit of aclGroup) {
    if (aclUnit.k === unitKey) {
      aclUnit.v = unitValue;
      break;
    }
  }

  const newACL = { ...acl };
  newACL[groupCode] = aclGroup;

  return newACL;
};

export const getACLGroup = (acl: any, group: string): any => {
  return acl[group];
};

export const getACLUnitValue = (acl: any, unitKey: string): number => {
  if (acl === null || acl === undefined || unitKey === null || unitKey === undefined) {
    return 0;
  }

  const groupCode = getGroupCode(unitKey);
  if (groupCode === null) {
    return 0;
  }

  const aclGroup = getACLGroup(acl, groupCode);
  for (let aclUnit of aclGroup) {
    if (aclUnit.k === unitKey) {
      return aclUnit.v;
    }
  }
  return 0;
};

// ACL목록에 해당 액션정책이 활성화되어 있는지 체크
export const checkAccessibleWithACL = (aclJsonStr: string, aclPolicyKey: string): boolean => {
  //onsole.log('checkAccessibleWithACL() acl:', aclJsonStr, 'checkKey:', aclPolicyKey);
  if (aclPolicyKey === null || aclPolicyKey === undefined || aclPolicyKey.trim() === '') {
    return false;
  }

  if (aclPolicyKey === ACL_POLICY_ALL) {
    return true;
  }

  try {
    const aclObj = JSON.parse(aclJsonStr);
    if (getACLUnitValue(aclObj, aclPolicyKey) === 1) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    return false;
  }
};

// ACL문자열이 유효한지 체크
export const isValidaACLFormat = (aclStr: string): boolean => {
  let baseACLObj = createBaseACLObj();

  console.log('aclStr=',aclStr);
  console.log('baseACLObj=',baseACLObj);

  try {
    let aclKeyFound;
    let baseACLGroupList = null;
    let checkACLGroupList = null;
    const checkACLObj = JSON.parse(aclStr);
    const baseACLGroupKeys = Object.keys(baseACLObj);
    for (let baseKey of baseACLGroupKeys) {
      if (checkACLObj.hasOwnProperty !== undefined && checkACLObj.hasOwnProperty(baseKey) === false) {
        console.log('[FAIL] groupKey=',baseKey);
        return false;
      }

      baseACLGroupList = baseACLObj[baseKey];
      checkACLGroupList = checkACLObj[baseKey];
      for (let baseACLUnit of baseACLGroupList) {
        aclKeyFound = false;
        for (let checkACLUnit of checkACLGroupList) {
          if (checkACLUnit.k === baseACLUnit.k && (checkACLUnit.v === 1 || checkACLUnit.v === 0)) {
            aclKeyFound = true;
          }
        }
        if (aclKeyFound == false) {
          console.log('[FAIL] unitKey=',baseACLUnit.k);
          return false;
        }
      }
    }
  } catch (err) {
    return false;
  }
  return true;
};
