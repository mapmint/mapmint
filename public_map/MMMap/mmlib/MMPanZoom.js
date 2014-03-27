/*global OpenLayers, $, MMMap */

/* 
* @requires ../lib/OpenLayers/Control.js
*/

OpenLayers.Control.MMPanZoom = OpenLayers.Class(OpenLayers.Control, {

    initialize: function ()
    {
        OpenLayers.Control.prototype.initialize.apply(this, arguments);
    },

    /**
    * APIMethod: destroy
    */
    destroy: function ()
    {
        OpenLayers.Event.stopObservingElement(this.div);

        this._removeZoomBar();
        this._removePanButtons();
        this.map.events.un({
            "changebaselayer": this.redraw,
            scope: this
        });

        this.removeButtons();
        this.buttons = null;
        $(this.div).unbind("hover");
        this.div.innerHTML = "";
        OpenLayers.Control.prototype.destroy.apply(this, arguments);
    },
    show: function (show)
    {
        if (show)
        {
            $(this.div).show();
        }
        else
        {
            $(this.div).hide();
        }
    },
    getVisibility: function ()
    {
        return $(this.div).is(":visible");
    },
    draw: function ()
    {
        OpenLayers.Control.prototype.draw.apply(this, arguments);
        this.buttons = [];
        $(this.div).hover(OpenLayers.Function.bindAsEventListener(this.showButtons, this), OpenLayers.Function.bindAsEventListener(this.hideButtons, this));
        //OpenLayers.Event.observe(this.div, "mouseover",OpenLayers.Function.bindAsEventListener(this.showButtons, this));
        //OpenLayers.Event.observe(this.div, "mouseout",OpenLayers.Function.bindAsEventListener(this.hideButtons, this));
        this._addPanButtons();
        this._addZoomBar();
        this.hideButtons();
        return this.div;
    },

    _addPanButtons: function ()
    {
        this.panWrapper = document.createElement("div");
        this.panWrapper.className = this.displayClass + "PanWrapper";
        this.pan = document.createElement("div");
        this.pan.className = this.displayClass + "Pan";
        this.panJoy = OpenLayers.Util.createAlphaImageDiv(this.id + "_" + "pan", { x: 6, y: 6 }, { h: 17, w: 17 }, MMMap.getImagesLocation() + "sgpan_barjoy.png", "absolute");
        this.panJoy.className = this.displayClass + "PanJoystick"
        this.panLeft = this._addButton("panleft", { x: 20, y: 32 }, { h: 11, w: 7 }, "sgpan_panLeft.png");
        this.panRight = this._addButton("panright", { x: 56, y: 32 }, { h: 11, w: 7 }, "sgpan_panRight.png");
        this.panTop = this._addButton("panup", { x: 36, y: 12 }, { h: 7, w: 11 }, "sgpan_panTop.png");
        this.panBottom = this._addButton("pandown", { x: 36, y: 48 }, { h: 7, w: 11 }, "sgpan_panBottom.png");

        var joystickWrapper = document.createElement("div");
        joystickWrapper.className = this.displayClass + "JoystickWrapper";
        joystickWrapper.appendChild(this.panJoy);
        var $this = this;
        $(this.panJoy).draggable(
        {
            containment: $(joystickWrapper),
            revert: true,
            revertDuration: 0,
            drag: function (evt, ui)
            {
                var location = 6; // joystiq location is 6,6
                var xOffest = (ui.position.left - location);
                if (xOffest < 0)
                {
                    xOffest = -1;
                }
                if (xOffest > 0)
                {
                    xOffest = 1;
                }
                var yOffest = (ui.position.top - location);
                if (yOffest < 0)
                {
                    yOffest = -1;
                }
                if (yOffest > 0)
                {
                    yOffest = 1;
                }

                var x = 100 * xOffest;
                var y = 100 * yOffest;
                $this.inPanJoystiqDrag = true;
                $this.startPanning(x, y);
            },
            stop: function ()
            {
                $this.inPanJoystiqDrag = false;
                if ($this.hideButtonsAtPanJoystiqDragEnd)
                {
                    $this.hideButtons();
                }
                $this.stopPanning();
            }
        })
        .bind("mousedown click dblclick", function (evt)
        {
            evt.preventDefault();
            return false;
        });
        this.pan.appendChild(this.panLeft);
        this.pan.appendChild(this.panRight);
        this.pan.appendChild(this.panTop);
        this.pan.appendChild(this.panBottom);
        this.pan.appendChild(joystickWrapper);
        this.panWrapper.appendChild(this.pan);
        this.div.appendChild(this.panWrapper);
    },
    _zoomLevels: [
        { name: System.messages['globe'], level: 0 },
        { name: System.messages['country'], level: 4 },
        { name: System.messages['state'], level: 6 },
        { name: System.messages['city'], level: 13 },
        { name: System.messages['street'], level: 16 },
        { name: System.messages['house'], level: 18 }
    ],
    _addZoomBar: function ()
    {
        this.zoomWrapper = document.createElement("div");
        this.zoomWrapper.className = this.displayClass + 'ZoomWrapper';

        this.map.events.register("zoomend", this, this.moveZoomBar);

        this.div.appendChild(this.zoomWrapper);
        var $this = this;
        var maxLevel = this.map.getNumZoomLevels();

        this.zoomSlider = $("<div></div>").appendTo(this.zoomWrapper).slider({
            animate: true,
            orientation: 'vertical',
            min: 0,
            max: maxLevel-System.initZoomLevel,
            step: 1,
            value: maxLevel - this.map.getZoom(),
            change: function (evt, ui)
            {
                var newZoomLevel = maxLevel - ui.value;
                if ($this.map.getZoom() != newZoomLevel)
                {
                    $this.map.zoomTo(newZoomLevel);
                }
            }
        })
        .bind('mousedown', this.doubleClick);

        var zoomLevelsHtml = "<div class=olControlMMPanZoomZoomLevels>";
        for (var i = 0; i < this._zoomLevels.length; i++)
        {
	    if(this._zoomLevels[i].level>=System.initZoomLevel)
		zoomLevelsHtml += "<div class='zoomLevel' style='top:" + (Math.round((this._zoomLevels[i].level-System.initZoomLevel) * 130 / (maxLevel-System.initZoomLevel))-2) + "px' zoom='" + this._zoomLevels[i].level + "'>" + this._zoomLevels[i].name + "</div>";
        }
        zoomLevelsHtml += "</div>";
        this.zoomLevels = $(zoomLevelsHtml).appendTo(this.zoomWrapper);
        $(".zoomLevel", this.zoomLevels).mousedown(function (evt)
        {
            // if not left click do nothing
            if (evt.which !== 1)
            {
                return true;
            }
            evt.preventDefault();
            $this.map.zoomTo(parseInt($(this).attr("zoom"), 10));
            return false;
        });
    },

    _removePanButtons: function ()
    {
        this.div.removeChild(this.panWrapper);
    },

    /**
    * Method: _removeZoomBar
    */
    _removeZoomBar: function ()
    {
        this.div.removeChild(this.zoomWrapper);
        $(".zoomLevel", this.zoomLevels).unbind();
        this.map.events.unregister("zoomend", this, this.moveZoomBar);
        this.zoomSlider.unbind();
        this.zoomWrapper = null;
        this.zoomSlider = null;
        this.zoomLevels = null;
    },
    /**
    * Method: setMap
    * 
    * Parameters:
    * map - {<OpenLayers.Map>} 
    */
    setMap: function (map)
    {
        OpenLayers.Control.prototype.setMap.apply(this, arguments);
        this.map.events.register("changebaselayer", this, this.redraw);
    },

    /** 
    * Method: redraw
    * clear the div and start over.
    */
    redraw: function ()
    {
        if (this.div)
        {
            this.removeButtons();
            this._removeZoomBar();
            this._removePanButtons();
        }
        this.draw();
    },

    hideButtons: function ()
    {
        if (this.inPanJoystiqDrag)
        {
            this.hideButtonsAtPanJoystiqDragEnd = true;
            return;
        }
        // ie <9 does not support png transparency animation
	if ($('body').is('.lt-ie9 *'))
            return;
        $(this.div).stop().css({ opacity: 1 }).animate({ opacity: 0.25 }, 1200);
    },

    showButtons: function ()
    {
        this.hideButtonsAtPanJoystiqDragEnd = false;
        // ie <9 does not support png transparency animation
	if ($('body').is('.lt-ie9 *'))
            return;
        $(this.div).stop().css({ opacity: 0.25 }).animate({ opacity: 1 }, "slow");
    },

    /**
    * Method: _addButton
    * 
    * Parameters:
    * id - {String} 
    * img - {String} 
    * xy - {<OpenLayers.Pixel>} 
    * sz - {<OpenLayers.Size>} 
    * 
    * Returns:
    * {DOMElement} A Div (an alphaImageDiv, to be precise) that contains the
    *     image of the button, and has all the proper event handlers set.
    */
    _addButton: function (id, xy, sz, img)
    {
        var imgLocation = MMMap.getImagesLocation() + img;
        var btn = OpenLayers.Util.createAlphaImageDiv(
                                    this.id + "_" + id,
                                    xy, sz, imgLocation, "absolute");
        btn.className = this.displayClass + "PanButton";
        OpenLayers.Event.observe(btn, "mousedown",
            OpenLayers.Function.bindAsEventListener(this.buttonDown, btn));
        OpenLayers.Event.observe(btn, "mouseup",
            OpenLayers.Function.bindAsEventListener(this.buttonUp, this));
        OpenLayers.Event.observe(btn, "dblclick",
            OpenLayers.Function.bindAsEventListener(this.doubleClick, btn));
        OpenLayers.Event.observe(btn, "click",
            OpenLayers.Function.bindAsEventListener(this.doubleClick, btn));
        btn.action = id;
        btn.map = this.map;
        btn.parent = this;
        this.buttons.push(btn);
        return btn;
    },
    /**
    * Method: _removeButton
    * 
    * Parameters:
    * btn - {Object}
    */
    _removeButton: function (btn)
    {
        OpenLayers.Event.stopObservingElement(btn);
        btn.map = null;
        btn.getSlideFactor = null;
        this.pan.removeChild(btn);
        OpenLayers.Util.removeItem(this.buttons, btn);
    },

    /**
    * Method: removeButtons
    */
    removeButtons: function ()
    {
        for (var i = this.buttons.length - 1; i >= 0; --i)
        {
            this._removeButton(this.buttons[i]);
        }
    },

    /**
    * Method: doubleClick
    *
    * Parameters:
    * evt - {Event} 
    *
    * Returns:
    * {Boolean}
    */
    doubleClick: function (evt)
    {
        OpenLayers.Event.stop(evt);
        return false;
    },

    /**
    * Method: buttonDown
    *
    * Parameters:
    * evt - {Event} 
    */
    buttonDown: function (evt)
    {
        if (!OpenLayers.Event.isLeftClick(evt))
        {
            return;
        }
        // if user moves his mouse from over the button, the map/another div on window recieves the mous up event and pannng does not stop. So lets catch this event if we in pan mode
        if (!this.parent.windowButtonUpObserver)
        {
            this.parent.windowButtonUpObserver = OpenLayers.Function.bindAsEventListener(this.parent.buttonUp, this.parent);
        }
        OpenLayers.Event.observe(window.document, "mouseup", this.parent.windowButtonUpObserver);
        var pan = 200;
        switch (this.action)
        {
            case "panup":
                this.parent.startPanning(0, -pan);
                break;
            case "pandown":
                this.parent.startPanning(0, pan);
                break;
            case "panleft":
                this.parent.startPanning(-pan, 0);
                break;
            case "panright":
                this.parent.startPanning(pan, 0);
                break;
        }
        OpenLayers.Event.stop(evt);
    },

    buttonUp: function (evt)
    {
        OpenLayers.Event.stopObserving(window.document, "mouseup", this.windowButtonUpObserver);
        this.stopPanning();
        OpenLayers.Event.stop(evt);
    },

    startPanning: function (x, y)
    {
        this.stopPanning();
        var $this = this;
        // first pann at least once, to suport simple clicking in pan button
        $this.map.pan(x, y);
        // then start an interval to support holding the button down
        this.panInterval = setInterval(function ()
        {
            $this.map.pan(x, y);
        }, 100);
    },

    stopPanning: function ()
    {
        if (this.panInterval)
        {
            clearInterval(this.panInterval);
            this.panInterval = null;
        }
    },

    /*
    * Method: moveZoomBar
    * Change the location of the slider to match the current zoom level.
    */
    moveZoomBar: function ()
    {
        this.zoomSlider.slider("option", "value", this.map.getNumZoomLevels() - this.map.getZoom());
        this.zoomSlider.attr("title", System.messages["Zoom: "] + (this.map.getZoom() + 1));
    },
    CLASS_NAME: "OpenLayers.Control.MMPanZoom"
});
