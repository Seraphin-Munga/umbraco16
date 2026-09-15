var _LB_Map_ObjInfo_1 = {mataCatergory:[]};
//_LB_Map_ObjInfo_1.mataCatergory
(function () {
    var ID = '6ef8638f-af8c-409d-ad24-cf3422269370'; 
    var postalCodeOnlyWithoutSpace;
    var postalCodeOnly;
    var nearestLocations = "https://postcodeuk.locationbank.net/postcodes?";
    var useFirstPartyReview = 'False';
    var Debug = 'False';
    var loadFile = "https://api.locationbank.net/storelocator/";
    var Layout = 'standard';
    var DetailsLayout = '';
    var Platform = 'web';
    var bOverrideDetailURL = false;
    var strDetailURL = "";
    _LB_Map_ObjInfo_1.Layout = Layout;
    var Unit = 'metric'; // metric impearl
    var AddressLayout = ''; // usa , sa ,
    var TimeFormat = '24'; // 24 or 12 
    var km2mil = 1.609344
    var DomObj;
    var localizeText = {"usa":{"Country":"Country","Province":"State/Region","City":"City","Area":"Area","AddressLineLocality":"Locality,AdministrativeArea"},
                        "default":{"Country":"Country","Province":"Province","City":"City","Area":"Area","AddressLineLocality":"Locality"}} 
    var mapDiv;     
    if (window.jQuery === undefined) {
        var d = document.createElement("script");
        d.setAttribute("type", "text/javascript");
        d.setAttribute("src", "https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js");
        if (d.readyState) {
            d.onreadystatechange = function() {
                if (this.readyState == "complete" || this.readyState == "loaded") {
                    StoreLocationLoad()
                }
            }
        } else {
            d.onload = StoreLocationLoad
        }
        (document.getElementsByTagName("head")[0] || document.documentElement).appendChild(d)
    } else {
        DomObj = window.jQuery;
        StoreLocationLoadDone()
    }
    function StoreLocationLoad() {
        DomObj = window.jQuery.noConflict(true);
        
        StoreLocationLoadDone()
    }
    function StoreLocationLoadDone() {
        DomObj.expr[':'].Contains = function(a,i,m){
            return (a.textContent || a.innerText || "").toUpperCase().indexOf(m[3].toUpperCase())>=0;
        };
        var ID = '6ef8638f-af8c-409d-ad24-cf3422269370';
        var Layout = 'standard';
        var MainDiv = document.getElementById(ID);
        MainDiv.appendChild(CreateCSS("https://locationbank.net/" + "css/publicStoreLocation.min.css"));
        MainDiv.appendChild(CreateCSS("https://locationbank.net/" + "css/bootstrap-iso.min.css"));
        MainDiv.appendChild(CreateScript("https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/markerclusterer.js"));
        MainDiv.appendChild(CreateScript("https://maps.googleapis.com/maps/api/js?key=AIzaSyBhXCfT3P95gZVzbNofMgsvy9vVhmRXcfE&callback=_LB_Map_ObjInfo_1.initMap&libraries=geometry"));
        MainDiv.appendChild(CreateCSS("https://cdnjs.cloudflare.com/ajax/libs/animate.css/3.7.0/animate.min.css"));
        
        //check that viewport is set 
        var x = document.getElementsByTagName("meta");
        let bfound = false; 
        for(let i=0;i<x.length;i++){
            if(x[i].getAttribute("name")!==null){
                if(x[i].getAttribute("name").toLowerCase()==="viewport"){
                    x[i].setAttribute("content","width=device-width, initial-scale=1");
                    bfound= true;
                }
            }
            
        }
        if(bfound===false){
            var node = document.createElement("meta");
            node.setAttribute("content","width=device-width, initial-scale=1");
            node.setAttribute("name","viewport");
            let header = document.head || document.getElementsByTagName("head")[0];
            header.appendChild(node);
        } 
        if(MainDiv.attributes.getNamedItem("data-detail-url")!=null){
            bOverrideDetailURL = true;
            strDetailURL = MainDiv.attributes.getNamedItem("data-detail-url").value;
        }
        
        //alert(document.getElementById(ID).style.height);
        let fullHight = MainDiv.style.height;
        let halfSize = 1;
        if( Layout==="overandunder" || Layout==="overandundergrid"){
            halfSize=2;
            let strStyle = `<style type='text/css'> .LB_BODY-iso .h100 { height: calc(${fullHight} /  ${halfSize}) !important; }
                        .LB_BODY-iso .LB_MAP { height: calc(${fullHight} /  ${halfSize} - 5px) !important; }
                        .LB_BODY-iso .LB_StoreLocator { height: ${fullHight} !important; }
                        .LB_BODY-iso  #LB_SIDEBAR{ padding-top:10px !important} 
                </style>`;
            _LB_Map_ObjInfo_1.SideBarHeight = `(${fullHight} / ${halfSize})`;
            DomObj(strStyle).appendTo("#"+ID);
        }else{
            let strStyle = `<style type='text/css'> .LB_BODY-iso .h100 { height: calc(${fullHight} /  ${halfSize}) !important; }
                        .LB_BODY-iso .LB_MAP { height: calc(${fullHight} /  ${halfSize} - 5px) !important; }
                        .LB_BODY-iso .LB_StoreLocator { height: ${fullHight} !important; }
                        .LB_BODY-iso  #LB_SIDEBAR{ height: calc((${fullHight} / ${halfSize}) - 66px); }
                </style>`;
            _LB_Map_ObjInfo_1.SideBarHeight = `(${fullHight} / ${halfSize})`;
            DomObj(strStyle).appendTo("#"+ID);
        }
        
        //load css 
        createBody(Layout);
        var node = document.createElement("div");
        node.className="LB_Loading"
        node.innerHTML = "Loading";
        MainDiv.appendChild(node);
        
    }
    function createBody(Layout){        
        let mainWindow = "<div id='LB_BODY' class='bootstrap-iso LB_BODY-iso'> " +
                        "<div class='row NoPadMargin'>" + 
                            "<div class='col-12 col-md-4 col-xs-12 col-sm-6 p0'>" +
                                `<form class="form" id="LB_BODY_from_`+ID+`">
                                       
    <div class="col-md-8">
        <a id="LB_BODY_SEARCH_NEARME6ef8638f-af8c-409d-ad24-cf3422269370" href="#" style="text-align: end; text-decoration:underline; display:block; color: #002b60 !important; font-weight:bold; font-size:14px;">
        <span>View Branches near me</span></a>
    </div>
    <div class="form-group " style="display:inline;">
        <div class="input-group pr " >
            <input id="LB_BODY_SEARCH_`+ID+`" type="text" class="form-control" placeholder="Enter City or address">
            <span id="LB_BODY_SEARCH_BUTTON" class="input-group-addon">
                <span class="glyphicon glyphicon-search "></span>
            </span>
     
           <!-- <span class="input-group-addon btn" id="LB_BODY_SEARCH_NEARME`+ID+`">
                <span class="glyphicon glyphicon-map-marker"></span>
                    Near Me
            </span> --!>
            <span class="filter-icon"><i class="fas fa-sliders-h"></i></span>
            
        </div>                                            
    <div class="AdvanceSearchHeader "  >
        <div class="inline" id="ShowAdvanceSearch">
            <div class=" text-info inline" style="display:none;" >
             <!--   Advanced Search
                <span class="glyphicon glyphicon-chevron-down mt0" ></span> --!>
                <i class="fas fa-sliders-h"></i>
            </div>
            
        </div>
        <div class="inline" id="ShowAdvanceSearchClear">
            <div class=" text-info inline ab-filters" >
                Reset Filters  
            </div> 
        </div>
    </div> 
    
    <div class="ShowAdvanceSearchDetails pr">
        <div class="row">
            <div class="col-xs-6">
                <select id="AdvanceSearchCountry" class="form-control"> 
                </select>
            </div>
            <div class="col-xs-6">
                <select id="AdvanceSearchProvence" class="form-control" > 
                </select>                
            </div>
        </div>
        <div class="row">
            <div class="col-xs-6">
                <select id="AdvanceSearchCity" class="form-control" > 
                </select>
            </div>
            <div class="col-xs-6">
                <select id="AdvanceSearchArea" class="form-control" > 
                </select>
            </div>
        </div>
    </div> 
    <div id="ShowAdvanceSearchAttributes" class="ShowAdvanceSearchDetails form-inline pr">

    </div>
    
   <!-- <div id="ShowAdvanceSearch" style="display:block; color: #002b60 !important;">
    <i class="fas fa-sliders-h"></i> </div> --!>
   
   
    </div>
    
    
</form>


`+                          
                                "<div id='LB_SIDEBAR' class='p0'><!--sidbar--></div>" +
                            "</div>" +
                            "<div class='col-12 col-md-8 col-xs-12 col-sm-6 p0 h100'>" +
                                "<div id='LB_MAPBOX' class='p0 h100'><!--Map--><div id='"+"LB_MAP_"+ID +"' class='LB_MAP p0'></div></div>" + 
                            "</div>" + 
                        "</div></div>";
        _LB_Map_ObjInfo_1.ShowMap = true;
        _LB_Map_ObjInfo_1.ShowList = true;
        _LB_Map_ObjInfo_1.ShowGrid = false;
        
        if (Layout==="overandunder" || Layout==="overandundergrid"){ 
            mainWindow = "<div id='LB_BODY' class='bootstrap-iso LB_BODY-iso'> " +
                            "<div class='row NoPadMargin'>" +                                 
                                "<div class='col-12 col-md-12 col-xs-12 col-sm-12 p0 '>" +
                                    `<form class="form" id="LB_BODY_from_`+ID+`">
    <div class="form-group row" style="display:inline;width:100%">
        <div class="input-group pr col-md-8" style="width:80%;">
            <input id="LB_BODY_SEARCH_`+ID+`" type="text" class="form-control" placeholder="Location Search">
            <span id="LB_BODY_SEARCH_BUTTON" class="input-group-addon">
                <span class="glyphicon glyphicon-search "></span>
            </span>
            <span class="input-group-addon btn" id="LB_BODY_SEARCH_NEARME`+ID+`">
                <span class="glyphicon glyphicon-map-marker"></span>
                    Near Me
            </span>
        </div>                                            
    </div>
    <div class="AdvanceSearchHeader col-md-4" style="width:20%;">
        <div class="inline" id="ShowAdvanceSearch">
            <div class=" text-info inline" >
                Advanced Search
                <span class="glyphicon glyphicon-chevron-down mt0" ></span> 
            </div>
            
        </div>
        <div class="inline" id="ShowAdvanceSearchClear">
            <div class=" text-info inline" >
                Reset Filters  
            </div> 
        </div>
    </div>
    <div class="ShowAdvanceSearchDetails pr">
        <div class="row">
            <div class="col-xs-6">
                <select id="AdvanceSearchCountry" class="form-control"> 
                </select>
            </div>
            <div class="col-xs-6">
                <select id="AdvanceSearchProvence" class="form-control" > 
                </select>                
            </div>
        </div>
        <div class="row">
            <div class="col-xs-6">
                <select id="AdvanceSearchCity" class="form-control" > 
                </select>
            </div>
            <div class="col-xs-6">
                <select id="AdvanceSearchArea" class="form-control" > 
                </select>
            </div>
        </div>
    </div>
    <div id="ShowAdvanceSearchAttributes" class="ShowAdvanceSearchDetails form-inline pr">

    </div>
</form>


`+
                                    "<div id='LB_MAPBOX' class='p0 '><!--Map--><div id='"+"LB_MAP_"+ID +"' class='LB_MAP p0'></div></div>" + 
                                "</div>" + 
                            "</div>"+
                            "<div class='row'>" +  
                                "<div class='col-12 col-md-12 col-xs-12 col-sm-12 '>" + 
                                    "<div id='LB_SIDEBAR' class='p0 '><!--sidbar--></div>" +
                                "</div>" +
                            "</div></div>";
            if(Layout=="overandundergrid"){
                _LB_Map_ObjInfo_1.ShowMap = true;
                _LB_Map_ObjInfo_1.ShowList = false;
                _LB_Map_ObjInfo_1.ShowGrid = true;
            }
        }
        if (Layout==="maponly"){ 
            mainWindow = "<div id='LB_BODY' class='bootstrap-iso LB_BODY-iso'> " +
                            "<div class='row NoPadMargin'>" +                                 
                                "<div class='col-12 col-md-12 p0 h100'>" +
                                    `<form class="form" id="LB_BODY_from_`+ID+`">
    <div class="form-group row" style="display:inline;width:100%">
        <div class="input-group pr col-md-8" style="width:80%;">
            <input id="LB_BODY_SEARCH_`+ID+`" type="text" class="form-control" placeholder="Location Search">
            <span id="LB_BODY_SEARCH_BUTTON" class="input-group-addon">
                <span class="glyphicon glyphicon-search "></span>
            </span>
            <span class="input-group-addon btn" id="LB_BODY_SEARCH_NEARME`+ID+`">
                <span class="glyphicon glyphicon-map-marker"></span>
                    Near Me
            </span>
        </div>                                            
    </div>
    <div class="AdvanceSearchHeader col-md-4" style="width:20%;">
        <div class="inline" id="ShowAdvanceSearch">
            <div class=" text-info inline" >
                Advanced Search
                <span class="glyphicon glyphicon-chevron-down mt0" ></span> 
            </div>
            
        </div>
        <div class="inline" id="ShowAdvanceSearchClear">
            <div class=" text-info inline" >
                Reset Filters  
            </div> 
        </div>
    </div>
    <div class="ShowAdvanceSearchDetails pr">
        <div class="row">
            <div class="col-xs-6">
                <select id="AdvanceSearchCountry" class="form-control"> 
                </select>
            </div>
            <div class="col-xs-6">
                <select id="AdvanceSearchProvence" class="form-control" > 
                </select>                
            </div>
        </div>
        <div class="row">
            <div class="col-xs-6">
                <select id="AdvanceSearchCity" class="form-control" > 
                </select>
            </div>
            <div class="col-xs-6">
                <select id="AdvanceSearchArea" class="form-control" > 
                </select>
            </div>
        </div>
    </div>
    <div id="ShowAdvanceSearchAttributes" class="ShowAdvanceSearchDetails form-inline pr">

    </div>
</form>


`+
                                    "<div id='LB_MAPBOX' class='p0 h100'><!--Map--><div id='"+"LB_MAP_"+ID +"' class='LB_MAP p0'></div></div>" + 
                                "</div>" +
                                "<div id='LB_SIDEBAR' class='p0' style='display:none'><!--sidbar--></div>"
                            "</div></div>";
            _LB_Map_ObjInfo_1.ShowMap = true;
            _LB_Map_ObjInfo_1.ShowList = false;
            _LB_Map_ObjInfo_1.ShowGrid = false;
        }
        if (Layout==="listonly"){
            mainWindow = "<div id='LB_BODY' class='bootstrap-iso LB_BODY-iso'> " +
                            "<div class='row NoPadMargin'>" + 
                                "<div class='col-12 col-md-12 p0'>" +
                                    `<form class="form" id="LB_BODY_from_`+ID+`">
    <div class="form-group row" style="display:inline;width:100%">
        <div class="input-group pr col-md-8" style="width:80%;">
            <input id="LB_BODY_SEARCH_`+ID+`" type="text" class="form-control" placeholder="Location Search">
            <span id="LB_BODY_SEARCH_BUTTON" class="input-group-addon">
                <span class="glyphicon glyphicon-search "></span>
            </span>
            <span class="input-group-addon btn" id="LB_BODY_SEARCH_NEARME`+ID+`">
                <span class="glyphicon glyphicon-map-marker"></span>
                    Near Me
            </span>
        </div>                                            
    </div>
    <div class="AdvanceSearchHeader col-md-4" style="width:20%;" >
        <div class="inline" id="ShowAdvanceSearch">
            <div class=" text-info inline" >
                Advanced Search
                <span class="glyphicon glyphicon-chevron-down mt0" ></span> 
            </div>
            
        </div>
        <div class="inline" id="ShowAdvanceSearchClear">
            <div class=" text-info inline" >
                Reset Filters  
            </div> 
        </div>
    </div>
    <div class="ShowAdvanceSearchDetails pr">
        <div class="row">
            <div class="col-xs-6">
                <select id="AdvanceSearchCountry" class="form-control"> 
                </select>
            </div>
            <div class="col-xs-6">
                <select id="AdvanceSearchProvence" class="form-control" > 
                </select>                
            </div>
        </div>
        <div class="row">
            <div class="col-xs-6">
                <select id="AdvanceSearchCity" class="form-control" > 
                </select>
            </div>
            <div class="col-xs-6">
                <select id="AdvanceSearchArea" class="form-control" > 
                </select>
            </div>
        </div>
    </div>
    <div id="ShowAdvanceSearchAttributes" class="ShowAdvanceSearchDetails form-inline pr">

    </div>
</form>


`+
                                    "<div id='LB_SIDEBAR' class='p0'><!--sidbar--></div>" +
                                "</div>"  +
                            "</div></div>";
            _LB_Map_ObjInfo_1.ShowMap = false;
            _LB_Map_ObjInfo_1.ShowList = true;
            _LB_Map_ObjInfo_1.ShowGrid = false;
        }
        if (Layout==="gridonly"){
            mainWindow = "<div id='LB_BODY' class='bootstrap-iso LB_BODY-iso'> " +
                            "<div class='row NoPadMargin'>" + 
                                "<div class='col-12 col-md-12 p0'>" +
                                    `<form class="form" id="LB_BODY_from_`+ID+`">
    <div class="form-group row" style="display:inline;width:100%>
        <div class="input-group pr col-md-8" style="width:80%;">
            <input id="LB_BODY_SEARCH_`+ID+`" type="text" class="form-control" placeholder="Location Search">
            <span id="LB_BODY_SEARCH_BUTTON" class="input-group-addon">
                <span class="glyphicon glyphicon-search "></span>
            </span>
            <span class="input-group-addon btn" id="LB_BODY_SEARCH_NEARME`+ID+`">
                <span class="glyphicon glyphicon-map-marker"></span>
                    Near Me
            </span>
        </div>                                            
    </div>
    <div class="AdvanceSearchHeader col-md-4" style="width:20%;">
        <div class="inline" id="ShowAdvanceSearch">
            <div class=" text-info inline" >
                Advanced Search
                <span class="glyphicon glyphicon-chevron-down mt0" ></span> 
            </div>
            
        </div>
        <div class="inline" id="ShowAdvanceSearchClear">
            <div class=" text-info inline" >
                Reset Filters  
            </div> 
        </div>
    </div>
    <div class="ShowAdvanceSearchDetails pr">
        <div class="row">
            <div class="col-xs-6">
                <select id="AdvanceSearchCountry" class="form-control"> 
                </select>
            </div>
            <div class="col-xs-6">
                <select id="AdvanceSearchProvence" class="form-control" > 
                </select>                
            </div>
        </div>
        <div class="row">
            <div class="col-xs-6">
                <select id="AdvanceSearchCity" class="form-control" > 
                </select>
            </div>
            <div class="col-xs-6">
                <select id="AdvanceSearchArea" class="form-control" > 
                </select>
            </div>
        </div>
    </div>
    <div id="ShowAdvanceSearchAttributes" class="ShowAdvanceSearchDetails form-inline pr">

    </div>
</form>


`+
                                    "<div id='LB_SIDEBAR' class='p0' style='overflow-x: hidden;'><!--sidbar--></div>" +
                                "</div>"  +
                            "</div></div>";
            _LB_Map_ObjInfo_1.ShowMap = false;
            _LB_Map_ObjInfo_1.ShowList = false;
            _LB_Map_ObjInfo_1.ShowGrid = true;
        }
        DomObj( "#"+ID ).append( mainWindow );
        
    }
    _LB_Map_ObjInfo_1.createEvents = function(){
        DomObj(DomObj( "#LB_BODY_SEARCH_BUTTON")[0]).click(function() {_LB_Map_ObjInfo_1.searchLocation("generalSearch");});        
        DomObj(DomObj( "#LB_BODY_SEARCH_"+ID)[0]).keydown(function (e) { if (e.keyCode == 13) {  e.preventDefault();_LB_Map_ObjInfo_1.searchLocation("generalSearch"); return false; }});
        DomObj(DomObj( "#LB_BODY_SEARCH_NEARME"+ID)[0]).click(function() {_LB_Map_ObjInfo_1.errorGeolocationCount=0;_LB_Map_ObjInfo_1.nearMe();});
    }
    _LB_Map_ObjInfo_1.SetGUITextLocalize = function(){
        let textLoc = localizeText["default"];
        if(localizeText[AddressLayout]){
            textLoc = localizeText[AddressLayout];
        }
        _LB_Map_ObjInfo_1.CountryText = textLoc["Country"];
        _LB_Map_ObjInfo_1.ProvinceText = textLoc["Province"];
        _LB_Map_ObjInfo_1.CityText = textLoc["City"];
        _LB_Map_ObjInfo_1.AreaText = textLoc["Area"];
        _LB_Map_ObjInfo_1.AddressLineLocality = textLoc["AddressLineLocality"];
         
    }
    //Load Default before the client loads
    _LB_Map_ObjInfo_1.SetGUITextLocalize();
    _LB_Map_ObjInfo_1.setLocalize = function(){
        if(_LB_Map_ObjInfo_1.StoreLocationInfo.local_units){
            if(_LB_Map_ObjInfo_1.StoreLocationInfo.local_units!=null && _LB_Map_ObjInfo_1.StoreLocationInfo.local_units!==""){
                Unit = _LB_Map_ObjInfo_1.StoreLocationInfo.local_units
            }
        }
        if(_LB_Map_ObjInfo_1.StoreLocationInfo.local_addressLayout){
            if(_LB_Map_ObjInfo_1.StoreLocationInfo.local_addressLayout!=null && _LB_Map_ObjInfo_1.StoreLocationInfo.local_addressLayout!==""){
                AddressLayout = _LB_Map_ObjInfo_1.StoreLocationInfo.local_addressLayout
            }
        }
        if(_LB_Map_ObjInfo_1.StoreLocationInfo.local_timeFormat){
            if(_LB_Map_ObjInfo_1.StoreLocationInfo.local_timeFormat!=null && _LB_Map_ObjInfo_1.StoreLocationInfo.local_timeFormat!==""){
                TimeFormat = _LB_Map_ObjInfo_1.StoreLocationInfo.local_timeFormat
            }
        }
        _LB_Map_ObjInfo_1.SetGUITextLocalize();
    }
_LB_Map_ObjInfo_1.showGoogleMapLoad = function(StoreLocationInfo,map){
    postalCodeOnlyWithoutSpace = Object.assign({}, ...StoreLocationInfo.locations.map((x) => ({[x.postalCode.replace(/\s+/g, '').toUpperCase()]: x.postalCode.replace(/\s+/g, '').toUpperCase()})));
    postalCodeOnly = Object.assign({}, ...StoreLocationInfo.locations.map((x) => ({[x.postalCode.toUpperCase()]: x.postalCode.toUpperCase()})));
    
        if(Debug==='False'){
            _LB_Map_ObjInfo_1.analytic('view',"","");
        }
        //Advance Search function
        DomObj("#ShowAdvanceSearch","#LB_BODY_from_"+ID).click(function(){
            
                    DomObj(this).parent().siblings(".ShowAdvanceSearchDetails").toggle(); 
                    
                    DomObj(this).children("glyphicon").toggleClass("glyphicon-chevron-down").toggleClass("glyphicon glyphicon-chevron-up");
                    DomObj("#ShowAdvanceSearch","#LB_BODY_from_"+ID).parent().children("#ShowAdvanceSearchClear").toggle();
                    let searchHeight= DomObj(this).parent().parent().height();
                    //console.log("#ShowAdvanceSearch",searchHeight,"SideBar Hight ",_LB_Map_ObjInfo_1.SideBarHeight);
                    DomObj(this).parent().parent().siblings("#LB_SIDEBAR").css("height","calc("+_LB_Map_ObjInfo_1.SideBarHeight+ " - " + (searchHeight+10)+ "px)");
                    });
        DomObj("#ShowAdvanceSearch","#LB_BODY_from_"+ID).parent().siblings(".ShowAdvanceSearchDetails").hide();
        DomObj("#ShowAdvanceSearchClear","#LB_BODY_from_"+ID).hide();
        DomObj("#ShowAdvanceSearchClear","#LB_BODY_from_"+ID).click(function(){ 
                DomObj("#AdvanceSearchCountry","#LB_BODY_from_"+ID)[0].selectedIndex = 0
                DomObj("#AdvanceSearchProvence","#LB_BODY_from_"+ID)[0].selectedIndex = 0
                DomObj("#AdvanceSearchCity","#LB_BODY_from_"+ID)[0].selectedIndex = 0
                DomObj("#AdvanceSearchArea","#LB_BODY_from_"+ID)[0].selectedIndex = 0
                DomObj("#LB_BODY_SEARCH_"+ID).val("");
                _LB_Map_ObjInfo_1.searchLocation("generalSearch");
            });
        _LB_Map_ObjInfo_1.StoreLocationInfo = StoreLocationInfo;
        _LB_Map_ObjInfo_1.setLocalize();
        DomObj("#"+ID).find(".LB_Loading").css("display","none");
        if(StoreLocationInfo.useCustomCSS){
            DomObj("#LB_BODY_from_"+ID).append(CreateCSS(`${loadFile}StoreLocatorAPI/css?clientid=${ID}`));
        }
        var image = null;
        var shape ={
                    coords: [1, 1, 1, 48, 
                            48, 48, 
                            48, 1],
                    type: 'poly'
                    };
        
        if(StoreLocationInfo.showClientLocationPin){
            image = {
                url: StoreLocationInfo.clientLocationPin.url,
                // This marker is 20 pixels wide by 32 pixels high.
                size: new google.maps.Size(StoreLocationInfo.clientLocationPin.width, StoreLocationInfo.clientLocationPin.hight),
                // The origin for this image is (0, 0).
                origin: new google.maps.Point(StoreLocationInfo.clientLocationPin.originX, StoreLocationInfo.clientLocationPin.originY),
                // The anchor for this image is the base of the flagpole at (0, 32).
                anchor: new google.maps.Point(StoreLocationInfo.clientLocationPin.anchorX, StoreLocationInfo.clientLocationPin.anchorY)
            };
            shape = {
                    coords: [1, 1, 1, StoreLocationInfo.clientLocationPin.width, 
                            StoreLocationInfo.clientLocationPin.hight, StoreLocationInfo.clientLocationPin.width, 
                            StoreLocationInfo.clientLocationPin.hight, 1],
                    type: 'poly'
                    };
        }

         
        var bounds = new google.maps.LatLngBounds();
        _LB_Map_ObjInfo_1.markers = [];
        DomObj( "#LB_SIDEBAR" ).empty();
        let cssOther = ""
        if(_LB_Map_ObjInfo_1.ShowGrid ){ 
            cssOther=" flx-grid ";
        }
        let tableDiv  = DomObj("<div class='row mainrow "+cssOther+"'></div>");
        
        _LB_Map_ObjInfo_1.mataCatergory = [];
        let AdvanceSearch = {Country:{},Provence:{},City:{},Area:{},Attributes:{}};
        //console.log("Start creating dom");
        

        for (var i = 0; i < StoreLocationInfo.locations.length; i++) {
            var beach = StoreLocationInfo.locations[i];
            AdvanceSearch.Country[beach.countryName.toLowerCase().trim()]=beach.countryName;
            AdvanceSearch.Provence[beach.administrativeArea.toLowerCase().trim()]=beach.administrativeArea;
            AdvanceSearch.City[beach.locality.toLowerCase().trim()]=beach.locality;
            AdvanceSearch.Area[beach.subLocality.toLowerCase().trim()]=beach.subLocality;
            beach.attributes.forEach(x=>{
                AdvanceSearch.Attributes[x.attributeId.toLowerCase().trim()]=x.attributeId;
            })

            if(_LB_Map_ObjInfo_1.ShowMap){
                var marker = new google.maps.Marker({
                    position: new google.maps.LatLng(parseFloat(beach.latitude).toFixed(6), parseFloat(beach.longitude).toFixed(6)), //{lat: parseFloat(beach.latitude).toFixed(6), lng: parseFloat(beach.longitude).toFixed(6)},
                    map: map,
                    icon: image,
                    shape: shape,
                    title: beach.locationName,
                    zIndex: i,
                    _LocID:beach.id 
                });
                _LB_Map_ObjInfo_1.infowindow = null;

                let manageOpenInfoWindow = function (fuc_this){
                    if(_LB_Map_ObjInfo_1.infowindow!==null){
                        _LB_Map_ObjInfo_1.infowindow.close();
                        _LB_Map_ObjInfo_1.infowindow = null;
                    }
                    let contentString = "<div class='LB_BODY-iso SL_MapInfoWindow'>" + DomObj("#Card"+fuc_this._LocID,"#"+ID).html() + "</div>";
                    _LB_Map_ObjInfo_1.infowindow = new google.maps.InfoWindow({
                        content: contentString,
                        maxWidth: 400 
                    });
                    //_LB_Map_ObjInfo_1.infowindow.content = DomObj("#Card"+this._LocID,"#"+ID).html();
                    _LB_Map_ObjInfo_1.infowindow.open(_LB_Map_ObjInfo_1.map, fuc_this);
                    window.setTimeout(function(){
                        //console.log("Find in infoWindow",DomObj(".SL_MapInfoWindow #openHoursList"));
                        DomObj(".SL_MapInfoWindow #openHoursList").click(function(){ DomObj(this).find('.row').toggleClass('hidden');DomObj(this).find('.row.text-success').removeClass('hidden');});
                    },300);
                }
                let manageOpenInfoWindowSmall = function (fuc_this){
                    if(_LB_Map_ObjInfo_1.infowindow!==null){
                        _LB_Map_ObjInfo_1.infowindow.close();
                        _LB_Map_ObjInfo_1.infowindow = null;
                    }
                    let contentString = "<div class='LB_BODY-iso SL_MapInfoWindow bootstrap-iso'>" + _LB_Map_ObjInfo_1.loadSmallInfoWindowHtml(fuc_this._LocID,ID, beach.clientID)  + "</div>";
                    _LB_Map_ObjInfo_1.infowindow = new google.maps.InfoWindow({
                        content: contentString,
                        maxWidth: 600 
                    });
                    //_LB_Map_ObjInfo_1.infowindow.content = DomObj("#Card"+this._LocID,"#"+ID).html();
                    _LB_Map_ObjInfo_1.infowindow.open(_LB_Map_ObjInfo_1.map, fuc_this);
                    window.setTimeout(function(){
                        _LB_Map_ObjInfo_1.filterDomObj(fuc_this._LocID,[],"generalSearch",[]);
                    },300); 
                }

                marker.addListener('click', function() {
                    //infowindow.open(map, marker);
                    if(_LB_Map_ObjInfo_1.ShowMap===true && _LB_Map_ObjInfo_1.ShowList==false && _LB_Map_ObjInfo_1.ShowGrid==false){
                        manageOpenInfoWindow(this);
                    }else{
                        if(_LB_Map_ObjInfo_1.ShowMap===true){
                            manageOpenInfoWindowSmall(this);
                        }
                    }
                });
                marker.addListener('mouseover', function() {
                    if(_LB_Map_ObjInfo_1.ShowMap===true && _LB_Map_ObjInfo_1.ShowList==false && _LB_Map_ObjInfo_1.ShowGrid==false){
                        manageOpenInfoWindow(this);
                    }
                });
                marker.addListener('mouseout', function() {
                    
                });
                var bound_poly = new google.maps.LatLngBounds();
                if(beach.serviceAreaPlacesPoly){
                    if(beach.serviceAreaPlacesPoly.length>0){
                        beach.serviceAreaPlacesPoly.forEach(x=>{
                            let polyPath = [];
                            let p = x.split(' ');
                            p.forEach(z=>{
                                let c = z.split(',');
                                let b = new google.maps.LatLng(parseFloat(c[1]).toFixed(6), parseFloat(c[0]).toFixed(6));
                                polyPath.push(b);
                                bound_poly.extend(b);
                            });
                            var poly = new google.maps.Polygon({
                                paths:polyPath,
                                strokeColor:StoreLocationInfo.serviceBaseStrokeColour,
                                strokeOpacity:StoreLocationInfo.serviceBaseStrokeOpacity,
                                strokeWeight:3,
                                fillColor:StoreLocationInfo.serviceBaseFillColour,
                                fillOpacity:StoreLocationInfo.serviceBaseFillOpacity,
                            });
                            poly.setMap(map);
                        });
                    }
                }
                if(parseFloat(beach.latitude).toFixed(6)!=0){
                    _LB_Map_ObjInfo_1.markers.push(marker)
                }else{
                    var marker = new google.maps.Marker({
                        position: new google.maps.LatLng(bound_poly.getCenter().lat(), bound_poly.getCenter().lng()),
                        map: map,
                        icon: image,
                        shape: shape,
                        title: beach.locationName,
                        zIndex: 0,
                        _LocID:beach.id 
                    });
                    _LB_Map_ObjInfo_1.markers.push(marker)
                }
                //extend the bounds to include each marker's position
                bounds.extend(marker.position);                
            }
            let sideObj = DomObj(_LB_Map_ObjInfo_1.createSideHTML(StoreLocationInfo,i));
            sideObj.attr("data-latitude",parseFloat(beach.latitude).toFixed(6));
            sideObj.attr("data-longitude",parseFloat(beach.longitude).toFixed(6));
            sideObj.attr("data-locationName",beach.locationName);
            sideObj.attr("data-id",beach.id);
            sideObj.attr("data-address",beach.addressLine1);
            sideObj.attr("data-address2",beach.addressLine2); 
            sideObj.attr("data-country",beach.country);
            sideObj.attr("data-countryName",beach.countryName);
            sideObj.attr("data-administrativeArea",beach.administrativeArea);
            sideObj.attr("data-locality",beach.locality);
            sideObj.attr("data-subLocality",beach.subLocality); 
            sideObj.attr("data-postalCode",beach.postalCode); 
            sideObj.attr("data-phone",beach.primaryPhone); 
            sideObj.attr("data-ShortURL",beach.storeLocatorDetailsShortURL); 
            sideObj.click(function(event){event.stopPropagation();_LB_Map_ObjInfo_1.locationClick(this);});
             
            tableDiv.append(sideObj);
            //create JSON-LD
            _LB_Map_ObjInfo_1.createJsonLD(beach);
            
        }
        _LB_Map_ObjInfo_1.saveJsonLD();
        //if(_LB_Map_ObjInfo_1.ShowList){
            DomObj( "#LB_SIDEBAR" ).append(tableDiv);
        //}
        //Add Advance search to dropDowns
        _LB_Map_ObjInfo_1.setAdvanceSearch(AdvanceSearch);
        _LB_Map_ObjInfo_1._AdvanceSearch = AdvanceSearch;
        //console.log("Done creating dom");
        _LB_Map_ObjInfo_1.DefaultBounds = bounds;
        //console.log("Find by me");
        _LB_Map_ObjInfo_1.nearMe_lat=0;
        _LB_Map_ObjInfo_1.nearMe_long=0;
        _LB_Map_ObjInfo_1.nearMe();
        //console.log("Done Find by me");
        if(_LB_Map_ObjInfo_1.ShowMap){
            //map.fitBounds(bounds);
            //map.fitBounds(_LB_Map_ObjInfo_1.DefaultBounds);
            if(StoreLocationInfo.showCluster){
                if(typeof MarkerClusterer !== typeof undefined ){
                    if(MarkerClusterer!==undefined){
                        if(MarkerClusterer){
                            var markerCluster = new MarkerClusterer(map, _LB_Map_ObjInfo_1.markers,
                                {imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'});

                        }
                    }
                }
            }  
            if(StoreLocationInfo.googleMapJson){
                if(StoreLocationInfo.googleMapJson!=null){
                    var styledMapType = new google.maps.StyledMapType( DomObj.parseJSON(StoreLocationInfo.googleMapJson));

                    //Associate the styled map with the MapTypeId and set it to display.
                    map.mapTypes.set('styled_map', styledMapType);
                    map.setMapTypeId('styled_map');

                }
            }
        }
        _LB_Map_ObjInfo_1.createEvents();
        //add Cat to matadata.
        if(_LB_Map_ObjInfo_1.mataCatergory.length>0){
            let mata = DomObj(`<mata ></mata>`);
            mata.attr("name","keywords");
            mata.attr("content",_LB_Map_ObjInfo_1.mataCatergory.join(","));
            DomObj("head").append(mata);
        }
        
        
    }
    _LB_Map_ObjInfo_1.setAdvanceSearch = function(AdvanceSearch){
        
        _LB_Map_ObjInfo_1.AdvanceSearchAddDropDown(AdvanceSearch.Country,"#LB_BODY_from_"+ID+" #AdvanceSearchCountry",_LB_Map_ObjInfo_1.CountryText);
        _LB_Map_ObjInfo_1.AdvanceSearchAddDropDown(AdvanceSearch.Provence,"#LB_BODY_from_"+ID+" #AdvanceSearchProvence",_LB_Map_ObjInfo_1.ProvinceText);
        _LB_Map_ObjInfo_1.AdvanceSearchAddDropDown(AdvanceSearch.City,"#LB_BODY_from_"+ID+" #AdvanceSearchCity",_LB_Map_ObjInfo_1.CityText);
        _LB_Map_ObjInfo_1.AdvanceSearchAddDropDown(AdvanceSearch.Area,"#LB_BODY_from_"+ID+" #AdvanceSearchArea",_LB_Map_ObjInfo_1.AreaText);
        _LB_Map_ObjInfo_1.AdvanceSearchAttributes(AdvanceSearch.Attributes,"#LB_BODY_from_"+ID+" #ShowAdvanceSearchAttributes")
        var changeAdvanceSearch = function () {
                var str = "";
                DomObj(this).children("option:selected" ).each(function() {
                str += DomObj( this ).val() + " ";
                });
                if(str!==""){
                    DomObj("#LB_BODY_SEARCH_"+ID).val(str.trim());
                    _LB_Map_ObjInfo_1.searchLocation("generalSearch");
                }
        }
        var changeAdvanceSearchAttributes = function () {
             
            if(DomObj(this).is(':checked')===true){
                //DomObj("#LB_BODY_SEARCH_"+ID).val(DomObj("#LB_BODY_SEARCH_"+ID).val() +" " + DomObj(this).attr('value'))
            }else{
                let val = DomObj("#LB_BODY_SEARCH_"+ID).val();
                val = val.replace(DomObj(this).attr('value'),"").trim();
                DomObj("#LB_BODY_SEARCH_"+ID).val(val);
            }
            _LB_Map_ObjInfo_1.searchLocation("generalSearch");
        }
        DomObj("#LB_BODY_from_"+ID+" #AdvanceSearchCountry").change(changeAdvanceSearch); 
        DomObj("#LB_BODY_from_"+ID+" #AdvanceSearchProvence").change(changeAdvanceSearch); 
        DomObj("#LB_BODY_from_"+ID+" #AdvanceSearchCity").change(changeAdvanceSearch); 
        DomObj("#LB_BODY_from_"+ID+" #AdvanceSearchArea").change(changeAdvanceSearch); 
        DomObj("#LB_BODY_from_"+ID+" #ShowAdvanceSearchAttributes :checkbox").click(changeAdvanceSearchAttributes); 

    }
    _LB_Map_ObjInfo_1.AdvanceSearchAttributes = function(objIn,ObjectID){
        var keys = [];
        for(var key in objIn){
            keys.push(objIn[key]);
        }
        keys.sort();
        keys.forEach(x=>{
            DomObj(ObjectID).append(`<div class="checkbox input-sm">
                                        <label><input type="checkbox" value="${x}"> ${x}</label>
                                    </div>`);
        }); 
    }
    _LB_Map_ObjInfo_1.AdvanceSearchAddDropDown = function(objIn,ObjectID,DefaultItemText){
        var keys = [];
        for(var key in objIn){
            keys.push(objIn[key]);
        }
        keys.sort();
        if(keys.length==0){
            return;
        }
        let ddBox = DomObj(ObjectID);
        ddBox.find('option').each(function() {
            //alert(DomObj(this).val());
            if(DomObj(this).val()!==""){
                if(keys.findIndex(x=>{
                    return x ===DomObj(this).val();
                })==-1){
                    DomObj(this).remove();
                }
            }
        });
        
        if(DomObj("option[value='']",ddBox).length=== 0){
            ddBox.append(new Option(DefaultItemText||"Select", "")); 
        }
        keys.forEach(x=>{
            if(DomObj(`option[value="${x}"]`,ddBox).length=== 0){
                ddBox.append(new Option(x, x));
            }
        });  
    }
    _LB_Map_ObjInfo_1.formate12Time = function(inputTime){   
    let hr = Number(inputTime?.split(':')[0])
        let min = inputTime?.split(':')[1]
        if(hr==12){
            return `${hr}:${min} AM`;
        }
        if(hr==0){
            hr=12
            return `${hr}:${min} PM`;
        }
        if(hr>12){
            hr = hr-12
            return `${hr}:${min} PM`;
        }
        return `${hr}:${min} AM`;
    }
    _LB_Map_ObjInfo_1.loadSmallInfoWindowHtml = function(LocID,ID, clientID){
        const locationDb = DomObj("#Head"+LocID,"#"+ID);
        const locationName = locationDb.attr("data-locationName");
        const address = locationDb.attr("data-address");
        const address2 = locationDb.attr("data-address2");
        const locality = locationDb.attr("data-locality");
        const subLocality = locationDb.attr("data-subLocality");
        const phone = locationDb.attr("data-phone");
        const postalCode = locationDb.attr("data-postalCode");
        const administrativeArea = locationDb.attr("data-administrativeArea");
        const storeLocatorDetailsShortURL = locationDb.attr("data-ShortURL");
        let locationNameUrl = "loc="+encodeURI(locationName);
        let detailsPageView = _LB_Map_ObjInfo_1.getDetailURL(LocID,locationNameUrl,storeLocatorDetailsShortURL,clientID);
        let returnItem =DomObj(`<div id='Card${LocID}_popup' class="row mainrow revireBody"  style="margin: 20px;"></div>`);
        let firstRow = DomObj(`<div class="row" id="popup_locationName_row"></div>`);
        
        let celLocationName = DomObj(`<div class="col-12" role="button"><div id='popup_locationName' class="locationHeading">${locationName}</div></div>`)
        //let popup-link = DomObj(`<a store-id="${detailsPageView}"> ${locationName}</a>`);
        if(!_LB_Map_ObjInfo_1.StoreLocationInfo.doNotShowDetailsPage){
             let newlocationNameUrl = "/en/home/branch-details?locationid=" + LocID;
            celLocationName = DomObj(`<div class="col-12 " role="button"><div id='popup_locationName' class="locationHeading"><a href="${newlocationNameUrl}" store-id="${detailsPageView}"> ${locationName}</a></div></div>`)
            celLocationName.click(function(event)
            {
                event.stopPropagation();
               //window.open(detailsPageView,"_self");
             
                
            });
        }
        
        
        firstRow.append(celLocationName);
        returnItem.append(firstRow);
        let secondRow = DomObj(`<div class="row" id="popup_address_row"></div>`);
        let addressDom = DomObj(`<div id='popup_address' class="h6"></div>`);
        if(address!==""){
            addressDom.append(address + "<br>");
        }
        if(address2!==""){
            addressDom.append(address2 + "<br>");
        }
        if(subLocality!==""){
            addressDom.append(subLocality + "<br>");
        }
        if(locality!==""){
            if(_LB_Map_ObjInfo_1.AddressLineLocality=="Locality,AdministrativeArea"){
                if(administrativeArea!=""){
                    addressDom.append(locality + ", " +administrativeArea + " " + postalCode + "<br>");
                }else{
                    addressDom.append(locality + "<br>");
                }
            }else{
                addressDom.append(locality + "<br>");
            } 
        }
        if(postalCode!=="" && _LB_Map_ObjInfo_1.AddressLineLocality!=="Locality,AdministrativeArea"){
            addressDom.append(postalCode + "<br>");
        }
        let cellHeader = DomObj(`<div class="col-12"></div>`);
        if(!_LB_Map_ObjInfo_1.StoreLocationInfo.doNotShowDetailsPage){
             let newlocationNameUrladdr = "/en/home/branch-details?locationid=" + LocID;
            let aLink = DomObj(`<a href="${newlocationNameUrladdr}"></a>`);
            aLink.append(addressDom);
           cellHeader.append(aLink);
        }else{
            cellHeader.append(addressDom);
        }  
        secondRow.append(cellHeader);
        returnItem.append(secondRow);
        returnItem.append(`<div class="row" id="popup_phone_row"> 
                            <div class="col-xs-1 pr0 col-md-1 col-lg-1">
                                <span class="glyphicon glyphicon-earphone mt" id="popup_phone_icon"></span>
                            </div>
                            <div class="col-xs-10 pr0 col-md-10 col-lg-10 analytic-phone" id="popup_phone_analytic">
                                <div class="h6"><a href="tel:${phone}">${phone}</a></div>
                            </div>
                        </div>`);
        returnItem.find(".analytic-phone").click(function() {_LB_Map_ObjInfo_1.analytic('phonecall',LocID,phone)});
        let r =DomObj(`<div  class="bootstrap-iso LB_BODY-iso "></div>`);
        r.append(returnItem);
        return r.html();
    }
    _LB_Map_ObjInfo_1.getDetailURL = function(loc_id,locationNameUrl,storeLocatorDetailsShortURL,loc_clientId){
        let backURL = encodeURI(window.location.href);
        let detailsPageView = `/public/TestLocationDetails?${locationNameUrl}&id=${loc_id}&layout=${DetailsLayout}&clientid=${loc_clientId}`;
        let detailsPageReplaceDetails=locationNameUrl+"&locationid="+encodeURI(loc_id);
        let backURLEncode = "&SLMPage=" + backURL;
        if(Debug==='False'){
            if(Platform=="web"){
                if(_LB_Map_ObjInfo_1.StoreLocationInfo.detailViewUrl){
                    if(_LB_Map_ObjInfo_1.StoreLocationInfo.detailViewUrl!==null){
                        detailsPageView = _LB_Map_ObjInfo_1.StoreLocationInfo.detailViewUrl.replace("locationid={locationid}",detailsPageReplaceDetails)+ backURLEncode;
                    }
                }
            }else{
                if(_LB_Map_ObjInfo_1.StoreLocationInfo.detailView_app_Url){
                    if(_LB_Map_ObjInfo_1.StoreLocationInfo.detailView_app_Url!==null){
                        detailsPageView = _LB_Map_ObjInfo_1.StoreLocationInfo.detailView_app_Url.replace("locationid={locationid}",detailsPageReplaceDetails)+ backURLEncode;
                    }
                }
            }
            if(bOverrideDetailURL==true){                
                detailsPageView = strDetailURL.replace("locationid={locationid}",detailsPageReplaceDetails)+ backURLEncode;
            }
        }
        return detailsPageView;
    }
    _LB_Map_ObjInfo_1.createSideHTML = function(StoreLocationInfo,Idx){
        let cssHeader = "h4";
        let cssSubHeader = "h6";
        if(_LB_Map_ObjInfo_1.Layout=="overandunder"){
            cssHeader="h3";
            cssSubHeader="h5";
        }
        let loc = StoreLocationInfo.locations[Idx];
        let returnItem =DomObj( `<div id='Card${loc.id}' itemscope itemtype="https://schema.org/Place"></div>`);
        let firstRow = DomObj(`<div class="row"></div>`);
        let locationNameUrl = "loc="+encodeURI(loc.locationName);
        let detailsPageView = _LB_Map_ObjInfo_1.getDetailURL(loc.id,locationNameUrl,loc.storeLocatorDetailsShortURL,loc.clientID);
        
        if(StoreLocationInfo.showImagesProfile){
            let colLG= 2;
            if(Layout==="listonly" || Layout==="overandunder"){
                colLG=1;
            }
            let strSrcSet="";
            let picURL = loadFile+"StoreLocatorAPI/locationImage?clientId="+ID + "&LocationID="+loc.id+"&MediaCat="+StoreLocationInfo.imagesCategory+"&Rule=" + StoreLocationInfo.imagesCategorySelectOnRule
            if(loc.imageUrlLogo_Small!=null){
                strSrcSet = `srcset="${loc.imageUrlLogo_Small} 100w"`;
                picURL = loc.imageUrlLogo_Small;
                if(bps_isMobile()){
                    picURL = loc.imageUrlLogo_Small;
                }
            }
            
            let celAdd = DomObj(`<div class="col-xs-2 pr0 col-md-2 col-lg-${colLG}"></div>`)
            celAdd.append(DomObj(`<div class="mt">
                    
                <img class="img-responsive" src="${picURL}" alt="${loc.locationName}" ${strSrcSet} itemprop="logo">
                    
            </div>`));
            firstRow.append(celAdd);
        } 
        let smallScreenMainCol = "col-xs-7";
        let smallScreenDirectCol = "col-xs-2";
        //User Views
        if(StoreLocationInfo.showLocationName){
            let colLG= 7;            
            if(Layout==="listonly" || Layout==="overandunder"){
                colLG=3;
            }
            if(_LB_Map_ObjInfo_1.ShowGrid){
                smallScreenMainCol ="col-xs-10";
                smallScreenDirectCol = "col-xs-2"
            }
            let celAdd = DomObj(`<div class="${smallScreenMainCol} col-md-7 col-lg-${colLG}  ml0"></div>`)
            let cellHeader = DomObj(`<div id='${loc.id}' class="locationHeading ${cssHeader}" itemprop="name">${loc.locationName}</div>`)
            if(!_LB_Map_ObjInfo_1.StoreLocationInfo.doNotShowDetailsPage){
               cellHeader.click(function(event){
                    event.stopPropagation();
                     var locationNameUrl = "/en/home/branch-details?locationid=" + this.getAttribute("id");
                    window.location.href = locationNameUrl;
                //window.open(detailsPageView,"_self");
              
                });
            }
            if(StoreLocationInfo.showAddress){
                let address = DomObj(`<div id='address${loc.id}' class="${cssSubHeader} ml" style="margin-left:0px !important"></div>`);
                if(loc.addressLine1!==""){
                    address.append(loc.addressLine1 + "<br>");
                }
                if(loc.addressLine2!==""){
                    address.append(loc.addressLine2 + "<br>");
                }
                if(loc.subLocality!==""){
                    address.append(loc.subLocality + "<br>");
                }
                if(loc.locality!==""){
                    if(_LB_Map_ObjInfo_1.AddressLineLocality=="Locality,AdministrativeArea"){
                        if(loc.administrativeArea!=""){
                            address.append(loc.locality + ", " +loc.administrativeArea + " " + loc.postalCode + "<br>");
                        }else{
                            address.append(loc.locality + "<br>");
                        }
                    }else{
                        address.append(loc.locality + "<br>");
                    } 
                }
                if(loc.postalCode!=="" && _LB_Map_ObjInfo_1.AddressLineLocality!=="Locality,AdministrativeArea"){
                    address.append(loc.postalCode + "<br>");
                }
                cellHeader.append(address); 

            }
            
            celAdd.append(cellHeader);   
            firstRow.append(celAdd); 
        }
     if(StoreLocationInfo.showDirections && useFirstPartyReview==='False' ){
           let celAdd = DomObj(`<div class="${smallScreenDirectCol}  col-md-2 col-lg-2 ml0 pl0"></div>`) 
         //  celAdd.append(DomObj(`<div class="mt text-center">
          //                         <a class="lb-icon icon-directions-lb" href="https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}" target="_blank">
           //                             <svg class="icon-directions-lb-svg" id="Directions" data-name="Directions" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 55 55"><circle class="circle-out" cx="27.5" cy="27.5" r="27.5"/><path class="inner-try" d="M27.5,11.61,10.56,28.55l16.94,17L44.44,28.55ZM23.24,29.52v4.4H20.05V26.33H31.73v-3.1l4.69,4.69-4.69,4.7v-3.1Z"/></svg>
            //                       </a>
            //                       <a href="https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}" target="_blank"><div class="${cssSubHeader} text-center">Directions</div></a>
            //                       <div class="${cssSubHeader} text-center numbKMAway"></div><br>
             //                   </div>`));
           if(StoreLocationInfo.showDirections_InnerColor){
              celAdd.append(DomObj(`<style>
                   .icon-directions-lb-svg .circle-out {
                       fill:${StoreLocationInfo.showDirections_OuterColor} ;
                       }
                       .icon-directions-lb-svg .inner-try{
                       fill:${StoreLocationInfo.showDirections_InnerColor} ;
                        } 
               </style>
               `));

            }                      
         celAdd.click(function() {_LB_Map_ObjInfo_1.analytic('directions',loc.id,"");});
           firstRow.append(celAdd); 
       } 
        
       returnItem.append(firstRow); 
        if(StoreLocationInfo.showServiceMessage){
            let cellService = DomObj(`<div class="row ml"> <div class="col-12"> <div class="locationService serviceMessage">${loc.serviceMessage}</div></div></div>`)
            returnItem.append(cellService);  
        }  
        if(StoreLocationInfo.showPhoneNumber && loc.primaryPhone!=""){
            
            returnItem.append(`<div class="row"> 
                                        <div class="col-xs-1 pr0 col-md-1 col-lg-1">
                                            <span class="glyphicon glyphicon-earphone mt"></span>
                                        </div>
                                        <div class="col-xs-10 pr0 col-md-10 col-lg-10 analytic-phone">
                                            <div class="${cssSubHeader}"><a href="tel:${loc.primaryPhone}" itemprop="telephone">${loc.primaryPhone}</a></div>
                                        </div>
                                    </div>`);
            returnItem.find(".analytic-phone").click(function() {_LB_Map_ObjInfo_1.analytic('phonecall',loc.id,loc.primaryPhone)});
        }
        if(StoreLocationInfo.showAdditionalPhone && loc.additionalPhone1!=""){
            
            returnItem.append(`<div class="row"> 
                                        <div class="col-xs-1 pr0 col-md-1 col-lg-1">
                                            <span class="glyphicon glyphicon-phone mt"></span>
                                        </div>
                                        <div class="col-xs-10 pr0 col-md-10 col-lg-10 analytic-phone1">
                                            <div class="${cssSubHeader}"><a href="tel:${loc.additionalPhone1}">${loc.additionalPhone1}</a></div>
                                        </div>
                                    </div>`);
            returnItem.find(".analytic-phone1").click(function() {_LB_Map_ObjInfo_1.analytic('phonecall',loc.id,loc.primaryPhone)});
        }
        if(StoreLocationInfo.showEmailAddresses && loc.email!=""){
            let aemail = loc.email.split(";");
            let emailList = aemail.map(x=>{return `<a href="mailto:${x}" target="_blank">${x}</a>`}).join(" ");
            returnItem.append(`<div class="row"> 
                                        <div class="col-xs-1 pr0 col-md-1 col-lg-1">
                                            <span class="glyphicon glyphicon-envelope mt"></span>
                                        </div>
                                        <div class="col-xs-10 pr0 col-md-10 col-lg-10">
                                            <div class="${cssSubHeader} analytic-email">${emailList}</div>
                                        </div>
                                    </div>`);
            returnItem.find(".analytic-email").click(function() {_LB_Map_ObjInfo_1.analytic('email',loc.id,"")});
             
        }
        if(StoreLocationInfo.showOperatingHours && loc.regularHours.length>0){

            let strHTMl ="";
            let lastOpenDay = "";
            
            let checkNowDate = function(strDay,OpenTime,CloseTime,FirstDate){
                let nowDate = new Date();
                let DayArray = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
                let idx = DayArray.findIndex(x=>x==strDay);
                if(idx === nowDate.getDay()){
                    return true;
                }

                if(OpenTime != null && CloseTime != null) {
                    let startHour = OpenTime.split(":")[0];
                    let endHour = CloseTime.split(":")[0];
                    
                    let fDate = new Date(FirstDate.substr(0,10));
                    let myDate = new Date();
                    fDate.setDate(fDate.getDate() + 1);
                    if(endHour < startHour && fDate.toDateString() === myDate.toDateString()){
                        let tempDate = new Date([fDate.getFullYear(), fDate.getMonth(), fDate.getDate()].join('-') + ' ' + CloseTime);
                        if(tempDate > myDate){
                            return true;
                        }
                    }    
                }

                return false;
            }
            let checkNowDateOpen = function(strDay,OpenTime,Loc){
                let nowDate = new Date();
                let DayArray = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
                let idx = DayArray.findIndex(x=>x==strDay);
                //if(idx === nowDate.getDay()){
                    if(!Loc.zoneName){
                        Loc.zoneName = "Africa/Johannesburg";
                    }
                    if(Loc.zoneName==null){
                        Loc.zoneName = "Africa/Johannesburg";
                    }
                    // suppose the date is 12:00 UTC
                    var invdate = new Date(nowDate.toLocaleString('en-US', {
                        timeZone: Loc.zoneName
                    }));
                    if(OpenTime.openTime==null){
                        return false;
                    }

                    let startHour = OpenTime.openTime.split(":")[0];
                    let endHour = OpenTime.closeTime.split(":")[0];
                    let currentEndHour = invdate.getHours(); 
                    if(endHour < startHour){
                        endHour = Number(endHour) + 24;
                        if(idx != nowDate.getDay()) {
                            currentEndHour = Number(currentEndHour) + 24;
                        }
                    }
                    let startMin = OpenTime.openTime.split(":")[1];
                    let endMin = OpenTime.closeTime.split(":")[1];
                    if(invdate.getHours()>=startHour && currentEndHour<=endHour){
                        if(invdate.getHours()==startHour && invdate.getMinutes()<startMin){
                            return false
                         }else if(currentEndHour==endHour && invdate.getMinutes()>endMin){
                            return false
                        }
                        return true
                    }
                //}

                return false;
            }
            let bisSpecialHour = false;
            loc.specialHours.forEach(x=>{
                if(_LB_Map_ObjInfo_1.checkDateWithNoTime(x.startDate,x.openTime,x.closeTime)){
                    
                    let OpenDayText = x.openDay + (x.isSpecialHour?" <span alt='Not Normal Hours' >*</span> ":"");
                    if(x.isSpecialHour){
                        bisSpecialHour = true;
                    }
                    if(lastOpenDay!=x.openDay){
                        lastOpenDay=x.openDay
                    }else{
                        OpenDayText ="";
                    }
                    let colSizeDay = "col-xs-6";
                    let colSizeHour = "col-xs-6";
                    if(TimeFormat!="24"){
                        colSizeDay = "col-xs-5";
                        colSizeHour = "col-xs-7";
                    }
                    if(_LB_Map_ObjInfo_1.Layout=="overandunder" || _LB_Map_ObjInfo_1.Layout=="listonly"){
                        colSizeDay = "col-xs-6 col-md-1 col-lg-1";
                        colSizeHour = "col-xs-6 col-md-4 col-lg-4";
                        if(TimeFormat!="24"){
                            colSizeDay = "col-xs-5 col-md-1 col-lg-1";
                            colSizeHour = "col-xs-7 col-md-4 col-lg-4";
                        }
                    }
                    let showHide = checkNowDate(OpenDayText,x.openTime,x.closeTime,x.startDate)?"":"hidden";
                    let highlight = checkNowDate(OpenDayText,x.openTime,x.closeTime,x.startDate)?"text-success":"";
                    let isOpen = checkNowDate(OpenDayText,x.openTime,x.closeTime,x.startDate)?(checkNowDateOpen(OpenDayText,x,loc)?"OPEN":"CLOSED"):"";
                    let Arrow = checkNowDate(OpenDayText,x.openTime,x.closeTime,x.startDate)?`<span class="glyphicon glyphicon-triangle-bottom mt0"></span>`:"";
                    if(loc.gmbOpenInfoStatus==="CLOSED_TEMPORARILY"){
                        isOpen="CLOSED";                        
                    }
                    if(x.isClosed){
                        isOpen="CLOSED";
                    }
                    if(TimeFormat!="24"){
                        x.openTime = _LB_Map_ObjInfo_1.formate12Time(x.openTime)
                        x.closeTime = _LB_Map_ObjInfo_1.formate12Time(x.closeTime)
                    }
                    if(isOpen=="CLOSED" && !StoreLocationInfo.showClosedTimes){
                        strHTMl+= `<div class="row ${showHide} ${highlight}" ><div class="${colSizeDay}" >${OpenDayText}</div>` + 
                                    `<div class="${colSizeHour} ">${isOpen} ${Arrow}</div> ` +
                                    `</div>`;
                    }
                    else if(isOpen=="CLOSED" && StoreLocationInfo.showClosedTimes && x.openTime != null && x.closeTime != null){
                        strHTMl+= `<div class="row ${showHide} ${highlight}" ><div class="${colSizeDay}" >${OpenDayText}</div>` + 
                                `<div class="${colSizeHour} ">${x.openTime} - ${x.closeTime} ${Arrow}</div> ` +
                                `</div>`;
                    } 
                    else if(isOpen=="CLOSED" && StoreLocationInfo.showClosedTimes && x.openTime == null && x.closeTime == null){
                        strHTMl+= `<div class="row ${showHide} ${highlight}" ><div class="${colSizeDay}" >${OpenDayText}</div>` + 
                                `<div class="${colSizeHour} ">${isOpen} ${Arrow}</div> ` +
                                `</div>`;
                    } else {
                        strHTMl+= `<div class="row ${showHide} ${highlight}" ><div class="${colSizeDay}" >${OpenDayText}</div>` + 
                                    `<div class="${colSizeHour} ">${isOpen} ${x.openTime} - ${x.closeTime} ${Arrow}</div> ` +
                                    `</div>`;
                    }
                }
            });
            let specialHoursText="";
            if(bisSpecialHour){
                specialHoursText='<span class="text-muted">*These hours differ from normal trading hours</span>';
            }
            let openHours = DomObj(`<div id='openHours${loc.id}' class="${cssSubHeader}" >
                                    <div class="row"> 
                                        <div class="col-xs-1 pr0 col-md-1 col-lg-1">
                                            <span class="glyphicon glyphicon-time mt0"></span>
                                        </div>
                                        <div class="col-xs-10 pr0 col-md-10 col-lg-10" id="openHoursList">
                                            
                                            ${strHTMl}
                                            ${specialHoursText}
                                        </div>
                                    </div>
            </div>`);
            openHours.click(function(){DomObj(this).find('#openHoursList .row').toggleClass('hidden');DomObj(this).find('#openHoursList  .row.text-success').removeClass('hidden');});
            returnItem.append(openHours);
        }
        
        if(StoreLocationInfo.showDescription && loc.description!=""){
            
            returnItem.append(`<div class="small pr">${loc.description}</div>`);
        }
        if(StoreLocationInfo.showShortDescription && loc.shortDescription!=""){
            
            returnItem.append(`<div class="small pr">${loc.shortDescription}</div>`);
        }
        
        if(StoreLocationInfo.showCategories && loc.gmbPrimaryCategoryName!=""){  
            const tplCatHTML =(CategoryName)=>{
                let isFound = _LB_Map_ObjInfo_1.mataCatergory.findIndex((currentValue, index,arr)=>{return currentValue==CategoryName});
                if(isFound==-1){
                    _LB_Map_ObjInfo_1.mataCatergory.push(CategoryName);
                }
            }
            tplCatHTML(loc.gmbPrimaryCategoryName);
            tplCatHTML(loc.gmbAdditionalCategoryName1);
            tplCatHTML(loc.gmbAdditionalCategoryName2);
            tplCatHTML(loc.gmbAdditionalCategoryName3);
            tplCatHTML(loc.gmbAdditionalCategoryName4);
            tplCatHTML(loc.gmbAdditionalCategoryName5);
            tplCatHTML(loc.gmbAdditionalCategoryName6);
            tplCatHTML(loc.gmbAdditionalCategoryName7);
            tplCatHTML(loc.gmbAdditionalCategoryName8);
            tplCatHTML(loc.gmbAdditionalCategoryName9);
        }
        
         
        if(useFirstPartyReview==='False'){
            
            
             
            returnItem.attr("store-locator", "");
            if(_LB_Map_ObjInfo_1.StoreLocationInfo.doNotShowDetailsPage){
                //No Details 
            }else{
                var storeid = "";
              var arr = detailsPageView.split('&');
                        if(arr && arr.length > 0) {
                          for(let i=0; i <arr.length; i++)
                            {
                                if(arr[i].includes("locationid")) {
                                     var value = arr[i].split('=');
                                      storeid = (value && value.length > 0) ? value[1] : ""; 
                                      break;
                                }
                            }
                          
                        }
                        
                var stordeatailUrl = "/en/home/branch-details?locationid=" + storeid;
                
                let aStoreViewClick = DomObj(`<a href="${stordeatailUrl}" class="btn btn-info btn-solid btn-accent ab-view-store-details" store-id="${stordeatailUrl}" itemprop="url" >View Store Details</a>`);
                let navigatetoBranch=DomObj(`<a class="btn  btn-accent ab-navigate-branch-link" href="https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}" target="_blank">Navigate to Branch</a>`)
               
               
                aStoreViewClick.click(function(event){
                  //  event.stopPropagation();
               // window.open(detailsPageView,"_self");
               //const urlParams = new URLSearchParams(window.location.search);
               //var storeDetailUrl = window.location.href;
              //  var storeDetailUrl= storeDetailUrl += '?loc=African%20Bank%20Diepsloot&id=6d24311d-adb1-4143-a13c-f992051003a6&layout=standard&clientid=6ef8638f-af8c-409d-ad24-cf3422269370';
              
                  //  window.location.search = urlParams;
                   // document.getElementsByClassName("store-details")[0].style.display = "block";
                   // document.getElementsByClassName("LB_StoreLocator")[0].style.display = "none";
                   // window.location.href = locationNameUrl;
                });
                
                let divRep =  DomObj(`<div class="${cssSubHeader}" id="view-store-details"></div>`);
                divRep.append(aStoreViewClick);
                divRep.append(navigatetoBranch);
                //onclick="event.stopPropagation();window.open('${detailsPageView}','_self)'"
                returnItem.append(divRep);
                if(_LB_Map_ObjInfo_1.StoreLocationInfo.showFirstCallToAction)
                {
                    if(loc.callToAction.length > 0)
                        {
                            returnItem.append(`<div class="${cssSubHeader}" id="store-book"><a class="btn btn-info btn-solid btn-accent" href="${loc.callToAction[0].url}"  target="_blank">${loc.callToAction[0].name}</a></div>`);
                            
                        }
                }
            }
          
            if(StoreLocationInfo.showFirstPartReview){
                returnItem.append(`<div class="${cssSubHeader} analytic-fpr"><a class="btn btn-primary" href="https://locationbank.net/public/fpr?id=${loc.clientID}&locationID=${loc.id}" target="_blank">Review</a></div>`);
                returnItem.find(".analytic-fpr").click(function() {_LB_Map_ObjInfo_1.analytic('firstpartyreview',loc.id,"")});
            }

        }else{
            returnItem.append(`<div class="${cssSubHeader}"><a class="btn btn-primary" href="#" onclick="Review('${loc.id}','${loc.locationName}');return false;" target="_blank">Review</a></div>`);
        }       
         
        let colType= "col-12 col-sm-12 col-lg-12";
        if(_LB_Map_ObjInfo_1.ShowGrid){
            colType= "flx-grid-cell";
        }
        let oBody = DomObj(`<div id='Head${loc.id}' class='${colType}' role="button"></div>`);
        //Postal Code for the UK
        let postCodeSearch=(loc.postalCode||"").toUpperCase();

        //Search        
        let strSearch = `${loc.id} ${loc.locationName} ${loc.addressLine1} ${loc.addressLine2} ${loc.subLocality} ${loc.locality} ${loc.administrativeArea} ${loc.country} ${loc.countryName} ${loc.serviceAreaPlaces} ${loc.postalCode}`; 
        loc.attributes.forEach(x=>{
            strSearch+=" " + x.attributeId;
        });
        strSearch = strSearch.toUpperCase();
        oBody.append(`<div id='Search${loc.id}' class="locationHeadingSearch" data-post-code="${postCodeSearch}" >${strSearch}</div>`);
        
        
        oBody.append(returnItem);
        return oBody;
    }
    _LB_Map_ObjInfo_1.checkDateWithNoTime= function(FirstDate,OpenTime,CloseTime){
        let myDate = new Date()
        let fDate = new Date(FirstDate.substr(0,10));
        let sDate = new Date(myDate.getFullYear(),myDate.getMonth(), myDate.getDate());
        let dateInFuture = new Date(myDate.getFullYear(),myDate.getMonth(), myDate.getDate());
        // add a day
        dateInFuture.setDate(dateInFuture.getDate() + 7);
        if(fDate.getTime()>sDate.getTime()){
            if(fDate.getTime()<dateInFuture.getTime()){
                return true;
            }
        }
        if(OpenTime !=null && CloseTime !=null) {
            let startHour = OpenTime.split(":")[0];
            let endHour = CloseTime.split(":")[0];
            fDate.setDate(fDate.getDate() + 1);
            if(endHour < startHour && fDate.toDateString() === myDate.toDateString()){
                let tempDate = new Date([fDate.getFullYear(), fDate.getMonth(), fDate.getDate()].join('-') + ' ' + CloseTime);
                if(tempDate > myDate){
                        return true;
                }
            }
        }

        return false;
    }
    _LB_Map_ObjInfo_1.ShowLocation=function(ID){
        DomObj("#LB_SIDEBAR div.row.mainrow").each(function( index ) {
            DomObj("#LB_SIDEBAR","#LB_SIDEBAR").find(".locationHeadingSearch:not(:Contains(" + ID + "))").parent().slideUp();
            DomObj("#LB_SIDEBAR","#LB_SIDEBAR").find(".locationHeadingSearch:Contains(" + ID + ")").parent().slideDown();
        });
        
    }
    _LB_Map_ObjInfo_1.NewPostCodeSearch = function(search,latitude,longitude){
        var pos = new google.maps.LatLng(latitude, longitude)
        _LB_Map_ObjInfo_1.find_closest_marker(pos,30);
    }
    _LB_Map_ObjInfo_1.filterDomObj = function(search,selectAtt,searchType,searchArray){

        let bounds = new google.maps.LatLngBounds();
         let bfound = false;
         let NumFound = 0;
        let firstFound = null;
        let AdvanceSearch = {Country:{},Provence:{},City:{},Area:{},Attributes:{}};
        let bIsFound= false;
        
        let list = DomObj("div.row.mainrow","#LB_SIDEBAR").each(function( index ) {
            if(search!="" || selectAtt.length>0) {                
                
                let allObject = DomObj(this).find(".locationHeadingSearch");
                
                for(let i=0;i<allObject.length;i++){
                    
                    let searchString = (allObject[i].textContent|| allObject[i].innerText || "").toUpperCase();
                    let postCode = (DomObj(allObject[i]).attr("data-post-code")||"").toUpperCase();
                    let searchStringwithoutspace = postCode.replace(/\s+/g, '');
                    let bFoundText;
                        bFoundText = searchString.indexOf(search.toUpperCase())>=0;
                        if(!bFoundText && searchType === "generalSearch"){
                        let searchStringwithoutspace = searchString.replace(/\s+/g, '');
                        bFoundText = searchStringwithoutspace.indexOf(search.toUpperCase())>=0;
                        }

                    let bAttabuits = false; 
                    let NumFoundAtt = 0;
                    if(selectAtt.length>0){ 
                        for(let c=0;c<selectAtt.length;c++){
                            let isFound = searchString.toUpperCase().indexOf(selectAtt[c].toUpperCase())>=0
                            if(isFound==true){
                                bAttabuits = true;
                                NumFoundAtt++;                                
                            }
                        }
                    }
                    if(selectAtt.length>0 && search == "")
                    {
                        bFoundText = false;
                    }
                    
                    let LocationCard = DomObj(allObject[i]).parent();

                    if((bFoundText && bAttabuits) || (bFoundText==true && bAttabuits==false) || (bFoundText==false && bAttabuits==true)){
                        LocationCard.show();
                        AdvanceSearch.Country[LocationCard.attr("data-countryName").toLowerCase().trim()]=LocationCard.attr("data-countryName");
                        AdvanceSearch.Provence[LocationCard.attr("data-administrativeArea").toLowerCase().trim()]=LocationCard.attr("data-administrativeArea");
                        AdvanceSearch.City[LocationCard.attr("data-locality").toLowerCase().trim()]=LocationCard.attr("data-locality");
                        AdvanceSearch.Area[LocationCard.attr("data-subLocality").toLowerCase().trim()]=LocationCard.attr("data-subLocality");
                        NumFound++;
                        if(firstFound==null){
                            firstFound = allObject[i];
                        }
                        if(_LB_Map_ObjInfo_1.map!==null && NumFound<=5){
                            bounds.extend(new google.maps.LatLng(parseFloat(LocationCard.attr("data-latitude")).toFixed(6), 
                                                            parseFloat(LocationCard.attr("data-longitude")).toFixed(6)));
                        }
                        var marker = _LB_Map_ObjInfo_1.markers.find(x=>x._LocID===LocationCard.attr("data-id"));
                        marker.setVisible(true);
                    }else{

                        LocationCard.hide();
                        
                            var marker = _LB_Map_ObjInfo_1.markers.find(x=>x._LocID===LocationCard.attr("data-id"));
                            marker.setVisible(false);
                        
                        

                    }
                    
                }
                bIsFound = true;
                
            } else {                
                _LB_Map_ObjInfo_1.markers.forEach(marker=>{
                    marker.setVisible(true);
                });
                
                DomObj(this).find("div .locationHeadingSearch").parent().slideDown();
            }
        });
        if(bIsFound){
            _LB_Map_ObjInfo_1.AdvanceSearchAddDropDown(AdvanceSearch.Country,"#LB_BODY_from_"+ID+" #AdvanceSearchCountry",_LB_Map_ObjInfo_1.CountryText);
            _LB_Map_ObjInfo_1.AdvanceSearchAddDropDown(AdvanceSearch.Provence,"#LB_BODY_from_"+ID+" #AdvanceSearchProvence",_LB_Map_ObjInfo_1.ProvinceText);
            _LB_Map_ObjInfo_1.AdvanceSearchAddDropDown(AdvanceSearch.City,"#LB_BODY_from_"+ID+" #AdvanceSearchCity",_LB_Map_ObjInfo_1.CityText);
            _LB_Map_ObjInfo_1.AdvanceSearchAddDropDown(AdvanceSearch.Area,"#LB_BODY_from_"+ID+" #AdvanceSearchArea",_LB_Map_ObjInfo_1.AreaText);
        }else{
            _LB_Map_ObjInfo_1.AdvanceSearchAddDropDown(_LB_Map_ObjInfo_1._AdvanceSearch.Country,"#LB_BODY_from_"+ID+" #AdvanceSearchCountry",_LB_Map_ObjInfo_1.CountryText);
            _LB_Map_ObjInfo_1.AdvanceSearchAddDropDown(_LB_Map_ObjInfo_1._AdvanceSearch.Provence,"#LB_BODY_from_"+ID+" #AdvanceSearchProvence",_LB_Map_ObjInfo_1.ProvinceText);
            _LB_Map_ObjInfo_1.AdvanceSearchAddDropDown(_LB_Map_ObjInfo_1._AdvanceSearch.City,"#LB_BODY_from_"+ID+" #AdvanceSearchCity",_LB_Map_ObjInfo_1.CityText);
            _LB_Map_ObjInfo_1.AdvanceSearchAddDropDown(_LB_Map_ObjInfo_1._AdvanceSearch.Area,"#LB_BODY_from_"+ID+" #AdvanceSearchArea",_LB_Map_ObjInfo_1.AreaText);
        }
        if(_LB_Map_ObjInfo_1.ShowGrid ){ 
        }else{
            var $wrapper = DomObj('#LB_SIDEBAR .mainrow');

            $wrapper.find('[data-numbkmaway]').sort(function (a, b) {            
                return +(a.getAttribute('data-numbkmaway')  || 100) - +(b.getAttribute('data-numbkmaway')  || 100);
            })
            .appendTo( $wrapper );
        }
        if(firstFound==null){
            _LB_Map_ObjInfo_1.searchAnalytic(search,"","");
        }else{
            _LB_Map_ObjInfo_1.searchAnalytic(search,DomObj(firstFound).parent().attr("data-locationName"),DomObj(firstFound).parent().attr("data-address"));
        }
        if(_LB_Map_ObjInfo_1.map!==null){
            // Don't zoom in too far on only one marker
            if(NumFound>0){
                
                if(NumFound>1){
                    if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
                        var extendPoint1 = new google.maps.LatLng(bounds.getNorthEast().lat() + 0.1, bounds.getNorthEast().lng() + 0.1);
                        var extendPoint2 = new google.maps.LatLng(bounds.getNorthEast().lat() - 0.1, bounds.getNorthEast().lng() - 0.1);
                        bounds.extend(extendPoint1);
                        bounds.extend(extendPoint2);
                        
                    }
                    _LB_Map_ObjInfo_1.map.setZoom(15);
                    _LB_Map_ObjInfo_1.map.fitBounds(bounds);
                }else{
                    _LB_Map_ObjInfo_1.map.setZoom(15);
                    _LB_Map_ObjInfo_1.map.fitBounds(bounds);
                }
            }else{ 
                if(searchArray.length === 0)
                {
                    _LB_Map_ObjInfo_1.map.fitBounds(_LB_Map_ObjInfo_1.DefaultBounds);
                }
                
            }  
        }
    }
    _LB_Map_ObjInfo_1.searchLocation = function(searchType){
       
        let bounds = new google.maps.LatLngBounds();
        let form = DomObj("#LB_BODY_from_"+ID);
        let search = "";
        let searchArray = [];
        let generalSearch = DomObj("#LB_BODY_SEARCH_"+ID,form).val();
        let PostalSearch = DomObj("#AdvanceSearchPostalCode"+ID,form).val();
        if(searchType === "generalSearch")
        {
            search = generalSearch.toUpperCase();
        }
        else if(searchType === "postalCodeSearch")
        {
            search = PostalSearch.toUpperCase()
        }
         
         //get all tick att
        let selectAtt = new Array();
        let allCheck = form.find(".checkbox [type=checkbox]:checked");
        for(let x=0;x<allCheck.length;x++){
            if(DomObj(allCheck[x]).is(':checked')){
                selectAtt.push(DomObj(allCheck[x]).val().toUpperCase());
            }
        }
         if(search)
         {
            if(search.length<2 && selectAtt.length==0)
            {
                return;
            }
            else
            { 
                if(_LB_Map_ObjInfo_1.StoreLocationInfo.locations[0].country === "GB" && (search.length<9)){
                    let url = nearestLocations +"q=" + search.toUpperCase().trim() + '&limit=1';
                    DomObj.ajax({url:url , success: function(result){
                        if(result.result && result.result !=null && result.result.length > 0){                            
                            _LB_Map_ObjInfo_1.NewPostCodeSearch(search,result.result[0].latitude,result.result[0].longitude);                          
                        }else{
                            _LB_Map_ObjInfo_1.filterDomObj(search,selectAtt,searchType,searchArray);
                        }
                    }});
                }else{
                    _LB_Map_ObjInfo_1.filterDomObj(search,selectAtt,searchType,searchArray);
                } 
            }
        }
        else
        {
            _LB_Map_ObjInfo_1.filterDomObj(search,selectAtt,searchType,searchArray);
        }

    }
    _LB_Map_ObjInfo_1.errorGeolocationCount = 0;
    _LB_Map_ObjInfo_1.nearMe = function(){
        // Try HTML5 geolocation.
        if (navigator.geolocation) {
            var options = {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            };
            if(navigator.geolocation.getCurrentPosition){
                navigator.geolocation.getCurrentPosition(function (position) {
                    _LB_Map_ObjInfo_1.nearMe_lat=position.coords.latitude;
                    _LB_Map_ObjInfo_1.nearMe_long=position.coords.longitude;
                    var pos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude)
                    _LB_Map_ObjInfo_1.find_closest_marker(pos);
                }, function (err) {
                    _LB_Map_ObjInfo_1.map.fitBounds(_LB_Map_ObjInfo_1.DefaultBounds);
                    _LB_Map_ObjInfo_1.errorGeolocationCount++;                     
                    _LB_Map_ObjInfo_1.handleLocationError(true, null, _LB_Map_ObjInfo_1.map.getCenter());
                },options);
            }
        } else {
            _LB_Map_ObjInfo_1.errorGeolocationCount++; 
            _LB_Map_ObjInfo_1.map.fitBounds(_LB_Map_ObjInfo_1.DefaultBounds);
            _LB_Map_ObjInfo_1.handleLocationError(false, null, _LB_Map_ObjInfo_1.map.getCenter());
        }
    }
    _LB_Map_ObjInfo_1.formatDistance = function(dInM){
        let formatNumber = function(num) {
                                return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
                            } 
        if(Unit!="metric"){
            if((dInM/1000)>0){
                return formatNumber(Math.round((dInM/1000)/km2mil))+" mi"
            }else{
                return "0 mi"
            }
        }
        return formatNumber(Math.round(dInM/1000))+" KM"
    }
    _LB_Map_ObjInfo_1.find_closest_marker = function(pos,maxDistance=60){
        let distances = [];
        let closest = -1;
        
        
        for (i = 0; i < _LB_Map_ObjInfo_1.StoreLocationInfo.locations.length; i++) {
            var loc = _LB_Map_ObjInfo_1.StoreLocationInfo.locations[i];
            let marPos = new google.maps.LatLng(parseFloat(loc.latitude).toFixed(6), parseFloat(loc.longitude).toFixed(6))
            let d = google.maps.geometry.spherical.computeDistanceBetween(marPos, pos);
            distances.push({d:d,km:Math.round(d/1000),index:i,Title:loc.locationName,id:loc.id,
                            lat:parseFloat(loc.latitude).toFixed(6), long:parseFloat(loc.longitude).toFixed(6),
                            Pos:marPos,isClose:false});// = d;
            if(Math.round(d/1000)<maxDistance){
                                    distances[i].isClose = true;
                    var marker = _LB_Map_ObjInfo_1.markers.find(x=>x._LocID===loc.id);
                    marker.setVisible(true);
            }
            //set KM away numbKMAway
            let locDiv = DomObj("#Head"+loc.id,"#LB_SIDEBAR");
            locDiv.attr("data-numbKMAway",Math.round(d/1000));
            locDiv.find(".numbKMAway").html(_LB_Map_ObjInfo_1.formatDistance(d));
            if(distances[i].isClose==false){
                locDiv.hide();
            }

        }
        let allClose = distances.filter(x=>x.isClose===true).sort((x,y)=>{
                                                                    if(x.d<y.d){return -1;}
                                                                    if(x.d>y.d){return 1;}
                                                                    return 0;
                                                                    });
        if(allClose.length==0){
            DomObj("#LB_BODY_SEARCH_"+ID).val("");
            _LB_Map_ObjInfo_1.searchLocation("generalSearch");
            _LB_Map_ObjInfo_1.searchAnalytic("NEAR ME","","");
            return;
        }else{
            _LB_Map_ObjInfo_1.searchAnalytic("NEAR ME",allClose[0].Title,allClose[0].id);
        }
        if(_LB_Map_ObjInfo_1.ShowGrid ){ 
        }else{
            var $wrapper = DomObj('#LB_SIDEBAR .mainrow');

            $wrapper.find('[data-numbkmaway]').sort(function (a, b) {            
                return +(a.getAttribute('data-numbkmaway')  || 100) - +(b.getAttribute('data-numbkmaway')  || 100);
            })
            .appendTo( $wrapper );
        }
        let cout = 0;
        let bounds = new google.maps.LatLngBounds();
        let bounMap = 0;
        allClose.forEach(loc => {
            bounMap++;
            if(bounMap<=5){
                bounds.extend(new google.maps.LatLng(loc.lat,loc.long));                
            }
        });
        allClose.reverse().forEach(loc => {
            //
            DomObj("#Head"+loc.id,"#LB_SIDEBAR").slideDown(); 
        });
        if(_LB_Map_ObjInfo_1.map!==null){
                if(allClose.length>1){
                    if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
                        var extendPoint1 = new google.maps.LatLng(bounds.getNorthEast().lat() + 0.1, bounds.getNorthEast().lng() + 0.1);
                        var extendPoint2 = new google.maps.LatLng(bounds.getNorthEast().lat() - 0.1, bounds.getNorthEast().lng() - 0.1);
                        bounds.extend(extendPoint1);
                        bounds.extend(extendPoint2);
                    }
                    if(bounMap<=2){
                        _LB_Map_ObjInfo_1.map.fitBounds(bounds);
                        _LB_Map_ObjInfo_1.map.setZoom(13);
                    }else{
                        _LB_Map_ObjInfo_1.map.setZoom(15);
                        _LB_Map_ObjInfo_1.map.fitBounds(bounds);
                    }
                    
                }else{
                    _LB_Map_ObjInfo_1.map.setZoom(15);
                    _LB_Map_ObjInfo_1.map.fitBounds(bounds);
                }
                
        }
    }
    _LB_Map_ObjInfo_1.handleLocationError = function(browserHasGeolocation, infoWindow, pos){
        if(_LB_Map_ObjInfo_1.errorGeolocationCount<2){
           //setTimeout(function(){ _LB_Map_ObjInfo_1.getUserLocation() }, 1000);
        }
    }
    _LB_Map_ObjInfo_1.locationClick = function(listItem){
                let latitude = DomObj(DomObj(listItem)[0]).attr("data-latitude");
        let longitude =DomObj(DomObj(listItem)[0]).attr("data-longitude");
        
        if(_LB_Map_ObjInfo_1.map!==null){
            _LB_Map_ObjInfo_1.map.setCenter(new google.maps.LatLng(latitude, longitude));
            _LB_Map_ObjInfo_1.map.setZoom(15);
        }
    }
    _LB_Map_ObjInfo_1.addReviews = function(ReviewData){
        ReviewData.Publisher = {};
        ReviewData.googleReviewPublicPublisher.forEach(publisher=>{
            let newPub = {starRatingColour:publisher.starRatingColour,
                            starObjectPath:publisher.starObjectPath
                        }
            ReviewData.Publisher[publisher.publisher] = newPub; 
        });
        //locationId - reviews
        ReviewData.reviews.forEach(Review=>{
            let locationCard = DomObj(`#Card${Review.locationId}`).first();
             
            let body = DomObj("<a class='revireBody h6  ' href='"+Review.reviewURL+"' target='_blank'></a>");
            body.click(function() {_LB_Map_ObjInfo_1.analytic('review',Review.locationId,Review.reviewComment)});
            let img = DomObj(`<div class="media-left">
                                    <img src="${Review.publisherPictureSmall}" class="media-object" alt="${Review.reviewComment}" style="width:20px">
                                </div>`); 
            let bodyDetail = DomObj(`<div class="media-body strong"></div>`);
            bodyDetail.append(`<strong>${Review.reviewDisplayName}</strong>`);
            let span = DomObj("<span/>");
            let pubInfo = ReviewData.Publisher[Review.publisher];
            if(!pubInfo || !pubInfo.starRatingColour){
                //console.log("PUB not found ",Review.publisher);
            }
            if(pubInfo===undefined){
                    pubInfo = {publisher: "GOOGLE",
                    starRatingColour: "#ff5d48",
                    starObjectPath: "glyphicon-star|glyphicon-star-empty"};
                }
            span.css('color', pubInfo.starRatingColour); 
            let aStar = pubInfo.starObjectPath.split("|");
            for(let i=0;i<Review.starNumber;i++){
                span.append(_LB_Map_ObjInfo_1.createStar(aStar[0]));
            }
            for(let i=Review.starNumber;i<5;i++){
                span.append(_LB_Map_ObjInfo_1.createStar(aStar[1]));
            }
            bodyDetail.append(span);
            let text = DomObj(`<p>${Review.reviewComment}  </p>`);
            bodyDetail.append(text);
            let medaiBox = DomObj(`<div class="media animated fadeIn slow"></div>`);
            
             
            medaiBox.append(img,bodyDetail); 
            
             
            body.append(medaiBox); 
            locationCard.append(body); 
        });
        
    }
    _LB_Map_ObjInfo_1.createStar = function(starObjectPath){
        return DomObj(`<i class="glyphicon ${starObjectPath}"></i>`);
    }
    _LB_Map_ObjInfo_1.initMap = function() {
        DomObj("#ShowAdvanceSearch","#LB_BODY_from_"+ID).parent().siblings(".ShowAdvanceSearchDetails").hide();
        _LB_Map_ObjInfo_1.map = null;
        if(_LB_Map_ObjInfo_1.ShowMap){
            _LB_Map_ObjInfo_1.map = new google.maps.Map(document.getElementById("LB_MAP_"+ID), {
            center: {lat: -34.397, lng: 150.644},
            zoom: 1,
            doCluster:true,
            mapTypeControlOptions: {
                mapTypeIds: []
            }

            });
        }
        _LB_Map_ObjInfo_1.isLoaded=true;
        
        DomObj.ajax({url:loadFile+"StoreLocatorAPI?clientId="+ID, success: function(result){

            if(result){
                _LB_Map_ObjInfo_1.showGoogleMapLoad(result,_LB_Map_ObjInfo_1.map);
                if(result.showReviews){
                    DomObj.ajax({url:loadFile+"StoreLocatorAPI/review?clientId="+ID+"&NumberOfReviews="+ result.numberOfReviews, 
                        success: function(result){
                        _LB_Map_ObjInfo_1.addReviews(result);
                    }});
                }
            }else{
                DomObj("#"+ID + " #LB_BODY").empty();
                DomObj("#"+ID + " #LB_BODY").append(`<div class="row"><div class="col-12">
                    <div class="alert alert-warning">
  <strong>Error!</strong> Store Locator not enabled 404 error.
</div></div></div>`)
                DomObj("#"+ID + " .LB_Loading").hide();
            }
        }});
      }
    _LB_Map_ObjInfo_1.analytic = function(type,locationID,context){
        type = encodeURI(type);
        locationID = encodeURI(locationID);
        context = encodeURI(context);
        let lat = _LB_Map_ObjInfo_1.nearMe_lat||0;
        let long = _LB_Map_ObjInfo_1.nearMe_long||0;

        DomObj.ajax({url:loadFile+`StoreLocatorAnalyticsAPI/save?ClientID=${ID}&type=${type}&locationid=${locationID}&contex=${context}&lat=${lat}&Long=${long}`, 
            success: function(result){
            //do nothing
        }});
    }
    _LB_Map_ObjInfo_1.searchAnalytic = function(searchQuery,ClosestLocation,ClosestLocationAddress){
        searchQuery = encodeURI(searchQuery);
        ClosestLocation = encodeURI(ClosestLocation);
        ClosestLocationAddress = encodeURI(ClosestLocationAddress);
        let lat = _LB_Map_ObjInfo_1.nearMe_lat;
        let long = _LB_Map_ObjInfo_1.nearMe_long;
        DomObj.ajax({url:loadFile+`StoreLocatorAnalyticsAPI/search?ClientID=${ID}&searchQuery=${searchQuery}&ClosestLocation=${ClosestLocation}&ClosestLocationAddress=${ClosestLocationAddress}&lat=${lat}&Long=${long}`, 
            success: function(result){
            //do nothing
        }});
    }
    _LB_Map_ObjInfo_1.JsonLD=[];
    _LB_Map_ObjInfo_1.createJsonLD = function(locinfo){
        if(!locinfo.imageUrlLogo_Medium){
            locinfo.imageUrlLogo_Medium = null;
        }
        if(!locinfo.price){
            locinfo.price = null;
        }
        _LB_Map_ObjInfo_1.JsonLD.push({
            "@context": "https://schema.org/",
            "@type": "LocalBusiness",  
            "address": {
                "@type": "PostalAddress",
                "addressLocality": locinfo.locality,
                "addressRegion": locinfo.administrativeArea,
                "postalCode": locinfo.postalCode,
                "streetAddress": locinfo.addressLine1
            },
            "name": locinfo.locationName,  
            "telephone": locinfo.primaryPhone,
            "url": locinfo.websiteUrl,
            "image":locinfo.imageUrlLogo_Medium==null?"":locinfo.imageUrlLogo_Medium,
            "priceRange": locinfo.price==null?"":locinfo.price,  
            });
    }
    _LB_Map_ObjInfo_1.saveJsonLD = function(){
        let head = (document.getElementsByTagName("head")[0] || document.documentElement);
        _LB_Map_ObjInfo_1.JsonLD.forEach(x=>{
            var d = document.createElement("script");
            d.setAttribute("type", "application/ld+json");         
            d.innerHTML+=JSON.stringify(x) + ","
            head.appendChild(d)
        });
    }
    window.addEventListener('message',function(e) {
        if(Debug=="False"){
            return;
        }
        var key = e.message ? 'message' : 'data';
        var data = e[key];
        if(data===""){
            return;
        }
        //alert(data);
        var newSettings = JSON.parse(data);
        newSettings.locations = JSON.parse(JSON.stringify(_LB_Map_ObjInfo_1.StoreLocationInfo.locations)); 
        //Publisher
         
        DomObj("#"+ID + " #LB_BODY").empty();
        _LB_Map_ObjInfo_1.StoreLocationInfo=newSettings;
        _LB_Map_ObjInfo_1.showGoogleMapLoad(newSettings,_LB_Map_ObjInfo_1.map);
        
    },false);
///////////////////////////////////////////////////////////////
function CreateScript(url){
    var mapDom = document.createElement("script");
    mapDom.src = url;
    
    return mapDom;      
}
function CreateCSS(url){
    var css = document.createElement("link");
    css.href = url;
    css.rel="stylesheet";
    css.type="text/css";
    //css.rel="preload";
    return css;      
}
function CreateScriptWithOnLoad(url,onload){
var mapDom = document.createElement("script");
mapDom.src = url;
mapDom.onload = onload;
return mapDom;      
}

function bps_isMobile(){
    return window.outerWidth<=768?true:false
}
})();
                        
                        