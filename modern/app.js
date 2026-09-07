Ext.namespace('BergInventurModern');

BergInventurModern.version = '1.0.1.0';
BergInventurModern.build = 'Phase 2A';
BergInventurModern.config = {
    serviceBaseUrl: '/LagerTool/resources/services'
};
BergInventurModern.session = {
    scanValue: null,
    employeeCode: null,
    employeeName: null,
    standort: null
};
BergInventurModern.getServiceUrl = function(path) {
    return BergInventurModern.config.serviceBaseUrl.replace(/\/$/, '') + '/' + String(path || '').replace(/^\//, '');
};

Ext.application({
    extend: 'BergInventurModern.Application',
    name: 'BergInventurModern',

    requires: [
        'BergInventurModern.*'
    ],

    mainView: 'BergInventurModern.view.login.Login'
});
