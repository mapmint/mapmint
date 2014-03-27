#if $m.web.metadata.get('mmOT')
#set f=$m.web.metadata.get('mmOT').split(',')
#if f.count('MMPanZoom')>0
map.addControl(new OpenLayers.Control.MMPanZoom());
#else
$(Template(file=$conf["main"]["templatesPath"]+"/preview/modules/other_tools/default.js",searchList={"m": $m,"conf":$conf}))
#end if
#if f.count('ScaleBar')>0
map.addControl(new OpenLayers.Control.ScaleBar({div:document.getElementById("scalebar")}));
#end if
#if $f.count('MMOVMap')>0 or $f.count('MMOVMapFixed')>0
$(Template(file=$conf["main"]["templatesPath"]+"/preview/modules/other_tools/overviewmap.js",searchList={"m": $m,"conf":$conf}))
#end if
#else
$(Template(file=$conf["main"]["templatesPath"]+"/preview/modules/other_tools/default.js",searchList={"m": $m,"conf":$conf}))
#end if
