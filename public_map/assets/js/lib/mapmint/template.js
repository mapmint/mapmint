/**
 * Author : Samuel Souk aloun
 *
 * Copyright (c) 2014 GeoLabs SARL
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

define([
    'xml2json', 'queryString', 'wpsPayload', 'utils'
], function(X2JS, qs, wpsPayload, utils) {

    /** 
     * The ZooProcess Class
     * @constructs ZooProcess
     * @param {Object} params Parameters
     * @example
     * var myZooObject = new ZooProcess({
     *     url: "http://localhost/cgi-bin/zoo_loader.cgi",
     *     delay: 2500
     * });
     */
    var MMDataTable = function(params) {
        
        /**
	 * Object configuring the xml2json use.
	 *
         * @access private
	 * @memberof ZooProcess#
	 * @var _x2js {x2js}
         */         
        var _x2js = new X2JS({
            arrayAccessFormPaths: [
            'ProcessDescriptions.ProcessDescription.DataInputs.Input',
            'ProcessDescriptions.ProcessDescription.DataInputs.Input.ComplexData.Supported.Format',
            'ProcessDescriptions.ProcessDescription.ProcessOutputs.Output',
            'ProcessDescriptions.ProcessDescription.ProcessOutputs.Output.ComplexOutput.Supported.Format',
            'Capabilities.ServiceIdentification.Keywords'
            ],   
        });

       
        /**
         * @access public
	 * @memberof ZooProcess#
	 * @var debug {Boolean} true if verbose messages should be displayed on the console
	 * @default false
         */         
        this.debug = false;

	this.display = function(layer){
		var key=getLayerById(layer);
		var CRowSelected=[];
		console.log(key);
		//$("#table-wrapper").removeAttr("style");
		if($("#table-wrapper").hasClass("collapse") && !$("#table-wrapper").hasClass("in")){
		    console.log("collapse || in");
		    $("#table-wrapper").collapse("show");
		    //$('#mmm_table-content-wrapper_'+key).tab("show");
		    //$("#table-wrapper").removeClass("collapse");
		}
		$('#mmm_table-content-display_'+key).tab("show");
		if(!$('#mmm_table-content-wrapper_'+key).length){

		    //$("#table-wrapper").toggleClass("in");
		    //if(tableDisplay!=0)
		    //$(mm_table-content_'+key+').parent().remove();
		    //tableDisplay++;
		    for(var i in {"container":0,"header":0})
			$("#mmm_table-wrapper-"+i).find(".active").each(function(){
			    $(this).removeClass("active");
			});
		    
		    $("#mmm_table-wrapper-container").append($('<div id="mmm_table-content-wrapper_'+key+'" class="tab-pane active"></div>').append('<table id="mmm_table-content_'+key+'" class="display" width="100%"></table>'));
		    $("#mmm_table-wrapper-header").append('<li role="presentation" class="active"><a id="mmm_table-content-display_'+key+'" title="'+oLayers[key]["alias"]+'" data-toggle="tab" data-target="#mmm_table-content-wrapper_'+key+'" href="#mmm_table-content-wrapper_'+key+'"><i class="fa fa-table"></i><b class="ncaret"> </b><span class="hidden-xs hidden-sm">'+oLayers[key]["alias"]+'</span> </a>  </li>');

		    
		    if(selectLayer.getSource().getFeatures().length==0)
			$(".require-select").hide();
		    var columns=[];
		    var properties="";
		    var clause="";
		    var order="";
		    var j=0;
		    for(var i in oLayers[key]["queryParams"]["fields"]){
			columns.push({ 
			    data: oLayers[key]["queryParams"]["fields"][i], 
			    name: oLayers[key]["queryParams"]["fields"][i], 
			    title: oLayers[key]["queryParams"]["aliases"][i],
			    width: oLayers[key]["queryParams"]["sizes"][i]
			});
			properties+=oLayers[key]["queryParams"]["fields"][i]+",";
			clause+="CAST("+oLayers[key]["queryParams"]["fields"][i]+" AS character(255)) like '%dd%'"+
			    " OR "+
			    "CAST("+oLayers[key]["queryParams"]["fields"][i]+" AS character(255)) like 'dd%'"+
			    " OR "+
			    "CAST("+oLayers[key]["queryParams"]["fields"][i]+" AS character(255)) like 'dd'"+
			    (j+1<oLayers[key]["queryParams"]["fields"].length?" OR ":"");
			if(i==0)
			    order=oLayers[key]["queryParams"]["fields"][i];
			j++;
		    }
		    properties+="msGeometry";
		    var _x2js = new X2JS();
		    var featureCount=0;
		    var cnt=0;
		    var CFeatures=[];
		    console.log("HEIGHT: "+$("#map").height()/2);
		    $('#mmm_table-content_'+key).DataTable( {
			data: [],
			"scrollY":        ($("#map").height()/5)+"px",
			"scrollCollapse": true,
			"scrollX": true,
			"lengthMenu": [[5, 10, 25, 50, -1], [5, 10, 25, 50, "All"]],
			"fnServerData": function ( sSource, aoData, fnCallback, oSettings ) {
			    console.log(aoData);
			    var myAoData=[];
			    CFeatures=[];
			    var llimit=[];
			    for(j in {"iDisplayStart":0,"iDisplayLength":0,"iSortCol_0":0,"sSortDir_0":0,"sSearch":0})
				for(i in aoData)
				    if(aoData[i].name==j){
					if(llimit.length==4 && aoData[i].value!="")
					    llimit.push(aoData[i].value);
					if(llimit.length<4)
					    llimit.push(aoData[i].value);
				    }
			    console.log(llimit);
				
			    
			    var lclause="";
			    if(llimit.length>4){
				lclause=" WHERE "+clause.replace(/dd/g,llimit[4]);
			    }

			    var opts=zoo.getRequest({
				identifier: "vector-tools.access",
				dataInputs: [
				    {"identifier":"InputData","href":sSource,"mimeType":"text/xml"},
				    {"identifier":"offset","value":llimit[0],"dataType":"int"},
				    {"identifier":"limit","value":llimit[1],"dataType":"int"},
				    {"identifier":"sql","value":"SELECT "+properties.replace(/,msGeometry/g,"")+" from "+key+lclause+" order by "+(properties.split(",")[llimit[2]])+" "+llimit[3],"dataType":"string"}
				],
				dataOutputs: [
				    {"identifier":"Result","mimeType":"application/json"},
				    {"identifier":"Count","dataType":"string"}
				],
				type: 'POST',
				storeExecuteResponse: false
			    });

			    console.log(opts);
			    opts["success"]=function() {
				console.log(arguments);
				var obj=_x2js.xml_str2json( arguments[2].responseText );
				console.log(obj);
				notify('vector-tools.access service run successfully','success');
				var outputs=obj["ExecuteResponse"]["ProcessOutputs"]["Output"];
				var features,count;
				console.log(obj["ExecuteResponse"]["ProcessOutputs"]["Output"]);
				for(var i in outputs){
				    if(outputs[i]["Identifier"].toString()=="Count")
					featureCount=eval(outputs[i]["Data"]["LiteralData"].toString());
				    if(outputs[i]["Identifier"].toString()=="Result")
					features=JSON.parse(outputs[i]["Data"]["ComplexData"].toString());
				}
				var format=new ol.format.GeoJSON({});
				console.log("format");
				console.log(format);
				CFeatures=format.readFeatures(outputs[i]["Data"]["ComplexData"].toString(),{
				    dataProjection: ol.proj.get('EPSG:4326'),
				    featureProjection: ol.proj.get('EPSG:3857')
				});
				console.log(CFeatures);
				features=features.features;
				var data=[];
				for(var i in features){
				    features[i].properties['id']=key+"_"+features[i].id;
				    features[i].properties['DT_RowId']=key+"_"+features[i].id;
				    data.push(features[i].properties);
				    //CFeatures.push(features[i]);
				}
				var opts={
				    "sEcho": cnt++, 
				    "iDraw": cnt++, 
				    "iTotalRecords": featureCount, 
				    "iTotalDisplayRecords": featureCount, 
				    "aaData": (featureCount>0?data:[])
				};
				console.log(opts);
				//fnClear();
				fnCallback(opts);
				if(featureCount==0){
				    $('#mmm_table-content_'+key).DataTable().clear();
				    console.log("clear table");
				}
				console.log(CRowSelected);
				/*$(".selected").each(function(){
				    $('#mmm_table-content').DataTable().row($(this)).deselect();
				});*/
				for(d in data){
				    console.log(data[d].DT_RowId);
				    console.log($.inArray(data[d].DT_RowId, CRowSelected) !== -1 );
				    if ( $.inArray(data[d].DT_RowId+"", CRowSelected) !== -1 ) {
					console.log(data[d].DT_RowId);
					$('#mmm_table-content_'+key).DataTable().row($("#"+data[d].DT_RowId)).select();
				    }else{
					$('#mmm_table-content_'+key).DataTable().row($("#"+data[d].DT_RowId)).deselect();
				    }
				}
				var existing=$('#mmm_table-content_'+key+'_info').children('span.select-info');
				if(existing.length)
				    existing.remove();
				$('#mmm_table-content_'+key+'_info').append($('<span class="select-info"/>').append(
				    $('<span class="select-item"/>').append('dd rows selected'.replace(/dd/g,CRowSelected.length))
				));
				console.log('finish');
			    };
			    opts["error"]=function(){
				notify('Execute failed:' +data.ExceptionReport.Exception.ExceptionText, 'danger');
			    };
			    oSettings.jqXHR = $.ajax( opts );
			},
			"sAjaxSource": msUrl+"?map="+oLayers[key]["map"]+"&version=1.0.0&service=WFS&request=GetFeature&typename="+key+"&propertyname="+properties,
			"bProcessing": true,
			"bServerSide": true,
			fixedHeader: true,
			//searching: true,
			responsive: true,
			deferRender: true,
			rowId: 'id',
			select: {
			    info: false,
			},
			"rowCallback": function( row, data ) {
			    console.log(CRowSelected);
			    console.log(data.DT_RowId);
			    $(row).removeClass('selected');
			    console.log($(row));
			    console.log($.inArray(data.DT_RowId, CRowSelected) !== -1 );
			    if ( $.inArray(data.DT_RowId, CRowSelected) !== -1 ) {
				console.log(data.DT_RowId);
				console.log($('#mmm_table-content_'+key).DataTable());
				$('#mmm_table-content_'+key).DataTable().row($(row)).select();
				//$(row).addClass('selected');
			    }else{
				$('#mmm_table-content_'+key).DataTable().row($(row)).deselect();
				//$(row).removeClass('selected');
			    }
			},
			//dom: 'Bfrtip0001',
			//dom: 'Bfrtip',
			columns: columns
		    } );

		    $('#mmm_table-content_'+key+' tbody').on('hover', 'tr', function () {
			console.log('hover');
			/*for(var i=0;i<CFeatures.length;i++){
			    if(CFeatures[i].getId()==id){
				console.log(CFeatures.length);
				CFeatures[i].set("origin","query_selected_"+key);
				selectLayer.getSource().addFeature(CFeatures[i]);
			    }
			}*/
		    });
		   
		    $('#mmm_table-content_'+key+' tbody').on('click', 'tr', function () {
			var id = this.id+"";
			console.log("CURRENT ID: "+id+" "+key);
			console.log("CURRENT ID: "+$(this).parent().parent().get('id'));
			var index = $.inArray(id, CRowSelected);
			if ( index === -1 ) {
			    if(selectLayer.getSource().getFeatures().length==0)
				$(".require-select").show();

			    CRowSelected.push( id );
			    $('#mmm_table-content_'+key).DataTable().row("#"+id).select();
			    console.log(CFeatures.length);
			    for(var i=0;i<CFeatures.length;i++){
				console.log(CFeatures[i].getId());
				if(key+"_"+CFeatures[i].getId()==id){
				    console.log(CFeatures.length);
				    CFeatures[i].set("origin","query_selected_"+key);
				    selectLayer.getSource().addFeature(CFeatures[i]);
				}
			    }
			    console.log(CFeatures);
			} else {
			    CRowSelected.splice( index, 1 );
			    $('#mmm_table-content_'+key).DataTable().row("#"+id).deselect();
			    for(var i=0;i<CFeatures.length;i++){
				if(key+"_"+CFeatures[i].getId()==id){
				    console.log(CFeatures.length);
				    //CFeatures[i].set("origin","query_selected_"+key);
				    selectLayer.getSource().removeFeature(selectLayer.getSource().getFeatureById(CFeatures[i].getId()));
				}
			    }
			    if(selectLayer.getSource().getFeatures().length==0)
				$(".require-select").hide();
			}
			var existing=$('#mmm_table-content_'+key+'_info').children('span.select-info');
			if(existing.length)
			    existing.remove();
			console.log('#mmm_table-content_'+key+'_info');
			console.log($('#mmm_table-content_'+key+'_info'));
			console.log(selectLayer.getSource().getFeatures().length);
			console.log(CRowSelected.length);
			console.log('#mmm_table-content_'+key+'_info');
			$('#mmm_table-content_'+key+'_info').append($('<span class="select-info"/>').append(
			    $('<span class="select-item"/>').append((selectLayer.getSource().getFeatures().length!=CRowSelected.length?'dd rows selected (ee total selected)'.replace(/dd/g,CRowSelected.length).replace(/ee/g,selectLayer.getSource().getFeatures().length):'dd rows selected'.replace(/dd/g,CRowSelected.length)))
			));
		    } );
		    
		    $('#mmm_table-content-wrapper_'+key).bind('cssClassChanged', function(){ 
			if($("#mmm_table-wrapper-header-title").text()!=oLayers[key]["alias"]){
			    $("#mmm_table-wrapper-header-title").text(oLayers[key]["alias"]);
			    console.log( "First handler for .cssClassChanged() called." + "(" +key +")");
			    console.log( arguments );
			}
			//do stuff here
		    });

		}
	    }
}

	
    }
    

    return MMDataTable;

});
