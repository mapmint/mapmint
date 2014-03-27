\$("#overlays_list").find("li").each(function(){
    var tmp=\$(this).attr('iconCls');
    \$(this).attr('iconCls',tmp.replace(/layer_/g,"overlays_layer_"));
});
try{
\$("#overlays_list").tree({
    checkbox: true
});
\$(".tree_overlays_layer_class").next().hide();
WMSList=\$("#wms_list").tree({
    checkbox: true
});
}catch(e){}

\$("#overlays_list").css({"height": ((\$(window).height()/2)-(125))+"px"});

\$("#tabs li").click(function() {
    \$("#tabs li").removeClass('active');
    \$(this).addClass("active");
    \$(".tab_content").hide();
    var selected_tab = \$(this).find("a").attr("href");
    \$(selected_tab).fadeIn();
    return false;
});

\$(".ls-button").click(function(){
    var myelement = \$(this).attr("href")
    if(myelement!="#layerswitcher")
	\$(myelement).toggle();
    \$(".ipannel:visible").not(myelement).hide();
});
