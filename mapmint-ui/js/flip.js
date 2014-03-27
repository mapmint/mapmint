function bindNews(){
    $('.news').click(function(e){
	if($(this)[0].id)
	    $.ajax({
		type: "GET",
		url: "./modules/news/display;back=true;id="+$(this)[0].id.replace(/news_/g,""),
		dataType: "xml",
		complete: function(xml,status) {
		    $('#news_display').html(xml.responseText);
		    $('#news_block').toggleClass('flipped');
		    if(!$.support.css3d){
			$('#main_content_bg').toggle();
		    }
		    e.preventDefault();
		}
	    });
	else{
	    $('#news_block').toggleClass('flipped');
	    if(!$.support.css3d){
		$('#main_content_bg').toggle();
	    }
	    e.preventDefault();
	}
    });
}

function loadIPage(){
    $.ajax({
	type: "GET",
	url: "./ipage;back=true;idp="+arguments[0],
	dataType: "xml",
	complete: function(xml,status) {
	    $('#main_content_bg').html(xml.responseText);
	    /*$('#m_content').toggleClass('flipped');
	    if(!$.support.css3d){*/
	    $('#main_content').toggle();
	    $('#main_content_bg').toggle();
	    /*}*/
	    /*$(".home").click(function () {
		tabContainers.hide();
		tabContainers.filter(this.hash).fadeIn();
		return false;
	    });*/

	}
    });
}

$(function(){
    $.support.css3d = supportsCSS3D();
    var formContainer = $('#formContainer');
    /*$('.flipLink').click(function(e){
	formContainer.toggleClass('flipped');
	if(!$.support.css3d){
	    $('#login').toggle();
	}
	e.preventDefault();
    });*/
    bindNews();

    formContainer.find('form').submit(function(e){
	e.preventDefault();
    });
    
    function supportsCSS3D() {
	var props = [
	    'perspectiveProperty', 'WebkitPerspective', 'MozPerspective'
	], testDom = document.createElement('a');
	
	for(var i=0; i<props.length; i++){
	    if(props[i] in testDom.style){
		return true;
	    }
	}
	return false;
    }
});
