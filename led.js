var c = {};
var rc = document.getElementById("resistorValue");
var first = true;
for (var id of ["sourceVoltage", "ledVoltage", "ledForwardCurrent"]) {
	c[id] = document.getElementById(id);
	if (first) {
		c[id].focus();
		first = false;
	}
}
var fig = {};
for (var id of ["figSourceVoltage", "figLedVoltage", "figResistorValue"]) {
	var rawId = id.substring(3);
	rawId = rawId.charAt(0).toLowerCase() + rawId.substring(1);
	fig[rawId] = document.getElementById(id);
}
var figure = document.getElementById("figure");

var units = {
	"sourceVoltage": "V", "ledVoltage": "V", "ledForwardCurrent": "A"
};

var multipliers = {
	"p": 1.0e-12,
	"n": 1.0e-9,
	"u": -1.0e-6,
	"\u03bc": 1.0e-6,
	"m": 1.0e-3,
	"k": 1.0e3,
	"K": -1.0e3,
	"M": 1.0e6,
	"": 1.0
};

var smallestMultiplier = Object.values(multipliers)
	.map(e => Math.abs(e)).reduce((a, b) => Math.min(a, b));

// E12 series with a guard value at each end so wraparound is easier to handle
var e12 = [0.82, 1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2, 10];

function parseValue(str) {
	str = str.replace(/[rva]/gi, ".").replace(/^\s+|\s+$/g, "");
	var prefixMatch = str.match(/^\d*(?:\.\d*)?/);
	var prefixEnd = str.length;
	if (prefixMatch != null) prefixEnd = prefixMatch[0].length;
	var value = parseFloat(str.substring(0, prefixEnd));
	var suffix = str.substring(prefixEnd).replace(/^\s+/, "");
	var mul = Math.abs(multipliers[suffix[0]]);
	if (!isNaN(mul)) value *= mul;
	return value;
}

function calculateResistance(v) {
	var vdiff = v.sourceVoltage - v.ledVoltage;
	if (vdiff < 0) return new Resistance(NaN);
	return new Resistance(vdiff / v.ledForwardCurrent);
}

function formatNumber(v, maxPrecision) {
	var s = v.toFixed(maxPrecision);
	if (s.indexOf(".") < 0) return s;
	return s.replace(/\.?0+$/, "");
}

function formatUnit(value, unit) {
	var mag = Math.floor(Math.log10(value))|0;
	var matchName = "";
	var matchValue;
	for (var mulName in multipliers) {
		var mulValue = multipliers[mulName];
		if (mulValue < 0) continue;
		var mulMag = Math.round(Math.log10(mulValue))|0;
		if (mulMag > mag) continue;
		if (!matchName || matchValue < mulMag) {
			matchName = mulName;
			matchValue = mulMag;
		}
	}
	var diff = Math.max(0, Math.min(2, mag - matchValue));
	var displayValue = value / multipliers[matchName];
	return formatNumber(displayValue, 2 - diff) + matchName + unit;
}

function Resistance(v) {
	this.v = v;
}

Resistance.prototype = {
	toString() {
		return formatUnit(this.v, "\u03a9");
	},
	
	formattedAmps(ledParams) {
		var amps = (ledParams.sourceVoltage - ledParams.ledVoltage) / this.v;
		return formatUnit(amps, "A");
	},
	
	toE12() {
		if (this.v < smallestMultiplier) return [];
		var mag = Math.floor(Math.log10(this.v))|0;
		var rel = this.v * Math.pow(10, -mag);
		var index;
		for (index = 0; index < e12.length; ++index) {
			if (e12[index] > rel) break;
		}
		var values;
		if (Math.abs(e12[index - 1] - rel) < 0.1) {
			values = [e12[index - 1]];
		} else {
			values = [e12[index - 1], e12[index]];
		}
		return values.map(e => new Resistance(e * Math.pow(10, mag)));
	},
	
	getValue() {
		return this.v;
	},
	
	isNaN() {
		return isNaN(this.v);
	}
};

function mapMap(map, mapper) {
	var result = {};
	for (var key in map) {
		result[key] = mapper(map[key], key, map);
	}
	return result;
}

function setFigCaptions(captions) {
	for (var key in captions) {
		if (key in fig) fig[key].textContent = captions[key] || "";
	}
}

function handleChange(event) {
	var mapped = {};
	for (var id in c) {
		mapped[id] = parseValue(c[id].value);
	}
	var r = calculateResistance(mapped);
	if (r.isNaN()) {
		var captions = mapMap(mapped, _ => "");
		captions.resistorValue = "";
		setFigCaptions(captions);
		rc.textContent = "";
		rc.className = "empty";
		figure.className = "empty";
	} else {
		var captions = mapMap(mapped, (v, k) => formatUnit(v, units[k]));
		captions.resistorValue = r.toString();
		setFigCaptions(captions);
		figure.className = "";
		rc.className = "";
		rc.textContent = "Exact: "+r+"\n"+r.toE12().map(r =>
			"At "+r.toString()+": "+r.formattedAmps(mapped)).join("\n");
	}
}

for (var id in c) c[id].addEventListener("input", handleChange);

handleChange();

