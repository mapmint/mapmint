System.initialIndexCnt=0

$(document).ready(function(){

    searchTable("indicators");
    searchTable1("documents");

    var items = $('\#stage li'),
    itemsByTags = {};
    
    // Looping though all the li items:
    
    items.each(function(i){
	var elem = $(this),
	tags = elem.data('tags').split(',');
	
	// Adding a data-id attribute. Required by the Quicksand plugin:
	elem.attr('data-id',i);
	
	$.each(tags,function(key,value){
	    
	    // Removing extra whitespace:
	    value = $.trim(value);
	    
	    if(!(value in itemsByTags)){
		// Create an empty array to hold this item:
		itemsByTags[value] = [];
	    }
	    
	    // Each item is added to one array per tag:
	    itemsByTags[value].push(elem);
	});
	
    });
    
    // Creating the "Everything" option in the menu:
    createList(System.messages['All themes'],items);
    
    // Looping though the arrays in itemsByTags:
    $.each(itemsByTags,function(k,v){
	createList(k,v);
    });
    
    $('#filter a').click(function(e){
	var link = $(this);
	
	link.addClass('active').siblings().removeClass('active');
	
	// Using the Quicksand plugin to animate the li items.
	// It uses data('list') defined by our createList function:
	$('#stage').quicksand( $('#stage').find('li'),
        {
          useScaling: true,
          adjustHeight: 'dynamic',
          attribute: function(v) {
            return $(v).find('img').attr('src');
          }
        });
	$('#stage').quicksand(link.data('list').find('li'),function(){
	    startMozaic($('.mosaic-block'));
	});
	e.preventDefault();
    });
    link=$('#filter a:first');
    link.addClass('active').siblings().removeClass('active');
    link.trigger("click");

    function createList(text,items){
	
	// This is a helper function that takes the
	// text of a menu button and array of li items
	
	// Creating an empty unordered list:
	var ul = $('<ul>',{'class':'hidden'});
	
	$.each(items,function(){
	    // Creating a copy of each li item
	    // and adding it to the list:
	    
	    $(this).clone().appendTo(ul);
	});
	
	ul.appendTo('#container');
	
	// Creating a menu item. The unordered list is added
	// as a data parameter (available via .data('list'):
	if(text!="")
	    var a = $('<a>',{
		html: text,
		href:'#',
		data: {list:ul}
	    }).appendTo('#filter');
    }

    //refreshIndexDisplay();
    if(System.hasIndexes)
	setCurrentIndex();
});

function setCurrentIndex(){
  params=[{name: "id", value: $("#index_id").val(), dataType: "string"}];
  data=WPSGetHeader("np.setCurrentIndex")+WPSGetInputs(params)+WPSGetOutput({"name": "Result"})+WPSGetFooter();
  $.ajax({
    type: "POST",
    contentType: "text/xml",
    url: System.zooUrl,
    data: data,
    complete: function(xml,status) {
	if(checkWPSResult(xml,false,false)){
	    if(System.nodeId)
		$("#vote_0_"+System.nodeId).attr("id","vote_0_"+$("#index_id").val());
	    System.starcIds=[];
	    System.nodeId=$("#index_id").val();
	    $("#vote_0_"+System.nodeId).each(function(){
		System.starcIds.push({"id":$("#index_id").val(),"elem":$(this)});
		getIndexQuote($(this),System.starcIds);
	    });
	    var tmp=$.parseJSON(xml.responseText);
	    System.full_index=tmp;
	    var typs=[
		["description", "idx_desc"],
		["name", "idx_title"]
	    ];
	    if(!tmp["file"] || tmp["file"]==""){
		if(!tmp["url"] || tmp["url"]==""){
		    $('#indicateur_file_link').attr("href",tmp['url']);
		    $('#indicateur_file_link').hide();
		}
		else{
		    $('#indicateur_file_link').attr("href",tmp['url']);
		    $('#indicateur_file_link').show();
		}
	    }
	    else{
		$('#indicateur_file_link').attr("href",System.public_map_url+"/indicateurs/"+tmp['file']);
		$('#indicateur_file_link').show();
	    }

	    for(i=0;i<typs.length;i++){
		if(tmp[typs[i][0]])
		    $("#"+typs[i][1]).html(tmp[typs[i][0]]);
		else
		    $("#"+typs[i][1]).html("");
	    }
	    tmp0=$("#idx_ov").attr("src");
	    $("#idx_ov").attr("src",tmp0.replace(new RegExp("idx"+System.initialIndex,"g"),"idx"+$("#index_id").val()).replace(new RegExp("PIndex"+System.initialIndex,"g"),"PIndex"+$("#index_id").val()));
	    System.initialIndex=$("#index_id").val();
	    refreshIndexDisplay();
	    System.nodeId=$("#index_id").val();
	    
	}
      }
    });
}

function refreshIndexDisplay(){
  params=[{name: "id", value: $("#index_id").val(), dataType: "string"}];
  data=WPSGetHeader("np.getIndexDisplayJs")+WPSGetInputs(params)+WPSGetOutput({"name": "Result"})+WPSGetFooter();
  $.ajax({
    type: "POST",
    contentType: "text/xml",
    url: System.zooUrl,
    data: data,
    complete: function(xml,status) {
	if(checkWPSResult(xml,false)){
	  try{
	      colModel=$.parseJSON(xml.responseText);
	      fields=new Array();
	      for(i=0;i<colModel["values"].length;i++)
		  fields.push(colModel["values"][i].name);
	      $("#tblDisplay").html('<div id="flexi_index"></div>');
	      $("#flexi_index").flexigrid({
		  autoload: true,
		  ogcProtocol: "MM",
		  url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=np.getIndexValues&RawDataOutput=Result&DataInputs=id="+$('#index_id').val(),
		  id: "PG",
		  singleSelect: true,
		  colModel: colModel["values"],
		  usepager: true,
		  sortname: colModel["ord"],
		  sortorder: "asc",
		  fields: fields,
		  dwDataSource: "Toto",
		  dwLayer: "Tata",
		  title: colModel["title"],
		  useLimit: true,
		  autozoom: false,
		  limit: 10,
		  showTableToggleBtn: true,
		  width: "100%",
		  height: 290,
		  onSuccess: function(){ 
		      System.doOnGraphLoad=function(){
			  refreshGraph($("#index_id").val());
			  System.initialIndexCnt+=1;
		      };
		      refreshGraphFields(); 
		  }
	      });
	  }catch(e){
	      //alert(e);
	  }

	}
      }
    });

}

function displayIndexPage(){
    var tabContainers = $('div.all > div');
    tabContainers.hide();
    tabContainers.filter($(".indx")[0].hash).fadeIn();
    $('.main-navigation a').removeClass('current');
    $(".indx").addClass('current');
}
