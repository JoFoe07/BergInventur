Ext.define('BergInventurModern.store.Employees', {
    extend: 'Ext.data.Store',

    requires: [
        'BergInventurModern.model.Employee'
    ],

    model: 'BergInventurModern.model.Employee',
    autoLoad: false,
    pageSize: 25
});
