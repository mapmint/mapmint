// Filename: login.js


define([
    'module', 'jquery', 'zoo','notify' 
], function(module, $,Zoo,notify) {
    
    var zoo = new Zoo({
        url: module.config().url,
        delay: module.config().delay,
	language: module.config().language
    });

    function createParam(obj){
	return {
	    "identifier": $(obj).attr("name"),
	    "value": $(obj).val(),
	    "dataType": "string"
	}
    }

    function react(obj){
	console.log($(obj).parent());
	console.log($(obj).parent().parent().parent());
	var myRoot=null;
	if($(obj).parent().is("form"))
	    myRoot=$(obj).parent();
	else
	    myRoot=$(obj).parent().parent().parent();
	var serviceName=$(obj).data("service");
	var params=[];
	myRoot.find("input").each(function(){
	    console.log($(this).attr("type"));
	    if($(this).attr("type")!="submit"){
		if($(this).attr("type")=="checkbox"){
		    if($(this).is(":checked"))
			params.push(createParam(this));
		}else{
		    params.push(createParam(this));
		}
	    }
	});
	zoo.execute({
	    identifier: "authenticate."+serviceName,
	    type: "POST",
	    dataInputs: params,
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
		document.location.reload(false);
	    },
	    error: function(data){
		console.log(data);
		if($.isArray(data["ExceptionReport"]["Exception"])){
		    for(var i=0;i<data["ExceptionReport"]["Exception"].length;i++)
			$(".notifications").notify({
			    message: { text:  data["ExceptionReport"]["Exception"][i]["ExceptionText"] },
			    type: 'danger',
			}).show();
		}
		else
		    $(".notifications").notify({
			message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"] },
			type: 'danger',
		    }).show();
	    }
	});
	return false;
    }

    var initialize=function(){
	console.log("Start application");
	$(".bg_load").fadeOut("slow");
	$(".bg_load_wrapper").fadeOut("slow");
	$("form").on("submit",function(){
	    var closure=$(".btn-lg");
	    return react(closure);
	});
	$(".btn-lg").on("click",function(){
	    return react(this);
	});
    };

    // Return public methods
    return {
        initialize: initialize
    };



});

