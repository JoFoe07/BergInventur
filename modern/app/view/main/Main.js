Ext.define('BergInventurModern.view.main.Main', {
    extend: 'Ext.Container',
    xtype: 'app-main',

    statics: {
        berlinDateTimeFormatter: null,

        formatInventoryInfo: function(values) {
            var timestamp,
                info,
                match,
                year,
                month,
                day,
                hour,
                minute,
                second,
                millisecond,
                parsed,
                formatter,
                dateParts,
                formattedParts,
                index,
                part;

            values = values || {};
            timestamp = values.gezaehlt_am;
            info = values.info !== null && values.info !== undefined ?
                String(values.info) : '';

            if (!info) {
                return '';
            }

            if (!timestamp || typeof timestamp !== 'object' ||
                    String(timestamp.timezone || '').toUpperCase() !== 'UTC' ||
                    typeof timestamp.date !== 'string') {
                return Ext.String.htmlEncode(info);
            }

            match = timestamp.date.match(
                /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?$/
            );

            if (!match) {
                return Ext.String.htmlEncode(info);
            }

            year = Number(match[1]);
            month = Number(match[2]);
            day = Number(match[3]);
            hour = Number(match[4]);
            minute = Number(match[5]);
            second = Number(match[6]);
            millisecond = Number(((match[7] || '') + '000').substring(0, 3));
            parsed = new Date(Date.UTC(
                year,
                month - 1,
                day,
                hour,
                minute,
                second,
                millisecond
            ));

            if (isNaN(parsed.getTime()) ||
                    parsed.getUTCFullYear() !== year ||
                    parsed.getUTCMonth() !== month - 1 ||
                    parsed.getUTCDate() !== day ||
                    parsed.getUTCHours() !== hour ||
                    parsed.getUTCMinutes() !== minute ||
                    parsed.getUTCSeconds() !== second) {
                return Ext.String.htmlEncode(info);
            }

            try {
                if (typeof Intl === 'undefined' || !Intl.DateTimeFormat) {
                    return Ext.String.htmlEncode(info);
                }

                formatter = this.berlinDateTimeFormatter;

                if (!formatter) {
                    formatter = this.berlinDateTimeFormatter = new Intl.DateTimeFormat(
                        'en-GB-u-ca-gregory-nu-latn',
                        {
                            timeZone: 'Europe/Berlin',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                        }
                    );
                }

                if (typeof formatter.formatToParts !== 'function') {
                    return Ext.String.htmlEncode(info);
                }

                dateParts = formatter.formatToParts(parsed);
                formattedParts = {};

                for (index = 0; index < dateParts.length; index += 1) {
                    part = dateParts[index];
                    formattedParts[part.type] = part.value;
                }

                if (!formattedParts.hour ||
                        !formattedParts.minute) {
                    return Ext.String.htmlEncode(info);
                }

                return Ext.String.htmlEncode(
                    info + ' ' + formattedParts.hour + ':' + formattedParts.minute
                );
            } catch (error) {
                return Ext.String.htmlEncode(info);
            }
        }
    },

    requires: [
        'BergInventurModern.view.main.MainController',
        'BergInventurModern.view.count.Count',
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
            cls: 'bi-search-titlebar',
            docked: 'top',
            title: 'BergInventur'
        },
        {
            xtype: 'container',
            reference: 'searchContent',
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
                            xtype: 'container',
                            cls: 'bi-search-session-summary',
                            layout: {
                                type: 'hbox',
                                align: 'center'
                            },
                            items: [
                                {
                                    xtype: 'component',
                                    itemId: 'sessionSummaryText',
                                    cls: 'bi-search-session-summary-text',
                                    flex: 1
                                },
                                {
                                    xtype: 'button',
                                    itemId: 'sessionToggleButton',
                                    cls: 'bi-search-session-toggle',
                                    text: 'Mehr ›',
                                    listeners: {
                                        tap: 'onSessionDetailsToggle'
                                    }
                                }
                            ]
                        },
                        {
                            xtype: 'container',
                            itemId: 'sessionDetails',
                            cls: 'bi-search-session-details',
                            hidden: true,
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
                        }
                    ]
                },
                {
                    xtype: 'checkboxfield',
                    reference: 'articleModeField',
                    cls: 'bi-search-mode',
                    label: 'Lagerfach des Artikels suchen?',
                    labelAlign: 'left',
                    labelWidth: '85%',
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
                    placeHolder: 'Lagerfach min. 6 Zeichen eingeben',
                    listeners: {
                        keyup: 'onSearchKeyup'
                    }
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
                        '  <tpl if="info">',
                        '    <div class="bi-search-result-info">{[BergInventurModern.view.main.Main.formatInventoryInfo(values)]}</div>',
                        '  </tpl>',
                        '</div>'
                    ],
                    listeners: {
                        itemtap: 'onResultItemTap',
                        itemtaphold: 'onResultItemTapHold'
                    }
                }
            ]
        },
        {
            xtype: 'inventory-count',
            reference: 'countView',
            flex: 1,
            hidden: true
        }
    ],

    listeners: {
        activate: 'onSearchActivate'
    },

    setLoginResult: function(employeeName, standortName) {
        this.down('#sessionSummaryText').setHtml(
            Ext.String.htmlEncode(employeeName + ' · ' + standortName)
        );
        this.down('#employeeName').setHtml(Ext.String.htmlEncode(employeeName));
        this.down('#standortName').setHtml(Ext.String.htmlEncode(standortName));
        this.down('#sessionDetails').setHidden(true);
        this.down('#sessionToggleButton').setText('Mehr ›');
    }
});
