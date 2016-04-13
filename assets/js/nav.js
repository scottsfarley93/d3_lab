//handles navigation and UI interaction with the base page
$('.filter-caption').hide();
$("#extra-bar").hide();
$(document).ready(function(){
	$(".menu-icon").mouseover(function(){
		$(this).css({
			opacity: 0.5,
			width: '200%'
		});
		$(this).find(".filter-caption").show();
	});
	$(".menu-icon").mouseout(function(){
		$(this).css({
			opacity: 0.25,
			width: '100%'
		});
		$(this).find(".filter-caption").hide();
	});
	
	$("#map-window").click(function(){
		closeInfoWindow();
	});
	$(".dis-btn").click(function(){
		closeInfoWindow();
	});
	$(".apply-button").mouseover(function(){
		$(".apply-btn-text").text("Apply Changes");
	});
	$(".apply-button").mouseout(function(){
		$(".apply-btn-text").text("");
	});
	$(".apply-button").click(function(){
		//reennable glyph 
		closeInfoWindow();
	});
	
	$("#help-filter-button").click(function(){
		var clicked = $(this).data('clicked');
		if (!clicked){
			openInfoWindow();
			$("#filter-header").text("Welcome to the FEMA Disaster Declaration Portal");
			$('#disaster-grid').hide();
			$("#temporal-filters").hide();
			$("#breakdown").hide();
			$("#help").show();
			$("#map-settings").hide();
			$(this).data('clicked', true);
			$("#extra-bar").css({overflow: 'auto'});
		}else{
			closeInfoWindow();
			$(this).data('clicked', false);
		}
	});
	$("#type-filter-button").click(function(){
		var clicked = $(this).data('clicked');
		if (!clicked){
			openInfoWindow();
			$("#filter-header").text("Filter by Disaster Type");
			//show the filter grid
			$("#disaster-grid").show();
			$("#temporal-filters").hide();
			$("#breakdown").hide();
			$("#help").hide();	
			$("#map-settings").hide();
			$(this).data('clicked', true);
			$("#extra-bar").css({overflow: 'hidden'});	
		}else{
			closeInfoWindow();
			$(this).data('clicked', false);
		}

	});
	$("#time-filter-button").click(function(){
		var clicked = $(this).data('clicked');
		if (!clicked){
			$("#filter-header").text("Filter by Temporal Range");
			$('#disaster-grid').hide();
			$("#temporal-filters").show();
			$("#breakdown").hide();
			$("#help").hide();
			openInfoWindow();
			$("#map-settings").hide();
			$(this).data('clicked', true);
			$("#extra-bar").css({overflow: 'hidden'});
		}else{
			closeInfoWindow();
			$(this).data('clicked', false);
		}
	});
	$("#pie-filter-button").click(function(){
		var clicked = $(this).data('clicked');
		if (!clicked){
			$("#filter-header").text("Disaster Breakdown");
			$('#disaster-grid').hide();
			$("#temporal-filters").hide();
			$("#breakdown").show();
			$("#help").hide();
			openInfoWindow();
			$("#map-settings").hide();
			$(this).data('clicked', true);
			$("#extra-bar").css({'overflow': 'hidden'});
		}else{
			closeInfoWindow();
			$(this).data('clicked', false);
		}

	});
	$("#settings-filter-button").click(function(){
		var clicked = $(this).data('clicked');
		if (!clicked){
			$("#filter-header").text("Map Settings");
			$('#disaster-grid').hide();
			$("#temporal-filters").hide();
			$("#breakdown").hide();
			$("#map-settings").show();
			$("#help").hide();
			openInfoWindow();
			$(this).data('clicked', true);
			$("#extra-bar").css({'overflow': 'hidden'});
		}else{
			closeInfoWindow();
			$(this).data('clicked', false);
		}

	});
	
	//click handlers for the disaster selection box
	$('.dis-btn').click(function(){
		t = $(this).data('type');
		setType(t);
	});

	//change normalization type in GUI
	$("input[name=normType]").on('change', function(){
		globals.mapConfig.normType = $(this).val()
		updateMap(globals.mapConfig.geogType, globals.mapConfig.normType, globals.filteredData, globals.mapConfig.numClasses);
	});
	
	//change geog type in GUI
	$("input[name=geogType]").on('change', function(){
		console.log("Changed geography to " + $(this).val());
		globals.mapConfig.geogType = $(this).val()
		updateMap(globals.mapConfig.geogType, globals.mapConfig.normType, globals.filteredData, globals.mapConfig.numClasses);
	});
	
	//event listeners for the temporal filters
	$("#monthSliderMin").change(configureTimeFilter);
	$("#monthSliderMax").change(configureTimeFilter);
	$("#yearSliderMin").change(configureTimeFilter);
	$("#yearSliderMax").change(configureTimeFilter);
	
	//hook up class changes
	//and do it if they click on a row of colors too
	$(".colorSelect").click(function(){
		var numClasses = +$(this).data('numclasses');
		console.log("Changing number of classes to " + numClasses);
		globals.mapConfig.numClasses = numClasses;
		updateMap(globals.mapConfig.geogType, globals.mapConfig.normType, globals.filteredData, globals.mapConfig.numClasses);
		//set the radio button
		$(this).find("input").prop('checked', true);
	});
	
	//control double-sliders
		//tooltips for temporal sliders
		var tooltip = $('<div id="tooltip" />').css({
		    position: 'absolute',
		    top: -25,
		    left: -10
		}).hide();
	//month
	    $( "#month-range" ).slider({
	      range: true,
	      min: 1,
	      max: 12,
	      values: [ 1, 12 ],
	      stop: function( event, ui ) {
	        globals.temporalFilter.maxMonth = ui.values[1];
	        globals.temporalFilter.minMonth = ui.values[0];
	        configureTimeFilter(globals.temporalFilter);
	       	$(this).children('.ui-slider-handle').first().text("").fadeIn(100);
	      	$(this).children('.ui-slider-handle').last().text("").fadeIn(100);
	      },
	      slide: function(event, ui){
	      	 $(this).children('.ui-slider-handle').first().text(months[ui.values[0]]);
	      	 $(this).children('.ui-slider-handle').last().text(months[ui.values[1]]);
	      }
	    });
	  //year
	 $(function() {
	    $( "#year-range" ).slider({
	      range: true,
	      min: 1960,
	      max: 2016,
	      values: [ 1960, 2016 ],
	      stop: function( event, ui ) {
	        globals.temporalFilter.maxYear = ui.values[1];
	        globals.temporalFilter.minYear = ui.values[0];
	        configureTimeFilter(globals.temporalFilter);
	       	$(this).children('.ui-slider-handle').first().text("").fadeIn(100);
	      	$(this).children('.ui-slider-handle').last().text("").fadeIn(100);
	      },
	      slide: function(event, ui){
	      	 $(this).children('.ui-slider-handle').first().text(ui.values[0]);
	      	  $(this).children('.ui-slider-handle').last().text(ui.values[1]);
	      }
	    });
	 
	  });
	
	//the time slider should be as width as the bar charts
	$("#year-range").width($(".temporal-bar").width());
	$("#month-range").width($(".temporal-bar").width());
	//make sure the bars start where the cols do
	$("#year-range").css({
		'margin-left':45 + "px",
		'margin-right': $(this).width()*0.01 + 'px' //not perfect but close
	});
	$("#month-range").css({
		'margin-left':45 + "px",
		'margin-right': $(this).width()*0.01 + 'px'
	});
	



});//end doc ready fn

//resize map on extra bar open
function closeInfoWindow(){
	$("#extra-bar").hide();
	$("#map-window").addClass("col-xs-11").removeClass('col-xs-7');
	$(".filter-button").data('clicked', false);
	updateMapScale(1000)//change the map to be bigger when there is not an info window
}
function openInfoWindow(){
	//$("#disaster-grid").hide() //hide on open so it only shows when we call it
	$("#extra-bar").show();
	$("#map-window").addClass("col-xs-7").removeClass('col-xs-11');
	updateMapScale(750) //change the map to be smaller when the info window is open
}

