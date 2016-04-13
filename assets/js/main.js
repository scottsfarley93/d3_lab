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


var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var monthAbr = ['Jan', "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];


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
	 createBreakdownCharts(globals.data.fema); //build the type and class breakdown canvas
	 updateMap(globals.mapConfig.geogType, globals.mapConfig.normType, globals.data.fema, globals.mapConfig.numClasses);//colors the choropleth map 
}


function configureTimeFilter(temporalFilter){
	//event handler for min and max month sliders
	//and for min and max year sliders
	//called when one of the sliders changes
	//get the values of all of the sliders
	minMonth = months[globals.temporalFilter.minMonth -1];
	maxMonth = months[globals.temporalFilter.maxMonth - 1];
	//show the changes in the interface
	$(".minYearText").text(globals.temporalFilter.minYear);
	$(".maxYearText").text(globals.temporalFilter.maxYear);
	$(".minMonthText").text(minMonth);
	$(".maxMonthText").text(maxMonth);
	
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

function updateMapScale(scale){
		//put the map into a new projection scale
	var width = $("#map-window").width(),
    height = $("#map-window").height();
    globals.map.height = height;
    globals.map.width = width;
	var projection = d3.geo.albersUsa()
	    .scale(scale)
	    .translate([globals.map.width / 2, globals.map.height / 2]);
      path = path.projection(projection);
	    
	//make globals
	globals.map.projection = projection;
	globals.map.path = path;
	globals.map.counties.attr('d', path)
		.attr('stroke', 'red');
	globals.map.states.attr('d', path)
		.attr('stroke', 'blue');
	globals.map.land.attr('d', path)
		.attr('stroke', 'black');
}

function createMap(){
	//draws a blank map
	//set props
	var width = $("#map-window").width(),
    height = $("#map-window").height();
    globals.map.height = height;
    globals.map.width = width;
	
	//get projection ready
	var projection = d3.geo.albersUsa()
	    .scale(1000)
	    .translate([width / 2, height / 2]);
	
	var path = d3.geo.path()
	    .projection(projection);
	    
    
    globals.map.bounds  = path.bounds(globals.map.landPathData);
	globals.map.center = d3.geo.centroid(globals.map.landPathData);
	
	globals.map.map = svg = d3.select("#map-window").append("svg")
	    .attr("width", width)
	    .attr("height", height);
	//make globals
	globals.map.projection = projection;
	globals.map.path = path;
	globals.map.canvas = svg;
	
	//save these so we don't need to do the topojson conversion again.'
	globals.map.countyPathData = topojson.feature(globals.data.counties, globals.data.counties.objects.counties).features;
	globals.map.statePathData = topojson.feature(globals.data.states, globals.data.states.objects.units).features;
	globals.map.landPathData = topojson.mesh(globals.data.counties, globals.data.counties.objects.land);
	drawGeoUnits();
}

function drawGeoUnits(){
	path = globals.map.path;
	projection = globals.map.projection;
	//do the drawing
	globals.map.counties = svg.append("g")
      .attr('class', 'map-unit')
    .selectAll("path")
    .attr("class", "counties")
	      .data(globals.map.countyPathData) // load the counties
	    .enter().append("path")
	      .attr("d", path)
	      .style('fill', 'none')
	      .style('stroke', 'none')
	      .style('stroke-opacity', 0.25)
	  	  .attr('FIPS', function(d){id = checkFIPS(d.id); //make sure it contains the first zero
	  	  		return id;});	 //this is how we know the geographic identifier
	  	  		
	 //load the land
     globals.map.land = svg.append("path")
     .attr('class', 'map-unit')
      .datum(globals.map.landPathData)
      .attr("class", "land")
      .attr("d", path)
      .style('stroke', 'black')
      .style('fill', 'none');
      
      globals.map.states = svg.append("g")
      	.attr('class', 'map-unit')
      	.selectAll('path')
      	 .data(globals.map.statePathData) // load the states
      	 .enter().append('path')
      	 .attr('d', path)
      	 .style('fill', 'none')
      	 .style('stroke', 'none')
      	 .attr('class', 'states');
}

function removeGeoUnits(){
	d3.selectAll(".map-unit").remove();
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
		//don't do anything if we don't find a tip to remove
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
	   .attr('numDis', function(d){
	    	thisID = checkFIPS(d3.select(this).attr('FIPS'));
	    	allIDS.push(thisID);
			lookup = idToValueMap[thisID];
			try{
				thisValue = idToValueMap[thisID].value;
			}catch (err){
				thisValue = 0;
			}
			return thisValue;
	  })
	  .attr('class', 'counties')
	  .attr('fill-opacity', 0.9)
	  .attr('id', function(d){
	  	return 'county_' + d.id;
	  }).on('mouseover', function(d){
	  	el = d3.select(this)
	  	el.moveToFront();
	  	globals.map.tip.show(d);
	  	coordinateHover(d, el, 'map');
	  }).on('mouseout', function(d){
	  	el = d3.select(this);
	  	globals.map.tip.hide();
	  	removeHover(d, el, 'map');
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
		  	html += "<label>Number of Disasters: </label><span class='text-muted tip-info'>" + formatNumber(val) + "</span><br />"
		  	html += "<label>Land Area: </label><span class='text-muted tip-info'>" + formatNumber(round2(details.LandArea)) + " km<sup>2</sup></span><br />"
		  	html += "<label>Population: </label><span class='text-muted tip-info'>" + formatNumber(details.Pop) + "</span><br />"
		 return html
	  });
	  
	  globals.map.canvas.call(globals.map.tip);//enable the tooltip
	} // end counties block
	else if (geographyType == "States"){
		d3.select(".d3-tip").remove();
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
	   }).style('stroke', 'white').style('stroke-weight', 0.25)
	   .attr('numDis', function(d){
	   		 thisID = fixPostalCode(d.id);
	    	allIDS.push(thisID);
			lookup = idToValueMap[thisID];
			try{
				thisValue = idToValueMap[thisID].value;
			}catch (err){
				thisValue = 0;
			}
			return thisValue;
	  })
	  .style('fill-opacity', 0.9)
	  .attr('class', 'states')
	  .attr('id', function(d){
	  	state = fixPostalCode(d.id);
	  	return 'state_' + state;
	  }).on('mouseover', function(d){
	  	el = d3.select(this)
	  	globals.map.tip.show(d);
	  	coordinateHover(d, el, 'map');
	  }).on('mouseout', function(d){
	  	el = d3.select(this);
	  	globals.map.tip.hide();
	  	removeHover(d, el);
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
		  	html += "<label>Number of Disasters: </label><span class='text-muted'>" + formatNumber(round2(val))+ "</span><br />"
		  	html += "<label>Land Area: </label><span class='text-muted'>" + formatNumber(round2(details.Area)) + " km<sup>2</sup></span><br />"
		  	html += "<label>Population: </label><span class='text-muted'>" +formatNumber(round2(details.Pop)) + "</span><br />"
		 return html
	  });
	  
	  globals.map.canvas.call(globals.map.tip);//enable the tooltip
	}//end states block
	
	globals.filteredData = filteredInput
	globals.monthlyAggregate = aggregateByMonth(filteredInput);
	globals.yearlyAggregate = aggregateByYear(filteredInput);
	if (globals.mapConfig.geogType == "States"){
		globals.geogAggregate = aggregateByState(filteredInput);
	}else if (globals.mapConfig.geogType == "Counties"){
		globals.geogAggregate = aggregateByCounty(filteredInput);
	}
	//do other updates
	displayMapTotal(filteredInput);
	displayPercentTotal(filteredInput)
	updateBarCharts(filteredInput, globals.temporalFilter);
	updateBreakdownCharts(filteredInput)
};



function buildBarCharts(){
	//temporal unit is either Year, Month
	//builds a base bar chart on top of which the filter is displayed
	globals.barcharts.width = $("#map-window").width() * 0.25 ;//determine width on page load
	globals.barcharts.height = 200;
	globals.barcharts.margins = {
		top: 25,
		bottom: 50,
		left: 45,
		right: 0
	};
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
		.append('g').attr("transform", "translate(" + globals.barcharts.margins.left + "," + globals.barcharts.margins.top + ")")
		.attr('id', 'monthBarchart')
	//we will use these later
	globals.barcharts.monthX = d3.scale.ordinal()
    .rangeRoundBands([0, globals.barcharts.width], .1);
    
    globals.barcharts.monthY = d3.scale.linear()
    .range([globals.barcharts.height, 0]);
    
    globals.barcharts.monthxAxis = d3.svg.axis()
    .scale(globals.barcharts.monthX)
    .orient("bottom")
    .tickFormat(function(d){
    	return monthAbr[d-1];
    })
    

	globals.barcharts.monthyAxis = d3.svg.axis()
	    .scale(globals.barcharts.monthY)
	    .orient("left");
	    

	
	globals.barcharts.monthX.domain(monthData.map(function(d) { 
		return d.month.toString(); }));
  	globals.barcharts.monthY.domain([0, d3.max(monthData, function(d) {
  		 return +d.value; })]);

  	globals.barcharts.monthBarCanvas.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + globals.barcharts.height + ")")
      .call(globals.barcharts.monthxAxis)
        .selectAll("text")
		    .attr("y", 0)
		    .attr("x", 9)
		    .attr("dy", ".35em")
		    .attr("transform", "rotate(90)")
		    .style("text-anchor", "start");
      
      globals.barcharts.monthBarCanvas.append("g")
      .attr("class", "y axis")
      .call(globals.barcharts.monthyAxis);
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
      .attr('class', function(d){
      	return d.month + 1;//they are one indexed
      });
      
      
      //////////////
      	//Years
	globals.barcharts.yearBarCanvas = d3.select("#yearBarChart").append('svg')
		.attr('height', globals.barcharts.height + globals.barcharts.margins.top + globals.barcharts.margins.bottom)
		.attr('width', globals.barcharts.width + globals.barcharts.margins.left + globals.barcharts.margins.right)
		.append('g').attr("transform", "translate(" + globals.barcharts.margins.left + "," + globals.barcharts.margins.top + ")")
		.attr('id', 'yearBarchart');
	
	globals.barcharts.yearX = d3.scale.ordinal()
    .rangeRoundBands([0, globals.barcharts.width], .1);
    
    globals.barcharts.yearY = d3.scale.linear()
    .range([globals.barcharts.height, 0]);
    
    globals.barcharts.yearxAxis = d3.svg.axis()
    .scale(globals.barcharts.yearX)
    .orient("bottom")
    .tickValues([1970, 1980, 1990, 2000, 2010])


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
      .attr('class', function(d){
      	return d.year;
      });

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
	  	return "<label>" + d.year + ":  </label><span class='text-muted tip-info'>" + formatNumber(d.value) + "</span>"
	  });
	  
	 globals.barcharts.yearBarCanvas.call(globals.barcharts.yearTip)//enable the tooltip
	 
	 
	 //month chart 
	 globals.barcharts.monthTip = d3.tip()
	  .attr('class', 'd3-tip')
	  .offset([-10, 0])
	  .html(function(d){
	  	return "<label>" + months[d.month-1] + ":  </label><span class='text-muted tip-info'>" + formatNumber(d.value) + "</span>"
	  });
	  
	 globals.barcharts.yearBarCanvas.call(globals.barcharts.monthTip)//enable the tooltip
	
	//stuff for year bars
	globals.barcharts.yearBarCanvas.selectAll(".update-bar")
      .data(yearData)
    .enter().append("rect")
      .attr("class", "update-bar")
      .attr('id', function(d){
      	return "year_" + d.year;
      })
      .style('fill-opacity', 0.9)
      .attr("x", function(d) {
      	return globals.barcharts.yearX(d.year); })
      .attr("width", globals.barcharts.yearX.rangeBand())
      .attr("y", function(d) { return globals.barcharts.yearY(+d.value); })
      .attr("height", function(d) { return globals.barcharts.height - globals.barcharts.yearY(+d.value); })
      .style('fill', '#8c2d04')
      .on('mouseover', function(d){
      	globals.barcharts.yearTip.show(d)
      	coordinateHover(d, d3.select(this), 'years');
      })
      .on('mouseout', function(d){
      	globals.barcharts.yearTip.hide()
      	removeHover(d, d3.select(this));
      });
	
	
	globals.barcharts.monthBarCanvas.selectAll(".update-bar")
      .data(monthData)
    .enter().append("rect")
      .attr("class", "update-bar")
      .attr('id', function(d){
      	return "month_" + d.month;
      })
      .style('fill-opacity', 0.9)
      .attr("x", function(d) {
      	return globals.barcharts.monthX(d.month); })
      .attr("width", globals.barcharts.monthX.rangeBand())
      .attr("y", function(d) { return globals.barcharts.monthY(+d.value); })
      .attr("height", function(d) { return globals.barcharts.height - globals.barcharts.monthY(+d.value); })
      .style('fill', '#8c2d04')
      .on('mouseover', function(d){
      	globals.barcharts.monthTip.show(d)
      	coordinateHover(d, d3.select(this), 'months');
      })
      .on('mouseout', function(d){
      	globals.barcharts.monthTip.hide()
      	removeHover(d, d3.select(this));
      });
}




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
		$("#dis-title").text(t)
}



function chooseColorScheme(numClasses){
	//selects the right color array for this number of classes
	index = numClasses - 2; 
	cs = globals.map.colorScheme[index];
	return cs;
}

function createBreakdownCharts(){
	var margin = {top: 30, right: 20, bottom: 100, left: 40};
	var height = 700 - margin.top - margin.bottom; //these are static because they collapse and its annoying-- TODO fix;
	var width = 300 - margin.left - margin.right;
	
	globals.breakdown.canvas = d3.select("#breakdownCharts").append("svg")
		.attr('height', height + margin.top + margin.bottom)
		.attr('width', width + margin.left + margin.bottom)
		.append("g")
    		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	
	var y = d3.scale.linear()
		.range([height, 0])
		.domain([100, 0]);
	
	var yAxis = d3.svg.axis()
	    .scale(y)
	    .orient("left");
	//axis
	globals.breakdown.canvas.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .append("text")
		      .attr("transform", "rotate(-90 5," + y(100) + ")")
		      .attr("y", y(100))
		      .attr('x', 5)
		      .attr("dy", ".71em")
		      .style("text-anchor", "begin")
		      .text("% of Total");
	globals.breakdown.y = y;
	
	globals.breakdown.typeColors = d3.scale.category20();
}

function updateBreakdownCharts(data){
	//for the map class chart
	classData = aggregateByMapClass(data, globals.map.colorScheme);
	//for the tpye chart
	data = aggregateByType(data);
	data = convertAggregateToPercent(data, globals.currentTotal);
	
	globals.breakdown.canvas.selectAll('.svg-title').remove(); //get rid of the titles
	globals.breakdown.canvas.selectAll('.breakdown').remove(); //get rid of the titles
	
	globals.breakdown.typeBars = globals.breakdown.canvas.selectAll(".type-bars")
		.data(data)
		.enter()
			.append('rect')
			.attr('class', 'type-bars')
			.attr('class', 'breakdown')
			.attr('x', 25)
			.attr('y', function(d){
				return globals.breakdown.y(d.offset);
			})
			.attr('height', function(d){
				return globals.breakdown.y(d.percent);
			})
			.attr('width', 100)
			.style('fill', function(d){
				col = globals.breakdown.typeColors(d.type);
				return col})
	globals.breakdown.canvas.append("text")
		.attr('x', 150/2)
		.attr('y', -10)
		.text("Disaster Type")
		.style('text-anchor', 'middle')
		.style('font-family', 'sans-serif')
		.style('font-size', '16px')
		.attr('class', 'svg-title');
	
	 globals.breakdown.typeTip = d3.tip()
	  .attr('class', 'd3-tip')
	  .offset([-10, 0])
	  .html(function(d){
	  	return "<label>" + d.type + ":  </label><span class='text-muted tip-info'>" + round2(d.percent) + "%</span>"
	  });
	  
	  globals.breakdown.canvas.call(globals.breakdown.typeTip);
	  globals.breakdown.typeBars.on('mouseover', function(d){
				d3.select(this).attr('stroke', 'white');
				globals.breakdown.typeTip.show(d);
			}).on('mouseout', function(d){
				globals.breakdown.typeTip.hide();
				d3.select(this).attr('stroke', 'none')
			});
	
		
	globals.breakdown.classBars = globals.breakdown.canvas.selectAll(".class-bars")
		.data(classData)
		.enter()
			.append('rect')
			.attr('class', 'class-bars')
			.attr('class', 'breakdown')
			.attr('x', 175)
			.attr('y', function(d){
				return globals.breakdown.y(d.offset);
			})
			.attr('height', function(d){
				return globals.breakdown.y(d.percent);
			})
			.attr('width', 100)
			.style('fill', function(d){
				return d.color;
			});
	globals.breakdown.canvas.append("text")
		.attr('x', 225)
		.attr('y', -10)
		.text("Map Class")
		.style('text-anchor', 'middle')
		.style('font-family', 'sans-serif')
		.style('font-size', '16px')
		.attr('class', 'svg-title');
	
	globals.breakdown.classTip = d3.tip()
	  .attr('class', 'd3-tip')
	  .offset([-10, 0])
	  .html(function(d){
	  	scheme = globals.map.colorScheme[globals.mapConfig.numClasses];
	  	html = "<label>Class: </label><span class='text-muted tip-info'>" + d.position + "</span><br />";
	  	html += "<label>Minimum Value: </label><span class='text-muted tip-info'>" + d.classMin + "</span><br />";
	  	html += "<label>MaximumValue Value: </label><span class='text-muted tip-info'>" + d.classMax + "</span><br />";
	  	html += "<label>Percent of Map Units: </label><span class='text-muted tip-info'>" + round2(d.percent)  + "%</span><br />";
	  	if (+d.classMin != -1){
	  		return html;
	  	}else{
	  		return "Unclassified";
	  	} 
	  	
	  });
	  
	  globals.breakdown.canvas.call(globals.breakdown.classTip);
	  globals.breakdown.classBars.on('mouseover', function(d){
				d3.select(this).attr('stroke', 'white');
				thisFill = d3.select(this).attr('fill');
				globals.breakdown.classTip.show(d);
			}).on('mouseout', function(d){
				globals.breakdown.classTip.hide();
				d3.select(this).attr('stroke', 'none');
			});

}

function populateColorSelect(){
	//create the color swatches in the map options panel
	var table = $("#classTable");
	var rows = table.find('tr');
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

function coordinateHover(d, el, origin){
	el.style({
		'stroke': 'black',
		'stroke-opacity':1,
		'stroke-width': 2,
		'fill-opacity': 1
	});
	el.moveToFront();
	if (origin == 'map'){
		//we need to style the bars
		if (globals.mapConfig.geogType == "States"){
			geogArray = globals.geogAggregate[d.state];
		}else if (globals.mapConfig.geogType == "Counties"){
			geogArray = globals.geogAggregate[checkFIPS(d.id)];
		}
		if (geogArray){
			for (var i=0; i< geogArray.length; i++){
				thisDisaster = geogArray[i];
				year = thisDisaster.StartYear;
				month = thisDisaster.StartMonth;
				thesebars = d3.selectAll("#year_" + year)
					.style('stroke', '#262626')
					.style('stroke-opacity', 1)
					.style('stroke-width', 1.5)
					.style('fill-opacity', 1);
				d3.selectAll("#month_" + month)
						.style('stroke', '#262626')
						.style('stroke-opacity', 1)
						.style('stroke-width', 1.5)
						.style('fill-opacity', 1);
			}
		}else{
			console.log("Error: Failed to find geography array. Aborting interaction.");
			return;
		}//end if geog array
	}else{
		//event originated from the bars so highlight the map only
		if (origin == "months"){
			//get disasters that occurred during this month
			disasterList = globals.monthlyAggregate[d.month];
			for (var i=0; i< disasterList.length; i++){
				thisDisaster = disasterList[i];
				highlightMap(thisDisaster);
			}
		}else {
			//temporal is years
			disasterList = globals.yearlyAggregate[d.year];
			for (var i=0; i<disasterList.length; i++){
				thisDisaster = disasterList[i];
				highlightMap(thisDisaster);
			}
		}
	}
}

function highlightMap(thisDisaster){
	if (globals.mapConfig.geogType == "States"){
		thisState = thisDisaster['State'];
		d3.select("#state_" + thisState)
			.style('stroke', '#262626')
			.style('stroke-width', 1.5)
			.style('stroke-opacity', 1)
			.style('fill-opacity', 1).moveToFront();
	}else if (globals.mapConfig.geogType == "Counties"){
		thisCounty = thisDisaster['FIPSCode'];
		
		d3.select("#county_" + thisCounty)
			.style('stroke', '#262626')
			.style('stroke-width', 1)
			.style('stroke-opacity', 1)
			.style('fill-opacity', 1).moveToFront();
	}
}


function removeHover(d, el){
	d3.selectAll(".counties")
		.style("stroke", 'white')
		.style("stroke-opacity", 0.25)
		.style("stroke-width", 0.25)
		.style('fill-opacity', 0.9);
	d3.selectAll(".update-bar")
		.style("stroke", 'white')
		.style('stroke-opacity', 0.25)
		.style('stroke-width', 0.25)
		.style('fill-opacity', 0.9);
	d3.selectAll(".states")
		.style("stroke", 'white')
		.style("stroke-opacity", 0.25)
		.style("stroke-width", 0.25)
		.style('fill-opacity', 0.9);
}


