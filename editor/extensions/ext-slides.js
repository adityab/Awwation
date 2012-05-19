/*
 * ext-slides.js
 *
 * Licensed under the Apache License, Version 2
 *
 * Copyright(c) 2010 Alexis Deveria
 *
 */
 
svgEditor.addExtension("Slides", function() {
    var currentSelection;
    
    var count = 0;
    
    var addButton = $("<button class = 'btn btn-primary'>Add selected element to the timeline</button>");
    addButton.appendTo($("#bar_left"));
    addButton.click(function() {
        addToTimeline();
    });
    addButton.css({
        'margin-left': '5px',
        'margin-right': '5px',
        'margin-top': '55px'
    });
	
	
	
    var strip = $("<div id = 'sortable'></div>");
    strip.css({
        'background-color': 'grey',
        'margin-left': '5px',
        'margin-right': '5px',
        'margin-top': '5px',
        'height': '70%',
        'overflow': 'auto'
    });
    strip.appendTo($("#bar_left")); 
    strip.sortable({ revert: true });
	//Div for slide sequense inside strip div
	var numDiv = $("<div id='num'></div>");
	numDiv.css({
        'background-color': 'grey',
		'margin-top': '5px',
		'width':'7%',
		'float':'left',
		'height':'auto',
		'overflow-y':'hidden',
		'overflow': 'auto'			
    });
	numDiv.appendTo(strip);

    var generateButton = $("<button class = 'btn btn-danger'>Generate Awwation!</button>");
    generateButton.appendTo($("#bar_left"));
    generateButton.css({
        'margin-left': '5px',
        'margin-right': '5px',
        'margin-top': '5px'
    });
    
    generateButton.click(function() {
        var sequence = strip.sortable('toArray');
        console.log(sequence);
        makePresentation(sequence);
    });
    
    var updateThumb = function(element, thumb) {
        var svg = thumb.find('svg')[0];
        var bbox = element.getBBox();
        svg.setAttribute('viewBox', [bbox.x, bbox.y, bbox.width, bbox.height].join(' '));
                    
        var use = thumb.find('use')[0];
        var transformStr = element.getAttribute('transform');
        if(transformStr) {
            newTransformStr = transformStr.replace(/rotate\(-/g,'rotate\(');
            if(newTransformStr == transformStr)
                newTransformStr = transformStr.replace(/rotate\(/g,'rotate\(-');
            transformStr = newTransformStr;
            use.setAttribute('transform', transformStr);
         }
    };

    removeElement = function(el) {
        el.parentNode.parentNode.removeChild(el.parentNode);
    }

    var addToTimeline = function() {
                        count += 1;
						//Add div inside sequense div to add new sequese
						var thumbDivNum = $('<div>', {
                            id: currentSelection.id,
							text:count,
                        }).css({
                            'background-color': 'white',
                            'border': '1px solid black',
							'height':'100',
							'float':'left',
							'margin-bottom': '3px',
                        }).appendTo(numDiv);

                        var thumbDiv = $('<div>', {
                            id: currentSelection.id,
                        }).css({
                            'background-color': 'white',
                            'border': '1px solid black',
							'float':'right'
                        }).appendTo(strip);
                        
                        var bbox = currentSelection.getBBox();
                        
                        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                        svg.setAttribute('style', 'border: 1px solid black; pointer-events: none;');
                        svg.setAttribute('width', '110');
                        svg.setAttribute('height', '100');
                        svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
                        thumbDiv[0].appendChild(svg);
						alert('set');

                        var use = document.createElementNS("http://www.w3.org/2000/svg", "use"); 
                        use.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#svgcontent");
                        use.setAttribute('width', '4000');
                        use.setAttribute('height', '4000');
                        svg.appendChild(use);

                        updateThumb(currentSelection, thumbDiv);

                        
	}

		return {
			name: "Slides",
			// For more notes on how to make an icon file, see the source of
			// the hellorworld-icon.xml
			svgicons: "extensions/slidesicon.xml",
			
			// This is triggered when the main mouse button is pressed down 
			// on the editor canvas (not the tool panels)
			mouseDown: function() {
				// Check the mode on mousedown
				if(svgCanvas.getMode() == "slides") {
			
					// The returned object must include "started" with 
					// a value of true in order for mouseUp to be triggered
					return {started: true};
				}
			},
			
			// This is triggered from anywhere, but "started" must have been set
			// to true (see above). Note that "opts" is an object with event info
			mouseUp: function(opts) {
				// Check the mode on mouseup
				if(svgCanvas.getMode() == "slides") {

				}
			},

            selectedChanged: function(opts) {
                currentSelection = null;
                currentSelection = opts.selectedElement;
            },

            elementChanged: function(array) {
                array = array.elems;
                for(var i = 0; i < array.length; ++i) {
                    console.log(array[i].id);
                    var bbox = array[i].getBBox();

                    strip.find('#'+array[i].id).each(function() {
                        updateThumb(array[i], $(this)); 
                    });

                }
            }

		};
});

