"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.live_gameserver_dbinfo =
  exports.dev_gameserver_dbinfo =
  exports.live_admin_dbinfo =
  exports.qa_admin_dbinfo =
  exports.dev_admin_dbinfo =
  exports.local_admin_dbinfo =
    void 0;

const rds_dbinfo = {
  host: "ec2-3-34-5-65.ap-northeast-2.compute.amazonaws.com",
  port: "3306",
  user: "nstep_admin",
  password: "dpstmxpq2wpsh!1A",
  charset: "utf8mb4",
  multipleStatements: true,
  waitForConnections: true,
  enableKeepAlive: true,
  connectionLimit: "30", //
};

const rds_live_dbinfo = {
  //host: 'xeno-live-db.cluster-chxbinnbiczu.ap-northeast-2.rds.amazonaws.com',
  host: "ec2-3-36-168-63.ap-northeast-2.compute.amazonaws.com",
  port: "3306",
  user: "nstep_admin",
  password: "dpstmxpq2wpsh!1A",
  charset: "utf8mb4", // 이모지같은 문자를 표시해야할 때 utf8mb4
  multipleStatements: true,
  waitForConnections: true, // 풀에 여유 커넥션이 없는 경우 대기할지 여부
  enableKeepAlive: true,
  connectionLimit: "30", //
};

exports.local_admin_dbinfo = {
  host: "172.30.1.126",
  port: "3306",
  user: "nStep",
  password: "qwer!234",
  adminDatabase: "xeno_admin",
  gameDatabase: "projectn_temp",
  gameBlockchainDatabase: "xeno_blockchain",
  gameUserDatabase: "xeno_user",
  gameLogDatabase: "xeno_log",
  charset: "utf8mb4",
  multipleStatements: true,
  waitForConnections: true,
  enableKeepAlive: true,
  connectionLimit: "30", //
};
exports.review_admin_dbinfo = {
  host: rds_dbinfo.host,
  port: rds_dbinfo.port,
  user: rds_dbinfo.user,
  password: rds_dbinfo.password,
  adminDatabase: "xeno_admin_dev",
  gameDatabase: "projectn_temp",
  gameBlockchainDatabase: "xeno_blockchain_review",
  gameUserDatabase: "xeno_user_review",
  gameLogDatabase: "xeno_log_review",
  charset: rds_dbinfo.charset,
  multipleStatements: rds_dbinfo.multipleStatements,
  waitForConnections: rds_dbinfo.waitForConnections,
  enableKeepAlive: rds_dbinfo.enableKeepAlive,
  connectionLimit: rds_dbinfo.connectionLimit,
};
exports.qa_admin_dbinfo = {
  host: rds_dbinfo.host,
  port: rds_dbinfo.port,
  user: rds_dbinfo.user,
  password: rds_dbinfo.password,
  adminDatabase: "xeno_admin_qa",
  gameDatabase: "projectn_temp",
  gameBlockchainDatabase: "xeno_blockchain_qa",
  gameUserDatabase: "xeno_user_qa",
  gameLogDatabase: "xeno_log_qa",
  charset: rds_dbinfo.charset,
  multipleStatements: rds_dbinfo.multipleStatements,
  waitForConnections: rds_dbinfo.waitForConnections,
  enableKeepAlive: rds_dbinfo.enableKeepAlive,
  connectionLimit: rds_dbinfo.connectionLimit,
};
exports.live_admin_dbinfo = {
  host: rds_live_dbinfo.host,
  port: rds_live_dbinfo.port,
  user: rds_live_dbinfo.user,
  password: rds_live_dbinfo.password,

  adminDatabase: "xeno_admin",
  gameDatabase: "projectn_temp",
  gameBlockchainDatabase: "xeno_blockchain",
  gameUserDatabase: "xeno_user",
  gameLogDatabase: "xeno_log",
  charset: rds_live_dbinfo.charset,
  multipleStatements: rds_live_dbinfo.multipleStatements,
  waitForConnections: rds_live_dbinfo.waitForConnections,
  enableKeepAlive: rds_live_dbinfo.enableKeepAlive,
  connectionLimit: rds_live_dbinfo.connectionLimit,
};
// 테스트용임! 실제로 사용하면 않됨!
exports.dev_gameserver_dbinfo = {
  host: rds_dbinfo.host,
  port: rds_dbinfo.port,
  user: rds_dbinfo.user,
  password: rds_dbinfo.password,
  gameDatabase: "xeno_resource_qa",
  charset: rds_dbinfo.charset,
  multipleStatements: rds_dbinfo.multipleStatements,
  waitForConnections: rds_dbinfo.waitForConnections,
  enableKeepAlive: rds_dbinfo.enableKeepAlive,
  connectionLimit: rds_dbinfo.connectionLimit,
};
// 테스트용임! 실제로 사용하면 않됨!
exports.live_gameserver_dbinfo = {
  host: rds_live_dbinfo.host,
  port: rds_live_dbinfo.port,
  user: rds_live_dbinfo.user,
  password: rds_live_dbinfo.password,

  gameDatabase: "xeno_resource_cbt",
  charset: rds_live_dbinfo.charset,
  multipleStatements: rds_live_dbinfo.multipleStatements,
  waitForConnections: rds_live_dbinfo.waitForConnections,
  enableKeepAlive: rds_live_dbinfo.enableKeepAlive,
  connectionLimit: rds_live_dbinfo.connectionLimit,
};

// DEV 마켓
exports.dev_market_dbinfo = {
  host: "3.36.168.63",
  port: "3306",
  user: "root",
  password: "development",

  marketDatabase: "xenodragondev",
  charset: "utf8mb4", // 이모지같은 문자를 표시해야할 때 utf8mb4
  multipleStatements: true,
  waitForConnections: true, // 풀에 여유 커넥션이 없는 경우 대기할지 여부
  enableKeepAlive: true,
  connectionLimit: "30", //
};

// QA 마켓
exports.qa_market_dbinfo = {
  host: "3.36.168.63",
  port: "3306",
  user: "root",
  password: "development",

  marketDatabase: "xenodragonqa",
  charset: rds_dbinfo.charset,
  multipleStatements: rds_dbinfo.multipleStatements,
  waitForConnections: rds_dbinfo.waitForConnections,
  enableKeepAlive: rds_dbinfo.enableKeepAlive,
  connectionLimit: rds_dbinfo.connectionLimit,
};

// 리뷰 마켓
exports.review_market_dbinfo = {
  host: "15.164.35.227",
  port: "3306",
  user: "admin",
  password: "sping0916",

  marketDatabase: "xenodragon",
  charset: rds_dbinfo.charset,
  multipleStatements: rds_dbinfo.multipleStatements,
  waitForConnections: rds_dbinfo.waitForConnections,
  enableKeepAlive: rds_dbinfo.enableKeepAlive,
  connectionLimit: rds_dbinfo.connectionLimit,
};

// LIVE 마켓
exports.live_market_dbinfo = {
  host: rds_live_dbinfo.host,
  port: "3306",
  user: rds_live_dbinfo.user,
  password: rds_live_dbinfo.password,

  marketDatabase: "xenodragon",
  charset: rds_live_dbinfo.charset,
  multipleStatements: rds_live_dbinfo.multipleStatements,
  waitForConnections: rds_live_dbinfo.waitForConnections,
  enableKeepAlive: rds_live_dbinfo.enableKeepAlive,
  connectionLimit: rds_live_dbinfo.connectionLimit,
};
