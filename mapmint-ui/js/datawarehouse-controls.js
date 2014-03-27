  $(function() {
    
    $('a.tool').tipsy({fade: true, offset:3, opacity: 1, gravity: 'nw'});
    
        
  });
  
  $(function() {
           
      $(".error").click(function(){
        $.notifyBar({ cls: "error", html: "error occured" });
      });
      $(".success").click(function(){
        $.notifyBar({ cls: "success", html: "operation sucessful" });
      });
       $(".common").click(function(){
        $.notifyBar({ cls: "common", html: "<p class='load'>Chargement <img src='img/loadingbar.gif' /></p>" });
      });
 
});






$(function() {




    	$('.maincfg1').button({
			text: false
		});
		
    	$('.maincfg2').button({
			text: false
		});
		
		$('.db').button({
			text: false	
		}).click(function() {
		$( ".dialog-postgis" ).dialog("open");
		});
		
		$('.pg-db').button({
			text: false	
		}).click(function() {
		$( ".dialog-postgis-new" ).dialog("open");
		});
	
	
		$('.dir').button({
			text: false
		});
		$('.add-layer-vector').button({
			text: false
		});
		$('.add-layer-raster').button({
			text: false
			}).click(function() {
		$( "#dialog1" ).dialog('open');
		});
		
		
		$('.add-layer-wfs').button({
			text: false
			}).click(function() {
		$( ".dialog-wfs" ).dialog("open");
		});
		
		$('.wfs-new').button({
			text: false	
		}).click(function() {
		$( ".dialog-wfs-new" ).dialog("open");
		});
		
		$('.add-layer-wms').button({
			text: false
					}).click(function() {
		$( ".dialog-wms" ).dialog("open");
		});
		
		$('.wms-new').button({
			text: false	
		}).click(function() {
		$( ".dialog-wms-new" ).dialog("open");
		});
		
		$('.add-layer-wcs').button({
			text: false
		})

		
		$('.get-layer-info').button({
			text: false
		})
		
		$('.export-layer').button({
			text: false
		})
		
			$('.delete-layer').button({
			text: false
		})
		
		$( ".f" ).button();
		$( ".start-stop" ).button();
		
		
		

		
		$('#forward').button({
			text: false,
			icons: {
				primary: 'ui-icon-seek-next'
			}
		});
		$('#end').button({
			text: false,
			icons: {
				primary: 'ui-icon-seek-end'
			}
		});
		$("#shuffle").button();
		$("#repeat").buttonset();
	});


