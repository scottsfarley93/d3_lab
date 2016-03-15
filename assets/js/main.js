/**
 * @author Scott Farley
 */


var globals = {};
globals.allData = {}; //the raw download response 
globals.filteredData = {}; //the data with current filters applied
globals.disasterTypes = []; // a list of all of the types of disasters contained within the dataset
globals.aggregatedToType = {};
globals.states = [];
globals.counties = [];
globals.processingState = 0;
globals.activeFilter = {};
globals.activeFilter.options = {	
	state: globals.states, //placeholder --> maybe later we will want to filter by state
	type: [],
	minYear: 1964,
	maxYear: 2016
};
globals.activeFilter.stateTotals = {};


$(document).ready(function(){
	loadData();
});


function loadData(){
	$.ajax("assets/data/fema_short.json",{
		success: onDataLoad, //success callback is here
		error: function(xhr, status, error){
			console.log("Couldn't fetch data from remote host.");
		},
		//enable progress bar for data load
		xhr: function(){
			var xhr = new window.XMLHttpRequest();
			//Download progress
			xhr.addEventListener("progress", function(evt){
			  if (evt.lengthComputable) {
			    var percentComplete = evt.loaded / evt.total;
			    //Do something with download progress
			    console.log(percentComplete);
			    $("#loadProgress").val(percentComplete);
			  }
			}, false);
			return xhr;
		},
		complete: function(){
			$("#currentTask").text("Finished loading main data file.")
		},
		dataType: "json",
		type: "GET",
		beforeSend:function(){
			$("#currentTask").text("Loading FEMA Disaster Declarations Information.");
		}
	});
}
function onDataLoad(response){
	globals.allData = response;
	globals.filteredData = response['data'];
	populateArrays(); // populates the state, type, and county arrays
	makeTypeOptionsFilter();
}

function populateArrays(){
	$("#currentTask").text("Populating arrays.");
	for (item in globals.filteredData){
		state = globals.filteredData[item]['State'];
		type = globals.filteredData[item]['incidentType'];
		county = globals.filteredData[item]['FIPSName'];
		fips = globals.filteredData[item]['FIPSCode'];
		l = {
			state: state,
			county: county,
			fips: fips
		};
		if (globals.states.indexOf(state) == -1){
			globals.states.push(state);
		}
		if (globals.counties.indexOf(location) == -1){
			globals.counties.push(l);
		}
		if (globals.disasterTypes.indexOf(type) == -1){
			globals.disasterTypes.push(type)
		}
	}
	$("#currentTask").text("Finished populating input data.")
}

function showAllStates(){
	for (s in globals.states){
		state = globals.states[s];
		stateCount = 0;
		for (row in globals.filteredData){
			if (globals.filteredData[row]['State'] == state){
				stateCount += 1;
			}
		}
		$("#main").append(state + ": " + stateCount + "</br />");
	}
}

function getStateTypeValue(state, type){
	//gets a state-type value from the global filtered data
	count = 0;
	for (r in globals.filteredData){
		row = globals.filteredData[r]
		if ((row['incidentType'] == type)&& (row['State'] == state) ){
			count += 1;
		}
	}
	return count;
}

function showAllTypes(){
	//justs a 
	for (var t=0; t<globals.disasterTypes.length; t ++){
		type = globals.disasterTypes[t];
		typeCount = 0;
		for (row in globals.filteredData){
			if (globals.filteredData[row]['incidentType'] == type){
				typeCount += 1;
			}
		}
		$("#main").append(type + ": " + typeCount + "<br />");
	}
}


function filter(){
	//filters using a filterOptions object and returns the result 
	filtered = [];
	for (row in globals.allData['data']){
		state = globals.allData['data'][row]['State'];
		type = globals.allData['data'][row]['incidentType'];
		startDate = globals.allData['data'][row]['Begin'];
		endDate = globals.allData['data'][row]['End'];
		//filter by state
		if ((globals.activeFilter.options.state.indexOf(state) != -1) &&
			(globals.activeFilter.options.type.indexOf(type) != -1)) // time filtering not yet included		
		{
			filtered.push(globals.allData['data'][row]);
		}	
	}
	globals.filteredData = filtered;
}

function makeTypeOptionsFilter(){
	//builds a set of checkboxes with the disaster types in the dataset
	
	$("#currentTask").text("Building category filter controls.");
	$("#typeFilter").empty();
	for (var i=0; i< globals.disasterTypes.length;i++){
		type = globals.disasterTypes[i];
		html = "<input type='checkbox' class='typeFilter' disasterType='" + type + "'><label>" + type + "</label><br />";
		$("#typeFilter").append(html);
	}
	$(".typeFilter").change(function(){
		filterHandler();
		filter();
		buildDataTable();
	});
}

function filterHandler(){
	//determine the filter input from the panel and prep it for the filtering function
	elementList = $("#typeFilter").children();
	globals.activeFilter.options.type = []; // reset the filter
	//type filtering prep
	for (var i=0; i< elementList.length;i++){
		element = elementList[i];
		if ($(element).hasClass('typeFilter')){
			if ($(element).prop('checked')){
				thisValue = $(element).attr('disasterType');
				globals.activeFilter.options.type.push(thisValue);
			}
		}
	}
	//time filtering prep
	minYear = $("#filterMinYear").val();
	maxYear = $("#filterMaxYear").val();
	globals.activeFilter.options.minYear = minYear;
	globals.activeFilter.options.maxYear = maxYear;
	console.log("Currently active filter: " + globals.activeFilter.options);
	//global options have now been set
}

function buildDataTable(){
	$("#infoViz").empty();
	html = "<table><tr><th>State</th>";
	for (var i=0;i<globals.activeFilter.options.type.length;i++){
		html += "<th>" + globals.activeFilter.options.type[i] + "</th>";
	}
	html += "<th>Total</th><tr>";
	for (var i=0; i<globals.activeFilter.options.state.length; i++){
		html += "<tr><th>" + globals.states[i] + "</th>";
		globals.activeFilter.stateTotals[globals.states[i]] = 0;
		for (var t=0;t<globals.activeFilter.options.type.length;t++){
			stateTimeValue = getStateTypeValue(globals.activeFilter.options.state[i], globals.activeFilter.options.type[t]); // filtered lookup
			globals.activeFilter.stateTotals[globals.states[i]] += stateTimeValue;
			html += "<td>" + stateTimeValue  + "</td>";
		}
		html += "<td>" + globals.activeFilter.stateTotals[globals.states[i]] + "</td>";
		html += "</tr>";
	}
	
	$("#infoViz").append(html);
}

function resetFilter(){
}

