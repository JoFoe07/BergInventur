Ext.define('BergInventurModern.view.main.Main', {
    extend: 'Ext.Container',
    xtype: 'app-main',

    requires: [
        'Ext.Component',
        'Ext.TitleBar'
    ],

    layout: 'fit',

    items: [
        {
            xtype: 'titlebar',
            docked: 'top',
            title: 'BergInventur Modern'
        },
        {
            xtype: 'component',
            padding: 24,
            html: [
                '<h1>BergInventur Modern</h1>',
                '<p>Technischer Phase-1B-Build</p>',
                '<p>Keine Inventur-Geschäftslogik aktiv</p>'
            ].join('')
        }
    ]
});
