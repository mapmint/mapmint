// Filename: app.js
/*
    This work was supported by a grant from the European Union's 7th Framework Programme (2007-2013)
    provided for the project PublicaMundi (GA no. 609608).
*/

require(['bootstrap', 'notify']);

define([
    'module', 'jquery', 'zoo',
], function(module, $, Zoo) {
    
    var zoo = new Zoo({
        url: module.config().url,
        delay: module.config().delay,
    });
    
    var mymodal = $('#myModal');
    var mynotify = $('.top-right');
    
    


    function notify(text, type) {
        mynotify.notify({
            message: { text: text },
            type: type,
        }).show();
    }
    
    function showModal(title, body) {
        mymodal.find('.modal-body').text('');
        mymodal.find('.modal-body').append(body);
        mymodal.find('.modal-title').text(title);
        var options = {};
        mymodal.modal(options);
    }
    
    
    //
    var initialize = function() {
        self = this;        
        
        // DescribeProcess button
        $('.btn.describeprocess').on('click', function(e) {
            e.preventDefault();
            zoo.describeProcess({
                identifier: 'longProcess',
                type: 'GET',
                success: function(data) {
                    notify('DescribeProcess success', 'success');
                    console.log(data);
                },
                error: function(data) {
                    notify('DescribeProcess failed', 'danger');
                }
            });
        });
        
        
        
        // Misc tests
        $('.btn.testalert').on('click', function(e) {
          e.preventDefault();
          var type = this.dataset.type;
          notify('This is a message.', type);
        });
    }
    


    // Return public methods
    return {
        initialize: initialize,
    };


});