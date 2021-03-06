MyHomeworkSpace.QuickAdd = {
	classes: [],
	classIds: [],
	prefixList: [],
	classSynonyms: [
		["science", "sci", "bio", "biology", "chem", "chemistry", "physics"],
		["math", "algebra", "calculus", "calc", "pre-calculus", "precalculus", "precalc", "geometry", "geo"],
		["computer science", "compsci"],
		["language", "french", "latin", "spanish", "mandarin"]
	],
	init: function() {
		var nlp = window.nlp_compromise;
		// these things aren't descriptive enough to be useful dates, so remove them from the lexicon
		nlp.lexicon()["day"] = undefined;
		nlp.lexicon()["week"] = undefined;

		// these things cause nlp_compromise to get very confused
		// "hw pa" doesn't mean a highway in philadelphia
		nlp.lexicon()["hwy"] = undefined;
		nlp.lexicon()["pa"] = undefined;

		// this is a bit of a hack to get nlp_compromise to like the "hw" prefix
		// i know that "hw" isn't a verb
		// nlp_compromise doesn't
		nlp.lexicon()["hw"] = "Infinitive";

		MyHomeworkSpace.QuickAdd.classes = [];
		MyHomeworkSpace.QuickAdd.classIds = [];
		MyHomeworkSpace.QuickAdd.prefixList = [];
		for (var prefixIndex in MyHomeworkSpace.Prefixes.list) {
			var prefix = MyHomeworkSpace.Prefixes.list[prefixIndex];
			for (var wordIndex in prefix.words) {
				MyHomeworkSpace.QuickAdd.prefixList.push(prefix.words[wordIndex].toLowerCase());
			}
		}
		for (var classIndex in MyHomeworkSpace.Classes.list) {
			MyHomeworkSpace.QuickAdd.classes.push(MyHomeworkSpace.Classes.list[classIndex].name.toLowerCase());
			MyHomeworkSpace.QuickAdd.classIds.push(MyHomeworkSpace.Classes.list[classIndex].id);
		}
	},
	isClass: function(array, index) {
		var classMatches = false;
		var termsToSkip = 0;
		var arrIndex = index;
		for (var classIndex in MyHomeworkSpace.QuickAdd.classes) {
			var classItem = MyHomeworkSpace.QuickAdd.classes[classIndex];
			var classWords = classItem.split(" ");
			arrIndex = index;
			for (var i = 0; i < classWords.length; i++) {
				if (array.length <= arrIndex) {
					if (classMatches) {
						break;
					} else {
						continue;
					}
				}
				if (classWords[i].toLowerCase() == array[arrIndex].text.toLowerCase()) {
					classMatches = true;
				} else {
					classMatches = false;
					for (var synonymsIndex in MyHomeworkSpace.QuickAdd.classSynonyms) {
						if (MyHomeworkSpace.QuickAdd.classSynonyms[synonymsIndex].indexOf(classWords[i].toLowerCase()) > -1) {
							if (MyHomeworkSpace.QuickAdd.classSynonyms[synonymsIndex].indexOf(array[arrIndex].text.toLowerCase()) > -1) {
								classMatches = true;
							}
						}
					}
				}
				arrIndex++;
			}
			if (classMatches) {
				break;
			}
		}
		return {
			match: classMatches,
			classIndex: parseInt(classIndex),
			termsToSkip: arrIndex - index
		};
	},
	parseDate: function(text) {
		if (!isNaN(moment(text).day())) {
			return moment(text).format("YYYY-MM-DD");
		}
		var textToParse = text.toLowerCase().split(" ");
		var result = {
			last: false,
			next: false,
			dow: -1
		};
		for (var wordIndex in textToParse) {
			var word = textToParse[wordIndex];
			if (word == "last") {
				result.last = true;
			} else if (word == "next") {
				result.next = true;
			} else if (word.substr(0, 3) == "sun") {
				result.dow = 0;
			} else if (word.substr(0, 3) == "mon") {
				result.dow = 1;
			} else if (word.substr(0, 3) == "tue") {
				result.dow = 2;
			} else if (word.substr(0, 3) == "wed") {
				result.dow = 3;
			} else if (word.substr(0, 3) == "thu") {
				result.dow = 4;
			} else if (word.substr(0, 3) == "fri") {
				result.dow = 5;
			} else if (word.substr(0, 3) == "sat") {
				result.dow = 6;
			} else if (word.substr(0, 3) == "tom") { // tomorrow
				result.dow = moment().day() + 1;
				if (result.dow == 7) {
					result.dow = 0;
				}
			}
		}
		if (result.dow == -1) {
			return "";
		}
		var resultDate = moment();
		var thisWeek = resultDate.week();
		while (
			((result.last || result.next) && (resultDate.week() == thisWeek || resultDate.day() != result.dow)) ||
			((!result.last && !result.next) && (resultDate.day() != result.dow))
		) {
			if (result.last) {
				resultDate.subtract(1, "day");
			} else {
				resultDate.add(1, "day");
			}
		}
		return resultDate.format("YYYY-MM-DD");
	},
	parseText: function(text) {
		// examples:
		// [read poem] [for English] for [tomorrow]
		// take [test on molecules] [in Science] on [next Tuesday]
		// [next Friday] write an [essay about the revolution] [in History] class

		var nlp = window.nlp_compromise;
		var response = {
			tag: "",
			name: "",
			class: "",
			classId: 0,
			due: ""
		};
		var sentence = nlp.sentence(text);
		var nameTrack = false;
		var termsToSkip = 0;

		for (var termIndex in sentence.terms) {
			var term = sentence.terms[termIndex];
			if (termsToSkip > 0) {
				termsToSkip--;
			} else if (MyHomeworkSpace.QuickAdd.prefixList.indexOf(term.text.toLowerCase()) > -1) {
				response.tag = term.text;
				nameTrack = true;
			} else if (term.tag == "Date") {
				response.due = term.text;
			} else if (term.pos.Conjunction || term.pos.Preposition) {
				// peek at the next word
				var classResults = MyHomeworkSpace.QuickAdd.isClass(sentence.terms, parseInt(termIndex) + 1);
				if (sentence.terms[parseInt(termIndex) + 1] && classResults.match) {
					// if it's a class, set it and skip it
					response.class = MyHomeworkSpace.Classes.list[classResults.classIndex].name;
					response.classId = MyHomeworkSpace.QuickAdd.classIds[classResults.classIndex];
					termsToSkip = classResults.termsToSkip;
				} else if ((parseInt(termIndex) + 1) != sentence.terms.length && sentence.terms[parseInt(termIndex) + 1].tag == "Date") {
					// the next word is a due date, so skip this word
				} else if (nameTrack) {
					response.name += term.text;
					response.name += " ";
				}
			} else if (term.text.toLowerCase() == "due" || term.text.toLowerCase() == "class") {
				// skip it
			} else if (nameTrack) {
				response.name += term.text;
				response.name += " ";
			}
		}

		response.name = response.name.trim();

		return response;
	}
};
