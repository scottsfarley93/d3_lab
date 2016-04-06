/**
 * @author Scott Farley
 */
//dependencies:
//	jQuery
//  d3.js
// underscore.js
// date.js

//TODO:
//automatic scale calculation
//normalize on States
//display states
//pie chart for states
//bar chart for months
//bar chart for years
//popup over map


var globals = {};
globals.data = {};
globals.disasterTypes = []; // a list of all of the types of disasters contained within the dataset
globals.filesLoaded = 0; // keeps track of how many ajax files have been loaded to this point in the session.


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

globals.pie = {};//pie chart stuff
globals.statesPie = {} //states pie chart stuff
globals.currentTotal = 0; //total number of disasters with current filters;
globals.mapConfig = {};
globals.mapConfig.geogType = 'Counties';
globals.mapConfig.normType = "None";
globals.mapConfig.inputData = []


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
	globals.allDisasterTypes = getAllDisasterTypes(globals.data.fema);
	 populateTypeSelect(); //creates the type selection dropdown menu
	 createMap(); // creates the map
	 buildTypePieChart(calculatePieChartComp(aggregateByType(globals.data.fema))); //builds a pie chart of the composition by type
	 buildStatesPieChart(calculatePieChartComp(aggregateByState(globals.data.fema)));//builds a pie chart of the composition by states
	 //set up the map with the default config
	 globals.mapConfig.inputData = globals.data.fema;
	 buildBarCharts();//these are the filter charts
	 updateMap(globals.mapConfig.geogType, globals.mapConfig.normType, globals.data.fema);//colors the choropleth map 
}

function populateTypeSelect(){
	//this function loads the select widget in the UI
	//could add a sort here?
	$("#typeSelect").append("<option>All Disasters</option>");
	dTypes =globals.allDisasterTypes;
	for (var i=0; i< dTypes.length; i++){
		opt = "<option>" + dTypes[i] + "</option>";
		$("#typeSelect").append(opt);
	}
	//add event listeners for optgroup change
	$("#typeSelect").change(function(){
		var option =  this.options[this.selectedIndex];
		optionText = $(option).text();
		if (optionText == "All Disasters"){
			optionText = "All";
		};
		globals.currentTypeFilter = optionText; // set the filter
		//filter
		if (optionText != "All"){
			newData = filterByType(globals.data.fema, optionText);
				
		}else{
			newData = globals.data.fema;
		}
		//apply any existing temporal filtering
		newData = filterByTimeRange(newData, globals.temporalFilter);
		updateMap(globals.mapConfig.geogType, globals.mapConfig.normType, newData);		
		globals.filteredData = newData;
		 
	});
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
	updateMap(globals.mapConfig.geogType, globals.mapConfig.normType, newData);
	globals.filteredData = newData;
}

//event listeners for the temporal filters
$("#monthSliderMin").change(configureTimeFilter);
$("#monthSliderMax").change(configureTimeFilter);
$("#yearSliderMin").change(configureTimeFilter);
$("#yearSliderMax").change(configureTimeFilter);

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
			if (globals.filesLoaded == 4){
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
			if (globals.filesLoaded == 4){
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
			if (globals.filesLoaded == 4){
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
			console.log("Loaded state metadata.");
			globals.filesLoaded += 1;
			$("#filesLoaded").text(globals.filesLoaded);
			globals.data.mapData = response;//this is the topojson
			//check if the file has been loaded
			if (globals.filesLoaded == 4){
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
	var width = $("#map").width(),
    height = $("#map").height();
	
	//get projection ready
	var projection = d3.geo.albersUsa()
	    .scale(1000)
	    .translate([width / 2, height / 2]);
	
	var path = d3.geo.path()
	    .projection(projection);
	
	globals.map.map = svg = d3.select("#map").append("svg")
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
	      .data(topojson.feature(globals.data.mapData, globals.data.mapData.objects.counties).features)
	    .enter().append("path")
	      .attr("d", path)
	      .style('fill', 'white')
	      .style('stroke', 'black')
	      .style('stroke-opacity', 0.25)
	  	  .attr('FIPS', function(d){id = checkFIPS(d.id); //make sure it contains the first zero
	  	  		return id;});	 //this is how we know the geographic identifier
     globals.map.states = svg.append("path")
      .datum(topojson.mesh(globals.data.mapData, globals.data.mapData.objects.states, function(a, b) { return a !== b; }))
      .attr("class", "states")
      .attr("d", path)
      .style('fill', 'none')
      .style('stroke', 'black');
      
      

     
     globals.map.counties.on('click', function(){
     	thisFips = d3.select(this).attr('FIPS');
     	metadata = globals.data.countyMetadata[thisFips];
     	//styling
     	d3.select(this).style('fill', 'red');
     });
     ///TODO:Additional map events should go here
}


function createColorScale(data){
	    var colorClasses = [ // the colors
        "#ffffff",
        "#c1a19c",
        "#a2726b",
        "#83423a",
        "#651409"
    ];
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

function updateMap(geographyType, normalizationType, filteredInput){
	//accepts a geography type of 'Counties' or 'States' and an array of input filtered in the desired way
	//accepts a normalization type of 'Pop', 'Area', or 'None'
	//function aggreages to the desired geography and then sets the choropleth colors
	//returns nothing
	//different breakpoints on the color scale
	//States isn't working yet
	 if(geographyType == 'Counties'){
		toMap = aggregateByCounty(filteredInput);
		globals.map.aggregateData = toMap;
		if (normalizationType == "Area"){
			toMap = normalize("Counties", "Area", toMap);
		}else if (normalizationType == "None"){
			toMap = normalize("Counties", "None", toMap);
		}
		idToValueMap = {};
		
		globals.map.colorScale = createColorScale(toMap);
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
		  	html = "<h6 class='page-header'>" + details.Geography + "</h6><br />"
		  	html += "<label>Land Area: </label><span class='text-muted'>" + details.LandArea + " km<sup>2</sup></span><br />"
		  	html += "<label>Population: </label><span class='text-muted'>" + details.Pop + "</span><br />"
		  	html += "<label>Number of Disasters: </label><span class='text-muted'>" + val+ "</span><br />"
		  	html += "<label>Percent of National Total: </label><span class='text-muted'>" + val/globals.currentTotal * 100+ "</span><br />"
		 return html
	  	
	  })
	  
	  globals.map.canvas.call(globals.map.tip)//enable the tooltip
	  
	  globals.map.counties.on('mouseover', globals.map.tip.show)
	  globals.map.counties.on('mouseout', globals.map.tip.hide)
	   
	} // end counties block
	else if (geographyType == "States"){
		return 
	}
	
	globals.filteredData = filteredInput
	//do other updates
	displayMapTotal(filteredInput);
	displayPercentTotal(filteredInput)
	updateTypePieChart();
	updateStatesPieChart();
	updateBarCharts(filteredInput, globals.temporalFilter);
};

//build the pie chart showing composition
function buildTypePieChart(data){
	//build the chart
	globals.pie.height = $("#typeChartHolder").height();
	globals.pie.width = $("#typeChartHolder").width();
	globals.pie.radius = Math.min(globals.pie.width, globals.pie.height) / 2;
	globals.pie.colorScale = d3.scale.category20();
    
    globals.pie.arc = d3.svg.arc()
    .outerRadius(globals.pie.radius - 10)
    .innerRadius(0);
    
    // globals.pie.labelArc = d3.svg.arc()
    // .outerRadius(globals.pie.radius - 40)
    // .innerRadius(globals.pie.radius - 40);
//     
   globals.pie.pie = d3.layout.pie()
    .sort(function(d){return d.Value})
    .value(function(d) { return d.Value; });
      
   d3.selectAll(".temporalSlider")
      .on("change", function(){
      	updateTypePieChart();
      });
  
  globals.pie.svg = d3.select("#typeChartHolder").append("svg")
    .attr("width", globals.pie.width)
    .attr("height", globals.pie.height)
  .append("g")
    .attr("transform", "translate(" + globals.pie.width / 2 + "," + globals.pie.height / 2 + ")");
}



function updateTypePieChart(){
	// //update the pie chart with new data  
	inputData = globals.filteredData
	data = calculatePieChartComp(aggregateByType(inputData)) // this will have been updated by the event listeners  
	globals.pie.svg.selectAll(".arc")
		.remove()
   globals.pie.path = globals.pie.svg.selectAll(".arc")
      .data(globals.pie.pie(data))
    .enter().append("g")
      .attr("class", "arc")
      .attr('type', function(d){
      	return d.data.Category
      })
      .attr('dataValue', function(d){
      	return d.data.Value
      });
      
    globals.pie.path.append("path")
      .attr("d", globals.pie.arc)
      .style("fill", function(d) { 
      	color = globals.pie.colorScale(d.data.Category)
      	return color; });

  // globals.pie.path.append("text")
      // .attr("transform", function(d) { return "translate(" + globals.pie.labelArc.centroid(d) + ")"; })
      // .attr("dy", ".35em")
      // .text(function(d) { return d.data.Type; });
   
	 //here is the tooltip for this item
	 globals.pie.tip = d3.tip()
	  .attr('class', 'd3-tip')
	  .offset([-10, 0])


 //event listeners
	globals.pie.svg.call(globals.pie.tip)//enable the tooltip
      
 globals.pie.path.on('mouseover', function(){
 	var slice = d3.select(this);
 	slice.attr('stroke', 'white');
 	var disType = slice.attr('type');
 	var disVal = slice.attr('dataValue');
 	if (globals.currentTotal != 0){//catch div!/0 errors
 		var disPct = Math.round((disVal / globals.currentTotal) * 100); //percent of total
 	}
 	else{
 		var disPct = 0;
 	}
 	var txt = "<label>" + disType + ":  </label><span>" + disVal + "   </span><span class='text-muted'>(" + disPct + "%)</span>";
 	globals.pie.tip.html(txt);
 	globals.pie.tip.show()
 });
 globals.pie.path.on('mouseout', function(){
 	d3.select(this).attr('stroke', 'none') // clear the formatting
 	globals.pie.tip.hide();
 });
 globals.pie.path.on('click', function(){
 	 	globals.pie.tip.hide();
 	type = d3.select(this).attr('type');
 	setType(type);
 });
 

 
}

function buildBarCharts(){
	//temporal unit is either Year, Month
	//builds a base bar chart on top of which the filter is displayed
	globals.barcharts.width = $("#yearBarChart").width() ;//same for both charts
	globals.barcharts.height = $("#yearBarChart").height() * .8;
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
	  
	  globals.barcharts.yearBarCanvas.call(globals.barcharts.yearTip)//enable the tooltip
	 
	 
	 //month chart 
	 globals.barcharts.monthTip = d3.tip()
	  .attr('class', 'd3-tip')
	  .offset([-10, 0])
	  .html(function(d){
	  	return "<label>" + d.month + ":  </label><span class='text-muted'>" + d.value + "</span>"
	  })
	  
	  globals.barcharts.yearBarCanvas.call(globals.barcharts.monthTip)//enable the tooltip
	
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
 //event listeners
}

/// Handle window resize
function onResize(){
	//on document resize
	clearMap();
	createMap();
	updateMap(globals.mapConfig.geogType, globals.mapConfig.normType, globals.filteredData);	
}
$(window).resize(function(){
	onResize();
});



//build the pie chart showing composition
function buildStatesPieChart(data){
	//build the chart
	globals.statesPie.height = $("#stateChartHolder").height();
	globals.statesPie.width = $("#stateChartHolder").width();
	globals.statesPie.radius = Math.min(globals.pie.width, globals.pie.height) / 2;
	globals.statesPie.colorScale = d3.scale.category20();
    
    globals.statesPie.arc = d3.svg.arc()
    .outerRadius(globals.pie.radius - 10)
    .innerRadius(0);
    
    // globals.pie.labelArc = d3.svg.arc()
    // .outerRadius(globals.pie.radius - 40)
    // .innerRadius(globals.pie.radius - 40);
//     
   globals.statesPie.pie = d3.layout.pie()
    .sort(function(d){return d.Value})
    .value(function(d) { return d.Value; });
      
   d3.selectAll(".temporalSlider")
      .on("change", function(){
      	updateStatesPieChart();
      });
  
  globals.statesPie.svg = d3.select("#stateChartHolder").append("svg")
    .attr("width", globals.statesPie.width)
    .attr("height", globals.statesPie.height)
  .append("g")
    .attr("transform", "translate(" + globals.statesPie.width / 2 + "," + globals.statesPie.height / 2 + ")");
}



function updateStatesPieChart(){
	// //update the pie chart with new data  
	inputData = globals.filteredData
	data = calculatePieChartComp(aggregateByState(inputData)) // this will have been updated by the event listeners  
	globals.statesPie.svg.selectAll(".arc")
		.remove()
   globals.statesPie.path = globals.statesPie.svg.selectAll(".arc")
      .data(globals.statesPie.pie(data))
    .enter().append("g")
      .attr("class", "arc")
      .attr('type', function(d){
      	return d.data.Category
      })
      .attr('dataValue', function(d){
      	return d.data.Value
      });
      
    globals.statesPie.path.append("path")
      .attr("d", globals.pie.arc)
      .style("fill", function(d) { 
      	color = globals.statesPie.colorScale(d.data.Category)
      	return color; });

  // globals.pie.path.append("text")
      // .attr("transform", function(d) { return "translate(" + globals.pie.labelArc.centroid(d) + ")"; })
      // .attr("dy", ".35em")
      // .text(function(d) { return d.data.Type; });
   
	 //here is the tooltip for this item
	 globals.statesPie.tip = d3.tip()
	  .attr('class', 'd3-tip')
	  .offset([-10, 0])


 //event listeners
	globals.statesPie.svg.call(globals.statesPie.tip)//enable the tooltip
      
 globals.statesPie.path.on('mouseover', function(){
 	var slice = d3.select(this);
 	slice.attr('stroke', 'white');
 	var disType = slice.attr('type');
 	var disVal = slice.attr('dataValue');
 	if (globals.currentTotal != 0){//catch div!/0 errors
 		var disPct = Math.round((disVal / globals.currentTotal) * 100); //percent of total
 	}
 	else{
 		var disPct = 0;
 	}
 	var txt = "<label>" + disType + ":  </label><span>" + disVal + "   </span><span class='text-muted'>(" + disPct + "%)</span>";
 	globals.statesPie.tip.html(txt);
 	globals.statesPie.tip.show()
 });
 globals.statesPie.path.on('mouseout', function(){
 	d3.select(this).attr('stroke', 'none') // clear the formatting
 	globals.statesPie.tip.hide()
 });
 

 
}



//change normalization type in GUI
$("input[name=normType]").on('change', function(){
	globals.mapConfig.normType = $(this).val()
	updateMap(globals.mapConfig.geogType, globals.mapConfig.normType, globals.filteredData);
});

//click handlers for the disaster selection box
$('.dis-btn').click(function(){
	t = $(this).data('type');
	setType(t);
});

function setType(t){
		if (t == "All Disasters"){
			t = "All";
		};
		globals.currentTypeFilter = t; // set the filter
		//filter
		if (t != "All"){
			newData = filterByType(globals.data.fema, t);
		}else{
			newData = globals.data.fema;
		}
		//apply any existing temporal filtering
		newData = filterByTimeRange(newData, globals.temporalFilter);
		updateMap(globals.mapConfig.geogType, globals.mapConfig.normType, newData);		
		globals.filteredData = newData;
		
		//update the display
		//convert to title case
		t = t.substring(0,1).toUpperCase() + t.substring(1, t.length).toLowerCase();
		$("#dis-title").text(t)
}

