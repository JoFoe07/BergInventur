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

Das Sencha-Manifest kopiert keine Dateien aus dem Repositorypfad
`resources/services/` in den Production-Build. Die benötigten
BergInventur-Services werden beim Buildtest-Deployment getrennt und
kontrolliert bereitgestellt; der Ablauf ist unten dokumentiert.

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

## Getrenntes Buildtest-Deployment von Frontend und Services

Die Modern-App verwendet für BergInventur-eigene Aufrufe die relative
Servicebasis `resources/services`. Dadurch löst dieselbe gebaute Anwendung die
Inventur-Services immer unterhalb ihres jeweiligen Installationsverzeichnisses
auf:

- Buildtest: `/BergInventur_Buildtest/resources/services/`
- spätere Produktion: `/BergInventur/resources/services/`

Der Mitarbeiter-Login bleibt ein bewusst geteilter externer Aufruf über
`/LagerTool/resources/services/get_WhseEmployeeLogistic.php` und wird nicht in
die BergInventur-Installation kopiert.

Die Modern-App benötigt aus dem versionierten BergInventur-Servicebestand nur:

- `resources/services/get_artikelnummern.php`
- `resources/services/dbconnection_nav.inc.php`

`get_artikelnummern.php` bindet `dbconnection_nav.inc.php` relativ ein; beide
Dateien müssen deshalb gemeinsam und im selben Zielverzeichnis bereitgestellt
werden. Die übrigen Legacy-Endpunkte werden von der Modern-App nicht aufgerufen.

Ein Buildtest-Deployment besteht damit immer aus diesen beiden getrennten
Quellen:

```text
C:\dev\InventurApp_BuildRepo\BergInventur\modern\build\production\BergInventurModern\
    -> C:\amp\Apache24\htdocs\BergInventur_Buildtest\

C:\dev\InventurApp_BuildRepo\BergInventur\resources\services\get_artikelnummern.php
C:\dev\InventurApp_BuildRepo\BergInventur\resources\services\dbconnection_nav.inc.php
    -> C:\amp\Apache24\htdocs\BergInventur_Buildtest\resources\services\
```

Die beiden Service-Dateien werden nach dem Production-Build aus dem sauberen
Git-Checkout in das Buildtest-Ziel kopiert. Falls das Frontend-Deployment den
Zielordner bereinigt oder spiegelt, muss die Servicekopie anschließend erneut
erfolgen. Vor jedem Kopieren ist das Ziel ausdrücklich auf
`BergInventur_Buildtest` zu prüfen. Der produktive Legacy-Pfad
`C:\amp\Apache24\htdocs\BergInventur\` ist in diesem Ablauf kein Ziel und darf
nicht verändert werden.

Nach einem freigegebenen Build kann Jörg die beiden Teile auf beg-web in einer
PowerShell einzeln und in dieser Reihenfolge bereitstellen:

```powershell
$Repo = 'C:\dev\InventurApp_BuildRepo\BergInventur'
$Frontend = Join-Path $Repo 'modern\build\production\BergInventurModern'
$Target = 'C:\amp\Apache24\htdocs\BergInventur_Buildtest'
if ($Target -ne 'C:\amp\Apache24\htdocs\BergInventur_Buildtest') { throw 'Ungültiges Deployment-Ziel' }
if (-not (Test-Path $Frontend)) { throw 'Production-Build nicht gefunden' }
Copy-Item -Path (Join-Path $Frontend '*') -Destination $Target -Recurse -Force
New-Item -ItemType Directory -Path (Join-Path $Target 'resources\services') -Force
Copy-Item -Path (Join-Path $Repo 'resources\services\get_artikelnummern.php') -Destination (Join-Path $Target 'resources\services') -Force
Copy-Item -Path (Join-Path $Repo 'resources\services\dbconnection_nav.inc.php') -Destination (Join-Path $Target 'resources\services') -Force
```

Diese Befehle sind eine dokumentierte manuelle Deployment-Hilfe. Sie werden
nicht durch den Sencha-Build gestartet und enthalten keinen Zugriff auf den
produktiven Legacy-Zielordner.
