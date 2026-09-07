Ext.define('BergInventurModern.view.main.MainController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.inventory-search',

    requires: [
        'BergInventurModern.store.InventoryItems',
        'Ext.MessageBox'
    ],

    init: function() {
        this.searchStore = null;
        this.searchInProgress = false;
    },

    onSearchActivate: function() {
        this.getSearchStore();
        this.lookupReference('versionDisplay').setHtml(
            'Version ' + Ext.String.htmlEncode(BergInventurModern.version) +
            ' / Build ' + Ext.String.htmlEncode(BergInventurModern.build)
        );
        this.hideMessage();
        this.hideSelectedResult();
    },

    onArticleModeCheck: function() {
        this.lookupReference('searchField').setPlaceHolder(
            'Hersteller-Nr. oder EAN eingeben, min. 4 Zeichen'
        );
    },

    onArticleModeUncheck: function() {
        this.lookupReference('searchField').setPlaceHolder(
            'Lagerfach min. 6 Zeichen eingeben'
        );
    },

    onSearchTap: function() {
        var articleMode = this.lookupReference('articleModeField').getChecked(),
            searchField = this.lookupReference('searchField'),
            keyword = String(searchField.getValue() || ''),
            validationValue = keyword.replace(/-/g, ''),
            minimumLength = articleMode ? 4 : 6,
            store = this.getSearchStore(),
            me = this;

        if (this.searchInProgress) {
            return;
        }

        store.removeAll();
        this.hideSelectedResult();

        if (validationValue.length < minimumLength) {
            this.showMessage(
                'Bitte mindestens ' + minimumLength + ' Zeichen eingeben. (' +
                validationValue.length + ')'
            );
            return;
        }

        this.searchInProgress = true;
        this.hideMessage();
        this.lookupReference('searchButton').setDisabled(true);

        store.getProxy().setUrl(
            BergInventurModern.getServiceUrl(
                BergInventurModern.config.inventoryServiceBaseUrl,
                'get_artikelnummern.php'
            )
        );
        store.load({
            params: {
                action: 'ListeArtikelnummern',
                keyword: keyword,
                standort: BergInventurModern.session.standort,
                artikelsuche: articleMode ? true : 'false'
            },
            callback: function(records, operation, success) {
                me.searchInProgress = false;
                me.lookupReference('searchButton').setDisabled(false);

                if (success !== true) {
                    me.showMessage('Die Suche konnte nicht durchgeführt werden.');
                    return;
                }

                if (!records || records.length === 0) {
                    me.showMessage('Es wurden keine Artikel gefunden.');
                }
            }
        });
    },

    onResultItemTap: function(dataview, index, target, record) {
        this.handleResultSelection(record);
    },

    onResultItemTapHold: function(dataview, index, target, record) {
        this.handleResultSelection(record);
    },

    handleResultSelection: function(record) {
        var articleMode = this.lookupReference('articleModeField').getChecked(),
            activityType = record.get('Activity_Type'),
            movement;

        this.hideSelectedResult();

        if (articleMode === true) {
            Ext.Msg.alert(
                'Lagerplatzsuche',
                'Bei der Lagerplatzsuche ist keine Erfassung der Bestände möglich'
            );
            return;
        }

        if (activityType !== null) {
            movement = activityType === 5 ? 'Kommissionierung' : 'Einlagerungen';
            Ext.Msg.alert(
                'Eine Inventur z.Z. nicht möglich !!!',
                'Am Lagerfach: ' + Ext.String.htmlEncode(String(record.get('fachnummer') || '')) +
                ' findet bis zum ' + Ext.String.htmlEncode(String(record.get('gew_lieferdatum') || '')) +
                ' eine ' + movement + ' statt!'
            );
            return;
        }

        this.showSelectedResult(record);
    },

    showSelectedResult: function(record) {
        var display = this.lookupReference('selectedResultDisplay'),
            rows = [],
            addRow = function(label, value) {
                if (value !== null && value !== undefined && String(value) !== '') {
                    rows.push(
                        '<div class="bi-search-selection-row"><strong>' + label +
                        ':</strong> ' + Ext.String.htmlEncode(String(value)) + '</div>'
                    );
                }
            };

        addRow('Lagerfach', record.get('fachnummer'));
        addRow('Artikelnummer', record.get('carlanr'));
        addRow('Hersteller-Art.-Nr.', record.get('art_herst_art_nr'));
        addRow('Bezeichnung', record.get('art_text1'));
        addRow('Lagerort', record.get('lagerort'));

        rows.push('<div class="bi-search-selection-status">Phase 2B – Suchdaten erfolgreich geladen</div>');
        rows.push('<div>Zählung noch nicht aktiv</div>');

        display.setHtml(rows.join(''));
        display.setHidden(false);
    },

    hideSelectedResult: function() {
        var display = this.lookupReference('selectedResultDisplay');

        display.setHtml('');
        display.setHidden(true);
    },

    showMessage: function(message) {
        var display = this.lookupReference('messageDisplay');

        display.setHtml(Ext.String.htmlEncode(message));
        display.setHidden(false);
    },

    hideMessage: function() {
        var display = this.lookupReference('messageDisplay');

        display.setHtml('');
        display.setHidden(true);
    },

    getSearchStore: function() {
        if (!this.searchStore) {
            this.searchStore = Ext.create('BergInventurModern.store.InventoryItems');
            this.lookupReference('resultsList').setStore(this.searchStore);
        }

        return this.searchStore;
    }
});
