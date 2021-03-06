var getQueryString = function ( field, url )
{
    var href = url ? url : window.location.href;
    var reg = new RegExp( '[?&]' + field + '=([^&#]*)', 'i' );
    var string = reg.exec(href);

    return string ? string[1] : null;
};

function isURL(str) 
{
  var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
  '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|'+ // domain name
  '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
  '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
  '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
  '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
  
  return pattern.test(str);
}

var serviceUrl = "../smks-api/";
var wmsUrl = "https://openmaps.gov.bc.ca/geo/pub/ows";
var wmsPostfix = "?service=WMS&request=GetCapabilities";
var wmsVersion = "1.3.0";
var mapConfigs = [];
var publishedMapConfigs = [];
var selectedMapConfig;
var basemapViewerMap;
var aboutEditor;
var editMode = false;

var data = {
	    lmfId: "",
	    lmfRevision: 1,
	    name: "",
	    createdBy: "",
	    createdDate: "",
	    modifiedBy: "",
	    modifiedDate: "",
	    version: "",
	    published: false,
	    surround: {
	        type: "default",
	        title: ""
	    },
	    viewer: {
	    	type: "leaflet",
            device: "auto",
            panelWidth: 400,
            deviceAutoBreakpoint: 500,
            themes: [],
            location: {
            	center: [-125, 55],
            	zoom: 5
            },
            baseMap: 'Topographic',
            clusterOption: {
                showCoverageOnHover: false
            }
	    },
	    tools: [
                { type: 'about',        enabled: false },
                { type: 'baseMaps',     enabled: false },
                { type: 'coordinate',   enabled: false },
                { type: 'directions',   enabled: false },
                // { type: 'dropdown',     enabled: false }, -- so it won't be enabled by show-tools=all, no tools use it by default
                { type: 'identify',     enabled: false },
                { type: 'layers',       enabled: false },
                { type: 'location',     enabled: false },
                { type: 'markup',       enabled: false },
                { type: 'measure',      enabled: false },
                { type: 'menu',         enabled: false },
                { type: 'list-menu',         enabled: false },
                { type: 'minimap',      enabled: true },
                { type: 'pan',          enabled: true },
                // { type: 'query',        enabled: false }, -- so it won't be enabled by show-tools=all, as it needs an instance
                { type: 'scale',        enabled: true },
                { type: 'search',       enabled: true },
                { type: 'select',       enabled: false },
                { type: 'toolbar',      enabled: true },
                // { type: 'version',      enabled: false }, -- so it won't be enabled by show-tools=all
                { type: 'zoom',         enabled: true }
            ],
	    layers: [],
	    _id: null,
	    _rev: null
	};

function convertKmlToLayers(fileContents)
{
	var documentData = new FormData();
	documentData.append('file', fileContents);
	
	$.ajax
	({
		url: serviceUrl + "LayerLibrary/ProcessKML/",
		type: "post",
	    data: documentData,
	    crossDomain: true,
	    withCredentials: true,
	    cache: false,
	    contentType: false,
	    processData: false,
        success: function (status)
        {
        	status.results.forEach(function(sourceLayer)
		   	{
        		var generatedID = fileContents.name.replace(/[^a-z0-9]+/gi, "-").replace(" ", "-") + "-" + sourceLayer.styleUrl.replace(/[^a-z0-9]+/gi, '-').replace(" ", "-").toLowerCase();
        		var newLayer;
        		var update = false;
        		// if a layer exists with the same ID, this should be an update, not a new add?
        		for(var lyrIdx = 0; lyrIdx < data.layers.length; lyrIdx++)
    			{
        			var existingLayer = data.layers[lyrIdx];
        			if(existingLayer.id == generatedID)
    				{
        				update = true;
        				newLayer = existingLayer;
        				break;
    				}
    			}
        		
        		if(update)
    			{
        			newLayer.style = sourceLayer.style;
        			
        			$("#vectorStrokeOpacity").val(newLayer.style.strokeOpacity);
        			$("#vectorFillOpacity").val(newLayer.style.fillOpacity);
        			$("#vectorStrokeWidth").val(newLayer.style.strokeWidth);
        			$("#vectorStrokeStyle").val(newLayer.style.strokeStyle);
        			$("#vectorStrokeColor").val(newLayer.style.strokeColor);
        			$("#vectorFillColor").val(newLayer.style.fillColor);
        			
        			if(sourceLayer.markerImage != null)
        			{
        				// get the image dimensions and set size/offset accordingly
        				var img = new Image();
        			    img.addEventListener("load", function()
        			    {
        			        $("#vectorMarkerSizeX").val(parseInt(this.naturalWidth));
        					$("#vectorMarkerSizeY").val(parseInt(this.naturalHeight));
        					$("#vectorMarkerOffsetX").val(parseInt(this.naturalWidth / 2));
        					$("#vectorMarkerOffsetY").val(parseInt(this.naturalHeight / 2));

        					Materialize.updateTextFields();
        			    });
        			    
        			    img.src = sourceLayer.markerImage;
        			}
    			}
        		else
    			{
	        		newLayer =
	        		{
	        			type: "vector",
	        			id: generatedID,
	        		    title: generatedID,
	        		    isVisible: true,
	        		    isQueryable: true,
	        		    opacity: 0.65,
	        		    attributes: [],
	        		    useRaw: true,
	        			useClustering: false,
	        			useHeatmap: false,
	        			dataUrl: null,
	        			style: sourceLayer.style
	        		};

	        		data.layers.push(newLayer);
	        		
	        		// add to layer tree
	        		var lyrNode =
	        		{
	        			title: newLayer.title,
	        			folder: false,
	        			expanded: false,
	        			data: newLayer,
	        			children: []
	        		};

	        		var tree = $('#layer-tree').fancytree('getTree');
	        		var layerSource = tree.getRootNode().children;
	        		layerSource.push(lyrNode);
	        		tree.reload(layerSource);
    			}
        		
        		// create layer display object
        		for(var tool in data.tools)
        		{
        			tool = data.tools[tool];
        			if(tool.type == "layers")
        			{
        				if(tool.display == null) tool.display = [];
        				
        				tool.display.push(
        				{
        					id: generatedID,
        				    type: "layer",
        				    title: generatedID,
        				    isVisible: true
        				});
        			}
        		}
        		
        		// create blob from geojson
				var blob = new Blob([ JSON.stringify(sourceLayer.geojson) ], {encoding:"UTF-8",type:"application/json"});
        		
    			unsavedAttachments.push(
    			{
    				type: "vector",
    				layer: newLayer,
    				contents: blob
    			});
        			
    			// style marker
    			if(sourceLayer.markerImage != null)
				{
    				newLayer.style.markerUrl = "@" +  newLayer.id + "-marker";
    				
    				// set marker dimensions
    				var imgTag = new Image();
    				imgTag.addEventListener("load", function()
    			    {
    			    	newLayer.style.markerSize[0] = parseInt(this.naturalWidth);
    			    	newLayer.style.markerSize[1] = parseInt(this.naturalHeight);
    			    	newLayer.style.markerOffset[0] = parseInt(this.naturalWidth / 2);
    			    	newLayer.style.markerOffset[1] = parseInt(this.naturalHeight / 2);
    			    });
    			    
    				imgTag.src = sourceLayer.markerImage;
    			    
        			unsavedAttachments.push(
        			{
        				type: "marker_upload",
        				layer: newLayer,
        				contents: sourceLayer.markerImage
        			});
				}
		   	});
        	
        	document.getElementById("layersDisplayForm").reset();
        	$('#kmlUploadButton').show();
        	$('#kmlUploadProgressBar').hide();
        	$('#kmlUploadProgressComplete').show();
        	//$('#kmlUploadModal').modal('close');
        },
        error: function(status)
        {
        	Materialize.toast("There was an error attempting to read the supplied KML File: " + status.responseText, 4000);
        	document.getElementById("layersDisplayForm").reset();
        	$('#kmlUploadModal').modal('close');
        }
	});	
}

function parseKmlLayerStyle(fileText, fileContents)
{
	var parsedLayer = omnivore.kml.parse(fileText);
	var firstLayer = Object.keys(parsedLayer._layers)[0];
	var options = parsedLayer._layers[firstLayer].options;
	
	var dom = (new DOMParser()).parseFromString(fileText, 'text/xml');
	var styleNodes = dom.firstElementChild.firstElementChild.childNodes;
	
	if(dom.getElementsByTagName("Style").length > 1)
	{
		$('#kmlUploadButton').hide();
    	$('#kmlUploadProgressBar').show();
    	$('#kmlUploadProgressComplete').hide();
		$('#kmlUploadModal').modal('open');
		
		convertKmlToLayers(fileContents);
	}
	else
	{
		var opacity = options.opacity != null ? options.opacity : 1.0;
		var strokeOpacity = 1.0;
		var fillOpacity = options.fillOpacity != null ? options.fillOpacity : 0.65;
		var strokeWidth = options.weight != null ? options.weight : "1";
		var strokeStyle = options.dashArray != null ? options.dashArray : "1";
		var strokeColor = options.color != null ? options.color : "#000000";
		var fillColor = options.fillColor != null ? options.fillColor : options.color != null ? options.color : "#000000";
		var markerUrl = null;
		
		for(var i = 0; i < styleNodes.length; i++)
		{
			var node = styleNodes[i];
			if(node.localName == "Style")
			{
				for(var styleIndex = 0; styleIndex < node.childNodes.length; styleIndex++)
				{
					var styleNode = node.childNodes[styleIndex];
					
					if(styleNode.nodeName != "#text")
					{
						if(styleNode.getElementsByTagName("color").length) 
						{
							fillColor = styleNode.getElementsByTagName("color")[0].innerHTML;
							strokeColor = styleNode.getElementsByTagName("color")[0].innerHTML;
						}
						
						if(styleNode.localName == "LineStyle")
						{
							if(styleNode.getElementsByTagName("width").length) strokeWidth = styleNode.getElementsByTagName("width")[0].innerHTML;
						}
						else if(styleNode.localName == "PolyStyle")
						{
							if(styleNode.getElementsByTagName("fill").length) fillOpacity = styleNode.getElementsByTagName("fill")[0].innerHTML;
							if(styleNode.getElementsByTagName("outline").length) strokeWidth = styleNode.getElementsByTagName("outline")[0].innerHTML;
						}
						else if(styleNode.localName == "IconStyle")
						{
							if(styleNode.getElementsByTagName("Icon").length) markerUrl = styleNode.getElementsByTagName("Icon")[0].getElementsByTagName("href")[0].innerHTML;
						}
					}
				}
			}
		}

		if(fillColor.length > 7) fillColor = "#" + fillColor.substring(0, 6);
		if(strokeColor.length > 7) strokeColor = "#" + strokeColor.substring(0, 6);
	
		// set the vector layer panel options
		if(selectedLayerNode == null) // new file panel
		{
			var layer = addVectorLayerToLayerList(); 
			layer.opacity = opacity;
			layer.style.strokeWidth = strokeWidth;
			layer.style.strokeStyle = strokeStyle;
			layer.style.strokeColor = strokeColor;
			layer.style.strokeOpacity = strokeOpacity;
			layer.style.fillColor = fillColor;
			layer.style.fillOpacity = fillOpacity;
			
			if(markerUrl != null)
			{
				// get the image dimensions and set size/offset accordingly
				var img = new Image();
			    img.addEventListener("load", function()
			    {
			    	layer.style.markerSize[0] = parseInt(this.naturalWidth);
			    	layer.style.markerSize[1] = parseInt(this.naturalHeight);			    	
			    	layer.style.markerOffset[0] = parseInt(this.naturalWidth / 2);
			    	layer.style.markerOffset[1] = parseInt(this.naturalHeight / 2);

					Materialize.updateTextFields();
					
					loadMarkerImageBase64(markerUrl, layer);
			    });
			    
			    img.src = markerUrl;
			}
		}
		else // edit panel
		{
			$("#vectorOpacity").val(opacity);
			$("#vectorStrokeOpacity").val(strokeOpacity);
			$("#vectorFillOpacity").val(fillOpacity);
			$("#vectorStrokeWidth").val(strokeWidth);
			$("#vectorStrokeStyle").val(strokeStyle);
			$("#vectorStrokeColor").val(strokeColor);
			$("#vectorFillColor").val(fillColor);
			
			if(markerUrl != null)
			{
				// get the image dimensions and set size/offset accordingly
				var image = new Image();
				image.addEventListener("load", function()
			    {
			        $("#vectorMarkerSizeX").val(parseInt(this.naturalWidth));
					$("#vectorMarkerSizeY").val(parseInt(this.naturalHeight));
					$("#vectorMarkerOffsetX").val(parseInt(this.naturalWidth / 2));
					$("#vectorMarkerOffsetY").val(parseInt(this.naturalHeight / 2));
					
					loadMarkerImageBase64(markerUrl, selectedLayerNode.data);
					
					Materialize.updateTextFields();
			    });
			    
				image.src = markerUrl;
			}
		}
		
		Materialize.updateTextFields();
	}
}

function loadMarkerImageBase64(markerUrl, layer)
{
	$.ajax
	({
		url: serviceUrl + "LayerLibrary/ImageToBase64?url=" + markerUrl,
        type: "get",
        crossDomain: true,
        success: function (status)
        {
        	unsavedAttachments.push(
			{
				type: "marker_upload",
				layer: layer,
				contents: JSON.parse(status).image
			});
        },
        error: function(status)
        {
        	Materialize.toast("Failed to load marker image. Error: " + status.responseText, 4000);
        }
	});
}

function getBase64Image(imgUrl) 
{
    var image = new Image();
    //image.crossOrigin = "Anonymous";
    
    image.onload = function()
    {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d'); 
        canvas.height = image.height;
        canvas.width = image.width;
        ctx.drawImage(image, 0, 0);
        
        var dataURL = canvas.toDataURL("image/png");
        callback(dataURL);
    };
    
	image.src = imgUrl;
}

function openLayerTemplateEditor()
{
	// configure layer-popup-content
	$('#layer-popup-content').trumbowyg(
	{
		resetCss: true,
		semantic: false,
		btns: [
		        ['viewHTML'],
		        ['undo', 'redo'], // Only supported in Blink browsers
		        ['formatting'],
		        ['strong', 'em', 'del'],
		        ['superscript', 'subscript'],
		        ['foreColor', 'backColor'],
		        ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'],
		        ['unorderedList', 'orderedList'],
		        ['horizontalRule'],
		        ['preformatted'],
		        ['template'],
		        ['removeformat'],
		        ['link'],
		        ['insertImage', 'base64'],
		        ['noembed'],
		        ['fullscreen']
		    ]
	});
	
	$('#layer-popup-content').on('tbwchange', function(delta, oldDelta, source)
	{
		selectedLayerNode.data.popupTemplate = $("#layer-popup-content").trumbowyg('html');
	});

	$("#layer-popup-content").empty();
	$("#layer-popup-content").trumbowyg('html', "");
	$('#layer-popup-content').trumbowyg('toggle');
	$("#layer-popup-content").trumbowyg('html', selectedLayerNode.data.popupTemplate);

	$('#layerPopupTemplateModal').modal('open');
}

function setToolActivation(toolType)
{
	data.tools.forEach(function(tool)
   	{
		if(tool.type == toolType)
		{
			tool.enabled = !tool.enabled;

			if(tool.type == "zoom" && tool.enabled == true)
			{
				$("#zoomOptions").show();
				$("#zoomControl").prop('checked', tool.control);
				$("#zoomBox").prop('checked', tool.box);
				$("#zoomDoubleClick").prop('checked', tool.doubleClick);
				$("#zoomMouseWheel").prop('checked', tool.mouseWheel);
			}
			else if(tool.type == "zoom" && tool.enabled == false) $("#zoomOptions").hide();
	    	else if(tool.type == "scale" && tool.enabled == true)
    		{
	    		$("#scaleOptions").show();
	    		$("#scaleFactor").prop('checked', tool.showFactor);
				$("#scaleBar").prop('checked', tool.showBar);
    		}
	    	else if(tool.type == "scale" && tool.enabled == false) $("#scaleOptions").hide();
	    	else if(tool.type == "minimap" && tool.enabled == true)
    		{
	    		$("#minimapOptions").show();
	    		$("#StreetsMini").prop('checked', tool.baseMap == "Streets");
	    		$("#TopographicMini").prop('checked', tool.baseMap == "Topographic");
	    		$("#NationalGeographicMini").prop('checked', tool.baseMap == "NationalGeographic");
	    		$("#OceansMini").prop('checked', tool.baseMap == "Oceans");
	    		$("#GrayMini").prop('checked', tool.baseMap == "Gray");
	    		$("#DarkGrayMini").prop('checked', tool.baseMap == "DarkGray");
	    		$("#ImageryMini").prop('checked', tool.baseMap == "Imagery");
	    		$("#ShadedReliefMini").prop('checked', tool.baseMap == "ShadedRelief");
    		}
	    	else if(tool.type == "minimap" && tool.enabled == false) $("#minimapOptions").hide();
	    	else if(tool.type == "about" && tool.enabled == true)
    		{
	    		$("#aboutPanelOptions").show();
	    		$("#aboutPanelHeader").val(tool.title);
	    		setupQuillEditor(tool);
    		}
	    	else if(tool.type == "about" && tool.enabled == false) $("#aboutPanelOptions").hide();
	    	else if(tool.type == "identify" && tool.enabled == true)
    		{
	    		$("#identifyOptions").show();
	    		$("#identifyPanelHeader").val(tool.title);
	    		$("#identifyStyleOpacity").val(tool.styleOpacity);
    			$("#identifyStyleStrokeOpacity").val(tool.style.strokeOpacity);
    			$("#identifyStyleFillOpacity").val(tool.style.fillOpacity);
    			$("#identifyStyleStrokeWidth").val(tool.style.strokeWidth);
    			$("#identifyStyleStrokeStyle").val(tool.style.strokeStyle);
    			$("#identifyStyleStrokeColor").val(tool.style.strokeColor);
    			$("#identifyStyleFillColor").val(tool.style.fillColor);
    			$("#identifyClickRadius").val(tool.tolerance);
    		}
	    	else if(tool.type == "identify" && tool.enabled == false) $("#identifyOptions").hide();
	    	else if(tool.type == "select" && tool.enabled == true)
    		{
	    		$("#selectionOptions").show();
	    		$("#selectPanelHeader").val(tool.title);
	    		$("#selectStyleOpacity").val(tool.styleOpacity);
    			$("#selectStyleStrokeOpacity").val(tool.style.strokeOpacity);
    			$("#selectStyleFillOpacity").val(tool.style.fillOpacity);
    			$("#selectStyleStrokeWidth").val(tool.style.strokeWidth);
    			$("#selectStyleStrokeStyle").val(tool.style.strokeStyle);
    			$("#selectStyleStrokeColor").val(tool.style.strokeColor);
    			$("#selectStyleFillColor").val(tool.style.fillColor);
    		}
	    	else if(tool.type == "select" && tool.enabled == false) $("#selectionOptions").hide();
	    	else if(tool.type == "baseMaps" && tool.enabled == true)
    		{
	    		$("#basemapPanelHeader").val(tool.title);
	    		$("#basemapPanelOptions").show();
	    		if(tool.choices == null) tool.choices = [];
	    		tool.choices.forEach(function(choice)
	           	{
		    		$("#StreetsBml").prop('checked', tool.choices.indexOf("Streets") > -1);
		    		$("#TopographicBml").prop('checked', tool.choices.indexOf("Topographic") > -1);
		    		$("#NationalGeographicBml").prop('checked', tool.choices.indexOf("NationalGeographic") > -1);
		    		$("#OceansBml").prop('checked', tool.choices.indexOf("Oceans") > -1);
		    		$("#GrayBml").prop('checked', tool.choices.indexOf("Gray") > -1);
		    		$("#DarkGrayBml").prop('checked', tool.choices.indexOf("DarkGray") > -1);
		    		$("#ImageryBml").prop('checked', tool.choices.indexOf("Imagery") > -1);
		    		$("#ShadedReliefBml").prop('checked', tool.choices.indexOf("ShadedRelief") > -1);
	           	});
    		}
	    	else if(tool.type == "baseMaps" && tool.enabled == false) $("#basemapPanelOptions").hide();
	    	else if(tool.type == "layers" && tool.enabled == true)
    		{
	    		$("#layersPanelHeader").val(tool.title);
	    		$("#layersOptions").show();
    		}
	    	else if(tool.type == "layers" && tool.enabled == false) $("#layersOptions").hide();
	    	else if(tool.type == "directions" && tool.enabled == true)
    		{
	    		$("#directionsPanelHeader").val(tool.title);
	    		$("#directionsOptions").show();
    		}
	    	else if(tool.type == "directions" && tool.enabled == false) $("#directionsOptions").hide();
	    	else if(tool.type == "measure" && tool.enabled == false) $("#measurementOptions").hide();
	    	else if(tool.type == "measure" && tool.enabled == true) $("#measurementOptions").show();

			//if(tool.enabled == true) Materialize.toast('Activated ' + tool.type + " tool!", 4000);
			//else Materialize.toast('Deactivated ' + tool.type + " tool!", 4000);
		}
   	});
}

function setupQuillEditor(tool)
{
	$('#about-content').trumbowyg(
	{
		resetCss: true,
		btns: [
		        ['viewHTML'],
		        ['undo', 'redo'], // Only supported in Blink browsers
		        ['formatting'],
		        ['strong', 'em', 'del'],
		        ['superscript', 'subscript'],
		        ['foreColor', 'backColor'],
		        ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'],
		        ['unorderedList', 'orderedList'],
		        ['horizontalRule'],
		        ['preformatted'],
		        ['template'],
		        ['removeformat'],
		        ['link'],
		        ['insertImage', 'base64'],
		        ['noembed'],
		        ['fullscreen']
		    ]
	});
	$('#about-content').on('tbwchange', function(delta, oldDelta, source)
	{
		tool.content = $("#about-content").trumbowyg('html');
	});

	$("#about-content").empty();
	$("#about-content").trumbowyg('html', tool.content);
}

function setBasemapSelector(basemap)
{
	data.tools.forEach(function(tool)
   	{
		if(tool.type == "baseMaps")
		{
			if(tool.choices == null) tool.choices = [];
			var contains = (tool.choices.indexOf(basemap) > -1);
			if(contains)
			{
				var index = tool.choices.indexOf(basemap);
				if (index !== -1) tool.choices.splice(index, 1);
			}
			else tool.choices.push(basemap);
		}
   	});
}

function toggleScaleOption(scaleOption)
{
	data.tools.forEach(function(tool)
   	{
		if(tool.type == "scale")
		{
			if(zoomOption == "factor") tool.showFactor = !tool.showFactor;
			else if(zoomOption == "bar") tool.showBar = !tool.showBar;
		}
   	});
}

function toggleConvexHullsTool()
{
	data.viewer.clusterOption.showCoverageOnHover = !data.viewer.clusterOption.showCoverageOnHover;
}

function toggleActiveAboutTool()
{
	data.viewer.activeTool = data.viewer.activeTool == "about" ? "" : "about";

	$("#basemapsActiveTool").prop('checked', false);
	$("#layersActiveTool").prop('checked', false);
	$("#directionsActiveTool").prop('checked', false);
}

function toggleActiveBasemapsTool()
{
	data.viewer.activeTool = data.viewer.activeTool == "baseMaps" ? "" : "baseMaps";
	
	$("#aboutActiveTool").prop('checked', false);
	$("#layersActiveTool").prop('checked', false);
	$("#directionsActiveTool").prop('checked', false);
}

function toggleActiveLayersTool()
{
	data.viewer.activeTool = data.viewer.activeTool == "layers" ? "" : "layers";
	
	$("#aboutActiveTool").prop('checked', false);
	$("#basemapsActiveTool").prop('checked', false);
	$("#directionsActiveTool").prop('checked', false);
}

function toggleActiveDirectionsTool()
{
	data.viewer.activeTool = data.viewer.activeTool == "layers" ? "" : "layers";
	
	$("#aboutActiveTool").prop('checked', false);
	$("#basemapsActiveTool").prop('checked', false);
	$("#layersActiveTool").prop('checked', false);
}

function toggleZoomOption(zoomOption)
{
	data.tools.forEach(function(tool)
   	{
		if(tool.type == "zoom")
		{
			if(zoomOption == "control") tool.control = !tool.control;
			else if(zoomOption == "box") tool.box = !tool.box;
			else if(zoomOption == "doubleClick") tool.doubleClick = !tool.doubleClick;
			else if(zoomOption == "mouseWheel") tool.mouseWheel = !tool.mouseWheel;
		}
   	});
}

function setToolPosition(toolName, position)
{
	data.tools.forEach(function(tool)
   	{
		if(tool.type == toolName)
		{
			tool.position = position;
		}
   	});
}

function setMinimapBasemap(id)
{
	data.tools.forEach(function(tool)
   	{
		if(tool.type == "minimap")
		{
			tool.baseMap = id;
		}
   	});
}

function closeEditPanel()
{
	finishLayerEdits(false);
	
	$("#editor-content").hide("fast");
	$("#menu-content").show("fast");
	$("#loadingBar").show();
	$("#appsTablePanel").hide();

	loadConfigs();
}

function editMapConfig(mapConfigId)
{
	mapConfigs.forEach(function(mapConfig)
	{
		if(mapConfig.lmfId == mapConfigId)
		{
			// reload, in case of changes made by other users
			$.ajax
			({
				url: serviceUrl + 'MapConfigurations/' + mapConfigId,
		        type: 'get',
		        dataType: 'json',
		        contentType:'application/json',
		        crossDomain: true,
		        withCredentials: true,
		        success: function (loadedConfig)
		        {
		        	mapConfig = loadedConfig;
		        	selectedMapConfig = loadedConfig;

					data.lmfId = loadedConfig.lmfId;
					data.name = loadedConfig.name;
					data.lmfRevision = loadedConfig.lmfRevision;
					data.version = loadedConfig.version;
					data.createdBy = loadedConfig.createdBy;
					data.modifiedBy = loadedConfig.modifiedBy;
					data.createdDate = loadedConfig.createdDate;
					data.modifiedDate = loadedConfig.modifiedDate;
					data.published = loadedConfig.published;
					data.surround = loadedConfig.surround;
				    data.viewer = loadedConfig.viewer;
				    data.tools = loadedConfig.tools;
				    data.layers = loadedConfig.layers;
				    data._id = loadedConfig._id;
				    data._rev = loadedConfig._rev;

				    setupMapConfigToolsUI();

					$("#menu-content").hide("fast");
		        	$("#editor-content").show("fast");

		        	// reset the layer tree
		        	var layerSource = [];
		        	if(data.layers == null) data.layers = [];
		        	data.layers.forEach(function(lyr)
		        	{
		        		var lyrNode = {
										title: lyr.title,
										folder: false,
										expanded: false,
										data: lyr,
										children: []
									};
		        		layerSource.push(lyrNode);

		        		var tree = $('#layer-tree').fancytree('getTree');
		        		tree.reload(layerSource);
		        	});

		        	basemapViewerMap.invalidateSize();

		        	unsavedAttachments = [];
		        	fileContents = null;

		        	$(document).ready(function()
		        	{
		        	    Materialize.updateTextFields();

		        	 // init basemap viewer
		        	    setBasemap(data.viewer.baseMap);
		        	    var southWest = L.latLng(47.294133725, -113.291015625),
		                	northEast = L.latLng(61.1326289908, -141.064453125),
		                	bounds = L.latLngBounds(southWest, northEast);
		        	    basemapViewerMap.fitBounds(bounds);
		        	});
		        },
		        error: function (status)
    	        {
    	            Materialize.toast('Map config loading failed. Please refresh and try again. Error: ' + status.responseText, 10000);
    	            console.log('Map config loading failed. Please refresh and try again. Error: ' + status.responseText);
    	        }
			});
		}
	});
}

function setupMapConfigToolsUI()
{
	// set active tool toggle
	$("#aboutActiveTool").prop('checked', data.viewer.activeTool == "about");
	$("#basemapsActiveTool").prop('checked', data.viewer.activeTool == "baseMaps");
	$("#layersActiveTool").prop('checked', data.viewer.activeTool == "layers");
	$("#directionsActiveTool").prop('checked', data.viewer.activeTool == "directions");
	//set tool activations
    data.tools.forEach(function(tool)
	{
    	if(tool.type == "coordinate") $("#coordinates").prop('checked', tool.enabled);
    	else if(tool.type == "attribution") $("#attribution").prop('checked', tool.enabled);
    	else if(tool.type == "layers") 
		{
    		$("#layersPanelHeader").val(tool.title);
    		$("#layerPanel").prop('checked', tool.enabled);
    		if(tool.enabled)
			{
    			$("#layersOptions").show();
    			$("#layersMenu").prop('checked', tool.position == "list-menu");
    			$("#layersToolbar").prop('checked', tool.baseMap == "toolbar");
    			$("#layersShortcut").prop('checked', tool.baseMap == "shortcut-menu");
			}
		}
    	else if(tool.type == "pan") $("#panning").prop('checked', tool.enabled);
    	else if(tool.type == "zoom")
		{
    		$("#zooming").prop('checked', tool.enabled);
    		if(tool.enabled)
			{
    			$("#zoomOptions").show();
    			$("#zoomControl").prop('checked', tool.control);
				$("#zoomBox").prop('checked', tool.box);
				$("#zoomDoubleClick").prop('checked', tool.doubleClick);
				$("#zoomMouseWheel").prop('checked', tool.mouseWheel);
			}
		}
    	else if(tool.type == "measure") 
    	{
    		$("#measurement").prop('checked', tool.enabled);
    		
    		$("#measurementMenu").prop('checked', tool.position == "list-menu");
			$("#measurementToolbar").prop('checked', tool.baseMap == "toolbar");
			$("#measurementShortcut").prop('checked', tool.baseMap == "shortcut-menu");
			
			if(tool.enabled)
			{
    			$("#measurementOptions").show();
			}
    	}
    	else if(tool.type == "markup") $("#markup").prop('checked', tool.enabled);
    	else if(tool.type == "scale")
		{
    		$("#scale").prop('checked', tool.enabled);
    		if(tool.enabled)
			{
    			$("#scaleOptions").show();
    			$("#scaleFactor").prop('checked', tool.showFactor);
				$("#scaleBar").prop('checked', tool.showBar);
			}
    	}
    	else if(tool.type == "minimap")
		{
    		$("#minimap").prop('checked', tool.enabled);
    		if(tool.enabled)
			{
    			$("#minimapOptions").show();
    			$("#StreetsMini").prop('checked', tool.baseMap == "Streets");
	    		$("#TopographicMini").prop('checked', tool.baseMap == "Topographic");
	    		$("#NationalGeographicMini").prop('checked', tool.baseMap == "NationalGeographic");
	    		$("#OceansMini").prop('checked', tool.baseMap == "Oceans");
	    		$("#GrayMini").prop('checked', tool.baseMap == "Gray");
	    		$("#DarkGrayMini").prop('checked', tool.baseMap == "DarkGray");
	    		$("#ImageryMini").prop('checked', tool.baseMap == "Imagery");
	    		$("#ShadedReliefMini").prop('checked', tool.baseMap == "ShadedRelief");
			}
		}
    	else if(tool.type == "about")
		{
    		$("#aboutPanelHeader").val(tool.title);
    		$("#aboutPanel").prop('checked', tool.enabled);
    		
    		$("#aboutMenu").prop('checked', tool.position == "list-menu");
			$("#aboutToolbar").prop('checked', tool.baseMap == "toolbar");
			$("#aboutShortcut").prop('checked', tool.baseMap == "shortcut-menu");
    		
    		if(tool.enabled)
			{
    			$("#aboutPanelOptions").show();
    			setupQuillEditor(tool);
			}
		}
    	else if(tool.type == "baseMaps")
		{
    		$("#basemapPanelHeader").val(tool.title);
    		
    		$("#basemapMenu").prop('checked', tool.position == "list-menu");
			$("#basemapToolbar").prop('checked', tool.baseMap == "toolbar");
			$("#basemapShortcut").prop('checked', tool.baseMap == "shortcut-menu");
    		
			$("#basemapPanel").prop('checked', tool.enabled);
    		if(tool.enabled)
			{
    			$("#basemapPanelOptions").show();
    			if(tool.choices == null) tool.choices = [];
    			tool.choices.forEach(function(choice)
	           	{
		    		$("#StreetsBml").prop('checked', tool.choices.indexOf("Streets") > -1);
		    		$("#TopographicBml").prop('checked', tool.choices.indexOf("Topographic") > -1);
		    		$("#NationalGeographicBml").prop('checked', tool.choices.indexOf("NationalGeographic") > -1);
		    		$("#OceansBml").prop('checked', tool.choices.indexOf("Oceans") > -1);
		    		$("#GrayBml").prop('checked', tool.choices.indexOf("Gray") > -1);
		    		$("#DarkGrayBml").prop('checked', tool.choices.indexOf("DarkGray") > -1);
		    		$("#ImageryBml").prop('checked', tool.choices.indexOf("Imagery") > -1);
		    		$("#ShadedReliefBml").prop('checked', tool.choices.indexOf("ShadedRelief") > -1);
	           	});
			}
		}
    	else if(tool.type == "select") 
		{
    		$("#selectPanelHeader").val(tool.title);
    		
    		$("#selectMenu").prop('checked', tool.position == "list-menu");
			$("#selectToolbar").prop('checked', tool.baseMap == "toolbar");
			$("#selectShortcut").prop('checked', tool.baseMap == "shortcut-menu");
    		
    		$("#selectionPanel").prop('checked', tool.enabled);
    		if(tool.enabled)
			{
    			$("#selectionOptions").show();
    			
    			$("#selectStyleOpacity").val(tool.styleOpacity);
    			$("#selectStyleStrokeOpacity").val(tool.style.strokeOpacity);
    			$("#selectStyleFillOpacity").val(tool.style.fillOpacity);
    			$("#selectStyleStrokeWidth").val(tool.style.strokeWidth);
    			$("#selectStyleStrokeStyle").val(tool.style.strokeStyle);
    			$("#selectStyleStrokeColor").val(tool.style.strokeColor);
    			$("#selectStyleFillColor").val(tool.style.fillColor);
			}
		}
    	else if(tool.type == "identify") 
		{
    		$("#showConvexHulls").prop('checked', data.viewer.clusterOption != null && data.viewer.clusterOption.showCoverageOnHover);
    		
    		$("#identifyMenu").prop('checked', tool.position == "list-menu");
			$("#identifyToolbar").prop('checked', tool.baseMap == "toolbar");
			$("#identifyShortcut").prop('checked', tool.baseMap == "shortcut-menu");
    		
    		$("#identifyPanelHeader").val(tool.title);
    		$("#identifyPanel").prop('checked', tool.enabled);
    		if(tool.enabled)
			{
    			$("#identifyOptions").show();
    			
    			$("#identifyStyleOpacity").val(tool.styleOpacity);
    			$("#identifyStyleStrokeOpacity").val(tool.style.strokeOpacity);
    			$("#identifyStyleFillOpacity").val(tool.style.fillOpacity);
    			$("#identifyStyleStrokeWidth").val(tool.style.strokeWidth);
    			$("#identifyStyleStrokeStyle").val(tool.style.strokeStyle);
    			$("#identifyStyleStrokeColor").val(tool.style.strokeColor);
    			$("#identifyStyleFillColor").val(tool.style.fillColor);
    			$("#identifyClickRadius").val(tool.tolerance);
			}
		}
    	else if(tool.type == "search") $("#searchPanel").prop('checked', tool.enabled);
    	else if(tool.type == "location") $("#location").prop('checked', tool.enabled);
    	else if(tool.type == "directions")
		{
    		$("#directionsMenu").prop('checked', tool.position == "list-menu");
			$("#directionsToolbar").prop('checked', tool.baseMap == "toolbar");
			$("#directionsShortcut").prop('checked', tool.baseMap == "shortcut-menu");
			
    		$("#directions").prop('checked', tool.enabled);
    		$("#directionsPanelHeader").val(tool.title);
    		if(tool.enabled)
    		{
    			$("#directionsOptions").show();
			}
		}
    	else if(tool.type == "dropdown") $("#dropdown").prop('checked', tool.enabled);
    	//else if(tool.type == "menu") $("#menu").prop('checked', tool.enabled); // menu removed as default
    	else if(tool.type == "list-menu") $("#menu").prop('checked', tool.enabled);
    	else if(tool.type == "shortcut-menu") $("#shortcutMenu").prop('checked', tool.enabled);
	});

    // clear out any layers
    var layerSource = [];
    var tree = $('#layer-tree').fancytree('getTree');
	tree.reload(layerSource);

    $('ul.tabs').tabs();
	$('ul.tabs').tabs('select_tab', 'identity');
	$('#layerTypeTabs').tabs('select_tab', 'dbcCatalog');
	$('.collapsible').collapsible();
	$('#vectorType').material_select();
}

function finishToolEdits()
{
	data.tools.forEach(function(tool)
	{
		if(tool.type == "identify") 
		{
			tool.styleOpacity = $("#identifyStyleOpacity").val();
			tool.style.strokeOpacity = $("#identifyStyleStrokeOpacity").val();
			tool.style.fillOpacity = $("#identifyStyleFillOpacity").val();
			tool.style.strokeWidth = $("#identifyStyleStrokeWidth").val();
			tool.style.strokeStyle = $("#identifyStyleStrokeStyle").val();
			tool.style.strokeColor = $("#identifyStyleStrokeColor").val();
			tool.style.fillColor = $("#identifyStyleFillColor").val();
			tool.tolerance = $("#identifyClickRadius").val();
			tool.title = $("#identifyPanelHeader").val();
		}
		else if(tool.type == "select") 
		{
			tool.styleOpacity = $("#selectStyleOpacity").val();
			tool.style.strokeOpacity = $("#selectStyleStrokeOpacity").val();
			tool.style.fillOpacity = $("#selectStyleFillOpacity").val();
			tool.style.strokeWidth = $("#selectStyleStrokeWidth").val();
			tool.style.strokeStyle = $("#selectStyleStrokeStyle").val();
			tool.style.strokeColor = $("#selectStyleStrokeColor").val();
			tool.style.fillColor = $("#selectStyleFillColor").val();
			tool.title = $("#selectPanelHeader").val();
		}
		else if(tool.type == "about")
		{
			tool.title = $("#aboutPanelHeader").val();
		}
		else if(tool.type == "baseMaps")
		{
			tool.title = $("#basemapPanelHeader").val();
		}
		else if(tool.type == "directions")
		{
			tool.title = $("#directionsPanelHeader").val();
		}
		else if(tool.type == "layers")
		{
			tool.title = $("#layersPanelHeader").val();
		}
		/*else if(tool.type == "dropdown" && tool.enabled == false)
		{
			// move any queries from the dropdown to the bar
			for(var i = 0; i < data.tools.length; i++)
			{
				var tool = data.tools[i];
				if(tool.type == "query" && tool.position == "dropdown")
				{
					//tool.position = "toolbar"; // or just remove it entirely
				}
			}
		}*/
	});
}

function addNewMapConfig()
{   
	data.lmfId = "";
	data.name = "";
	data.lmfRevision = 1;
	data.version = "";
	data.createdBy = "User";
	data.published = false;
	data.surround = { type: "default", title: "" };
    data.viewer = {
    		"type": "leaflet",
            "device": "auto",
            "panelWidth": 400,
            "deviceAutoBreakpoint": 500,
            "themes": [],
            "location": {
                "center": [ -125, 55 ],
                "zoom": 5
            },
            "baseMap": "Topographic",
            "clusterOption": {
                "showCoverageOnHover": false
            }
    	  };
    data.layers = [];
    data._id = null;
    data._rev = null;
    data.tools = [
  			    {
  			      "type": "about",
  			      "enabled": false,
  			      "content": ""
  			    },
		        {
			      "type": "coordinate",
			      "enabled": false
			    },
			    {
			      "type": "attribution",
			      "enabled": false
			    },
			    {
			      "type": "layers",
			      "enabled": true
			    },
			    {
			      "type": "pan",
			      "enabled": true
			    },
			    {
			      "type": "zoom",
			      "enabled": true,
			      "mouseWheel": true,
			      "doubleClick": true,
			      "box": true,
			      "control": true
			    },
			    {
			      "type": "measure",
			      "enabled": false
			    },
			    {
			      "type": "markup",
			      "enabled": false
			    },
			    {
			      "type": "scale",
			      "enabled": true,
			      "showFactor": true,
			      "showBar": true
			    },
			    {
			      "type": "minimap",
			      "enabled": true,
			      "baseMap": "Topographic"
			    },
			    {
			      "type": "directions",
			      "enabled": false
			    },
			    {
			      "type": "location",
				  "enabled": false,
			    },
			    {
			      "type": "baseMaps",
			      "enabled": true,
			      "choices": [
			        "Topographic",
			        "Streets",
			        "Imagery",
			        "Oceans",
			        "NationalGeographic",
			        "DarkGray",
			        "Gray"
			      ]
			    },
			    {
			        "type": "select",
			        "enabled": false,
			        "title": "Selection Panel",
			        "style": {
			          "strokeWidth": 1,
			          "strokeStyle": "1, 1",
			          "strokeColor": "#000000",
			          "strokeOpacity": 0.8,
			          "fillColor": "#000000",
			          "fillOpacity": 0.5,
			          "markerSize": [
			            20,
			            20
			          ],
			          "markerOffset": [
			            10,
			            10
			          ]
			        },
			        "styleOpacity": 1
			      },
			    {
			        "type": "identify",
			        "enabled": false,
			        "title": "Identify Panel",
			        "style": {
			          "strokeWidth": 1,
			          "strokeStyle": "1, 1",
			          "strokeColor": "#000000",
			          "strokeOpacity": 0.8,
			          "fillColor": "#000000",
			          "fillOpacity": 0.5,
			          "markerSize": [
			            20,
			            20
			          ],
			          "markerOffset": [
			            10,
			            0
			          ]
			        },
			        "styleOpacity": 1
			      },
			    {
			      "type": "search",
			      "enabled": true
			    },
			    {
			      "type": "list-menu",
			      "enabled": true
			    },
			    {
			      "type": "toolbar",
			      "enabled": true
			    },
			    {
			      "type": "shortcut-menu",
			      "enabled": false
			    }
		    ];

    setupMapConfigToolsUI();

	$("#menu-content").hide("fast");
	$("#editor-content").show("fast");

	$('ul.tabs').tabs();
	$('ul.tabs').tabs('select_tab', 'identity');

	unsavedAttachments = [];
	fileContents = null;

	$(document).ready(function()
	{
	    Materialize.updateTextFields();

	 // init basemap viewer
	 	var ne = L.latLng(data.viewer.location.extent[3], data.viewer.location.extent[2]);
		var sw = L.latLng(data.viewer.location.extent[1], data.viewer.location.extent[0]);
		var bounds = L.latLngBounds(ne, sw);

		//basemapViewerMap.setView(bounds.getCenter(), zoom);
		basemapViewerMap.fitBounds(bounds);

		basemapViewerMap.invalidateSize();
	    setBasemap(data.viewer.baseMap);

	    // reset the layer tree
		var tree = $('#layer-tree').fancytree('getTree');
		tree.reload([]);
	});
}

function saveMapConfig()
{
	finishLayerEdits(selectedLayerNode != null);

	finishToolEdits();
	
	// check if the dropdown tool is disabled, but we have queries that use dropdown
	// if we do, change the queries location from "dropdown"
	
	var requestType = "put";
	var requestUrl = "MapConfigurations/" + data.lmfId;

	if(data._id == null)
	{
		requestType = "post";
		requestUrl = "MapConfigurations/";
		data._id = uuid();
	}

	console.log("Saving JSON: " + JSON.stringify(data));
	
	$.ajax
	({
		url: serviceUrl + requestUrl,
        type: requestType,
        dataType: 'json',
        data: JSON.stringify(data),
        contentType:'application/json',
        crossDomain: true,
        withCredentials: true,
        success: function (result)
        {
        	if(result.hasOwnProperty("lmfId")) data.lmfId = result.lmfId;
        	Materialize.toast('Successfully saved application ' + data.lmfId + '. Checking for attachment uploads...', 4000);

        	// now we need to complete any attachments before moving on.
        	
        	if(unsavedAttachments.length > 0)
    		{
        		$("#editor-content").hide("fast");
        		$("#menu-content").show("fast");
        		$("#loadingBar").show();
        		$("#appsTablePanel").hide();
        		
	        	processAttachments(0, unsavedAttachments);
    		}
        	else
    		{
        		Materialize.toast('No attachments to process. Save complete.', 4000);
        		closeEditPanel();
    		}
        },
        error: function (status)
        {
            Materialize.toast('Error saving application ' + data.lmfId + '. Error: ' + status.responseText, 10000);
            console.log('Error saving application ' + data.lmfId + '. Error: ' + status.responseText);
            if(data._rev == null) data._id = null;
            closeEditPanel();
        }
	});
}

function processAttachments(index, unsavedAttachments)
{
	if(index >= unsavedAttachments.length)
	{
		Materialize.toast('Attachment upload complete.', 4000);
		closeEditPanel();	
	}
	else
	{
		var attachment = unsavedAttachments[index];
		
		if(attachment.contents != null)
		{
			var documentData = new FormData();
			
			var attchId;
			var attchType;
			
			if(attachment.type == "marker_upload" && attachment.layer != null) 
			{
				attchId = attachment.layer.id + "-marker";
				attchType = "image";
				documentData.append('file', dataURLToBlob(attachment.contents));
			}
			else if(attachment.type == "marker_upload" && attachment.layer == null) 
			{
				Materialize.toast('Error uploading marker image attachment. Could not be associated to a valid layer ID', 5000);
			}
			else 
			{
				attchId = attachment.layer.id;
				attchType = attachment.type;
				documentData.append('file', attachment.contents);
			}
			
			if(attchType == null) attchType = "vector";
			    		
	        handleAttachmentUpload(data.lmfId, attchId, attchType, documentData).then(function()
			{
	        	processAttachments(index + 1, unsavedAttachments);
			});
		}
		else
		{
			Materialize.toast('Attachment ' + attchId + ' failed. No content delivered.', 4000);
			processAttachments(index + 1, unsavedAttachments);
		}
	}
}

function handleAttachmentUpload(lmfId, attchId, attchType, documentData)
{
	return Promise.resolve($.ajax
	({
		url: serviceUrl + "MapConfigurations/" + lmfId + "/Attachments/?id=" + attchId + "&type=" + attchType,
        type: "post",
        data: documentData,
        crossDomain: true,
        withCredentials: true,
        cache: false,
        contentType: false,
        processData: false,
        error: function (status)
        {
            Materialize.toast('Error uploading attachment ' + attchId + '. Error: ' + status.responseText, 10000);
            console.log('Error uploading attachment ' + attchId + '. Error: ' + status.responseText);
            closeEditPanel();
        }
	}));
}

function dataURLToBlob(dataURL) 
{
    var BASE64_MARKER = ';base64,';
    if (dataURL.indexOf(BASE64_MARKER) == -1) 
    {
        var parts = dataURL.split(',');
        var contentType = parts[0].split(':')[1];
        var raw = parts[1];
        
        return new Blob([raw], {type: contentType});
    }
    else 
    {
        var urlParts = dataURL.split(BASE64_MARKER);
        var thisContentType = urlParts[0].split(':')[1];
        var rawAtoB = window.atob(urlParts[1]);
        var rawLength = rawAtoB.length;
        
        var uInt8Array = new Uint8Array(rawLength);
        
        for (var i = 0; i < rawLength; ++i) 
        {
            uInt8Array[i] = rawAtoB.charCodeAt(i);
        }
        
        return new Blob([uInt8Array], {type: thisContentType});
    }
}

function unPublishMapConfig(mapConfigId)
{
	publishedMapConfigs.forEach(function(mapConfig)
	{
		if(mapConfig.lmfId == mapConfigId)
		{
			$.ajax
			({
				url: serviceUrl + 'MapConfigurations/Published/' + mapConfigId,
                type: 'delete',
                crossDomain: true,
                withCredentials: true,
                success: function (data)
                {
                	Materialize.toast('Successfully un-published ' + mapConfigId, 4000);
                	$("#" + mapConfigId + "-pub").remove();
                	loadConfigs();
                },
                error: function (status)
                {
                	Materialize.toast('Error un-publishing ' + mapConfigId, 10000);
                	console.log('Error un-publishing ' + mapConfigId + '. Error: ' + status.responseText);
                }
			});
		}
	});
}

function publishMapConfig(mapConfigId)
{
	mapConfigs.forEach(function(mapConfig)
	{
		if(mapConfig.lmfId == mapConfigId)
		{
			$("#loadingBar").show();
        	$("#appsTablePanel").hide();

			$.ajax
			({
				url: serviceUrl + 'MapConfigurations/Published/' + mapConfigId,
                type: 'post',
                crossDomain: true,
                withCredentials: true,
                success: function (data)
                {
                	Materialize.toast('Successfully published ' + mapConfigId, 4000);
                	loadConfigs();
                	$("#loadingBar").hide();
                	$("#appsTablePanel").show();
                },
                error: function (status)
                {
                	Materialize.toast('Error publishing ' + mapConfigId, 10000);
                	console.log('Error publishing ' + mapConfigId + '. Error: ' + status.responseText);
                	$("#loadingBar").hide();
                	$("#appsTablePanel").show();
                }
			});
		}
	});
}

function exportMapConfig(mapConfigId)
{
	publishedMapConfigs.forEach(function(mapConfig)
	{
		if(mapConfig.lmfId == mapConfigId)
		{
			$("#loadingBar").show();
        	$("#appsTablePanel").hide();
			window.location = serviceUrl + "MapConfigurations/Published/" + mapConfigId + "/Export/"
			$("#loadingBar").hide();
        	$("#appsTablePanel").show();
		}
	});
}

function deleteMapConfig(mapConfigId)
{
	if (confirm('Are you sure you want to delete the application? This cannot be undone...'))
	{
		$("#appsTablePanel").hide();
		$("#loadingBar").show();

		mapConfigs.forEach(function(mapConfig)
		{
			if(mapConfig.lmfId == mapConfigId)
			{
				$.ajax
    			({
    				url: serviceUrl + 'MapConfigurations/' + mapConfigId,
                    type: 'delete',
                    dataType: 'json',
                    contentType:'application/json',
                    crossDomain: true,
                    withCredentials: true,
                    success: function (data)
                    {
                    	Materialize.toast(mapConfigId + ' has been successfully deleted.', 4000);
                    	$("#" + mapConfigId).remove();

                    	$("#loadingBar").hide();
                    	$("#appsTablePanel").show();
                    },
                    error: function (status)
                    {
                    	Materialize.toast('Could not delete ' + mapConfigId + '. Ensure this map is not published before deleting', 10000);
                    	console.log('Error un-publishing ' + mapConfigId + '. Error: ' + status.responseText);
                    }
    			});
			}
		});
	}
}

function previewEdits()
{
	var html = '<html><head><title>' + data.name + '</title><head><body><div id="smk-map-frame"></div><script src="../smk-client/smk-bootstrap.js" smk-standalone="true">return ' + JSON.stringify(data) + '</script></body></html>';

	var newWindow2 = window.open();
	newWindow2.document.write(html);
}


function previewMapConfig(mapConfigId)
{
	mapConfigs.forEach(function(mapConfig)
	{
		if(mapConfig.lmfId == mapConfigId)
		{
			//window.open("viewer.html?type=edit&id=" + mapConfig.lmfId);
			window.open("viewer.html?config=../smks-api/MapConfigurations/" + mapConfig.lmfId + "/");
		}
	});
}

function previewPublishedMapConfig(mapConfigId)
{
	publishedMapConfigs.forEach(function(mapConfig)
	{
		if(mapConfig.lmfId == mapConfigId)
		{
			//window.open("viewer.html?type=published&id=" + mapConfig.lmfId);
			window.open("viewer.html?config=../smks-api/MapConfigurations/Published/" + mapConfig.lmfId + "/");
		}
	});
}

function setBasemap(id)
{
	basemapViewerMap.eachLayer(function (layer)
	{
		basemapViewerMap.removeLayer(layer);
	});

	basemapViewerMap.addLayer(L.esri.basemapLayer(id));
	//resetBasemapView();
}

function resetBasemapView()
{
	$(document).ready(function()
	{
		basemapViewerMap.invalidateSize();

		var sw = L.latLng(data.viewer.location.extent[1], data.viewer.location.extent[2]);
		var ne = L.latLng(data.viewer.location.extent[3], data.viewer.location.extent[0]);
		var bounds = L.latLngBounds(sw, ne);

		basemapViewerMap.fitBounds(bounds);

		editMode = true;
	});
}

var selectedLayerNode;

function downloadSelectedVector()
{
	//trigger the load for published configs
	$.ajax
	({
		url: serviceUrl + 'MapConfigurations/' + data.lmfId + '/Attachments/' + selectedLayerNode.data.id,
		method: 'GET',
        xhrFields: {
            responseType: 'blob'
        },
        success: function (data)
        {
        	var a = document.createElement('a');
            var url = window.URL.createObjectURL(data);
            a.href = url;
            a.download = selectedLayerNode.data.title + '.json';
            a.click();
            window.URL.revokeObjectURL(url);
        },
        error: function (status)
        {
            Materialize.toast('Error loading JSON. Please try again later. Error: ' + status.responseText, 10000);
            console.log('Error loading JSON. Error: ' + status.responseText);
        }
	});
}

function setTitleAttribute(val)
{
	selectedLayerNode.data.titleAttribute = val; 
}

function finishLayerEdits(save)
{
	if(save)
	{
		if(selectedLayerNode.data.type == "wms")
		{
			//set fields
			selectedLayerNode.data.isVisible = $("#wmsVisible").is(":checked");
			selectedLayerNode.data.isQueryable = $("#wmsQueryable").is(":checked");
			selectedLayerNode.data.title = $("#wmsName").val();
			selectedLayerNode.data.attribution = $("#wmsAttribution").val();
			selectedLayerNode.data.opacity = $("#wmsOpacity").val();
			selectedLayerNode.title = $("#wmsName").val();
		}
		else if(selectedLayerNode.data.type == "esri-dynamic")
		{
			//set fields
			selectedLayerNode.data.isVisible = $("#dbcVisible").is(":checked");
			selectedLayerNode.data.isQueryable = $("#dbcQueryable").is(":checked");
			selectedLayerNode.data.title = $("#dbcName").val();
			selectedLayerNode.data.attribution = $("#dbcAttribution").val();
			selectedLayerNode.data.opacity = $("#dbcOpacity").val();
			selectedLayerNode.title = $("#dbcName").val();
			
			// update definition expression
			if($("#dbcDefinitionExpression").val() != null)
			{
				var dynamicJson = JSON.parse(selectedLayerNode.data.dynamicLayers[0]);
				dynamicJson.definitionExpression = $("#dbcDefinitionExpression").val();
				selectedLayerNode.data.dynamicLayers[0] = JSON.stringify(dynamicJson);
			}
		}
		else // vector
		{
			selectedLayerNode.data.type = "vector";			
			selectedLayerNode.data.isVisible = $("#vectorVisible").is(":checked");
			selectedLayerNode.data.isQueryable = $("#vectorQueryable").is(":checked");
			selectedLayerNode.data.title = $("#vectorName").val().replace('.', '-');
			selectedLayerNode.data.dataUrl = $("#vectorUrl").val();
			selectedLayerNode.data.opacity = $("#vectorOpacity").val();
			selectedLayerNode.data.useRaw = !$("#vectorClustering").is(":checked");
			selectedLayerNode.data.useClustering = $("#vectorClustering").is(":checked");
			selectedLayerNode.data.useHeatmap = $("#vectorHeatmapping").is(":checked");
			selectedLayerNode.data.style.strokeWidth = $("#vectorStrokeWidth").val();
			selectedLayerNode.data.style.strokeStyle = $("#vectorStrokeStyle").val();
			selectedLayerNode.data.style.strokeColor = $("#vectorStrokeColor").val();
			selectedLayerNode.data.style.strokeOpacity = $("#vectorStrokeOpacity").val();
			selectedLayerNode.data.style.fillColor = $("#vectorFillColor").val();
			selectedLayerNode.data.style.fillOpacity = $("#vectorFillOpacity").val();
			selectedLayerNode.data.style.markerSize = [$("#vectorMarkerSizeX").val(), $("#vectorMarkerSizeY").val()];
			selectedLayerNode.data.style.markerOffset = [$("#vectorMarkerOffsetX").val(), $("#vectorMarkerOffsetY").val()];
			selectedLayerNode.title = $("#vectorName").val();
			// add the attachment data to the cache for upload after save
			// currently you cannot re-upload and must create a new layer
			if(fileContents !== null)
			{
				unsavedAttachments.push(
				{
					type: $("#vectorType").val(),
					layer: selectedLayerNode.data,
					contents: fileContents
				});
			}

			unsavedAttachments.forEach(function(attch)
			{
				if(attch.type == "marker_upload" && attch.layer == null)
				{
					attch.layer = selectedLayerNode.data;
					selectedLayerNode.data.style.markerUrl = "@" + selectedLayerNode.data.id + "-marker";
				}
			});
			
			document.getElementById("layersForm").reset();
		}

		if(selectedLayerNode.data.attributes == null) selectedLayerNode.data.attributes = [];
		selectedLayerNode.data.attributes.forEach(function (attribute)
		{
			attribute.visible = $("#" + attribute.id + "_visible").is(":checked");
			attribute.title = $("#" + attribute.id + "_label").val();
		});
		
		var root = $("#layer-tree").fancytree('getTree').getRootNode().children;
		var tree = $("#layer-tree").fancytree('getTree');
		tree.reload(root);

		//replace layer in source data
		data.layers.forEach(function (lyr)
		{
			if(lyr.id == selectedLayerNode.data.id)
			{
				var index = data.layers.indexOf(lyr);
				if (index !== -1)
				{
					var layerData = selectedLayerNode.data;

					if(layerData.hasOwnProperty("li")) delete layerData["li"];
					if(layerData.hasOwnProperty("parent")) delete layerData["parent"];
					if(layerData.hasOwnProperty("span")) delete layerData["span"];
					if(layerData.hasOwnProperty("tree")) delete layerData["tree"];
					if(layerData.hasOwnProperty("ul")) delete layerData["ul"];

					data.layers.splice(index, 1);
					data.layers.push(layerData);
				}
			}
      	});
		
		// update the display layer
		for(var tool in data.tools)
		{
			tool = data.tools[tool];
			if(tool.type == "layers")
			{
				for(var displayLayer in tool.display)
				{
					displayLayer = tool.display[displayLayer];
					if(displayLayer.id == selectedLayerNode.data.id)
					{
						displayLayer.title = selectedLayerNode.data.title;
						break;
					}
				}
				break;
			}
		}
	}

	$("#attributePanel").empty();
	$("#queriesTable tr").remove();
	$("#editLayerPanel").hide();
	$("#layerEditDataBCPanel").hide();
	$("#layerEditWMSPanel").hide();
	$("#layerEditVectorPanel").hide();
	$("#layerAddPanel").show();

	document.getElementById("layersForm").reset();

	selectedLayerNode = null;
	fileContents = null;
}

function createDisplayLayersFromNodes(node)
{
	var item = 
	{ 
		id: node.data.id,
		type: node.data.type,
		title: node.data.title,
		isVisible: true
	};
	
	if(node.data.type == "folder" || node.data.type == "group")
	{
		if(node.data.type == "folder") 
		{
			item.isExpanded = false;
		}
		
		item.items = [];
		for(var child in node.children)
		{
			child = node.children[child];
			var subItem = createDisplayLayersFromNodes(child);
			
			item.items.push(subItem);
		}
	}
	
	return item;
}

function rebuildDisplayLayers()
{
	// get layers tool
	for(var tool in data.tools)
	{
		tool = data.tools[tool];
		if(tool.type == "layers")
		{
			// turf existing display order
			tool.display = [];
			
			// get nodes
			var nodes = $("#layer-display-tree").fancytree('getTree').rootNode.children;
			
			// for each item, create a new display object
			for(var item in nodes)
			{
				item = nodes[item];
				var displayLayer = createDisplayLayersFromNodes(item);
				tool.display.push(displayLayer);
			}
		}
	}
}

function processDisplayLayer(displayLayer)
{
	var item = 
	{
		title: displayLayer.title,
		folder: displayLayer.type == "folder" || displayLayer.type == "group",
		expanded: false,
		data: displayLayer,
		children: []
	};
	
	if(item.folder)
	{
		for(var subLayer in displayLayer.items)
		{
			subLayer = displayLayer.items[subLayer];
			item.children.push(processDisplayLayer(subLayer));
		}
	}
	
	return item;
}

function addNewDisplayFolder()
{
	// set new item id to random guid?
	var node = $("#layer-display-tree").fancytree("getActiveNode");
	
	var item = 
	{
		title: "New Folder",
		folder: true,
		expanded: false,
		data: 
		{
			id: uuid(),
		    type: "folder",
		    title: "New Folder",
		    isVisible: true,
		    isExpanded: false,
		    items: []
		},
		children: []
	};
	
	if(node == null)
	{
		// put a folder at the root
		$("#layer-display-tree").fancytree("getRootNode").addChildren(item);
	}
	else
	{
		// if the node is a folder, create a new folder within
		// if the node is a layer, create a folder at the root and move the layer into it
		// if the node is a group, cancel event
		if(node.data.type == "folder") node.appendSibling(item);
		else if(node.data.type == "layer")
		{
			var child = node.parent.addChildren(item);
			node.moveTo(child, "child");
		}
		if(node.data.type == "group")
		{
			// show error message
		}
	}
}

function addNewDisplayGroup()
{
	// set new item id to random guid?
	var node = $("#layer-display-tree").fancytree("getActiveNode");
	
	var item = 
	{
		title: "New Group",
		folder: true,
		expanded: false,
		data: 
		{
			id: uuid(),
		    type: "group",
		    title: "New Group",
		    isVisible: true,
		    isExpanded: false,
		    items: []
		},
		children: []
	};
	
	if(node == null)
	{
		// put a folder at the root
		$("#layer-display-tree").fancytree("getRootNode").addChildren(item);
	}
	else
	{
		// if the node is a folder, create a new folder within
		// if the node is a layer, create a folder at the root and move the layer into it
		// if the node is a group, cancel event
		if(node.data.type == "folder") node.appendSibling(item);
		else if(node.data.type == "layer")
		{
			var child = node.parent.addChildren(item);
			node.moveTo(child, "child");
		}
		if(node.data.type == "group")
		{
			// show error message
		}
	}
}

function removeSelectedDisplayLayer()
{
	var node = $("#layer-display-tree").fancytree("getActiveNode");
	
	if(node != null && node.data.type != "layer")
	{
		while( node.hasChildren() ) 
		{
			node.getFirstChild().moveTo(node.parent, "child");
		}
			
		node.remove();
	}
}

function editLayerDisplayOrder()
{
	var sourceData = [];
	
	for(var tool in data.tools)
	{
		tool = data.tools[tool];
		if(tool.type == "layers")
		{
			for(var displayLayer in tool.display)
			{
				displayLayer = tool.display[displayLayer];
				var item = processDisplayLayer(displayLayer);
				sourceData.push(item);
			}
		}
	}

	$("#layerDisplayOrderContent").empty();
	$("#layerDisplayOrderContent").append('<div id="layer-display-tree" class="display-order-container" style="height: calc(100vh - 677px);"></div>');
	
	// setup the tree view
	$("#layer-display-tree").fancytree({
		extensions: ["childcounter", "edit", "dnd5"],
	    checkbox: false,
	    selectMode: 1,
	    source: sourceData,
	    activate: function(event, data)
	    {
	    },
	    select: function(event, data)
	    {
	    },
	    childcounter: 
	    {
	        deep: true,
	        hideZeros: true,
	        hideExpanded: true
	    },
	    dnd5: 
	    {
	        autoExpandMS: 400,
	        // preventForeignNodes: true,
	        // preventNonNodes: true,
	        preventRecursiveMoves: true, // Prevent dropping nodes on own descendants
	        preventVoidMoves: true, // Prevent dropping nodes 'before self', etc.
	        scroll: true,
	        scrollSpeed: 7,
	        scrollSensitivity: 10,
	        dragStart: function(node, data)
	        {
	          return true;
	        },
	        dragDrag: function(node, data) 
	        {
	          data.dataTransfer.dropEffect = "move";
	        },
	        dragEnd: function(node, data) 
	        {
	        },
	        dragEnter: function(node, data) 
	        {
	          // node.debug("dragEnter", data);
	          data.dataTransfer.dropEffect = "move";
	          data.dataTransfer.effectAllowed = "copy";
	          return true;
	        },
	        
	        dragOver: function(node, data) 
	        {
	          data.dataTransfer.dropEffect = "move";
	          data.dataTransfer.effectAllowed = "copy";
	        },
	        dragLeave: function(node, data) 
	        {
	        },
	        dragDrop: function(node, data) 
	        {
	          node.debug("drop", data);

	          if( data.otherNode ) 
	          {
	        	if(node.data.type != "layer" || data.hitMode == "after" || data.hitMode == "before")
            	{
	        	    data.otherNode.moveTo(node, data.hitMode);
            	}
	        	else if(node.data.type == "layer")
        		{
	        		data.otherNode.moveTo(node, "after");
        		}
	          }
	          
	          node.setExpanded();
	        }
	      },
	    edit: 
	    {
	        triggerStart: ["clickActive", "dblclick", "f2", "mac+enter", "shift+click"],
	        beforeEdit: function(event, nodeData)
	        {
	          // Return false to prevent edit mode
	        },
	        edit: function(event, nodeData)
	        {
	          // Editor was opened (available as data.input)
	        },
	        beforeClose: function(event, nodeData)
	        {
	          // Return false to prevent cancel/save (data.input is available)
	        },
	        save: function(event, nodeData)
	        {
	          return true;
	        },
	        close: function(event, nodeData)
	        {
	          // Editor was removed
	          if( nodeData.save ) 
	          {
	        	  // update the node data
	        	  nodeData.node.data.title = nodeData.node.title;
	        	  
	        	  // update the source layer, if this is a layer node, so we stay consistent
	        	  // note that theoretically you don't have to keep these in sync, detail view
	        	  // overrides layer name.
	        	  if(nodeData.node.data.type == "layer")
	        	  {
	        		  var tree = $('#layer-tree').fancytree('getTree');
    			      var layerSource = tree.getRootNode().children;
    			      
	        		  for(var layerNode in layerSource)
	        		  {
    			    	  layerNode = layerSource[layerNode];
    			    	  if(layerNode.data.id== nodeData.node.data.id)
			    		  {
    			    		  layerNode.data.title = nodeData.node.title;
    			    		  layerNode.title = nodeData.node.title;
    			    		  
    			    		  // update the layer tree
    			    		  tree.reload(layerSource);
    			    		  
    			    		  break;
    			    	  }
	        		  }
	        	  }
	        	  
	              // Since we started an async request, mark the node as preliminary
	              $(nodeData.node.span).addClass("pending");
	          }
	        }
	    },
	    activate: function(event, nodeData) 
	    {
	    }    
	  });
	
	$('#layerOrderModal').modal('open');
}

function editSelectedLayer()
{
	var nodes = $("#layer-tree").fancytree('getTree').getSelectedNodes();
	$("#attributePanel").empty();
	$("#queriesTable tr").remove();
	
	var firstEdited = false;
	
	nodes.forEach(function(node)
   	{
		if(!firstEdited)
		{
			firstEdited = true;
			// display edit panel with node object
			$("#editLayerPanel").show();
			$("#layerAddPanel").hide();
	
			selectedLayerNode = node;
	
			if(node.data.type == "wms")
			{
				$("#layerEditWMSPanel").show();
	
				var layer = L.tileLayer.wms(node.data.serviceUrl,
			    {
			        layers: [node.data.layerName],
			        styles: [node.data.styleName],
			        version: node.data.version,
			        format: 'image/png',
			        transparent: true,
			        attribution: node.data.attribution
			    });
	
			    layer.setOpacity(node.data.opacity);
	
			    //set fields
				$("#wmsVisible").prop('checked', node.data.isVisible);
				$("#wmsQueryable").prop('checked', node.data.isQueryable);
				$("#wmsName").val(node.data.title);
				$("#wmsAttribution").val(node.data.attribution);
				$("#wmsOpacity").val(node.data.opacity);
			}
			else if(node.data.type == "esri-dynamic")
			{
				$("#layerEditDataBCPanel").show();
	
				//set fields
				$("#dbcVisible").prop('checked', node.data.isVisible);
				$("#dbcQueryable").prop('checked', node.data.isQueryable);
				$("#dbcName").val(node.data.title);
				$("#dbcAttribution").val(node.data.attribution);
				$("#dbcOpacity").val(node.data.opacity);
				
				// get the defnition expression
				if(node.data.dynamicLayers != null && node.data.dynamicLayers[0] != null)
				{
					var dynamicJson = JSON.parse(node.data.dynamicLayers[0]);
					if(dynamicJson.hasOwnProperty('definitionExpression'))
					{
						$("#dbcDefinitionExpression").val(dynamicJson.definitionExpression);
					}
				}
			}
			else
			{
				$("#layerEditVectorPanel").show(); // vector
	
				$("#vectorVisible").prop('checked', node.data.isVisible);
				$("#vectorQueryable").prop('checked', node.data.isQueryable);
				$("#vectorName").val(node.data.title);
				$("#vectorOpacity").val(node.data.opacity);
				$("#vectorRawVector").prop('checked', node.data.useRaw);
				$("#vectorClustering").prop('checked', node.data.useClustering);
				$("#vectorHeatmapping").prop('checked', node.data.useHeatmap);
				$("#vectorStrokeWidth").val(node.data.style.strokeWidth);
				$("#vectorStrokeStyle").val(node.data.style.strokeStyle);
			    $("#vectorStrokeColor").val(node.data.style.strokeColor);
			    $("#vectorStrokeOpacity").val(node.data.style.strokeOpacity);
			    $("#vectorFillColor").val(node.data.style.fillColor);
			    $("#vectorFillOpacity").val(node.data.style.fillOpacity);
			    $("#vectorMarkerSizeX").val(node.data.style.markerSize[0]);
			    $("#vectorMarkerSizeY").val(node.data.style.markerSize[1]);
			    $("#vectorMarkerOffsetX").val(node.data.style.markerOffset[0]);
			    $("#vectorMarkerOffsetY").val(node.data.style.markerOffset[1]);
			}
	
			if(node.data.attributes == null) node.data.attributes = [];
			$("#attributePanel").empty();
			
			node.data.attributes.forEach(function (attribute)
			{
				$("#attributePanel").append('<div class="row"><div class="col s2"><p><input type="checkbox" id="' + attribute.id + '_visible" /><label class="black-text" for="' + attribute.id + '_visible">Visible</label></p></div><div class="col s2"><p><input name="titleGroup" type="radio" id="' + attribute.id + '_title" /><label for="' + attribute.id + '_title" onclick="setTitleAttribute(\'' + attribute.name + '\')"></label></p></div><div class="col s8 input-field"><input id="' + attribute.id + '_label" type="text"><label for="' + attribute.id + '_label">' + attribute.name + '</label></div></div>');
				$("#" + attribute.id + "_visible").prop('checked', attribute.visible);
				$("#" + attribute.id + "_label").val(attribute.title);
				
				if(node.data.hasOwnProperty("titleAttribute") && node.data.titleAttribute == attribute.name)
				{
					$("#" + attribute.id + "_title").prop('checked', true);
				}
				else
				{
					$("#" + attribute.id + "_title").prop('checked', false);
				}
			}); 
			
			if(node.data.queries == null) node.data.queries = [];
			$("#queriesTable tr").remove();
			
			Materialize.updateTextFields();
   		}
   	});
}

function removeSelectedLayer()
{
	var nodes = $("#layer-tree").fancytree('getTree').getSelectedNodes();
	var nodesToRemoveCount = nodes.length;
	var index = 0;
	
	nodes.forEach(function(node)
   	{
		index++;
		
		var tree = $('#layer-tree').fancytree('getTree');
    	var layerSource = tree.getRootNode().children;

    	var containsNode = (layerSource.indexOf(node) > -1);
		if(containsNode)
		{
			var nodeIndex = layerSource.indexOf(node);
			if (nodeIndex !== -1) layerSource.splice(nodeIndex, 1);
		}

		data.layers.forEach(function(lyr)
      	{
			if(lyr.id == node.data.id)
			{
				var contains = (data.layers.indexOf(lyr) > -1);
				if(contains)
				{
					var index = data.layers.indexOf(lyr);
					if (index !== -1) data.layers.splice(index, 1);
					
					// remove display object
					for(var tool in data.tools)
					{
						tool = data.tools[tool];
						if(tool.type == "layers")
						{
							// remove matching layer from display layers
							if(tool.display == null) tool.display = [];
						
							var i = tool.display.length;
							while (i--) 
							{
								var displayLayer = tool.display[i];
								removeDisplayLayer(tool.display, lyr, displayLayer, tool.display); 
							}
						}
					}
				}
			}
      	});
		
		if(index == nodesToRemoveCount) tree.reload(layerSource);
   	});
}

function removeDisplayLayer(subArray, lyr, displayLayer, rootArray)
{
	if(displayLayer.id == lyr.id)
	{
		//remove
		var index = subArray.indexOf(displayLayer);
		if (index > -1) subArray.splice(index, 1);
		
		// if we have children (should be impossible here) move them to the root
		if(displayLayer.hasOwnProperty('items') && displayLayer.items != null && displayLayer.items.length > 0)
		{
			for(var child in displayLayer.items) rootArray.push(child);
		}
	}
	else if(displayLayer.hasOwnProperty('items') && displayLayer.items != null && displayLayer.items.length > 0)
	{
		//scan for matching ID, and remove
		var i = displayLayer.items.length
		while (i--) 
		{
			var subLayer = displayLayer.items[i];
			removeDisplayLayer(displayLayer.items, lyr, subLayer, rootArray); 
		}
		
		if(displayLayer.items.length == 0)
		{
			var index = subArray.indexOf(displayLayer);
			if (index > -1) subArray.splice(index, 1);
		}
	}
}

function openQueryEditor()
{
	queryArgumentCount = 0;
	selectedQuery = null;
	argumentIds = [];
	newQuery = false;
	dropdownOptions = [];
	
	$("#queryArguments").empty();
	$("#queriesTable tr").remove();
	document.getElementById("queryEditorForm").reset();
	
	if(selectedLayerNode.data.queries != null)
	{
		$.each(selectedLayerNode.data.queries, function (i, query) 
		{
			// add a row per query
			$("#queriesTable > tbody:last-child").append("<tr id='" + query.id + "-query'><td>" + query.id + "</td><td>" + query.title + "</td><td>" + query.description + "</td><td><a href='#' onclick='editQuery(\"" + query.id + "\")' class='blue-text'>Edit</a></td><td><a href='#' onclick='deleteQuery(\"" + query.id + "\")' class='blue-text'>Delete</a></td></tr>");
		});
	}
	
	$("#queryTable").show();
	$("#queryEditor").hide();
	$('#queriesModal').modal('open');
}

function deleteQuery(id)
{
	// remove row, and trim out the query from the node data
	$("#" + id + "-query").remove();
	selectedLayerNode.data.queries.forEach(function(query)
	{
		if(query.id == id)
		{
			//selectedLayerNode.data.queries.pop(query);
			var idx = selectedLayerNode.data.queries.indexOf(query);
			if(idx > -1)
			{
				selectedLayerNode.data.queries.splice(idx, 1)
			}
			
			// remove the tool
			for(var i = 0; i < data.tools.length; i++)
			{
				var tool = data.tools[i];
				if(tool.type == "query" && tool.instance == selectedLayerNode.data.id + "--" + id)
				{
					var toolIdx = data.tools.indexOf(tool);
					if(toolIdx > -1)
					{
						data.tools.splice(toolIdx, 1)
					}
				}
			}
		}
	});
}

function addNewQuery()
{
	if(selectedLayerNode.data.queries == null) selectedLayerNode.data.queries = [];
	var query = {};
	query.predicate = {};
	selectedQuery = query;
	newQuery = true;
	dropdownOptions = [];
	
	$("#queryTable").hide();
	$("#queryEditor").show();
	$("#queryIcon").val("search");
	
	// we should make sure that the config includes the menu and dropdown tools
	var menuExists = false;
	var dropdownExists = false;
	for(var i = 0; i < data.tools.length; i++)
	{
		var thisTool = data.tools[i];
		if(thisTool.type == "list-menu" && menuExists == false) menuExists = true;
		if(thisTool.type == "dropdown" && dropdownExists == false) dropdownExists = true;
	}
	
	if(!menuExists)
	{
		var menuTool = { type: "list-menu" };
		data.tools.push(menuTool);
	}
	
	if(!dropdownExists)
	{
		var dropdownTool = { type: "dropdown" };
		data.tools.push(dropdownTool);
	}
}

function editQuery(id)
{
	queryArgumentCount = 0;
	argumentIds = [];
	dropdownOptions = [];
	
	selectedLayerNode.data.queries.forEach(function(query)
	{
		if(query.id == id)
		{
			selectedQuery = query;
			
			$("#queryName").val(query.title);
			$("#queryDescription").val(query.description);
			$("#queryAndOrToggle").prop('checked', query.predicate.operator == "or" ? true : false);
			
			for(var j = 0; j < data.tools.length; j++)
			{
				if(data.tools[j].type == "query" && data.tools[j].instance == selectedLayerNode.data.id + "--" + selectedQuery.id)
				{
					$("#queryMenu").prop('checked', data.tools[j].position == "list-menu" ? true : false);
					$("#queryToolbar").prop('checked', data.tools[j].position == "toolbar" ? true : false);
					$("#queryShortcut").prop('checked', data.tools[j].position == "shortcut-menu" ? true : false);
					
					$("#queryIcon").val(data.tools[j].icon);
					break;
				}
			}
			
			// build argument chain
	
			for(var i = 0; i < query.predicate.arguments.length; i++)
			{
				var queryArgs = query.predicate.arguments[i];
				
				queryArgumentCount++;
				argumentIds.push(queryArgumentCount);
				
				$("#queryArguments").append('<div class="row" id="' + queryArgumentCount + '_queryArg"><div class="col s4"><label>Attribute</label><select id="' + queryArgumentCount + '_queryAttributes" class="browser-default"><option value="" disabled selected>-----</option></select></div><div class="col s2"><label>Operator optionality</label><select id="' + queryArgumentCount + '_queryOptionality" class="browser-default"><option value="is" selected>Is</option><option value="not">Is Not</option></select></div><div class="col s2"><label>Operator</label><select id="' + queryArgumentCount + '_queryOperator" class="browser-default"><option value="equals" selected>Equals</option><option value="contains">Contains</option><option value="less-than">Less Than</option><option value="greater-than">Greater Than</option><option value="starts-with">Starts With</option><option value="ends-with">Ends With</option></select></div><div id="' + queryArgumentCount + '_inputTypeBox" class="col s2"><label>Input Type</label><select id="' + queryArgumentCount + '_queryInputType" class="browser-default" onchange="toggleDropdownOptionsButton(' + queryArgumentCount + ');"><option value="input" selected>Textbox</option><option value="select">Dropdown</option><option value="select-unique">Autofill Dropdown</option></select></div><div class="col s1" id="' + queryArgumentCount + '_dropdownEditButton" style="display: none;"><a class="btn-floating btn-large waves-effect waves-light nrpp-blue-dark" onclick="editQueryDropdownOptions(' + queryArgumentCount + ');"><i class="material-icons left">mode_edit</i></a></div><div class="col s1" id="' + queryArgumentCount + '_removeArgumentButton"><a class="btn-floating btn-large waves-effect waves-light nrpp-blue-dark" onclick="removeQueryArgument(' + queryArgumentCount + ');"><i class="material-icons left">delete_forever</i></a></div>');
				
				if(queryArgs.operator == "not")
				{
					// replace with the inner arguments for the rest of the details
					queryArgs = queryArgs.arguments[0];
					
					$("#" + queryArgumentCount + "_queryOptionality option[value=not]").attr('selected','selected');
				}
				else
				{
					$("#" + queryArgumentCount + "_queryOptionality option[value=is]").attr('selected','selected');
				}

				// set the query operator
				$("#" + queryArgumentCount + "_queryOperator option[value=" + queryArgs.operator + "]").attr('selected','selected');
				
				// get the attribute name and the param type
				var arg1 = queryArgs.arguments[0];
				var arg2 = queryArgs.arguments[1];
				var name = arg1.name != null ? arg1.name : arg2.name != null ? arg2.name : null;
				var paramId = arg1.operand == "parameter" ? arg1.id : arg2.operand == "parameter" ? arg2.id : null;
				
				//set the selected type
				$.each(query.parameters, function (i, parameter) 
				{
					if(parameter.id == paramId)
					{
						$("#" + queryArgumentCount + "_inputTypeBox option[value=" + parameter.type + "]").attr('selected','selected');
						
						if(parameter.type == "select" || parameter.type == "select-unique")
						{
							$("#" + queryArgumentCount + "_dropdownEditButton").show();
							dropdownOptions[queryArgumentCount] = parameter.choices;
						}
					}
				});
				
				// set the selected attribute
				$.each(selectedLayerNode.data.attributes, function (i, attribute) 
				{
					$("#" + queryArgumentCount + "_queryAttributes").append($('<option>', 
					{ 
						value:  attribute.name,
						text : attribute.title 
					}));

					if(name != null && attribute.name.toUpperCase() == name.toUpperCase())
					{
						$("#" + queryArgumentCount + "_queryAttributes option[value=" + name.toUpperCase() + "]").attr('selected','selected');
					}
				});
			}
			
			Materialize.updateTextFields();
			
			$("#queryTable").hide();
			$("#queryEditor").show();
		}
	});
}

var queryArgumentCount = 0;
var argumentIds = [];
function addNewQueryArgument()
{
	queryArgumentCount++;
	
	$("#queryArguments").append('<div class="row" id="' + queryArgumentCount + '_queryArg"><div class="col s4"><label>Attribute</label><select id="' + queryArgumentCount + '_queryAttributes" class="browser-default"><option value="" disabled selected>-----</option></select></div><div class="col s2"><label>Operator optionality</label><select id="' + queryArgumentCount + '_queryOptionality" class="browser-default"><option value="is" selected>Is</option><option value="not">Is Not</option></select></div><div class="col s2"><label>Operator</label><select id="' + queryArgumentCount + '_queryOperator" class="browser-default"><option value="equals" selected>Equals</option><option value="contains">Contains</option><option value="less-than">Less Than</option><option value="greater-than">Greater Than</option><option value="starts-with">Starts With</option><option value="ends-with">Ends With</option></select></div><div id="' + queryArgumentCount + '_inputTypeBox" class="col s2"><label>Input Type</label><select id="' + queryArgumentCount + '_queryInputType" class="browser-default" onchange="toggleDropdownOptionsButton(' + queryArgumentCount + ');"><option value="input" selected>Textbox</option><option value="select">Dropdown</option><option value="select-unique">Autofill Dropdown</option></select></div><div class="col s1" id="' + queryArgumentCount + '_dropdownEditButton" style="display: none;"><a class="btn-floating btn-large waves-effect waves-light nrpp-blue-dark" onclick="editQueryDropdownOptions(' + queryArgumentCount + ');"><i class="material-icons left">mode_edit</i></a></div><div class="col s1" id="' + queryArgumentCount + '_removeArgumentButton"><a class="btn-floating btn-large waves-effect waves-light nrpp-blue-dark" onclick="removeQueryArgument(' + queryArgumentCount + ');"><i class="material-icons left">delete_forever</i></a></div>');
	
	// add query attributes to selection
	
	$.each(selectedLayerNode.data.attributes, function (i, attribute) 
	{
		$("#" + queryArgumentCount + "_queryAttributes").append($('<option>', 
		{ 
			value:  attribute.name,
			text : attribute.title 
		}));
	});
	
	argumentIds.push(queryArgumentCount);
	dropdownOptions[queryArgumentCount] = [];
}

function toggleDropdownOptionsButton(id)
{
	if($("#" + id + "_queryInputType").val() == "select" || $("#" + id + "_queryInputType").val() == "select-unique")
	{
		$("#" + id + "_dropdownEditButton").show();
	}
	else
	{
		$("#" + id + "_dropdownEditButton").hide();
	}
}

function removeQueryArgument(id)
{
	$("#" + id + "_queryArg").empty();
	$("#" + id + "_queryArg").remove();
	
	var idx = argumentIds.indexOf(id);
	if(idx > -1)
	{
		argumentIds.splice(idx, 1)
		dropdownOptions[id] = [];
	}
}

var selectedQuery;
var newQuery = false;

function saveQuery()
{
	if(newQuery) selectedQuery.id = $("#queryName").val().replace(/\s+/g, '-').toLowerCase();
	selectedQuery.title = $("#queryName").val();
	selectedQuery.description = $("#queryDescription").val();
	selectedQuery.parameters = [];
	selectedQuery.predicate.operator =  $("#queryAndOrToggle").is(":checked") ? "or" : "and";
	selectedQuery.predicate.arguments = [];
	
	// add arguments and params to query
	for(var i = 0; i < argumentIds.length; i++)
	{
		var argId = argumentIds[i];
		var mainArgument = {};
		var not = $("#" + argId + "_queryOptionality").val();
		
		mainArgument = 
		{
            operator: $("#" + argId + "_queryOperator").val(),
            arguments: [
                {
                    operand: "attribute",
                    name: $("#" + argId + "_queryAttributes").val()
                },
                {
                    operand: "parameter",
                    id: "param" + argId
                }
            ]
        };
		
		var paramTitle = $("#" + argId + "_queryAttributes option:selected").text();
		if(not == "not") paramTitle += " not";
		paramTitle += " " + mainArgument.operator.replace(/-/g, ' ');
			
		var param = 
		{
            id: "param" + argId,
            type: $("#" + argId + "_queryInputType").val(),
            title: paramTitle,
            value: ""
        };
		
		if(param.type == "select" || param.type == "select-unique")
		{
			param.choices = dropdownOptions[argId];
			
			// if a select with autofill, set the uniqueAttribute to the attribute name
			if(param.type == "select-unique")
			{
				param.uniqueAttribute = $("#" + argId + "_queryAttributes").val();
			}
		}
		
		selectedQuery.parameters.push(param);
		
		if(not == "not")
		{
			var notArgument = 
			{
	            operator: not,
	            arguments: []
	        };
			
			notArgument.arguments.push(mainArgument);
			mainArgument = notArgument;
		}
		
		selectedQuery.predicate.arguments.push(mainArgument);
	}

	if(newQuery) 
	{
		// push the data into the query array
		selectedLayerNode.data.queries.push(selectedQuery);
		// add a tool
		
		var tool =
		{
			type: "query", 
			instance: selectedLayerNode.data.id + "--" + selectedQuery.id,
			position: $("#queryShortcut").is(":checked") ? "shortcut-menu" : $("#queryToolbar").is(":checked") ? "toolbar" : "list-menu",
			icon: $("#queryIcon").val()
		};
		
		data.tools.push(tool);
	}
	else
	{
		for(var fi = 0; fi < data.tools.length; fi++)
		{
			if(data.tools[fi].type == "query" && data.tools[fi].instance == selectedLayerNode.data.id + "--" + selectedQuery.id)
			{
				data.tools[fi].position = $("#queryShortcut").is(":checked") ? "shortcut-menu" : $("#queryToolbar").is(":checked") ? "toolbar" : "list-menu";
				data.tools[fi].icon = $("#queryIcon").val();
				break;
			}
		}
	}
	
	newQuery = false;
	selectedQuery = null;
	
	$("#queryEditor").hide();
	$("#queryArguments").empty();
	
	document.getElementById("queryEditorForm").reset();

	queryArgumentCount = 0;
	argumentIds = [];
	
	$("#queriesTable tr").remove();
	if(selectedLayerNode.data.queries != null)
	{
		$.each(selectedLayerNode.data.queries, function (i, query) 
		{
			// add a row per query
			$("#queriesTable > tbody:last-child").append("<tr id='" + query.id + "-query'><td>" + query.id + "</td><td>" + query.title + "</td><td>" + query.description + "</td><td><a href='#' onclick='editQuery(\"" + query.id + "\")' class='blue-text'>Edit</a></td><td><a href='#' onclick='deleteQuery(\"" + query.id + "\");' class='blue-text'>Delete</a></td></tr>");
		});
	}
	
	$("#queryTable").show();
}

function updateQueryIconPrefix()
{
	$("#iconDemo").text($("#queryIcon").val());
}

function loadDropdownChoiceFromLayer()
{
	var layer = selectedLayerNode.data;
	if(layer.type == "vector")
	{
		// fetch json from service, parse all attributes
		Materialize.toast('Not yet implemented...', 4000);
	}
	else if(layer.type == "esri-dynamic")
	{
		// run an ArcGIS query on the layer, no geom return, just the selected attribute
		Materialize.toast('Not yet implemented...', 4000);
	}
	else if(layer.type == "wms")
	{
		// wfs query to get all layer data.
		var attribute = $("#" + currentDropdownId + "_queryAttributes").val();
		var url = layer.serviceUrl + "?service=WFS&request=GetFeature&typeNames=" + layer.layerName + "&propertyName=" + attribute + "&outputformat=application%2Fjson";
		
		// fire a request to the wfs URL. take all the results and create choices out of them
		$.ajax
		({
			url: url,
	        type: 'get',
	        dataType: 'json',
	        contentType:'application/json',
	        crossDomain: true,
	        withCredentials: true,
	        success: function (resultData)
	        {
	        	var processedVals = [];
	        	
	        	for(var i = 0; i < resultData.features.length; i++)
        		{
	        		var feature = resultData.features[i];
	        		var value = feature.properties[attribute];
	        		
	        		if(!processedVals.includes(value))
	        		{
	        			processedVals.push(value);
	        			
		        		choiceId++;
		        		choicesIds.push(choiceId);
	
		        		$("#dropdownOptionsPanel").append('<div id="' + choiceId + '_choice" class="row"><div class="col s5 input-field"><input id="' + choiceId + '_dropdownValue" type="text"><label for="' + choiceId + '_dropdownValue">Value</label></div><div class="col s5 input-field"><input id="' + choiceId + '_dropdownTitle" type="text"><label for="' + choiceId + '_dropdownTitle">Description Text</label></div><div class="col s2"><a class="btn-floating btn-large waves-effect waves-light nrpp-blue-dark" onclick="removeChoice(' + choiceId + ');"><i class="material-icons left">delete_forever</i></a></div></div>');
		        		
		        		$("#" + choiceId + "_dropdownValue").val(feature.properties[attribute]);
		        		$("#" + choiceId + "_dropdownTitle").val(feature.properties[attribute]);
        			}
        		}
	        	
	        	Materialize.updateTextFields();
	        }
		});
		
	}
}

var dropdownOptions = [];
var choicesIds = [];
var choiceId;
var currentDropdownId;

function editQueryDropdownOptions(id)
{
	// Build the dropdown csv for the textareas
	$("#dropdownOptionsPanel").empty();
	currentDropdownId = id;
	choicesIds = [];
	choiceId = 0;
	var options = dropdownOptions[id]; // choices array
	
	options.forEach(function (option)
	{
		choiceId++;
		choicesIds.push(choiceId);
		
		$("#dropdownOptionsPanel").append('<div id="' + choiceId + '_choice" class="row"><div class="col s5 input-field"><input id="' + choiceId + '_dropdownValue" type="text"><label for="' + choiceId + '_dropdownValue">Value</label></div><div class="col s5 input-field"><input id="' + choiceId + '_dropdownTitle" type="text"><label for="' + choiceId + '_dropdownTitle">Description Text</label></div><div class="col s2"><a class="btn-floating btn-large waves-effect waves-light nrpp-blue-dark" onclick="removeChoice(' + choiceId + ');"><i class="material-icons left">delete_forever</i></a></div></div>');
		
		$("#" + choiceId + "_dropdownValue").val(option.value);
		$("#" + choiceId + "_dropdownTitle").val(option.title);
	});
	
	Materialize.updateTextFields();
	
	// and finally, open the modal
	$("#queryDropdownModal").modal('open');
}

function addNewChoice()
{
	choiceId++;
	choicesIds.push(choiceId);
	
	$("#dropdownOptionsPanel").append('<div id="' + choiceId + '_choice" class="row"><div class="col s5 input-field"><input id="' + choiceId + '_dropdownValue" type="text"><label for="' + choiceId + '_dropdownValue">Value</label></div><div class="col s5 input-field"><input id="' + choiceId + '_dropdownTitle" type="text"><label for="' + choiceId + '_dropdownTitle">Description Text</label></div><div class="col s2"><a class="btn-floating btn-large waves-effect waves-light nrpp-blue-dark" onclick="removeChoice(' + choiceId + ');"><i class="material-icons left">delete_forever</i></a></div></div>');
}

function removeChoice(id)
{

	$("#" + id + "_choice").empty();
	$("#" + id + "_choice").remove();
	
	var idx = choicesIds.indexOf(id);
	if(idx > -1)
	{
		choicesIds.splice(idx, 1)
	}
}

function updateDropdownList()
{
	dropdownOptions[currentDropdownId] = [];
	
	for(var i = 0; i < choicesIds.length; i++)
	{
		var choiceId = choicesIds[i];
		var option = 
		{
			value: $("#" + choiceId + "_dropdownValue").val(),
			title: $("#" + choiceId + "_dropdownTitle").val()
		};
		
		dropdownOptions[currentDropdownId].push(option);
	}
}

function uploadVectorLayer()
{
	if(fileContents.type == "application/vnd.google-earth.kml+xml")
	{
		var reader = new FileReader();
	
		reader.onload = function(e)
		{
			parseKmlLayerStyle(e.target.result, fileContents);
		};
	
		reader.readAsText(fileContents);
	}
	else if(fileContents.type == "application/vnd.google-earth.kmz")
	{
		convertKmlToLayers(fileContents);
	}
	else
	{
		addVectorLayerToLayerList();
		document.getElementById("layersForm").reset();
	}
}

function addVectorLayerToLayerList()
{
	var layer =
	{
		type: "vector",
		id: $("#kmlName").val().replace(/\s+/g, '-').toLowerCase(),
	    title: $("#kmlName").val().replace('.', '-'),
	    isVisible: true,
	    isQueryable: true, 
	    opacity: 0.65,
	    attributes: [],
	    useRaw: true,
		useClustering: false,
		useHeatmap: false,
		dataUrl: $("#vectorUrl").val(),
		style:
		{
			strokeWidth: 1,
			strokeStyle: "1",
		    strokeColor: $("#kmlStrokeColor").val(),
		    strokeOpacity: 1.0,
		    fillColor: $("#kmlFillColor").val(),
		    fillOpacity: 0.65,
		    markerSize: [10, 10],
		    markerOffset: [5, 5]
		}
	};

	data.layers.push(layer);
	
	// add to layer tree
	var lyrNode =
	{
		title: layer.title,
		folder: false,
		expanded: false,
		data: layer,
		children: []
	};

	var tree = $('#layer-tree').fancytree('getTree');
	var layerSource = tree.getRootNode().children;
	layerSource.push(lyrNode);
	tree.reload(layerSource);

	// add the attachment data to the cache for upload after save
	if($("#vectorUrl").val() == null || $("#vectorUrl").val() == "")
	{
		unsavedAttachments.push(
		{
			type: $("#vectorType").val(),
			layer: layer,
			contents: fileContents
		});
		
		// if a marker has been updloaded, set the layer
		
		for(var idx = 0; idx < unsavedAttachments.length; idx++)
		{
			var attch = unsavedAttachments[idx];
			if(attch.type == "marker_upload" && attch.layer == null)
			{
				attch.layer = layer;
				layer.style.markerUrl = "@" +  layer.id + "-marker";
			}
		}
	}
	
	// create layer display object
	for(var tool in data.tools)
	{
		tool = data.tools[tool];
		if(tool.type == "layers")
		{
			if(tool.display == null) tool.display = [];
			
			tool.display.push(
			{
				id: layer.id,
			    type: "layer",
			    title: layer.title,
			    isVisible: true
			});
		}
	}
	
	return layer;
}

var dbcSelected = false;
var wmsSelected = false;
var uploadSelected = false;

function selectLayerType(type)
{
	dbcSelected = false;
	wmsSelected = false;
	uploadSelected = false;
	
	if(type == "dbc") dbcSelected = true;
	else if(type == "wms") wmsSelected = true;
	else if(type == "upload") uploadSelected = true;
}

function addSelectedDataLayer()
{
	if(dbcSelected) addSelectedDataBCLayer();
	else if(wmsSelected) addSelectedWmsLayer();
	else if(uploadSelected) uploadVectorLayer();
}

function addSelectedWmsLayer()
{
	var nodes = $("#wms-catalog-tree").fancytree('getTree').getSelectedNodes();

	nodes.forEach(function(node)
   	{
		node.setSelected(false);

		if(node.folder == false)
		{
			var wmsData = null;
			var wmsStyleData = null;

			if(node.data.wms != null)
			{
				wmsData = node.data.wms;
				wmsStyleData = node.data.style;
			}
			else wmsData = node.data;

			var wmsItem = {
					type: "wms",
					version: wmsVersion,
					serviceUrl: wmsUrl,
					layerName: wmsData.name,
					styleName: wmsStyleData != null ? wmsStyleData.name : null,
					id: wmsStyleData != null ? wmsData.name + "-" + wmsStyleData.name : wmsData.name,
					title: wmsStyleData != null ? wmsData.title + " " + wmsStyleData.title : wmsData.title,
					isVisible: true,
					isQueryable: true,
					attribution: "",
					metadataUrl: "",
					opacity: 0.65,
					attributes: wmsData.attributes
				  };

			data.layers.push(wmsItem);

			var lyrNode = {
					title: wmsItem.title,
					folder: false,
					expanded: false,
					data: wmsItem,
					children: []
				};

			var tree = $('#layer-tree').fancytree('getTree');
			var layerSource = tree.getRootNode().children;
			layerSource.push(lyrNode);
			tree.reload(layerSource);
			
			// create layer display object
    		for(var tool in data.tools)
    		{
    			tool = data.tools[tool];
    			if(tool.type == "layers")
    			{
    				if(tool.display == null) tool.display = [];
    				
    				tool.display.push(
    				{
    					id: wmsItem.id,
    				    type: "layer",
    				    title: wmsItem.title,
    				    isVisible: true
    				});
    			}
    		}
		}
   	});
}

function addSelectedDataBCLayer()
{
	var nodes = $("#catalog-tree").fancytree('getTree').getSelectedNodes();

	nodes.forEach(function(node)
   	{
		loadSelectedDataBCCatalogLayers(node);
		node.setSelected(false);
   	});
}

function loadSelectedDataBCCatalogLayers(node)
{
	if(node.folder == false)
	{
		getCompleteCatalogItem(node.data.mpcmId);
	}
}

function getCompleteCatalogItem(mpcmId)
{
	if(mpcmId != 0)
	{
		$.ajax
		({
			url: serviceUrl + 'LayerLibrary/' + mpcmId,
            type: 'get',
            dataType: 'json',
            contentType:'application/json',
            crossDomain: true,
            withCredentials: true,
            success: function (catalogCompleteItem)
            {
            	if(catalogCompleteItem.mpcmWorkspace == "MPCM_ALL_PUB")
        		{
	            	catalogCompleteItem.isVisible = true;
	            	catalogCompleteItem.isQueryable = true;
	            	
	            	if(data.layers == null) data.layers = [];
	            	data.layers.push(catalogCompleteItem);
	
	            	var lyrNode = {
							title: catalogCompleteItem.title,
							folder: false,
							expanded: false,
							data: catalogCompleteItem,
							children: []
						};
	
	            	var tree = $('#layer-tree').fancytree('getTree');
	            	var layerSource = tree.getRootNode().children;
	            	layerSource.push(lyrNode);
	        		tree.reload(layerSource);
	        		
	        		// create layer display object
	        		for(var tool in data.tools)
	        		{
	        			tool = data.tools[tool];
	        			if(tool.type == "layers")
	        			{
	        				if(tool.display == null) tool.display = [];
	        				
	        				tool.display.push(
	        				{
	        					id: catalogCompleteItem.id,
	        				    type: "layer",
	        				    title: catalogCompleteItem.title,
	        				    isVisible: true
	        				});
	        			}
	        		}
        		}
            	else
        		{
            		Materialize.toast('This layer appears to be secure. You cannot add secure layers at this time.', 4000);
        		}
            },
            error: function (status)
            {
                // error handler
                Materialize.toast('Error loading MPCM Layer. This layer may be secure and unloadable.', 4000);
            }
		});
	}
}

function createTreeItem(catalogItem)
{
	var item = {
					title: catalogItem.label,
					folder: catalogItem.mpcmId == 0,
					expanded: false,
					data: catalogItem,
					children: []
				};

	for (var subItem in catalogItem.sublayers)
	{
		item.children.push(createTreeItem(catalogItem.sublayers[subItem]));
	}

	return item
}

function createWmsTreeItem(wmsItem)
{
	var item = {
			title: wmsItem.title,
			folder: wmsItem.styles.length > 0,
			expanded: false,
			data: wmsItem,
			children: []
		};

	for (var subItem in wmsItem.styles)
	{
		var styleData = wmsItem.styles[subItem];

		var styleItem = {
				title: styleData.title,
				folder: false,
				expanded: false,
				data: { wms: wmsItem, style: styleData }
			};

		item.children.push(styleItem);
	}

	return item
}

var defaultFilterOptions = {
	    autoApply: true,
        autoExpand: true,
        counter: true,
        fuzzy: false,
        hideExpandedCounter: true,
        hideExpanders: false,
        highlight: true,
        leavesOnly: false,
        nodata: true,
        mode: "hide"
      };

function dbcTreeFilter()
{
	  var tree = $("#catalog-tree").fancytree('getTree');
	  var match = $("#searchDbcTree").val();
	  var opts = defaultFilterOptions;
	  var n;

	  if(match.length > 2)
	  {
		  n = tree.filterBranches.call(tree, match, opts);
		  $("#btnResetDbcTreeSearch").attr("disabled", false);
		  $("#dbcTreeMatches").text("(" + n + " matches)");
	  }
	  else
	  {
		  $("#catalog-tree").fancytree("getTree").clearFilter();
		  $("#dbcTreeMatches").text("");
	  }
}

function wmsTreeFilter()
{
	  var tree = $("#wms-catalog-tree").fancytree('getTree');
	  var match = $("#searchWmsTree").val();
	  var opts = defaultFilterOptions;
	  var n;

	  if(match.length > 2)
	  {
		  n = tree.filterBranches.call(tree, match, opts);
		  $("#btnResetWmsTreeSearch").attr("disabled", false);
		  $("#wmsTreeMatches").text("(" + n + " matches)");
	  }
	  else
	  {
		  $("#wms-catalog-tree").fancytree("getTree").clearFilter();
		  $("#wmsTreeMatches").text("");
	  }
}

function layerTreeFilter()
{
	  var tree = $("#layer-tree").fancytree('getTree');
	  var match = $("#searchLayerTree").val();
	  var opts = defaultFilterOptions;
	  var n;

	  n = tree.filterBranches.call(tree, match, opts);
	  $("#btnResetLayerTreeSearch").attr("disabled", false);
	  $("#layerTreeMatches").text("(" + n + " matches)");
}

function loadCatalogLayers()
{
	// setup catalog layers
	var catalogTreeSource = [];

	$("#catalog-tree").fancytree({
		extensions: ["filter"],
		quicksearch: true,
		filter: {
			autoApply: true,
	        autoExpand: true,
	        counter: true,
	        fuzzy: false,
	        hideExpandedCounter: true,
	        hideExpanders: false,
	        highlight: true,
	        leavesOnly: false,
	        nodata: true,
	        mode: "hide"
	      },
	    checkbox: true,
	    selectMode: 3,
	    source: catalogTreeSource,
	    activate: function(event, data)
	    {
	    },
	    select: function(event, data)
	    {
	    }
	  });
	  
	  $("#btnResetDbcTreeSearch").click(function(e)
	  {
	      $("#searchDbcTree").val("");
	      $("#dbcTreeMatches").text("");
	      $("#catalog-tree").fancytree("getTree").clearFilter();
	      $("#btnResetDbcTreeSearch").attr("disabled", true);
	  }).attr("disabled", true);

	$.ajax
	({
		url: serviceUrl + 'LayerLibrary/',
        type: 'get',
        dataType: 'json',
        contentType:'application/json',
        crossDomain: true,
        withCredentials: true,
        success: function (data)
        {
        	data.forEach(function(catalogItem)
        	{
        		catalogTreeSource.push(createTreeItem(catalogItem));

        		var tree = $('#catalog-tree').fancytree('getTree');
        		tree.reload(catalogTreeSource);
        	});
        },
        error: function (status)
        {
            // error handler
            Materialize.toast('Error loading DataBC Layer catalog. Please try again later. Error: ' + status.responseText, 10000);
            console.log('Error loading DataBC Layer catalog. Error: ' + status.responseText);
        }
	});
}

function loadWmsLayers()
{
	$("#wmsPanelLoading").show();
	$("#wmsRefreshButton").hide();
	$("#wmsPanel").hide();

	var catalogTreeSource = [];

	$("#wms-catalog-tree").fancytree({
		extensions: ["filter"],
		quicksearch: true,
		filter: {
			autoApply: true,
	        autoExpand: true,
	        counter: true,
	        fuzzy: false,
	        hideExpandedCounter: true,
	        hideExpanders: false,
	        highlight: true,
	        leavesOnly: false,
	        nodata: true,
	        mode: "hide"
	      },
	    checkbox: true,
	    selectMode: 3,
	    source: catalogTreeSource,
	    activate: function(event, data)
	    {
	    },
	    select: function(event, data)
	    {
	    }
	  });

	$("#btnResetWmsTreeSearch").click(function(e)
	{
	    $("#searchWmsTree").val("");
	    $("#wmsTreeMatches").text("");
	    $("#wms-catalog-tree").fancytree("getTree").clearFilter();
	    $("#btnResetWmsTreeSearch").attr("disabled", true);
	}).attr("disabled", true);
	
	wmsUrl = $("#wmsUrlField").val();
	wmsVersion = $("#wmsVersionField").val();

	$.ajax
	({
		url: serviceUrl + "LayerLibrary/wms/?url=" + encodeURIComponent(wmsUrl + wmsPostfix),
        type: 'get',
        dataType: 'json',
        contentType:'application/json',
        success: function (data)
        {
        	data.forEach(function(catalogItem)
        	{
        		catalogTreeSource.push(createWmsTreeItem(catalogItem));

        		var tree = $('#wms-catalog-tree').fancytree('getTree');
        		tree.reload(catalogTreeSource);
        	});

        	$("#wmsPanelLoading").hide();
        	$("#wmsRefreshButton").show();
        	$("#wmsPanel").show();
        },
        error: function (status)
        {
            // error handler
            Materialize.toast('Error loading GetCapabilities from ' + wmsUrl + '. Please try again later. Error: ' + status.responseText, 10000);
            console.log('Error loading GetCapabilities from ' + wmsUrl + '. Error: ' + status.responseText);
            $("#wmsPanelLoading").hide();
            $("#wmsRefreshButton").show();
        	$("#wmsPanel").show();
        }
	});
}

function filterPublishedAppTable()
{
	$("#publishedAppsTable > tbody").html("");
	
	var filterText = $("#tablePublishedFilter").val().toUpperCase();
	
	if(filterText.length > 2)
	{
		publishedMapConfigs.forEach(function(appConfig)
		{
			if(appConfig.name.toUpperCase().includes(filterText))
			{
	        	if($("#" + appConfig.lmfId).length == 0) 
	        	{
	        		$("#publishedAppsTable > tbody:last-child").append("<tr id='" + appConfig.lmfId + "\-pub'><td><a href='#' onclick='previewPublishedMapConfig(\"" + appConfig.lmfId + "\");' class='blue-text'>" + appConfig.name + "</a></td><td>" + appConfig.viewer.type + "</td><td>" + appConfig.lmfRevision + "." + (parseInt(appConfig._rev.split('-')[0]) - 1) + "</td><td>" + appConfig.modifiedDate + "</td><td><a href='#' onclick='unPublishMapConfig(\"" + appConfig.lmfId + "\");' class='blue-text'>Un-Publish</a></td><td><a href='" + serviceUrl + "MapConfigurations/Published/" + appConfig.lmfId + "/Export/' download='smk_client.zip' class='blue-text'>Export</a></td></tr>");
	        	}
			}
		});
	}
	else
	{
		publishedMapConfigs.forEach(function(appConfig)
		{
        	if($("#" + appConfig.lmfId).length == 0) 
        	{
        		$("#publishedAppsTable > tbody:last-child").append("<tr id='" + appConfig.lmfId + "\-pub'><td><a href='#' onclick='previewPublishedMapConfig(\"" + appConfig.lmfId + "\");' class='blue-text'>" + appConfig.name + "</a></td><td>" + appConfig.viewer.type + "</td><td>" + appConfig.lmfRevision + "." + (parseInt(appConfig._rev.split('-')[0]) - 1) + "</td><td>" + appConfig.modifiedDate + "</td><td><a href='#' onclick='unPublishMapConfig(\"" + appConfig.lmfId + "\");' class='blue-text'>Un-Publish</a></td><td><a href='" + serviceUrl + "MapConfigurations/Published/" + appConfig.lmfId + "/Export/' download='smk_client.zip' class='blue-text'>Export</a></td></tr>");
        	}
		});
	}
}

function filterAppTable()
{
	$("#appsTable > tbody").html("");
	
	var filterText = $("#tableFilter").val().toUpperCase();
	
	if(filterText.length > 2)
	{
		mapConfigs.forEach(function(appConfig)
		{
			if(appConfig.name.toUpperCase().includes(filterText))
			{
	        	if($("#" + appConfig.lmfId).length == 0) 
	        	{
	        		$("#appsTable > tbody:last-child").append("<tr id='" + appConfig.lmfId + "\'><td><a href='#' onclick='previewMapConfig(\"" + appConfig.lmfId + "\");' class='blue-text'>" + appConfig.name + "</a></td><td>" + appConfig.viewer.type + "</td><td>" + appConfig.lmfRevision + "." + (parseInt(appConfig._rev.split('-')[0]) - 1) + "</td><td>" + appConfig.modifiedDate + "</td><td><a href='#' onclick='editMapConfig(\"" + appConfig.lmfId + "\");' class='blue-text'>Edit</a></td><td><a href='#' onclick='publishMapConfig(\"" + appConfig.lmfId + "\");' class='blue-text'>Publish</a></td><td><a href='#' onclick='deleteMapConfig(\"" + appConfig.lmfId + "\");' class='blue-text'>Delete</a></td></tr>");
	        	}
			}
		});
	}
	else
	{
		mapConfigs.forEach(function(appConfig)
		{
        	if($("#" + appConfig.lmfId).length == 0) 
        	{
        		$("#appsTable > tbody:last-child").append("<tr id='" + appConfig.lmfId + "\'><td><a href='#' onclick='previewMapConfig(\"" + appConfig.lmfId + "\");' class='blue-text'>" + appConfig.name + "</a></td><td>" + appConfig.viewer.type + "</td><td>" + appConfig.lmfRevision + "." + (parseInt(appConfig._rev.split('-')[0]) - 1) + "</td><td>" + appConfig.modifiedDate + "</td><td><a href='#' onclick='editMapConfig(\"" + appConfig.lmfId + "\");' class='blue-text'>Edit</a></td><td><a href='#' onclick='publishMapConfig(\"" + appConfig.lmfId + "\");' class='blue-text'>Publish</a></td><td><a href='#' onclick='deleteMapConfig(\"" + appConfig.lmfId + "\");' class='blue-text'>Delete</a></td></tr>");
        	}
		});
	}
}


function loadConfigs()
{
	// clear the tables
	$("#appsTable > tbody").html("");
	$("#publishedAppsTable > tbody").html("");
	$("#attributePanel").empty();
	$("#queriesTable tr").remove();

	mapConfigs = [];
	publishedMapConfigs = [];
	selectedMapConfig = null;
	editMode = false;

	// trigger the ajax load for edit copy configs
	$.ajax
	({
		url: serviceUrl + 'MapConfigurations/',
        type: 'get',
        dataType: 'json',
        contentType:'application/json',
        crossDomain: true,
        withCredentials: true,
        success: function (resultData)
        {
        	// finished building table
        	$("#loadingBar").hide();
        	$("#appsTablePanel").show();

        	resultData.forEach(function(appConfigStub)
        	{
        		if(appConfigStub.valid)
        		{
	        		$.ajax
	    			({
	    				url: serviceUrl + 'MapConfigurations/' + appConfigStub.id,
	                    type: 'get',
	                    dataType: 'json',
	                    contentType:'application/json',
	                    crossDomain: true,
	                    withCredentials: true,
	                    success: function (appConfig)
	                    {
	                    	if($("#" + appConfig.lmfId).length == 0) 
	                    	{
	                    		mapConfigs.push(appConfig);
	                    		$("#appsTable > tbody:last-child").append("<tr id='" + appConfig.lmfId + "\'><td><a href='#' onclick='previewMapConfig(\"" + appConfig.lmfId + "\");' class='blue-text'>" + appConfig.name + "</a></td><td>" + appConfig.viewer.type + "</td><td>" + appConfig.lmfRevision + "." + (parseInt(appConfig._rev.split('-')[0]) - 1) + "</td><td>" + appConfig.modifiedDate + "</td><td><a href='#' onclick='editMapConfig(\"" + appConfig.lmfId + "\");' class='blue-text'>Edit</a></td><td><a href='#' onclick='publishMapConfig(\"" + appConfig.lmfId + "\");' class='blue-text'>Publish</a></td><td><a href='#' onclick='deleteMapConfig(\"" + appConfig.lmfId + "\");' class='blue-text'>Delete</a></td></tr>");
	                    	}
	                    },
	                    error: function (status)
	                    {
	                        // error handler
	                        Materialize.toast('Error loading application ' + appConfigStub.id + 'Error: ' + status.responseText, 10000);
	                        console.log('Error loading application ' + appConfigStub.id + '. Error: ' + status.responseText);
	                    }
	    			});
        		}
        		else
    			{
        			$("#appsTable > tbody:last-child").append("<tr id='" + appConfigStub.id + "\'><td>" + appConfigStub.name + " (Invalid Config)</a></td><td>---</td><td>---</td><td></td><td></td><td></td></tr>");
        		}
        	});
        },
        error: function (status)
        {
            // error handler
            Materialize.toast('Error loading applications. Please try again later. Error: ' + status.responseText, 10000);
            console.log('Error loading applications. Error: ' + status.responseText);
        }
	});

	//trigger the load for published configs
	$.ajax
	({
		url: serviceUrl + 'MapConfigurations/Published/',
        type: 'get',
        dataType: 'json',
        contentType:'application/json',
        crossDomain: true,
        withCredentials: true,
        success: function (data)
        {
        	data.forEach(function(appConfigStub)
        	{
        		$.ajax
    			({
    				url: serviceUrl + 'MapConfigurations/Published/' + appConfigStub.id,
                    type: 'get',
                    dataType: 'json',
                    contentType:'application/json',
                    crossDomain: true,
                    withCredentials: true,
                    success: function (appConfig)
                    {
                    	publishedMapConfigs.push(appConfig);
                		$("#publishedAppsTable > tbody:last-child").append("<tr id='" + appConfig.lmfId + "\-pub'><td><a href='#' onclick='previewPublishedMapConfig(\"" + appConfig.lmfId + "\");' class='blue-text'>" + appConfig.name + "</a></td><td>" + appConfig.viewer.type + "</td><td>" + appConfig.lmfRevision + "." + (parseInt(appConfig._rev.split('-')[0]) - 1) + "</td><td>" + appConfig.modifiedDate + "</td><td><a href='#' onclick='unPublishMapConfig(\"" + appConfig.lmfId + "\");' class='blue-text'>Un-Publish</a></td><td><a href='" + serviceUrl + "MapConfigurations/Published/" + appConfig.lmfId + "/Export/' download='smk_client.zip' class='blue-text'>Export</a></td></tr>");
                    },
                    error: function (status)
                    {
                        Materialize.toast('Error loading published application ' + appConfigStub.id + 'Error: ' + status.responseText, 10000);
                        console.log('Error loading published applications. Error: ' + status.responseText);
                    }
    			});
        	});
        },
        error: function (status)
        {
            Materialize.toast('Error loading published applications. Please try again later. Error: ' + status.responseText, 10000);
            console.log('Error loading published applications. Error: ' + status.responseText);
        }
	});
}

$(document).ready(function()
	{

	// init vue
	var app = new Vue(
	{
	  el: '#app',
	  data: data
	});

	var bmLayers = [];
	bmLayers.push(L.esri.basemapLayer("Streets"));
	bmLayers.push(L.esri.basemapLayer("Topographic"));
	bmLayers.push(L.esri.basemapLayer("NationalGeographic"));
	bmLayers.push(L.esri.basemapLayer("ImageryClarity"));

	// init background map
	var map = L.map('map', { zoomControl: false });
	map.touchZoom.disable();
	map.doubleClickZoom.disable();
	map.scrollWheelZoom.disable();
	map.boxZoom.disable();
	map.keyboard.disable();
	var bm = bmLayers[Math.floor((Math.random() * bmLayers.length - 1) + 1)];
	map.addLayer(bm);

	var rndLat = Math.random() * (60 - 48.3) + 47.294;
	var rndLon = (Math.random() * (124 - 111.291) + 114) * -1;
	var rndZoom = Math.floor(Math.random() * (11 - 6) + 6);

	map.setView(new L.latLng(rndLat, rndLon), rndZoom, { animate: true, duration: 60 } );

	// set basemap
	basemapViewerMap = L.map('basemapViewer');
		basemapViewerMap.on('moveend', function()
		{
			if(editMode)
			{
				var bounds = basemapViewerMap.getBounds();
				var center = basemapViewerMap.getBounds().getCenter();
				var zoomLevel = basemapViewerMap.getZoom();

				if(bounds.getWest() != bounds.getEast() && bounds.getNorth() != bounds.getSouth())
				{
					data.viewer.location.extent[0] = bounds.getWest();
					data.viewer.location.extent[1] = bounds.getNorth();
					data.viewer.location.extent[2] = bounds.getEast();
					data.viewer.location.extent[3] = bounds.getSouth();
					
					data.viewer.location.center[0] = center.lng;
					data.viewer.location.center[1] = center.lat;
					data.viewer.location.zoom = basemapViewerMap.getZoom();
					
					// remove extent, if it exists?
				}
			}
		});

		//set wms defaults
		$("#wmsUrlField").val(wmsUrl);
		$("#wmsVersionField").val(wmsVersion);

		// hide editor
	$("#editor-content").hide();

		// init the layer tree
		// setup catalog layers

	$("#layer-tree").fancytree({
		extensions: ["filter"],
		quicksearch: true,
		filter: {
			autoApply: true,
	        autoExpand: true,
	        counter: true,
	        fuzzy: false,
	        hideExpandedCounter: true,
	        hideExpanders: false,
	        highlight: true,
	        leavesOnly: false,
	        nodata: true,
	        mode: "hide"
	      },
	    checkbox: true,
	    selectMode: 3,
	    source: [],
	    activate: function(event, data)
	    {
	    },
	    select: function(event, data)
	    {
	    }
	  });

	$("#btnResetLayerTreeSearch").click(function(e)
    {
        $("#searchLayerTree").val("");
        $("#layerTreeMatches").text("");
        $("#layer-tree").fancytree("getTree").clearFilter();
        $("#btnResetLayerTreeSearch").attr("disabled", true);
    }).attr("disabled", true);
	
	$('ul.tabs').tabs();
	$('ul.tabs').tabs('select_tab', 'editCopyMaps');

	loadConfigs();
	loadCatalogLayers();

	//init the file upload components
	document.getElementById('vectorFileUpload').addEventListener('change', readFile, false);
	document.getElementById('replaceVectorFileUpload').addEventListener('change', readFile, false);
	document.getElementById('customMarkerFileUploadUpdate').addEventListener('change', readMarkerFile, false);
	document.getElementById('customMarkerFileUploadNew').addEventListener('change', readMarkerFile, false);
	
	// init modals
	$('.modal').modal();
	$('#attributesModal').modal({ dismissible: false });
	$('#queriesModal').modal({ dismissible: false });
	$('#kmlUploadModal').modal({ dismissible: false });
	$('#queryDropdownModal').modal(
	{
		dismissible: false,
	    complete: function() 
	    { 
	    	updateDropdownList();
	    }
	});
	$('#layerPopupTemplateModal').modal({ dismissible: false });
	$('#layerOrderModal').modal(
	{ 
		dismissible: false,
		complete: function()
		{
			rebuildDisplayLayers();
		}
	});
});

var fileContents;
var unsavedAttachments = [];

function readMarkerFile(e)
{
	readFile(e);

	var reader = new FileReader();

	reader.onload = function(re)
	{
		unsavedAttachments.push(
		{
			type: "marker_upload",
			layer: selectedLayerNode != null ? selectedLayerNode.data : {},
			contents: re.target.result
		});
		fileContents = null;
		selectedLayerNode.data.style.markerUrl = "@" + selectedLayerNode.data.id + "-marker";
		
		// get the image dimensions and set size/offset accordingly
		var img = new Image();
	    img.addEventListener("load", function()
	    {
	        $("#kmlMarkerSizeX").val(parseInt(this.naturalWidth));
			$("#kmlMarkerSizeY").val(parseInt(this.naturalHeight));
			$("#kmlMarkerOffsetX").val(parseInt(this.naturalWidth / 2));
			$("#kmlMarkerOffsetY").val(parseInt(this.naturalHeight / 2));
			$("#vectorMarkerSizeX").val(parseInt(this.naturalWidth));
			$("#vectorMarkerSizeY").val(parseInt(this.naturalHeight));
			$("#vectorMarkerOffsetX").val(parseInt(this.naturalWidth / 2));
			$("#vectorMarkerOffsetY").val(parseInt(this.naturalHeight / 2));
			
			Materialize.updateTextFields();
	    });
	    
	    img.src = re.target.result;
	};

	reader.readAsDataURL(fileContents);
}

function readFile(e)
{
	fileContents = null;

	var file = e.target.files[0];

	if (!file)
	{
	    return;
	}

	fileContents = file;
	
	if(!file.type.startsWith("image/") && selectedLayerNode == null)
	{
		$("#kmlName").val(file.name.replace('.', '-'));
		$("#vectorName").val(file.name.replace('.', '-'));
	}
	
	if(selectedLayerNode != null && fileContents.type == "application/vnd.google-earth.kml+xml")
	{
		var reader = new FileReader();
	
		reader.onload = function(e)
		{
			parseKmlLayerStyle(e.target.result, fileContents);
		};
	
		reader.readAsText(fileContents);
	}
	
	Materialize.updateTextFields();
}

function uuid()
{
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c)
	{
		var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}
