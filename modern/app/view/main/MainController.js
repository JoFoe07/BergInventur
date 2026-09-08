Ext.define('BergInventurModern.view.main.MainController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.inventory-search',

    requires: [
        'BergInventurModern.store.InventoryItems',
        'Ext.Ajax',
        'Ext.MessageBox',
        'Ext.Toolbar'
    ],

    init: function() {
        this.searchStore = null;
        this.searchInProgress = false;
        this.countState = null;
        this.saveInProgress = false;
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

        this.beginCount(record, articleMode, activityType);
    },

    beginCount: function(record, articleMode, activityType) {
        var countField = this.lookupReference('countField'),
            countView = this.lookupReference('countView');

        this.saveInProgress = false;
        this.countState = {
            carlanr: record.get('carlanr'),
            menge_im_fach: record.get('menge'),
            gezaehlt: null,
            zaehler: BergInventurModern.session.employeeName,
            fachnummer: record.get('fachnummer'),
            art_text1: record.get('art_text1'),
            art_herst_art_nr: record.get('art_herst_art_nr'),
            lagerort: record.get('lagerort'),
            me_we: record.get('me_we'),
            ze: record.get('ze'),
            readyToSave: false,
            deviationConfirmed: false,
            articleMode: articleMode,
            activityType: activityType
        };

        this.setCountDisplay(
            'countEmployeeDisplay',
            'Mitarbeiter',
            BergInventurModern.session.employeeName
        );
        this.setCountDisplay(
            'countStandortDisplay',
            'Standort',
            BergInventurModern.session.standort
        );
        this.setCountDisplay('countBinDisplay', 'Lagerfach', this.countState.fachnummer);
        this.setCountDisplay(
            'countManufacturerDisplay',
            'Hersteller-Art.-Nr.',
            this.countState.art_herst_art_nr
        );
        this.setCountDisplay(
            'countDescriptionDisplay',
            'Artikelbezeichnung',
            this.countState.art_text1
        );

        countField.setValue('');
        this.hideCountStatus();
        this.hideCountSaveButton();
        this.setCountControlsDisabled(false);
        this.lookupReference('searchContent').setHidden(true);
        countView.setHidden(false);

        Ext.defer(function() {
            if (!countField.destroyed && !countView.getHidden()) {
                countField.focus();
            }
        }, 100);
    },

    onCountValueChange: function() {
        if (this.countState) {
            this.countState.readyToSave = false;
            this.countState.deviationConfirmed = false;
        }

        this.hideCountStatus();
        this.hideCountSaveButton();
    },

    onCountCheck: function() {
        var countField = this.lookupReference('countField'),
            rawValue = this.getRawCountValue(countField),
            me = this;

        if (!this.countState) {
            return;
        }

        this.countState.readyToSave = false;
        this.countState.deviationConfirmed = false;
        this.hideCountStatus();

        if (rawValue === '') {
            Ext.Msg.alert('Fehler', 'gezählt darf nicht leer sein', function() {
                countField.focus();
            });
            return;
        }

        this.countState.gezaehlt = rawValue;

        if (Number(rawValue) != Number(this.countState.menge_im_fach)) {
            Ext.Msg.show({
                title: 'Abweichungen in der Menge',
                message: Ext.String.htmlEncode(
                    String(BergInventurModern.session.employeeName || '')
                ) + ', ' +
                    'das Ergebnis stimmt nicht mit dem Bestand der NAV überein.' +
                    'Möchten Sie trotzdem den gezählten Bestand speichern?',
                width: 320,
                buttons: [
                    {
                        itemId: 'yes',
                        text: 'Ja'
                    },
                    {
                        itemId: 'no',
                        text: 'noch einmal zählen'
                    }
                ],
                fn: function(buttonId) {
                    if (buttonId === 'yes') {
                        me.markCountReady(true);
                    } else {
                        countField.focus();
                    }
                }
            });
            return;
        }

        this.markCountReady(false);
    },

    onCountBack: function() {
        var countField = this.lookupReference('countField');

        if (this.saveInProgress) {
            return;
        }

        countField.setValue('');
        this.countState = null;
        this.saveInProgress = false;
        this.hideCountStatus();
        this.hideCountSaveButton();
        this.lookupReference('countView').setHidden(true);
        this.lookupReference('searchContent').setHidden(false);
    },

    markCountReady: function(deviationConfirmed) {
        this.countState.readyToSave = true;
        this.countState.deviationConfirmed = deviationConfirmed;
        this.showCountStatus('Zählung geprüft – bereit zum Speichern.');
        this.lookupReference('countSaveButton').setHidden(false);
        this.lookupReference('countSaveButton').setDisabled(false);
    },

    onCountSave: function() {
        var me = this,
            payload;

        if (!this.canSaveCount()) {
            return;
        }

        payload = this.buildCountPayload(this.countState);
        this.saveInProgress = true;
        this.setCountControlsDisabled(true);

        try {
            Ext.Ajax.request({
                url: BergInventurModern.getServiceUrl(
                    BergInventurModern.config.inventoryServiceBaseUrl,
                    'get_artikelnummern.php'
                ) + '?action=create',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                jsonData: payload,
                success: function(response) {
                    me.handleCountSaveResponse(response);
                },
                failure: function(response) {
                    me.handleCountSaveTransportFailure(response);
                }
            });
        } catch (error) {
            this.handleCountSaveUncertain();
        }
    },

    canSaveCount: function() {
        var articleModeField = this.lookupReference('articleModeField');

        return this.countState !== null &&
            this.countState.readyToSave === true &&
            this.saveInProgress !== true &&
            this.countState.articleMode === false &&
            this.countState.activityType === null &&
            articleModeField.getChecked() === false;
    },

    buildCountPayload: function(countState) {
        return {
            carlanr: countState.carlanr,
            menge_im_fach: countState.menge_im_fach,
            gezaehlt: countState.gezaehlt,
            zaehler: countState.zaehler,
            fachnummer: countState.fachnummer,
            art_text1: countState.art_text1,
            art_herst_art_nr: countState.art_herst_art_nr,
            lagerort: countState.lagerort,
            me_we: countState.me_we,
            ze: countState.ze
        };
    },

    handleCountSaveResponse: function(response) {
        var decoded = this.decodeCountSaveResponse(response),
            countState = this.countState;

        if (!decoded.valid) {
            this.handleCountSaveUncertain();
            return;
        }

        if (!decoded.data || decoded.data.success !== true) {
            this.handleCountSaveFailure();
            return;
        }

        Ext.Msg.alert(
            'Katalogartikel-Nr. ' + Ext.String.htmlEncode(String(countState.carlanr || '')),
            'Menge ' + Ext.String.htmlEncode(String(countState.gezaehlt)) + ' wurden eingetragen'
        );
        this.completeCountSave();
    },

    handleCountSaveTransportFailure: function(response) {
        var decoded = this.decodeCountSaveResponse(response);

        if (decoded.valid && decoded.data && decoded.data.success === false) {
            this.handleCountSaveFailure();
            return;
        }

        this.handleCountSaveUncertain();
    },

    decodeCountSaveResponse: function(response) {
        try {
            return {
                valid: true,
                data: Ext.decode(response && response.responseText)
            };
        } catch (error) {
            return {
                valid: false,
                data: null
            };
        }
    },

    handleCountSaveFailure: function() {
        var countState = this.countState;

        this.releaseCountSaveLock();
        Ext.Msg.alert(
            'Katalogartikel-Nr. ' + Ext.String.htmlEncode(
                String(countState && countState.carlanr || '')
            ),
            'Fehler beim Speichern'
        );
    },

    handleCountSaveUncertain: function() {
        this.releaseCountSaveLock();
        Ext.Msg.alert(
            'Speicherstatus unklar',
            'Der Speicherstatus konnte nicht sicher festgestellt werden. ' +
            'Bitte prüfen Sie den aktuellen Bestand, bevor Sie erneut speichern.'
        );
    },

    releaseCountSaveLock: function() {
        this.saveInProgress = false;
        this.setCountControlsDisabled(false);
    },

    completeCountSave: function() {
        var countField = this.lookupReference('countField');

        this.countState = null;
        this.saveInProgress = false;
        this.setCountControlsDisabled(false);
        countField.setValue('');
        this.hideCountStatus();
        this.hideCountSaveButton();
        this.lookupReference('countView').setHidden(true);
        this.lookupReference('searchContent').setHidden(false);
        this.onSearchTap();
    },

    setCountControlsDisabled: function(disabled) {
        this.lookupReference('countField').setDisabled(disabled);
        this.lookupReference('countCheckButton').setDisabled(disabled);
        this.lookupReference('countBackButton').setDisabled(disabled);
        this.lookupReference('countSaveButton').setDisabled(
            disabled || !this.countState || this.countState.readyToSave !== true
        );
    },

    hideCountSaveButton: function() {
        var button = this.lookupReference('countSaveButton');

        button.setDisabled(true);
        button.setHidden(true);
    },

    getRawCountValue: function(countField) {
        return countField.getComponent().getValue();
    },

    setCountDisplay: function(reference, label, value) {
        this.lookupReference(reference).setHtml(
            '<strong>' + label + ':</strong> ' +
            Ext.String.htmlEncode(String(value === null || value === undefined ? '' : value))
        );
    },

    showCountStatus: function(message) {
        var display = this.lookupReference('countStatusDisplay');

        display.setHtml(Ext.String.htmlEncode(message));
        display.setHidden(false);
    },

    hideCountStatus: function() {
        var display = this.lookupReference('countStatusDisplay');

        if (display) {
            display.setHtml('');
            display.setHidden(true);
        }
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
