Ext.namespace('BergInventurModern');

BergInventurModern.version = '1.0.9.3';
BergInventurModern.build = 'Phase 3D.2.1';
BergInventurModern.config = {
    loginServiceBaseUrl: '/LagerTool/resources/services',
    inventoryServiceBaseUrl: 'resources/services'
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
