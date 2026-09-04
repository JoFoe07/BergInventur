::Variablen für den Dateinamen festlegen
::@echo off


For /f "tokens=1-3 delims=/." %%a in ('date /t') do (set mydate=%%c%%b%%a)
For /f "tokens=1-9 delims=/ " %%a in ("%mydate%") do (set mydate=%%a%%b%%c)
For /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
Set Datum=%mydate%_%mytime%

cd C:\amp\Apache24\htdocs\Inventur_NAV
c:

C:\Users\jofoerster\bin\Sencha\Cmd\4.0.0.203\sencha app build -e production

pause


SETLOCAL

SET _source=C:\amp\Apache24\htdocs\Inventur_NAV
SET _dest="D:\Kunden\Berg\APPs-Siko\Inventur_NAV\%Datum%"


"C:\Program Files\7-Zip\7z.exe" a -r %_dest% %_source%


::SET _what=/COPYALL /B /SEC /MIR

:: /COPYALL :: COPY ALL file info
:: /B :: copy files in Backup mode. 
:: /SEC :: copy files with SECurity
:: /MIR :: MIRror a directory tree 

::SET _options=/R:0 /W:0 /LOG:inventur.log /NFL /NDL
:: /R:n :: number of Retries
:: /W:n :: Wait time between retries
:: /LOG :: Output log file
:: /NFL :: No file logging
:: /NDL :: No dir logging 

:: C:\BatchDateien\ROBOCOPY %_source% %_dest% %_what% %_options%
pause
exit





