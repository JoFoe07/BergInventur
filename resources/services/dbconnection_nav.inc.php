<?php

$serverName = "NAV-SQL"; //serverName\instanceName // 
$Firma = "BAT";
$NAV = "NAV_TEST";

$connectionInfo = array( "Database"=>"tools", "UID"=>"export", "PWD"=>"JhdRR%_E");
$conn = sqlsrv_connect( $serverName, $connectionInfo);

if( $conn ) {
     //echo "Verbindung hergestellt!.<br />";
}else{
     echo "Konnte keine Verbindung aufbauen oder keine Datenbank auswählen!<br />";
     die( print_r( sqlsrv_errors(), true));
}





?>