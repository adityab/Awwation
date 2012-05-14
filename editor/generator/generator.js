makePresentation = function(sequence) {
    
    // Import DOM
    var src = svgCanvas.getSvgString();
    // convert uppercase STYLE tag to lowercase
    src = src.replace(/STYLE/g, 'style');
    console.log(src);

    var parser = new DOMParser();
    var doc = parser.parseFromString(src, "text/xml");
    var root = doc.getElementsByTagName('svg')[0];
    root.setAttribute('xmlns:ns1','http://sozi.baierouge.fr');

    var scriptElement = doc.createElementNS('http://www.w3.org/2000/svg', 'script');
    scriptElement.setAttribute('ns1:version', 'trunk');
    scriptElement.setAttribute('id', 'sozi-script');

    // Load script and inject it into a <script> tag
    var objXml = new XMLHttpRequest();
    objXml.open("GET", "generator/sozi.js", false);
    objXml.send(null);
    scriptElement.textContent = objXml.responseText;

    root.appendChild(scriptElement)

    for(var i = 0; i < sequence.length; i+=1) {
        var newFrame = doc.createElement('ns1:frame');
        newFrame.setAttribute('ns1:transition-profile', 'accelerate-decelerate');
        newFrame.setAttribute('ns1:transition-duration-ms', '1500');
        newFrame.setAttribute('ns1:timeout-ms', '1500');
        newFrame.setAttribute('ns1:timeout-enable', 'false');
        newFrame.setAttribute('ns1:hide', 'false');
        newFrame.setAttribute('ns1:sequence', i+1);
        newFrame.setAttribute('ns1:title', i+1);
        newFrame.setAttribute('ns1:refid', sequence[i]);
        
        root.appendChild(newFrame);
    }
   
    var svgString = (new XMLSerializer()).serializeToString(doc);
    // Use FileSaver polyfill if we have chrome, else use Downloadify (flash)
        if(svgedit.browser.isChrome()) {
            var bb = new BlobBuilder();
            bb.append(svgString);
            var blob = bb.getBlob("application/xml;charset="+doc.characterSet);
             
            $.prompt("Save file as:", "Untitled.svg", function(name) {
                saveAs(blob, name, function(e) { $.alert("Saved to your download folder. Chrome may prompt you to 'Keep' or 'Discard'."); });
            });
        }
    
       else {
           if(!window.Downloadify) {
               $.ajaxSettings.async = false;
               $.getScript('generator/swfobject.js');
               $.getScript('generator/downloadify.min.js');
               $.ajaxSettings.async = true;
           }
           
           $.alert('File generated!<br/><div id="sozisavesvg" style="text-align: center;"></div>');
        
        $('#sozisavesvg').downloadify({
            swf    :   'generator/downloadify.swf',
            downloadImage :   'generator/download.png',
            width    :   100,
            height  :   30,
            filename  :   'Untitled.svg',
            data      :   function(){ return svgString; },
            dataType  :   'string',
            append  :  false,
            onComplete : function(){ alert('Your File Has Been Saved!'); },
            onCancel   : function(){ alert('You have cancelled the saving of this file.'); },
            onError : function(){ alert('You must put something in the File Contents or there will be nothing to save!'); }
        });
    }
    
}
