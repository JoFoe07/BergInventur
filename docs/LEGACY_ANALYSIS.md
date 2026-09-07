# 1. Executive Summary

Stand: 07.09.2026. Phase 0, ausschließlich statische Bestandsanalyse und Dokumentation.

Verbindlich berücksichtigt: [AGENTS.md](../AGENTS.md) und [MIGRATION_RULES.md](MIGRATION_RULES.md), vor Beginn vollständig gelesen. Es wurden weder Fachlogik noch Programmdateien verändert. Diese Dokumentation ist keine Freigabe für Migration, Backendkorrekturen, Build oder Deployment.

Die BergInventur ist eine kleine Sencha-Touch-Anwendung mit zwei Controllern, drei Views, drei Models und drei Stores. Ihr Umfang ist deutlich kleiner als der mitgelieferte Framework-, Theme- und Ressourcenbestand. Die eigentliche Zählung verteilt sich auf View-Handler, `Search_Controller.js`, das Model `auftragsnummern.js` und den PHP-Dienst `get_artikelnummern.php`.

Der Hauptablauf lautet: Mitarbeitername und Standort wählen → Lagerplatzpräfix suchen → Artikel auswählen → Bewegungssperre prüfen → Menge blind erfassen → bei Bestandsabweichung bestätigen → Zählergebnis in `tools.dbo.jf_inventur_lagerfach` eintragen bzw. ändern → Ergebnisliste erneut laden. Eine zweite Suchart ermittelt Lagerplätze anhand Herstellerartikelnummer/EAN; bei aktivierter Suchart ist die Zählmaske gesperrt. Ein Inventurauftrag, eine abschließende NAV-Buchung und eine Offline-Synchronisation sind im Anwendungscode nicht implementiert.

Besonders wichtig für die spätere Migration:

- `action=create` ist im normalen Speicherablauf auch der Weg zur Korrektur bestehender Zählungen. Der Server entscheidet anhand Katalogartikelnummer, Lagerort und `status <> 'gebucht'` zwischen INSERT und UPDATE. Der Lagerplatz gehört nicht zur UPDATE-Bedingung.
- Bei **null Treffern der Artikel-/EAN-Suche** fehlt ein abschließendes `break`; der PHP-Kontrollfluss erreicht den Schreibzweig. Ein solcher GET darf deshalb nicht als garantiert nebenwirkungsfreie Diagnose verwendet werden. Tatsächliche Datenbankfolgen sind ohne isolierten Test nicht sicher ermittelbar.
- Die Konfiguration liest Mitarbeiter aus `NAV_TEST`, die Suchabfragen lesen Artikel und Bewegungen fest aus `NAV_PROD`. `$NAV` ist kein durchgängiger Umschalter für die Datenumgebung.
- Der Client sperrt einen Datensatz bei `Activity_Type !== null`; Typ und NULL-Verhalten sind fachlich relevant. Diese Sperre wird beim Speichern serverseitig nicht erneut geprüft.
- Es gibt keine native Barcodeintegration und keinen Scan-Abschluss-Handler. Das Suchfeld wird durch den Button ausgewertet. Der Touch-Standard behandelt Enter als `action` mit anschließendem `blur`.
- Der Quell-Einstieg bindet `app.js` und CSS sowohl über den Microloader als auch direkt ein. Alte lokale Buildreste sind vorhanden und unterscheiden sich in Anwendungsdetails vom Quellstand.
- Private Framework-Zugriffe, dynamische Model-Felder, fehlende Server-IDs und Writer-Defaults machen einen bloßen Frameworkaustausch fachlich riskant.

Die Analyse beschreibt auch bestehende Auffälligkeiten. Sie erklärt diese nicht zu gewünschten neuen Geschäftsregeln und korrigiert sie nicht. Bei einem später notwendigen Eingriff in diese Bereiche gilt die dokumentierte Stopp-Regel.

# 2. Technischer Ist-Stand

## 2.1 Versions- und Umgebungsnachweis

| Aspekt | Befund / Quelle |
| --- | --- |
| Analysierter Branch | `feature/extjs62-migration`; zu Beginn sauber |
| Analysierter HEAD | `63fa65ffe9a35eea53565b851993cedc64ad3f66` |
| `main` und `inventory-legacy-baseline` | beide `57b2610ab6585b93057397aec6012839155e723c` |
| Differenz HEAD zur Baseline | ausschließlich `AGENTS.md` und `docs/MIGRATION_RULES.md`; Programmstand unverändert |
| Framework | `touch/version.txt`, `touch/cmd/sencha.cfg`, `.sencha/app/sencha.cfg`: Sencha Touch `2.3.0` |
| Historischer Generator | Header in `app.js` und allen elf App-Klassen: Sencha Architect `2.2.3` |
| Historisches Cmd | App/Workspace `4.0.0.203`; SDK-Metadaten nennen `4.0.0.202`, Mindestversion `3.1.0.53` |
| App-Namen | JS/JSON: `BergInventur`; `.sencha/app/sencha.cfg`: `BergAD`; `codegen.json` enthält ebenfalls BergAD-Vorlagenparameter |
| UI-Version | `app/view/Login.js:32`: `Berg Inventur V 2.7` |
| Packaging-Version | `packager.json`: `versionString: 1.0`, `versionCode: 1`, App-ID `de.berg-sdl.inventur` |
| Manifest-ID | `69bca5ea-e34e-4324-8429-13cc1e8e2222`; auch Präfix des Asset-Caches |
| Backend | PHP mit Microsoft-`sqlsrv`-Aufrufen; keine lokale Server-/Datenbankversionsdokumentation |
| Datenbankverbindung | konfigurierter Server `NAV-SQL`, Standarddatenbank `tools` |
| Ziel, noch nicht umgesetzt | Ext JS `6.2.1.167`, Modern Toolkit, Sencha Cmd `7.6.0.87` |

Der Mac ist ausschließlich führender Entwicklungs- und Git-Arbeitsplatz. Sencha Cmd und Ext JS sind dort gemäß Projektvorgabe nicht installiert; das ist kein Projektfehler. Build/Test sind später auf `beg-web`, Checkout `C:\dev\InventurApp_BuildRepo\BergInventur`, vorgesehen. Serverzustand, installierte SDK-Dateien und LagerTool-Code wurden in dieser Phase nicht untersucht. Die Zielversionen und die LagerTool-Gleichheit stammen aus dem Auftrag, nicht aus einer Prüfung auf beg-web.

## 2.2 Untersuchungsmethode und Aussagegrenzen

Vollständig inhaltlich gelesen wurden `app.js`, alle elf eigenen JS-Klassen, die vier PHP-Dateien, beide HTML-Einstiege, die zwölf HTML-Fragmente, Manifest-/Packaging-Konfiguration und eigene SCSS-Quellen. Die Cmd-Konfiguration einschließlich aller XML-Buildimplementierungen und Microloader wurde ausgewertet. `bootstrap.js` wurde vollständig als drei Mapping-Objekte geprüft: 18 Pfadmappings sowie je 552 Alternate-/Alias-Einträge, ohne weiteren ausführbaren Code außerhalb dieser Registrierungen.

Das mitgelieferte `touch/` wurde als Abhängigkeit inventarisiert; die für Start, Navigation, Models, Writer, Stores, Eingabe und Caching entscheidenden Implementierungen wurden zusätzlich gelesen. Das ist kein vollständiges Audit jeder unbenutzten SDK-Klasse, jeder gebündelten SDK-Kopie oder der binären Sass-Caches. Generierte CSS-, Bild-, Font- und Builddateien wurden anhand Inhalt, Einbindung, Dateivergleichen und Metadaten eingeordnet. Gruppierte Abhängigkeiten in Kapitel 15 sind ausdrücklich keine eigenständigen Inventurfunktionen.

Die fachlichen Aussagen beruhen auf erreichbarem Quellcode. Kommentierte Beispiele, konfigurierte aber nicht aufgerufene APIs und lokale Buildreste werden getrennt bezeichnet. Keine HTTP-Anfragen an Inventurservices, keine Datenbankverbindungen und keine Ausführung der Anwendung wurden vorgenommen. Browser-/Geräteverhalten und tatsächlich gespeicherte Datensätze sind deshalb nicht als bestanden getestet ausgewiesen.

Für nicht belegte Sachverhalte gilt: **Nicht aus dem vorhandenen Quellcode sicher ermittelbar.** Die Kompatibilitätsvorschläge in Kapitel 14 sind technische Einschätzungen; gezielt herangezogene öffentliche Herstellerdokumentation ist dort verlinkt. Sie belegt keine erfolgreiche Ausführung mit dem SDK-Build 6.2.1.167.

# 3. Projektstruktur

Vor Erstellung dieser Datei: 3.546 versionierte Dateien, davon elf unter `app/`, 1.182 unter `resources/`, 2.313 unter `touch/` und 26 unter `.sencha/`. Zusätzlich lokal vorhanden und ignoriert: 1.042 Dateien unter `build/` sowie `debug.log` und `inventur.log`.

```text
BergInventur/
├── app.js, app.json, index.html       Anwendung und regulärer Einstieg
├── app.html                          alternativer Architect-Einstieg
├── bootstrap.js, bootstrap.json      generierte Loader-Metadaten
├── app/
│   ├── controller/                   LoginController, Search_Controller
│   ├── view/                         Login, Search_Container, Lagerfach
│   ├── model/                        auftragsnummern, Model_ActivityLine,
│   │                                 Model_LagerMitarbeiterLogistic
│   └── store/                        artikelnummern, activityline,
│                                     Store_LagerMitarbeiterLogistic
├── resources/
│   ├── services/                     drei Endpunkte, DB-Include, leer.html
│   ├── html/                         zwölf ältere Informationsfragmente
│   ├── sass/                         app.scss, Konfiguration, elf Includes,
│   │                                 Fonts, 803 Sass-Cachedateien
│   ├── css/                          app.css und drei separate CSS-Dateien
│   ├── images/                       305 Ressourcen inkl. Hilfsartefakte
│   ├── icons/                        sechs Ressourcen
│   ├── startup/                      neun Ressourcen
│   └── loading/                      zehn native Startbilder
├── touch/                            Legacy-SDK, Themes, UX-Erweiterungen
├── .sencha/                          Cmd-4-Konfiguration / Ant / Microloader
├── build.xml, packager*.json          historischer Build / Packaging
├── Inventur_NAV*.cmd                 zwei Windows-Buildskripte
├── build/                            ignorierte lokale Alt-Builds
└── docs/                             verbindliche Regeln und diese Analyse
```

Keine eigene Test-Suite, CI-Pipeline, SQL-DDL-Dateien, Migrationen, Android-Java-/Gradle-Struktur, Cordova-`config.xml`, `package.json` oder Architect-Projektdatei (`.xds`/`.xdp`) im versionierten Anwendungsbestand gefunden. SDK-eigene Theme-Beispiele/-Tests sind keine fachlichen Inventurtests. Eine `resources/css/include/`-Struktur enthält keine relevanten eigenen Quelldateien.

# 4. Startmechanismus

## 4.1 Regulärer Quell-Einstieg

1. `index.html:8` lädt `touch/microloader/development.js`.
2. Dieser liest synchron per GET `app.json` und wertet das kommentierte Manifest mittels `eval` aus. Plattformfilter und Viewport-/Apple-Metadaten werden gesetzt.
3. Die Manifestreihenfolge ist `touch/sencha-touch.js` → `bootstrap.js` → `app.js`. CSS: `resources/css/app.css`. `x-bootstrap` markiert die ersten beiden JS-Dateien als Entwicklungsabhängigkeiten für den Build.
4. `bootstrap.js` ordnet `BergInventur` dem Verzeichnis `app` und `Ext` dem Verzeichnis `touch/src` zu; Aliasregistrierungen erlauben die verwendeten `xtype`-Namen. Die bloße Registrierung lädt z. B. keine Kalender- oder Geräteintegration.
5. `app.js:21` ruft `Ext.application` auf. Das SDK lädt deklarierte Klassen sowie deren Abhängigkeiten.
6. Nach `touch/src/app/Application.js:652` werden zuerst die Stores instanziiert, danach die Controller-`init`-Methoden ausgeführt, anschließend App-`launch` und die geerbten Controller-`launch`-Methoden.
7. `Search_Controller.init` initialisiert das globale Objekt `LagerInventur` und deutsche Datumsnamen/-formate. `LoginController` hat keine eigene `init`-Implementierung.
8. `app.js:88` fügt zuerst `loginview` dem Viewport hinzu und erzeugt danach `Search_Container` mit `fullscreen: true`. Das Touch-Viewport fügt eine solche Komponente hinzu; das erste aktive Card-Element bleibt der Login. Die Suchview existiert bereits im Hintergrund. Nach erfolgreicher Anmeldung wird die aktive Loginview entfernt und zerstört; Touch aktiviert das nächste Element.

Quellen für den impliziten View-Wechsel: `touch/src/viewport/Default.js:574`, `touch/src/Container.js:149`, `:735` und `:763`.

**Startauffälligkeit:** `index.html:15–16` bindet dieselbe CSS-Datei und `app.js` zusätzlich direkt ein. Die zweite App-Ausführung trifft im mitgelieferten SDK auf die Sperre gegen wiederholtes `Ext.setup` (`touch/src/core/Ext-more.js:552`, `:975`). Damit ist ein doppelter Startaufruf mit Fehlerpotential statisch belegt; welche Oberfläche in einem konkreten bisherigen Deployment dennoch erfolgreich erscheint, wurde nicht live verifiziert.

## 4.2 Alternative und generierte Einstiege

`app.html` ist laut Header Architect-generiert und lädt eine absolute Windows-Datei `C:\amp\Apache24\htdocs\touch_sencha-touch-all.js`. Das ist kein portabler SDK-Verweis im Repository. Die Datei enthält keinen Bootstrap-Microloader. Ihre reale historische Nutzung ist nicht sicher ermittelbar.

`.sencha/app/microloader/development.js` liest im Unterschied zum tatsächlich in `index.html` verlinkten Touch-Microloader `bootstrap.json`. Die testing- und production-Microloader sind jeweils bytegleich zu den gleichnamigen Dateien unter `touch/microloader/`. Testing erwartet ein übergebenes Manifest und schreibt Script-/Stylesheet-Tags; Production verwaltet zusätzlich Asset-Cache und Updates.

Die ignorierten production-/native-Einstiege enthalten eingebettete Microloader und weiterhin den zusätzlichen direkten `app.js`-/CSS-Verweis. Sie sind keine nachweislich aktuelle Freigabereferenz; siehe Kapitel 18.

## 4.3 Initialisierte Stores

| Storeklasse | Store-ID | Startverhalten |
| --- | --- | --- |
| `artikelnummern` | `Store_Artikelnummern` | instanziiert, kein `autoLoad`; GET erst bei Suchen und nach erfolgreichem Speichern |
| `activityline` | `Store_ActivityLine` | instanziiert, kein `autoLoad`; keine Verwendung durch aktive Handler gefunden |
| `Store_LagerMitarbeiterLogistic` | gleichnamig | `autoLoad: true`; Mitarbeiter werden bereits vor Anmeldung geladen |

Der automatische Mitarbeiter-Request muss noch nicht abgeschlossen sein, wenn der Benutzer interagiert. Einen speziellen Start-Ladezustand, eine Login-Buttonsperre bis zum Laden oder einen Ladefehler-Handler gibt es nicht.

# 5. Navigation und Views

| View | Oberfläche / Inhalte | Ereignisse und Abhängigkeiten |
| --- | --- | --- |
| `Login` (`loginview`, `Ext.form.Panel`) | Bild, Titel V 2.7, Mitarbeitersuchfeld, versteckte Ergebnisliste, Standortauswahl, Anmelden; altes verstecktes Namensfeld | View validiert Namen im Store; `signInCommand` an LoginController; `keyup` filtert, `itemsingletap` übernimmt Name |
| `Search_Container` (`searchcontainer`, `Ext.Container`) | Standorttoolbar, Fehlermeldungslabel, Suchart-Checkbox, Suchfeld, Suchenbutton, Dataview mit Hersteller-Nr., Fach, Text und `info` | `check`/`uncheck` ändern Placeholder und Checkboxwert; `tap` leert den Store und sendet `fn_search_lagernr`; Controller verarbeitet Ergebnisse |
| `Lagerfach` (`lagerfach`, `Ext.Container`) | Titel, Zurück/Speichern, zwei Fieldsets | Controller setzt Record, baut Fieldset-Inhalt zur Laufzeit um und erzeugt das eigentliche Mengenfeld |

Die App verwendet Viewport-Card-Wechsel, keine eigene `Ext.navigation.View`, keinen Push-/Pop-Stapel und keine anwendungseigenen Routes oder Browser-History-Regeln. `onZurueck` navigiert zur Suche; erfolgreicher Save ebenso. Der nächste Artikel wird anschließend manuell aus der Liste gewählt, der nächste Lagerplatz erneut gesucht.

Der Controller übergibt `this.slideRightTransition` als Funktionsreferenz an `animateActiveItem`, statt die Funktion aufzurufen. Die Funktion selbst beschreibt `slide`, Richtung `right`, 400 ms. Das Framework erwartet eine Konfiguration bzw. Animation; die tatsächlich sichtbare Animation ist deshalb gesondert zu prüfen. Es wird hier keine garantierte 400-ms-Animation behauptet.

Nicht aktiv verknüpft: `LoginController.activeMain`/`slideLeftTransition` verweisen auf `startContainer`, obwohl nur `searchcontainer` definiert ist; `Search_Controller.activateLagerfach` hat keinen gefundenen Aufrufer. Das sind vorhandene Legacy-Methoden, keine Löschfreigabe.

Aktuelle Tabletmerkmale: Suchbutton 10 % Breite, Suchfeld 80 %, fester 200-px-Spacer, Ergebnisbereich 470 px hoch, horizontales Scrollen, mehrspaltiges Tabellen-Template. `Lagerfach` enthält selbst nur Platzhalterfelder; eine ausschließliche Bearbeitung dieser View würde die zur Laufzeit erzeugten Felder nicht vollständig erfassen.

# 6. Fachlicher Inventurablauf

Dieser Abschnitt beschreibt ausschließlich den IST-Zustand einschließlich seiner Grenzfälle.

## 6.1 Anmeldung, Benutzer und Standort

`get_login.php?action=Liste` liefert alle Mitarbeiter mit `State=0`, nach Name sortiert. Passwort, Token oder rollenbezogene Anmeldung sind im Anwendungscode nicht vorhanden. Die Anmeldung ist eine clientseitige Namensprüfung gegen diese Liste, keine im PHP implementierte Authentifizierung.

Jedes `keyup` im sichtbaren Namensfeld wandelt den Suchtext mit `toLowerCase()` um, löscht bestehende Storefilter und verwendet `new RegExp(Suche)` für das Feld `suchcode`. Die Eingabe ist damit ein regulärer Ausdruck, keine maskierte Teilzeichenkette. Ungültige Regex-Zeichenfolgen können ohne eigenen Catch fehlschlagen. Trefferliste: maximal 210 px, mindestens 35 px, berechnete Höhe 35 × Trefferzahl; bei null Treffern versteckt. Die Scrollfunktion des Loginformulars wird deaktiviert. `scrollable: false` erzeugt im vorhandenen Touch-Container einen deaktivierten ScrollView; die Getter-Kette ist deshalb nicht allein aufgrund dieser Konfiguration als defekt einzustufen.

Ein Listentap setzt `record.data.Name` in das Suchfeld und versteckt die Liste. Anmelden filtert den aktuell vorhandenen Store zusätzlich per `Name == username`, ohne vorher `clearFilter()` aufzurufen. Mindestens ein exakter Treffer löst `signInCommand` aus, andernfalls erscheint die Fehlermeldung, der Name sei nicht in der Datenbank. Gespeichert wird später der Name, nicht Mitarbeiter-`Code` oder `PickBatchIdentifierId`.

| Standortwert | Auswahltext | Standortwert | Auswahltext | Standortwert | Auswahltext |
| --- | --- | --- | --- | --- | --- |
| `10` | Stendal | `20` | Dessau | `30` | Brandenburg |
| `40` | Magdeburg | `50` | Perleberg | `60` | Wildau |
| `70` | Lindenberg | `80` | Potsdam | `90` | Fürstenwalde |

Es gibt keine individuelle Standortberechtigung und keine separate Standortvalidierung im Anmeldehandler. Eine explizite `value`-Vorgabe am Selectfield fehlt; die initiale Auswahl wird vom Touch-Selectfield bestimmt. Die Suchtoolbar übersetzt nur `10` bis `50`; für `60` bis `90` zeigt sie `Kein Lager gewählt`, obwohl der gewählte Standortwert an die Suche weitergegeben wird (`Search_Container.js:40`).

Nach Anmeldung werden `LagerInventur.username` und `.standort` gesetzt. Ein alle fünf Sekunden laufender GET auf `leer.html` wird gestartet. Die aktive View wird zerstört; eine Abmeldung oder Standortänderung innerhalb des weiteren Ablaufs ist nicht implementiert.

## 6.2 Inventurbereich, Lager und Lagerplatz

Ein Inventurkopf, eine Inventurnummer, ein Zählauftrag oder ein auswählbarer Inventurbereich existiert in den eigenen Models/Views nicht. Praktisch entsteht der Arbeitsbereich aus Standort und Suchtext. Die Lagerortnummer kommt bei der normalen Suche aus `[Location Code]` der Bestandszeile; eine zusätzliche Lagerauswahl gibt es nicht.

Ohne aktivierte Checkbox ist die Eingabe eine Lagerplatzsuche. Der Suchenbutton leert zunächst `Store_Artikelnummern`. Anschließend entfernt der Controller Bindestriche **nur für die Mindestlängenprüfung**. Weniger als sechs verbleibende Zeichen → Labelmeldung und kein Request. Gesendet wird der unveränderte Originaltext, ohne `trim`, zusammen mit Standort und `artikelsuche='false'`.

Der Server filtert `dbo.Lagerbestand` nach `ME_Hauptlager > 0`, `ze = Standort` und `Lagerplatz LIKE keyword + '%'`, sortiert nach Lagerplatz. Bindestriche werden im SQL nicht entfernt; eine entsprechende Normalisierung ist nur auskommentiert. `ME_WE` und andere Bestandswerte werden nicht zur Zähl-Sollmenge addiert. Die Sollmenge ist `ME_Hauptlager`.

Die Antwort ergänzt frühere Zählungsinformationen über `jf_inventur_lagerfach` sowie Bewegungsinformationen aus NAV. Bei null Treffern dieser normalen Suchart wird `{artikel: [], total: 0}` geliefert. Die UI zeigt ihren `emptyText`.

## 6.3 Artikel-/Barcode-Suche als eigener Modus

Mit Checkbox „Lagerfach des Artikels suchen?“ setzt die View ihren Wert auf Boolean `true` und ändert den Placeholder auf Hersteller-Nr./EAN. Der Controller prüft mindestens vier Zeichen nach Entfernung der Bindestriche und sendet sonst unveränderten Suchtext, Standort und `artikelsuche=true`.

Der PHP-Zweig hängt an den zweistelligen Standort `01` an (z. B. `10` → `1001`). Gesucht wird in `BAT$Nonstock Item` über Herstellerartikelnummer als Präfix, jeweils ohne Leerzeichen und in Großbuchstaben, **oder** über `[Bar Code] LIKE keyword` ohne automatisch angefügtes `%`. SQL-Wildcards in der Eingabe behalten ihre Wirkung. Über `BAT$Warehouse Entry` werden Lagerplätze für den Lagerort ermittelt, `Bin Code = 'WE'` ausgeschlossen und die ausgewählten Spalten gruppiert. Es gibt in diesem Zweig keine Bestandsbedingung `ME_Hauptlager > 0` und keine HAVING-Klausel zur Bereinigung historischer Bewegungen.

Der Server berechnet zwar `get ME_verfuegbar_filiale`, übernimmt dessen Alias `Menge in Filiale` aber nicht in das JSON. Zahlreiche stattdessen gelesene `$row`-Schlüssel fehlen in dieser SELECT-Liste; Details in Kapitel 9. Die Anzeige von Fach, Hersteller-Nr. und Text ist trotzdem aus ausdrücklich ausgewählten Spalten vorgesehen.

Solange die Checkbox aktiv ist, führt ein Ergebnistap ausschließlich zur Meldung „Bei der Lagerplatzsuche ist keine Erfassung der Bestände möglich“. Es gibt keinen automatischen Übergang vom gefundenen Fach in den Zählmodus. Ein Moduswechsel allein leert vorhandene Treffer nicht; die Sperrentscheidung verwendet den aktuellen Checkboxwert, keine Herkunftsmarkierung des Records.

**Kein Treffer / unbekannter Barcode:** Das `break` in `get_artikelnummern.php:184` liegt innerhalb der Bedingung `sqlsrv_num_rows(...) > 0`. Ohne Treffer wird `case 'create'` erreicht und `php://input` gelesen, obwohl der Auslöser ein GET ist. Es können dann SELECT und ein INSERT-/UPDATE-Versuch mit fehlenden Daten folgen. Ob PHP/SQLSRV zuvor abbricht, Warnungen ausgibt oder die Datenbank einen Datensatz akzeptiert, ist **nicht aus dem vorhandenen Quellcode sicher ermittelbar**. Ein sauberer Leerlistenvertrag ist für diesen Fall nicht belegt.

## 6.4 Auswahl und Bewegungssperre

Sowohl `itemtap` als auch `itemtaphold` rufen `onDataView_tap_hold` auf. Zunächst wird die Detailview bei Bedarf erzeugt und ihr Record gesetzt, danach werden die Sperren geprüft.

1. Checkboxwert strikt `true` → keine Zählmaske.
2. Andernfalls `record.data.Activity_Type !== null` → Sperrmeldung mit Fach und `gew_lieferdatum`. Numerischer Wert `5` wird als „Kommissionierung“ bezeichnet, jeder andere nicht-NULL-Wert als „Einlagerungen“.
3. Nur `Activity_Type === null` öffnet die Zählmaske. Fehlend/`undefined`, `0`, String `'5'` und numerische `5` sind deshalb keine beliebig austauschbaren Werte. Es findet keine clientseitige Prüfung statt, ob das angezeigte Datum bereits vergangen ist.

Die Bewegungsabfrage verknüpft Fach und Standortpräfix, nicht den Artikel. Mehrere passende Bewegungszeilen können mehrere Ergebniszeilen erzeugen. Der eigene ActivityLine-Store ist dafür nicht erforderlich; der aktive Artikel-SELECT liefert die Sperrinformation direkt.

## 6.5 Menge und Zählung

Der Controller setzt den Titel „Lagerfach …“, zeigt Artikeltext und Herstellerartikelnummer schreibgeschützt und verbirgt den Sollbestand. Als sichtbare Menge wird `????` ausgegeben. Das ist eine Blindzählung, obwohl der Sollbestand bereits im Clientrecord liegt. Die neue gezählte Menge beginnt bei jedem Öffnen leer; eine vorhandene Zählung wird nicht als Eingabewert übernommen.

Die Fieldsets werden per `setConfig({items: ...})` neu aufgebaut. Einige versteckte Felder tragen ungewöhnliche Schlüssel (`me_we`, `ze`, `lagerort` anstelle `name`) und jeweils `record.data.menge` als Wert; die Speicherung liest diese Felder nicht aus, sondern die betreffenden Werte aus dem Record.

Das Mengenfeld ist ein `numberfield` mit `required: true`, ohne eigene min/max/Dezimalvorgabe. Es gibt keine additive Zählung, keinen Scan-Zähler, keine Verpackungsumrechnung und keine Berechnung eines Inventurwerts. Der Benutzer gibt eine Gesamtmenge für den gewählten Eintrag ein.

Speichern liest die private Eigenschaft `_value`. Nur der exakte Leerstring wird ausdrücklich abgewiesen. Ansonsten vergleicht der Controller `Number(newValue)` mit `Number(record.data.menge)`. Bei Gleichheit folgt der Schreibvorgang direkt. Bei Abweichung fragt ein Dialog „Ja“ oder „noch einmal zählen“; nur `yes` schreibt, die andere Auswahl lässt die Eingabe unverändert stehen. Null, ungültige Eingaben, Komma/Punkt, negative Werte und Dezimalwerte sind nicht durch zusätzliche eigene Geschäftsvalidierungen abgesichert. Das tatsächliche DOM-/`_value`-Zusammenspiel gehört in den Vergleichstest; Touch Number verwendet intern `parseFloat`, `getValue()` kann bei ungültiger Eingabe `null` liefern.

## 6.6 Speicherung, Korrektur und Fortsetzung

Vor `save()` verändert der Controller die Felddefinitionen des Records auf zehn Stringfelder plus ISO-Datumsfeld. Er setzt Sollmenge (`menge` → `menge_im_fach`), gezählte Menge, Benutzername, Clientzeit und die unveränderten Identifikations-/Bestandsdaten. `validate()` wird aufgerufen, aber im Model sind keine eigenen `validations` definiert. Der Fehlerzweig enthält `current.Daten.reject()` mit nicht definiertem `current`.

Der bereits ausgewählte Record wird zusätzlich dem Artikelstore hinzugefügt und mit `currentDaten.save()` gespeichert. Die Leseantwort enthält keine `id`, obwohl SQL `[id]` selektiert; Touch erzeugt daher eine interne ID und markiert solche Records als `phantom`. Nach `touch/src/data/Model.js:984` führt dies zu `create` → POST auf `get_artikelnummern.php?action=create`. Es ist keine `store.sync()`-Synchronisation.

Der Server führt für diesen Aufruf aus:

- SELECT: existiert mindestens ein Datensatz derselben Katalogartikelnummer und desselben Lagerorts mit Status ungleich `gebucht`?
- Ja: UPDATE **aller passenden Zeilen** mit neuer gezählter Menge, Zählername, Serverzeit und Status `geändert`. Fach, ursprünglicher Sollbestand, `ze`, Artikeltexte und `me_we` werden in diesem Zweig nicht aktualisiert.
- Nein: INSERT mit zwölf Spalten und Status `gezählt`.

`gezaehlt_am` kommt serverseitig aus `date('d-m-Y H:i:s')`. Die mitgeschickte Clientzeit wird nicht übernommen. Serverzeitzone, Datentyp und sprachabhängige SQL-Datumsauswertung sind unbekannt.

Der PHP-Dienst entscheidet den JSON-Erfolg über `sqlsrv_num_rows($ergebnis) >= 1` nach dem Schreibstatement. Ob diese Auswertung in der vorhandenen Laufzeit einen erfolgreichen Schreibvorgang korrekt meldet, ist nicht bewiesen; ein SQL-Erfolg und ein UI-Erfolg dürfen im Test nicht gleichgesetzt werden.

Erfolg im Client: Bestätigungsdialog mit Katalogartikelnummer/Menge, `commit()`, Navigation zurück und sofortiger Reload mit den zuletzt gesetzten Suchparametern. Die Navigation wartet nicht auf das Schließen des Erfolgsdialogs. Fehler: Fehlermeldung und `reject()` des lokalen Records, keine Navigation und kein automatischer Retry. Der Serverzustand wird dadurch nicht zurückgerollt.

Eine Korrektur geschieht durch erneutes Öffnen und Eingeben einer neuen Gesamtmenge. Zurück ohne Speichern bewirkt nur Navigation, ohne Rückfrage. Es gibt keinen automatischen nächsten Artikel, kein automatisches Leeren/Fokussieren des Suchfelds, keinen Abschlussbutton, keine Stornierung/Löschung und keine NAV-Buchungsfunktion. Wer `gebucht` setzt, ist nicht aus dem Repository ersichtlich.

# 7. Controller und Fachlogik

| Datei / Funktion | Aufgabe | Zu schützende Kopplung |
| --- | --- | --- |
| `LoginController.js:43 onSignInCommand` | globale Identität/Standort, Pingtimer, Login entfernen | Benutzername/Standort unverändert für Folgezugriffe |
| `LoginController.js:100 onMitarbeiter_suchen_List` | Name übernehmen, Liste verstecken | Server-Name statt Mitarbeiter-ID |
| `LoginController.js:108 onMitarbeiter_Suchen_Keyup` | Regexfilter, Trefferhöhe, Scrollen | Filtersemantik und vollständig geladener Store |
| `LoginController.js:164 slideLeftTransition`, `:168 activeMain` | nicht aktiv angeschlossene Navigation | alter `startContainer`-Selektor, nicht nebenbei entfernen |
| `Search_Controller.js:62 on_fn_search_lagerfach` | Modus, Mindestlängen, Proxyparameter, Storeload | unveränderter Suchtext, `standort`, `'false'`/Boolean `true` |
| `Search_Controller.js:108 onButtonTap`, `:112 onButtonSpreichern` | Weiterleitung an Zurück/Save | bestehende Button-IDs |
| `Search_Controller.js:116 showSignInFailedMessage` | Suchfehlerlabel | nicht mit Login-Authentifizierung verwechseln |
| `Search_Controller.js:126/:130` | Tap und Hold weiterleiten | genau dieselbe Recordauswahl |
| `Search_Controller.js:135 onSpeichern` | Menge vergleichen, bestätigen, Payload, validieren, Save, Rückmeldung | zentraler fachlicher Schreibpfad |
| `Search_Controller.js:267 onZurueck`, `:272 activateLagerfach`, `:278 slideRightTransition` | Viewwechsel / Animation; activate ohne Aufrufer | Navigation darf keinen zusätzlichen Save auslösen |
| `Search_Controller.js:286 onDataView_tap_hold` | Record setzen, Modus-/Bewegungssperre, dynamische Details | NULL-/Typvergleich, Blindzählung, neuer leerer Mengenwert |
| `Search_Controller.js:381 init` | globale Sessiondaten und deutsche Datumsfunktionen | Zustand für alle Views; Auswirkungen auf gemeinsame spätere App |

Die View-Methoden `Login.onLogInButtonTap`, `Search_Container.onMycheckboxCheck`, `.onId_artsucheUncheck`, `.onSuchen_lagerfachTap` gehören ebenfalls zum fachlichen Ablauf. Eine View ist somit nicht automatisch eine reine Layoutdatei.

Globale/übergreifende Zustände: `LagerInventur`, globale `Ext.Date`-Änderungen, `Ext.theme`, Manifest-/Microloaderstatus, registrierte Stores mit Filtern/Proxyparametern, aktive View, Detailrecord und seine dirty-/phantom-Zustände. Globale IDs sind u. a. `id_artsuche`, `id_suchetoolbar`, `lagerfachField`; zur Laufzeit kommen `fieldset0`/`fieldset1` hinzu. Der Pingtimer ist lokal in einer Closure, läuft aber über die Lebensdauer der entfernten Loginview hinaus. `stopPing()` ist definiert, wird im aktiven Ablauf nicht aufgerufen.

# 8. Models und Stores

| Model / Store | Daten und Vertrag | Besonderheiten |
| --- | --- | --- |
| `auftragsnummern` / `artikelnummern` | Fach, Katalogartikel, Hersteller-Nr., Text, `menge`, `me_we`, `gezaehlt`, `wurde_gezaehlt`, `gezaehlt_am`, `zaehler`, `info`, `lagerort`, `ze`, `Activity_Type`, `gew_lieferdatum` | Name „auftragsnummern“ ist irreführend; tatsächlich Artikel-/Bestands-/Zählrecord. Ajaxproxy am Model, Readerwurzel `artikel` |
| `Model_LagerMitarbeiterLogistic` / `Store_LagerMitarbeiterLogistic` | `Code`, `Name`, `PickBatchIdentifierId`, `suchcode` | Readerwurzel `akiv`, autoload, lokale Filter |
| `Model_ActivityLine` / `activityline` | `bin_code`, `Activity_Type` | Readerwurzel `akiv`; Leseendpoint liefert nur `bin_code`; Store ohne aktiven Verbraucher |

Alle drei Models verwenden Ajax, Json-Reader und Json-Writer. Initial keine expliziten Feldtypen, Relationsdefinitionen, eigenen Validatoren oder `idProperty`-Änderungen. Der SDK-Standard ist `id`, die Serverantworten enthalten dieses Feld nicht. Die fehlende ID ist besonders beim Artikelrecord mit dem gewünschten `create`-Pfad verbunden und darf nicht als kosmetische Modellkorrektur ergänzt werden.

Store-Defaults aus dem mitgelieferten SDK: `pageSize: 25`, kein explizites Autoload außer Mitarbeitern. Die PHP-Dienste lesen `page`, `start`, `limit`, setzen aber keine SQL-Paginierung um. Alle gefundenen Zeilen werden zurückgegeben. Keine App-eigenen Store-Loadlistener, Proxy-Exceptionlistener, Sorter, Remote-Filter, persistenten Proxys oder Autosync-Konfigurationen gefunden.

`clearData()` setzt im alten Store intern die Daten auf `null`. Dies geschieht **vor** der Suchvalidierung; auch eine zu kurze neue Suche entfernt vorherige Treffer. Die Suchparameter bleiben nach dem Speichern erhalten. Records und Filter sind nur im Arbeitsspeicher vorhanden.

# 9. Backend / API

## 9.1 Vollständiger fachlicher Aufrufkatalog

Alle URLs sind relativ zur ausgelieferten App. Kommentare mit `http://beg-web.berg-sdl.de/iv/...` sind historische Beispiele, keine aktive Basis-URL. Die tatsächliche Deployment-URL ist nicht sicher ermittelbar.

Die HTTP-Methoden der Modelproxies folgen dem gelesenen Touch-Default (`touch/src/data/proxy/Ajax.js:264`): read GET, create/update/destroy POST. `action=delete` im PHP ist deshalb nicht mit einer HTTP-DELETE-Anforderung gleichzusetzen.

| Aufrufende Datei | Funktion / Auslöser | Endpoint unter `resources/services/` | Methode | Parameter / Body | Erwartete Rückgabe | Fachlicher Zweck | Fehlerbehandlung | UI-Abhängigkeit / Aktivität |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `app/store/Store_LagerMitarbeiterLogistic.js:24` → `app/model/Model_LagerMitarbeiterLogistic.js:24` | `autoLoad` bei Appstart | `get_login.php?action=Liste` | GET | `keyword=''`, `standort=''`; Store-Paging, `_dc`; PHP ignoriert Filter/Paging fachlich | `{akiv:[{Code,Name,PickBatchIdentifierId,suchcode}],total:n}` | aktive Mitarbeiter laden | kein eigener UI-Ladefehlerhandler; PHP SQL-Fehlertext/Abbruch | Loginliste und Namensfreigabe; aktiv |
| `app/controller/LoginController.js:54` | `ping`, Intervall nach Anmeldung | `leer.html` | GET | keine fachlichen Parameter; Ajax-Cachebuster möglich | erfolgreicher HTTP-Status; leerer Inhalt | Erreichbarkeit Webserver | Alert „Verbindung zum Server verloren“ | wiederkehrender Dialog; aktiv alle 5 s |
| `app/controller/Search_Controller.js:62` → `app/model/auftragsnummern.js:25` | normale Suche / `.load()` | `get_artikelnummern.php?action=ListeArtikelnummern` | GET | `keyword=Originaleingabe`, `standort`, `artikelsuche='false'`, Paging, `_dc` | `{artikel:[Bestandsrecords],total:n}` | Bestände/Fächer/Zählinfo/Bewegungssperre | kein eigener Loadfehlerhandler; SQL-Fehler beendet PHP | Dataview, später Detail; aktiv |
| dieselben Dateien | Artikel-/EAN-Suche / `.load()` | gleicher Leseendpoint | GET | `keyword`, `standort`, `artikelsuche=true`, Paging, `_dc` | vorgesehen gleiche Hülle; Teilfelder unvollständig; null Treffer fällt in create | Fach anhand Hersteller-Nr./EAN finden | keine eigene Barcodefehlerbehandlung; PHP-Warnungs-/Schreibrisiko | Dataview, Zählung bei aktivem Modus verboten; aktiv |
| `app/controller/Search_Controller.js:205` → Artikelmodel | nach Save-Erfolg `.load()` | gleicher Leseendpoint | GET | zuletzt am Proxy gesetzte Parameter | Ergebnisliste neu | aktuellen Zählstatus anzeigen | kein eigener Reloadfehlerhandler | Rückkehr zur Liste; aktiv |
| `app/controller/Search_Controller.js:198` → `app/model/auftragsnummern.js:24` | `record.save()`, phantom | `get_artikelnummern.php?action=create` | POST | JSON-Einzelobjekt, siehe 9.2; Proxy-ExtraParams ggf. zusätzlich | `{success:boolean,message:string}` ohne Datensatz/Server-ID | neue Zählung oder Korrektur | success: Alert/commit/zurück/reload; failure: Alert/reject | zentraler aktiver Save |
| `app/model/auftragsnummern.js:26` | deklarierter `update`, theoretisch Save eines nicht-phantom Records | `get_artikelnummern.php?action=update` | POST | Json-Writer-Record | Reader erwartet JSON, PHP-Zweig ist nicht funktionsfähig belegt | keine belegte reguläre Korrekturroute | undefinierte `$query`, vermischte mysql-/pg-Aufrufe | kein expliziter UI-Aufruf; Erreichbarkeit bei geändertem Recordzustand beachten |
| `app/model/auftragsnummern.js:27` | deklarierter `destroy` | `get_artikelnummern.php?action=` | POST | Writer-Record | kein definierter Ergebnisvertrag | keine belegte Löschfunktion | leere action passt zu keinem case; `$result` ungesetzt | nicht durch UI aufgerufen |
| `app/model/Model_ActivityLine.js:24` | deklarierter read | `get_activityline.php?action=Listeactivityline` | GET | `keyword`, `standort`, Paging, `_dc`; SQL setzt Werte unquoted ein | `{akiv:[{bin_code}],total:n}` | separate Bewegungsprüfung vorgesehen | SQL-Text/Fehler und Abbruch | kein aktiver Storeload gefunden |
| `app/model/Model_ActivityLine.js:23` | deklarierter create | `get_activityline.php?action=create` | POST | Inventur-JSON wie Artikelcreate im PHP erwartet; Activitymodel liefert diesen Vertrag nicht | `{success,message}` | Schreiben in `jf_inventur_lagerfach_temp` | gleicher problematischer num_rows-Erfolgstest | nicht aktiv aufgerufen; nicht als reiner Lesedienst behandeln |
| `app/model/Model_ActivityLine.js:25` | deklarierter update | `get_activityline.php?action=update` | POST | Writer-Record | nicht verlässlich definiert | Legacy-Stub | mysql-/pg-Mischung, undefinierte Werte | nicht aktiv aufgerufen |
| `app/model/Model_ActivityLine.js:26` | deklarierter destroy | `get_activityline.php?action=` | POST | Writer-Record | nicht definiert | Legacy-Stub | keine passende action | nicht aktiv aufgerufen |
| `app/model/Model_LagerMitarbeiterLogistic.js:23` | deklarierter create | `get_login.php?action=create` | POST | Mitarbeiter-Writer-Record | nicht definiert; case ist leer | keine Mitarbeiteranlage implementiert | Ergebnis ungesetzt | nicht aktiv aufgerufen |
| `app/model/Model_LagerMitarbeiterLogistic.js:25` | deklarierter update | `get_login.php?action=update` | POST | Mitarbeiter-Writer-Record | nicht verlässlich definiert | Legacy-Stub | mysql-/pg-Mischung | nicht aktiv aufgerufen |
| `app/model/Model_LagerMitarbeiterLogistic.js:26` | deklarierter destroy | `get_login.php?action=` | POST | Writer-Record | nicht definiert | Legacy-Stub | keine passende action | nicht aktiv aufgerufen |

Alle drei PHP-Dienste enthalten zudem `case 'delete'` ohne Anweisungen, aber die Models verweisen mit destroy auf die leere action. Es gibt keinen implementierten fachlichen DELETE. Kein weiterer App-eigener `fetch`, XHR, Ajax-, JsonP-, HTML-Fragment- oder fremder Webservice-Aufruf wurde gefunden. Die auskommentierte Mitarbeiter-`loadPage(1)`-Variante ist nicht aktiv.

## 9.2 Schreibdaten und Rückgabefelder

| POST-Feld | Herkunft im Controller | Verwendung im aktiven PHP-create |
| --- | --- | --- |
| `carlanr` | Record | SELECT-/UPDATE-Suchschlüssel; INSERT `katalogartikelnr` |
| `fachnummer` | Record | INSERT `lagerplatz`; kein UPDATE-Schlüssel |
| `art_herst_art_nr` | Record | INSERT |
| `art_text1` | Record | INSERT mit `utf8_decode` |
| `menge_im_fach` | Record-`menge` | INSERT ursprünglicher Sollbestand |
| `gezaehlt` | Mengenfeld-`_value`, danach Stringfeld | INSERT oder UPDATE; keine serverseitige Mengenvalidierung |
| `gezaehlt_am` | Client-`new Date()`, Writerformat `c` | ignoriert; ersetzt durch PHP-Serverzeit |
| `zaehler` | globaler Benutzername | INSERT mit `utf8_decode`; UPDATE direkt in SQL-String |
| `lagerort` | Record-`lagerort` | zweiter SELECT-/UPDATE-Schlüssel; INSERT |
| `ze` | Record | INSERT |
| `me_we` | Record | INSERT, keine Mengenaddition |

Der alte Json-Writer nutzt `allowSingle: true`, `encode: false`, keine Writerwurzel und `writeAllFields: true`. Zusätzlich kann die generierte interne `id` enthalten sein; PHP verwendet sie nicht. Es wird ein JSON-Objekt aus `php://input` erwartet, kein Formular und kein Array. Das Model wird vor dem Save dynamisch neu konfiguriert; exakt resultierende Datentypen und zusätzliche Felder müssen später per Requestvergleich belegt werden.

Normale Suchantwort: `fachnummer`, `art_herst_art_nr`, `art_text1`, `menge`, `carlanr`, `gezaehlt`, `info`, `gezaehlt_am`, `ze`, `lagerort`, `wurde_gezaehlt`, `me_we`, `Activity_Type`, `gew_lieferdatum`. `zaehler` und SQL-`id` werden nicht ausgegeben. `wurde_gezaehlt` wird gelesen, aber nicht in der SELECT-Liste erzeugt. In der Artikel-/EAN-Suche sind nur die ersten drei ausgegebenen Angaben sicher aus selektierten Spalten befüllt; u. a. `KANR`, `ME_Hauptlager`, `Location Code`, `Activity` fehlen. Die tatsächliche Ausgabe hängt auch von PHP-Warnungskonfiguration und SQLSRV-Datumskonvertierung ab.

## 9.3 Technische HTTP-Ladevorgänge

| Aufrufstelle | GET-Ziel / Parameter | Inhalt / Zweck | Fehler-/UI-Verhalten |
| --- | --- | --- | --- |
| `index.html`, Touch-development-Microloader | `app.json`, JS-/CSS-Pfade des Manifests; später Klassenpfade unter `app/` und `touch/src/` | Appstart, Klassen/Theme | Entwicklungsmicroloader hat keine eigene verständliche Fehleransicht für Manifestfehler |
| `.sencha/app/microloader/development.js` | `bootstrap.json`, referenzierte Assets | alternativer Cmd-Entwicklungsbootstrap | nicht der direkt eingetragene Einstieg |
| testing-Microloader | JS/CSS aus übergebenem Manifest | Testing/native Assets | Script-/Stylesheet-Laden, kein fachlicher Cache |
| production-Microloader | `app.json?<Zeitwert>`, Asset-URLs mit Zeitwert, `deltas/<Pfad>/<alteVersion>.json` | Assetcache und Softwareupdates | Delta-HTTP-Fehler → voller Assetabruf; Prüfsummenfehler → Refresh-Rückfrage; Evaluationsfehler → Konsole; kein Inventur-Retry |
| production-Microloader `requestIframe` | `<sharedAssetURI>.html` | unterstützter Shared-Asset-Weg | keine shared/remote Assets im Appmanifest konfiguriert |
| HTML-/CSS-/App-Ressourcen | Schlüsselbild, Icons, Startbilder; CSS-Pfeile `larr.png`, `rarr.png`, `check_box_klein.png`; ggf. `cache.appcache` | statische Darstellung bzw. Browsercache | keine fachlichen Parameter; Icon `Icon_.png` fehlt |

HTML-Fragmente unter `resources/html/` enthalten weder eigene Scripts noch aktive Serviceaufrufe. Lizenz-, Blog- und Beispiel-URLs in Kommentaren werden nicht automatisch aufgerufen. Allgemeine SDK-Plugins können weitere Netzwerkfunktionen enthalten, werden durch die App aber nicht konfiguriert/gestartet.

## 9.4 Gemeinsame Backendmechanik

Alle PHP-Endpunkte rufen `session_start()` und `setlocale(LC_MONETARY, 'de_DE')` auf und inkludieren dieselbe DB-Verbindung. Es werden keine eigenen Sessionwerte gespeichert/geprüft. Keine Methodensperre, Authentifizierungsprüfung oder CORS-Konfiguration ist in diesen Dateien implementiert. Vorgelagerte Webserver-/VPN-Zugangskontrollen sind nicht aus dem Quellcode sicher ermittelbar.

Mit `callback` wird JavaScript/JSONP ausgegeben, sonst `application/x-json` und `Cache-Control: no-cache, must-revalidate`. Die App verwendet Ajax, keinen JsonP-Proxy. Die Requestparameter werden aus `$_REQUEST` gelesen; JSON-Schreibdaten separat aus `php://input`.

SQL-Fehler werden teils direkt als Text ausgegeben; der Reader erwartet aber JSON. `utf8_encode`, `utf8_decode`, `addslashes`, deutsche Statusstrings und Serverdatumsformate beeinflussen den Vertrag. Hilfsfunktionen `umlaute`, `mssql_escape`, `hochkomma`, `jf_mssql_escape_string` sind definiert, werden von den aktiven SQL-Konstruktionen jedoch nicht als allgemeine Absicherung verwendet.

Die Such-SELECTs und Korrektur-UPDATEs setzen Eingabewerte unmittelbar in SQL-Strings ein; die Parameterisierung der INSERTs schützt diese anderen Zweige nicht. Das ist ein statisch belegtes SQL-Injection-/Sonderzeichenrisiko, kein durchgeführter Angriffstest und keine Freigabe für eine Backendänderung. `get_artikelnummern.php:44` liest außerdem `$_REQUEST['artikelsuche']` ohne Vorhandenseinsprüfung vor dem Switch, also auch bei Schreibaktionen. Fehlende Parameter können abhängig von der PHP-Konfiguration Warnungen bis in die JSON-Ausgabe verursachen.

# 10. Datenbankabhängigkeiten

## 10.1 Verbindungen und Objekte

`resources/services/dbconnection_nav.inc.php` setzt `$Firma='BAT'`, `$NAV='NAV_TEST'` und eine SQLSRV-Verbindung auf `NAV-SQL`, Standarddatenbank `tools`. Die Datei enthält fest eingetragene Zugangsdaten. Ihr Wert wird hier nicht wiedergegeben und wurde nicht geändert. Der Befund ist bei späterer Ressourcenübernahme relevant, weil `resources/services` derzeit als Buildressource eingetragen ist.

| Datenbank / Objekt | Operationen im Repository | Relevante Felder / Beziehung | Sicherheit der Aussage |
| --- | --- | --- | --- |
| `NAV_TEST.dbo.[BAT$Whse_ Employee Logistic]` | SELECT in `get_login.php:60` | `State=0`, `Name`, `Code`, `Pick Batch Identifier Id`; lowercase Name als Suchcode | Name aus Variablen aufgelöst; DDL/Schlüssel nicht vorhanden |
| `tools.dbo.Lagerbestand` | SELECT in `get_artikelnummern.php:70` | Katalogartikel, `artikelnr`, `ze`, Location Code, Lagerplatz, Hauptlager-/WE-Mengen, Artikelstammfelder | aktueller DB-Kontext tools; Tabelle oder View nicht sicher feststellbar |
| `tools.dbo.jf_inventur_lagerfach` | SELECT, INSERT, UPDATE | Zähldaten, Status, `id`; Read-Join Artikel+`ze`, Write-Suche Artikel+`lagerort`+offener Status | Objektname und DML sicher; Typ, Constraints/Trigger unbekannt |
| `NAV_PROD.dbo.[BAT$Warehouse Activity Line]` | SELECT/Join im Artikelservice; separater Activityservice | Bin Code, Location Code, Activity Type, Due Date | fester Produktionsname, unabhängig von `$NAV` |
| `NAV_PROD.dbo.[BAT$Nonstock Item]` | SELECT in Artikelmodus | Item No_, Manufacturer Item No_, Manufacturer Code, Description, Bar Code | Beziehung zu Warehouse Entry über Item No_ |
| `NAV_PROD.dbo.[BAT$Warehouse Entry]` | SELECT/Join in Artikelmodus | Item No_, Location Code, Bin Code | kein aktueller Bestand je Fach aggregiert; ausgewählte Felder gruppiert |
| `tools.dbo.[get ME_verfuegbar_filiale]` | skalarer Funktionsaufruf im SELECT | Parameter Item No_ und Standort+'01' | Funktion, keine nachgewiesene Stored Procedure; Definition fehlt |
| `tools.dbo.jf_inventur_lagerfach_temp` | SELECT, INSERT, UPDATE in `get_activityline.php:create` | temporär benannter Zählbestand, Suchschlüssel nur Katalogartikel+Status | aktiver PHP-Code, aber kein UI-Aufrufer |

Es gibt keine `CREATE`-/`ALTER`-DDL, keinen implementierten SQL-DELETE und keinen expliziten Stored-Procedure-Aufruf (`EXEC`/`CALL`) in den eigenen Services. Die mysql-/pg-Aufrufe in update-Stubs sind kein belastbarer Nachweis zusätzlich genutzter MySQL-/PostgreSQL-Datenbanken. Deren Verbindung und Query fehlen.

## 10.2 SQL-Katalog und Beziehungen

| Kennung / Fundstelle | Tatsächliche Abfragebedingung / DML |
| --- | --- |
| SQL-L, `get_login.php:60` | aktive Mitarbeiter `State=0`, `WITH (NOLOCK)`, `ORDER BY Name`; keine Standort-/Keywordeinschränkung |
| SQL-B, `get_artikelnummern.php:70` | `Lagerbestand lb LEFT OUTER JOIN jf_inventur_lagerfach ivt ON ivt.katalogartikelnr=lb.katalogartikelnr AND ivt.ze=lb.ze`; anschließend FULL OUTER JOIN Activity Line über Fach und Standortpräfix; WHERE lb-Menge > 0, lb-`ze`=Standort, lb-Fachpräfix; `ORDER BY lb.Lagerplatz` |
| SQL-A, `get_artikelnummern.php:140` | Nonstock Item INNER JOIN Warehouse Entry über Item No_; Lagerort Standort+'01'; Herstellerpräfix ohne Leerzeichen/Groß-/Kleinschreibung oder Barcode-LIKE; Fach <> WE; GROUP BY Fach und ausgewählte Artikel-/Barcodefelder; skalarer Mengenfunktionsaufruf |
| SQL-S1, `get_artikelnummern.php:209` | offene Zählungen nach Katalogartikel + Lagerort; weder `ze` noch Fach in der Bedingung |
| SQL-S2, `get_artikelnummern.php:217` | UPDATE `zaehler`, `gezaehlt`, `status='geändert'`, `gezaehlt_am`; gleiche Bedingung wie S1 |
| SQL-S3, `get_artikelnummern.php:227` | parameterisierter INSERT mit den zwölf in Kapitel 6.6/9.2 beschriebenen Spalten, Status `gezählt` |
| SQL-W, `get_activityline.php:62` | SELECT Bin Code mit `SUBSTRING(Location Code,1,2)=standort` und Bin Code=keyword, ohne SQL-Anführungszeichen um die angehängten Werte |
| SQL-T1/T2/T3, `get_activityline.php:123/131/140` | offene temporäre Zählung nur nach Artikel prüfen; UPDATE Menge/Status/Serverzeit ohne neuen Zähler; ansonsten INSERT mit zwölf Spalten und `gezählt` |

`info` wird im normalen SELECT aus gezählter Menge, Status und Datum (SQL-Konvertierungsstil 104) zusammengesetzt. Die Zählungsanzeige verwendet keinen Statusfilter; gebuchte und offene Einträge können durch den Join grundsätzlich sichtbar werden. Der FULL OUTER JOIN bewahrt aufgrund der anschließenden WHERE-Bedingungen auf `lb` keine reinen Activity-Zeilen ohne passenden Bestand. Mehrfachtreffer auf beiden Joinseiten können die Ergebniszahl vervielfachen.

Echte Primär-/Fremdschlüssel, Unique-Indizes, Kollation, NULL-Zulässigkeit, numerische Präzision, Datentypen, Trigger, Sichtdefinitionen, Datenbankrechte und Transaktionen externer Prozesse: **Nicht aus dem vorhandenen Quellcode sicher ermittelbar.** Im PHP ist keine explizite Transaktion um SELECT+UPDATE/INSERT vorhanden. Eine Sperre gegen parallele Zähler oder doppelte Speicheranforderungen ist nicht implementiert.

# 11. Scanner / Barcode

## 11.1 IST-Zustand

Barcodefunktion ist die SQL-Bedingung auf `BAT$Nonstock Item.[Bar Code]` im Artikelmodus. Es gibt kein eigenes Barcodemodel, keine Prüfziffer-/Symbologieprüfung, kein EAN-Parsing, keine Kamera-Scanmethode und keine Umrechnung eines Scans in eine Menge.

Das Feld `#lagerfachField` ist ein normales `Ext.field.Search`. Im Fachmodus enthält es ein Lagerplatzpräfix, im Artikelmodus Hersteller-Nr./EAN. Für beide Modi gilt: Button „Suchen“ → Store leeren → Mindestlänge → Request. Es gibt dort keinen eigenen `keyup`, `keydown`, `keypress`, `action`, Enter- oder Scanner-Eventhandler. Der einzige eigene `keyup`-Handler gehört zur Mitarbeitersuche.

Kein App-Aufruf von `Ext.device`, `cordova`, `phonegap`, Zebra DataWedge, EMDK, Intent-Receiver, Barcodeplugin oder Android-Key-API gefunden. Die entsprechenden allgemeinen SDK-Geräteklassen sind mitgeliefert und im Bootstrap katalogisiert, werden von BergInventur jedoch nicht verwendet. Die `CAMERA`-/`VIBRATE`-Berechtigungen des alten Packagers belegen keine implementierte Scan- oder Vibrationsfunktion.

Nach erfolgreicher Suche erscheint eine Trefferliste; weder automatische Artikelauswahl noch Fokuswechsel, akustische Scanbestätigung, Mengenerhöhung oder automatische Speicherung sind vorhanden. Bei unbekanntem Barcode gilt der PHP-Fallthrough aus Kapitel 6.3. Mehrere Scans werden auf Anwendungsebene weder entprellt noch zusammengezählt; was ein als Tastatur arbeitender Scanner in das fokussierte Feld schreibt/anhängt, hängt von Feldselektion und Scannerprofil ab. Parallele Such-/Save-Anforderungen werden nicht ausdrücklich verhindert oder storniert.

## 11.2 Relevanz für TC26/TC27, getrennte Zukunftsbewertung

Zebra DataWedge kann Daten als Tastatureingaben ausgeben und TAB/ENTER ergänzen. Deshalb ist das bestehende Textsuchfeld ein grundsätzlich geeigneter Anknüpfungspunkt. Wie das installierte Geräteprofil Zeichen und Enter an den gewählten Browser übergibt, muss am Gerät geprüft werden. [Zebra: Keystroke Output](https://techdocs.zebra.com/datawedge/8-0/guide/output/keystroke/)

Ein späterer Scan-Abschluss muss dieselbe Suchart, denselben Originaltext, dieselben Mindestlängen und dieselben Requests verwenden. Eine direkte Zählung aus der EAN-Trefferliste wäre eine Änderung des vorhandenen Ablaufs. Intent-Output wäre ein anderer, programmatisch angebundener Ausgabepfad; im Repository ist kein Empfänger vorhanden. Ob dafür eine native Hülle benötigt/gewünscht wird, bleibt eine separate Entscheidung. [Zebra: Output Plug-ins](https://techdocs.zebra.com/datawedge/8-0/guide/output/)

Die genannten Dokumentationsversionen beschreiben das Prinzip und sind kein Nachweis der DataWedge-Version auf den konkreten TC26/TC27. Betriebssystem, Browser, Scanprofil, Suffix, Symbologien und Tastaturkonfiguration: nicht sicher ermittelbar. In Phase 0 wurde nichts davon konfiguriert.

# 12. Fokus- und Eingabesteuerung

| Stelle | Heutiges Verhalten | Spätere Vergleichsanforderung |
| --- | --- | --- |
| Login-Suchfeld | Benutzereingabe + lokaler Regexfilter; Listenauswahl per Touch | identische Namensmenge/-auswahl und exakter Loginvergleich |
| Suchfeld `lagerfachField` | keine programmatische Fokussierung, Selektion oder Rücksetzung | bisherige Werte und Moduswechsel nachvollziehen |
| Touch `field/Text.js:378` | `keyup` synchronisiert Feldwert; Keycode 13 löst `action`, Standardaktion `blur` aus | Enter darf nicht unbemerkt zusätzlich suchen/speichern |
| Touch `form/Panel.js:214` | `submitOnAction: false`; App überschreibt es nicht | keine implizite Formularübermittlung ergänzen |
| Zählfeld | dynamisch neu mit Leerwert; native Number-Eingabe; Save liest `_value` | Null/Leer/0/Dezimal/Komma, unmittelbar nach Eingabe oder Scan speichern |
| Dialoge / Rückkehr | keine eigene Fokuswiederherstellung; Save-Erfolg navigiert und lädt sofort | keine verlorenen Scans oder Scanwerte im falschen Feld |
| Read-only-Felder | Anzeige mit `readOnly: true`, teilweise versteckt | Blindzählung und unveränderliche Artikeldaten erhalten |

Es gibt keine feste Tab-Reihenfolge der App, keinen automatischen Feldwechsel und keine eigene Unterdrückung der Bildschirmtastatur. Die `ClearIcon`-Schreibweise in dynamischen Feldern ist nicht dieselbe Konfiguration wie `clearIcon`; sichtbare Löschen-Symbole dürfen nicht allein aus diesen Zeilen abgeleitet werden. Der Toolbar-`painted`-Handler aktualisiert nur den Titel über `_title`, nicht den Fokus.

# 13. Online / Offline / lokale Daten

| Bereich | Tatsächlicher Zustand |
| --- | --- |
| Fachliche LocalStorage-/SessionStorage-Nutzung | keine in `app.js`/`app/`; keine persistenten Sencha-Proxys |
| Sencha Stores/Models | Arbeitsspeicher; Treffer, Mitarbeiter und Filter gehen beim Neuladen verloren |
| Benutzer/Standort | globales JS-Objekt, bei Appstart leer initialisiert; nicht lokal persistiert |
| PHP-Session | gestartet, aber ohne eigene Nutzdaten/Authentifizierungsprüfung |
| Offline-Suche | keine lokale Artikeldatenbank; nur bereits vorhandene Treffer/Mitarbeiter im offenen Prozess |
| Offline-Speichern | keine Queue, kein Outbox-Verfahren, kein Synchronisationsprotokoll |
| Request-Timeout | Touch Ajax/Serverproxy standardmäßig 30.000 ms; keine App-Überschreibung |
| Verbindungsprüfung | alle 5 s GET auf leere HTML-Datei; prüft weder DB noch Schreibfähigkeit; überlappende Pings möglich |
| Verbindungsverlust | Ping-Alert; Suchrequests ohne eigenen Fehlerdialog; Save mit Alert und lokalem reject |
| Wiederkehrende Verbindung | keine Wiederholung fehlgeschlagener Fachrequests; nächste Benutzeraktion löst neuen Request aus |
| Serverwrite ohne empfangene Antwort | Client kennt Ergebnis nicht; kein Abgleich/Idempotenzmechanismus; erneuter Save kann korrigieren oder erneut einfügen |

Asset-Caching existiert getrennt davon: `app.json` fordert AppCache für Einstieg und drei Bilder, Netzwerk `*`, kein Fallback; JS-Update `full`, CSS-Update `delta`. Der development-Einstieg hat `manifest=""`, keinen ausgefüllten Cachemanifestverweis. Die Production-Buildkonfiguration erzeugt `cache.appcache`.

Der Production-Microloader speichert Manifest und JS/CSS in LocalStorage unter App-ID-/URI-bezogenen Schlüsseln und verarbeitet `applicationCache`. Bei offline gemeldetem Browser wartet seine Updateprüfung auf `online`. Delta-HTTP-Fehler führen zu vollständigem Assetabruf; ein syntaktisch fehlerhaftes Delta wird nur geloggt. Das ist Softwareaktualisierung, keine Wiederholung von Inventurbuchungen. `onUpdated` fragt nach einem Seitenreload; ungespeicherte Mengen werden vorher nicht gesichert.

Die vorhandenen SDK-Klassen für LocalStorage, SessionStorage, SQL und SyncStore sind nicht als App-Stores konfiguriert. Aus ihrem Vorhandensein folgt keine Offline-Fähigkeit. Insbesondere greift der Production-Microloader später direkt auf `appCache.status` zu; das Verhalten in der konkreten Zielbrowserumgebung muss geprüft werden.

# 14. Sencha-Touch-2.3-Kompatibilitätsanalyse

Keine der folgenden Zeilen bedeutet „bereits migriert“ oder „kompatibel getestet“. Aufwand: klein = begrenzte Konfigurations-/Darstellungsanpassung; mittel = zusammenhängende Komponenten-/Eventanpassung; hoch = Start-/Datenlebenszyklus mit Vertragsvergleich. Es werden keine Personentage aus dem bloßen Codeumfang abgeleitet.

Primärquellen für gezielt überprüfte Ziel-APIs: [Ext.Container 6.2.1 Modern](https://docs.sencha.com/extjs/6.2.1/modern/Ext.Container.html), [Ext.dataview.DataView 6.2.1 Modern](https://docs.sencha.com/extjs/6.2.1/modern/Ext.dataview.DataView.html), [Ext.data.Model 6.2.1 Modern](https://docs.sencha.com/extjs/6.2.1/modern/Ext.data.Model.html), [Model-Quelltext](https://docs.sencha.com/extjs/6.2.1/modern/src/Model.js.html), [Ext.data.Store 6.2.1 Modern](https://docs.sencha.com/extjs/6.2.1/modern/Ext.data.Store.html), [Ext.data.writer.Json 6.2.1 Modern](https://docs.sencha.com/extjs/6.2.1/modern/Ext.data.writer.Json.html), [Ext.TitleBar 6.2.1 Modern](https://docs.sencha.com/extjs/6.2.1/modern/Ext.TitleBar.html), [Ext.field.Picker 6.2.1 Modern](https://docs.sencha.com/extjs/6.2.1/modern/Ext.field.Picker.html), [Ext.Button 6.2.1 Modern](https://docs.sencha.com/extjs/6.2.1/modern/Ext.Button.html).

Einige gezielte Abrufe weiterer 6.2.1-API-Seiten waren nicht verfügbar. Entsprechende Ersatznamen sind als Kandidaten für die Prüfung am SDK auf beg-web angegeben. Benachbarte Frameworkversionen oder Classic-Dokumentation werden nicht als Beweis unveränderter 6.2.1-Modern-Semantik verwendet.

| Komponente / API | Fundstelle und heutige Aufgabe | Kopplung an Fachlogik | Voraussichtlicher Modern-Ersatz / notwendige technische Prüfung | Aufwand | Risiko / mögliche Verhaltensänderung | Notwendiger Test |
| --- | --- | --- | --- | --- | --- | --- |
| `Ext.application`, Loader, `requires` | `app.js:17–46`, Bootstrap, Microloader | gesamte Appinitialisierung, frühes Mitarbeiterload | Modern `Ext.app.Application`/`Ext.application` und Cmd-7-kompatibler Bootstrap; alte Loaderdateien nicht ersetzen | hoch | doppelter Start, fehlende Klassen, Reihenfolge der Stores/Controller | genau eine Appinstanz, ein Mitarbeiterload, Login zuerst |
| `config` in `Ext.define` | alle eigenen Klassen | insbesondere Model-/Controllerkonfiguration | komponentenspezifische Configs übernehmen; Model-/Controllerdeklaration gegen Zielklasse prüfen | mittel/hoch | gleichnamige Eigenschaften haben nicht automatisch dasselbe Konfigurationsmodell | Klassenladen und wirkende Konfiguration, keine still ignorierten Felder |
| `Ext.app.Controller`, `refs`, `control`, `autoCreate` | beide Controller | Auswahl, Sperren, Login, Save | MVC-Controller als Kandidat; Touch-Refs-/Control-Syntax gegen 6.2.1 prüfen; keine pauschale MVVM-/ViewController-Neuarchitektur | hoch | andere Getter, doppelte Listener, falsche/lokal nicht erzeugte View | jeder Handler genau einmal mit derselben View/Recordinstanz |
| `Ext.Container` | Such- und Detailview | Recordbindung, Navigation | `Ext.Container` Modern vorhanden | mittel | andere Layout-/Lifecycle-Defaults | Suche/Detail, Wiedereintritt, Renderreihenfolge |
| `Ext.form.Panel`, `Ext.form.FieldSet` | Login, Suchformular, dynamische Details | Namensprüfung, Mengeneingabe | gleichnamige Modern-Kandidaten, Feldkonfiguration prüfen | mittel | implizites Submit, abweichende Required-Interpretation | Enter ohne zusätzliche Requests, gleiche Leerwertfälle |
| `Ext.Viewport`, `fullscreen`, `remove(active,true)` | `app.js:88`, Logincontroller:93 | Loginfreigabe und Sessionlebensdauer | Modern-Viewport/Container-Cardlayout; aktives Element und Zerstörung kontrolliert abbilden | mittel | Suche vor Login, verlorener Zustand, doppelte Timer | Start/Login/Zurück mit Instanz- und Requestzählung |
| `animateActiveItem`, `setActiveItem` | Searchcontroller:267–283/376 | Wechsel ohne Datenänderung | Modern Container unterstützt `animateActiveItem`; Animationsargument als Konfiguration prüfen | mittel | übergebene Funktionsreferenz ist keine bewiesene Animation; Wechselzeit beeinflusst Fokus | gleiche Zielview, keine zusätzliche Speicherung |
| `Ext.Toolbar`, `Ext.TitleBar` | Such-/Detailtoolbar | Titel zeigt Standort/Fach | Modern-Komponenten, öffentliche Titelsetter | klein/mittel | `_title` ist intern; falsche Standortanzeige darf nicht versehentlich Datenparameter ändern | alle neun Standorte, Detailtitel |
| `Ext.Button`, `spacer`, `ui` | alle Views | Button-Events an Fachpfade gekoppelt | Modern Button/Spacer; Theme-UIs prüfen | klein | Touchziel/disabled/default-handler | einmaliger Tap, Zurück ohne Save, Bestätigungsbuttons |
| `Ext.Img`, `Ext.Label` | Loginbild, Fehlerlabel | Fehlermeldung/Identität der App | Modern Img-/Label-Kandidaten | klein | Iconpfade, Textdarstellung, HTML-Inhalt | Bild vorhanden, Fehlermeldung sichtbar |
| `Ext.field.Search`, `Ext.field.Text` | Namens-/Fachsuche, Detailtext; kein Passwortfeld | Originaleingabe, Suchlänge, führende Nullen | Modern Search/Text; Passwortfunktion nicht ergänzen | mittel | andere Inputevents, Schreibkorrektur, Leer-/Nullwerte | Originaltext und Requestparameter einschließlich Bindestrichen/Nullen |
| `Ext.field.Checkbox`, `check`/`uncheck`, `setValue` | `Search_Container.js:102/216/245` | `getValue() === true` bestimmt Suchart und Sperre | Modern Checkbox; `checked` und Nutzwert getrennt prüfen, ggf. minimaler kompatibler Adapter | hoch | Boolean wird String/anderer Wert → falscher Suchzweig oder Sperre | initial, check, uncheck, Programmänderung, bestehende Treffer |
| `Ext.field.Select`, `usePicker:false` | `Login.js:75` | Standortwerte `10`–`90` | Modern Select/Picker; Pickerart und Defaultauswahl prüfen | mittel | andere Auswahlwerte oder Overlaybedienung | alle Standorte und unbeeinflusster Requestwert |
| `Ext.field.Number`, private `_value` | dynamische Detailfelder; Searchcontroller:138 | Leerverbot, numerischer Vergleich, Payload | Modern Number mit öffentlichem Getter als Kandidat **erst nach** Wertsemantikvergleich | hoch | `''`/`null`/0/Komma/Punkt ändern Validierung oder Menge | Grenzwerte und unmittelbarer Save vor/nach Blur |
| `Ext.dataview.List`, `infinite:true` | Mitarbeiterliste | exakter ausgewählter Name | Modern List; Virtualisierung/Itemhöhen prüfen | mittel | anderes Tap-Ziel, falscher Record, scrollbare Treffer | viele Mitarbeiter, Filter, Einzel-/Doppeltap |
| `Ext.dataview.DataView`, `itemTpl` | `Search_Container.js:167` | gewählter Bestandsrecord und Statusanzeige | Modern DataView vorhanden; Template kann schrittweise angepasst werden | mittel | Template-/List-Layout oder Itemereignisse ändern Recordzuordnung | mehrere Artikel/Fächer, Text/Info, Tap und Hold |
| `itemtap`, `itemtaphold`, `itemsingletap`, `tap` | Controllercontrols | Einstieg in Zählung/Login/Save | Modern-Komponentenereignisse prüfen; DataView-`itemtap(this,index,target,record,e,eOpts)` dokumentiert | mittel | doppelte Verarbeitung bei Hold/Tap oder abweichende Signatur | je Geste korrekter Record, keine Doppelöffnung/-speicherung |
| `fireEvent`, delegierte Listener, `down`, `getCmp`, `itemId` | Views und Controller | IDs verbinden Fachhandler und Eingabefelder | Modern Ereignisse/ComponentQuery; bestehende IDs zunächst bewahren, `reference` ist kein automatischer Ersatz | mittel | Selektoren finden falsche Instanz; spätere LagerTool-ID-Kollisionen | kompletter Navigationspfad, Wiederöffnung |
| `setRecord`/`getRecord`, dynamisches `setConfig({items})` | Searchcontroller:137/287/329/356 | ausgewählter Record, Blindzählung, Zählfeldreset | Modern Recordbindung/Container-Itemkonfiguration anhand SDK prüfen | hoch | alte Felder/Listener bleiben, falsches Record, Sollbestand sichtbar | zwei aufeinanderfolgende Artikel, Zurück, Sperrpfad |
| `getScrollable().getScroller().setDisabled(true)` | Logincontroller:119 | Bedienung Trefferliste | Ziel-Scrollerzugriff gegen Modern prüfen; Getter-Kette nicht blind übernehmen | mittel | Scrollobjekt-/Lifecycleänderung, Feld außerhalb sichtbarem Bereich | Tastatur offen, lange Trefferliste, kleine Höhe |
| `Ext.Msg.alert/show/confirm`, Browser-`alert` | Save, Sperren, Fehler, Update | Bestätigung ist Voraussetzung bei Abweichung | Modern MessageBox; Button-ID/Callback-Signatur prüfen | hoch | falsche Ja/Nein-Auswertung, Save vor Bestätigung, verlorene Eingabe | Soll=Ist, Abweichung Ja/Nein, Savefehler, Updateabbruch |
| `Ext.data.Model`, dynamische Felder | Models; Searchcontroller:145 | Payloadtypen und feldweise Persistenz | Modern Model hat andere Feld-/Schemaarchitektur; technischer Adapter nur mit unverändertem Vertrag | hoch | Felder gehen verloren, ID-/NULL-/Typkonvertierung | vollständiges GET/POST-Datenmapping |
| `Model.validate`, Errors, `commit/reject` | Searchcontroller:178–210 | Validierung, Erfolg-/Fehlerzustand | `validate()` in 6.2.1 noch vorhanden, seit 5.0 deprecated; `getValidation()` ist der Zielkandidat | hoch | andere Fehlersammlung oder zusätzliche Geschäftsvalidierung; defekter Legacy-Fehlerpfad | gültig/ungültig, Fehlermeldung, lokale Rücknahme |
| `phantom`, interne ID, `record.save` | Model/Controller/Reader | create statt update trotz Korrektur | Modern `save()` weiterhin zustandsabhängig; phantom-Verhalten explizit vergleichen | hoch | unerwartetes `action=update` trifft unvollständigen PHP-Zweig | erste/erneute Zählung, Record nach Save/Reload, Doppeltap |
| Ajaxproxy, Reader `rootProperty`, ExtraParams | drei Models; Searchcontroller:82/100 | Endpoints, Parameter, Antwortinterpretation | Modern Ajax/Jsonreader; öffentliche `setExtraParam(s)` statt `_extraParams` als Kandidat | hoch | Requestmethode, Strings/Booleans, Paging, Erfolgskriterium ändern sich | Request/Response vollständig vergleichen, kein API-Neuentwurf |
| Jsonwriter `writeAllFields`, `allowSingle`, Date | Models; Laufzeitfelder | PHP erwartet vollständiges Einzelobjekt | Modern Jsonwriter; Default `writeAllFields:false` statt Touch `true`, phantom-Ausnahme beachten | hoch | Pflichtdaten fehlen, Array/Wurzel/Datum anders | Save-Body inklusive Felder/Typen, Umlaute, Zeitpunkt |
| Store `load`, `clearData`, `add`, Filter | Stores und beide Controller | Liste/Benutzer/Reloadzustand | Modern Store; `clearData` ist dort private API, öffentlicher Ersatz nur mit äquivalenten Events/Removezuständen | hoch | unbeabsichtigte Lösch-/Synczustände, veränderte Regexfilter | Suche leeren, ungültige Suche, Mitarbeiterfilter, Save/Reload |
| `Ext.Date` globale Änderungen | Searchcontroller:390 | Formatierung und Clientzeit | Modern Dateformatierung/Locale-Kompatibilität prüfen | mittel | andere Datumswerte bzw. globale Wirkung bei Integration | Datum/Zeitzone, Updates, gemeinsam laufende Module |
| `Ext.plugin.PullRefresh` | `app.js:42` nur require | keine aktive fachliche Verwendung | Modern-Äquivalent erst bei nachgewiesenem Bedarf | klein | versehentlich neu aktiviertes Reloadverhalten | keine unerwarteten Requests durch Gesten |
| Sencha-Touch-Sass/Compass, Iconmixins | `resources/sass/app.scss`, `config.rb`, Includes | Darstellung, u. a. Blindzählung/Lesbarkeit | eigenständiges Modern-Theme und dateiweise Übernahme benötigter Styles | hoch | altes Theme-/DOM-/Fontsystem nicht austauschbar | lesbare Namen/Status/Felder, 1:1 Fachwerte, kleine Displays |
| AppCache/Production-Microloader | `.sencha/app/microloader/production.js` | Softwarestand/Reload beeinflusst Sitzung | Zielbootstrap mit getrennt geprüfter Assetaktualisierung | hoch | alter Cache mischt Appstände, Startupfehler, Verlust offener Menge | frischer/alter Cache, offline/online, Update Ja/Nein |
| native Packagerstruktur | `packager*.json`, native.properties | kein fachlicher Scannervertrag | Zielauslieferung separat festlegen; alte iOS-Hülle ist kein TC26/TC27-Build | hoch | relative PHP-Pfade/Transport, andere Tastatur/Events | gewählter Browser/Container auf beiden Geräten |
| Touch-UX-Kalender, Menüs, Parse/Device | `touch/src/ux/*`, Bootstrap; Kalender-SCSS | keine eigene Inventurverwendung gefunden | kein Ersatz in der Grundmigration erforderlich, Bestand erhalten | unbestimmt bei späterer Nutzung | unkontrolliertes Mitmigrieren fremder Funktionalität | Abhängigkeitsnachweis vor irgendeiner Übernahme |

Die wesentlichen API-Nachweise sind begrenzt: Modern Container behält Cardnavigation, DataView behält das dokumentierte `itemtap`; Model-ID, Validatoren und Writer-Konfiguration verlangen dennoch einen eigenen Vertragsvergleich. Eine vorhandene gleichnamige Komponente ist kein Nachweis identischer Browser-, Theme- oder Ereignissemantik.

# 15. Datei-Klassifikation

A = reine Oberfläche/Layout; B = UI mit Fachlogik; C = Fachlogik/Datenvertrag; D = Backend/API; E = Datenbankzugriff; F = Konfiguration/Build; G = Legacy-/generiertes Artefakt. Mehrfachzuordnung ist beabsichtigt. „Bedingt“ bedeutet nur innerhalb einer später beauftragten Migration mit Fachgleichheit; **in Phase 0 ist ausschließlich diese Dokumentationsdatei schreibbar**. Bei Gruppen gilt die Zeile für alle genannten bzw. vom Muster erfassten Dateien.

## 15.1 Anwendung, Backend und Einstieg

| Datei | Kategorie | Zweck | Fachlogik-relevant | Darf in UI-Migration verändert werden? | Migrationsrisiko |
| --- | --- | --- | --- | --- | --- |
| `app.js` | B, F | Initialisierung/Views/Stores/Controller/Updates | ja, Reihenfolge/Zustand | bedingt, technische Zielanbindung | hoch |
| `app/view/Login.js` | B | Loginlayout **und** Namensvalidierung | ja | nur Layout/kompatible Technik; Namensregel schützen | hoch |
| `app/view/Search_Container.js` | B | Suchlayout, Moduswert, Requestevent | ja | nur Darstellung/kompatible Eventanbindung | hoch |
| `app/view/Lagerfach.js` | A, B | statisches Detailgerüst mit fachlich gebundenen IDs | indirekt | bedingt, dynamischen Controlleranteil berücksichtigen | mittel |
| `app/controller/LoginController.js` | B, C | Benutzerauswahl, Sessionzustand, Navigation/Ping | ja | keine fachliche Änderung; technische Eventarbeit nur getestet | hoch |
| `app/controller/Search_Controller.js` | B, C | Suche, Sperren, dynamische Form, Menge, Save | zentral | keine pauschale UI-Überarbeitung; funktionale Regeln einfrieren | sehr hoch |
| `app/model/auftragsnummern.js` | C, D | Artikel-/Zählvertrag, CRUDproxy | zentral | nur gesondert geprüfte Modern-Technik bei identischem Vertrag | sehr hoch |
| `app/model/Model_ActivityLine.js` | C, D | Bewegungs-/Legacy-CRUDvertrag | potentiell | zunächst unverändert; kein aktiver Bedarf belegt | hoch bei Aktivierung |
| `app/model/Model_LagerMitarbeiterLogistic.js` | C, D | Mitarbeitervertrag | ja | nur kompatible Technik, keine Feld-/API-Änderung | hoch |
| `app/store/artikelnummern.js` | C | Artikelstore/ID/Modelbindung | ja | bedingt technische Bindung, Verhalten schützen | hoch |
| `app/store/activityline.js` | C, G | instanziierter ungenutzter Store | potentiell | zunächst nicht | mittel |
| `app/store/Store_LagerMitarbeiterLogistic.js` | C | Mitarbeiter-Autoload und Filtergrundlage | ja | bedingt, Autoload/ID erhalten | hoch |
| `resources/services/get_login.php` | D, E, C | Mitarbeiterselect und Legacy-Stubs | ja | nein, read-only | hoch |
| `resources/services/get_artikelnummern.php` | D, E, C | beide Sucharten und echte Speicherung | zentral | nein, gesonderter Backendauftrag erforderlich | sehr hoch |
| `resources/services/get_activityline.php` | D, E, C, G | separater Read und Temp-Schreibpfad | potentiell | nein, nicht aktivieren/entfernen | hoch |
| `resources/services/dbconnection_nav.inc.php` | D, E, F | DB-Zugang/Mandant/Umgebung | zentral | nein | sehr hoch |
| `resources/services/leer.html` | D | leere Pingressource, 0 Byte | indirekt | nein, Endpoint erhalten | niedrig/mittel |
| `app.json` | F | Assets, App-ID, Cache, Ressourcen | indirekt | bedingt im technischen Zielprojekt | hoch |
| `index.html` | F, A | regulärer Einstieg | Start/Mehrfachausführung | bedingt; Legacyreferenz erhalten | hoch |
| `app.html` | F, G | Architect-Einstieg mit externem Windowspfad | historisch | zunächst nicht | hoch als Zielvorlage |
| `bootstrap.js` | F, G | generierte Klassenmappings | indirekt | nicht von Hand; später Zielmetadaten getrennt erzeugen | hoch |
| `bootstrap.json` | F, G | generiertes Entwicklungsmanifest | indirekt | nicht von Hand | hoch |

## 15.2 CSS/SCSS und statische Ressourcen

| Datei | Kategorie | Zweck | Fachlogik-relevant | Darf in UI-Migration verändert werden? | Migrationsrisiko |
| --- | --- | --- | --- | --- | --- |
| `resources/sass/app.scss` | A, F | Touch-Theme, Farben, Imports, IcoMoon/Pictos | indirekt | bedingt im Zieltheme | hoch |
| `resources/sass/config.rb` | F | aktiver Compasspfad nach `touch/resources/themes` | nein | nur spätere Buildanpassung | hoch |
| `resources/sass/config-debug.rb` | F, G | alternative Konfiguration, verweist auf fehlendes `resources/themes` | nein | zunächst nicht | mittel |
| `resources/sass/config - Kopie.rb` | F, G | weitere alte Compasskonfiguration | nein | zunächst nicht | mittel |
| `resources/sass/include/_listen.scss` | A | Listen-/Eingabestile inkl. Mitarbeitersichtbarkeit | indirekt | ja, gezielt; Rendering testen | mittel |
| `resources/sass/include/_menue.scss` | A, G | zahlreiche TreeGrid-/Menü-Demostile, globaler Selectstil | indirekt | nur nach Wirkungsprüfung einzelner Regeln | mittel/hoch |
| `resources/sass/include/_tabellen_tree.scss` | A, G | TreeGrid-Tabellen/Sortiersymbole | keine aktive TreeGrid-Funktion | zunächst nur Abhängigkeit bewahren | mittel |
| `resources/sass/include/_text.scss` | A | Text-/Input-/Rahmenklassen | indirekt | bei tatsächlicher Verwendung | niedrig |
| `resources/sass/include/_icons.scss` | A, F | eingebettetes Pictos, info/user/team/trash | nein | bedingt zielthemegerecht | mittel |
| `resources/sass/include/_skin1.scss` | A, G | Kalender-Skin | keine aktive Kalenderfachlogik | zunächst nicht | mittel |
| `resources/sass/include/_Ext.ux.TouchCalendarView.scss` | A, G | Kalenderlayout/-navigation | keine aktive Kalenderfachlogik | zunächst nicht | mittel |
| `resources/sass/include/_Ext.ux.TouchCalendarEvents.scss` | A, G | Kalenderereignisse/Kundenfarben | keine aktive Inventurverwendung | zunächst nicht | mittel |
| `resources/sass/include/_buttons.scss` | A, G | alternative Buttonmixins/-klassen | nicht importiert | zunächst nicht | niedrig |
| `resources/sass/include/_tab.scss` | A, G | Toolbarregel trotz Dateiname „tab“ | nicht importiert | zunächst nicht | niedrig |
| `resources/sass/include/_titlebar.scss` | A, G | Tabbarregeln trotz Dateiname „titlebar“ | nicht importiert | zunächst nicht | niedrig |
| `resources/css/app.css` | A, G | tatsächlich geladenes kompiliertes Theme, 423.211 Byte | indirekt | nicht als primäre Sassquelle behandeln | hoch |
| `resources/css/listen.css` | A, G | ältere separate Listen-CSS | kein direkter Import gefunden | zunächst nicht | mittel bei versehentlicher Aktivierung |
| `resources/css/menue.css` | A, G | ältere Menü-CSS mit abweichendem Select-Hintergrund | kein direkter Import gefunden | zunächst nicht | mittel |
| `resources/css/tabellen_tree.css` | A, G | ältere Tabellen-CSS mit abweichender Schriftgröße | kein direkter Import gefunden | zunächst nicht | mittel |
| `resources/sass/stylesheets/fonts/pictos/*`, `.../ios7/*` | A, F | Fontressourcen/SVG-Fonts, kein App-JS | nein | nur bei belegtem Themebedarf | mittel |
| `resources/sass/.sass-cache/**` | G | 803 binäre Compass-/Sass-Zwischendateien | nein | nicht bearbeiten oder übernehmen; jetzt erhalten | niedrig |
| `resources/images/74sgetdtestra3251gffcbgcAS.png` | A | Loginbild und Cachemanifestressource | nein | bedingt Darstellung | niedrig |
| `resources/images/gold-euro-symbol.jpg`, `Recycle.png` | A, G | explizite Cacheeinträge ohne aktive Viewreferenz | nein | zunächst erhalten | niedrig |
| `resources/images/larr.png`, `rarr.png`, `check_box_klein.png` | A, G | referenzierte Kalender-CSS-Bilder | nein | zunächst erhalten | niedrig |
| übrige `resources/images/**` | A, G | Bilder, Google-Marker, PSD-/Hilfsbestände | keine weitere Inventurverwendung belegt | keine pauschale Übernahme/Löschung | niedrig/mittel |
| `resources/icons/**`, `resources/startup/**`, `resources/loading/**` | A, F, teils G | Appicons/Web-/native Startbilder, u. a. Thumbs.db | nein | gezielte Zielressourcenwahl später | niedrig/mittel |

`app.scss` importiert KalenderView, skin1, KalenderEvents, listen, tabellen_tree, menue, text und icons. Die drei separaten CSS-Dateien sind keine bytegleichen Kopien ihrer heutigen SCSS-Pendants: Menü-Selecthintergrund `#FF6F00` statt `#0F0F0F`, TreeGrid-Inhalt `.8em` statt `.7em`, Listen-CSS ohne die heutigen Mitarbeitersuchfeldregeln. Das gebündelte `app.css` enthält Mitarbeitersuchfeldselektoren. Die SCSS- und CSS-Stände dürfen daher nicht anhand gleicher Namen gleichgesetzt werden.

## 15.3 Alle eigenen HTML-Fragmente

| Datei unter `resources/html/` | Kategorie | Tatsächlicher Inhalt | Fachlogik-relevant | Darf in UI-Migration verändert werden? | Risiko |
| --- | --- | --- | --- | --- | --- |
| `Aufgaben.html` | A, G | Hinweis auf spezielle Kundenbesuchstermine | nein | kein Inventurauftrag, zunächst erhalten | niedrig |
| `Besuchsliste.html` | A, G | Berichte ansehen, Bearbeitung als geplant beschrieben | nein | zunächst erhalten | niedrig |
| `Planung.html` | A, G | Besuchsplanung, Plus/Fertig, Pflichtangaben Kundennummer/Anfang/Ende | keine Inventurregel | zunächst erhalten | mittel bei Fehlinterpretation als Inventurvalidierung |
| `Kumuliert.html` | A, G | Überschrift kumulierte Umsatzliste, Platzhalter `?` | nein | zunächst erhalten | niedrig |
| `Kundenuebersicht.html` | A, G | Überschrift Kundenübersicht, Platzhalter | nein | zunächst erhalten | niedrig |
| `Lieferantenumsatz.html` | A, G | Überschrift Lieferantenumsatz, Platzhalter | nein | zunächst erhalten | niedrig |
| `Maps.html` | A, G | Überschrift Google Maps, Platzhalter; keine Maps-Einbindung | nein | zunächst erhalten | niedrig |
| `Umsatzliste.html` | A, G | Überschrift Umsatzliste, Platzhalter | nein | zunächst erhalten | niedrig |
| `Warengruppenumsatz.html` | A, G | Überschrift Warengruppenumsatz, Platzhalter | nein | zunächst erhalten | niedrig |
| `Werkstattausruestung.html` | A, G | Überschrift Werkstattausruestung, Platzhalter | nein | zunächst erhalten | niedrig |
| `grosserbonus.html` | A, G | Überschrift großer Bonus, Platzhalter | nein | zunächst erhalten | niedrig |
| `kleinerbonus.html` | A, G | Überschrift kleiner Bonus, Platzhalter | nein | zunächst erhalten | niedrig |

Keines dieser Fragmente wird im eigenen Anwendungscode geladen oder im Ressourcenarray explizit als Verzeichnis aufgenommen. Inhalte und BergAD-Konfigurationsreste sprechen für mitgeführte fachfremde Altressourcen; ihre frühere Herkunft ist nicht sicher ermittelbar.

## 15.4 Buildkonfiguration, SDK und Artefakte

| Datei / Gruppe | Kategorie | Zweck | Fachlogik-relevant | Darf in UI-Migration verändert werden? | Risiko |
| --- | --- | --- | --- | --- | --- |
| `build.xml` | F | Einstieg in `.sencha/app/build-impl.xml`, nur kommentierte Anpassungshooks | indirekt | technische Zielstruktur getrennt planen | hoch |
| `Inventur_NAV erstellen.cmd` | F, G | alter Cmd-4-Production-Build, danach 7-Zip-Archiv | nein | nicht ausführen/als Zielworkflow übernehmen | hoch |
| `Inventur_NAV native app erstellen.cmd` | F, G | alter Native-Build; Backupteil nach `EXIT` unerreichbar | nein | zunächst nicht | hoch |
| `packager.json` | F | alte iOSSimulator-/Universal-/Debug-Vorgaben | nein | neue Zielentscheidung nötig | hoch |
| `packager.temp.json` | F, G | aus Packaging abgeleitete absolute Windows-Pfade | nein | nicht von Hand bearbeiten | mittel |
| `.sencha/app/sencha.cfg` | F | `app.name=BergAD`, touch/2.3.0/Cmd4, Classpath | indirekt | nur neue kontrollierte Zielkonfiguration | hoch |
| `.sencha/workspace/sencha.cfg` | F | workspace build/packages/touch.dir, Cmd4 | indirekt | nur neue kontrollierte Zielkonfiguration | hoch |
| `.sencha/app/build.properties` | F | Touchthemes, Compass, Watch-/Compileroptionen | indirekt | später gezielt | hoch |
| `.sencha/app/production.properties` | F | Deltas, Cachemanifest, Ressourcenkompression | indirekt | später gezielt | hoch |
| `.sencha/app/testing.properties` | F | Debug/Logger, Testingmicroloader | indirekt | später gezielt | mittel |
| `.sencha/app/package.properties` | F | YUI-Kompression, Testingmicroloader | indirekt | später nur bei Bedarf | mittel |
| `.sencha/app/native.properties` | F | native Packaging aktiviert, Manifest, YUI | indirekt | zunächst nicht | hoch |
| `.sencha/app/defaults.properties` | F, G | generierte Cmd-Defaults/Pfade/Schalter | indirekt | nicht blind editieren/übernehmen | hoch |
| `.sencha/app/codegen.json` | F, G | zwölf komprimierte Generatorvorlagen + zwölf Ziele mit BergAD-Parametern | indirekt | nicht als Quellwahrheit benutzen | hoch |
| `.sencha/app/plugin.xml`, `.sencha/workspace/plugin.xml` | F | Pluginimportkette, keine eigene fachliche Hookimplementierung | nein | später Zielkonfiguration | mittel |
| `.sencha/app/build-impl.xml` | F, G | Buildreihenfolge und Antziele | indirekt | keine händische Frameworkkonvertierung | hoch |
| `.sencha/app/init-impl.xml`, `find-cmd-impl.xml` | F, G | lokale Properties, Cmd finden, Compiler initialisieren | nein | zunächst nicht | hoch |
| `.sencha/app/js-impl.xml` | F, G | Klassenausgabe, optional getrenntes Framework | indirekt | zunächst nicht | hoch |
| `.sencha/app/resources-impl.xml` | F, G | Ressourcenkopie | Backenddateien betroffen | zunächst nicht | hoch |
| `.sencha/app/page-impl.xml` | F, G | HTML/Microloader/Manifest/Deltas/AppCache | indirekt | zunächst nicht | hoch |
| `.sencha/app/refresh-impl.xml` | F, G | Bootstrap-Mappings/-Manifest erzeugen | indirekt | zunächst nicht | hoch |
| `.sencha/app/sass-impl.xml`, `slice-impl.xml` | F, G | Compass und Legacy-Theme-Slicing | nein | zunächst nicht | hoch |
| `.sencha/app/watch-impl.xml` | F, G | Dateiüberwachung/Buildauslöser | nein | nicht ausführen | mittel |
| `.sencha/app/resolve-impl.xml` | F, G | dynamisches Laden der App zur Abhängigkeitsanalyse, Webserver | kann App-Requests auslösen | nicht ausführen | hoch |
| `.sencha/app/packager-impl.xml` | F, G | native Konfigurations-/Paketgenerierung | nein | zunächst nicht | hoch |
| `.sencha/app/microloader/{development,testing,production}.js` | F, G | Cmd-Laufzeitloader, Production-Assetcache | indirekt | kein manuelles Frameworkupgrade | hoch |
| `touch/microloader/{development,testing,production}.js` | F, G | Legacyloader, development aktiv referenziert | indirekt | benötigte Legacy-Abhängigkeit erhalten | hoch |
| `touch/sencha-touch.js`, `sencha-touch-debug.js` | F, G | SDK-Core-Bundles, im Bestand bytegleich | indirekt | nicht ersetzen/bearbeiten | hoch |
| `touch/sencha-touch-all.js`, `sencha-touch-all-debug.js` | F, G | SDK-Komplettbundles, im Bestand bytegleich | indirekt | nicht ersetzen/bearbeiten | hoch |
| `touch/src/**` außer UX-Sondergruppe | F | Frameworkquellcode inkl. API-/Native-/Syncfähigkeiten | technische Grundlage, keine eigene Inventurlogik | erhalten, kein Frameworkrefactoring | hoch |
| `touch/src/ux/**` | A, F, teils G | 30 Kalender-/Menü-/DateTime-/Device-/Parse-Erweiterungsdateien | kein aktiver eigener Appaufruf gefunden | zunächst erhalten | unbestimmt bei späterer Nutzung |
| `touch/scr/plugin/google/tracker_jf,js` | G | tatsächlich leere Datei, 0 Byte | nein | erhalten | niedrig |
| `touch/resources/**` | A, F, G | Frameworkthemes, Fonts, Bilder, Compass inkl. Vendorbeispielen/-tests | indirekt | Legacyabhängigkeit erhalten | hoch |
| `touch/build.xml`, `touch/cmd/sencha.cfg`, `touch/version.txt` | F | SDK-Build und Version | nein | nicht ändern/ausführen | hoch |
| `touch/file-header.txt`, `touch/license.txt` | F | Hersteller-/Lizenztexte | nein | erhalten | kein fachliches Risiko |
| `build/**` | G | ignorierte native/production/Archiv-/Temp-Ausgaben | kann älteren Programmstand enthalten | nicht entwickeln, nicht löschen | hoch als Referenzverwechslung |
| `debug.log`, `inventur.log`, `**/Thumbs.db` | G | vorhandene Logs/Windows-Vorschauartefakte | nein | nicht bearbeiten/neu committen | niedrig |
| `.gitignore` | F | ignoriert `.DS_Store`, Logs und `build/` | nein | in Phase 0 nicht ändern | niedrig |
| `AGENTS.md`, `docs/MIGRATION_RULES.md` | F | verbindliche Projekt-/Migrationsregeln | schützen gesamte Fachlogik | in dieser Aufgabe nicht ändern | hoch bei Nichtbeachtung |
| `docs/LEGACY_ANALYSIS.md` | F | Analyse/Verträge/Plan/Testspezifikation | dokumentarisch | einzige erlaubte Änderung in Phase 0 | keine Laufzeitwirkung |

# 16. Unbedingt zu schützende Fachlogik

Diese Invarianten müssen bei gleichen Eingaben und gleichem Datenzustand nachgewiesen werden:

1. Mitarbeiterermittlung mit `State=0`, Name/Regexfilter und anschließender exakter Namensprüfung; Übertragung des Namens als Zähler.
2. Standortcodes und deren unterschiedliche Verwendung: `ze` bei normaler Suche, Standort+'01' bei Artikelmodus, `lagerort` aus dem Bestandsrecord beim Save.
3. Suchmodus, Mindestlängen 6/4 ohne Bindestriche und Übertragung des unveränderten Suchtexts; SQL-Präfix-/Barcode-/Leerzeichensemantik.
4. Bestandsauswahl `ME_Hauptlager > 0`, Sollmenge aus `ME_Hauptlager`, keine Addition von `ME_WE`.
5. Artikelmodus-Sperre und NULL-/Typ-basierte Bewegungssperre; kein automatischer Zähleinstieg aus EAN-Treffern.
6. Blindzählung, leere Neueingabe, Gesamtmenge statt Addieren, explizite Abweichungsbestätigung.
7. Bestehende Payloadfelder und Typ-/Zeichenkodierung, `create` als funktionierender Serverpfad, Erfolgs-/Fehlerablauf und Reload.
8. INSERT-/UPDATE-Auswahl und deren tatsächliche Schlüssel, Statuswerte `gezählt`, `geändert`, `gebucht`, Serverzeit und unveränderte Spalten bei Korrektur.
9. Keine zusätzliche Buchung, Löschung, Offlinequeue oder automatisierte Wiederholung durch technische Anpassungen.

Die kritischen SQL-Auffälligkeiten, etwa der Fallthrough bei null EAN-Treffern, sind **keine neue fachliche Anforderung zur absichtlichen Reproduktion eines Defekts**. Sie müssen zuerst isoliert verifiziert und bei notwendiger Korrektur gesondert entschieden werden. Eine UI-Migration darf sie weder still reparieren noch durch neue Bedienwege zusätzlich auslösen.

# 17. Kandidaten für reine UI-Migration

Reine Darstellungskandidaten sind Abstände, Schriftgrößen, Feld-/Buttonbreiten, einspaltige Anordnung und die Form des Ergebnis-Templates. Betroffen wären Teile von `Login.js`, `Search_Container.js`, `Lagerfach.js` und ein neues Modern-Theme. Die bindenden IDs, Handler, sichtbaren Fachwerte und Recordzuordnungen müssen dabei erhalten bleiben.

Im Controller erzeugte Fieldsets können optisch angepasst werden, aber nur mit getrenntem Nachweis für die fachlich unveränderte Konfiguration. Insbesondere das Ersetzen von `????` durch den echten Bestand wäre keine reine UI-Änderung. Auch Hersteller-Nr./EAN direkt zur Zählung zu führen, Mengensummen aus Mehrfachscans zu bilden oder zusätzliche negative-/Dezimalprüfungen einzubauen, liegt außerhalb einer reinen Layoutanpassung.

Eine Korrektur der irreführenden Standorttoolbar für `60`–`90` ist als separater Anzeige-Kandidat denkbar; sie ist hier lediglich dokumentiert und nicht umgesetzt. Fokus-/Scanneränderungen folgen erst nach stabiler fachlicher Grundfunktion und den definierten Vergleichstests.

# 18. Legacy- und Build-Artefakte

## 18.1 Quellcode versus Abhängigkeit

Die Architect-Header bezeichnen `app.js` und `app/**` als generiert. Da keine Architect-Projektdatei im Repository vorliegt, sind diese Dateien dennoch die vorhandene führende Anwendungsquelle. Sie dürfen nicht wie wegwerfbare Buildausgaben behandelt werden.

`touch/` ist eine benötigte Legacyabhängigkeit für den jetzigen Quell-Einstieg, einschließlich ergänzender UX-Klassen. Die Dateien `sencha-touch.js` und `sencha-touch-debug.js` sind bytegleich (je 539.341 Byte); auch die beiden all-Bundles sind bytegleich (je 3.618.923 Byte). Der Name „ohne debug“ beweist hier keine komprimierte oder unveränderte Herstellerdatei. Ob frühere Anpassungen gegenüber dem Original-SDK vorliegen, ist ohne externen identischen SDK-Vergleich nicht sicher ermittelbar.

Bootstrapmappings, Cmd-Implementierungen und Sass-Caches sind generierte/Frameworkdateien. Die vorhandene `.gitignore` ignoriert Buildausgaben und zwei Logs, aber nicht die bereits versionierten Sass-Caches, `packager.temp.json` oder Thumbs.db. Es wurde nichts bereinigt.

## 18.2 Historischer Build-/Packagingweg

`build.xml` importiert die Cmd-4-Implementierung. Deren Buildfolge ist Refresh → optional dynamische Auflösung → JS → Ressourcen → Sass → Slicing → Page → optional Native-Package. `build.properties` aktiviert Touchthemes und Compass; Production aktiviert Deltas/AppCache. `resolve` ist standardmäßig übersprungen. Die generischen Ext-4-Themezweige in den XML-Dateien machen das Projekt nicht zu einer Ext-JS-Modern-App.

Das Produktions-CMD wechselt zu `C:\amp\Apache24\htdocs\Inventur_NAV`, nutzt explizit Cmd `4.0.0.203` und archiviert danach mit 7-Zip nach einem datierten Pfad. Das Native-CMD führt einen nativen Build aus; der nachfolgende ROBOCOPY-Block liegt hinter `EXIT`. Diese Skripte entsprechen nicht dem jetzt verbindlichen Git-/beg-web-/Buildtestweg.

`packager.json`: iOSSimulator, Universal, Debug, Version 1.0/1, Android-API-Level 8 als alte Konfiguration, Berechtigungen INTERNET/ACCESS_NETWORK_STATE/CAMERA/VIBRATE/Standort/CALL_PHONE und vier Orientierungen. `packager.temp.json` enthält Windows-Eingabe-/Ausgabepfade aus einem historischen Lauf. Ein installierbares Zebra-Androidpaket wird damit nicht nachgewiesen.

## 18.3 Bereits vorhandene lokale Buildreste

Diese Dateien existierten vor Phase 0 und sind durch `build/` ignoriert:

- `build/production/BergInventur/`: generiertes HTML, Appmanifest, `cache.appcache`, JS-/CSS-Bundle, Ressourcen und CSS-Delta.
- `build/native/BergInventur/`: nativer Webapp-Build.
- `build/native-package-mobile/BergInventur/packager.json/Berg Inventur.app/`: altes iOS-Simulator-Appbundle mit `Info.plist`, `PkgInfo`, `stbuild_template`, Icons und `webapp/`; daneben `Entitlements.entitlements`.
- Weitere Temp-/Archivdateien unter `build/` sind abgeleitete Ausgaben, keine Quellcodearbeitsumgebung.

Das gelesene `Info.plist` nennt iPhoneSimulator, SDK `iphonesimulator5.0`, MinimumOSVersion `4.3`, Bundle-ID `de.berg-sdl.inventur` und Version `1.0`. Kein Beleg für ein historisch installiertes Androidpaket.

Die drei gebündelten App-JS-Dateien sind untereinander identisch: jeweils 572.130 Byte, SHA-256 `83927fcf2de4fa5efd9d8588b0ecda08122786b64c12d5f69e72ce6058804ae1`. Ihr Anwendungsabschnitt wurde gelesen: Er enthält z. B. in der Mitarbeiterliste noch ein Inline-12px-Template statt des heutigen `mitarbeiter-item`-Templates; im Appstart fehlt der heutige explizite `requires`-Block. Die drei PHP-Endpunkte sind in allen drei Ressourcenkopien bytegleich zu den jeweiligen Quelldateien; daraus folgt keine allgemeine Buildgleichheit.

Das lokale Production-Manifest enthält für CSS eine Version, für `app.js` dagegen keine `version`, obwohl `requestAsset` im Production-Microloader `asset.version.length` verwendet. Dazu kommt die doppelte direkte App-Einbindung. Dieser Buildrest ist deshalb kein Nachweis eines startfähigen aktuellen Production-Builds. Sein zugehöriger Commit und ein Geräteabnahmeprotokoll fehlen.

Wahrscheinlich nicht für die Grundmigration benötigt: fachfremde HTML-Fragmente, nicht genutzte UX-/Kalender-/Demo-Stile, alte CSS-Einzelstände, leere Trackerdatei, Sass-Caches, Packaging-Tempdatei und alte Buildausgaben. „Wahrscheinlich“ bedeutet keine Löschfreigabe; die aktive Runtime-/Buildabhängigkeit muss vor einer späteren Entfernung nachgewiesen werden.

# 19. Technische Risiken

| ID | Evidenz | Auswirkung / Einordnung |
| --- | --- | --- |
| T01 | doppelte App-/CSS-Einbindung im Einstieg; `Ext.setup`-Einmalsperre | Startfehler möglich; ein verbindlicher reproduzierbarer Legacy-Einstieg fehlt |
| T02 | BergInventur vs. BergAD, Cmd4 vs. Ziel-Cmd7, absolute Windows-Pfade | alter Buildname/-pfad nicht zuverlässig als Zielvorlage verwendbar |
| T03 | `_extraParams`, `_value`, `_title`, dynamische Felddefinitionen | Modern kann Verhalten trotz ähnlicher Oberfläche verändern |
| T04 | IDs fehlen in Responses; Save nutzt phantom/create; Modern-Writerdefaults weichen ab | falscher Endpoint oder unvollständiger POST möglich |
| T05 | fehlende `$row`-Spalten, JSONP-Option, direkte SQL-Fehlerausgabe, `utf8_*` | Responseformat/Zeichen/NULL-Werte laufzeitabhängig |
| T06 | `current.Daten.reject()`, unbenutzter `startContainer`, `promt`, `ClearIcon`, Funktionsreferenz als Animation | technische Altauffälligkeiten dürfen nicht blind portiert oder beiläufig umgeschrieben werden |
| T07 | Production-Assetcache/AppCache und unvollständige lokale Buildmanifestversion | Cache-/Start-/Updateprüfung am Zielbrowser erforderlich |
| T08 | kein Requestlock, keine Stornierung, Pings alle 5 s bei 30-s-Timeout | überlappende Requests, wiederkehrende Dialoge, Antwortreihenfolge |
| T09 | feste Tabletbreiten/-höhen und internes CSS | TC26/TC27-Bedienbarkeit derzeit nicht nachgewiesen |
| T10 | native Hülle nur für historischen iOSSimulator belegt | Zielbrowser/-container und Scannertransport offen |
| T11 | fest eingetragene DB-Zugangsdaten in als Ressourcen kopiertem Serviceverzeichnis | unkritische Übernahme des gesamten Ressourcenbaums wäre riskant; eigener späterer Auftrag nötig |
| T12 | fehlendes `resources/icons/Icon_.png`, alternative Sassconfigs mit fehlendem Themeordner | Referenzfehler im Altbestand; kein Beleg eines vollständigen Zielbuilds |
| T13 | direkte Eingabeinterpolation in SQL-SELECT/UPDATE; nur INSERT parameterisiert | Sonderzeichen-/SQL-Injection-Risiko; bestehender Backendbefund, keine eigenmächtige Korrektur |

Die lokal durchgeführte PHP-Syntaxprüfung bestätigt nur syntaktische Lesbarkeit. Sie prüft keine SQLSRV-Laufzeit, keine PHP-Versionsgleichheit zum Server und keine funktionierenden mysql-/pg-Stubs. Lokale Hinweise auf doppelt geladene sqlsrv-/pdo_sqlsrv-Module sind eine Umgebungsbeobachtung, kein in Phase 0 zu behebender Inventurfehler.

# 20. Fachliche Risiken

| ID | Befund / Fundstelle | Warum der Alt-vs-Neu-Vergleich entscheidend ist |
| --- | --- | --- |
| F01 | Artikel-/EAN-Leersuche fällt in create (`get_artikelnummern.php:161–189`) | vermeintlicher Leseaufruf kann Schreibcode erreichen; zuerst isoliert klären |
| F02 | Mitarbeiter NAV_TEST, Bestand/Bewegung NAV_PROD | Buildtest-URL allein trennt die Datenbanken nicht; Zähleridentität/Datenbasis klären |
| F03 | Korrekturschlüssel Artikel+Lagerort, ohne Fach | erneute Zählung in anderem Fach kann bestehende Zeilen desselben Artikels korrigieren |
| F04 | Read-Join Artikel+ze, Write-Suche Artikel+Lagerort | angezeigte Zählinformation und adressierter Schreibbestand können sich unterscheiden |
| F05 | Bewegungssperre nur auf geladenem Record, kein Recheck beim Save | zwischen Auswahl und Save können Bewegungen entstehen; kein stiller neuer Sperrmechanismus |
| F06 | numerisch `5` vs. String `'5'`, NULL vs. fehlend | Converteränderungen ändern Sperre und Meldung |
| F07 | Barcode-/Herstellerfachsuche aus Warehouse Entry ohne aktuelle Fachsummenbedingung | angezeigte Fächer nicht automatisch als aktuell bestandsführend interpretieren |
| F08 | `_value`, `Number(...)`, Leerstringprüfung, keine eigenen Validatoren | 0/negativ/Dezimal/Komma/NULL können durch Modern anders verarbeitet werden |
| F09 | blinde Menge `????`, nicht vorgefüllte Zählung | Sollbestandsanzeige oder Vorbelegung würde Zählverhalten beeinflussen |
| F10 | Serverzeit, Statusstrings, gemischte Zeichenkonvertierung | fachlich relevante Zeit-/Zähler-/Statuswerte können verloren gehen |
| F11 | num_rows als Schreib-Erfolgskriterium; keine Transaktion/Idempotenz | UI-Fehler kann trotz serverseitiger Änderung auftreten; Doppeltap/Retry besonders prüfen |
| F12 | kein Abschluss/NAV-Buchen im Repository | „gespeichert“ ist keine nachgewiesene NAV-Buchung und kein vollständiger Inventurabschluss |
| F13 | Identifikation durch Name, keine serverseitige Sessionbindung | nicht eigenständig auf Benutzer-ID/anderes Berechtigungsmodell wechseln |

# 21. Offene Fragen

Alle folgenden Punkte sind **nicht aus dem vorhandenen Quellcode sicher ermittelbar** und müssen vor der jeweils betroffenen Umsetzung/Abnahme geklärt werden:

1. Welcher tatsächlich benutzte Legacy-Einstieg/Build ist die fachliche Referenz? Existieren vollständige Request-/Responsebeispiele und ein mit Commit/Version belegbarer Teststand?
2. Ist die Mischung aus `NAV_TEST` für Mitarbeiter und `NAV_PROD` für Artikel/Bewegung beabsichtigt? Welche vollständig isolierten Testdaten/-dienste stehen für Lese- und Schreibtests zur Verfügung?
3. Welche Auswirkungen hat eine EAN-Suche ohne Treffer in der damaligen PHP-/SQLSRV-/DB-Laufzeit? Ist eine gesonderte Korrektur dieses bestehenden Backendbefunds gewünscht? Hier nicht umgesetzt.
4. Sind mehrere Lagerplätze je Katalogartikel und Lagerort zulässig? Ist die Korrekturbedingung ohne Lagerplatz fachlich beabsichtigt? Welche eindeutigen Datenbankschlüssel existieren?
5. Sind `Lagerbestand` und `jf_inventur_lagerfach` Tabellen oder Views, und welche Trigger/Constraints/Jobs beeinflussen die Daten? Wie arbeitet die Mengenfunktion?
6. Welcher Prozess übernimmt offene Zählungen in NAV und setzt `gebucht`? Gibt es externe Abschluss-, Freigabe- oder Stornofunktionen?
7. Welche tatsächlichen Datentypen/NULL-Werte liefern `Activity_Type`, Mengen und Zeitstempel? Welche Format-/Warnungseinstellungen gelten für PHP und SQLSRV?
8. Wie soll mit bereits erkannten Altauffälligkeiten verfahren werden, falls sie die technische Portierung blockieren? Die notwendige Änderung muss jeweils separat beschrieben werden; diese Analyse erteilt dafür keine Freigabe.
9. Welcher Browser oder Container und welche Android-/DataWedge-Versionen laufen auf TC26/TC27? Welche Symbologien, Zeichenpräfixe/-suffixe und Feldwechsel sind am Gerät eingerichtet?
10. Wie wird der spätere eigene Modern-Einstieg unter derselben API-Semantik in der separaten Buildtestumgebung bereitgestellt? Welche Test-URL und welches Datenziel verhindern produktive Schreibzugriffe?
11. Welche Versionierungsregel verbindet zukünftig UI-Anzeige, Appmanifest, Packaging und Git-Commit? Aktuell stimmen UI 2.7 und native Version 1.0/1 nicht überein.
12. Sind die vorhandenen Architect-/UX-/SDK-Dateien gegenüber ursprünglichen Herstellerdateien verändert worden, und existiert die zugehörige vollständige Projektquelle? Lizenz-/SDK-Bereitstellung für den Zielbuild muss im Projektkontext geklärt sein; aus dem beigelegten Lizenztext wird kein aktueller Vertragsstatus abgeleitet.

# 22. Empfohlene Migrationsphasen

Die folgende Gliederung verwendet die im aktuellen Auftrag verlangten Phasen 0–6. Gegenüber der gröberen Nummerierung in `MIGRATION_RULES.md` wird die fachlich identische Grundfunktion als eigene Phase 2 ausgewiesen; Layout/Scanner/Test/Integrationsentscheidung verschieben sich entsprechend. Die Schutz-, Stopp- und Abnahmeregeln bleiben vollständig gültig; die Regeldatei wird nicht geändert.

Für alle Umsetzungsphasen gilt: Mac als Quellcodearbeitsplatz, kein automatischer Branchwechsel/Commit/Push; Git-Synchronisation nach ausdrücklichem Auftrag. Beg-web ist Build-/Testumgebung, keine Entwicklungsumgebung. Builds benötigen die vorgegebene Zielversion; kein Sencha auf dem Mac installieren. Jeder Gerätetest erhält Commit und App-/Buildkennung. Keine produktive Auslieferung ohne separate Freigabe.

| Phase | Ziel | Betroffene Dateien / Ergebnisse | Nicht anzufassende Bereiche | Tests | Risiken | Abnahmekriterium |
| --- | --- | --- | --- | --- | --- | --- |
| 0 – Bestandsanalyse | vorhandenen Ablauf/Verträge verstehen | ausschließlich `docs/LEGACY_ANALYSIS.md` | sämtliche Programm-/Build-/Backenddateien, Git-Historie | statische Quellprüfung, Dokumentationsvollständigkeit, Diff/Status | unbekannte Live-/DB-Details | 25 Kapitel, belegter Ablauf/API/SQL/Scanner, offene Fragen benannt; nur Doku geändert |
| 1 – Ext-JS-6.2.1-Modern-Zielstruktur | eigenständige startfähige technische Hülle und navigationstaugliches Viewgerüst | geplantes separates `modern/`-Projekt innerhalb dieses Repos; genaue Kandidaten in Kapitel 23 | vorhandener Legacy-Einstieg, Fachcontroller, Models/Stores, PHP/SQL, Scannerverhalten | statische Struktur-/Pfadprüfung auf Mac; später Cmd-7.6-Testbuild auf beg-web; Start/Nav-Smoke ohne Fachschreibzugriffe | T01/T02/T07, relative API-Pfade und Theme | SDK 6.2.1.167 Modern, eindeutige Startinstanz, isolierte Buildtestausgabe, Legacyreferenz verfügbar; noch keine fachliche Freigabe |
| 2 – fachlich identische Grundfunktion | Login, beide Suchen, Sperren, Blindzählung, Save/Korrektur portieren | spätere `modern/app/controller/*`, `model/*`, `store/*`, zugehörige Views; Vergleichsfixtures/Tests nach Auftrag | Backendverträge, SQL/DB, Geschäftsregeln, bestehende Originaldateien als Referenz | schrittweise Fälle aus Kapitel 25; zuerst Antworten/Requests isoliert, danach freigegebene Testdatenbank | fehlende IDs, Feld-/Writersemantik, F01–F13 | gleicher Nutzer/Standort/Artikel/Fach/Menge/Status/Serverdatensatz; ungeklärte kritische Befunde verhindern Abnahme |
| 3 – TC26/TC27-Layout | einspaltige kleine Displays, große Touchziele, lesbare Rückmeldung | Modern-Views und gezielte Theme-/SCSS-Dateien | Such-/Zähl-/Speicherregeln, Sollbestandverdeckung, APIs/DB | Gerätebedienung auf beiden Modellen plus betroffene Alt-vs-Neu-Fälle | Template/Scrollen/Keyboard, falsche Recordauswahl | Bedienung auf beiden Geräten möglich **und** fachliche Gleichheit der betroffenen Pfade bestanden |
| 4 – Scanner-/Fokusoptimierung | Hardwareeingabe mit eindeutigem Fokus und Scanabschluss | Modern-Such-/Mengenfelder, begrenzte Event-/Fokusadapter; dokumentiertes Geräteprofil | Mengenaddition, neue direkte EAN-Zählung, neue Backendaufrufe/-verträge | echte Scans, Enter/TAB, schnelle Mehrfachscans, Dialoge, Verbindungsverlust | falsches Feld, Doppelrequests, Modus-/Suffixverwechslung | jede freigegebene Scanfolge erzeugt dieselben Fachrequests/Ergebnisse wie ihre manuelle Referenzeingabe |
| 5 – Alt-vs-Neu-Test | vollständige fachliche und technische Abnahme | Testspezifikation/-protokolle, freigegebene Fixtures und identifizierbare Testbuilds | keine Anpassung erwarteter Ergebnisse an unbelegte neue Semantik; kein produktives Deployment | gesamte Matrix inklusive Datenbankvorher/-nachher, Fehler/Parallelität/Offline, beide Geräte | äußerer DB-Zustand und externe Buchungsprozesse | keine unerklärten Fach-/API-/Datensatzabweichungen; offene Risiken entschieden; Commit+Version dokumentiert |
| 6 – Entscheidung LagerTool-Integration | nach stabiler eigenständiger App eine Integrationsentscheidung treffen | gesonderte Architektur-/Entscheidungsdokumentation; LagerTool nur nach neuem Auftrag analysieren | laufende Inventurlogik, Backend/DB, keine automatische Integration | bei Freigabe technische Prüfung von Lifecycle/IDs/Locale/Stores/Auth/Theme | globale Namen, Date-Overrides, doppelte Timer/Store-IDs | nachvollziehbare Entscheidung eigenständig/Modul samt Aufwand/Testbedarf; Integration selbst eigener Auftrag |

Alt-vs-Neu-Tests beginnen bei der jeweiligen Funktion und werden nicht bis Phase 5 aufgeschoben. Phase 5 bündelt die Gesamtfreigabe. Eine schreibende Backendkorrektur wird durch keine dieser UI-Phasen automatisch autorisiert.

# 23. Voraussichtliche Phase-1-Dateien

Planungskandidat ist ein **separates Verzeichnis `modern/` innerhalb dieses Repositories**. Es existiert derzeit nicht und wurde nicht angelegt. Der Name ist eine vorgeschlagene Umsetzungsauswahl, keine bereits verbindlich erzeugte Sencha-Struktur.

| Geplanter Pfad / Dateigruppe | Zweck in Phase 1 | Begrenzung |
| --- | --- | --- |
| `modern/app.json` | Name/Modern-Toolkit/Theme/Assets/Zielbuildkonfiguration | keine unkontrollierte Kopie des Touchmanifests; keine fachliche API-Änderung |
| `modern/index.html` | genau ein Zielbootstrap-Einstieg | altes `index.html` erhalten |
| `modern/app.js` | minimale Ziel-Appinitialisierung | kein Vorgriff auf Inventur-Save; keine produktiven Requests |
| `modern/app/Application.js` | falls für die gewählte Cmd-Vorlage benötigt | technische Lebensdauer, keine neue Geschäftsarchitektur |
| `modern/app/view/Main.js` | Card-/Navigationsgerüst | noch keine nachgebaute Fachfunktion als abgenommen ausgeben |
| `modern/app/view/Login.js`, `Search_Container.js`, `Lagerfach.js` | ggf. leere, start-/navigationstaugliche Zielgerüste | keine neue Namensprüfung, Bewegungssperre oder Saveimplementierung in Phase 1 |
| `modern/.sencha/app/*`, ggf. eigener Workspacekontext, `modern/build.xml` | zur SDK-/Cmd-Vorlage passende Zielmetadaten | keine Übernahme der Cmd-4-Implementierungen als angeblich aktualisiert |
| `modern/sass/**` bzw. vorlagenkonforme Themequelle | minimales kompatibles Zieltheme | genaue Theme-/Sassstruktur zuerst am verfügbaren SDK feststellen |
| Ziel-Bootstrap-/Buildausgaben | später auf beg-web erzeugte technische Artefakte | keine handgepflegten generierten Dateien, nicht als Source synchronisieren |
| ggf. spätere Buildtest-/Versionsdokumentation | Einstieg, SDK, Cmd, URL, Version, Commit | Pfad nach gesondertem Phase-1-Auftrag bestimmen |

Diese Liste ist ausdrücklich vorläufig: Der tatsächliche Cmd-7.6-/Ext-6.2.1-Templatebestand wurde auf beg-web nicht gelesen. Die exakte Struktur darf daher erst in Phase 1 anhand dieser Dateien verbindlich gemacht werden. Beg-web erzeugt keine dauerhaft manuell gepflegten Quellen; Änderungen werden am Mac nachvollziehbar erstellt und ausschließlich per Git synchronisiert.

Ein Unterverzeichnis ändert die Auflösung von `resources/services/...`. Vor der Fachanbindung muss das konkrete URL-/Buildtestkonzept deshalb feststehen. Das rechtfertigt keine Kopie/Änderung von PHP oder automatische Umstellung auf einen anderen Server. Phase 1 kann mit einer technischen Hülle ohne Fachzugriffe abgeschlossen werden; für Phase 2 ist eine isolierte, nachgewiesene API-Testumgebung erforderlich.

# 24. Während Phase 1 nicht anzufassende Dateien

Die bereits vorhandene Legacyanwendung bleibt Referenz: `app.js`, `app.json`, `index.html`, `app.html`, `bootstrap.js`, `bootstrap.json`, sämtliche bestehenden Dateien unter `app/`, `touch/` und `resources/`. Insbesondere beide Controller, alle Models/Stores und die Login-/Suchhandler bleiben fachlich unverändert. Zielgerüste werden getrennt erstellt, nicht über die Originale geschrieben.

Strikt ausgeschlossen sind `resources/services/*.php`, `leer.html`, Datenbanken/SQL-Objekte, Statuswerte, Mitarbeiter-/Standort-/Lagerregeln, echte Schreibrouten und die Datenbankkonfiguration. Ebenfalls nicht nebenbei verändern: bestehende `.sencha/`-Cmd-4-Dateien, alte CMD-/Packagingdateien, CSS-/Sass-Caches, Logs und ignorierte Buildreste. Eine spätere Anpassung der Ignore- oder Builddokumentation gehört in einen ausdrücklichen Folgeauftrag; diese Phase 0 umfasst sie nicht.

Kein Sencha-Upgrade-Befehl, kein Ersetzen von `touch/`, kein Architect-Reexport, keine LagerTool-Integration und keine Quellcodekopie nach beg-web. Wird eine Änderung an eingefrorenen Bereichen notwendig, sind aktuelles Verhalten, technischer Bedarf, betroffene Fachlogik, Risiko und Alternativen vor Umsetzung zu dokumentieren.

# 25. Testanforderungen Alt vs. Neu

## 25.1 Vergleichsgrundlage und Durchführung

Diese Tests sind spezifiziert, **nicht als durchgeführt oder bestanden ausgewiesen**. Phase 0 hat keine UI geändert und führt weder App noch Services live aus. Ein vollständiger fachlicher Gleichheitsnachweis benötigt einen reproduzierbaren Legacy-Referenzstand und isolierte identische Datenbankzustände für Alt und Neu.

Nicht dieselbe veränderliche Datenbank nacheinander ohne Wiederherstellung verwenden: Der erste Save würde bereits den zweiten Testfall verändern. Benötigt werden abgestimmte Fixtures/Snapshots und Vorher-/Nachher-Abfragen. Kein pauschales Prüfen aller GET-Endpunkte gegen Produktion, insbesondere wegen F01. Fehler- und Schreibfälle ausschließlich in einer ausdrücklich vorgesehenen Testumgebung.

Je Test erfassen: App-/Buildkennung, Commit, Framework/Cmd, Gerät/Browser/DataWedge-Profil, Eingabefolge, Ausgangsdaten, Requests in Reihenfolge mit Methode/Endpoint/Parametern/JSON-Typen, vollständige Responses, UI-Entscheidung und resultierende Datensätze. Zugangsdaten und echte personenbezogene Testdaten gehören nicht in versionierte Protokolle.

Mindestens vergleichen: Benutzername und ggf. zugehöriger Mitarbeiterdatensatz, Standort, Lagerort, Lagerplatz, Katalogartikel/Herstellerartikel/Barcodeauflösung, Soll-/Zähl-/WE-Mengen, Status und Serverzeit, INSERT-/UPDATE-Anzahl sowie unverändert zu bleibende Spalten. `_dc` und ausschließlich technische Client-IDs können separat bewertet werden; sie dürfen keinen Wechsel der CRUD-Route verdecken. Zeitstempel benötigen gleiche kontrollierte Zeitbasis oder eine vorab definierte Zeitfensterprüfung und denselben serverseitigen Ursprung.

## 25.2 Konkrete Vergleichsmatrix

| Test | Eingabe / Ausgangszustand | Zu prüfendes bisheriges Ergebnis / Beleg |
| --- | --- | --- |
| A01 Start | frischer Browser, regulärer Legacy-Einstieg | tatsächliche doppelte Einbindung dokumentieren; bei regulärem Launch Login aktiv, Suche bereits erzeugt, Mitarbeiterload, Activitystore ohne Request |
| A02 vorhandener Cache | Legacy-Production-Assets, neuer/alter Cache, Update Ja/Nein | reproduzierbarer Start/Softwarestand; keine unbemerkte Wiederherstellung ungespeicherter Mengen behaupten |
| L01 Mitarbeiter | `State=0` vs. anderer State | nur freigegebene Mitarbeiter vom Dienst; serverseitig keine Standortfilterung |
| L02 Namenssuche | Teilname, Groß-/Kleinschreibung, Umlaute | lowercase/Regex auf suchcode, korrekte Treffer/Sortierung |
| L03 Regexgrenzen | `.`/`[`/`(`, leerer Text | tatsächliche Regexsemantik/Fehlerpfade; keine stille Umstellung auf Literalfilter |
| L04 Login | exakter Name, unbekannter Name, vorheriger Filter, noch nicht geladener Store | nur Treffer meldet an; genauer Fehler-/Filterzustand dokumentieren |
| L05 Standort | alle Werte 10–90, ohne manuelle Erstauswahl | identischer Standortparameter; existierende Titelabweichung 60–90 getrennt protokollieren |
| L06 Ping | Anmeldung und Verbindungsabbruch > 30 s | 5-s-Intervall, Alarmverhalten, keine DB-Gesundheitsaussage; keine doppelten Timer durch Zielstart |
| S01 Fach-Mindestlänge | 5/6 Zeichen nach Entfernen von `-`, leer, nur Bindestriche | vor Prüfung Store geleert, kein Request bei zu kurz |
| S02 Fach-Suchtext | identisches Präfix mit/ohne Bindestriche, Leerzeichen, Groß-/Kleinschreibung | Originaltext übertragen; tatsächliche SQL-Kollation/LIKE-Ergebnisse dokumentieren |
| S03 Bestände | Hauptlager >0/0/<0, WE-Bestand unterschiedlich | ausschließlich Hauptlager >0 im normalen Suchpfad; keine WE-Addition |
| S04 Mehrfachzeilen | mehrere Artikel/Fächer/Inventur-/Bewegungszeilen | gleiche Treffermenge und Sortierung, kein stilles DISTINCT oder Zusammenfassen |
| S05 keine Fachtreffer | normaler Suchmodus ohne Treffer | `{artikel:[],total:0}` und Emptytext; keine Speicherung |
| B01 Hersteller-/EAN-Suche | mindestens vier Zeichen; Hersteller mit Leerzeichen; EAN mit führenden Nullen | Herstellerpräfixnormalisierung, Barcode-LIKE ohne zusätzliches %, Standort+'01', WE ausgeschlossen |
| B02 unbekannte EAN | null Treffer, isoliertes Backend | Fallthrough und tatsächliche SQL-/Fehlerfolgen protokollieren; nicht gegen Produktion testen |
| B03 unvollständige Antwort | Artikelmodus-Response mit fehlenden/null Feldern | Rohresponse/Warnings und Modelwerte vergleichen; kein erfundener Bestand/Katalogartikel |
| B04 Moduswechsel | vorhandene Artikelresultate, Checkbox deaktivieren ohne neue Suche | vorhandene Treffer bleiben; aktuelle Checkbox und Record-Activity bestimmen Zugang; keine unbelegte sichere Zählroute annehmen |
| Z01 Auswahl | `itemtap` und `itemtaphold` | gleicher Record, korrekter Fach-/Artikeltext, keine doppelte Verarbeitung |
| Z02 Bewegungen | Activity numerisch 5/andere/0, `'5'`, NULL, fehlend; vergangenes Due Date | nur NULL erlaubt; 5=Kommissionierung, sonst Einlagerung; Datum nicht lokal als Freigabe berechnet |
| Z03 Blindzählung | Artikel mit bisheriger Zählung | Sollanzeige `????`, Eingabefeld leer; keine Vorbelegung |
| Z04 Mengenwerte | `''`, 0, positiv, negativ, Dezimal, Komma/Punkt, ungültig, sehr groß | DOMwert, `_value`, Vergleich und tatsächlicher Body separat erfassen |
| Z05 Gleichheit | gezählte Menge numerisch gleich Soll | ohne Abweichungsdialog speichern |
| Z06 Abweichung | gezählte Menge ungleich Soll, Ja/noch einmal zählen | nur Ja erzeugt Save; andere Wahl behält offene Eingabe |
| Z07 Abbruch | Zurück ohne Speichern; erneut denselben/anderen Record öffnen | kein Save durch Zurück, neues leeres Zählfeld, richtige Datenbindung |
| P01 Neuzählung | kein offener Artikel/Lagerort-Datensatz | POST create, ein INSERT mit zwölf Spalten, Status gezählt, Serverzeit |
| P02 Korrektur | offener Artikel/Lagerort-Datensatz | POST create, UPDATE aller passenden Zeilen, Status geändert, neuer Zähler/Menge/Zeit; übrige Spalten gleich |
| P03 gebucht | nur gebuchte ältere Zeile | alte gebuchte Zeile nicht geändert, neuer INSERT laut vorhandener Bedingung |
| P04 gleiche Artikel andere Fächer | gleicher Artikel+Lagerort, Fach verschieden | reale UPDATE-Reichweite ohne Fach, keine implizite Schlüsselkorrektur |
| P05 Standorte/Lagerorte | gleicher Artikel in anderen Lagerorten/ze | tatsächliche Trennung und Read-/Write-Joinunterschiede vergleichen |
| P06 Encoding | Namen/Text mit Umlauten/Apostroph, Hersteller-Nr. mit Sonderzeichen | identische Übertragung und DB-Werte; bestehende Fehler nicht verstecken |
| P07 Antwort/Schreiberfolg | erfolgreicher SQL-Write mit success true/false, fehlerhaftes JSON | DB-Zustand getrennt von UI-Erfolg, commit/reject/zurück/reload vergleichen |
| P08 Zeit | Clientzeit abweichend, Serverzeit/Zeitzone/Sommerzeit | Server bestimmt gespeicherte Zeit; kein stiller Wechsel auf Clientzeit |
| P09 wiederholter Save | Doppeltap, erneuter Save desselben Records vor Reload | Anzahl/Methode/create-vs-update, Status-/Zeilenfolgen, keine unerwartete Stubroute |
| P10 Parallelität | zwei Zähler, Bewegung nach Listenload, doppelte offene Zeilen | beobachtetes Legacy-Verhalten und DB-Constraints dokumentieren; keine neue Sperrpolitik als UI-Fix |
| N01 offline vor Start | kein Mitarbeiterservice erreichbar | keine erfundene Offlineanmeldung/-synchronisation; wirklichen Fehlerzustand erfassen |
| N02 offline nach Laden | Treffer bereits vorhanden, anschließend Save ohne Netz | keine lokale Queue; Fehlermeldung/reject; unsaved Zustand ermitteln |
| N03 Antwort verloren | Server schreibt, Antwort erreicht Gerät nicht | UI/DB-Abweichung und manuelle Wiederholung; kein automatischer zweiter Write |
| N04 Suchantworten vertauscht | zwei schnelle Suchen mit verzögerten Antworten | sichtbare Datensätze und deren Suchkontext erfassen |
| H01 echtes Scannen | TC26 und TC27, Fachbarcode/EAN, ENTER/TAB/kein Suffix | Zeichenfolge, Fokus, Eventfolge und Requests; alter Standard löst Suche nicht durch Enter aus |
| H02 Mehrfachscan/Fokus | schnelle Scans, vor/nach Dialog/Save, Tastatur offen | kein falsches Zielfeld, keine implizite Mengenaddition, keine Doppelrequests im freigegebenen Zielablauf |
| H03 kleine Anzeige | beide Geräte, lange Namen/Artikeltexte/Statusmeldungen | Werte/Bedienziele sichtbar, richtige Auswahl, betroffene Fachtests bestanden |
| D01 inaktive Endpunkte | Activity-/Login-create/update/destroy | statisch registriert, im normalen Ablauf keine Requests; nicht als neue Funktionen aktivieren |

Abnahme setzt voraus, dass die erwarteten Ergebnisse aus einem belegten Referenzlauf stammen. Für bekannte Defekte wird eine Abweichungsentscheidung dokumentiert; es wird weder ein Altfehler still zum Soll erklärt noch ein neues Verhalten ohne Auftrag eingeführt.

## 25.3 In Phase 0 durchgeführte Prüfungen

- Branch und sauberer Anfangsstatus geprüft; `main` und Baseline-Tag auf denselben Commit aufgelöst; Unterschiede zu HEAD auf die beiden Regeldateien begrenzt.
- Eigene Klassen-/Service-/Ressourceninventare, Aufruferketten, PHP-Switchzweige, HTTP-/SQL-/Storage-/Scanner-/Fokusfundstellen statisch geprüft; Bootstrapmappings vollständig strukturell ausgewertet.
- Microloader-/SDK-/Buildkopien und relevante CSS-/SCSS-Unterschiede verglichen; vorhandene ignorierte Buildreste getrennt erfasst.
- `php -l` für alle vier PHP-Dateien erfolgreich; lokale Warnungen wegen doppelt geladener sqlsrv-/pdo_sqlsrv-Module. Keine PHP-Datei ausgeführt, kein DB-Include zur Laufzeit eingebunden.
- Dokument vollständig gegengelesen; Kapitel 1–25 eindeutig/vollständig, lokale Markdownlinks vorhanden und Codeblöcke geschlossen. Gesamter Neudateiinhalt als Dokumentationsdiff geprüft; `git diff --no-index --check -- /dev/null docs/LEGACY_ANALYSIS.md` ohne Whitespacebefund. Kein Sencha-Build, keine Paketinstallation, kein Browser-/TC26-/TC27-Test und kein Live-Alt-vs-Neu-Vergleich in Phase 0.
- Inhalts-/Pfad-/Größenvergleich aller 4.590 vor der Dokumenterstellung vorhandenen Dateien außerhalb `.git/` einschließlich ignorierter Builds und Logs unverändert: aggregierter SHA-256 `38c5050a7f0766bfe0743214a2428285f28494a9510eed4d02313daccb65854b`. Neu hinzugekommene Dateien wurden dafür getrennt erfasst, nicht dem Altbestand zugerechnet.

Die einzige durch Codex angelegte/bearbeitete Datei ist `docs/LEGACY_ANALYSIS.md`. Während der Abschlussprüfung erschien zusätzlich die unversionierte Datei `docs/ersten_zeilen.md` (Inhalt: kopierte nummerierte Diffansicht) sowie eine ignorierte `.DS_Store`. Beide wurden nicht durch Codex angelegt und nicht verändert oder entfernt; ihre genaue Herkunft ist nicht sicher ermittelbar. Daher zeigt `git status` zwei unversionierte Dokumente, nicht ausschließlich die Analysedatei. An versionierten Bestandsdateien gibt es weder Arbeitsbaum- noch Indexänderungen. Branch unverändert `feature/extjs62-migration`.

Es wurde keine App-/Buildversion erhöht. Kein Commit, kein Push, kein Branchwechsel und kein Deployment. Empfohlener Committext für einen **erst später ausdrücklich beauftragten** Dokumentationscommit: `docs: document Phase 0 BergInventur legacy analysis`.

Phase 0 endet mit dieser Dokumentation. Phase 1 wurde nicht begonnen.

# 26. Produktiver Backendstand als Grundlage für Phase 2B

Für Phase 2B wurde als direkt auf `beg-web` verifizierte Laufzeitgrundlage
vorgegeben:

- aktive Legacy-Anwendung: `https://beg-web.berg-sdl.de/BergInventur/`
- Inventur-Servicebasis: `/BergInventur/resources/services`
- produktive Datei:
  `C:\amp\Apache24\htdocs\BergInventur\resources\services\get_artikelnummern.php`

Diese produktive Datei weicht von der älteren Git-Datei ab. Im produktiven
Artikel-/EAN-Zweig steht das `break` außerhalb der Trefferbedingung. Deshalb
endet `action=ListeArtikelnummern` auch bei null Treffern ohne Fallthrough in
`case "create"`.

Außerdem verwendet der produktive Stand folgende lagerplatzbezogene
Bedingungen:

- Der Join vorhandener Inventurwerte verknüpft Katalogartikelnummer, `ze` und
  Lagerplatz.
- Die Prüfung auf eine vorhandene offene Zählung verwendet
  Katalogartikelnummer, Lagerort, Lagerplatz und `status <> 'gebucht'`.
- Das zugehörige UPDATE ist auf dieselben vier Kriterien begrenzt.

Für das tatsächliche Laufzeitverhalten ist dieser produktive Stand maßgeblich.
Phase 2B verwendet ausschließlich den GET-Leseweg. Eine Synchronisierung oder
Änderung der produktiven beziehungsweise versionierten PHP-Datei ist nicht
Teil dieser Phase.
