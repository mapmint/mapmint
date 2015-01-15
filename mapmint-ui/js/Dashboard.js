Dashboard=MLayout.extend();
Dashboard.define({
  id: 0,
  layoutOptions: {
      contentSelector: ".lcontent",
     center__paneSelector: ".inner-center",
	west__paneSelector:   ".inner-west",
	west__size:           .28,
	west__closable:	      false,
	west__draggable:	  false,
	west__resizable: false,
	east__paneSelector:   ".inner-east",
	east__size:           .28,
	east__closable:	      false,
	east__draggable:	  false,
	east__resizable: false,
	spacing_open:         4,
	spacing_closed:       4,
	//resizeWhileDragging:  true,
	onopen: function() {updateSize();},
	onclose: function() {updateSize();},
	onresize: function() {updateSize();}
    },      
  initialize: function(){
      $('.maincfg1,.maincfg2,.maincfg3').button({text: false});
      var tmpConfMap={
        main: {},
	identification: {},
	provider: {}
      };
      this.refresh();

      
      this.id++;
    },
  refresh: function(){
      $('.maincfg1,.maincfg2,.maincfg3, .start-stop').button({text: false});
      $('.toolbar a').tipsy({fade: true, offset:3, opacity: 1, gravity: 'nw'});
      $( "a.save-config" ).button();
      $( "#nav li a" ).button();
      $( ".nb-container p a" ).button();
      var tabContainers = $('div.tabs-left > div');
      tabContainers.hide().filter(':first').show();
      $('div.toolbar a').click(function () {
	  if(this.id!="saveConf"){
	    tabContainers.hide();
	    tabContainers.filter(this.hash).show();
	  }else{
	    saveConf(cTab);
	  }
	}).filter(':first').click();
      defaultInit();
    }
  });

System.has_dstats=false;
function diskUsage(){
    $.ajax({
	url: "./Dashboard/DiskUsage",
	complete: function(xml,status){
	    $('#slocal_stats_body').append(xml.responseText);
	    System.has_dstats=true;	    
	}
    });
}

SrsManager=Class.create({
    initializeWindow: function(){
	$.ajax({
	    url: "./Projections",
	    complete: function(xml,status){
		if(!$('#SrsManager-dialog')[0])
		    $("body").append('<div id="SrsManager-dialog" title="'+System.messages["SRS Manager"]+'"></div>');
		$('#SrsManager-dialog').html("");
		$('#SrsManager-dialog').append(xml.responseText);
		$(".combo").click(function(){
		    System.currentField="";
		    $(this).parent().find("select").each(function(){
			System.currentField=$(this).attr('id');
		    });
		});
		$(".combo-panel").click(function(){
		    $("#"+System.currentField).next().find(".combo-text").each(
			function(){
			    System.currentSelection=$(this).val();
			}
		    );
		    System.sid=0;
		    $("#"+System.currentField).find("option").each(
			function(){
			    if($(this).val()==System.currentSelection){
			    	SrsManager.isFav();
				$("#tags"+(System.currentField=="tags"?"1":"")).next().find(".combo-text").each(function(){
				    $(this).val(
					$("#tags"+(System.currentField=="tags"?"1":""))[0].options[System.sid].value
				    );
				});
			    }
			    System.sid+=1;
			}
		    );
		});
		System.srsHasChanged=false;
		$('#SrsManager-dialog').window({
		    width: 325,
		    height: 220,
		    maximizable:false,
		    resizable: false,
		    onClose: function(){
			if(System.srsHasChanged)
			    document.location.reload(false);
		    }
		});
	    }
	});
    },
    isFav: function(){
	var val="";
	$("#"+System.currentField).next().find("input.combo-value").each(function(){val=$(this).val();})
	$.ajax({
	    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=datastores.isFavSrs&DataInputs=srs_field="+(System.currentField=="tags"?"name":"id")+";srs_id="+val+";fav="+$("#prjfav").is(":checked")+"&RawDataOutput=Result",
	    complete: function(xml,status){
		if(checkWPSResult(xml,false))
		    $("#prjfav").prop( "checked", eval(xml.responseText));
	    }
	});
    },
    updateFav: function(){
	var val="";
	$("#"+System.currentField).next().find("input.combo-value").each(function(){val=$(this).val();})
	$.ajax({
	    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=datastores.saveFavSrs&DataInputs=srs_field="+(System.currentField=="tags"?"name":"id")+";srs_id="+val+";fav="+$("#prjfav").is(":checked")+"&RawDataOutput=Result",
	    complete: function(xml,status){
		if(checkWPSResult(xml))
		    System.srsHasChanged=true;
	    }
	});
    }
});

var tabs={};
var cTab;

function loadTab(){
    cTab=arguments[0];
    tabs[cTab]="";
    $.ajax({
      cache: false,
      type: "GET",
      url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=configuration.GetConf&DataInputs=section="+arguments[0]+"&RawDataOutput=Result",
      dataType: "xml",
      complete: function(xml,status) {
          $('#progress_bar .ui-progress').css('width', '65%');
          eval("var tmp="+xml.responseText+";");
          tabs[cTab]=tmp;
          $('#progress_bar .ui-progress').css('width', '85%');
          for(var t in tmp)
              if($("#"+t)[0]){
                  $("#"+t).val(tmp[t]);
		  if(t=="abstract"){
		    if (CKEDITOR.instances[t]) { CKEDITOR.instances[t].destroy(true); }
		    CKEDITOR.replace(t,{
			skin : 'v2',
			entities: false,
			basicEntities: false,
			toolbar:[
			    { name: 'document', items : [ 'Source','NewPage','Preview' ] },
			    { name: 'clipboard', items : [ 'Cut','Copy','Paste','PasteText','PasteFromWord','-','Undo','Redo' ] },
			    { name: 'editing', items : [ 'Find','Replace','-','SelectAll','-','Scayt' ] },
			    '/',
			    { name: 'insert', items : [ 'Image','Flash','Table','HorizontalRule','Smiley','SpecialChar','PageBreak','Iframe' ] },
			    { name: 'styles', items : [ 'Styles','Format' ] },
			    '/',
			    { name: 'basicstyles', items : [ 'Bold','Italic','Strike','-','RemoveFormat' ] },
			    { name: 'paragraph', items : [ 'NumberedList','BulletedList','-','Outdent','Indent','-','Blockquote' ] },
			    { name: 'links', items : [ 'Link','Unlink','Anchor' ] },
			    { name: 'colors', items : [ 'TextColor','BGColor' ] },
			    { name: 'tools', items : [ 'Maximize'] }
			]
		    });
		  }
	      }
          $('#progress_bar .ui-progress').css('width', '95%');
          $('#progress_bar .ui-progress').animateProgress(100, function() {
                $('#progress_bar .ui-progress').fadeOut(1000);
                });
	  endLoading();

        }
      });
}  

function saveConf(){
  var args={};
  var tmp=[];
  tmp[tmp.length]={name: "section",value: arguments[0],dataType: "string"};
  for(var i in tabs[arguments[0]]){
    if($("#"+i)[0]){
	if(i!="abstract")
	    tmp[tmp.length]={name: i,value: $("#"+i).val(),dataType: "string"};
	else
	    tmp[tmp.length]={name: i,value: CKEDITOR.instances[i].getData(),dataType: "string"};
    }
  }
  try{
   var data=WPSGetHeader("configuration.SaveConf")+WPSGetInputs(tmp)+WPSGetOutput({name: "Result"})+WPSGetFooter();
    $.ajax({
      type: "POST",
	  url: System.zooUrl,
	  contentType: 'text/xml',
	  data: data,
	  complete: function(xml,status) {
	  try{
	    loadTab(cTab);
	  }catch(e){alert(e);}
        }
      });
  }catch(e){alert(e);}
  return false;
}


