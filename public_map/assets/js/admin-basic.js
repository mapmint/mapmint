// Filename: admin-basic.js


define([
    'jquery', 'metisMenu',
], function($, metisMenu) {

    var initMenu=function(){
	$('#side-menu').metisMenu({ toggle: false });
    };

    var setupMenu=function(isMoved){
	var res=isMoved;
	topOffset = 50;
        width = (this.window.innerWidth > 0) ? this.window.innerWidth : this.screen.width;
        if (width < 768) {
	    $('div.navbar-collapse').addClass('collapse');
	    topOffset = 100; // 2-row-menu
	    $("nav").find("ul.nav").first().children().each(function(){
		$(this).detach().prependTo("#side-menu");
		res=true;
	    });
        } else {
	    $('div.navbar-collapse').removeClass('collapse');
	    if(isMoved)
		$("#side-menu").find("li.dropdown").first().each(function(){
		    $(this).detach().appendTo("#admin-submenu");
		    res=false;
		});
	    //$(this).detach().appendFirst("#side_menu");
        }
	
        height = ((this.window.innerHeight > 0) ? this.window.innerHeight : this.screen.height) - 1;
        height = height - topOffset;
        if (height < 1) height = 1;
        if (height > topOffset) {
	    $("#page-wrapper").css("min-height", (height) + "px");
        }
	return res;
    }
    
    var zoo=null;
    var initialize=function(){

	$('[data-toggle="tooltip"]').tooltip();

	//if(arguments.length==0 || arguments[0])
	initMenu();

	var isMoved=false;
	isMoved=setupMenu(isMoved);

	$(window).bind("resize", function() {
	    isMoved=setupMenu(isMoved);
	});

	var url = window.location;

	var element = $('ul.nav a').filter(function() {
	    return (this.href[this.href.length-1] !== "#" && ( this.href == url || url.href.indexOf(this.href) == 0 ));
	}).addClass('active').parent().parent().addClass('in').parent();

	if (element.is('li')) {
            element.addClass('active');
	}
	if(arguments[0]){
	    zoo=arguments[0];
	    bindUserPreferences();
	    bindUserLogOut();
	}
    }

    function bindUserLogOut(){
	$("#mmmUserLogOut").off("click");
	$("#mmmUserLogOut").click(function(){
	    zoo.execute({
		identifier: "authenticate.logOut",
		type: "POST",
		dataInputs: [],
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
		    $(".notifications").notify({
			message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
			type: 'danger',
		    }).show();
		}
	    });
	    return false;
	});
    }

    function bindUserPreferences(){
	$("#mmmUserPreferences").off("click");
	$("#mmmUserPreferences").click(function(){
	    console.log("ok");
	    zoo.execute({
		identifier: "template.display",
		type: "POST",
		dataInputs: [
		    {"identifier": "tmpl","value": "UsersManagement/UserForm","dataType":"string"},
		    {"identifier": "type","value": "update","dataType":"string"},
		    {"identifier": "pref","value": "true","dataType":"boolean"},
		],
		dataOutputs: [
		    {"identifier":"Result","type":"raw"},
		],
		success: function(data){
		    $('#userPreferencesModal').find(".modal-body").children().first().html(data);
		    $('#userPreferencesModal').find(".modal-body").children().first().children().first().collapse('show');
		    $('#userPreferencesModal').find("#up_cp").off("change");
		    $('#userPreferencesModal').find("#up_cp").change(function(e){
			e.preventDefault();
			e.stopPropagation();
			if($(this).is(":checked"))
			    $(this).parent().next().addClass("in");
			else
			    $(this).parent().next().removeClass("in");
			return false;
		    });
		    $("#userPreferencesModal").find("#update-user-preferences").find('button').last().off('click');
		    $("#userPreferencesModal").find("#update-user-preferences").find('button').last().click(function(){
			var ltype="user";
			var reg0=new RegExp(ltype+'_',"g");
			var reg1=new RegExp(ltype+'s_',"g");
			var params=[];
			var set={};
			$(this).parent().find("input").each(function(){
			    if($(this).attr('id')=="um_utype"){
				rType=$(this).val();
				params.push({identifier: "type",value: $(this).val(),dataType: "string"});
				if(rType=="insert"){
				    if(ltype=="user")
					pIdentifier="manage-users.AddUser";
				    attId=ltype;
				}
			    }
			    else{
				if($(this).attr("name")){
				    if($(this).attr("name")!="id"){
					if($(this).is(":visible")){
					    if($(this).attr("type")=="checkbox"){
						set[$(this).attr("name").replace(reg0,"")]=$(this).is(":checked");
					    }
					    else
						set[$(this).attr("name").replace(reg0,"")]=$(this).val();
					}
					else{
					    console.log("OK 0");
					    console.log($(this));
					    console.log($(this).val());
					}
				    }
				    else{
					if($(this).val()!="")
					    params.push({identifier: "clause",value: 'id='+$(this).val().replace(reg1,""),dataType: "string"});
				    }
				}
			    }
			});
			params.push({identifier: "set",value: JSON.stringify(set),mimeType: "application/json"});
			params.push({identifier: "login",value: set.login,dataType: "string"});
			zoo.execute({
			    identifier: "manage-users.UpdateUser",
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
				$("#userPreferencesModal").modal("hide");
			    },
			    error: function(data){
				console.log(data);
				$(".notifications").notify({
				    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
				    type: 'danger',
				}).show();
			    }
			});
			return false;
		    });
		    $("#userPreferencesModal").modal("show");
		    
		},
		error: function(data){
		    $(".notifications").notify({
			message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
			type: 'danger',
		    }).show();
		}
	    });

	});
    }

    function typeaheadMap(module,zoo,elem,extra,onLoad){
	var substringMatcher = function(strs) {
	    return function findMatches(q, cb) {
		var matches, substringRegex;
		
		// an array that will be populated with substring matches
		matches = [];
		
		// regex used to determine if a string contains the substring `q`
		substrRegex = new RegExp(q, 'i');
		    
		// iterate through the pool of strings and for any string that
		// contains the substring `q`, add it to the `matches` array
		$.each(strs, function(i, str) {
		    if (substrRegex.test(str)) {
			matches.push(str);
		    }
		});
		
		if(matches.length==0)
		    $.each(strs, function(i, str) {
			matches.push(str);
		    });
		cb(matches);
	    };
	};
	$.ajax({
	    url: module.config().url+"?request=Execute&service=WPS&version=1.0.0&Identifier=mapfile.listMap&RawDataOutput=Result&DataInputs="+(extra?extra:""),
	    method: 'GET',
	    dataType: "json",
	    success: function(data){
		var resultSet=[];
		//data=JSON.loads(data);
		//console.log(data);
		for(var i=0;i<data.length;i++){
		    resultSet.push(data[i]["id"]);
		}
		//console.log(resultSet);
		var loadButton=elem[0].next().find("button").first();
		loadButton.click(function(e){
		    if(!$(this).hasClass("disabled")){
			if(!onLoad)
			    loadMap(zoo,[elem[0].val(),elem[1].val()]);
			else
			    onLoad(zoo,[elem[0].val(),elem[1].val()]);
		    }
		});
		
		elem[0].typeahead(null,{                       
		    name: 'Search-Project',
		    source: substringMatcher(resultSet)
		}).on("typeahead:selected", function(obj, datum, name) {
		    //console.log(obj, datum, name);
		    loadButton.removeClass("disabled");
		});
		
	    }
	});	
    }
    /** 
     * 
     */
    function loadMap(zoo,val,func){
	var inputs=[];
	var names=["map","mapOrig"];
	for(var i=0;i<2;i++)
	    inputs.push({
		"identifier": names[i],
		"value": val[i],
		"dataType": "string"
	    });
	(function(func){
	    zoo.execute({
		identifier: "mapfile.saveMap",
		type: "POST",
		dataInputs: inputs,
		dataOutputs: [
		    {"identifier":"Result","type":"raw"},
		],
		success: function(data){
		    console.log("SUCCESS");
		    console.log(data);
		    $(".notifications").notify({
			message: { text: data },
			type: 'success',
		    }).show();
		    if(func)
			func();
		    else
			document.location.reload(false);
		},
		error: function(data){
		    console.log("ERROR");
		    $(".notifications").notify({
			message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
			type: 'danger',
		    }).show();
		}
	    });
	})(func);
    }

    /**
     *
     */
    function complex(action,elem){
	var lbindings=operations[action]["bindings"];
	var params=[];
	var inputs=[];
	var rootLocation=elem.parent();
	rootLocation.find(operations[action]["selector"]).each(function(){
	    if($(this).is(":visible") && !$(this).is(":disabled"))
		params.push({"id":$(this).attr('name'),"value": $(this).val()});
	});
	for(var i in lbindings){
	    for(var j in params){
		if(params[j].id==i){
		    if(operations[action]["multiple"]!=i)
			inputs.push({
			    "identifier": lbindings[i],
			    "value": params[j].value,
			    "dataType": "string"
			});
		    else{
			var values=params[j].value;
			for(var k in values)
			    inputs.push({
				"identifier": lbindings[i],
				"value": values[k],
				"dataType": "string"
			    });
			
		    }
		    break;
		}
	    }
	}
	inputs.push({
	    "identifier": "map",
	    "value": $("#save-map").val(),
	    "dataType": "string"
	});
	console.log(inputs);
	zoo.execute({
	    identifier: operations[action]["identifier"],
	    type: "POST",
	    dataInputs: inputs,
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		console.log("SUCCESS");
		console.log(data);
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
		if(operations[action]["hide"][0]){
		    var myElem=elem;
		    for(var i=0;i<operations[action]["hide"][1];i++)
			myElem=myElem.parent();
		    myElem.addClass("hide");
		}
		if(operations[action]["reload"][0] && operations[action]["reload"].length==1){
		    unloadMapLayers();
		    loadMapLayers();
		}else
		    if(operations[action]["reload"][0] && operations[action]["reload"][1]){
			operations[action]["reload"][1]();
		    }
	    },
	    error: function(data){
		console.log("ERROR");
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
	return false;
    }

    /**
     *
     */
    function basic(zoo,action,elem){
	var inputs=[];
	inputs.push({
	    "identifier": "map",
	    "value": module.config().pmapfile,
	    "dataType": "string"
	});
	inputs.push({
	    "identifier": operations[action]["bindings"],
	    "value": (elem?elem.val():selectedLayer),
	    "dataType": "string"
	});
	zoo.execute({
	    identifier: operations[action]["identifier"],
	    type: "POST",
	    dataInputs: inputs,
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		console.log("SUCCESS");
		console.log(data);
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
		if(operations[action]["hide"][0]){
		    var myElem=elem;
		    for(var i=0;i<operations[action]["hide"][1];i++)
			myElem=myElem.parent();
		    myElem.addClass("hide");
		}
		unloadMapLayers();
		loadMapLayers();
	    },
	    error: function(data){
		console.log("ERROR");
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
    }

    // Return public methods
    return {
        initialize: initialize,
	loadMap: loadMap,
	typeaheadMap: typeaheadMap
    };



});

    
