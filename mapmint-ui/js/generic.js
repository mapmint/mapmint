function searchTable(){
    System.tableName=arguments[0];
    $( "#"+arguments[0]+"_search" ).autocomplete({
	source: function(request,response){
	    $.ajax({
		type: "GET",
		url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&identifier=np.searchByName&DataInputs=tbl="+System.tableName+";val="+request.term+"&RawDataOutput=Result",
		success: function(xml,status){
		    var data=xml;
		    response(data);
		}});
	},
	minLength: 0, 
	select: function( event, ui ) {
	    System.nodeId=ui.item.id;
	    var node = $('#ltree').tree('find', System.nodeId);
	    $("#ltree").tree('select',node.target);
	}
    });
}

function destroyEditor(name){
    try{
	if (CKEDITOR.instances[name]) { CKEDITOR.instances[name].destroy(true); CKEDITOR.instances[name]=null;}
    }catch(e){}
}

function createEditor(name){
    try{
	/* 
	   cf. http://docs.cksource.com/CKEditor_3.x/Developers_Guide/Toolbar for more
	   informations on ckEditor toolbars 
	*/
	if (CKEDITOR.instances[name]) { CKEDITOR.instances[name].destroy(true); }
	CKEDITOR.replace(name,{
	    skin : 'v2',
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
    }catch(e){
	alert("Error creating editor: "+e);
    }
}
