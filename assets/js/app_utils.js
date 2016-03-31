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
	$("#currentNumDisasters").text(l);
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
	}else if(geographyType == "States"){
		
	}

}

function clearMap(){
	$("#map").empty();
}