# BergInventur – Codex Projektregeln

## Projektziel

Die bestehende BergInventur-App wird von Sencha Touch 2.3.0 auf eine
Scanner-taugliche Anwendung für Zebra TC26/TC27 migriert.

Die bestehende Fachlogik soll erhalten bleiben.

Langfristig kann die Inventur als Modul in das bestehende LagerTool
integriert werden.

## Technischer Zielstand

- Ext JS 6.2.1.167
- Modern Toolkit
- Sencha Cmd 7.6.0.87
- Zielgeräte: Zebra TC26 / TC27
- Buildumgebung: beg-web
- Entwicklungsrepository: macOS / GitHub

Sencha ist auf dem Mac nicht installiert.
Sencha-Builds dürfen deshalb nicht vorausgesetzt oder auf dem Mac
automatisch ausgeführt werden.

## Git-Regeln

- Niemals direkt auf `main` entwickeln.
- `main` enthält nur freigegebene stabile Stände.
- Der unveränderte Ausgangsstand ist mit
  `inventory-legacy-baseline` markiert.
- Änderungen erfolgen nur auf einem passenden Feature-Branch.
- Vor jeder Änderung:
  - `git status`
  - aktuellen Branch prüfen
- Nach jeder Änderung:
  - `git status`
  - `git diff`
  - betroffene Tests durchführen
- Keine automatischen Commits ohne ausdrücklichen Auftrag.
- Keine automatischen Pushes ohne ausdrücklichen Auftrag.
- Keine Branchwechsel ohne ausdrücklichen Auftrag.
- Keine Force-Pushes.
- Keine History-Rewrites.
- Keine großen Sammel-Commits, wenn Änderungen logisch getrennt
  werden können.

## Schutz der Fachlogik

Die bestehende Inventur-Fachlogik ist zunächst eingefroren.

Ohne ausdrücklichen Auftrag NICHT verändern:

- Inventurablauf
- Zähllogik
- Mengenlogik
- Artikelermittlung
- Lagerplatzlogik
- Standortlogik
- Benutzerlogik
- Validierungsregeln
- Statuswerte
- Berechnungen
- Datenbanktabellen
- SQL-Strukturen
- Backend-Fachlogik
- bestehende API-Verträge

Wenn eine gewünschte UI-Änderung eine Änderung dieser Bereiche
erfordern würde:

STOPPEN und den notwendigen Eingriff zuerst dokumentieren.

## Erlaubter Migrationsumfang

Zunächst erlaubt:

- Views
- Layout
- CSS / SCSS
- Navigation
- Touch-Bedienung
- Responsive Darstellung
- Scanner-Eingabe
- Fokussteuerung
- Eingabefelder
- Button-Größen
- Anzeige für kleine Displays
- technische Anpassungen für Ext JS Modern, sofern das
  fachliche Verhalten unverändert bleibt

## Backend und Datenbank

Backend, Services und Datenbank sind zunächst als read-only zu
behandeln.

Keine Änderungen an:

- PHP-Endpunkten
- SQL
- Tabellen
- Views
- Stored Procedures
- Datenbankrechten
- Datenformaten

ohne ausdrücklichen Auftrag.

Bestehende Backend-Aufrufe dürfen analysiert und dokumentiert werden.

## Sencha-Migration

Die alte App verwendet Sencha Touch 2.3.0.

Es darf kein unkontrolliertes automatisches Framework-Upgrade
durchgeführt werden.

Nicht einfach alte Framework-Dateien durch neue ersetzen.

Die Migration auf Ext JS 6.2.1 Modern muss schrittweise erfolgen.

Für jede nicht kompatible Sencha-Touch-Komponente ist zu dokumentieren:

1. bisherige Verwendung
2. Ext-JS-Modern-Ersatz
3. mögliche Verhaltensänderung
4. Testbedarf

## Zebra TC26 / TC27

Das UI ist für kleine Scanner-Displays auszulegen.

Bevorzugt:

- einspaltiges Layout
- große Touch-Ziele
- wenig Inhalt gleichzeitig
- Scanner als primäre Eingabe
- automatische Fokussteuerung
- möglichst wenig Bildschirmtastatur
- klare Rückmeldung nach Scan und Speicherung

Die Fachlogik darf durch die Scanneroptimierung nicht verändert werden.

## Testregeln

Das neue Verhalten muss gegen die alte Anwendung verglichen werden.

Bei identischen Eingabedaten müssen fachlich identische Ergebnisse
entstehen.

Zu prüfen sind mindestens:

- Benutzer
- Standort
- Lager
- Lagerplatz
- Artikel
- Menge
- Status
- Zeitstempel, soweit fachlich relevant
- gespeicherte Datensätze
- API-Aufrufe

UI-Änderungen gelten nicht als abgeschlossen, solange der fachliche
Alt-vs-Neu-Vergleich nicht bestanden ist.

## Versions- und Buildregel

Bei jeder freigegebenen funktionalen Änderung:

- App-Version bzw. Buildkennung passend erhöhen
- Version im Git-Commit nachvollziehbar machen

Keine Versionsänderung bei reiner Analyse.

## Build und Deployment

Der Mac ist Entwicklungs- und Git-Arbeitsplatz.

Die Sencha-Buildumgebung befindet sich auf `beg-web`.

Kein produktives Deployment ohne ausdrückliche Freigabe.

Bevor produktiv deployt wird:

1. Git working tree sauber
2. Diff geprüft
3. Tests erfolgreich
4. Buildversion erhöht
5. Testbuild auf beg-web
6. TC26/TC27 getestet
7. ausdrückliche Freigabe

## Dateien und Artefakte

Nicht committen:

- Logs
- temporäre Dateien
- Build-Ausgaben
- lokale IDE-Dateien
- Secrets
- Tokens
- Passwörter
- Zertifikate
- private Schlüssel

Bestehende `.gitignore` beachten und bei Bedarf erweitern.

## Arbeitsweise von Codex

Vor Änderungen zuerst den Ist-Zustand verstehen.

Keine Änderungen außerhalb des angeforderten Umfangs.

Keine "Nebenbei"-Refactorings.

Keine Umbenennungen nur aus Stilgründen.

Keine Entfernung scheinbar unbenutzter Legacy-Funktionen ohne
expliziten Auftrag.

Bei Unsicherheit:
nicht raten, sondern Befund dokumentieren.

Nach jeder Implementierung einen kurzen Bericht liefern:

- geänderte Dateien
- Zweck der Änderung
- unveränderte Fachlogik
- durchgeführte Tests
- offene Risiken
- `git status`
- empfohlener Commit-Text

Codex führt Commit und Push nur aus, wenn dies ausdrücklich
angefordert wurde.
