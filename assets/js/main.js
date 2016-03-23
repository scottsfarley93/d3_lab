/**
 * @author Scott Farley
 */
//dependencies:
//	jQuery
//  d3.js
// underscore.js
// date.js



var globals = {};
globals.data = {};
globals.disasterTypes = []; // a list of all of the types of disasters contained within the dataset
globals.filesLoaded = 0; // keeps track of how many ajax files have been loaded to this point in the session.


globals.activeData = []; // this is the raw fema data 
globals.currentTypeFilter = "All"; //keeps track of any type filter that has been applied;
globals.filteredData; //this is the data that has the current filter applied
globals.map = {} //central choropleth related information
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

/////-----Important action functions ----////////
$(document).ready(function(){
	//use this to make sure that all files have been loaded into the platform
	$(document).bind('filesLoaded', function(){
		console.log("Bind function run");
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
	 buildPieChart(calculatePieChartComp(globals.data.fema)); //builds a pie chart of the composition by type
	 updateMap("Counties", "None", globals.data.fema);//colors the choropleth map 
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
		console.log(optionText);
		//filter
		if (optionText != "All"){
			newData = filterByType(globals.data.fema, optionText);
				
		}else{
			newData = globals.data.fema;
		}
		//apply any existing temporal filtering
		newData = filterByTimeRange(newData, globals.temporalFilter);
		updateMap("Counties", "Pop", newData);		
		globals.filteredData = newData;
		 
	});
}

function configureTimeFilter(){
	//event handler for min and max month sliders
	//and for min and max year sliders
	//called when one of the sliders changes
	console.log("Got to configureTime")
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
	updateMap("Counties", "Pop", newData);
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
		beforeSend: function(){
			console.log("Loading fema data.");
		},
		success: function(response){
			console.log("Done loading fema data.");
			globals.filesLoaded += 1;
			$("#filesLoaded").text(globals.filesLoaded);
			globals.data.fema = response['data']; //this is the raw response in case we fuck up later and don't want to load it again
			_.each(globals.data.fema, function(value, key, list){
				value['FIPSCode'] = checkFIPS(value.FIPSCode)
			});
			globals.filteredData = globals.data.fema;
			
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
		beforeSend: function(){
			console.log("Loading county level metadata.");
		},
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
		beforeSend: function(){
			console.log("Loading state level metadata.");
		},
		success: function(response){
			console.log("Loaded state metadata.");
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
		beforeSend: function(){
			console.log("Loading state level metadata.");
		},
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
		},
		beforeSend: function(){
			console.log(this.url);
		}
	});	 
}
///////////UTILITY FUNCTIONS///////////////
//basic utils
function getCountyDetails(fips){
	//returns a metadata object by looking up the fips value in the metadata set 
	//returns an object with keys ['StateCode', "Pop", "LandArea", "FIPS", "Geography"]
	fips = fips.toString();
	data = globals.data.countyMetadata;
	data = data[fips]
	return data;
}
function resetTemporalFilter(){
	globals.temporalFilter = {
		minYear: 1960,
		maxYear: 2016,
		minMonth: 1,
		maxMonth: 12, 
	};
}

function resetTypeFilter(){
	globals.currentTypeFilter = "All";
}

function getStateDetails(stateCode){
	//returns a metadata object by looking up the state code in the state metadata set
	//returns an object with keys ["state", "FIPS", "Pop", "Area"]
	data = globals.data.stateMetadata[stateCode];
	return data;
}

function getAllDisasterTypes(inputData){
	//gets all of unique types in an input data array
	t = _.pluck(inputData, 'incidentType');
	t = _.uniq(t);
	return t;
}

function checkFIPS(fips){
	//adds a preceeding zero if the given fips is only four digits long, otherwise returns the input fips
	fips = fips.toString();
	if (fips.length == 4){
		fips = "0" + fips
	}
	return fips;
}


function getRandomColor() { //for debug
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

//these functions get a unique array of different properties we might like to know about
function getAllStates(inputData){
	states = _.pluck(inputData, 'State');
	states = _.uniq(states);
	return states;
}
function getAllCounties(inputData){
	counties = _.pluck(inputData, "FIPSCode");
	counties = _.uniq(counties);
	return counties;
}
function getAllYears(inputData){
	years = _.pluck(inputData, "StartYear");
	years = _.uniq(years);
	return years;
}
function getAllMonths(inputData){
	months = _.pluck(inputData, "StartMonth");
	months = _.uniq(months);
	return months;
}

function sumOverData(inputData, numericField){
	//returns the total number of values within a list of data
	s = 0;
	_.map(inputData, function(item){
		val = item['numericField'];
		s += val;
	});
	return val;
}


//FILTER CONTROLS
function filterByState(inputData, stateCode){
	//returns an array of data containing records that only occur in the given input state --> input is a data array and a two letter state code
	f = _.where(inputData, {State : stateCode});
	return f;
}
function filterByCounty(inputData, fips){
	//returns an array of data containing records that only occur in the given county --> input is a data array and a fips code
	f = _.where(inputData, {FIPSCode: fips});
	return f;
}
function filterByYear(inputData, year){
	//returns an array of data containing records that only occur in the given year --> input is a a data array and a four digit year
	f = _.where(inputData, {'StartYear': year});
}
function filterByType(inputData, type){
	//returns an array of data containing records of a given type --> input is a data array and a string referencing a distaster type
	f = _.where(inputData, {incidentType: type});
	return f
}
function filterByTimeRange(inputData, temporalFilter){
	//returns an array of data containing records whose startYears fall between the minYear and maxYear input parameters 
	minYear = temporalFilter.minYear;
	maxYear = temporalFilter.maxYear;
	minMonth = temporalFilter.minMonth;
	maxMonth = temporalFilter.maxMonth;
	
	f = _.filter(inputData, function(item){
		if ((+item['StartYear'] >= +minYear) && (+item['StartYear'] <= +maxYear) && (+item['StartMonth'] >= +minMonth) && (+item['StartMonth'] <= +maxMonth)){
			return true;
		}
	});
	return f;
}

//AGGREGATE CONTROLS
function aggregateByType(inputData){
	//returns an object with {type: count} pairs for all disaster types in the input dataset --> input is an array, output is an object
	a = _.groupBy(inputData, function(item){
		return item['incidentType'];
	});
	return a;
}
function aggregateByYear(inputData){
	//returns an object with {year:count} pairs for all years in the input dataset--> input is an array, output is an object
	//aggregates by start year, so if the disaster spans multiple years, only the start year counts
	a = _.groupBy(inputData, function(item){
		return item['StartYear'];
	});
	return a;
}

function aggregateByState(inputData){
	//returns an object with {state:count} pairs for all states in the input dataset--> input is an array, output is an object
	a = _.groupBy(inputData, function(item){
		return item['State'];
	});
	return a;
}
function aggregateByCounty(inputData){
	//returns an object with {county: county} pairs for all counties in the input dataset--> input is an array, output is an object
	a = _.groupBy(inputData, function(item){
		return item['FIPSCode'];
	});
	return a;
}

//display functions

function calculatePieChartComp(inputData, weights){
	//input data should be an filtered Data array
	numTotal = inputData.length;
	agg = aggregateByType(inputData);
	pie = [];
	aggNum = _.each(agg, function(value, key, list){
		pie.push({Type: key, Value: list[key].length});
	});
	return pie;
}
function displayMapTotal(input){
	//displays the total number of disasters on the map at this point in time
	//map always shows filteredData
	 l = input.length;
	$("#currentNumDisasters").text(l);
}

//NORMALIZATION controls
function normalize(geographyType, normalizationType, inputObject){
	//returns an array of data values with a {'State' : NormalizedCount} value pairs
	//for use with aggregated state and county data
	//input should be an object of type {{"State" : "RawCount"}...} as returned by aggregateByState() or aggregateByCounty()
	keys = _.keys(globals.data.countyMetadata);
	n = _.map(inputObject, function(value, key){
		//get the land area
		numDis = value.length;
		geog = checkFIPS(key.toString());
		i = keys.indexOf(geog) 
		out = {};
		out['geography'] = geog;
		out['normType'] = "Check";
		if (i == -1){
			out['value'] = -1
		}else{
			out['value'] = numDis;
		}
		return out
	});
	return n;
}


//MAP CONTROLS

function createMap(){
	//draws a blank map
	//set props
	var width = 960,
    height = 600;
	
	//get projection ready
	var projection = d3.geo.albersUsa()
	    .scale(1280)
	    .translate([width / 2, height / 2]);
	
	var path = d3.geo.path()
	    .projection(projection);
	
	globals.map.map = svg = d3.select("body").append("svg")
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
      .style('stroke', 'red')
      .style('fill', 'none');
     
     globals.map.counties.on('click', function(){
     	thisFips = d3.select(this).attr('FIPS');
     	metadata = globals.data.countyMetadata[thisFips];
     	console.log(this)
     	//styling
     	d3.select(this).style('fill', 'red');
     });
     ///TODO:Additional map events should go here
}

function updateMap(geographyType, normalizationType, filteredInput){
	//accepts a geography type of 'Counties' or 'States' and an array of input filtered in the desired way
	//accepts a normalization type of 'Pop', 'Area', or 'None'
	//function aggreages to the desired geography and then sets the choropleth colors
	//returns nothing
		//this deals with the colors
	globals.map.colorScale = d3.scale.threshold() //map values to colors
        .domain([ 0, 1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 100, 200])
    	.range(['white', 'white', '#e3b3b3', '#d58d8d', '#c76666', '#ba4141', '#a73a3a', '#822d2d', '#6f2727', '#5d2020', '#4a1a1a', '#371313', '#250d0d', 'black']);
	//States isn't working yet
	if (geographyType == "States"){
		console.log("State level geography choropleth is not supported at this time.");
	}else if(geographyType == 'Counties'){
		toMap = aggregateByCounty(filteredInput);
		toMap = normalize("County", "Pop", toMap);
		idToValueMap = {};
		//populate the id/value lookup
	    _.each(toMap, function(d){
	    	idToValueMap[checkFIPS(d.geography).toString()] = {value: +d.value, geography: checkFIPS(d.geography)};});
	    allIDS = []
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
				return 'red';
			}else if (thisValue >= 0){
				return globals.map.colorScale(thisValue);
			}
			//return globals.map.colorScale(thisValue);
	   });

	   globals.map.counties.on('click', function(d){
	    	thisID = checkFIPS(d3.select(this).attr('FIPS'));
	    	allIDS.push(thisID);
			lookup = idToValueMap[thisID];
			//if it is not in idToValueMap, then it means that the filtered value is zero (no disasters);
			//lookup will be undefined
			//so you a try catch block and set value to zero
			thisValue = idToValueMap[thisID];
			if (thisValue){
				thisValue = thisValue.value
			}else{
				thisValue = 0;
			}
			console.log(thisValue);
			detailList = _.where(filteredInput, {FIPSCode:thisID});
			console.log(detailList);
	   });
	   
	}else if (geographyType == "States"){
		toMap = aggregateByCounty(filteredInput);
		toMap = normalize("County", "Pop", toMap);
		idToValueMap = {};
		//populate the id/value lookup
	    _.each(toMap, function(d){
	    	idToValueMap[checkFIPS(d.geography).toString()] = {value: +d.value, geography: checkFIPS(d.geography)};});
	    allIDS = []
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
				return 'red';
			}else if (thisValue >= 0){
				return globals.map.colorScale(thisValue);
			}
			//return globals.map.colorScale(thisValue);
	   });

	   globals.map.counties.on('click', function(d){
	    	thisID = checkFIPS(d3.select(this).attr('FIPS'));
	    	allIDS.push(thisID);
			lookup = idToValueMap[thisID];
			//if it is not in idToValueMap, then it means that the filtered value is zero (no disasters);
			//lookup will be undefined
			//so you a try catch block and set value to zero
			thisValue = idToValueMap[thisID];
			if (thisValue){
				thisValue = thisValue.value;
			}else{
				thisValue = 0;
			}
			console.log(thisValue);
			detailList = _.where(filteredInput, {FIPSCode:thisID});
			console.log(detailList);
	   });
	}
	displayMapTotal(filteredInput);
	console.log("Here comes pie chart");
	pie = calculatePieChartComp(filteredInput);
	updatePieChart(pie);
};

//build the pie chart showing composition
function buildPieChart(data){
	//build the chart
	globals.pie.height = 500;
	globals.pie.width = 500;
	globals.pie.radius = Math.min(globals.pie.width, globals.pie.height) / 2;
	globals.pie.colorScale = d3.scale.ordinal()
    .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);
    
    globals.pie.arc = d3.svg.arc()
    .outerRadius(globals.pie.radius - 10)
    .innerRadius(0);
    
    globals.pie.labelArc = d3.svg.arc()
    .outerRadius(globals.pie.radius - 40)
    .innerRadius(globals.pie.radius - 40);
    
   globals.pie.chart = d3.layout.pie()
    .sort(null)
    .value(function(d) { return d.Value; });
  
  globals.pie.svg = d3.select("#pieChart").append("svg")
    .attr("width", globals.pie.width)
    .attr("height", globals.pie.height)
  .append("g")
    .attr("transform", "translate(" + globals.pie.width / 2 + "," + globals.pie.height / 2 + ")");
    
   	  var g = globals.pie.svg.selectAll(".arc")
      .data(globals.pie.chart(data))
    .enter().append("g")
      .attr("class", "arc");
      
    g.append("path")
      .attr("d", globals.pie.arc)
      .style("fill", function(d) { 
      	color = globals.pie.colorScale(d.data.Type)
      	return color; });

  g.append("text")
      .attr("transform", function(d) { return "translate(" + globals.pie.labelArc.centroid(d) + ")"; })
      .attr("dy", ".35em")
      .text(function(d) { return d.data.Type; });
   
}

function updatePieChart(data){
	// //update the pie chart with new data\
//       
    globals.pie.chart.value(function(d) { return d.Type; }); // change the value function
    path = globals.pie.svg.data(globals.pie.chart); // compute the new angles
    path.attr("d", globals.pie.arc); // redraw the arcs
}

//CALCULATE CONTROLS



