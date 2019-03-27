// Filename: login.js


define([
    'module', 'jquery', 'zoo','notify', 'metisMenu', 'summernote', 'xml2json','typeahead', 'adminBasic', 'ol','datasources','mmDataTables','rowReorder','colorpicker','slider',"sortable"
], function(module, $,Zoo,notify, metisMenu, summernote, X2JS,typeahead,adminBasic,ol,datasources,MMDataTable,rowReorder,colorpicker,slider,sortable) {
    

    (function(){
	var methods = ['addClass', 'removeClass'];
	
	$.each(methods, function (index, method) {
	    var originalMethod = $.fn[method];
	    
	    $.fn[method] = function () {
		var oldClass = this.className;
		var result = originalMethod.apply(this, arguments);
		var newClass = this.className;
		this.trigger(method, [oldClass, newClass]);	    
		return result;
	    };
	});
	
    })();

    var _x2js = new X2JS({
        arrayAccessFormPaths: [
            'ProcessDescriptions.ProcessDescription.DataInputs.Input',
            'ProcessDescriptions.ProcessDescription.DataInputs.Input.ComplexData.Supported.Format',
            'ProcessDescriptions.ProcessDescription.ProcessOutputs.Output',
            'ProcessDescriptions.ProcessDescription.ProcessOutputs.Output.ComplexOutput.Supported.Format',
            'Capabilities.ServiceIdentification.Keywords'
        ],   
    });
    
    var zoo = new Zoo({
        url: module.config().url,
        delay: module.config().delay,
	language: module.config().language
    });

    var llevels=["first","second","third","forth"];
    var llevelInit=false;
    var reg0=new RegExp("themes_","");

    function addToThemes(oid,data,level,init){
	var toActivate=-1;
	var cnt=0;
	for(var id=0;id<data.length;id++){
	    $("#themes_pid").append('<option value="'+data[id]["id"]+'">'+data[id]["text"]+'</option>');
	    console.log("addToThemes "+id);
	    if(data[id]["children"]){
		var regs=[
		    new RegExp("\\[id\\]","g"),
		    new RegExp("\\[lid\\]","g"),
		    new RegExp("\\[level\\]","g")
		];
		var myHTML=$("#group_template")[0].innerHTML
		    .replace(regs[0],data[id]["text"])
		    .replace(regs[1],"theme_"+data[id]["id"])
		    .replace(regs[2],llevels[level]);
		if(!llevelInit){
		    llevelInit=true;
		    $("#themeswitcher").parent().append(myHTML);
		    if(!init)
			loadATheme(data[0]["id"]);
		}
		else{
		    if(oid=="themeswitcher")
			$("#themeswitcher").parent().append(myHTML);
		    else
			$("#themeswitcher").parent().find('ul#'+oid).last().append(myHTML);
		}
		addToThemes("theme_"+data[id]["id"]+"_t",data[id]["children"],level+1,init);
	    }else{
		var regs=[
		    new RegExp("\\[id\\]","g"),
		    new RegExp("\\[lid\\]","g")
		];
		var myHTML=$("#item_template")[0].innerHTML
		    .replace(regs[0],data[id]["text"])
		    .replace(regs[1],"theme_"+data[id]["id"]);
		if(!llevelInit){
		    llevelInit=true;
		    $("#themeswitcher").parent().append(myHTML);
		    if(!init)
			loadATheme(data[0]["id"]);
		}
		else{
		    console.log(data);
		    console.log(oid);
		    if(oid=="themeswitcher")
			$("#themeswitcher").parent().append(myHTML);
		    else
			$("#themeswitcher").parent().find('ul#'+oid).last().append(myHTML);
		}
	    }
	}
    }

    function loadThemes(init){
	zoo.execute({
	    identifier: "np.list",
	    type: "POST",
	    dataInputs: [
		{"identifier": "table","value": "themes","dataType":"string"}
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		console.log("SUCCESS");
		console.log(data);
		if(init)
		    $("#themeswitcher").parent().find(".li-theme").remove();
		var cnt=0;
		$("#themes_pid").find("option").each(function(){
		    if(cnt>0){
			$(this).remove();
		    }
		    cnt+=1;
		});
		addToThemes("themeswitcher",data,1,init);
		//$("#themeswitcher").parent().find("#theme_"+data[0]["id"]).addClass("active");
		bindThemes();
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
    }

    function fillForm(data){
	$(".project-title").html(data["name"]);
	var myRootLocation=$(".themeForm");
	var reg=new RegExp("themes_","");
	myRootLocation.find("input,select").each(function(){
	    if($(this).attr("type")=="text"){
		if($(this).attr("id").replace(/color/g,"")!=$(this).attr("id")){
		    if(data[$(this).attr("id").replace(reg,"")])
			$(this).val("#"+data[$(this).attr("id").replace(reg,"")]).change();
		    else
			$(this).val("#000").change();
		}
		else
		    $(this).val(data[$(this).attr("id").replace(reg,"")])
	    }else{
		$(this).find('option').prop('selected', false);
		if($.isArray(data[$(this).attr("id").replace(reg,"")])){
		    if(data[$(this).attr("id").replace(reg,"")].length==0)
			$(this).find('option[value="1"]').prop("selected",true);
		    for(var i=0;i<data[$(this).attr("id").replace(reg,"")].length;i++){
			$(this).find('option[value="'+data[$(this).attr("id").replace(reg,"")][i]+'"]').prop("selected",true);
		    }
		}else{
		    $(this).val((data[$(this).attr("id").replace(reg,"")]!=null?data[$(this).attr("id").replace(reg,"")]:-1));
		
		}
		console.log($(this).val());
	    }
	});
    }

    function loadATheme(id){
	console.log("loadATheme -> "+id);
	console.log($("#themeswitcher").parent().find("#theme_"+id));
	$("#themeswitcher").parent().find("#theme_"+id).addClass("active");
	$(".themeForm").find(".fa-spin").removeClass("hide");
	$("#themeswitcher").find("#tdelete").removeClass("disabled");
	//fillForm(null);
	zoo.execute({
	    identifier: "np.details",
	    type: "POST",
	    dataInputs: [
		{"identifier": "table","value": "themes","dataType":"string"},
		{"identifier": "id","value": id,"dataType":"string"}
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		console.log("SUCCESS");
		fillForm(data);
		$(".themeForm").find(".fa-spin").addClass("hide");
		//addToThemes("themeswitcher",data,1);
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
    }

    function createJsonFromForm(form){
	var params={};
	form.find('input[type="text"]').each(function(){
	    if($(this).attr("id").replace(/color/g,"")!=$(this).attr("id"))
		params[$(this).attr('id').replace(reg0,"")]=$(this).val().replace(/#/,"");
	    else
		params[$(this).attr('id').replace(reg0,"")]=$(this).val();
	});
	form.find('select').each(function(){
	    if($(this).find("option:selected").length>1){
		var oid=$(this).attr('id').replace(reg0,"");
		params[oid]=[];
		$(this).find("option:selected").each(function(){
		    params[oid].push($(this).val());
		});
	    }else{
		params[$(this).attr('id').replace(reg0,"")]=$(this).val();
	    }
	});
	return params;
    }

    function saveATheme(id){
	$(".themeForm").find(".fa-spin").removeClass("hide");
	var obj=createJsonFromForm($(".themeForm"));
	obj["id"]=id;
	console.log(obj);
	zoo.execute({
	    identifier: "np.updateElement",
	    type: "POST",
	    dataInputs: [
		{"identifier": "table","value": "themes","dataType":"string"},
		{"identifier": "themes_groups_in","value": "t_id","dataType":"string"},
		{"identifier": "themes_groups_out","value": "g_id","dataType":"string"},
		{"identifier": "indicators_themes_in","value": "t_id","dataType":"string"},
		{"identifier": "indicators_themes_out","value": "i_id","dataType":"string"},
		{"identifier": "tuple","value": JSON.stringify(obj, null, ' '),"mimeType":"application/json"}
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		fillForm(data);
		$(".themeForm").find(".fa-spin").addClass("hide");
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
		loadATheme(id);
		loadThemes(true);
		//addToThemes("themeswitcher",data,1);
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
    }

    function addATheme(){
	$(".themeForm").find(".fa-spin").removeClass("hide");
	zoo.execute({
	    identifier: "np.insertElement",
	    type: "POST",
	    dataInputs: [
		{"identifier": "table","value": "themes","dataType":"string"},
		{"identifier": "name","value": $(".addForm").find('input[name="tname"]').val(),"mimeType":"application/json"}
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		fillForm(data);
		$(".themeForm").find(".fa-spin").addClass("hide");
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
		//loadATheme(id);
		loadThemes(true);
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
    }

    function deleteATheme(id){
	$(".themeForm").find(".fa-spin").removeClass("hide");
	zoo.execute({
	    identifier: "np.deleteElement",
	    type: "POST",
	    dataInputs: [
		{"identifier": "table","value": "themes","dataType":"string"},
		{"identifier": "themes_groups_in","value": "t_id","dataType":"string"},
		{"identifier": "themes_groups_out","value": "g_id","dataType":"string"},
		{"identifier": "indicateurs_themes_in","value": "t_id","dataType":"string"},
		{"identifier": "indicateurs_themes_out","value": "i_id","dataType":"string"},
		{"identifier": "id","value": id,"mimeType":"application/json"}
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		fillForm(data);
		$(".themeForm").find(".fa-spin").addClass("hide");
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
		loadThemes(true);
		//addToThemes("themeswitcher",data,1);
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
    }


    function bindThemes(){
	$("#themeswitcher").parent().find(".theme").each(function(){
	    $(this).off('click');
	    $(this).click(function(e){
		e.preventDefault();
		e.stopPropagation();
		$("#themeswitcher").parent().find(".theme").removeClass("active");
		$(this).addClass("active");
		loadATheme($(this).attr('id').replace(/theme_/g,""));
	    });
	});
    }

    function bindSaveTheme(){
	$(".themeForm").find("button").each(function(){
	    console.log($(this));
	    $(this).off('click');
	    $(this).click(function(){
		console.log($(this));
		try{
		    var elem=$("#themeswitcher").parent().find(".theme.active");
		    console.log(elem);
		    saveATheme(elem.attr('id').replace(/theme_/g,""));
		}catch(e){
		    console.log(e);
		}
		return false;
	    });
	});
    }

    var initialize=function(){
	
	adminBasic.initialize(zoo);
	$('[data-toggle="tooltip"]').tooltip({container: 'body'});
	loadThemes();
	bindSaveTheme();
	console.log("Start Themes");

	$(".cpicker").colorpicker({format: "hex"});

	var cnt=0;
	$("#themeswitcher").find(".btn-group").find('button').each(function(){
	    $(this).click(function(){
		var cid=$(this).attr('id');
		rootElement=$("."+cid.replace(/t/,"")+"Form");
		if(rootElement.hasClass("hide")){
		    if(cid=="tdelete")
			rootElement.find('input[name="tname"]').val($(".themeForm").find("#themes_name").val());
		    rootElement.removeClass("hide");
		}
		else
		    rootElement.addClass("hide");
	    });
	    cnt+=1;
	});
	$("#add-theme").click(function(){
	    addATheme();
	    $(this).parent().prev().val("");
	    $(".addForm").addClass("hide");
	});
	$("#delete-theme").click(function(){
	    var elem=$("#themeswitcher").parent().find(".theme.active");
	    console.log(elem);
	    deleteATheme(elem.attr('id').replace(/theme_/g,""));
	    $(".deleteForm").addClass("hide");
	});
    };

    // Return public methods
    return {
        initialize: initialize,
    };



});

