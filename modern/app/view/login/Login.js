Ext.define('BergInventurModern.view.login.Login', {
    extend: 'Ext.Container',
    xtype: 'login-view',

    requires: [
        'BergInventurModern.view.login.LoginController',
        'Ext.Button',
        'Ext.Component',
        'Ext.field.Select',
        'Ext.field.Text',
        'Ext.Img',
        'Ext.TitleBar'
    ],

    controller: 'login',
    cls: 'bi-login',
    scrollable: 'vertical',
    layout: {
        type: 'vbox',
        align: 'stretch'
    },

    items: [
        {
            xtype: 'titlebar',
            docked: 'top',
            title: 'BergInventur'
        },
        {
            xtype: 'container',
            cls: 'bi-login-content',
            padding: 20,
            items: [
                {
                    xtype: 'component',
                    cls: 'bi-login-title',
                    html: 'BergInventur'
                },
                {
                    xtype: 'component',
                    reference: 'versionDisplay',
                    cls: 'bi-login-version'
                },
                {
                    xtype: 'component',
                    reference: 'errorDisplay',
                    cls: 'bi-login-error',
                    hidden: true
                },
                {
                    xtype: 'textfield',
                    reference: 'scanField',
                    cls: 'bi-login-field',
                    label: 'Mitarbeiter',
                    labelAlign: 'top',
                    required: true,
                    clearIcon: true,
                    placeHolder: 'bitte die ID-Karte scannen',
                    listeners: {
                        keyup: 'onScanKeyup'
                    }
                },
                {
                    xtype: 'image',
                    cls: 'bi-login-key-image',
                    width: 80,
                    height: 80,
                    src: 'resources/images/74sgetdtestra3251gffcbgcAS.png'
                },
                {
                    xtype: 'container',
                    reference: 'employeeDisplay',
                    cls: 'bi-login-selection',
                    hidden: true,
                    items: [
                        {
                            xtype: 'component',
                            cls: 'bi-login-selection-label',
                            html: 'Mitarbeiter'
                        },
                        {
                            xtype: 'component',
                            reference: 'employeeNameDisplay',
                            cls: 'bi-login-selection-value'
                        }
                    ]
                },
                {
                    xtype: 'selectfield',
                    reference: 'standortField',
                    cls: 'bi-login-field',
                    hidden: true,
                    label: 'Standort',
                    labelAlign: 'top',
                    autoSelect: false,
                    value: null,
                    defaultPhonePickerConfig: {
                        doneButton: 'Übernehmen',
                        cancelButton: 'Abbruch'
                    },
                    options: [
                        { text: 'Stendal', value: '10' },
                        { text: 'Dessau', value: '20' },
                        { text: 'Brandenburg', value: '30' },
                        { text: 'Magdeburg', value: '40' },
                        { text: 'Perleberg', value: '50' },
                        { text: 'Wildau', value: '60' },
                        { text: 'Lindenberg', value: '70' },
                        { text: 'Potsdam', value: '80' },
                        { text: 'Fürstenwalde', value: '90' }
                    ],
                    listeners: {
                        change: 'onStandortChange'
                    }
                },
                {
                    xtype: 'container',
                    reference: 'standortDisplay',
                    cls: 'bi-login-selection',
                    hidden: true,
                    items: [
                        {
                            xtype: 'component',
                            cls: 'bi-login-selection-label',
                            html: 'Standort'
                        },
                        {
                            xtype: 'component',
                            reference: 'standortNameDisplay',
                            cls: 'bi-login-selection-value'
                        }
                    ]
                },
                {
                    xtype: 'button',
                    reference: 'loginButton',
                    cls: 'bi-login-button',
                    hidden: true,
                    ui: 'action',
                    text: 'Weiter',
                    listeners: {
                        tap: 'onLoginTap'
                    }
                }
            ]
        }
    ],

    listeners: {
        activate: 'onLoginActivate'
    }
});
