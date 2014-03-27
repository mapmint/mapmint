var tabContainers;
Styler=MLayout.extend();
Styler.define({
  initialize: function(){
 	  	$("input:checkbox, input:radio, input:file").uniform();
  	$('.toolbar a').tipsy({fade: true, offset:3, opacity: 1, gravity: 'nw'});	
  	
    },
  refresh: function(){
  	

  	
  	 $('.save-style').button({text: false});
  	  	$(function () {

  		tabContainers = $('div.tabs-styler > div');
  		$('.toolbar a').click(function () {
  			tabContainers.hide();
  			tabContainers.filter(this.hash).show();
  		}).filter(':first').click();
  	}); 
  	  	tabContainers.hide().filter(':first').show();
  		$('.point, .line, .polygon').button({text: false});                         
                        
	$(".dropdown dt a").click(function() {
		$(".dropdown dd ul").show('slow');
	});
	
		$('.dropdown dd').mouseleave(function() {
	$(".dropdown dd ul").hide();
});
	$(".dropdown dd ul li a").click(function() {
		var text = $(this).html();
		$(".dropdown dt a span").html(text);
		$(".dropdown dd ul").hide();
});

	$(".dropdown-fill dt a").click(function() {
		$(".dropdown-fill dd ul").show('slow');
	});
	
	$('.dropdown-fill dd ul').mouseleave(function() {
	$(".dropdown-fill dd ul").hide();
});

	$(".dropdown-fill dd ul li a").click(function() {
		var text = $(this).html();
		$(".dropdown-fill dt a span").html(text);
		$(".dropdown-fill dd ul").hide();
});

	$(".dropdown-stroke dt a").click(function() {
		$(".dropdown-stroke dd ul").show('slow');
	});
	
			$('.dropdown-stroke dd ul').mouseleave(function() {
	$(".dropdown-stroke dd ul").hide();
});
	$(".dropdown-stroke dd ul li a").click(function() {
		var text = $(this).html();
		$(".dropdown-stroke dt a span").html(text);
		$(".dropdown-stroke dd ul").hide();
});


$('#colorpickerHolder').ColorPicker({flat: true});

$('#colorpickerHolder1').ColorPicker({
			flat: true,
			color: '#00ff00',
			onSubmit: function(hsb, hex, rgb) {
				$('#colorSelector1 div').css('backgroundColor', '#' + hex);
			}
		});
		$('#colorpickerHolder1>div').css('position', 'absolute');
		var widt = false;
		$('#colorSelector1').bind('click', function() {
			$('#colorpickerHolder1').stop().animate({height: widt ? 0 : 173}, 500);
			widt = !widt;
		});

		$('#colorpickerHolder2').ColorPicker({
			flat: true,
			color: '#00ff00',
			onSubmit: function(hsb, hex, rgb) {
				$('#colorSelector2 div').css('backgroundColor', '#' + hex);
			}
		});
		$('#colorpickerHolder2>div').css('position', 'absolute');
		var widt = false;
		$('#colorSelector2').bind('click', function() {
			$('#colorpickerHolder2').stop().animate({height: widt ? 0 : 173}, 500);
			widt = !widt;
		});
		
		$('#colorpickerHolder3').ColorPicker({
			flat: true,
			color: '#00ff00',
			onSubmit: function(hsb, hex, rgb) {
				$('#colorSelector3 div').css('backgroundColor', '#' + hex);
			}
		});
		$('#colorpickerHolder3>div').css('position', 'absolute');
		var widt = false;
		$('#colorSelector3').bind('click', function() {
			$('#colorpickerHolder3').stop().animate({height: widt ? 0 : 173}, 500);
			widt = !widt;
		});
		
		$('#colorpickerField1, #colorpickerField2, #colorpickerField3').ColorPicker({
			onSubmit: function(hsb, hex, rgb, el) {
				$(el).val(hex);
				$(el).ColorPickerHide();
			},
			onBeforeShow: function () {
				$(this).ColorPickerSetColor(this.value);
			}
		})
		.bind('keyup', function(){
			$(this).ColorPickerSetColor(this.value);
		});
		$('#colorSelector').ColorPicker({
			color: '#0000ff',
			onShow: function (colpkr) {
				$(colpkr).fadeIn(500);
				return false;
			},
			onHide: function (colpkr) {
				$(colpkr).fadeOut(500);
				return false;
			},
			onChange: function (hsb, hex, rgb) {
				$('#colorSelector div').css('backgroundColor', '#' + hex);
			}
		});


$(function() {
		$( "#slider-opacity" ).slider({
			value:100,
			min: 0,
			max: 100,
			step: 1,
			slide: function( event, ui ) {
				$( "#amount" ).val(ui.value +  "%" );
			}
		});
		$( "#amount" ).val( $( "#slider-opacity" ).slider( "value" ) + "%" );
	});


    }
  });