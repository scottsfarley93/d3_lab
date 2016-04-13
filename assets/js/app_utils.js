//These are just some functions.
// They are called from main.js
//They are put here for clarity and so they don't make the one file big and annoying...
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
	//fixes a fips number for use in linking the chorpleth data
	fips = fips.toString();
	//adds a preceeding zero if the given fips is only four digits long, otherwise returns the input fips
	if (fips.length == 4){
		fips = "0" + fips;
	}
	if (fips.length == 2){
		fips = "0" + fips;
	}
	return fips;
}
function fixPostalCode(code){
	//returns a two letter abbreviation from a string in the format 'US01'
	s = code.replace("US", "");
	if (s.substr(0, 1) == "0"){
		s = s.replace("0", "");
	}
	ab = _.filter(globals.data.stateMetadata, {
		FIPS : s
	});
	item = ab[0];
	try {
		return item['state'];
	}catch(err){
		return "";
	}
	
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
function aggregateByMonth(inputData){
	//returns an object with {year:count} pairs for all months [1:12] in the input dataset--> input is an array, output is an object
	//aggregates by start year, so if the disaster spans multiple years, only the start month counts
	a = _.groupBy(inputData, function(item){
		return item['StartMonth'];
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

function calculatePieChartComp(agg, weights){
	//input data should be an aggregated and filtered Data array
	pie = [];
	aggNum = _.each(agg, function(value, key, list){
		pie.push({Category: key, Value: list[key].length});
	});
	return pie;
}




function displayMapTotal(input){
	//displays the total number of disasters on the map at this point in time
	//map always shows filteredData
	 l = input.length;
	$("#currentNumDisasters").text(formatNumber(l));
	globals.currentTotal = l
}

function displayPercentTotal(input){
	//show the percent of total currently being displayed
	fract = globals.currentTotal / globals.totalData * 100;
	show= Math.round(fract* 100) / 100 //do some rounding
	$("#percentTotal").text(show + "%");
}

//NORMALIZATION controls
function normalize(geographyType, normalizationType, inputObject){
	//returns an array of data values with a {'State' : NormalizedCount} value pairs
	//for use with aggregated state and county data
	//input should be an object of type {{"State" : "RawCount"}...} as returned by aggregateByState() or aggregateByCounty()
	if (geographyType == "Counties"){
		if (normalizationType == "None"){//just return the number of disasters
			keys = _.keys(globals.data.countyMetadata);
			n = _.map(inputObject, function(value, key){
				numDis = value.length;
				geog = checkFIPS(key.toString());
				i = keys.indexOf(geog) 
				out = {};
				out['geography'] = geog;
				out['normType'] = "None";
				if (i == -1){
					out['value'] = -1
				}else{
					out['value'] = numDis;
				}
				return out
			});
			return n;
		}else if (normalizationType == "Area"){//normalize by land area
			keys = _.keys(globals.data.countyMetadata);
			n = _.map(inputObject, function(value, key){
				
				numDis = value.length;
				out = {};
				geog = checkFIPS(key.toString());
				out['geography'] = geog;
				out['normtype'] = "Area";
				if (keys.indexOf(geog) != -1){
					details = getCountyDetails(geog);
					landarea = details['LandArea'];
					if ((landarea !=0) && (landarea)){//prevent div/!0 errors
						normed = +numDis / +landarea // disasters per km2
					}else{
						normed = -1;
					}
				}else{
					normed = -1;
				}

				out['value'] = normed;
				return out
			});
			return n
		}
	}
	else if(geographyType == "States"){
		//join by two letter postal code
		if (normalizationType == "None"){
				keys = _.keys(globals.data.stateMetadata, function(d){
					return d.FIPS
				});
				n = _.map(inputObject, function(value, key){
					numDis = value.length;
					geog = key.toString(); //postal code
					i = keys.indexOf(geog);
					out = {};
					out['geography'] = geog;
					out['normType'] = "None";
					if (i == -1){
						out['value'] = -1;
					}else{
						out['value'] = numDis;
					}
					return out;
				});
			return n;
		}else if (normalizationType == "Area"){//normalize by land area
			keys = _.keys(globals.data.stateMetadata, function(d){
				return d.FIPS
			});
			n = _.map(inputObject, function(value, key){
				numDis = value.length;
				out = {};
				geog = key; //postal code
				out['geography'] = geog;
				out['normtype'] = "Area";
				if (keys.indexOf(geog) != -1){
					details = getStateDetails(geog);
					landarea = details['Area'];
					if ((landarea !=0) && (landarea)){//prevent div/!0 errors
						normed = +numDis / +landarea // disasters per km2
					}else{
						normed = -1;
					}
				}else{
					normed = -1;
				}

				out['value'] = normed;
				return out
			});
			return n
		}
	}

}

function clearMap(){
	$("#map").empty();
}

function aggregateByMapClass(data, colorArray){
	data = aggregateByCounty(data);
	comp = []
	var numTotal;
	if (globals.mapConfig.geogType == 'States'){
		for (var i=0; i < globals.map.states[0].length; i++){
			state = d3.select(globals.map.states[0][i]);
			fillColor = state.style('fill');
			num = state.attr('numDis');
			obj = {"numDis": num, 'fill': fillColor};
			comp.push(obj);
		}
		numTotal = globals.map.states[0].length;
	}else if (globals.mapConfig.geogType == "Counties"){
		for (var i=0; i < globals.map.counties[0].length; i++){
			county = d3.select(globals.map.counties[0][i]);
			fillColor = county.style('fill');
			num = county.attr('numDis');
			obj = {"numDis": num, 'fill': fillColor};
			comp.push(obj);
		}
		numTotal = globals.map.counties[0].length;
	}
	
	//find the counts
	groups = _.groupBy(comp, function(d){
		return d.fill;
	})
	out = []
	//find the details
	for (color in groups){
		g = groups[color]
		num = g.length;
		pct = (num / numTotal) * 100;
		classMin = _.min(g, function(d){
			return +d.numDis;
		});
		classMin = +classMin.numDis;
		classMax = _.max(g, function(d){
			return +d.numDis;
		});
		classMax = +classMax.numDis;
		out.push({numInClass: num, classMax: classMax, classMin: classMin, percent: pct, color: color});
		offset += pct;
	}
	out = _.sortBy(out, function(d){
		return d.classMax;
	});
	//finally, find the offset
	var offset = 0;
	for (var i=0; i< out.length;i++){
		itemPct = +out[i]['percent'];
		out[i]['offset'] = offset;
		offset = offset + itemPct;
		out[i]['position'] = i ;
	}
	return out;
}

function convertAggregateToPercent(inputAgg, total){
	data = _.map(inputAgg, function(value, key, list){
		return {type: key, percent: (value.length / total) * 100};
	});
	data = _.sortBy(data, function(d){return d.percent;});
	offset = 0;
	for (var i = 0; i<data.length; i++){
		item = data[i];
		item['offset'] = offset;
		offset = item['percent'] + offset;
	}
	return data;
}


/// Handle window resize
function onResize(){
	//on document resize
	clearMap();
	createMap();
	updateMap(globals.mapConfig.geogType, globals.mapConfig.normType, globals.filteredData, globals.map.numClasses);	
}

function round2(num){
	return Math.round(num * 100) / 100;
}
function formatNumber(num){
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}


d3.selection.prototype.moveToFront = function() {  
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};
d3.selection.prototype.moveToBack = function() {  
    return this.each(function() { 
        var firstChild = this.parentNode.firstChild; 
        if (firstChild) { 
            this.parentNode.insertBefore(this, firstChild); 
        } 
    });
};