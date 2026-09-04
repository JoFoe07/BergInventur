<?php

// 	
/* // http://beg-web.berg-sdl.de/iv/resources/services/get_activityline.php?action=Listeactivityline&_dc=1374149494728&keyword='D0113-4-1'&ze='10'&standort='10' 
*/

session_start();
setlocale(LC_MONETARY, 'de_DE');
include("dbconnection_nav.inc.php");
function umlaute($string) { 
   return str_replace ( array ( '{', '}', "|", '[', ']', '\\', '~' ), array ( 'ä' , 'ü', 'ö' , 'Ä' , 'Ü', 'Ö' , 'ß'), $string );
};



function mssql_escape($data) {
    if(is_numeric($data))
        return $data;
    $unpacked = unpack('H*hex', $data);
    return '0x' . $unpacked['hex'];
}


function hochkomma($string) { 
   return str_replace ( array ( "'" ), array ( "`"), $string );
};

function jf_mssql_escape_string($daten) {
	if ( !isset($daten) or empty($daten) ) return '';
	if ( is_numeric($daten) ) return $daten;
	$non_displayables = array("%0[0-8bcef]/","/%1[0-9a-f]/","/[\x00-\x08]/","/\x0b/","/\x0c/","/[\x0e-\x1f]");
	foreach ( $non_displayables as $regex )
		$daten = preg_replace( $regex, '', $daten );
	$daten = str_replace("'", "''", $daten );
return $daten;
};


$current_page = 1;
$offset_page = 0;
$limit_per_page = 10;

//$action = $_GET["act"];


switch($_REQUEST["action"]) {
 case "Listeactivityline":
//if (!isset($_REQUEST["action"])) {
	$result = array("akiv"=>array(),"total"=>0);
		
	$current_page = $_REQUEST["page"];
	$limit_per_page = $_REQUEST["limit"];
	$offset_page = $_REQUEST["start"];

	$keyword = "";
	$standort = "";
	
	if (isset($_REQUEST["keyword"]))
		$keyword = $_REQUEST["keyword"];
		$standort = $_REQUEST["standort"];

	$sql = 		"select [Bin Code] from [NAV_PROD].[dbo].[BAT".'$'."Warehouse Activity Line]  WAL WITH (NOLOCK)\n"

			. "   where  \n"
			. "   SUBSTRING([Location Code],1,2) = ".$standort." and  \n"
			. "   [Bin Code] = ".$keyword;		


$params = array();
$options =  array( "Scrollable" => SQLSRV_CURSOR_KEYSET );

$dbresult = sqlsrv_query($conn, $sql , $params, $options );

if($dbresult === false) {
print_r($sql);
 die(print_r(sqlsrv_errors(), true));
}  ;
#Fetching Data by array

$menge = sqlsrv_num_rows( $dbresult);
$result["total"] = $menge;

/*
if ($row_count === false)
   echo "Error in retrieveing row count.<br><br>";
else
   echo "$row_count <br>";
*/
if (sqlsrv_num_rows ($dbresult) > 0) {
	while($row = sqlsrv_fetch_array($dbresult))
	{
	array_push($result["akiv"],array(
				"bin_code"=>$row['Bin Code'],
	
				));
		
}

}
//	pg_close($verbindung);
break;
	
 case "create":

 //get the data
$json = file_get_contents("php://input");
$data = json_decode($json, true);

//output the array in the response of the curl request
//(print_r($data);

//$artikeltext1 = hochkomma($data["art_text1"]);
//$artikeltext1 = mssql_escape($data["art_text1"]);
//$data1 = jf_mssql_escape_string($data["art_text1"]);
//einfache Hochkomma escapen


//'ä ü ö Ä Ü Ö ß'

// Prüfen ob der Artikel bereits erfasst wurde, aber noch nicht in NAV gebucht wurde.


$sql =  "select katalogartikelnr from tools.[dbo].[jf_inventur_lagerfach_temp] IV where IV.katalogartikelnr='".$data["carlanr"]."' and IV.status<>'gebucht'";
$params = array();
$options =  array( "Scrollable" => SQLSRV_CURSOR_KEYSET );
$dbresult = sqlsrv_query($conn, $sql , $params, $options );

if (sqlsrv_num_rows ($dbresult) >= 1) // bereits gezählt aber noch nicht gebucht dann ändern
{
	
	$query = "update tools.[dbo].[jf_inventur_lagerfach_temp]  set gezaehlt= ".$data["gezaehlt"]." , status='".utf8_decode('geändert')."',gezaehlt_am='". date('d-m-Y H:i:s')."' where katalogartikelnr='".$data["carlanr"]."' and status<> 'gebucht'";
	$params = array();
	$options =  array( "Scrollable" => SQLSRV_CURSOR_KEYSET );
	$ergebnis = sqlsrv_query( $conn, $query, $params, $options );

}
else
{

	$query = "INSERT INTO jf_inventur_lagerfach_temp (katalogartikelnr, lagerplatz, art_herst_art_nr, art_text1, menge_im_fach, gezaehlt, gezaehlt_am,zaehler,lagerort,ze,me_we,status) values (?,?,?,?,?,?,?,?,?,?,?,?)";
			
	$params = array($data["carlanr"],$data["fachnummer"],$data["art_herst_art_nr"],utf8_decode($data["art_text1"]),$data["menge_im_fach"],$data["gezaehlt"],date('d-m-Y H:i:s'),utf8_decode($data["zaehler"]),$data["lagerort"],$data["ze"],$data["me_we"],utf8_decode('gezählt'));
	$options =  array( "Scrollable" => SQLSRV_CURSOR_KEYSET );
	$ergebnis = sqlsrv_query( $conn, $query, $params, $options );



};



	$int = sqlsrv_num_rows($ergebnis);

	if ($int >= 1)
	{
		$result = array("success"=>true,"message"=>"Datensatz hinzugefügt");
	}
	else
	{
		$result = array("success"=>false,"message"=>"Fehler" );//sqlsrv_errors());//$query);//;
	} ;
/**/
/*
if( $ergebnis === false ) {
	$result = array("success"=>false,"message"=>"Fehler" ); 
    // die( print_r( sqlsrv_errors(), true));
}
else
{

		$result = array("success"=>true,"message"=>$ergebnis);//"Datensatz hinzugefügt");
};	
*/
	break;

	
 case "update":

//echo preg_replace('/\s\s+/','',$inputPayload->geaendert_am);
//echo date('Y-m-dH:i:s', (1371454040))
/*  	print_r($query);  */
		
	$dbresult = mysql_query($query);

	if(pg_num_rows()>0)
		$result = array("success"=>true,"message"=>"Updated");//$query);
	else
		$result = array("success"=>false,"message"=>mysql_error());//$query);//;

	pg_close($verbindung);
	
	break;
	
 case "delete":

	break;
}

if (isset($_REQUEST["callback"])) {
	header("Content-Type: text/javascript; charset=utf-8");
	echo $_REQUEST["callback"]. "(" .json_encode($result). ");";
}
else {
	header('Cache-Control: no-cache, must-revalidate');
	header("Content-Type: application/x-json");

	echo json_encode($result);
	}