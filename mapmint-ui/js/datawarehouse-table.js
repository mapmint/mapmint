			$(document).ready(function() {
				

				
					oTable = $('#example2').dataTable({
					"bJQueryUI": true
				});
				
					oTable = $('#example3').dataTable({
					"bJQueryUI": true	
				});
				
					oTable = $('#example4').dataTable({
					"bJQueryUI": true	
				});
				
				$("#example tbody, #example2 tbody, #example3 tbody, #example4 tbody").click(function(event) {
		$(oTable.fnSettings().aoData).each(function (){
			$(this.nTr).removeClass('row_selected');
		});
		$(event.target.parentNode).addClass('row_selected');
	});
	
	/* Add a click handler for the delete row */
	$('#delete').click( function() {
		
		var anSelected = fnGetSelected( oTable );
		oTable.fnDeleteRow( anSelected[0] );
		$.notifyBar({ cls: "success", html: "operation sucessful" });
	} );

				oTable = $('#example').dataTable({
					"bJQueryUI": true,
					"sPaginationType": "full_numbers"
				});
				
				/* Get the rows which are currently selected */
			function fnGetSelected( oTableLocal )
			{
				var aReturn = new Array();
				var aTrs = oTableLocal.fnGetNodes();
				
				for ( var i=0 ; i<aTrs.length ; i++ )
				{
					if ( $(aTrs[i]).hasClass('row_selected') )
					{
						aReturn.push( aTrs[i] );
					}
				}
				return aReturn;
			}


			} );