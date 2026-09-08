<?php

// 	
/* // http://beg-web.berg-sdl.de/iv/resources/services/get_artikelnummern.php?action=create&_dc=1374149494728&carlanr=10378678&menge_im_fach=2&gezaehlt=2&zaehler='jf'&fachnummer='19630705'&art_herst_art_nr='B0302-5-2'&art_text1='ö1',gezaehlt_am='2017-12-12'&ze='10'&lagerort='1001'&me_we='0' */

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

$artikelsuche = isset($_REQUEST["artikelsuche"]) ? $_REQUEST["artikelsuche"] : "";

switch($_REQUEST["action"]) {

 case "ListeArtikelnummern":

	$result = array("artikel"=>array(),"total"=>0);
		
	$current_page = $_REQUEST["page"];
	$limit_per_page = $_REQUEST["limit"];
	$offset_page = $_REQUEST["start"];

	$keyword = "";
	$standort = "";
	
	if (isset($_REQUEST["keyword"]))
		$keyword = $_REQUEST["keyword"];
		$standort = $_REQUEST["standort"];

	// Lagerbestand suchen 	
	if ($artikelsuche == 'false') {						 
							   
		$sql = 		" select [lb].[katalogartikelnr] as KANR,[lb].[artikelnr],[lb].[ze] as zustaendikeit,[lb].[Location Code],[lb].[Lagerplatz] as LGP,[ME_Hauptlager],[ME_WE],[Menge_verfuegbar],  \n"
				. " [NAV_PROD].[dbo].[BAT".'$'."Warehouse Activity Line].[Activity Type] as Activity,  format(NAV_PROD.dbo.[BAT".'$'."Warehouse Activity Line].[Due Date],'d', 'de-de')  as gew_lieferdatum, \n"
				. "	[Base Unit of Measure],[Vendor No_],[Vendor Item No_],[lb].[Description],[Unit Price],[Item Category Code],  \n"
				. "	[Following Item Mfr_ Code],[Following Mfr_ Item No_],[Planning Group],[Blocked Purchase],  \n"
				. "	[Expire Mark],[Warengruppe],[Rabattklasse],[Hersteller],[id],  \n"
				. "	[lagerplatz],[art_herst_art_nr],[art_text1],[menge_im_fach],  \n"
				. "	[gezaehlt],[zaehler],[ivt].[ze],[lagerort],[gezaehlt_am],  \n"
				. "	case when [ivt].[katalogartikelnr] is null then '' else gezaehlt +' ' + [ivt].status +' am '+ CONVERT(VARCHAR(14), gezaehlt_am, 104)  END as info  \n"
				. " FROM  dbo.Lagerbestand AS lb WITH (NOLOCK) LEFT OUTER JOIN \n"
				. " dbo.jf_inventur_lagerfach AS ivt WITH (NOLOCK) ON ivt.katalogartikelnr = lb.katalogartikelnr AND ivt.ze = lb.ze AND ivt.lagerplatz = lb.Lagerplatz FULL OUTER JOIN  \n"
				. "	[NAV_PROD].[dbo].[BAT".'$'."Warehouse Activity Line] ON lb.Lagerplatz = [NAV_PROD].[dbo].[BAT".'$'."Warehouse Activity Line].[Bin Code] \n"
				. " and lb.ze = SUBSTRING([NAV_PROD].[dbo].[BAT".'$'."Warehouse Activity Line].[Location Code],1,2) \n"
				. "   where  \n"
				. "   [lb].[ME_Hauptlager] > 0 and  \n"
				. "   [lb].[ze] = '".$standort."' and  \n"
				. "   [lb].[Lagerplatz] like '".$keyword."%' order by [lb].[Lagerplatz]  ";		

		$params = array();
		$options =  array( "Scrollable" => SQLSRV_CURSOR_KEYSET );

		$dbresult = sqlsrv_query($conn, $sql , $params, $options );

		if($dbresult === false) {
			die(print_r(sqlsrv_errors(), true));
		}

		$menge = sqlsrv_num_rows( $dbresult);
		$result["total"] = $menge;

		if (sqlsrv_num_rows ($dbresult) > 0) {
			while($row = sqlsrv_fetch_array($dbresult))
			{
				array_push($result["artikel"],array(
					"fachnummer"=>$row['LGP'],
					"art_herst_art_nr"=>utf8_encode(addslashes((string)$row['Vendor Item No_'])),
					"art_text1"=>utf8_encode((string)$row['Description']),
					"menge"=>$row['ME_Hauptlager'],
					"carlanr"=>$row['KANR'],
					"gezaehlt"=>$row['gezaehlt'],
					"info"=>utf8_encode((string)$row['info']),
					"gezaehlt_am"=>$row['gezaehlt_am'],
					"ze"=>$row['zustaendikeit'],
					"lagerort"=>$row['Location Code'],				
					"wurde_gezaehlt"=>utf8_encode((string)$row['wurde_gezaehlt']),
					"me_we"=>$row['ME_WE'],
					"Activity_Type"=>$row['Activity'],
					"gew_lieferdatum"=>$row['gew_lieferdatum'],
				));
			}
		}

		break;
	}
	else //// Lagerfach suchen 	
	{	
		$standort = $standort.'01';
		$sql = 		"	select  NSI.[Item No_],   \n"
					. " [tools].[dbo].[get ME_verfuegbar_filiale](NSI.[Item No_],'".$standort."') 'Menge in Filiale',WAL.[Bin Code] lagerplatz,   \n"
					. " NSI.Description,NSI.[Manufacturer Item No_],NSI.[Manufacturer Code],[Bar Code] from NAV_PROD.dbo.[BAT".'$'."Nonstock Item] NSI WITH (NOLOCK)   \n"
					. " inner join [NAV_PROD].[dbo].[BAT".'$'."Warehouse Entry] WAL WITH (NOLOCK)   \n"
					. " on NSI.[Item No_] = WAL.[Item No_]   \n"
					. " where WAL.[Location Code] = '".$standort."' and ((REPLACE(UPPER(NSI.[Manufacturer Item No_]),' ','')) like REPLACE(upper('".$keyword."%'),' ','') or NSI.[Bar Code] like '".$keyword."' ) and WAL.[Bin Code] <>'WE'  \n"
					. " group by WAL.[Bin Code],NSI.[Item No_],NSI.Description,NSI.[Manufacturer Item No_],NSI.[Manufacturer Code],[Bar Code]   ";
		
		$params = array();
		$options =  array( "Scrollable" => SQLSRV_CURSOR_KEYSET );

		$dbresult = sqlsrv_query($conn, $sql , $params, $options );

		if($dbresult === false) {
			die(print_r(sqlsrv_errors(), true));
		}

		$menge = sqlsrv_num_rows( $dbresult);
		$result["total"] = $menge;

		if (sqlsrv_num_rows ($dbresult) > 0) {
			while($row = sqlsrv_fetch_array($dbresult))
			{
				array_push($result["artikel"],array(
					"fachnummer"=>$row['lagerplatz'],
					"art_herst_art_nr"=>utf8_encode(addslashes((string)$row['Manufacturer Item No_'])),
					"art_text1"=>utf8_encode((string)$row['Description']),
					"menge"=>$row['ME_Hauptlager'],
					"carlanr"=>$row['KANR'],
					"gezaehlt"=>$row['gezaehlt'],
					"info"=>utf8_encode((string)$row['info']),
					"gezaehlt_am"=>$row['gezaehlt_am'],
					"ze"=>$row['zustaendikeit'],
					"lagerort"=>$row['Location Code'],				
					"wurde_gezaehlt"=>utf8_encode((string)$row['wurde_gezaehlt']),
					"me_we"=>$row['ME_WE'],
					"Activity_Type"=>$row['Activity'],
					"gew_lieferdatum"=>$row['gew_lieferdatum'],
				));
			}
		}
		break;
	}

 case "create":

	//get the data
	$json = file_get_contents("php://input");
	$data = json_decode($json, true);

	// Prüfen ob der Artikel bereits erfasst wurde, aber noch nicht in NAV gebucht wurde.
	// FIX: lagerplatz (fachnummer) muss Teil der Eindeutigkeit sein.
	$sql =  "select katalogartikelnr
	         from tools.[dbo].[jf_inventur_lagerfach] IV
	         where IV.katalogartikelnr = '".$data["carlanr"]."'
	           and IV.lagerort         = '".$data["lagerort"]."'
	           and IV.lagerplatz       = '".$data["fachnummer"]."'
	           and IV.status <> 'gebucht' ";

	$params = array();
	$options =  array( "Scrollable" => SQLSRV_CURSOR_KEYSET );
	$dbresult = sqlsrv_query($conn, $sql , $params, $options );
	$existing_rows = ($dbresult === false) ? false : sqlsrv_num_rows($dbresult);
	$ergebnis = false;

	if ($existing_rows !== false && $existing_rows >= 1) // bereits gezählt aber noch nicht gebucht dann ändern
	{
		// FIX: UPDATE ebenfalls mit lagerplatz absichern
		$query = "update tools.[dbo].[jf_inventur_lagerfach]
		          set zaehler     = '".$data["zaehler"]."' ,
		              gezaehlt    = ".$data["gezaehlt"]." ,
		              status      = '".utf8_decode('geändert')."' ,
		              gezaehlt_am = '". date('d-m-Y H:i:s')."'
		          where katalogartikelnr = '".$data["carlanr"]."'
		            and lagerort         = '".$data["lagerort"]."'
		            and lagerplatz       = '".$data["fachnummer"]."'
		            and status <> 'gebucht'";

		$params = array();
		$options =  array( "Scrollable" => SQLSRV_CURSOR_KEYSET );
		$ergebnis = sqlsrv_query( $conn, $query, $params, $options );
	}
	else if ($existing_rows !== false)
	{
		$query = "INSERT INTO jf_inventur_lagerfach (katalogartikelnr, lagerplatz, art_herst_art_nr, art_text1, menge_im_fach, gezaehlt, gezaehlt_am,zaehler,lagerort,ze,me_we,status) values (?,?,?,?,?,?,?,?,?,?,?,?)";
				
		$params = array(
			$data["carlanr"],
			$data["fachnummer"],
			$data["art_herst_art_nr"],
			utf8_decode($data["art_text1"]),
			$data["menge_im_fach"],
			$data["gezaehlt"],
			date('d-m-Y H:i:s'),
			utf8_decode($data["zaehler"]),
			$data["lagerort"],
			$data["ze"],
			$data["me_we"],
			utf8_decode('gezählt')
		);

		$options =  array( "Scrollable" => SQLSRV_CURSOR_KEYSET );
		$ergebnis = sqlsrv_query( $conn, $query, $params, $options );
	};

	$affected_rows = ($ergebnis === false) ? false : sqlsrv_rows_affected($ergebnis);

	if ($affected_rows !== false && $affected_rows > 0)
	{
		$result = array("success"=>true,"message"=>"Datensatz hinzugefügt");
	}
	else
	{
		$result = array("success"=>false,"message"=>"Fehler" );
	} ;

	break;

 case "update":

	$dbresult = mysql_query($query);

	if(pg_num_rows()>0)
		$result = array("success"=>true,"message"=>"Updated");
	else
		$result = array("success"=>false,"message"=>mysql_error());

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
