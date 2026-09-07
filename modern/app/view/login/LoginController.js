Ext.define('BergInventurModern.view.login.LoginController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.login',

    requires: [
        'BergInventurModern.store.Employees',
        'BergInventurModern.view.main.Main'
    ],

    init: function() {
        this.employeeStore = Ext.create('BergInventurModern.store.Employees');
        this.lookupInProgress = false;
    },

    onLoginActivate: function() {
        var scanField = this.lookupReference('scanField');

        BergInventurModern.session.scanValue = null;
        BergInventurModern.session.employeeCode = null;
        BergInventurModern.session.employeeName = null;
        BergInventurModern.session.standort = null;

        this.lookupReference('versionDisplay').setHtml(
            'Version ' + Ext.String.htmlEncode(BergInventurModern.version) +
            ' / Build ' + Ext.String.htmlEncode(BergInventurModern.build)
        );
        this.hideError();
        this.lookupReference('employeeDisplay').setHidden(true);
        this.lookupReference('employeeNameDisplay').setHtml('');
        this.lookupReference('standortField').setHidden(true);
        this.lookupReference('standortField').setValue(null);
        this.lookupReference('standortDisplay').setHidden(true);
        this.lookupReference('standortNameDisplay').setHtml('');
        this.lookupReference('loginButton').setHidden(true);
        scanField.setHidden(false);
        scanField.setValue('');
        scanField.focus(true);
    },

    onScanKeyup: function(textfield, event) {
        var browserEvent = event && event.event ? event.event : event,
            keyCode = browserEvent ? browserEvent.keyCode : null;

        if (keyCode === 13) {
            this.lookupEmployee();
        }
    },

    lookupEmployee: function() {
        var me = this,
            scanField = this.lookupReference('scanField'),
            scanValue = Ext.String.trim(String(scanField.getValue() || ''));

        if (this.lookupInProgress) {
            return;
        }

        if (scanValue === '') {
            this.showError('Die ID darf nicht leer sein.');
            return;
        }

        this.lookupInProgress = true;
        this.hideError();
        scanField.setDisabled(true);
        this.employeeStore.removeAll();
        this.employeeStore.getProxy().setUrl(
            BergInventurModern.getServiceUrl('get_WhseEmployeeLogistic.php')
        );
        this.employeeStore.load({
            params: {
                action: 'Liste',
                keyword: scanValue,
                app_version: BergInventurModern.version
            },
            callback: function(records, operation, success) {
                var responseData = me.getResponseData(operation),
                    record,
                    employeeCode,
                    employeeName;

                me.lookupInProgress = false;
                scanField.setDisabled(false);

                if (success !== true || (responseData && responseData.success === false)) {
                    me.showError(
                        responseData && (responseData.user_message || responseData.message) ?
                            responseData.user_message || responseData.message :
                            'Mitarbeiterprüfung konnte nicht durchgeführt werden.'
                    );
                    return;
                }

                if (!records || records.length === 0) {
                    me.showError('Der gescannte Code ist nicht bekannt.');
                    return;
                }

                record = records[0];
                employeeCode = Ext.String.trim(String(record.get('Code') || ''));
                employeeName = Ext.String.trim(String(record.get('Name') || ''));

                if (employeeCode === 'keine Berechtigung' || employeeName === '') {
                    me.showError('Der gescannte Code ist nicht für die Inventur freigegeben.');
                    return;
                }

                BergInventurModern.session.scanValue = scanValue;
                BergInventurModern.session.employeeCode = employeeCode;
                BergInventurModern.session.employeeName = employeeName;
                BergInventurModern.session.standort = null;

                scanField.setHidden(true);
                me.lookupReference('employeeNameDisplay').setHtml(Ext.String.htmlEncode(employeeName));
                me.lookupReference('employeeDisplay').setHidden(false);
                me.lookupReference('standortField').setHidden(false);
                me.lookupReference('standortField').setValue(null);
                me.lookupReference('standortDisplay').setHidden(true);
                me.lookupReference('standortNameDisplay').setHtml('');
                me.lookupReference('loginButton').setHidden(true);
                me.lookupReference('standortField').focus(true);
            }
        });
    },

    onStandortChange: function(selectfield, newValue) {
        var standort = Ext.String.trim(String(newValue || '')),
            standortName = this.getStandortName(standort);

        BergInventurModern.session.standort = standortName ? standort : null;
        this.lookupReference('standortNameDisplay').setHtml(Ext.String.htmlEncode(standortName));
        this.lookupReference('standortDisplay').setHidden(!standortName);
        this.lookupReference('loginButton').setHidden(!standortName);
    },

    onLoginTap: function() {
        var standortField = this.lookupReference('standortField'),
            standort = Ext.String.trim(String(standortField.getValue() || '')),
            selection = standortField.getSelection(),
            standortName,
            successView;

        if (!BergInventurModern.session.employeeName) {
            this.showError('Bitte die ID-Karte erneut scannen.');
            return;
        }

        if (!this.isValidStandort(standort)) {
            this.showError('Bitte einen gültigen Standort auswählen.');
            return;
        }

        BergInventurModern.session.standort = standort;
        standortName = selection && selection.get ? selection.get('text') : this.getStandortName(standort);
        standortName = standortName || this.getStandortName(standort);

        successView = Ext.create('BergInventurModern.view.main.Main');
        successView.setLoginResult(BergInventurModern.session.employeeName, standortName);
        Ext.Viewport.add(successView);
        Ext.Viewport.setActiveItem(successView);
        this.getView().destroy();
    },

    showError: function(message) {
        var errorDisplay = this.lookupReference('errorDisplay'),
            scanField = this.lookupReference('scanField');

        BergInventurModern.session.scanValue = null;
        BergInventurModern.session.employeeCode = null;
        BergInventurModern.session.employeeName = null;
        BergInventurModern.session.standort = null;

        errorDisplay.setHtml(Ext.String.htmlEncode(message));
        errorDisplay.setHidden(false);
        this.lookupReference('employeeDisplay').setHidden(true);
        this.lookupReference('employeeNameDisplay').setHtml('');
        this.lookupReference('standortField').setHidden(true);
        this.lookupReference('standortField').setValue(null);
        this.lookupReference('standortDisplay').setHidden(true);
        this.lookupReference('standortNameDisplay').setHtml('');
        this.lookupReference('loginButton').setHidden(true);
        scanField.setHidden(false);
        scanField.setValue('');
        scanField.focus(true);
    },

    hideError: function() {
        var errorDisplay = this.lookupReference('errorDisplay');

        errorDisplay.setHtml('');
        errorDisplay.setHidden(true);
    },

    getResponseData: function(operation) {
        var response = operation && operation.getResponse ? operation.getResponse() : null;

        if (!response && operation) {
            response = operation.response || operation._response || null;
        }

        if (!response || !response.responseText) {
            return null;
        }

        try {
            return Ext.decode(response.responseText);
        } catch (exception) {
            return null;
        }
    },

    isValidStandort: function(standort) {
        return Boolean(this.getStandortName(standort));
    },

    getStandortName: function(standort) {
        var names = {
            '10': 'Stendal',
            '20': 'Dessau',
            '30': 'Brandenburg',
            '40': 'Magdeburg',
            '50': 'Perleberg',
            '60': 'Wildau',
            '70': 'Lindenberg',
            '80': 'Potsdam',
            '90': 'Fürstenwalde'
        };

        return names[standort] || '';
    }
});
