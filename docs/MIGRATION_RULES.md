# BergInventur – Migrationsregeln

## Ausgangslage

Die bestehende BergInventur-App basiert auf:

- Sencha Touch 2.3.0
- Tablet-/iPad-orientiertem Layout
- bestehender produktiver Inventur-Fachlogik

Der unveränderte Ausgangsstand ist in Git gesichert:

- Branch: main
- Tag: inventory-legacy-baseline

## Ziel

Migration auf:

- Ext JS 6.2.1.167
- Modern Toolkit
- Sencha Cmd 7.6.0.87
- Zebra TC26 / TC27
- kleine Scanner-Displays

Langfristig soll eine Integration in das bestehende LagerTool möglich sein.

## Grundprinzip

Die Migration ist keine fachliche Neuentwicklung.

Das fachliche Verhalten der alten Inventur-App muss erhalten bleiben.

Es gilt:

Alte Eingabe + gleicher fachlicher Zustand
=
gleiches fachliches Ergebnis in der neuen Anwendung.

## Keine automatische Framework-Migration

Sencha Touch 2.3.0 darf nicht automatisch oder unkontrolliert auf
Ext JS 6.2.1 aktualisiert werden.

Insbesondere nicht:

- Framework-Dateien ersetzen
- alte Projektdateien blind mit Sencha Cmd aktualisieren
- automatische Upgrade-Befehle ohne vorherige Analyse ausführen
- bestehende Views pauschal überschreiben

Jede Migration erfolgt kontrolliert und dateiweise.

## Migrationsphasen

### Phase 0 – Analyse

Keine Codeänderungen.

Zu untersuchen:

- Projektstruktur
- Views
- Controller
- Models
- Stores
- Backend-Aufrufe
- Services
- lokale Speicherung
- Offline-Verhalten
- Login
- Standortlogik
- Inventurablauf
- Artikel
- Lagerplatz
- Mengenlogik
- Scannerfunktionen
- Sencha-Touch-spezifische APIs

Ergebnis:
Dokumentierter Ist-Zustand und Abhängigkeiten.

### Phase 1 – technische Zielstruktur

Eine Ext-JS-6.2.1-Modern-kompatible Struktur vorbereiten.

Noch keine fachlichen Änderungen.

Ziel:

- startfähige Anwendung
- kompatible App-Struktur
- kompatible Navigation
- kompatible Views
- bestehende Fachlogik weiterhin nachvollziehbar

### Phase 2 – UI-Migration

Tablet-UI auf Scanner-UI umstellen.

Vorgaben:

- einspaltiges Layout
- große Touch-Ziele
- kleine Displayflächen berücksichtigen
- möglichst wenig Scrollen
- Scanner als primäre Eingabe
- automatische Fokussteuerung
- keine unnötige Bildschirmtastatur

### Phase 3 – Scanneroptimierung

Hardware-Scanner TC26/TC27 berücksichtigen.

Scanneroptimierungen dürfen die Fachlogik nicht verändern.

Jede Änderung am Bedienablauf muss separat bewertet werden.

### Phase 4 – Alt-vs-Neu-Test

Fachlicher Vergleich der alten und neuen Anwendung.

Bei identischen Testdaten müssen relevante Ergebnisse identisch sein.

### Phase 5 – Integration prüfen

Erst nach stabiler Scanner-Version prüfen, ob die Inventur als Modul
in das LagerTool integriert wird.

Keine Integration während der Grundmigration.

## Kompatibilitätsprüfung

Für jede verwendete Sencha-Touch-Komponente ist zu dokumentieren:

- alte Komponente/API
- Datei und Verwendungsstelle
- benötigter Ext-JS-Modern-Ersatz
- notwendige Codeänderung
- mögliches Risiko
- benötigter Test

Beispiele:

- Ext.Panel
- Ext.Container
- Ext.navigation.View
- Ext.List
- Ext.form.Panel
- Ext.Ajax
- Stores
- Models
- Controller
- lokale Speicherung
- Eventhandling
- Listener
- itemId / reference
- xtype

## Fachlogikschutz

Diese Bereiche dürfen ohne ausdrücklichen Auftrag nicht fachlich
verändert werden:

- Benutzerermittlung
- Standortermittlung
- Lager
- Lagerplätze
- Artikel
- Zählmengen
- Inventurwerte
- Statuswerte
- Validierungen
- Speichervorgänge
- Backend-Verträge
- Datenbankzugriffe

## Backend

Bestehende Backend-Endpunkte sind zunächst unverändert weiterzuverwenden.

Wenn ein Backend-Endpunkt mit der neuen Oberfläche technisch nicht
kompatibel sein sollte:

1. Problem dokumentieren
2. Ursache erklären
3. minimal notwendige Änderung beschreiben
4. nicht eigenständig ändern

## Datenbank

Keine Datenbankänderung im Rahmen der UI-Migration.

Insbesondere keine Änderungen an:

- Tabellen
- Spalten
- Datentypen
- Views
- Stored Procedures
- Triggern
- Constraints

ohne gesonderte Freigabe.

## Refactoring

Kein Refactoring nur aus Stilgründen.

Legacy-Code darf zunächst bestehen bleiben, wenn er fachlich relevant
oder noch nicht vollständig verstanden ist.

Entfernen von Code erst nach Nachweis, dass er nicht benötigt wird.

## Tests

Für jede migrierte Funktion müssen geeignete Vergleichstests definiert
werden.

Mindestens zu prüfen:

- Login
- Benutzer
- Standort
- Lager
- Lagerplatz
- Artikel
- Mengen
- Speichern
- Fehlerfälle
- Online-/Offline-Zustand
- API-Aufrufe
- Scanner-Eingabe

## Git

Die Migration erfolgt auf:

feature/extjs62-migration

Keine Änderungen direkt auf main.

Vor jeder Implementierung:

- git status
- Branch prüfen

Nach jeder Implementierung:

- git diff
- Tests
- git status

Commit und Push nur nach ausdrücklicher Freigabe.

## Abbruchregel

Wenn während der Migration eine Änderung notwendig erscheint, die
fachliches Verhalten beeinflussen könnte:

STOPP.

Nicht implementieren.

Stattdessen dokumentieren:

- aktuelles Verhalten
- gewünschtes technisches Verhalten
- betroffene Fachlogik
- Risiko
- mögliche Alternativen

