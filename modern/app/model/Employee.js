Ext.define('BergInventurModern.model.Employee', {
    extend: 'Ext.data.Model',

    requires: [
        'Ext.data.field.Field',
        'Ext.data.proxy.Ajax',
        'Ext.data.reader.Json'
    ],

    fields: [
        {
            name: 'Pick_Batch_Identifier_Id',
            type: 'string'
        },
        {
            name: 'Name',
            type: 'string'
        },
        {
            name: 'Code',
            type: 'string'
        },
        {
            name: 'db',
            type: 'string'
        }
    ],

    proxy: {
        type: 'ajax',
        actionMethods: {
            read: 'GET'
        },
        reader: {
            type: 'json',
            rootProperty: 'aktiv',
            totalProperty: 'total',
            successProperty: 'success'
        }
    }
});
