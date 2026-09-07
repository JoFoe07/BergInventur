Ext.namespace('BergInventurModern');

BergInventurModern.version = '1.0.3.0';
BergInventurModern.build = 'Phase 2C-1';
BergInventurModern.config = {
    loginServiceBaseUrl: '/LagerTool/resources/services',
    inventoryServiceBaseUrl: '/BergInventur/resources/services'
};
BergInventurModern.session = {
    scanValue: null,
    employeeCode: null,
    employeeName: null,
    standort: null
};
BergInventurModern.getServiceUrl = function(baseUrl, path) {
    return String(baseUrl || '').replace(/\/$/, '') + '/' + String(path || '').replace(/^\//, '');
};

Ext.application({
    extend: 'BergInventurModern.Application',
    name: 'BergInventurModern',

    requires: [
        'BergInventurModern.*'
    ],

    mainView: 'BergInventurModern.view.login.Login'
});
