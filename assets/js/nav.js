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
	
});//end doc ready fn

//resize map on extra bar open
function closeInfoWindow(){
	$("#extra-bar").hide();
	$("#map-window").addClass("col-xs-11").removeClass('col-xs-7');
	$(".filter-button").data('clicked', false);
}
function openInfoWindow(){
	//$("#disaster-grid").hide() //hide on open so it only shows when we call it
	$("#extra-bar").show();
	$("#map-window").addClass("col-xs-7").removeClass('col-xs-11');
}

