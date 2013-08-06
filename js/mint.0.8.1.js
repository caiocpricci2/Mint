/* The MIT License (MIT)

Copyright (c) 2013 caiocpricci2

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


function Mint() {
    
    //things you might need to change
    var mintClassName = "mintifyMe"; //if by any chance you have another mintifyMe class, rename this to something unique
    var initialZIndex = 300; // mint relies on the z-index to display images. For obvious reasons all zoom-out images must have a high z-index

    var currentImage; //current zoomed image, can only have one at a time. 
    var htmlElement; //holds the html element.
    var darkOverlay; //dar overlay displayed above everything else, behind the zoomed in image
    var csstransform = getsupportedprop(['transform', 'MozTransform', 'WebkitTransform', 'msTransform', 'OTransform'])
    var csstransition = getsupportedprop(['transition', 'MozTransition', 'WebkitTransition', 'msTransition', 'OTransition'])
    var csstransformorigin = getsupportedprop(['transform-origin', 'MozTransform-origin', 'WebkitTransform-origin', 'msTransform-origin', 'OTransform-origin'])

    //one finger touch
    var touched = false; //set to true after a touchdown, false after a touchup    
    var startX = 0; //initial touch position
    var startY = 0;
    var offsetX = 0; //currentOffsetX
    var offsetY = 0; //currentOffsetY    
    var diffX = 0; //difference between initial touch position and current touch position
    var diffY = 0; //used on drag/pan    
    var offs; //array used to store previous offset values

    //prevent images from escaping the viewport
    var initialBoundRectTop = 0; //store the initial values of the zommed image
    var initialBoundRectLeft = 0;
    var previousDiffX = 0;
    var previousDiffY = 0;

    //two finger variables
    var pinching = false;
    var scale = 0; //scale value
    var previousDistance = 0; // previous distance between fingers during a pinch event  - used to detect direction 
    var lastDistance = 0; // latest distancce between fingers during a pinch event
    var disablePan = false; // disable panning for a short period after we zoomed to prevent flickering		

    //double tap variables
    var taptap = false;

    //swipe variables    
    var zoomingOut = false; // this prevents the user to zooming in again on browser after double clicking an image to zoom out

    //stores initial images properties values
    var imageProps = {};

    function getsupportedprop(proparray) {
        var root = document.documentElement//reference root element of document
        for (var i = 0; i < proparray.length; i++) {//loop through possible properties
            if (proparray[i] in root.style) {//if property exists on element (value will be string, empty string if not set)
                return proparray[i] //return that string
            }
        }
    }


    function changecssproperty(target, prop, value, action) {
        if (typeof prop != "undefined")
            target.style[prop] = (action == "remove") ? "" : value
    }


    function getTransformValue(element, property) {
        property = property.toLowerCase();
        var values = element.style.webkitTransform.split(")");
        for (var key in values) {
            var val = values[key];

            var prop = val.split("(");
            if (prop[0].toLowerCase().trim() == property)
                return prop[1];
        }
        return false;
    }

    function setDarkOverlay() {
        darkOverlay = document.createElement('div');
        darkOverlay.style.background = "#333";
        darkOverlay.style.opacity = 0.8;
        darkOverlay.style.width = "5000px";
        darkOverlay.style.height = "5000px";
        darkOverlay.style.position = "absolute";
        darkOverlay.style.top = "0";
        darkOverlay.style.left = "0";
        darkOverlay.style.zIndex = initialZIndex -1;
        darkOverlay.style.visibility = "hidden";
        darkOverlay.id = "mint_dark_overlay";
        document.getElementsByTagName('body')[0].appendChild(darkOverlay);
    }

    function mint(container, imageSrc) {


        var container = document.getElementById(container);


        var image = new Image();


        var hMargin = 10;
        var vMargin = 10;
        var availableWidth = container.offsetWidth - 2 * hMargin;

        var availableHeight = container.offsetHeight - 2 * vMargin;

        image.onload = function () {
            var scaleH = this.naturalHeight / availableHeight;
            var scaleW = this.naturalWidth / availableWidth;

            var scale = Math.max(scaleH, scaleW);

            imageProps[container.id] = {
                scale: scale
            }


            this.addEventListener("click", zoomin, false);
            changecssproperty(this, csstransition, "-webkit-transform 0.5s linear");

        };
        image.src = imageSrc;
        image.style.position = "relative";        
        image.style.width = "100%";

        container.appendChild(image);

    }

    function doubleTapped(el) {
        zoomingOut = true;

        changecssproperty(el, csstransition, "-webkit-transform 0.5s linear");
        zoomout();
        taptap = false;
    }


    function zoomin() {

        if (zoomingOut)
            return;
        currentImage = this;

        darkOverlay.style.visibility = "visible"

        var scale = imageProps[this.parentNode.id].scale;
        this.style.zIndex = initialZIndex;        
        this.addEventListener("webkitTransitionEnd", callSetRectBounds);
        changecssproperty(this, csstransition, "-webkit-transform 0.5s linear");
        changecssproperty(this, csstransform, "scale(" + scale + ") translate3d(0,0,0)");

        currentImage.removeEventListener('click', zoomin, false);
        setDragEvents(this);

        
    }

    function callSetRectBounds() {
        setInitialRectBounds(this);
    }

    function setInitialRectBounds(image) {
        initialBoundRectTop = image.getBoundingClientRect().top;
        initialBoundRectLeft = image.getBoundingClientRect().left;
        console.log(initialBoundRectTop, initialBoundRectLeft);
        image.removeEventListener("webkitTransitionEnd", callSetRectBounds);
    }

    function zoomout() {
        
        changecssproperty(currentImage, csstransform, "scale(1) translate3d(0,0,0)");
        
        
        setTimeout(function () {
            darkOverlay.style.visibility = "hidden";
            currentImage.style.zIndex = 'auto';
            currentImage.addEventListener('click', zoomin, false);
            initialBoundRectTop = 0;
            initialBoundRectLeft = 0;
            currentImage = null;
        }, 500);
        unsetDragEvents();
        
    }

    function mousedown(e) {

        e.targetTouches = [{
            pageX: e.clientX,
            pageY: e.clientY
        }]

        dragDown(e);
    }

    function mousemove(e) {

        if (!touched)
            return;

        e.changedTouches = [{
            pageX: e.clientX,
            pageY: e.clientY
        }]
        dragMove(e);

    }
    function mouseup(e) {
        dragUp(e);
        e.preventDefault();
        return false;
    }


    function setDragEvents(el) {

        document.body.addEventListener('mousedown', mousedown, false);
        document.body.addEventListener("mousemove", mousemove, false);
        document.body.addEventListener("mouseup", mouseup, false);

        document.body.addEventListener('touchstart', dragDown, false);
        document.body.addEventListener("touchmove", dragMove, false);
        document.body.addEventListener("touchend", dragUp, false);
    }

    function unsetDragEvents() {

        document.body.removeEventListener('mousedown', mousedown, false);
        document.body.removeEventListener("mousemove", mousemove, false);
        document.body.removeEventListener("mouseup", mouseup, false);

        document.body.removeEventListener('touchstart', dragDown, false);
        document.body.removeEventListener("touchmove", dragMove, false);
        document.body.removeEventListener("touchend", dragUp, false);

        setTimeout(function () { zoomingOut = false; }, 300);

    }

    function dragDown(e) {


        offs = getTransformValue(currentImage, "translate3d").split(",");
        offs[0] = Number(offs[0].substring(0, offs[0].length - 2));
        offs[1] = Number(offs[1].substring(0, offs[1].length - 2));
        e.preventDefault();

        if (e.targetTouches.length == 1) {
            if (taptap) {
                doubleTapped(currentImage);
                return;
            } else {
                taptap = true;
                setTimeout(function () { taptap = false; }, 200)
            }
            
            touched = true;
            startX = e.targetTouches[0].pageX;
            startY = e.targetTouches[0].pageY;
            changecssproperty(currentImage, csstransition, "-webkit-transform 0 linear");
        } else if (e.targetTouches.length > 1) {
            pinching = true;            
        }
    }

    function dragMove(e) {
        if (!touched)
            return;

        e.preventDefault();


        if (!pinching) {
            if (disablePan)
                return;

            scale = Number(getTransformValue(currentImage, "scale"));
            
            
            var diffX = (offs[0] * scale) + (e.changedTouches[0].pageX - startX) ; 
            var diffY = (offs[1] * scale) + (e.changedTouches[0].pageY - startY) ; 
            console.log(diffX, diffY);

            var boundsRect = currentImage.getBoundingClientRect();


            var limitRight = (window.innerWidth - boundsRect.width) ;
            var limitBottom = (window.innerHeight - boundsRect.height) ;
          
            diffY = (initialBoundRectTop + (diffY) > 0) ? 0 :
                        (initialBoundRectTop + (diffY) < limitBottom) ? previousDiffY :
                            diffY;
            diffX = (initialBoundRectLeft + (diffX) > 0) ? 0:
                        (initialBoundRectLeft + (diffX) < limitRight) ? previousDiffX :
                            diffX;
                                                
           
           
            if (Math.abs(diffX) > 1 || Math.abs(diffY > 1)) {
                previousDiffX = diffX;
                previousDiffY = diffY;                
               
                changecssproperty(currentImage, csstransform, "scale(" + scale + ") translate3d(" + diffX / scale + "px, " + diffY / scale + "px, 0)");
                
            }
        }
        else {
            var dist =
                (e.changedTouches[0].pageX - e.changedTouches[1].pageX) * (e.changedTouches[0].pageX - e.changedTouches[1].pageX) +
                (e.changedTouches[0].pageY - e.changedTouches[1].pageY) * (e.changedTouches[0].pageY - e.changedTouches[1].pageY);
            if (lastDistance == 0) {
                previousDistance = dist;
                lastDistance = dist;
                return;
            }
            else {
                previousDistance = lastDistance;
                lastDistance = dist;
            }

            var centerX = Math.abs((e.changedTouches[0].pageX - e.changedTouches[1].pageX) / 2)
            var centerY = Math.abs((e.changedTouches[0].pageY - e.changedTouches[1].pageY) / 2)
            var scale = getTransformValue(currentImage, "scale");
            var translate = getTransformValue(currentImage, "translate3d");
            var newScale = (Number(scale) + (lastDistance - previousDistance) / (100000) * Number(scale));
            //TODO find a better way of doing this.
            //zooming out to a certain scale? 
            //press back button on devices?
            //double tap?
            //add a X button to close?
            if (newScale < 1) {
                changecssproperty(currentImage, csstransform, "scale(" + newScale + ") translate3d(0,0,0)");
                doubleTapped(currentImage);
                return;
            }

            changecssproperty(currentImage, csstransform, "scale(" + newScale + ") translate3d(" + translate + ")");
        }

    }

    function dragUp(e) {

        if (pinching) {
            pinching = false;
            lastDistance = 0;
            previousDistance = 0;
            previousDiffX = 0;
            previousDiffY = 0;
            disablePan = true;
            
            setInitialRectBounds(this);
            setTimeout(function () { disablePan = false }, 200);
        }
        else
            touched = false;

        e.preventDefault();
        diffX = 0;
        diffY = 0;
    }


    this.mintifyMe = function () {
        setDarkOverlay();
        htmlElement = document.getElementsByTagName("html")[0];
        var allImages = document.getElementsByTagName("img");


        for (var i = 0; i < allImages.length; i++) {
            var el = allImages[i];

            if (!el.classList.contains(mintClassName))
                return;

            var id = "mintImage_" + i;
            var newDiv = document.createElement("div");
            newDiv.id = id;
            newDiv.class = "mintImage";
            el.parentNode.replaceChild(newDiv, el);
            mint(id, el.src);
        }
    }
}

var mint = new Mint();