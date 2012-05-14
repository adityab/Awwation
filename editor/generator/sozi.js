function module(globals, path, body) {
    'use strict';
    
    // Start name lookup in the global object
	var current = globals;
	
	// For each name in the given path
	path.split('.').forEach(function (name) {
	    // If the current path element does not exist
	    // in the current namespace, create a new sub-namespace
		if (typeof current[name] === 'undefined') {
			current[name] = {};
		}
		
		// Move to the namespace for the current path element
		current = current[name];
	});
	
	// Execute the module body in the last namespace
	body(current, globals);
}

/*
 * Sozi - A presentation tool using the SVG standard
 *
 * Copyright (C) 2010-2012 Guillaume Savaton
 *
 * This program is dual licensed under the terms of the MIT license
 * or the GNU General Public License (GPL) version 3.
 * A copy of both licenses is provided in the doc/ folder of the
 * official release of Sozi.
 *
 * See http://sozi.baierouge.fr/wiki/en:license for details.
 *
 * @depend module.js
 */

module(this, 'sozi.events', function (exports) {
    'use strict';
    
    var listenerRegistry = {};

    /*
     * Adds a listener for a given event type.
     *
     * The event type is provided as a string by the key parameter.
     * The function to be executed is provided by the handler parameter.
     */
    exports.listen = function (key, handler) {
        if (!listenerRegistry.hasOwnProperty(key)) {
            listenerRegistry[key] = [];
        }
        listenerRegistry[key].push(handler);
    };
    
    /*
     * Fire an event of the given type.
     *
     * All event handlers added for the given event type are
     * executed.
     * Additional arguments provided to this function are passed
     * to the event handlers.
     */
    exports.fire = function (key) {
        var args = Array.prototype.slice.call(arguments, 1);
        if (listenerRegistry.hasOwnProperty(key)) {
            listenerRegistry[key].forEach(function (listener) {
                listener.apply(null, args);
            });
        }
    };
});

/*
 * Sozi - A presentation tool using the SVG standard
 *
 * Copyright (C) 2010-2012 Guillaume Savaton
 *
 * This program is dual licensed under the terms of the MIT license
 * or the GNU General Public License (GPL) version 3.
 * A copy of both licenses is provided in the doc/ folder of the
 * official release of Sozi.
 *
 * See http://sozi.baierouge.fr/wiki/en:license for details.
 *
 * @depend module.js
 * @depend events.js
 */

module(this, 'sozi.framenumber', function (exports, window) {
    'use strict';
    
    // An alias to the global document object
    var document = window.document;
    
    // The SVG group containing the frame number
    var svgGroup;
    
    // The SVG text element and its text node containing the frame number
    var svgText, svgTextNode;
    
    // The SVG circle enclosing the frame number
    var svgCircle;
    
    // Constant: the SVG namespace
    var SVG_NS = 'http://www.w3.org/2000/svg';
    
    function adjust() {
        var textBBox = svgText.getBBox(),
            d = Math.max(textBBox.width, textBBox.height) * 0.75,
            t = d * 1.25;
        svgCircle.setAttribute('r', d);
        svgGroup.setAttribute('transform', 'translate(' + t + ',' + t + ')');
    }
    
    function onDisplayReady() {
        svgGroup = document.createElementNS(SVG_NS, 'g');
        svgText = document.createElementNS(SVG_NS, 'text');
        svgCircle = document.createElementNS(SVG_NS, 'circle');
        
        svgGroup.setAttribute('id', 'sozi-framenumber');

        svgCircle.setAttribute('cx', 0);
        svgCircle.setAttribute('cy', 0);
        svgGroup.appendChild(svgCircle);
        
        svgTextNode = document.createTextNode(sozi.location.getFrameIndex() + 1);
        svgText.setAttribute('text-anchor', 'middle');
        svgText.setAttribute('dominant-baseline', 'central');
        svgText.setAttribute('x', 0);
        svgText.setAttribute('y', 0);
        svgText.appendChild(svgTextNode);
        svgGroup.appendChild(svgText);
        
        document.documentElement.appendChild(svgGroup);
        
        adjust();
    }

    function onFrameChange(index) {
        svgTextNode.nodeValue = index + 1;
    }
    
	sozi.events.listen('displayready', onDisplayReady);
	sozi.events.listen('framechange', onFrameChange);
});

/*
 * Sozi - A presentation tool using the SVG standard
 *
 * Copyright (C) 2010-2012 Guillaume Savaton
 *
 * This program is dual licensed under the terms of the MIT license
 * or the GNU General Public License (GPL) version 3.
 * A copy of both licenses is provided in the doc/ folder of the
 * official release of Sozi.
 *
 * See http://sozi.baierouge.fr/wiki/en:license for details.
 *
 * @depend module.js
 * @depend events.js
 */

module(this, 'sozi.framelist', function (exports, window) {
    'use strict';
    
    // An alias to the global document object
	var document = window.document;
	
    // Constant: the margin around the text of the frame list
    var MARGIN = 5;
    
	// The SVG group that will contain the frame list
    var svgTocGroup;
    
    // The SVG group that will contain the frame titles
    var svgTitlesGroup;
    
    // The current height of the frame list,
    // computed during the initialization
    var tocHeight = 0;
    
    // The X coordinate of the frame list in its hidden state
    var translateXHidden;
    
    // The X coordinate of the frame list when it is completely visible
    var translateXVisible;
    
    // The initial X coordinate of the frame list before starting an animation.
    // This variable is set before showing/hiding the frame list.
    var translateXStart;
    
    // The final X coordinate of the frame list for the starting animation.
    // This variable is set before showing/hiding the frame list.
    var translateXEnd;
    
    // The current X coordinate of the frame list for the running animation.
    // This variable is updated on each animation step.
    var translateX;
    
    // The animator object that will manage animations of the frame list
    var animator;
    
    // Constant: the duration of the showing/hiding animation, in milliseconds
    var ANIMATION_TIME_MS = 300;
    
    // Constant: the acceleration profile of the showing/hiding animation
    var ANIMATION_PROFILE = 'decelerate';
    
    // Constant: the SVG namespace
    var SVG_NS = 'http://www.w3.org/2000/svg';

	function onMouseOut(evt) {
        var rel = evt.relatedTarget,
            svgRoot = document.documentElement;
        while (rel && rel !== svgTocGroup && rel !== svgRoot) {
            rel = rel.parentNode;
        }
        if (rel !== svgTocGroup) {
            exports.hide();
            sozi.player.restart();
            evt.stopPropagation();
        }
    }

	function onClickArrowUp(evt) {
        var ty = svgTitlesGroup.getCTM().f;
        if (ty <= -window.innerHeight / 2) {
            ty += window.innerHeight / 2;
        } else if (ty < 0) {
            ty = 0;
        }
        svgTitlesGroup.setAttribute('transform', 'translate(0,' + ty + ')');
        evt.stopPropagation();
	}

	function onClickArrowDown(evt) {
        var ty = svgTitlesGroup.getCTM().f;
        if (ty + tocHeight >= window.innerHeight * 3 / 2) {
            ty -= window.innerHeight / 2;
        } else if (ty + tocHeight > window.innerHeight + 2 * MARGIN) {
            ty = window.innerHeight - tocHeight - 4 * MARGIN;
        }
        svgTitlesGroup.setAttribute('transform', 'translate(0,' + ty + ')');
        evt.stopPropagation();
    }

    function onAnimationStep(progress) {
        var profileProgress = sozi.animation.profiles[ANIMATION_PROFILE](progress),
            remaining = 1 - profileProgress;
        translateX = translateXEnd * profileProgress + translateXStart * remaining;
        svgTocGroup.setAttribute('transform', 'translate(' + translateX + ',0)');
    }
    
    function onAnimationDone() {
        // Empty
    }
    
    /*
     * Create a function that responds to clicks on frame list entries.
     */
    function makeClickHandler(index) {
        return function (evt) {
            sozi.player.previewFrame(index);
            evt.stopPropagation();
        };
    }
    
    /*
     * The default event handler, to prevent event propagation
     * through the frame list.
     */
    function defaultEventHandler(evt) {
	    evt.stopPropagation();
    }
    
    /*
     * Adds a table of contents to the document.
     *
     * The table of contents is a rectangular region with the list of frame titles.
     * Clicking on a title moves the presentation to the corresponding frame.
     *
     * The table of contents is hidden by default.
     */
    function onDisplayReady() {
        svgTocGroup = document.createElementNS(SVG_NS, 'g');
        svgTocGroup.setAttribute('id', 'sozi-toc');
        document.documentElement.appendChild(svgTocGroup);

        svgTitlesGroup = document.createElementNS(SVG_NS, 'g');
        svgTocGroup.appendChild(svgTitlesGroup);
    
        // The background rectangle of the frame list
        var tocBackground = document.createElementNS(SVG_NS, 'rect');
        tocBackground.setAttribute('id', 'sozi-toc-background');
        tocBackground.setAttribute('x', MARGIN);
        tocBackground.setAttribute('y', MARGIN);
        tocBackground.setAttribute('rx', MARGIN);
        tocBackground.setAttribute('ry', MARGIN);
        tocBackground.addEventListener('click', defaultEventHandler, false);
        tocBackground.addEventListener('mousedown', defaultEventHandler, false);
        tocBackground.addEventListener('mouseout', onMouseOut, false);
        svgTitlesGroup.appendChild(tocBackground);

        var tocWidth = 0;
        var currentFrameIndex = sozi.location.getFrameIndex();
        sozi.document.frames.forEach(function (frame, frameIndex) {
            var text = document.createElementNS(SVG_NS, 'text');
            text.appendChild(document.createTextNode(frame.title));
            svgTitlesGroup.appendChild(text);

            if (frameIndex === currentFrameIndex) {
                text.setAttribute('class', 'sozi-toc-current');
            }
                     
            var textWidth = text.getBBox().width;
            tocHeight += text.getBBox().height;
            if (textWidth > tocWidth) {
                tocWidth = textWidth;
            }

            text.setAttribute('x', 2 * MARGIN);
            text.setAttribute('y', tocHeight + MARGIN);
            text.addEventListener('click', makeClickHandler(frameIndex), false);
            text.addEventListener('mousedown', defaultEventHandler, false);
        });

        // The 'up' button
        var tocUp = document.createElementNS(SVG_NS, 'path');
        tocUp.setAttribute('class', 'sozi-toc-arrow');
        tocUp.setAttribute('d', 'M' + (tocWidth + 3 * MARGIN) + ',' + (5 * MARGIN) +
                           ' l' + (4 * MARGIN) + ',0' +
                           ' l-' + (2 * MARGIN) + ',-' + (3 * MARGIN) +
                           ' z');
        tocUp.addEventListener('click', onClickArrowUp, false);
        tocUp.addEventListener('mousedown', defaultEventHandler, false);
        svgTocGroup.appendChild(tocUp);

        // The 'down' button
        var tocDown = document.createElementNS(SVG_NS, 'path');
        tocDown.setAttribute('class', 'sozi-toc-arrow');
        tocDown.setAttribute('d', 'M' + (tocWidth + 3 * MARGIN) + ',' + (7 * MARGIN) +
                             ' l' + (4 * MARGIN) + ',0' +
                             ' l-' + (2 * MARGIN) + ',' + (3 * MARGIN) +
                             ' z');
        tocDown.addEventListener('click', onClickArrowDown, false);
        tocDown.addEventListener('mousedown', defaultEventHandler, false);
        svgTocGroup.appendChild(tocDown);

        tocBackground.setAttribute('width', tocWidth + 7 * MARGIN);
        tocBackground.setAttribute('height', tocHeight + 2 * MARGIN);
        
        translateXHidden = -tocWidth - 9 * MARGIN;
        translateXVisible = 0;
        translateX = translateXEnd = translateXHidden;
        
        svgTocGroup.setAttribute('transform', 'translate(' + translateXHidden + ',0)');
        animator = new sozi.animation.Animator(onAnimationStep, onAnimationDone);
    }

	/*
	 * Highlight the current frame title in the frame list.
	 *
	 * This handler is called on each frame change,
	 * even when the frame list is hidden.
	 */
    function onFrameChange(index) {
        var currentElementList = Array.prototype.slice.call(document.getElementsByClassName('sozi-toc-current'));
        currentElementList.forEach(function (svgElement) {
            svgElement.removeAttribute('class');
        });

        var textElements = svgTitlesGroup.getElementsByTagName('text');
        textElements[index].setAttribute('class', 'sozi-toc-current');
    }
    
    /*
     * Makes the table of contents visible.
     */
    exports.show = function () {
        translateXStart = translateX;
        translateXEnd = translateXVisible;
        animator.start(ANIMATION_TIME_MS); // FIXME depends on current elapsed time
    };

    /*
     * Makes the table of contents invisible.
     */
    exports.hide = function () {
        translateXStart = translateX;
        translateXEnd = translateXHidden;
        animator.start(ANIMATION_TIME_MS); // FIXME depends on current elapsed time
    };

    /*
     * Returns true if the table of contents is visible, false otherwise.
     */
    exports.isVisible = function () {
        return translateXEnd === translateXVisible;
    };

	sozi.events.listen('displayready', onDisplayReady);
	sozi.events.listen('cleanup', exports.hide);
	sozi.events.listen('framechange', onFrameChange);
});

/*
 * Sozi - A presentation tool using the SVG standard
 *
 * Copyright (C) 2010-2012 Guillaume Savaton
 *
 * This program is dual licensed under the terms of the MIT license
 * or the GNU General Public License (GPL) version 3.
 * A copy of both licenses is provided in the doc/ folder of the
 * official release of Sozi.
 *
 * See http://sozi.baierouge.fr/wiki/en:license for details.
 *
 * @depend module.js
 */

module(this, 'sozi.animation', function (exports, window) {
    'use strict';
    
    // The browser-specific function to request an animation frame
    var requestAnimationFrame =
            window.mozRequestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            window.oRequestAnimationFrame;

    // Constant: the default time step
    // for browsers that do not support animation frames
    var TIME_STEP_MS = 40;
    
    // The handle provided by setInterval
    // for browsers that do not support animation frames
    var timer;
    
    // The list of running animators
    var animatorList = [];
    
    /*
     * This function is called periodically and triggers the
     * animation steps in all animators managed by this module.
     *
     * If all animators are removed from the list of animators
     * managed by this module, then the periodic calling is disabled.
     *
     * This function can be called either through requestAnimationFrame()
     * if the browser supports it, or through setInterval().
     */
    function loop(timestamp) {
        if (animatorList.length > 0) {
            // If there is at least one animator,
            // and if the browser provides animation frames,
            // schedule this function to be called again in the next frame.
            if (requestAnimationFrame) {
                requestAnimationFrame(loop);
            }

            // Step all animators
            animatorList.forEach(function (animator) {
                animator.step(timestamp);
            });
        }
        else {
            // If all animators have been removed,
            // and if this function is called periodically
            // through setInterval, disable the periodic calling.
            if (!requestAnimationFrame) {
                window.clearInterval(timer);
            }
        }
    }
    
    /*
     * Start the animation loop.
     *
     * This function delegates the periodic update of all animators
     * to the loop() function, either through requestAnimationFrame()
     * if the browser supports it, or through setInterval().
     */
    function start() {
        if (requestAnimationFrame) {
            requestAnimationFrame(loop);
        }
        else {
            timer = window.setInterval(function () {
                loop(Date.now());
            }, TIME_STEP_MS);
        }
    }
    
    /*
     * Add a new animator object to the list of animators managed
     * by this module.
     *
     * If the animator list was empty before calling this function,
     * then the animation loop is started.
     */
    function addAnimator(animator) {
        animatorList.push(animator);
        if (animatorList.length === 1) {
            start();
        }
    }
    
    /*
     * Remove the given animator from the list of animators
     * managed by this module.
     */
    function removeAnimator(animator) {
        animatorList.splice(animatorList.indexOf(animator), 1);
    }
    
    /*
     * Construct a new animator.
     *
     * Parameters:
     * - onStep: the function to call on each animation step
     * - onDone: the function to call when the animation time is elapsed
     *
     * The onStep() function is expected to have the following parameters:
     *  - progress: a number between 0 and 1 (included) corresponding to
     *    the elapsed fraction of the total duration
     *  - data: an optional object passed to the application-specific animation code
     *
     * The new animator is initialized in the 'stopped' state.
     */
    exports.Animator = function (onStep, onDone) {
        this.onStep = onStep;
        this.onDone = onDone;

        this.durationMs = 0;
        this.data = {};
        this.initialTime = 0;
        this.started = false;
    };

    /*
     * Start the current animator.
     *
     * Parameters:
     *  - durationMs: the animation duration, in milliseconds
     *  - data: an object to pass to the onStep function
     *
     * The current animator is added to the list of animators managed
     * by this module and is put in the 'started' state.
     * It will be removed from the list automatically when the given duration
     * has elapsed.
     *
     * The onStep() function is called once before starting the animation.
     */
    exports.Animator.prototype.start = function (durationMs, data) {
        this.durationMs = durationMs;
        this.data = data;
        this.initialTime = Date.now();
        this.onStep(0, this.data);

        if (!this.started) {
            this.started = true;
            addAnimator(this);
        }
    };

    /*
     * Stop the current animator.
     *
     * The current animator is removed from the list of animators managed
     * by this module and is put in the 'stopped' state.
     */
    exports.Animator.prototype.stop = function () {
        if (this.started) {
            removeAnimator(this);
            this.started = false;
        }
    };

    /*
     * Perform one animation step.
     *
     * This function is called automatically by the loop() function.
     * It calls the onStep() function of this animator.
     * If the animation duration has elapsed, the onDone() function of
     * the animator is called.
     */
    exports.Animator.prototype.step = function (timestamp) {
        var elapsedTime = timestamp - this.initialTime;
        if (elapsedTime >= this.durationMs) {
            this.stop();
            this.onStep(1, this.data);
            this.onDone();
        } else {
            this.onStep(elapsedTime / this.durationMs, this.data);
        }
    };

    /*
     * The acceleration profiles.
     *
     * Each profile is a function that operates in the interval [0, 1]
     * and produces a result in the same interval.
     *
     * These functions are meant to be called in onStep() functions
     * to transform the progress indicator according to the desired
     * acceleration effect.
     */
    exports.profiles = {
        'linear': function (x) {
            return x;
        },

        'accelerate': function (x) {
            return Math.pow(x, 3);
        },

        'strong-accelerate': function (x) {
            return Math.pow(x, 5);
        },

        'decelerate': function (x) {
            return 1 - Math.pow(1 - x, 3);
        },

        'strong-decelerate': function (x) {
            return 1 - Math.pow(1 - x, 5);
        },

        'accelerate-decelerate': function (x) {
            var xs = x <= 0.5 ? x : 1 - x,
                y = Math.pow(2 * xs, 3) / 2;
            return x <= 0.5 ? y : 1 - y;
        },

        'strong-accelerate-decelerate': function (x) {
            var xs = x <= 0.5 ? x : 1 - x,
                y = Math.pow(2 * xs, 5) / 2;
            return x <= 0.5 ? y : 1 - y;
        },

        'decelerate-accelerate': function (x) {
            var xs = x <= 0.5 ? x : 1 - x,
                y = (1 - Math.pow(1 - 2 * xs, 2)) / 2;
            return x <= 0.5 ? y : 1 - y;
        },

        'strong-decelerate-accelerate': function (x) {
            var xs = x <= 0.5 ? x : 1 - x,
                y = (1 - Math.pow(1 - 2 * xs, 3)) / 2;
            return x <= 0.5 ? y : 1 - y;
        }
    };
});


/*
 * Sozi - A presentation tool using the SVG standard
 *
 * Copyright (C) 2010-2012 Guillaume Savaton
 *
 * This program is dual licensed under the terms of the MIT license
 * or the GNU General Public License (GPL) version 3.
 * A copy of both licenses is provided in the doc/ folder of the
 * official release of Sozi.
 *
 * See http://sozi.baierouge.fr/wiki/en:license for details.
 *
 * @depend module.js
 */

module(this, 'sozi.proto', function (exports) {
    'use strict';
    
    exports.Object = {
        installConstructors: function () {
            var thisObject = this;
            
            this.instance = function () {
                thisObject.construct.apply(this, arguments);
                this.installConstructors();
                this.type = thisObject;
                this.supertype = exports.Object;
            };
            
            this.subtype = function (anObject) {
                this.augment(anObject);
                this.installConstructors();
                this.supertype = thisObject;
            };
            
            this.instance.prototype = this;
            this.subtype.prototype = this;
        },
        
        construct: function () {},
        
        augment: function (anObject) {
            for (var attr in anObject) {
                if (anObject.hasOwnProperty(attr)) {
                    this[attr] = anObject[attr];
                }
            }
        },
        
        isInstanceOf: function (anObject) {
            return this.type === anObject
                || exports.Object.isPrototypeOf(this.type) && this.type.isSubtypeOf(anObject);
        },
        
        isSubtypeOf: function (anObject) {
            return this.supertype === anObject
                || exports.Object.isPrototypeOf(this.supertype) && this.supertype.isSubtypeOf(anObject);
        }
    };
    
    // Bootstrap the root object
    exports.Object.installConstructors();
});

/*
 * Sozi - A presentation tool using the SVG standard
 *
 * Copyright (C) 2010-2012 Guillaume Savaton
 *
 * This program is dual licensed under the terms of the MIT license
 * or the GNU General Public License (GPL) version 3.
 * A copy of both licenses is provided in the doc/ folder of the
 * official release of Sozi.
 *
 * See http://sozi.baierouge.fr/wiki/en:license for details.
 *
 * @depend module.js
 * @depend proto.js
 * @depend events.js
 */

module(this, 'sozi.display', function (exports, window) {
    'use strict';
    
    // The global document object
    var document = window.document;
    
    // The initial bounding box of the whole document,
    // assigned in onDocumentReady()
    var initialBBox;
    
    // Constant: the Sozi namespace
    var SVG_NS = 'http://www.w3.org/2000/svg';

    // The geometry of each layer managed by Sozi
    exports.layers = {};

    exports.CameraState = new sozi.proto.Object.subtype({
        construct : function () {
            // Center coordinates
            this.cx = this.cy = 0;
            
            // Dimensions
            this.width = this.height = 1;
            
            // Rotation angle, in degrees
            this.angle = 0;
            
            // Clipping
            this.clipped = true;
        },

        setCenter: function (cx, cy) {
            this.cx = cx;
            this.cy = cy;
            return this;
        },
        
        setSize: function (width, height) {
            this.width = width;
            this.height = height;
            return this;
        },
        
        setClipped: function (clipped) {
            this.clipped = clipped;
            return this;
        },
        
        /*
         * Set the angle of the current camera state.
         * The angle of the current state is normalized
         * in the interval [-180 ; 180]
         */
        setAngle: function (angle) {
            this.angle = (angle + 180) % 360 - 180;
            return this;
        },
        
        setRawAngle: function (angle) {
            this.angle = angle;
        },
        
        /*
         * Set the current camera's properties to the given SVG element.
         *
         * If the element is a rectangle, the properties of the frames are based
         * on the geometrical properties of the rectangle.
         * Otherwise, the properties of the frame are based on the bounding box
         * of the given element.
         *
         * Parameters:
         *    - svgElement: an element from the SVG DOM
         */
        setAtElement: function (svgElement) {
            // Read the raw bounding box of the given SVG element
            var x, y, w, h;
            if (svgElement.nodeName === 'rect') {
                x = svgElement.x.baseVal.value;
                y = svgElement.y.baseVal.value;
                w = svgElement.width.baseVal.value;
                h = svgElement.height.baseVal.value;
            } else {
                var b = svgElement.getBBox();
                x = b.x;
                y = b.y;
                w = b.width;
                h = b.height;
            }

            // Compute the raw coordinates of the center
            // of the given SVG element
            var c = document.documentElement.createSVGPoint();
            c.x = x + w / 2;
            c.y = y + h / 2;
            
            // Compute the coordinates of the center of the given SVG element
            // after its current transformation
            var matrix = svgElement.getCTM();
            c = c.matrixTransform(matrix);

            // Compute the scaling factor applied to the given SVG element
            var scale = Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b);
            
            // Update the camera to match the bounding box information of the
            // given SVG element after its current transformation
            return this.setCenter(c.x, c.y)
                .setSize(w * scale, h * scale)
                .setAngle(Math.atan2(matrix.b, matrix.a) * 180 / Math.PI);
        },

        setAtState: function (other) {
            return this.setCenter(other.cx, other.cy)
                .setSize(other.width, other.height)
                .setAngle(other.angle)
                .setClipped(other.clipped);
        },
        
        getScale: function () {
            return Math.min(window.innerWidth / this.width, window.innerHeight / this.height);
        }
    });
    
    exports.Camera = new exports.CameraState.subtype({
        construct: function (idLayer) {
            exports.CameraState.construct.call(this);
            
            // Clipping rectangle
            this.svgClipRect = document.createElementNS(SVG_NS, 'rect');
        
            // Layer element (typically a 'g' element)
            this.svgLayer = document.getElementById(idLayer);
        }
    });
    
    /*
     * Initializes the current Display.
     *
     * This method prepares the DOM representation of the current SVG document.
     * All the image is embedded into a global 'g' element on which transformations will be applied.
     * A clipping rectangle is added.
     *
     * This method must be called when the document is ready to be manipulated.
     */
    function onDocumentReady() {
        var svgRoot = document.documentElement; // TODO check SVG tag
        
        // Save the initial bounding box of the document
        // and force its dimensions to the browser window
        initialBBox = svgRoot.getBBox();
        svgRoot.setAttribute('width', window.innerWidth);
        svgRoot.setAttribute('height', window.innerHeight);
        
        // Initialize display geometry for all layers
        sozi.document.idLayerList.forEach(function (idLayer) {
            exports.layers[idLayer] = new exports.Camera.instance(idLayer);

/*            // Add a clipping path
            var svgClipPath = document.createElementNS(SVG_NS, 'clipPath');
            svgClipPath.setAttribute('id', 'sozi-clip-path-' + idLayer);
            svgClipPath.appendChild(exports.layers[idLayer].svgClipRect);
            svgRoot.appendChild(svgClipPath);

            // Create a group that will support the clipping operation
            // and move the layer group into that new group
            var svgClippedGroup = document.createElementNS(SVG_NS, 'g');
            svgClippedGroup.setAttribute('clip-path', 'url(#sozi-clip-path-' + idLayer + ')');
            
            // Adding the layer group to the clipped group must preserve layer ordering
            svgRoot.insertBefore(svgClippedGroup, exports.layers[idLayer].svgLayer);
            svgClippedGroup.appendChild(exports.layers[idLayer].svgLayer);*/
        });

        sozi.events.fire('displayready');
    }

    /*
     * Resizes the SVG document to fit the browser window.
     */
    function resize() {
        var svgRoot = document.documentElement;
        svgRoot.setAttribute('width', window.innerWidth);
        svgRoot.setAttribute('height', window.innerHeight);
        exports.update();
    }

    /*
     * Returns the geometrical properties of the SVG document
     *
     * Returns:
     *    - The default size, translation and rotation for the document's bounding box
     */
    exports.getDocumentGeometry = function () {
        // This object defines the bounding box of the whole document
        var camera = new exports.CameraState.instance()
            .setCenter(initialBBox.x + initialBBox.width / 2,
                       initialBBox.y + initialBBox.height / 2)
            .setSize(initialBBox.width, initialBBox.height)
            .setClipped(false);
        
        // Copy the document's bounding box to all layers
        var result = { layers: {} };
        for (var idLayer in exports.layers) {
            if (exports.layers.hasOwnProperty(idLayer)) {
                result.layers[idLayer] = camera;
            }
        }
        return result;
    };

    /*
     * Apply geometrical transformations to the image according to the current
     * geometrical attributes of this Display.
     *
     * This method is called automatically when the window is resized.
     *
     * TODO move the loop body to CameraState
     */
    exports.update = function () {
        for (var idLayer in exports.layers) {
            if (exports.layers.hasOwnProperty(idLayer)) {
                var lg = exports.layers[idLayer];

                var scale = lg.getScale();
                
                // Compute the size and location of the frame on the screen
                var width = lg.width  * scale;
                var height = lg.height * scale;
                var x = (window.innerWidth - width) / 2;
                var y = (window.innerHeight - height) / 2;

                // Adjust the location and size of the clipping rectangle and the frame rectangle
                var cr = exports.layers[idLayer].svgClipRect;
                cr.setAttribute('x', lg.clipped ? x : 0);
                cr.setAttribute('y', lg.clipped ? y : 0);
                cr.setAttribute('width',  lg.clipped ? width  : window.innerWidth);
                cr.setAttribute('height', lg.clipped ? height : window.innerHeight);
                
                // Compute and apply the geometrical transformation to the layer group
                var translateX = -lg.cx + lg.width / 2  + x / scale;
                var translateY = -lg.cy + lg.height / 2 + y / scale;

                exports.layers[idLayer].svgLayer.setAttribute('transform',
                    'scale(' + scale + ')' +
                    'translate(' + translateX + ',' + translateY + ')' +
                    'rotate(' + (-lg.angle) + ',' + lg.cx + ',' + lg.cy + ')'
                );
            }
        }
    };

    /*
     * Transform the SVG document to show the given frame.
     *
     * Parameters:
     *    - frame: the frame to show
     */
    exports.showFrame = function (frame) {
        for (var idLayer in frame.layers) {
            if (frame.layers.hasOwnProperty(idLayer)) {
                exports.layers[idLayer].setAtState(frame.layers[idLayer]);
            }
        }
        exports.update();
    };

    /*
     * Apply an additional translation to the SVG document based on onscreen coordinates.
     *
     * Parameters:
     *    - deltaX: the horizontal displacement, in pixels
     *    - deltaY: the vertical displacement, in pixels
     *
     * TODO move the loop body to CameraState
     */
    exports.drag = function (deltaX, deltaY) {
        for (var idLayer in exports.layers) {
            if (exports.layers.hasOwnProperty(idLayer)) {
                var lg = exports.layers[idLayer];
                var scale = lg.getScale();
                var angleRad = lg.angle * Math.PI / 180;
                lg.cx -= (deltaX * Math.cos(angleRad) - deltaY * Math.sin(angleRad)) / scale;
                lg.cy -= (deltaX * Math.sin(angleRad) + deltaY * Math.cos(angleRad)) / scale;
                lg.clipped = false;
            }
        }
        exports.update();
    };

    /*
     * Zooms the display with the given factor.
     *
     * The zoom is centered around (x, y) with respect to the center of the display area.
     *
     * TODO move the loop body to CameraState
     */
    exports.zoom = function (factor, x, y) {
        for (var idLayer in exports.layers) {
            if (exports.layers.hasOwnProperty(idLayer)) {
                exports.layers[idLayer].width /= factor;
                exports.layers[idLayer].height /= factor;
            }
        }
        
        exports.drag(
            (1 - factor) * (x - window.innerWidth / 2),
            (1 - factor) * (y - window.innerHeight / 2)
        );
    };

    /*
     * Rotate the display with the given angle.
     *
     * The rotation is centered around the center of the display area.
     *
     * TODO move the loop body to CameraState
     */
    exports.rotate = function (angle) {
        for (var idLayer in exports.layers) {
            if (exports.layers.hasOwnProperty(idLayer)) {
                exports.layers[idLayer].angle += angle;
                exports.layers[idLayer].angle %= 360;
            }
        }
        exports.update();
    };
    
    sozi.events.listen('documentready', onDocumentReady);
    window.addEventListener('resize', resize, false);
});

/*
 * Sozi - A presentation tool using the SVG standard
 *
 * Copyright (C) 2010-2012 Guillaume Savaton
 *
 * This program is dual licensed under the terms of the MIT license
 * or the GNU General Public License (GPL) version 3.
 * A copy of both licenses is provided in the doc/ folder of the
 * official release of Sozi.
 *
 * See http://sozi.baierouge.fr/wiki/en:license for details.
 *
 * @depend module.js
 * @depend events.js
 * @depend animation.js
 * @depend display.js
 */

module(this, 'sozi.player', function (exports, window) {
    'use strict';
    
    // An alias to the Sozi display module
    var display = sozi.display;
    
    // The animator object used to animate transitions
    var animator;
    
    // The handle returned by setTimeout() for frame timeout
    var nextFrameTimeout;
    
    // Constants: default animation properties
    // for out-of-sequence transitions
    var DEFAULT_DURATION_MS = 500;
    var DEFAULT_ZOOM_PERCENT = -10;
    var DEFAULT_PROFILE = 'linear';
    
    // The source frame index for the current transition
    var sourceFrameIndex = 0;
    
    // The index of the visible frame
    var currentFrameIndex = 0;
    
    // The state of the presentation.
    // If false, no automatic transition will be fired.
    var playing = false;
    
    // The state of the current frame.
    // If true, an automatic transition will be fired after the current timeout.
    var waiting = false;

    /*
     * Event handler: animation step.
     *
     * This method is called periodically by animator after the animation
     * has been started, and until the animation time is elapsed.
     *
     * Parameter data provides the following information:
     *    - initialState and finalState contain the geometrical properties of the display
     *      at the start and end of the animation.
     *    - profile is a reference to the speed profile function to use.
     *    - zoomWidth and zoomHeight are the parameters of the zooming polynomial if the current
     *      animation has a non-zero zooming effect.
     *
     * Parameter progress is a float number between 0 (start of the animation)
     * and 1 (end of the animation).
     *
     * TODO move the interpolation code to display.js
     */
    function onAnimationStep(progress, data) {
        for (var idLayer in data) {
            if (data.hasOwnProperty(idLayer)) {
                var lg = display.layers[idLayer];
                
                var profileProgress = data[idLayer].profile(progress);
                var profileRemaining = 1 - profileProgress;
                
                for (var attr in data[idLayer].initialState) {
                    if (data[idLayer].initialState.hasOwnProperty(attr)) {
                        if (typeof data[idLayer].initialState[attr] === 'number' && typeof data[idLayer].finalState[attr] === 'number') {
                            lg[attr] = data[idLayer].finalState[attr] * profileProgress + data[idLayer].initialState[attr] * profileRemaining;
                        }
                    }
                }

                var ps;
                if (data[idLayer].zoomWidth && data[idLayer].zoomWidth.k !== 0) {
                    ps = progress - data[idLayer].zoomWidth.ts;
                    lg.width = data[idLayer].zoomWidth.k * ps * ps + data[idLayer].zoomWidth.ss;
                }

                if (data[idLayer].zoomHeight && data[idLayer].zoomHeight.k !== 0) {
                    ps = progress - data[idLayer].zoomHeight.ts;
                    lg.height = data[idLayer].zoomHeight.k * ps * ps + data[idLayer].zoomHeight.ss;
                }

                lg.clipped = data[idLayer].finalState.clipped;
            }
        }
        
        display.update();
    }

    /*
     * Starts waiting before moving to the next frame.
     *
     * It the current frame has a timeout set, this method
     * will register a timer to move to the next frame automatically
     * after the specified time.
     *
     * If the current frame is the last, the presentation will
     * move to the first frame.
     */
    function waitTimeout() {
        if (sozi.document.frames[currentFrameIndex].timeoutEnable) {
            waiting = true;
            var index = (currentFrameIndex + 1) % sozi.document.frames.length;
            nextFrameTimeout = window.setTimeout(function () {
                    exports.moveToFrame(index);
                },
                sozi.document.frames[currentFrameIndex].timeoutMs
            );
        }
    }

    /*
     * Event handler: animation done.
     *
     * This method is called by animator when the current animation is finished.
     *
     * If the animation was a transition in the normal course of the presentation,
     * then we call the waitTimeout method to process the timeout property of the current frame.
     */
    function onAnimationDone() {
        sourceFrameIndex = currentFrameIndex;
        if (playing) {
            waitTimeout();
        }
    }

    /*
     * Starts the presentation from the given frame index (0-based).
     *
     * This method sets the 'playing' flag, shows the desired frame
     * and calls waitTimeout.
     */
    exports.startFromIndex = function (index) {
        playing = true;
        waiting = false;
        sourceFrameIndex = index;
        currentFrameIndex = index;
        display.showFrame(sozi.document.frames[index]);
        waitTimeout();
    };

    exports.restart = function () {
        exports.startFromIndex(currentFrameIndex);
    };

    /*
     * Stops the presentation.
     *
     * This method clears the 'playing'.
     * If the presentation was in 'waiting' mode due to a timeout
     * in the current frame, then it stops waiting.
     * The current animation is stopped in its current state.
     */
    exports.stop = function () {
        animator.stop();
        if (waiting) {
            window.clearTimeout(nextFrameTimeout);
            waiting = false;
        }
        playing = false;
        sourceFrameIndex = currentFrameIndex;
    };

    function getZoomData(zoomPercent, s0, s1) {
        var result = {
            ss: ((zoomPercent < 0) ? Math.max(s0, s1) : Math.min(s0, s1)) * (100 - zoomPercent) / 100,
            ts: 0.5,
            k: 0
        };

        if (zoomPercent !== 0) {
            var a = s0 - s1;
            var b = s0 - result.ss;
            var c = s1 - result.ss;

            if (a !== 0) {
                var d = Math.sqrt(b * c);

                var u = (b - d) / a;
                var v = (b + d) / a;

                result.ts = (u > 0 && u <= 1) ? u : v;
            }

            result.k = b / result.ts / result.ts;
        }

        return result;
    }

    /*
     * Jump to a frame with the given index (0-based).
     *
     * This method does not animate the transition from the current
     * state of the display to the desired frame.
     *
     * The presentation is stopped: if a timeout has been set for the
     * target frame, it will be ignored.
     *
     * The URL hash is set to the given frame index (1-based).
     */
    exports.jumpToFrame = function (index) {
        exports.stop();
        sozi.events.fire('cleanup');

        sourceFrameIndex = index;
        currentFrameIndex = index;
        display.showFrame(sozi.document.frames[index]);

        sozi.events.fire('framechange', index);
    };

    /*
     * Returns an associative array where keys are layer names
     * and values are objects in the form { initialState: finalState: profile: zoomWidth: zoomHeight:}
     */
    function getAnimationData(initialState, finalState, zoomPercent, profile) {
        var data = {};
        
        for (var idLayer in initialState.layers) {
            if (initialState.layers.hasOwnProperty(idLayer)) {
                data[idLayer] = {
                    initialState: new sozi.display.CameraState.instance(),
                    finalState: new sozi.display.CameraState.instance()
                };
                
                data[idLayer].profile = profile || finalState.layers[idLayer].transitionProfile;
                data[idLayer].initialState.setAtState(initialState.layers[idLayer]);

                // If the current layer is referenced in final state, copy the final properties
                // else, copy initial state to final state for the current layer.
                if (finalState.layers.hasOwnProperty(idLayer)) {
                    data[idLayer].finalState.setAtState(finalState.layers[idLayer]);
                }
                else {
                    data[idLayer].finalState.setAtState(initialState.layers[idLayer]);
                }

                // Keep the smallest angle difference between initial state and final state
                // TODO this should be handled in the interpolation function
                if (data[idLayer].finalState.angle - data[idLayer].initialState.angle > 180) {
                    data[idLayer].finalState.setRawAngle(data[idLayer].finalState.angle - 360);
                }
                else if (data[idLayer].finalState.angle - data[idLayer].initialState.angle < -180) {
                    data[idLayer].initialState.setRawAngle(data[idLayer].initialState.angle - 360);
                }

                var zp = zoomPercent || finalState.layers[idLayer].transitionZoomPercent;
                
                if (zp && finalState.layers.hasOwnProperty(idLayer)) {
                    data[idLayer].zoomWidth = getZoomData(zp,
                        initialState.layers[idLayer].width,
                        finalState.layers[idLayer].width);
                    data[idLayer].zoomHeight = getZoomData(zp,
                        initialState.layers[idLayer].height,
                        finalState.layers[idLayer].height);
                }
            }
        }
        
        return data;
    }
    
    exports.previewFrame = function (index) {
        currentFrameIndex = index;
        animator.start(DEFAULT_DURATION_MS,
            getAnimationData(display, sozi.document.frames[index],
                DEFAULT_ZOOM_PERCENT, sozi.animation.profiles[DEFAULT_PROFILE]));
        sozi.events.fire('framechange', index);
    };

    /*
     * Moves to a frame with the given index (0-based).
     *
     * This method animates the transition from the current
     * state of the display to the desired frame.
     *
     * If the given frame index corresponds to the next frame in the list,
     * the transition properties of the next frame are used.
     * Otherwise, default transition properties are used.
     *
     * The URL hash is set to the given frame index (1-based).
     */
    exports.moveToFrame = function (index) {
        if (waiting) {
            window.clearTimeout(nextFrameTimeout);
            waiting = false;
        }

        var durationMs, zoomPercent, profile;
        if (index === (currentFrameIndex + 1) % sozi.document.frames.length) {
            durationMs = sozi.document.frames[index].transitionDurationMs;
            zoomPercent = undefined; // Set for each layer
            profile = undefined; // Set for each layer
        }
        else {
            durationMs = DEFAULT_DURATION_MS;
            zoomPercent = DEFAULT_ZOOM_PERCENT;
            profile = sozi.animation.profiles[DEFAULT_PROFILE];
        }

        sozi.events.fire('cleanup');

        playing = true;
        currentFrameIndex = index;

        animator.start(durationMs, getAnimationData(display, sozi.document.frames[index], zoomPercent, profile));

        sozi.events.fire('framechange', index);
    };

    /*
     * Moves to the first frame of the presentation.
     */
    exports.moveToFirst = function () {
        exports.moveToFrame(0);
    };

    /*
     * Jumps to the previous frame
     */
    exports.jumpToPrevious = function () {
        var index = currentFrameIndex;
        if (!animator.started || sourceFrameIndex <= currentFrameIndex) {
            index -= 1;
        }
        if (index >= 0) {
            exports.jumpToFrame(index);
        }
    };

    /*
     * Moves to the previous frame.
     */
    exports.moveToPrevious = function () {
        for (var index = currentFrameIndex - 1; index >= 0; index -= 1) {
            var frame = sozi.document.frames[index];
            if (!frame.timeoutEnable || frame.timeoutMs !== 0) {
                exports.moveToFrame(index);
                break;
            }
        }
    };

    /*
     * Jumps to the next frame
     */
    exports.jumpToNext = function () {
        var index = currentFrameIndex;
        if (!animator.started || sourceFrameIndex >= currentFrameIndex) {
            index += 1;
        }
        if (index < sozi.document.frames.length) {
            exports.jumpToFrame(index);
        }
    };

    /*
     * Moves to the next frame.
     */
    exports.moveToNext = function () {
        if (currentFrameIndex < sozi.document.frames.length - 1 || sozi.document.frames[currentFrameIndex].timeoutEnable) {
            exports.moveToFrame((currentFrameIndex + 1) % sozi.document.frames.length);
        }
    };

    /*
     * Moves to the last frame of the presentation.
     */
    exports.moveToLast = function () {
        exports.moveToFrame(sozi.document.frames.length - 1);
    };

    /*
     * Restores the current frame.
     *
     * This method restores the display to fit the current frame,
     * e.g. after the display has been zoomed or dragged.
     */
    exports.moveToCurrent = function () {
        exports.moveToFrame(currentFrameIndex);
    };

    /*
     * Shows all the document in the browser window.
     */
    exports.showAll = function () {
        exports.stop();
        sozi.events.fire('cleanup');
        animator.start(DEFAULT_DURATION_MS,
            getAnimationData(display, display.getDocumentGeometry(),
                DEFAULT_ZOOM_PERCENT, sozi.animation.profiles[DEFAULT_PROFILE]
            )
        );
    };

    /*
     * Event handler: display ready.
     */
    function onDisplayReady() {
        exports.startFromIndex(sozi.location.getFrameIndex());

        // Hack to fix the blank screen bug in Chrome/Chromium
        // See https://github.com/senshu/Sozi/issues/109
        window.setTimeout(display.update, 1);
    }

    animator = new sozi.animation.Animator(onAnimationStep, onAnimationDone);

    sozi.events.listen('displayready', onDisplayReady);
});

/*
 * Sozi - A presentation tool using the SVG standard
 *
 * Copyright (C) 2010-2012 Guillaume Savaton
 *
 * This program is dual licensed under the terms of the MIT license
 * or the GNU General Public License (GPL) version 3.
 * A copy of both licenses is provided in the doc/ folder of the
 * official release of Sozi.
 *
 * See http://sozi.baierouge.fr/wiki/en:license for details.
 *
 * @depend module.js
 * @depend player.js
 * @depend display.js
 */

module(this, 'sozi.actions', function (exports, window) {
    'use strict';
    
    // Module aliases
    var player = sozi.player;
    var display = sozi.display;
    
    // The global document object
    var document = window.document;
    
    // Constants: mouse button numbers
    var DRAG_BUTTON = 0;    // Left button
    var TOC_BUTTON = 1;     // Middle button
    
    // Constants: increments for zooming and rotating
    var SCALE_FACTOR = 1.05;
    var ROTATE_STEP = 5;
    
    // State variables for the drag action
    var dragButtonIsDown = false;
    var dragging = false;
    var dragClientX = 0;
    var dragClientY = 0;
    
    /*
     * Zooms the display in the given direction.
     *
     * Only the sign of direction is used:
     *    - zoom in when direction > 0
     *    - zoom out when direction <= 0
     *
     * The scaling is centered around point (x, y).
     */
    function zoom(direction, x, y) {
        player.stop();
        display.zoom(direction > 0 ? SCALE_FACTOR : 1 / SCALE_FACTOR, x, y);
    }
    
    /*
     * Rotate the display in the given direction.
     *
     * Only the sign of direction is used:
     *    - rotate anticlockwise when direction > 0
     *    - rotate clockwise when direction <= 0
     */
    function rotate(direction) {
        player.stop();
        display.rotate(direction > 0 ? ROTATE_STEP : -ROTATE_STEP);
    }
    
    /*
     * Show/hide the frame list.
     *
     * The presentation stops when the frame list is showed,
     * and restarts when the frame list is hidden.
     */
    function toggleFrameList() {
        if (sozi.framelist.isVisible()) {
            sozi.framelist.hide();
            player.restart();
        } else {
            player.stop();
            sozi.framelist.show();
        }
    }

    /*
     * Event handler: mouse down.
     *
     * When the left button is pressed, we register the current coordinates
     * in case the mouse will be dragged. Flag 'dragButtonIsDown' is set until
     * the button is released (onMouseUp). This flag is used by onMouseMove.
     *
     * When the middle button is pressed, the table of contents is shown or hidden.
     */
    function onMouseDown(evt) {
        if (evt.button === DRAG_BUTTON) {
            dragButtonIsDown = true;
            dragging = false;
            dragClientX = evt.clientX;
            dragClientY = evt.clientY;
        } else if (evt.button === TOC_BUTTON) {
            toggleFrameList();
        }
        evt.stopPropagation();
        evt.preventDefault();
    }

    /*
     * Event handler: mouse move.
     *
     * If the left mouse button is down, then the mouse move is a drag action.
     * This method computes the displacement since the button was pressed or
     * since the last move, and updates the reference coordinates for the next move.
     */
    function onMouseMove(evt) {
        if (dragButtonIsDown) {
            player.stop();
            dragging = true;
            sozi.events.fire('cleanup');
            display.drag(evt.clientX - dragClientX, evt.clientY - dragClientY);
            dragClientX = evt.clientX;
            dragClientY = evt.clientY;
        }
        evt.stopPropagation();
    }

    /*
     * Event handler: mouse up.
     *
     * Releasing the left button resets the 'dragButtonIsDown' flag.
     */
    function onMouseUp(evt) {
        if (evt.button === DRAG_BUTTON) {
            dragButtonIsDown = false;
        }
        evt.stopPropagation();
        evt.preventDefault();
    }

    /*
     * Event handler: context menu (i.e. right click).
     *
     * Right click goes one frame back.
     *
     * There is no 'click' event for the right mouse button and the menu
     * can't be disabled in 'onMouseDown'.
     */
    function onContextMenu(evt) {
        player.moveToPrevious();
        evt.stopPropagation();
        evt.preventDefault();
    }

    /*
     * Event handler: mouse click.
     *
     * Left-click moves the presentation to the next frame.
     *
     * No 'click' event is generated for the middle button in Firefox.
     * See 'onMouseDown' for middle click handling.
     *
     * Dragging the mouse produces a 'click' event when the button is released.
     * If flag 'dragging' was set by 'onMouseMove', then the click event is the result
     * of a drag action.
     */
    function onClick(evt) {
        if (!dragging && evt.button !== TOC_BUTTON) {
            player.moveToNext();
        }
        evt.stopPropagation();
        evt.preventDefault();
    }

    /*
     * Event handler: mouse wheel.
     *
     * Rolling the mouse wheel stops the presentation and zooms the current display.
     *
     * FIXME shift key does not work in Opera
     */
    function onWheel(evt) {
        if (!evt) {
            evt = window.event;
        }

        var delta = 0;
        if (evt.wheelDelta) { // IE and Opera
            delta = evt.wheelDelta;
        }
        else if (evt.detail) { // Mozilla
            delta = -evt.detail;
        }
        
        if (delta !== 0) {
            if (evt.shiftKey) {
                rotate(delta);
            }
            else {
                zoom(delta, evt.clientX, evt.clientY);
            }
        }
        
        evt.stopPropagation();
        evt.preventDefault();
    }

    /*
     * Event handler: key press.
     *
     * Keyboard handling is split into two methods: onKeyPress and onKeyDown
     * in order to get the same behavior across browsers.
     *
     * This method handles character keys '+', '-', '=', 'F' and 'T'.
     */
    function onKeyPress(evt) {
        // Keys with modifiers are ignored
        if (evt.altKey || evt.ctrlKey || evt.metaKey) {
            return;
        }

        switch (evt.charCode || evt.keyCode) {
        case 43: // +
            zoom(1, window.innerWidth / 2, window.innerHeight / 2);
            break;
        case 45: // -
            zoom(-1, window.innerWidth / 2, window.innerHeight / 2);
            break;
        case 61: // =
            player.moveToCurrent();
            break;
        case 70: // F
        case 102: // f
            player.showAll();
            break;
        case 84: // T
        case 116: // t
            toggleFrameList();
            break;
        case 82: // R
            rotate(-1);
            break;
        case 114: // r
            rotate(1);
            break;
        }

        evt.stopPropagation();
        evt.preventDefault();
    }

    /*
     * Event handler: key down.
     *
     * Keyboard handling is split into two methods: onKeyPress and onKeyDown
     * in order to get the same behavior across browsers.
     *
     * This method handles navigation keys (arrows, page up/down, home, end)
     * and the space and enter keys.
     */
    function onKeyDown(evt) {
        // Keys with modifiers are ignored
        if (evt.altKey || evt.ctrlKey || evt.metaKey) {
            return;
        }

        switch (evt.keyCode) {
        case 36: // Home
            player.moveToFirst();
            break;
        case 35: // End
            player.moveToLast();
            break;
        case 38: // Arrow up
            player.jumpToPrevious();
            break;
        case 33: // Page up
        case 37: // Arrow left
            player.moveToPrevious();
            break;
        case 40: // Arrow down
            player.jumpToNext();
            break;
        case 34: // Page down
        case 39: // Arrow right
        case 13: // Enter
        case 32: // Space
            player.moveToNext();
            break;
        }
        
        evt.stopPropagation();
        
        // In Chrome/Chromium, preventDefault() inhibits the 'keypress' event
    }

    function onLoad() {
        var svgRoot = document.documentElement;

        // TODO also use shift-click as an alternative for middle-click
        svgRoot.addEventListener('click', onClick, false);
        svgRoot.addEventListener('mousedown', onMouseDown, false);
        svgRoot.addEventListener('mouseup', onMouseUp, false);
        svgRoot.addEventListener('mousemove', onMouseMove, false);
        svgRoot.addEventListener('keypress', onKeyPress, false);
        svgRoot.addEventListener('keydown', onKeyDown, false);
        svgRoot.addEventListener('contextmenu', onContextMenu, false);
        svgRoot.addEventListener('DOMMouseScroll', onWheel, false); // Mozilla
        window.onmousewheel = onWheel;
    }

    window.addEventListener('load', onLoad, false);
});

/*
* Sozi - A presentation tool using the SVG standard
*
* Copyright (C) 2010-2012 Guillaume Savaton
*
* This program is dual licensed under the terms of the MIT license
* or the GNU General Public License (GPL) version 3.
* A copy of both licenses is provided in the doc/ folder of the
* official release of Sozi.
*
* See http://sozi.baierouge.fr/wiki/en:license for details.
*
* @depend module.js
* @depend events.js
*/

module(this, 'sozi.document', function (exports, window) {
    'use strict';
    
    // An alias to the global document object
    var document = window.document;
    
    // Constant: the Sozi namespace
    var SOZI_NS = 'http://sozi.baierouge.fr';
    
    // Constant: the default frame properties, if missing in the SVG document
    var DEFAULTS = {
        'title': 'Untitled',
        'sequence': '0',
        'hide': 'true',
        'clip': 'false',
        'timeout-enable': 'false',
        'timeout-ms': '5000',
        'transition-duration-ms': '1000',
        'transition-zoom-percent': '0',
        'transition-profile': 'linear'
    };

    // The definitions of all valid frames in the current document
    exports.frames = [];
    
    // The list of layer ids managed by Sozi
    exports.idLayerList = [];
    
    /*
    * Returns the value of an attribute of a given Sozi SVG element.
    *
    * If the attribute is not set, then a default value is returned.
    * See DEFAULTS.
    */
    function readAttribute(soziElement, attr) {
        var value = soziElement.getAttributeNS(SOZI_NS, attr);
        return value === '' ? DEFAULTS[attr] : value;
    }

    function readLayerProperties(frame, idLayer, soziElement) {
        var layer = frame.layers[idLayer] =
            frame.layers[idLayer] || new sozi.display.CameraState.instance();
        
        if (typeof layer.hide === 'undefined' || soziElement.hasAttributeNS(SOZI_NS, 'hide')) {
            layer.hide = readAttribute(soziElement, 'hide') === 'true';
        }

        if (typeof layer.transitionZoomPercent === 'undefined' || soziElement.hasAttributeNS(SOZI_NS, 'transition-zoom-percent')) {
            layer.transitionZoomPercent = parseInt(readAttribute(soziElement, 'transition-zoom-percent'), 10);
        }

        if (typeof layer.transitionProfile === 'undefined' || soziElement.hasAttributeNS(SOZI_NS, 'transition-profile')) {
            layer.transitionProfile = sozi.animation.profiles[readAttribute(soziElement, 'transition-profile') || 'linear'];
        }
        
        if (soziElement.hasAttributeNS(SOZI_NS, 'refid')) {
            // The previous value of the 'clip' attribute will be preserved
            // when setting the new geometry object.
            var svgElement = document.getElementById(soziElement.getAttributeNS(SOZI_NS, 'refid'));
            if (svgElement) {
                if (layer.hide) {
                    svgElement.style.visibility = 'hidden';
                }
                layer.setAtElement(svgElement);
            }
        }
            
        if (soziElement.hasAttributeNS(SOZI_NS, 'clip')) {
            layer.setClipped(readAttribute(soziElement, 'clip') === 'true');
        }
    }
    
    /*
    * Builds the list of frames from the current document.
    *
    * This method collects all elements with tag 'sozi:frame' and
    * retrieves their geometrical and animation attributes.
    * SVG elements that should be hidden during the presentation are hidden.
    *
    * The resulting list is available in frames, sorted by frame indices.
    */
    function readFrames() {
        // Collect all group ids of <layer> elements
        var soziLayerList = Array.prototype.slice.call(document.getElementsByTagNameNS(SOZI_NS, 'layer'));
        soziLayerList.forEach(function (soziLayer) {
            var idLayer = soziLayer.getAttributeNS(SOZI_NS, 'group');
            if (idLayer && exports.idLayerList.indexOf(idLayer) === -1 && document.getElementById(idLayer)) {
                exports.idLayerList.push(idLayer);
            }
        });

        // If at least one <frame> element has a refid attribute,
        // reorganize the document, grouping objects that do not belong
        // to a group referenced in <layer> elements
        var soziFrameList = Array.prototype.slice.call(document.getElementsByTagNameNS(SOZI_NS, 'frame'));
        if (soziFrameList.some(function (soziFrame) {
                return soziFrame.hasAttributeNS(SOZI_NS, 'refid');
            }))
        {
            var svgRoot = document.documentElement;
            var SVG_NS = 'http://www.w3.org/2000/svg';

            // Create the first wrapper group
            var svgWrapper = document.createElementNS(SVG_NS, 'g');

            // For each child of the root SVG element
            var svgElementList = Array.prototype.slice.call(svgRoot.childNodes);
            svgElementList.forEach(function (svgElement, index) {
                if (!svgElement.getAttribute) {
                    // Remove text elements
                    svgRoot.removeChild(svgElement);
                }
                else if (exports.idLayerList.indexOf(svgElement.getAttribute('id')) === -1) {
                    // If the current element is not a referenced layer,
                    // move it to the current wrapper element
                    // FIXME move graphic elements only
                    svgRoot.removeChild(svgElement);
                    svgWrapper.appendChild(svgElement);
                }
                else if (svgWrapper.firstChild) {
                    // If the current element is a referenced layer,
                    // and if there were other non-referenced elements before it,
                    // insert the wrapper group before the current element
                    svgWrapper.setAttribute('id', 'sozi-wrapper-' + index);
                    exports.idLayerList.push('sozi-wrapper-' + index);
                    svgRoot.insertBefore(svgWrapper, svgElement);
                    
                    // Prepare a new wrapper element
                    svgWrapper = document.createElementNS(SVG_NS, 'g');
                }
            });

            // Append last wrapper if needed
            if (svgWrapper.firstChild) {
                svgWrapper.setAttribute('id', 'sozi-wrapper-' + svgElementList.length);
                exports.idLayerList.push('sozi-wrapper-' + svgElementList.length);
                svgRoot.appendChild(svgWrapper);
            }
        }

        // Analyze <frame> elements
        soziFrameList.forEach(function (soziFrame, indexFrame) {
            var newFrame = {
                id: soziFrame.getAttribute('id'),
                title: readAttribute(soziFrame, 'title'),
                sequence: parseInt(readAttribute(soziFrame, 'sequence'), 10),
                timeoutEnable: readAttribute(soziFrame, 'timeout-enable') === 'true',
                timeoutMs: parseInt(readAttribute(soziFrame, 'timeout-ms'), 10),
                transitionDurationMs: parseInt(readAttribute(soziFrame, 'transition-duration-ms'), 10),
                layers: {}
            };

            // Get the default properties for all layers, either from
            // the current <frame> element or from the corresponding
            // layer in the previous frame.
            // Those properties can later be overriden by <layer> elements
            exports.idLayerList.forEach(function (idLayer) {
                if (indexFrame === 0 || idLayer.search('sozi-wrapper-[0-9]+') !== -1) {
                    // In the first frame, or in wrapper layers,
                    // read layer attributes from the <frame> element
                    readLayerProperties(newFrame, idLayer, soziFrame);
                }
                else {
                    // After the first frame, in referenced layers,
                    // copy attributes from the corresponding layer in the previous frame
                    var currentLayer = newFrame.layers[idLayer] = {};
                    var previousLayer = exports.frames[exports.frames.length - 1].layers[idLayer];
                    for (var attr in previousLayer) {
                        if (previousLayer.hasOwnProperty(attr)) {
                            currentLayer[attr] = previousLayer[attr];
                        }
                    }
                }
            });

            // Collect and analyze <layer> elements in the current <frame> element
            soziLayerList = Array.prototype.slice.call(soziFrame.getElementsByTagNameNS(SOZI_NS, 'layer'));
            soziLayerList.forEach(function (soziLayer) {
                var idLayer = soziLayer.getAttributeNS(SOZI_NS, 'group');
                if (idLayer && exports.idLayerList.indexOf(idLayer) !== -1) {
                    readLayerProperties(newFrame, idLayer, soziLayer);
                }
            });
            
            // If the <frame> element has at least one valid layer,
            // add it to the frame list
            for (var idLayer in newFrame.layers) {
                if (newFrame.layers.hasOwnProperty(idLayer)) {
                    exports.frames.push(newFrame);
                    break;
                }
            }
        });
        
        // Sort frames by sequence index
        exports.frames.sort(
            function (a, b) {
                return a.sequence - b.sequence;
            }
        );
    }

    /*
    * Event handler: document load.
    *
    * This function reads the frames from the document.
    */
    function onLoad() {
        document.documentElement.removeAttribute('viewBox');
        readFrames();
        sozi.events.fire('documentready');
    }

    window.addEventListener('load', onLoad, false);
});

/*
 * Sozi - A presentation tool using the SVG standard
 *
 * Copyright (C) 2010-2012 Guillaume Savaton
 *
 * This program is dual licensed under the terms of the MIT license
 * or the GNU General Public License (GPL) version 3.
 * A copy of both licenses is provided in the doc/ folder of the
 * official release of Sozi.
 *
 * See http://sozi.baierouge.fr/wiki/en:license for details.
 *
 * @depend module.js
 * @depend events.js
 */

module(this, 'sozi.location', function (exports, window) {
    'use strict';
    
    var changedFromWithin = false;
    
    /*
     * Returns the frame index given in the URL hash.
     *
     * In the URL, the frame index starts a 1.
     * This method converts it into a 0-based index.
     *
     * If the URL hash is not a positive integer, then 0 is returned.
     * It the URL hash is an integer greater than the last frame index, then
     * the last frame index is returned.
     */
    exports.getFrameIndex = function () {
        var index = window.location.hash ?
            parseInt(window.location.hash.slice(1), 10) - 1 : 0;
        if (isNaN(index) || index < 0) {
            return 0;
        } else if (index >= sozi.document.frames.length) {
            return sozi.document.frames.length - 1;
        } else {
            return index;
        }
    };

    /*
     * Event handler: hash change.
     *
     * This function is called when the URL hash is changed.
     * If the hash was changed manually in the address bar, and if it corresponds to
     * a valid frame number, then the presentation moves to that frame.
     *
     * The hashchange event can be triggered externally, by the user modifying the URL,
     * or internally, by the script modifying window.location.hash.
     */
    function onHashChange() {
        var index = exports.getFrameIndex();
        if (!changedFromWithin) {
            sozi.player.moveToFrame(index);
        }
        changedFromWithin = false;
    }
    
    /*
     * Event handler: frame change.
     *
     * This function is called when the presentation has reached a
     * new frame.
     * The URL hash is changed based on the provided frame index.
     */
    function onFrameChange(index) {
        changedFromWithin = true;
        window.location.hash = '#' + (index + 1);
    }

	/*
	 * Event handler: document load.
	 *
	 * This function registers the 'framechange' handler.
	 */
    function onLoad() {
        sozi.events.listen('framechange', onFrameChange);
    }
    
    window.addEventListener('hashchange', onHashChange, false);
    window.addEventListener('load', onLoad, false);
});


