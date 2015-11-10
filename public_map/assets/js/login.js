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
	var params=[];
	$(obj).parent().find("input").each(function(){
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
	    identifier: "authenticate.logIn",
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
	$("form").on("submit",function(){
	    var closure=$(".btn-lg");
	    return react(closure);
	});
	$(".btn-lg").on("click",function(){
	    return react(this);
	    /*var params=[];
	    $(this).parent().find("input").each(function(){
		if($(this).attr("type")=="checkbox"){
		    if($(this).is(":checked"))
			params.push(createParam(this));
		}else{
		    params.push(createParam(this));
		}
	    });
	    zoo.execute({
		identifier: "authenticate.logIn",
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
		    $(".notifications").notify({
			message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
			type: 'danger',
		    }).show();
		}
	    });
	    return false;*/
	});
    };

    // Return public methods
    return {
        initialize: initialize
    };



});

