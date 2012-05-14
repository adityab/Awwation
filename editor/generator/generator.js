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

    var scriptElement = doc.createElement('script');
    scriptElement.setAttribute('ns1:version', 'trunk');
    scriptElement.setAttribute('id', 'sozi-script');

    // Load script and inject it into a <script> tag
    var objXml = new XMLHttpRequest();
    objXml.open("GET", "sozi.js", false);
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
   

    var bb = new BlobBuilder();
    var svgString = (new XMLSerializer()).serializeToString(doc);
    bb.append(svgString);
    var blob = bb.getBlob("application/svg+xml;charset="+doc.characterSet);
    //var oURL = window.URL || window.webkitURL || null;
    //window.open(oURL.createObjectURL(blob));
    
    saveAs(blob, "aww.svg");
}
