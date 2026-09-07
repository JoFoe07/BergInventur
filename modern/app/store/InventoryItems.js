Ext.define('BergInventurModern.store.InventoryItems', {
    extend: 'Ext.data.Store',

    requires: [
        'BergInventurModern.model.InventoryItem',
        'Ext.data.proxy.Ajax',
        'Ext.data.reader.Json'
    ],

    model: 'BergInventurModern.model.InventoryItem',
    autoLoad: false,
    autoSync: false,
    pageSize: 25,

    proxy: {
        type: 'ajax',
        actionMethods: {
            read: 'GET'
        },
        reader: {
            type: 'json',
            rootProperty: 'artikel',
            totalProperty: 'total'
        }
    }
});
