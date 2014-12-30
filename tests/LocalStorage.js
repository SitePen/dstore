define([
	'intern!object',
	'intern/chai!assert',
	'../db/has!indexeddb?../db/IndexedDB',
	'../db/has!sql?../db/SQL',
	'../db/LocalStorage',
	'dojo/promise/all',
	'dojo/sniff'
], function (registerSuite, assert, IndexedDB, SQL, LocalStorage, all, has) {
	var data = [
		{id: 1, name: 'one', prime: false, mappedTo: 'E', words: ['banana']},
		{id: 2, name: 'two', even: true, prime: true, mappedTo: 'D', words: ['banana', 'orange']},
		{id: 3, name: 'three', prime: true, mappedTo: 'C', words: ['apple', 'orange']},
		{id: 4, name: 'four', even: true, prime: false, mappedTo: null},
		{id: 5, name: 'five', prime: true, mappedTo: 'A'}
	];
	var dbConfig = {
		version: 5,
		stores: {
			test: {
				name: 10,
				even: {},
				id: {
					autoIncrement: true,
					preference: 20
				},
				words: {
					multiEntry: true,
					preference: 5
				},
				mappedTo: {
					indexed: false
				}
			}
		}
	};
	if (IndexedDB) {
		registerSuite(testsForDB('dstore/db/IndexedDB', IndexedDB));
	}
	if (window.openDatabase) {
		registerSuite(testsForDB('dstore/db/SQL', SQL));
	}
	registerSuite(testsForDB('dstore/db/LocalStorage', LocalStorage));
	function testsForDB(name, DB) {
		// need to reset availability
		dbConfig.available = null;
		var db = new DB({dbConfig: dbConfig, storeName: 'test'});
		var Filter = db.Filter;
		function testQuery(filter, options, results) {
			if (!results) {
				results = options;
				options = undefined;
			}
			return function () {
				if (options && options.multi && has('trident')) {
					// sadly, IE doesn't support multiEntry yet
					return;
				}
				var i = 0;
				var collection = db.filter(filter, options);
				if (options) {
					if (options.sort) {
						collection = collection.sort(options.sort);
					}
					if (options.range) {
						var fetchedRange = collection.fetchRange(options.range);
						return fetchedRange.then(function (fetched) {
							fetched.forEach(function (object, i) {
								assert.strictEqual(results[i], object.id);
							});
							assert.strictEqual(results.length, fetched.length);
							return fetchedRange.totalLength.then(function (totalLength) {
								assert.strictEqual(totalLength, options.range.count);
							});							
						});
					}
				}
				var forEachResults = collection.forEach(function (object) {
					console.log("id check", i, results[i], object.id);
					assert.strictEqual(results[i++], object.id);
				});
				return forEachResults.then(function () {
					console.log("results", results);
					assert.strictEqual(results.length, i);
					if (options && options.range) {
						return forEachResults.totalLength.then(function (total) {
							assert.strictEqual(results.length, total);
						});
					}
				});
			};
		}
		return {
			name: name,
			setup: function () {
				var results = [];
				return db.fetch().then(function (data) {
					// make a copy
					data = data.slice(0);
					for (var i = 0, l = data.length; i < l; i++) {
						results.push(db.remove(data[i].id));
					}
					return all(results);
				}).then(function() {
					results = [];
					// load new data
					for (var i = 0; i < data.length; i++) {
						results.push(db.put(data[i]));
					}
					return all(results);
				});
			},
			'{id: 2}': testQuery({id: 2}, [2]),
			'{name: "four"}': testQuery({name: 'four'}, [4]),
			'{name: "two"}': testQuery({name: 'two'}, [2]),
			'{even: true}': testQuery({even: true}, [2, 4]),
			'{even: true, name: "two"}': testQuery({even: true, name: 'two'}, [2]),
			// test non-indexed values
			'{mappedTo: "C"}': testQuery({mappedTo: 'C'}, [3]),
			// union
			'[{name: "two"}, {mappedTo: "C"}, {mappedTo: "D"}]':
					testQuery(
						new Filter().or(
							new Filter({name: 'two'}),
							new Filter({mappedTo: 'C'}),
							new Filter({mappedTo: 'D'})), [2, 3]),
			'{id: {from: 1, to: 3}}': testQuery(new Filter().gte('id', 1).lte('id', 3), [1, 2, 3]),
			'{name: {from: "m", to: "three"}}': testQuery(new Filter().gte('name', 'm').lte('name', 'three'), [1, 3]),
			'{name: {from: "one", to: "three"}}': testQuery(new Filter().gte('name', 'one').lte('name', 'three'), [1, 3]),
			'{name: {from: "one", excludeFrom: true, to: "three"}}': 
					testQuery(new Filter().gt('name', 'one').lte('name', 'three'), [3]),
			'{name: {from: "one", to: "three", excludeTo: true}}':
					testQuery(new Filter().gte('name', 'one').lt('name', 'three'), [1]),
			'{name: {from: "one", excludeFrom: true, to: "three", excludeTo: true}}':
					testQuery(new Filter().gt('name', 'one').lt('name', 'three'), []),
			'{name: "t*"}': testQuery(new Filter().match('name', /^t/), {sort:[{property: 'name'}]}, [3, 2]),
			'{name: "not a number"}': testQuery({name: 'not a number'}, []),
			'{words: {contains: ["orange"]}}': testQuery(new Filter().contains('words', ['orange']), {multi: true}, [2, 3]),
			'{words: {contains: ["or*"]}}': testQuery(new Filter().contains('words', [
					new Filter().match('words', /^or/)]), {multi: true}, [2, 3]),
			'{words: {contains: ["apple", "banana"]}}': testQuery(new Filter().contains('words', ['apple', 'banana']), {multi: true}, []),
			'{words: {contains: ["orange", "banana"]}}':
					testQuery(new Filter().contains('words', ['orange', 'banana']), {multi: true}, [2]),
			'{id: {from: 0, to: 4}, words: {contains: ["orange", "banana"]}}':
					testQuery(new Filter().gte('id', 0).lte('id', 4).contains('words', ['orange', 'banana']), {multi: true}, [2]),
			// '{name: '*e'}': testQuery({name: '*e'}, [5, 1, 3]), don't know if we even support this yet
			'{id: {from: 1, to: 3}}, sort by name +': testQuery(
					new Filter().gte('id', 1).lte('id', 3), {sort:[{property: 'name'}]}, [1, 3, 2]),
			'{id: {from: 1, to: 3}}, sort by name -':
					testQuery(new Filter().gte('id', 1).lte('id', 3), {sort:[{property: 'name', descending: true}]}, [2, 3, 1]),
			'{id: {from: 0, to: 4}}, paged': testQuery(new Filter().gte('id', 0).lte('id', 4),
					{range: {start: 1, end: 3, count: 4}}, [2, 3]),
			'db interaction': function () {
				return db.get(1).then(function(one) {
					assert.strictEqual(one.id, 1);
					assert.strictEqual(one.name, 'one');
					assert.strictEqual(one.prime, false);
					assert.strictEqual(one.mappedTo, 'E');
					return all([
							db.remove(2),
							db.remove(4),
							db.add({id: 6, name: 'six', prime: false, words: ['pineapple', 'orange juice']})
						]).then(function() {
						return all([
							testQuery(new Filter().gte('name', 's').lte('name', 'u'), {sort:[{property: 'id'}]}, [3, 6])(),
							testQuery(new Filter().contains('words', [new Filter().match('words', /^orange/)]), {multi: true}, [3, 6])()
						]);
					});
				});
			},
			'reload db': function () {
				// reload the DB store and make sure the data is still there
				dbConfig.openRequest = null;
				db = new DB({dbConfig: dbConfig, storeName: 'test'});
				return db.get(1).then(function(one) {
					assert.strictEqual(one.id, 1);
					assert.strictEqual(one.name, 'one');
					assert.strictEqual(one.prime, false);
					assert.strictEqual(one.mappedTo, 'E');
					return all([
						testQuery(new Filter().gte('name', 's').lte('name', 'u'), {sort:[{property: 'id'}]}, [3, 6])(),
						testQuery(new Filter().contains('words', [new Filter().match('words', /^orange/)]), {multi: true}, [3, 6])()
					]);
				});
			}

		};
	}
});
