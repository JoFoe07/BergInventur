::Variablen für den Dateinamen festlegen
Set HOUR=%TIME:~0,2%
Set MIN=%TIME:~3,2%
Set MONTH=%DATE:~3,2%
Set DAY=%DATE:~0,2%
Set YEAR=%DATE:~6,4%
Set Datum=%YEAR%%MONTH%%DAY%_%HOUR%%MIN%

c:
cd C:\amp\Apache24\htdocs\Inventur_NAV


sencha app build -e native

pause
EXIT

SETLOCAL

SET _source=C:\amp\Apache24\htdocs\Inventur_NAV
SET _dest="D:\Kunden\Berg\APPs-Siko\Inventur_NAV\%Datum%"
SET _what=/COPYALL /B /SEC /MIR

:: /COPYALL :: COPY ALL file info
:: /B :: copy files in Backup mode. 
:: /SEC :: copy files with SECurity
:: /MIR :: MIRror a directory tree 

SET _options=/R:0 /W:0 /LOG:inventur.log /NFL /NDL
:: /R:n :: number of Retries
:: /W:n :: Wait time between retries
:: /LOG :: Output log file
:: /NFL :: No file logging
:: /NDL :: No dir logging 

C:\BatchDateien\ROBOCOPY %_source% %_dest% %_what% %_options%

exit





