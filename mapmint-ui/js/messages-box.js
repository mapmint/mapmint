$(function() {
		
		$(".dialog-postgis").dialog({
			autoOpen: false,
			height: 440,
			width: 700,
			modal: true,
			resizable: false,
			buttons: {
				'Add': function() {
					$(this).dialog('close');
				},
				'Cancel': function() {
					$(this).dialog('close');
				}
			}
		});
		
			$(".dialog-postgis-new").dialog({
			autoOpen: false,
			height: 280,
			width: 300,
			modal: true,
			resizable: false,
			buttons: {
				'Add': function() {
					$(this).dialog('close');
				},
				'Cancel': function() {
					$(this).dialog('close');
				}
			}
		});
		
		$(".dialog-wms").dialog({
			autoOpen: false,
			height: 440,
			width: 700,
			modal: true,
			resizable: false,
			buttons: {
				'Add': function() {
					$(this).dialog('close');
				},
				'Cancel': function() {
					$(this).dialog('close');
				}
			}
		});
		
		$(".dialog-wms-new").dialog({
			autoOpen: false,
			height: 250,
			width: 300,
			modal: true,
			resizable: false,
			buttons: {
				'Add': function() {
					$(this).dialog('close');
				},
				'Cancel': function() {
					$(this).dialog('close');
				}
			}
		});
		
		$(".dialog-wfs").dialog({
			autoOpen: false,
			height: 440,
			width: 700,
			modal: true,
			resizable: false,
			buttons: {
				'Add': function() {
					$(this).dialog('close');
				},
				'Cancel': function() {
					$(this).dialog('close');
				}
			}
		});
		
		$(".dialog-wfs-new").dialog({
			autoOpen: false,
			height: 250,
			width: 300,
			modal: true,
			resizable: false,
			buttons: {
				'Add': function() {
					$(this).dialog('close');
				},
				'Cancel': function() {
					$(this).dialog('close');
				}
			}
		});

		
		$(".dialog-success").dialog({
			autoOpen: false,
			height: 150,
			width: 350,
			modal: true,
			resizable: false,
			buttons: {
				'OK': function() {
					$(this).dialog('close');
				}
			}
		});
		
		
		
		$('.success-call')
			.button()
			.click(function() {
				$('.dialog-success').dialog('open');
			});
			
			
			
			$(".dialog-error").dialog({
			autoOpen: false,
			height: 150,
			width: 350,
			modal: true,
			resizable: false,
			buttons: {
				'OK': function() {
					$(this).dialog('close');
				}			}
		});
		
		
		
		$('.error-call')
			.button()
			.click(function() {
				$('.dialog-error').dialog('open');
			});
			
			
			$(".dialog-loading").dialog({
			autoOpen: false,
			height: 150,
			width: 350,
			modal: true,
			resizable: false,
			buttons: {
				'OK': function() {
					$(this).dialog('close');
				}			}
		});
		
		
		
		$('.loading-call')
			.button()
			.click(function() {
				$('.dialog-loading').dialog('open');
			});


	});

