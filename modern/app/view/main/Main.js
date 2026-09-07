Ext.define('BergInventurModern.view.main.Main', {
    extend: 'Ext.Container',
    xtype: 'app-main',

    requires: [
        'BergInventurModern.view.main.MainController',
        'Ext.Button',
        'Ext.Component',
        'Ext.dataview.DataView',
        'Ext.field.Checkbox',
        'Ext.field.Search',
        'Ext.TitleBar'
    ],

    controller: 'inventory-search',
    cls: 'bi-inventory-search',
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
            cls: 'bi-search-content',
            flex: 1,
            padding: 12,
            layout: {
                type: 'vbox',
                align: 'stretch'
            },
            items: [
                {
                    xtype: 'container',
                    cls: 'bi-search-session',
                    items: [
                        {
                            xtype: 'component',
                            html: '<strong>Mitarbeiter:</strong>'
                        },
                        {
                            xtype: 'component',
                            itemId: 'employeeName',
                            cls: 'bi-search-session-value'
                        },
                        {
                            xtype: 'component',
                            html: '<strong>Standort:</strong>'
                        },
                        {
                            xtype: 'component',
                            itemId: 'standortName',
                            cls: 'bi-search-session-value'
                        },
                        {
                            xtype: 'component',
                            reference: 'versionDisplay',
                            cls: 'bi-search-version'
                        }
                    ]
                },
                {
                    xtype: 'checkboxfield',
                    reference: 'articleModeField',
                    cls: 'bi-search-mode',
                    label: 'Lagerfach des Artikels suchen?',
                    labelAlign: 'top',
                    checked: false,
                    listeners: {
                        check: 'onArticleModeCheck',
                        uncheck: 'onArticleModeUncheck'
                    }
                },
                {
                    xtype: 'searchfield',
                    reference: 'searchField',
                    cls: 'bi-search-field',
                    label: 'Suche',
                    labelAlign: 'top',
                    clearIcon: true,
                    placeHolder: 'Lagerfach min. 6 Zeichen eingeben'
                },
                {
                    xtype: 'button',
                    reference: 'searchButton',
                    cls: 'bi-search-button',
                    ui: 'action',
                    text: 'Suchen',
                    listeners: {
                        tap: 'onSearchTap'
                    }
                },
                {
                    xtype: 'component',
                    reference: 'messageDisplay',
                    cls: 'bi-search-message',
                    hidden: true
                },
                {
                    xtype: 'component',
                    reference: 'selectedResultDisplay',
                    cls: 'bi-search-selection',
                    hidden: true
                },
                {
                    xtype: 'dataview',
                    reference: 'resultsList',
                    cls: 'bi-search-results',
                    flex: 1,
                    scrollable: 'vertical',
                    deferEmptyText: true,
                    emptyText: 'Es wurden keine Artikel gefunden.',
                    itemTpl: [
                        '<div class="bi-search-result-card">',
                        '  <div class="bi-search-result-row"><strong>Hersteller-Art.-Nr.:</strong> {art_herst_art_nr:htmlEncode}</div>',
                        '  <div class="bi-search-result-row"><strong>Lagerfach:</strong> {fachnummer:htmlEncode}</div>',
                        '  <div class="bi-search-result-text">{art_text1:htmlEncode}</div>',
                        '  <tpl if="info"><div class="bi-search-result-info">{info:htmlEncode}</div></tpl>',
                        '</div>'
                    ],
                    listeners: {
                        itemtap: 'onResultItemTap',
                        itemtaphold: 'onResultItemTapHold'
                    }
                }
            ]
        }
    ],

    listeners: {
        activate: 'onSearchActivate'
    },

    setLoginResult: function(employeeName, standortName) {
        this.down('#employeeName').setHtml(Ext.String.htmlEncode(employeeName));
        this.down('#standortName').setHtml(Ext.String.htmlEncode(standortName));
    }
});
