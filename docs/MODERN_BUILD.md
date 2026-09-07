# BergInventur Modern – technischer Build-Ansatz für Phase 1B

## Geltungsbereich

`modern/` enthält die isolierte technische Zielstruktur für die spätere
Ext-JS-Modern-Anwendung. Phase 1B enthält keine Inventur-Geschäftslogik,
keine Scannerlogik, keine Backend-Aufrufe und keine lokale Speicherung.

Die bestehende Sencha-Touch-2.3.0-Anwendung im Repository-Root bleibt
unverändert und ist weiterhin der eingefrorene Legacy-Referenzstand.

## Entwicklungs- und Git-Ablauf

Die führende Entwicklungs- und Git-Arbeitsumgebung bleibt der Mac unter:

`~/Documents/Entwicklung/InventurApp/BergInventur`

Auf dem Mac sind Sencha Cmd und Ext JS nicht installiert. Auf dem Mac wird
kein Sencha-Build ausgeführt.

Quelländerungen entstehen ausschließlich im Mac-Repository und werden nach
Freigabe über Git nach beg-web übertragen:

1. Änderung und lokale statische Prüfung auf dem Mac
2. Commit und Push nur nach ausdrücklicher Freigabe
3. `git pull` im Checkout auf beg-web
4. Build und Test ausschließlich auf beg-web

Auf beg-web werden keine dauerhaften manuellen Änderungen an Quelldateien
vorgenommen.

## Verbindliche Buildversionen

- Sencha Cmd `7.6.0.87`
- Ext JS `6.2.1.167`
- Framework `ext`
- Toolkit `modern`
- Theme `theme-material`

Die Modern-App verwendet den Namespace `BergInventurModern` und beginnt mit
der App-Version `1.0.0.0`.

## SDK- und Paketbereitstellung

Das Ext-JS-SDK wird nicht im Git-Repository versioniert. Der erwartete lokale
Frameworkpfad der Modern-Workspace-Struktur ist `modern/ext/`.

Vor dem ersten Build muss Ext JS `6.2.1.167` auf beg-web kontrolliert und
passend für diesen Pfad bereitgestellt werden. Die endgültige technische Form
dieser Bereitstellung, beispielsweise Kopie, Symlink oder Junction, ist in
Phase 1B noch nicht festgelegt und wird hier nicht umgesetzt.

Auch `modern/packages/` wird nicht versioniert. Benötigte Frameworkpakete,
darunter `font-awesome` und das Theme `theme-material`, müssen aus der
freigegebenen Ext-JS-Installation für den Build aufgelöst werden können.

Die generatorverwaltete `.sencha`-Struktur wurde aus einer frischen, auf
beg-web mit Sencha Cmd `7.6.0.87` und Ext JS `6.2.1.167` erzeugten
Modern-Referenz übernommen. Projektspezifische Generatorwerte wurden dabei
kontrolliert auf `BergInventurModern` und die App-ID aus `modern/app.json`
angepasst. Es wurden keine Dateien aus der alten Cmd-4-Struktur übernommen.

## Nicht versionierte Artefakte

Folgende Pfade werden auf dem Buildsystem bereitgestellt oder durch Sencha Cmd
erzeugt und bleiben außerhalb von Git:

- `modern/ext/`
- `modern/build/`
- `modern/packages/`
- `modern/bootstrap.js`
- `modern/bootstrap.json`
- `modern/bootstrap.jsonp`
- `modern/bootstrap.css`

Die Modern-App bindet keine Dateien aus `resources/services/` ein. Ihr
Manifest enthält keine Backend-Ressourcen und keinen relativen Servicepfad.
Die Service-Basis wird erst vor Phase 2 gesondert entschieden.

## Build und Buildtest

Der erste Build darf erst erfolgen, nachdem SDK-Bereitstellung und vollständige
Cmd-Buildmetadaten kontrolliert eingerichtet wurden. Der Build wird aus dem
Verzeichnis `C:\dev\InventurApp_BuildRepo\BergInventur\modern` ausgeführt.

Build- und Testausgaben müssen vollständig von der produktiven
Legacy-Anwendung getrennt bleiben. Ein Deployment ist ausschließlich in eine
separate Buildtest-Umgebung zulässig. Produktive Inventur-Dateien dürfen nicht
überschrieben werden.

Jeder auf beg-web oder TC26/TC27 getestete Build muss einer eindeutigen
App-/Buildversion und einem eindeutigen Git-Commit zugeordnet werden können.
