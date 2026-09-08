Ext.define('BergInventurModern.view.count.Count', {
    extend: 'Ext.Container',
    xtype: 'inventory-count',

    requires: [
        'Ext.Button',
        'Ext.Component',
        'Ext.field.Number'
    ],

    cls: 'bi-count-content',
    padding: 12,
    scrollable: 'vertical',
    layout: {
        type: 'vbox',
        align: 'stretch'
    },

    items: [
        {
            xtype: 'component',
            cls: 'bi-count-title',
            html: 'Blindzählung'
        },
        {
            xtype: 'component',
            reference: 'countEmployeeDisplay',
            cls: 'bi-count-row'
        },
        {
            xtype: 'component',
            reference: 'countStandortDisplay',
            cls: 'bi-count-row'
        },
        {
            xtype: 'component',
            reference: 'countBinDisplay',
            cls: 'bi-count-bin'
        },
        {
            xtype: 'component',
            reference: 'countManufacturerDisplay',
            cls: 'bi-count-row'
        },
        {
            xtype: 'component',
            reference: 'countDescriptionDisplay',
            cls: 'bi-count-description'
        },
        {
            xtype: 'component',
            cls: 'bi-count-expected',
            html: '<strong>Soll:</strong> ????'
        },
        {
            xtype: 'numberfield',
            reference: 'countField',
            cls: 'bi-count-field',
            label: 'gezählte Menge',
            labelAlign: 'top',
            clearIcon: true,
            required: true,
            value: '',
            listeners: {
                change: 'onCountValueChange'
            }
        },
        {
            xtype: 'component',
            reference: 'countStatusDisplay',
            cls: 'bi-count-status',
            hidden: true
        },
        {
            xtype: 'button',
            reference: 'countCheckButton',
            cls: 'bi-count-button',
            ui: 'action',
            text: 'Prüfen',
            listeners: {
                tap: 'onCountCheck'
            }
        },
        {
            xtype: 'button',
            reference: 'countSaveButton',
            cls: 'bi-count-button',
            ui: 'action',
            text: 'Speichern',
            hidden: true,
            disabled: true,
            listeners: {
                tap: 'onCountSave'
            }
        },
        {
            xtype: 'button',
            reference: 'countBackButton',
            cls: 'bi-count-button',
            text: 'Zurück',
            listeners: {
                tap: 'onCountBack'
            }
        }
    ]
});
