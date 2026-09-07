Ext.define('BergInventurModern.view.main.Main', {
    extend: 'Ext.Container',
    xtype: 'app-main',

    requires: [
        'Ext.Component',
        'Ext.TitleBar'
    ],

    cls: 'bi-login-success',
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
            cls: 'bi-login-success-content',
            padding: 24,
            items: [
                {
                    xtype: 'component',
                    cls: 'bi-login-title',
                    html: 'BergInventur'
                },
                {
                    xtype: 'component',
                    html: '<strong>Mitarbeiter:</strong>'
                },
                {
                    xtype: 'component',
                    itemId: 'employeeName',
                    cls: 'bi-login-result-value'
                },
                {
                    xtype: 'component',
                    html: '<strong>Standort:</strong>'
                },
                {
                    xtype: 'component',
                    itemId: 'standortName',
                    cls: 'bi-login-result-value'
                },
                {
                    xtype: 'component',
                    cls: 'bi-login-success-message',
                    html: 'Phase 2A Login erfolgreich'
                },
                {
                    xtype: 'component',
                    html: 'Noch keine Inventur-Geschäftslogik aktiv'
                }
            ]
        }
    ],

    setLoginResult: function(employeeName, standortName) {
        this.down('#employeeName').setHtml(Ext.String.htmlEncode(employeeName));
        this.down('#standortName').setHtml(Ext.String.htmlEncode(standortName));
    }
});
