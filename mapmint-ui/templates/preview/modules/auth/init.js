#import zoo
System.isIn=$conf["senv"]["loggedin"];
function loadLoginForm(){
    System.clen=arguments.length;
    $.ajax({
	type: "GET",
	url: "modules/auth/login#if $m is None#;pcancel=true#end if#",
	complete: function(xml,status) {
#if $m is not None 
	    if(\$("#authContainer")>0){
		\$("#authContainer").window('close');
		\$("#authContainer").remove();
	    }
	    \$("body").append('<div id="authContainer" title="$zoo._("Login")"></div>');
	    \$("#authContainer").html(xml.responseText);
	    \$( "#authContainer" ).window({
	  	modal: true,
	      	collapsible:false,
	      	minimizable:false,
	      	maximizable:false,
	      	draggable:false,
	      	resizable: false
	    });
#if $m.web.metadata.get('layout_t')=="mobile"
	    \$('#authPage').trigger('pagecreate');
	    \$('#authPage').listview("refresh"); 
#end if
#else
	    \$("#recover").html(xml.responseText);
	    if(System.clen==0){
		\$('#formContainer').toggleClass('flipped');
		if(!\$.support.css3d){
		    \$('#login').toggle();
		    \$('#recover').toggle();
		}
	    }
#end if
	}
    });
}

#if $m is None
function pcancel(){
    \$('#formContainer').toggleClass('flipped');
    if(!\$.support.css3d){
	\$('#login').toggle();
	\$('#recover').toggle();
    }
}
#end if

function cancelUserPreferences(){
#if $m is not None
    \$( "#authContainer" ).window('close');
    \$( "#authContainer" ).remove();
#end if
}

function recoverUserWindow(){
    $.ajax({
	type: "GET",
	url: "modules/auth/recover#if $m is None#;pcancel=true#end if#",
	complete: function(xml,status) {
#if $m is not None 
	    if(\$("#authContainer").length>0){
		\$("#authContainer").window('close');
		\$("#authContainer").remove();
	    }
	    \$("body").append('<div id="authContainer" title="$zoo._("Recover password").replace("'","\\'")"></div>');
	    \$("#authContainer").html(xml.responseText);
	    \$( "#authContainer" ).window({
	  	modal: true,
	      	collapsible:false,
	      	minimizable:false,
	      	maximizable:false,
	      	draggable:false,
	      	resizable: false,
		width: 320
	    });
#else
	    \$("#recover").html(xml.responseText);
	    \$('#formContainer').toggleClass('flipped');
	    if(!\$.support.css3d){
		\$('#login').toggle();
		\$('#recover').toggle();
	    }
#end if
	}
    });
}

function recoverPassword(){
    var params=[
	{name: "login",value: \$("#relogin").val(),dataType: "string"}
    ];
    var data=WPSGetHeader("authenticate.getLostPassword")+WPSGetInputs(params)+WPSGetOutput({name: "Result"})+WPSGetFooter();
    $.ajax({
      type: "POST",
	  url: System.zooUrl,
	  contentType: 'text/xml',
	  data: data,
	  complete: function(xml,status) {
	      if(checkWPSResult(xml,false,true)){
		  try{
		      cancelUserPreferences();
		      if(System.onOnAuthenticate)
			  System.onOnAuthenticate();
		  }catch(e){alert(e);}
	      }
        }
      });
}

function registerUserWindow(){
    $.ajax({
	type: "GET",
	url: "modules/auth/register#if $m is None#;pcancel=true#end if#",
	complete: function(xml,status) {
#if $m is not None 
	    if(\$("#authContainer").length>0){
		\$("#authContainer").window('close');
		\$("#authContainer").remove();
	    }
	    \$("body").append('<div id="authContainer" title="$zoo._("Register").replace("'","\\'")"></div>');
	    \$("#authContainer").html(xml.responseText);
	    \$( "#authContainer" ).window({
	  	modal: true,
	      	collapsible:false,
	      	minimizable:false,
	      	maximizable:false,
	      	draggable:false,
	      	resizable: false,
		width: 380,
		height: 250
	    });
#else
	    \$("#recover").html(xml.responseText);
	    \$('#formContainer').toggleClass('flipped');
	    if(!\$.support.css3d){
		\$('#login').toggle();
		\$('#recover').toggle();
	    }	    
#end if
	}
    });
}

function registerUser(){
    var params=[
	{name: "fields",value: "firstname",dataType: "string"},
	{name: "values",value: \$("#firstname").val(),dataType: "string"},
	{name: "fields",value: "lastname",dataType: "string"},
	{name: "values",value: \$("#lastname").val(),dataType: "string"},
	{name: "fields",value: "login",dataType: "string"},
	{name: "values",value: \$("#rlogin").val(),dataType: "string"},
	{name: "fields",value: "passwd",dataType: "string"},
	{name: "values",value: \$("#rpassword").val(),dataType: "string"},
	{name: "fields",value: "s_group_id",dataType: "string"},
	{name: "values",value: "1",dataType: "string"},
	{name: "fields",value: "mail",dataType: "string"},
	{name: "values",value: \$("#email").val(),dataType: "string"}
    ];    
    var data=WPSGetHeader("authenticate.registerUser")+WPSGetInputs(params)+WPSGetOutput({name: "Result"})+WPSGetFooter();
    //alert(data);
    \$.ajax({
	type: "POST",
	url: System.zooUrl,
	contentType: 'text/xml',
	data: data,
	complete: function(xml,status) {
	    try{
		if(checkWPSResult(xml,false,true)){
		    \$("#login_f").val(\$("#rlogin").val());
		    \$("#password_f").val(\$("#rpassword").val());
		    try{pcancel();}catch(e){};
		    authenticateUser();
		}
	    }
	    catch(e){alert(e.message);}
      }
    });
}


function saveUserPreferences(){
    var params=[
	{name: "fields",value: "mail",dataType: "string"},
	{name: "values",value: \$("#umail").val(),dataType: "string"}
    ];    
    if(\$("#upass").val()!=""){
	if(\$("#upass").val()!=\$("#upass1").val()){
	    alert("$zoo._("Please set your password again")");
	    \$("#upass").val("");
	    \$("#upass1").val("");
	    return false;
	}
	params[params.length]={name: "fields",value: "passwd",dataType: "string"};
	params[params.length]={name: "values",value: \$("#upass").val(),dataType: "string"};
    }
    var data=WPSGetHeader("authenticate.saveUserPreferences")+WPSGetInputs(params)+WPSGetOutput({name: "Result"})+WPSGetFooter();
    $.ajax({
	type: "POST",
	url: System.zooUrl,
	contentType: 'text/xml',
	data: data,
	complete: function(xml,status) {
	    if(checkWPSResult(xml,false,true)){
#if $m is not None
		cancelUserPreferences();
		loadLoginForm();
#end if
	    }
        }
    });
}

function authenticateUser(){
    var params=[
	{name: "login",value: \$("#login_f").val(),dataType: "string"},
	{name: "password",value: \$("#password_f").val(),dataType: "string"}
    ];
	
    var data=WPSGetHeader("authenticate.clogIn")+WPSGetInputs(params)+WPSGetOutput({name: "Result"})+WPSGetFooter();
    $.ajax({
      type: "POST",
	  url: System.zooUrl,
	  contentType: 'text/xml',
	  data: data,
	  complete: function(xml,status) {
	      if(checkWPSResult(xml,false,true)){
		  try{
		      cancelUserPreferences();
		      System.isIn=true;
		      if(System.onOnAuthenticate)
			  System.onOnAuthenticate();
		  }catch(e){alert(e);}
	      }
        }
      });
}

function logoutUser(){
    var params=[
	{name: "login",value: \$("#login").val(),dataType: "string"}
    ];
    var data=WPSGetHeader("authenticate.clogOut")+WPSGetInputs(params)+WPSGetOutput({name: "Result"})+WPSGetFooter();
    $.ajax({
      type: "POST",
	  url: System.zooUrl,
	  contentType: 'text/xml',
	  data: data,
	  complete: function(xml,status) {
	      if(checkWPSResult(xml,false)){
		  cancelUserPreferences();
		  System.isIn=false;
		  if(System.onOnAuthenticate)
		      System.onOnAuthenticate();
	      }
          }
      });
}