/**
 * @author Scott Farley
 */
//dependencies:
//	jQuery
//  d3.js
// underscore.js

//TODO:
//automatic scale calculation
//composition chart
//update map with colors
//panel styling
//legend
//popup styling




var globals = {};
globals.data = {};
globals.disasterTypes = []; // a list of all of the types of disasters contained within the dataset
globals.filesLoaded = 0; // keeps track of how many ajax files have been loaded to this point in the session.
globals.requiredFiles = 5;

globals.activeData = []; // this is the raw fema data 
globals.currentTypeFilter = "All"; //keeps track of any type filter that has been applied;
globals.filteredData; //this is the data that has the current filter applied
globals.map = {} //central choropleth related information
globals.barcharts = {}
globals.map.margins = {
	top: 50,
	left: 50,
	right:50,
	bottom: 50,
};
globals.temporalFilter = {
	minYear : 1960,
	maxYear : 2016,
	minMonth: 1,
	maxMonth: 12,
}; //this is the current filter on years and months

globals.currentTotal = 0; //total number of disasters with current filters;
globals.mapConfig = {};
globals.mapConfig.geogType = 'Counties';
globals.mapConfig.normType = "None";
globals.mapConfig.numClasses = 5;
globals.mapConfig.inputData = []
globals.map.colorScheme = [
	['#fee6ce', '#e6550d'],//2 classes
	['#fee6ce','#fdae6b','#e6550d'], // 3 classes,
	['#feedde','#fdbe85','#fd8d3c','#d94701'], //four classes
	['#feedde','#fdbe85','#fd8d3c','#e6550d','#a63603'], //five classes
	['#feedde','#fdd0a2','#fdae6b','#fd8d3c','#e6550d','#a63603'], //six classes
	['#feedde','#fdd0a2','#fdae6b','#fd8d3c','#f16913','#d94801','#8c2d04'] // seven classes
];
globals.breakdown = {};
globals.breakdown.type = {};
globals.breakdown.hist = {};


/////-----Important action functions ----////////
$(document).ready(function(){
	//use this to make sure that all files have been loaded into the platform
	$(document).bind('filesLoaded', function(){
		loadPlatform();
	});
	loadData();
});

function loadPlatform(){
	//called once all of the data has been loaded into the map
	$("#currentTask").text("All files have been loaded.  Building interface.");
	populateColorSelect();
	globals.allDisasterTypes = getAllDisasterTypes(globals.data.fema);
	 createMap(); // creates the map
	 //set up the map with the default config
	 globals.mapConfig.inputData = globals.data.fema;
	 buildBarCharts();//these are the filter charts
	 updateMap(globals.mapConfig.geogType, globals.mapConfig.normType, globals.data.fema, globals.mapConfig.numClasses);//colors the choropleth map 
}


function configureTimeFilter(){
	//event handler for min and max month sliders
	//and for min and max year sliders
	//called when one of the sliders changes
	//get the values of all of the sliders
	globals.temporalFilter.minMonth = $("#monthSliderMin").val();
	globals.temporalFilter.maxMonth = $("#monthSliderMax").val();
	globals.temporalFilter.minYear = $("#yearSliderMin").val();
	globals.temporalFilter.maxYear = $("#yearSliderMax").val();
	
	//show the changes in the interface
	$("#minYearText").text(globals.temporalFilter.minYear);
	$("#maxYearText").text(globals.temporalFilter.maxYear);
	$("#minMonthText").text(globals.temporalFilter.minMonth);
	$("#maxMonthText").text(globals.temporalFilter.maxMonth);
	
	//do the filtering
	//
	//start with the current type filter applied
	if (globals.currentTypeFilter == "All"){
		newData = globals.data.fema;
	}else{
		newData = filterByType(globals.data.fema, globals.currentTypeFilter);
	}
	//now do the temporal filtering
	newData = filterByTimeRange(newData, globals.temporalFilter);
	updateMap(globals.mapConfig.geogType, globals.mapConfig.normType, newData, globals.mapConfig.numClasses);
	globals.filteredData = newData;
}



function loadData(){
	$("#currentTask").text("Loading external data files.");
	//load the fema declarations
	loadDisasterData();
	//load the county level data for normalization
	loadCountyData();
	//load the state level data for normalization
	loadStateData();
	//load the county choropleth data for map display
	loadMapData();
}


///////////INDIVIDUAL LOAD FUNCTIONS///////////////

function loadDisasterData(){
	//loads the raw fema data from the server disk
	$.ajax("assets/data/fema4.json",{
		dataType:"json",
		success: function(response){
			globals.filesLoaded += 1;
			$("#filesLoaded").text(globals.filesLoaded);
			globals.data.fema = response['data']; //this is the raw response in case we fuck up later and don't want to load it again
			_.each(globals.data.fema, function(value, key, list){
				value['FIPSCode'] = checkFIPS(value.FIPSCode)
			});
			globals.filteredData = globals.data.fema;
			globals.totalData = globals.data.fema.length;
			if (globals.filesLoaded == globals.requiredFiles){
				$(document).trigger('filesLoaded');
			}
		},
		error: function(xhr, status, error){
			console.log(error);
		}
	});
	
}
function loadCountyData(){
	//loads the county level metadata for normalization from the server disk
	$.ajax("assets/data/county_data.json", {
		dataType:'json',
		success: function(response){
			console.log("Loaded county metadata.");
			globals.filesLoaded += 1;
			$("#filesLoaded").text(globals.filesLoaded);
			globals.data.countyMetadata = response;
			if (globals.filesLoaded == globals.requiredFiles){
				$(document).trigger('filesLoaded');
			}
		},
		error: function(xhr, status, error){
			console.log(error);
		}
	});	
}
function loadStateData(){
	//loads the state level metadata for normalization from the server disk
		$.ajax("assets/data/state_data.json", {
		dataType:'json',
		success: function(response){
			globals.filesLoaded += 1;
			$("#filesLoaded").text(globals.filesLoaded);
			globals.data.stateMetadata = response;
			if (globals.filesLoaded == globals.requiredFiles){
				$(document).trigger('filesLoaded');
			}
		},
		error: function(xhr, status, error){
			console.log(error);
		}
	});	
}
function loadMapData(){
	//load the topojson states file for using the the choropleth
	$.ajax("assets/data/counties_mbostock.topojson", {
		dataType:'json',
		data:{},
		success: function(response){
			globals.filesLoaded += 1;
			$("#filesLoaded").text(globals.filesLoaded);
			globals.data.counties = response;//this is the topojson
			//check if the file has been loaded
			if (globals.filesLoaded == globals.requiredFiles){
				$(document).trigger('filesLoaded');
			}
		},
		error: function(xhr, status, error){
			console.log(error);
		}
	});	 
	$.ajax("assets/data/states.topojson", {
		dataType: "json",
		success: function(response){
			globals.filesLoaded += 1;
			$("#filesLoaded").text(globals.filesLoaded);
			globals.data.states = response;
			console.log(response);
			if (globals.filesLoaded == globals.requiredFiles){
				$(document).trigger('filesLoaded');
			}
		},
		error: function(xhr, status, error){
			console.log(error);
		}
	});
}



//MAP CONTROLS

function createMap(){
	//draws a blank map
	//set props
	var width = $("#map-window").width(),
    height = $("#map-window").height();
	
	//get projection ready
	var projection = d3.geo.albersUsa()
	    .scale(1000)
	    .translate([width / 2, height / 2]);
	
	var path = d3.geo.path()
	    .projection(projection);
	
	globals.map.map = svg = d3.select("#map-window").append("svg")
	    .attr("width", width)
	    .attr("height", height);
	//make globals
	globals.map.projection = projection;
	globals.map.path = path;
	globals.map.canvas = svg;
	
	//do the drawing
	globals.map.counties = svg.append("g")
      .attr("class", "counties")
    .selectAll("path")
	      .data(topojson.feature(globals.data.counties, globals.data.counties.objects.counties).features) // load the counties
	    .enter().append("path")
	      .attr("d", path)
	      .style('fill', 'none')
	      .style('stroke', 'none')
	      .style('stroke-opacity', 0.25)
	  	  .attr('FIPS', function(d){id = checkFIPS(d.id); //make sure it contains the first zero
	  	  		return id;});	 //this is how we know the geographic identifier
	  	  		
	 //load the land
     globals.map.land = svg.append("path")
      .datum(topojson.mesh(globals.data.counties, globals.data.counties.objects.land))
      .attr("class", "states")
      .attr("d", path)
      .style('stroke', 'black')
      .style('fill', 'none');
      
      globals.map.states = svg.append("g")
      	.attr('class', 'states')
      	.selectAll('path')
      	 .data(topojson.feature(globals.data.states, globals.data.states.objects.units).features) // load the states
      	 .enter().append('path')
      	 .attr('d', path)
      	 .style('fill', 'none')
      	 .style('stroke', 'none');
      
      

     
     globals.map.counties.on('click', function(){
     	thisFips = d3.select(this).attr('FIPS');
     	metadata = globals.data.countyMetadata[thisFips];
     	//styling
     	d3.select(this).style('fill', 'red');
     });
     ///TODO:Additional map events should go here
}


function createColorScale(data, numClasses){
	    var colorClasses = chooseColorScheme(numClasses);
	    //quantiles scale
	    var colorScale = d3.scale.quantile()
	        .range(colorClasses);
	
	    //build array of all values of the expressed attribute
	    var domainArray = [];
	    for (var i=0; i<data.length; i++){
	        var val = parseFloat(data[i].value);
	        domainArray.push(val);
	    };
	
	    //assign array of expressed values as scale domain
	    colorScale.domain(domainArray);
	
	    return colorScale;
}

function updateMap(geographyType, normalizationType, filteredInput, numClasses){
	//accepts a geography type of 'Counties' or 'States' and an array of input filtered in the desired way
	//accepts a normalization type of 'Pop', 'Area', or 'None'
	//function aggreages to the desired geography and then sets the choropleth colors
	//returns nothing
	//different breakpoints on the color scale
	//States isn't working yet
	try{
		globals.map.tip.hide(); //make sure its gone
		d3.select(".d3-tip").remove();
	}catch (err){
		console.log(err);
	}
	
	
	 if(geographyType == 'Counties'){
	 	
	 	//disable the states
		globals.map.states.style('fill', 'none');
		globals.map.states.style('stroke', 'none');
		globals.map.land.style('stroke', 'none');
		globals.map.land.style('fill', 'none'); 
		toMap = aggregateByCounty(filteredInput);
		globals.map.aggregateData = toMap;
		if (normalizationType == "Area"){
			toMap = normalize("Counties", "Area", toMap);
		}else if (normalizationType == "None"){
			toMap = normalize("Counties", "None", toMap);
		}
		idToValueMap = {};
		
		globals.map.colorScale = createColorScale(toMap, numClasses);
		//populate the id/value lookup
	    _.each(toMap, function(d){
	    	idToValueMap[checkFIPS(d.geography).toString()] = {value: +d.value, geography: checkFIPS(d.geography)};});
	    globals.map.idToValueMap = idToValueMap;
	    allIDS = [];
	    globals.map.counties.style('fill', function(d){
	    	thisID = checkFIPS(d3.select(this).attr('FIPS'));
	    	allIDS.push(thisID);
			lookup = idToValueMap[thisID];
			//if it is not in idToValueMap, then it means that the filtered value is zero (no disasters);
			//lookup will be undefined
			//so you a try catch block and set value to zero
			try{
				thisValue = idToValueMap[thisID].value;
			}catch (err){
				thisValue = 0;
			}
			if (thisValue == -1){
				return 'gray';
			}else if (thisValue >= 0){
				c = globals.map.colorScale(thisValue);
				return globals.map.colorScale(thisValue);
			}
	   });
	   globals.map.counties.style("stroke", 'white');
	   globals.map.counties.style("stroke-width", 0.25)

	   globals.map.counties.on('click', function(d){
	    	thisID = checkFIPS(d3.select(this).attr('FIPS'));
	    	allIDS.push(thisID);
			lookup = idToValueMap[thisID];
			//if it is not in idToValueMap, then it means that the filtered value is zero (no disasters);
			//lookup will be undefined
			//so you a try catch block and set value to zero
			thisValue = globals.map.idToValueMap[thisID];
			if (thisValue){
				thisValue = thisValue.value;
			}else{
				thisValue = 0;
			}
			detailList = _.where(filteredInput, {FIPSCode:thisID});
	   });
	   
	   	//tooltips //TODO: Change to popup overlay
	 globals.map.tip = d3.tip()
	  .attr('class', 'd3-tip')
	  .offset([-10, 0])
	  .html(function(d){
	  	details = getCountyDetails(checkFIPS(d.id));
	  	try{
	  		val = globals.map.aggregateData[checkFIPS(d.id)].length
	  	}catch(err){
	  		val = 0
	  	}
		  	html = "<h6>" + details.Geography + "</h6><br />"
		  	html += "<label>Land Area: </label><span class='text-muted'>" + details.LandArea + " km<sup>2</sup></span><br />"
		  	html += "<label>Population: </label><span class='text-muted'>" + details.Pop + "</span><br />"
		  	html += "<label>Number of Disasters: </label><span class='text-muted'>" + val+ "</span><br />"
		  	html += "<label>Percent of National Total: </label><span class='text-muted'>" + val/globals.currentTotal * 100+ "</span><br />"
		 return html
	  	
	  });
	  
	  globals.map.canvas.call(globals.map.tip);//enable the tooltip
	  
	  
	  globals.map.counties.on('mouseover', globals.map.tip.show);
	  globals.map.counties.on('mouseout', globals.map.tip.hide);
	   
	} // end counties block
	else if (geographyType == "States"){
		d3.select(".d3-tip").remove();
		console.log('Got to updateMap states');
		//disable the counties
		globals.map.counties.style('fill', 'none');
		globals.map.counties.style('stroke', 'none');
		globals.map.land.style('stroke', 'none');
		globals.map.land.style('fill', 'none'); 
		globals.map.states.style("stroke", 'white');
		globals.map.states.style("stroke-width", 0.25)
		
		//setup the new data
		toMap = aggregateByState(filteredInput);
		globals.map.aggregateData = toMap;
		if (normalizationType == "Area"){
			toMap = normalize("States", "Area", toMap);
		}else if (normalizationType == "None"){
			toMap = normalize("States", "None", toMap);
		}
		console.log(toMap);
		idToValueMap = {};
		//do the drawing
		globals.map.colorScale = createColorScale(toMap, numClasses);
		//populate the id/value lookup
	    _.each(toMap, function(d){
	    	idToValueMap[d.geography] = {value: +d.value, geography: d.geography};});
	    globals.map.idToValueMap = idToValueMap;
	    allIDS = [];
	    globals.map.states.style('fill', function(d){
	    	thisID = fixPostalCode(d.id);
	    	allIDS.push(thisID);
			lookup = idToValueMap[thisID];
			try{
				thisValue = idToValueMap[thisID].value;
			}catch (err){
				thisValue = 0;
			}
			if (thisValue == -1){
				return 'gray';
			}else if (thisValue >= 0){
				c = globals.map.colorScale(thisValue);
				return globals.map.colorScale(thisValue);
			}
	   });

	   globals.map.states.on('click', function(d){
		   	code = d.id;
		   	state = fixPostalCode(code);
			console.log(getStateDetails(state))
	   });
	   
	   	// //tooltips //TODO: Change to popup overlay
	 globals.map.tip = d3.tip()
	  .attr('class', 'd3-tip')
	  .offset([-10, 0])
	  .html(function(d){
	  	details = getStateDetails(fixPostalCode(d.id));
	  	try{
	  		val = globals.map.aggregateData[fixPostalCode(d.id)].length;
	  	}catch(err){
	  		val = 0
	  	}
		  	html = "<h6>" + details.geography + "</h6><br />"
		  	html += "<label>Land Area: </label><span class='text-muted'>" + details.Area + " km<sup>2</sup></span><br />"
		  	html += "<label>Population: </label><span class='text-muted'>" + details.Pop + "</span><br />"
		  	html += "<label>Number of Disasters: </label><span class='text-muted'>" + val+ "</span><br />"
		  	html += "<label>Percent of National Total: </label><span class='text-muted'>" + val/globals.currentTotal * 100+ "</span><br />"
		 return html
	  	
	  });
	  
	  globals.map.canvas.call(globals.map.tip);//enable the tooltip
	  
	  globals.map.states.on('mouseover', globals.map.tip.show);
	  globals.map.states.on('mouseout', globals.map.tip.hide);
		
	}//end states block
	
	globals.filteredData = filteredInput
	//do other updates
	displayMapTotal(filteredInput);
	displayPercentTotal(filteredInput)
	updateBarCharts(filteredInput, globals.temporalFilter);
	createBreakdownCharts(filteredInput);
};



function buildBarCharts(){
	//temporal unit is either Year, Month
	//builds a base bar chart on top of which the filter is displayed
	globals.barcharts.width = $("#year-filter-holder").width() ;//same for both charts
	globals.barcharts.height = $("#yearBarChart").height();
	globals.barcharts.margins = {
		top: 5,
		bottom: 25,
		left: 0,
		right: 0
	}
	//prep the data
	var monthAgg = aggregateByMonth(globals.data.fema);
	var monthData = _.map(monthAgg, function(value, key){
		return {month: key,
		value: +value.length}
	})
	var yearAgg = aggregateByYear(globals.data.fema)
	var yearData = _.map(yearAgg, function(value, key){
		return {year: key,
		value: +value.length}
	})
	//Months
	globals.barcharts.monthBarCanvas = d3.select("#monthBarChart").append('svg')
		.attr('height', globals.barcharts.height + globals.barcharts.margins.top + globals.barcharts.margins.bottom)
		.attr('width', globals.barcharts.width + globals.barcharts.margins.left + globals.barcharts.margins.right)	
	//we will use these later
	globals.barcharts.monthX = d3.scale.ordinal()
    .rangeRoundBands([0, globals.barcharts.width], .1);
    
    globals.barcharts.monthY = d3.scale.linear()
    .range([globals.barcharts.height, 0]);
    
    globals.barcharts.monthxAxis = d3.svg.axis()
    .scale(globals.barcharts.monthX)
    .orient("bottom");

	globals.barcharts.monthyAxis = d3.svg.axis()
	    .scale(globals.barcharts.monthY)
	    .orient("left")
	    .ticks(10);
	
	globals.barcharts.monthX.domain(monthData.map(function(d) { 
		return d.month.toString(); }));
  	globals.barcharts.monthY.domain([0, d3.max(monthData, function(d) {
  		 return +d.value; })]);

  	globals.barcharts.monthBarCanvas.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + globals.barcharts.height + ")")
      .call(globals.barcharts.monthxAxis);
      
      globals.barcharts.monthBarCanvas.append("g")
      .attr("class", "y axis")
      .call(globals.barcharts.monthyAxis)
    // // .append("text")
      // // .attr("transform", "rotate(-90)")
      // // .attr("y", 6)
      // // .attr("dy", ".71em")
      // // .style("text-anchor", "end")
      // // .text("Num Dis");
// 	
// 	
	globals.barcharts.monthBars = globals.barcharts.monthBarCanvas.selectAll(".bar")
      .data(monthData)
    .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d) {
      	return globals.barcharts.monthX(d.month); })
      .attr("width", globals.barcharts.monthX.rangeBand())
      .attr("y", function(d) { return globals.barcharts.monthY(+d.value); })
      .attr("height", function(d) { return globals.barcharts.height - globals.barcharts.monthY(+d.value); })
      .style('fill', 'darkgray')
      
      
      //////////////
      	//Years
	globals.barcharts.yearBarCanvas = d3.select("#yearBarChart").append('svg')
		.attr('height', globals.barcharts.height + globals.barcharts.margins.top + globals.barcharts.margins.bottom)
		.attr('width', globals.barcharts.width + globals.barcharts.margins.left + globals.barcharts.margins.right)
	
	globals.barcharts.yearX = d3.scale.ordinal()
    .rangeRoundBands([0, globals.barcharts.width], .1);
    
    globals.barcharts.yearY = d3.scale.linear()
    .range([globals.barcharts.height, 0]);
    
    globals.barcharts.yearxAxis = d3.svg.axis()
    .scale(globals.barcharts.yearX)
    .orient("bottom")


	globals.barcharts.yearyAxis = d3.svg.axis()
	    .scale(globals.barcharts.yearY)
	    .orient("left")
	
	globals.barcharts.yearX.domain(yearData.map(function(d) { 
		return d.year; }));
  	globals.barcharts.yearY.domain([0, d3.max(yearData, function(d) {
  		 return +d.value; })]);

  	globals.barcharts.yearBarCanvas.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + globals.barcharts.height + ")")
      .call(globals.barcharts.yearxAxis);
      
      globals.barcharts.yearBarCanvas.append("g")
      .attr("class", "y axis")
      .call(globals.barcharts.yearyAxis)
    // // .append("text")
      // // .attr("transform", "rotate(-90)")
      // // .attr("y", 6)
      // // .attr("dy", ".71em")
      // // .style("text-anchor", "end")
      // // .text("Num Dis");
// 	
// 	
	globals.barcharts.yearBars = globals.barcharts.yearBarCanvas.selectAll(".bar")
      .data(yearData)
    .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d) {
      	return globals.barcharts.yearX(d.year); })
      .attr("width", globals.barcharts.yearX.rangeBand())
      .attr("y", function(d) { return globals.barcharts.yearY(+d.value); })
      .attr("height", function(d) { return globals.barcharts.height - globals.barcharts.yearY(+d.value); })
      .style('fill', 'darkgray')

}

function updateBarCharts(data, temporalFilter){
	//this actually just draws a new bar chart over the existing one with the temporal filter applied.  Uses the same scales


	globals.barcharts.yearBarCanvas.selectAll(".update-bar")
		.remove() // clear the old stuff
	
	globals.barcharts.monthBarCanvas.selectAll(".update-bar")
		.remove() // clear the old month stuff

		//prep the data
	var monthAgg = aggregateByMonth(data);
	var monthData = _.map(monthAgg, function(value, key){
		return {month: key,
		value: +value.length}
	})
	var yearAgg = aggregateByYear(data)
	var yearData = _.map(yearAgg, function(value, key){
		return {year: key,
		value: +value.length}
		})
	
	   //tooltips
   //year chart
	 globals.barcharts.yearTip = d3.tip()
	  .attr('class', 'd3-tip')
	  .offset([-10, 0])
	  .html(function(d){
	  	return "<label>" + d.year + ":  </label><span class='text-muted'>" + d.value + "</span>"
	  })
	  
	 // globals.barcharts.yearBarCanvas.call(globals.barcharts.yearTip)//enable the tooltip
	 
	 
	 //month chart 
	 globals.barcharts.monthTip = d3.tip()
	  .attr('class', 'd3-tip')
	  .offset([-10, 0])
	  .html(function(d){
	  	return "<label>" + d.month + ":  </label><span class='text-muted'>" + d.value + "</span>"
	  })
	  
	 // globals.barcharts.yearBarCanvas.call(globals.barcharts.monthTip)//enable the tooltip
	
	//stuff for year bars
	console.log(d3.extent(yearData, function(d){ return +d.year}))
	globals.barcharts.yearBarCanvas.selectAll(".update-bar")
      .data(yearData)
    .enter().append("rect")
      .attr("class", "update-bar")
      .attr("x", function(d) {
      	return globals.barcharts.yearX(d.year); })
      .attr("width", globals.barcharts.yearX.rangeBand())
      .attr("y", function(d) { return globals.barcharts.yearY(+d.value); })
      .attr("height", function(d) { return globals.barcharts.height - globals.barcharts.yearY(+d.value); })
      .style('fill', 'darkred')
      .on('mouseover', globals.barcharts.yearTip.show)
      .on('mouseout', globals.barcharts.yearTip.hide)
	
	
	globals.barcharts.monthBarCanvas.selectAll(".update-bar")
      .data(monthData)
    .enter().append("rect")
      .attr("class", "update-bar")
      .attr("x", function(d) {
      	return globals.barcharts.monthX(d.month); })
      .attr("width", globals.barcharts.monthX.rangeBand())
      .attr("y", function(d) { return globals.barcharts.monthY(+d.value); })
      .attr("height", function(d) { return globals.barcharts.height - globals.barcharts.monthY(+d.value); })
      .style('fill', 'darkred')
      .on('mouseover', globals.barcharts.monthTip.show)
      .on('mouseout', globals.barcharts.monthTip.hide)
   
   
   //tooltips
   //year chart
	 globals.barcharts.yearTip = d3.tip()
	  .attr('class', 'd3-tip')
	  .offset([-10, 0])
	  .html(function(d){
	  	return "<label>" + d.year + "</label><span class='text-muted'>" + d.value + "</span>"
	  });
}

// $(window).resize(function(){
	// onResize();
// });



function setType(t){
	//updates the interface to show a particular type of disaster
		if (t == "All Disasters"){
			t = "All";
		};
		globals.currentTypeFilter = t; // set the filter
		$("#dis-title").text(t)
		//filter
		if (t != "All"){
			newData = filterByType(globals.data.fema, t);
		}else{
			newData = globals.data.fema;
		}
		//apply any existing temporal filtering
		newData = filterByTimeRange(newData, globals.temporalFilter);
		updateMap(globals.mapConfig.geogType, globals.mapConfig.normType, newData, globals.mapConfig.numClasses);		
		globals.filteredData = newData;
		
		//update the display
		//convert to title case
		t = t.substring(0,1).toUpperCase() + t.substring(1, t.length).toLowerCase();
		console.log(t);
		$("#dis-title").text(t)
}



function chooseColorScheme(numClasses){
	//selects the right color array for this number of classes
	index = numClasses - 2; 
	cs = globals.map.colorScheme[index];
	console.log(numClasses);
	return cs;
}

function createBreakdownCharts(data){
	data = aggregateByType(data);
	data = convertAggregateToPercent(data, globals.currentTotal);
	var margin = {top: 20, right: 20, bottom: 100, left: 40};
	var height = 700 - margin.top - margin.bottom; //these are static because they collapse and its annoying-- TODO fix;
	var width = 300 - margin.left - margin.right;
	
	globals.breakdown.canvas = d3.select("#breakdownCharts").append("svg")
		.attr('height', height + margin.top + margin.bottom)
		.attr('width', width + margin.left + margin.bottom)
		.append("g")
    		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	
	var y = d3.scale.linear()
		.range([height, 0])
		.domain([0, 100]);
	
	var yAxis = d3.svg.axis()
	    .scale(y)
	    .orient("left");
	//axis
	globals.breakdown.canvas.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("% of total");
	
	runningY = 0;
	for (var i =0; i < data.length; i++){
		globals.breakdown.canvas.append("rect")
			.attr('height',y(data[i]['percent']))
			.attr('y', runningY)
			.attr('x', 25)
			.attr('width', 100)
			.attr('fill', 'green')
			.attr('stroke', 'white')
			.on('mouseover', function(d){
				
			});
		runningY += data[i]['percent'];
		console.log(runningY)
		
	}
// 	    
	
	
	
}

function populateColorSelect(){
	//create the color swatches in the map options panel
	var table = $("#classTable");
	var rows = table.find('tr');
	console.log(rows);
	for (var i=0; i< globals.map.colorScheme.length; i++){
		var thisRow = rows[i];
		var theseColors = globals.map.colorScheme[i];
		for (var p=0; p<theseColors.length; p++){
			var thisColor = theseColors[p];
			var element = "<td class='swatch' style='background-color:" + thisColor + "'></td>";
			$(thisRow).append(element);
		}
	}
	
}
