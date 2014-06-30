
$(document).ready(function(){

$('.thumbnail').hover(
        function(){
            $(this).parent().find('.caption').slideDown(250); //.fadeIn(250)
        },
        function(){
            $(this).parent().find('.caption').slideUp(250); //.fadeOut(205)
        }
    );


$("#stage").on({
    mouseenter: function () {
$(this).find('.caption').slideDown(250); //.fadeIn(250)
    },
    mouseleave:function () {
$(this).find('.caption').slideUp(250); //.fadeIn(250)
    }
},'li');


    $("#tagcloud a").tagcloud({ 
	size: { 
	    start: 12, 
	    end: 35, 
	    unit: 'px' 
	}, 
	color: { 
	    start: "#88B33A", 
	    end: "#548B2C" 
	} 
    }); 
    
    go_to_page(0);
    $('#indicateurs_search').click(function(event) { event.preventDefault();$(this).val('');$("#indicateurs_search").autocomplete('search',''); return false;});
    $('#documents_search').click(function(event) { event.preventDefault();$(this).val('');$("#documents_search").autocomplete('search',''); return false;});

    $(function() {
	var allPanels = $('.accordion > dd').hide();
	
	$('.accordion > dt > a.expd').click(function() {
	    $this = $(this);
	    $target =  $this.parent().next();
	    
	    if(!$target.hasClass('active')){
		allPanels.removeClass('active').slideUp();
		$target.addClass('active').slideDown();
	    }
	    
	    return false;
	});
    });


    if(System.hasIIndexes){
	System.starcIds=[];
	$(".starc").each(function(){
	    System.starcIds.push({"id":$(this).attr("id").replace(/vote_/g,"").replace(/0_/g,""),"elem":$(this)})
	});
	getIndexQuote(null,System.starcIds);
    }
    //$('.bar2').mosaic({animation:'slide'});

    //startMozaic($('.mosaic-block'));
});


function startMozaic(){
        $('.minfo').click(function(e) {
        System.hoverMap=$(this).attr("id");
           e.preventDefault();
            if($("#moreinfo-dialog")[0])
                $("#moreinfo-dialog").remove();
            $.ajax({
                type: "GET",
                url: "./MapDetails;id="+System.hoverMap,
                complete: function(xml,status) {
var map_details = '<div id="moreinfo-dialog" title="Map details"></div>';
bootbox.dialog({
  message: map_details,
  title: "Map details",
  buttons: {
    view: {
      label: "View map",
      className: "map-btn",
      callback: function() {
	  document.location="./"+System.hoverMap;
      }
    },
    cancel: {
      label: "cancel",
      className: "map-btn",
      callback: function() {
      }
    }
  }
});

$('#moreinfo-dialog').html(xml.responseText);
$('#moreinfo-dialog').show();

//function startMozaic(){
//    arguments[0].hover(function() {
//	System.hoverMap=$(this).parent().attr("id");
//	$(this).append("<div class='mosaic-subbackdrop'><a class='plus' href='#'> + d'info</a></div>");
//	$(this).parent().find(".mosaic-overlay").css({"bottom":"0px"});
//	$('.plus').click(function(e) {
//	    e.preventDefault();
//	    if($("#moreinfo-dialog")[0])
//		$("#moreinfo-dialog").remove();
//	    $.ajax({
//		type: "GET",
//		url: "./MapDetails;id="+System.hoverMap,
//		complete: function(xml,status) {
//
//		    $('<div id="moreinfo-dialog" title="Description détaillée">').appendTo('body');
//		    $('#moreinfo-dialog').append(xml.responseText);
//		    $('#moreinfo-dialog').show(); 
//		    
//		    $( "#moreinfo-dialog" ).window({
//			width:600,
//			height:400,
//			modal: true,
//			draggable:false,
//			collapsible: false,
//			maximizable:false,
//			minimizable:false,
//			resizable:false,
//			onBeforeClose: function(){
//			    $("body").removeClass('stop-scrolling');
//			}
//		    });
//		    $("body").addClass('stop-scrolling');
		}
	    });
	});	  
//    },function() {
//	$(this).parent().find(".mosaic-overlay").css({"bottom":"-130px"});
//	$('.mosaic-subbackdrop').remove();
//  });
}

$("#slideshow > div:gt(0)").hide();

setInterval(function() { 
    $('#slideshow > div:first')
	.fadeOut(1000)
	.next()
	.fadeIn(1000)
	.end()
	.appendTo('#slideshow');
},  2000);

$(function(){
    var tabContainers=$('div.all > div');
    tabContainers.hide().filter(':first').show();
    $(".them").click(function () {
	tabContainers.hide();
	tabContainers.filter(this.hash).show();
	return false;
    }).filter(':first').click();
    $(".home").click(function () {
	tabContainers.hide();
	tabContainers.filter(this.hash).show();
	return false;
    });
    $(".indx").click(function () {
	tabContainers.hide();
	tabContainers.filter(this.hash).show();
	return false;
    });
});


$(function () {
    var tabContainers = $('div.all > div');
    tabContainers.hide().filter(':first').show();
    $('.main-navigation li a').click(function () {
        tabContainers.hide();
        tabContainers.filter(this.hash).show();
        $('.main-navigation a').removeClass('active');
        $(this).addClass('active');
        return false;
    }).filter(':first').click();
});

function previous(){
	new_page = parseInt($('#current_page').val()) - 1;
	if($('.active_page').prev('.page_link').length==true){
		go_to_page(new_page);
	}
}

function next(){
	new_page = parseInt($('#current_page').val()) + 1;
	if($('.active_page').next('.page_link').length==true){
		go_to_page(new_page);
	}	
}

function go_to_page(page_num){
    var show_per_page = 3; 
    var number_of_items = $('#document_counter').val();
    var number_of_pages = Math.ceil(number_of_items/show_per_page);
    $('#current_page').val(page_num);
    $('#show_per_page').val(show_per_page);

    start_from = page_num * show_per_page;
    end_on = start_from + show_per_page;
    var d=new Date();
    $.ajax({
	type: "GET",
	localID: this.length,
	localElement: arguments[0],
	localId: arguments[1],
	url: "./modules/indexes/documents;"+(System.doc_id?"id="+System.doc_id:"offset="+start_from)+"&timestamp="+d.getTime(),
	complete: function(xml,status){
	    $("#documents_container").html(xml.responseText);
	    var navigation_html = "";
	    var current_link = 0;
	    if(number_of_pages > 1){
		navigation_html += '<a class="previous_link" href="javascript:previous();">Prev</a>';
		while(number_of_pages > current_link){
		    navigation_html += '<a class="page_link" href="javascript:go_to_page(' + current_link +')" longdesc="' + current_link +'">'+ (current_link + 1) +'</a>';
		    current_link++;
		}
		navigation_html += '<a class="next_link" href="javascript:next();">Next</a>';
	    }
	    $('#page_navigation').html(navigation_html);
	    $('#page_navigation .page_link:first').addClass('active_page');
	    $('.accordion').children().css('display', 'none');
	    $('.accordion').children('dt').not("dt dd ul li").slice(0, show_per_page).css('display', 'block');
	    if(System.doc_id>=0){
		var tin=0;
		$('.accordion').find("dd").each(function(){
		    if(tin==$("#document_pos").val()){
			$(this).addClass('active').slideDown();
			page_num=$("#document_cpage").val();
		    }
		    tin++;
		});
		System.doc_id=null;
	    }
	    $('.page_link[longdesc=' + page_num +']').addClass('active_page').siblings('.active_page').removeClass('active_page');
	    $('#current_page').val(page_num);
	    var allPanels = $('.accordion > dd');
	    $('.accordion > dt > a.expd').click(function() {
		$this = $(this);
		$target =  $this.parent().next();
		if(!$target.hasClass('active')){
		    allPanels.removeClass('active').slideUp();
		    $target.addClass('active').slideDown();
		}
		
		return false;
	    });

	}
    });    
}



function setIndexQuote(){
    var d=new Date();
    $.ajax({
	type: "GET",
	localID: this.length,
	localElement: arguments[0],
	localId: arguments[1],
	url: zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=np.setIndexQuote&DataInputs=id="+arguments[1]+";quote="+arguments[2]+"&RawDataOutput=Result&timestamp="+d.getTime(),
	complete: function(xml,status){
	    getIndexQuote(this.localElement,this.localId);
	}
    });	 
    
}

System.quotes={};
function getIndexQuote(){
    var d=new Date();
    var la=arguments[0];
    //System.quotes[arguments[1]]={"elem":arguments[0],};
    $.ajax({
	type: "GET",
	localElem: arguments[0],
	url: zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=np.getIndexQuote&DataInputs=id="+arguments[1]+"&RawDataOutput=Result&timestamp="+d.getTime(),
	complete: function(xml,status){
	    $("#"+this.localElem.attr('id')).raty({
		number: 10,
		click: function(score, event) {
		    event.preventDefault();
		    setIndexQuote($(this),$(this).attr("id").replace(/vote_/g,""),score);
		},
		score: xml.responseText
	    });
	}
    });	 
}
