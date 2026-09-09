Ext.define('BergInventurModern.model.InventoryItem', {
    extend: 'Ext.data.Model',

    fields: [
        { name: 'fachnummer' },
        { name: 'carlanr' },
        { name: 'art_herst_art_nr' },
        { name: 'art_text1' },
        { name: 'menge' },
        { name: 'me_we' },
        { name: 'gezaehlt' },
        { name: 'wurde_gezaehlt' },
        { name: 'gezaehlt_am' },
        { name: 'zaehler' },
        { name: 'info' },
        { name: 'lagerort' },
        { name: 'ze' },
        { name: 'Activity_Type' },
        { name: 'gew_lieferdatum' },
        { name: 'barcodes' }
    ]
});
