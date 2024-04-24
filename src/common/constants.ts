export const NFT_MINT_STATE_CREATED = 0;
export const NFT_MINT_STATE_METADATAUPLOADED = 1;
export const NFT_MINT_STATE_MINTED = 2;
export const NFT_MINT_STATE_TRANSFERED = 3;

// NFT 활동로그 타입
export const NFT_ACTIVITYTYPE_MINTING = 0;
export const NFT_ACTIVITYTYPE_BURNING = 1;

// NFT 컨트랙트 op type
export const NFT_CONTRACT_OPTYPE_MINTING = 0;
export const NFT_CONTRACT_OPTYPE_OPERATING = 1;
export const NFT_CONTRACT_OPTYPE_ERC20_TRANSFER = 2;
export const NFT_CONTRACT_OPTYPE_MARKET_VIEW = 4;
export const NFT_CONTRACT_OPTYPE_MARKET_DRAGON = 5;
export const NFT_CONTRACT_OPTYPE_MARKET_GEAR = 6;
export const NFT_CONTRACT_OPTYPE_MARKET_LAND = 7;
export const NFT_CONTRACT_OPTYPE_MARKET_PACKAGE = 8;
export const NFT_CONTRACT_OPTYPE_MARKET_C2C = 10;

// 메세지 대상 타입
export const MSGTARGET_TYPE_ALL = 1;
export const MSGTARGET_TYPE_ANDROID = 2;
export const MsGTARGET_TYPE_IOS = 3;
export const MSGTARGET_TYPE_USER = 4;

// 환경설정 상수값
export const SETTINGS_GROUP_BKL = "BKL";
export const SETTINGS_GROUP_INB = "INB";
export const SETTINGS_GROUP_PAM = "PAM";
export const SETTINGS_GROUP_NFT = "NFT";
export const SETTINGS_GROUP_TOKEN = "TOKEN";

export const SETTINGS_ITEM_AUTORELEASE = "auto_release";
export const SETTINGS_ITEM_AUTOEXPIRE = "auto_expire";
export const SETTINGS_ITEM_AUTOREMOVE = "auto_remove";
export const SETTINGS_ITEM_CONTRACTADDRESS = "contract_address";
export const SETTINGS_ITEM_METADATABASEURI = "metadata_base_uri";
export const SETTINGS_ITEM_MINTINGNUMUNIT = "minting_num_unit";
export const SETTINGS_ITEM_XDSRANGE = "from_xds_range";
export const SETTINGS_ITEM_XDCRANGE = "from_xdc_range";
export const SETTINGS_ITEM_EXCRATE = "exchange_rate";
export const SETTINGS_ITEM_FEETYPE = "fee_type";
export const SETTINGS_ITEM_FEEVALUE = "fee_rate";
export const SETTINGS_ITEM_GASAMOUNT = "gas_amount";
export const SETTINGS_ITEM_GASFEE = "gas_fee";

// 서버 타입
export const SERVER_TYPE_INTERNAL = "LOCAL";
export const SERVER_TYPE_QA = "QA";
export const SERVER_TYPE_REVIEW = "REVIEW";
export const SERVER_TYPE_LIVE = "LIVE";

// 기어 타입
export const GEAR_TYPE_HEAD = "Head";
export const GEAR_TYPE_BODY = "Body";
export const GEAR_TYPE_WING = "Wing";
export const GEAR_TYPE_TAIL = "Tail";