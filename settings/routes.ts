const apiRoot='/api';

const routeTable:any[] = [
    {
        path:`${apiRoot}/auth`,
        name:'auth/AuthServiceController'
    },
    {
        path:`${apiRoot}/account`,
        name:'accounts/AccountServiceController'
    },
    {
        path:`${apiRoot}/user`,
        name:'users/UserManagementServiceController'
    },
    {
        path:`${apiRoot}/noti`,
        name:'notifications/NotificationServiceController'
    },
    {
        path:`${apiRoot}/message`,
        name:'messages/UserMessageServiceController'
    },
    {
        path:`${apiRoot}/event`,
        name:'events/EventServiceController'
    },
    {
        path:`${apiRoot}/log`,
        name:'logs/LogServiceController'
    },
    {
        path:`${apiRoot}/tool`,
        name:'tools/ToolServiceController'
    },
    {
        path:`${apiRoot}/setting`,
        name:'settings/SettingServiceController'
    },
    {
        path:`${apiRoot}/nft`,
        name:'nft/NFTServiceController'
    },
    {
        path:`${apiRoot}/wallet`,
        name:'wallet/WalletServiceController'
    },
    {
        path:`${apiRoot}/blockchain`,
        name:'blockchain/BlockchainServiceController'
    },
    {
        path:`${apiRoot}/statistics`,
        name:'statistics/StatisticsServiceController'
    }
];

export default routeTable;