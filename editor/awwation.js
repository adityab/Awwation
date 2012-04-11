$(function() {
    $('#tool_wireframe, #main_button, #tool_zoom, #tool_topath, #tool_reorient, #idLabel, #tool_blur, #tool_position, #xy_panel, #tool_angle, #rect_panel, #circle_panel, #ellipse_panel, #line_panel, #multiselected_panel, #container_panel, #g_panel, #tools_rect, #tools_ellipse').remove();
    $('#tools_top').css('left', 5);
    
    // Create a style element in the SVG document if it does not exist
    var style = $('#awwation_theme')[0];
    if(style == undefined) {
        style = document.createElement('style');
        style.id = 'awwation_theme';
        style.type = 'text/css';
        $('#svgcontent')[0].appendChild(style);
    }
    
    // And when a theme is picked, apply it.
    $('#theme_picker').children().each(function(id, theme) {
        $('#'+theme.id)[0].innerHTML = "<img src = '../themes/"+theme.id+"/"+theme.id+".png'></img>"
        $('#'+theme.id).click(function() {
            console.log(theme.id, 'selected');
            style.innerHTML = "@import url(http://adityab.github.com/Awwation/themes/"+theme.id+"/"+theme.id+".css);";
        });
    });
    
    $('#berkshire').trigger(jQuery.Event('click'));
});
