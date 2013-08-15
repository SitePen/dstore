define([
	'intern!object',
	'intern/chai!assert',
	'dojo/request',
	'dojo/promise/all',
	'dojo/_base/declare',
	'dstore/Csv',
	'dstore/Memory'],
	function(registerSuite, assert, request, all, declare, Csv, Memory){
		var CsvMemory = declare([Memory, Csv]);
		var xhrBase = require.toUrl('dstore/tests/data');
		var csvs = {}; // holds retrieved raw CSV data
		var stores = window.stores = {}; // holds stores created after CSV data is retrieved
		var readyPromise = all([
			// Load CSV data.  The referenced data has various inconsistencies
			// throughout on purpose, to test that the implementation responds
			// properly to things like extra whitespace, blank values/lines, etc.
			request(xhrBase + '/noquote.csv').then(function(data){
				csvs.noQuote = data;
				stores.noQuoteNoHeader = new CsvMemory({
					data: data,
					newline: '\n',
					fieldNames: ['id', 'last', 'first', 'born', 'died']
				});
				stores.noQuoteWithHeader = new CsvMemory({
					data: data,
					newline: '\n'
					// No fieldNames; first row will be treated as header row.
				});
				stores.noQuoteTrim = new CsvMemory({
					data: data,
					newline: '\n',
					trim: true
				});
			}),
			request(xhrBase + '/quote.csv').then(function(data){
				csvs.quote = data;
				stores.quoteNoHeader = new CsvMemory({
					data: data,
					newline: '\n',
					fieldNames: ['id', 'name', 'quote']
				});
				stores.quoteWithHeader = new CsvMemory({
					data: data,
					newline: '\n'
					// No fieldNames; first row will be treated as header row.
				});
			}),
			request(xhrBase + '/contributors.csv').then(function(data){
				csvs.contributors = data;
				stores.contributors = new CsvMemory({
					data: data,
					newline: '\n'
				});
			})
		]);

		readyPromise.then(function(){
			registerSuite({
				name: 'dstore CSV',

				'no quote': function(){
					var noHeader = stores.noQuoteNoHeader,
						withHeader = stores.noQuoteWithHeader,
						trim = stores.noQuoteTrim,
						item, trimmedItem;

					// Test header vs. no header...
					assert.strictEqual(4, noHeader.data.length,
						'Store with fieldNames should have 4 items.');
					assert.strictEqual(3, withHeader.data.length,
						'Store using header row should have 3 items.');
					assert.strictEqual(5, noHeader.fieldNames.length,
						'Store with fieldNames should have 5 fields.');
					assert.strictEqual(6, withHeader.fieldNames.length,
						'Store using header row should have 6 fields.');
					assert.strictEqual('id', noHeader.get('id').id,
						'First line should be considered an item when fieldNames are set');
					assert.strictEqual('Albert', withHeader.get('1').first,
						'Field names picked up from header row should be trimmed.');
					assert.strictEqual(noHeader.get('1').last, withHeader.get('1').last,
						'Item with id of 1 should have the same data in both stores.');

					// Test trim vs. no trim...
					item = withHeader.get('2');
					trimmedItem = trim.get('2');
					assert.strictEqual(' Nikola ', item.first,
						'Leading/trailing spaces should be preserved if trim is false.');
					assert.strictEqual('Nikola', trimmedItem.first,
						'Leading/trailing spaces should be trimmed if trim is true.');
					assert.strictEqual(' ', item.middle,
						'Strings containing only whitespace should remain intact if trim is false.');
					assert.strictEqual('', trimmedItem.middle,
						'Strings containing only whitespace should be empty if trim is true.');

					// Test data integrity...
					item = withHeader.get('1');
					assert.isTrue(item.middle === '', 'Test blank value.');
					assert.strictEqual('1879-03-14', item.born, 'Test value after blank value.');
					assert.isTrue(withHeader.get('3').died === '', 'Test blank value at end of line.');
				},

				'quote': function(){
					var noHeader = stores.quoteNoHeader,
						withHeader = stores.quoteWithHeader;

					// Test header vs. no header...
					assert.strictEqual(5, noHeader.data.length,
						'Store with fieldNames should have 5 items.');
					assert.strictEqual(4, withHeader.data.length,
						'Store using header row should have 4 items.');
					assert.strictEqual('id', noHeader.get('id').id,
						'First line should be considered an item when fieldNames are set');
					assert.strictEqual(noHeader.get('1').name, withHeader.get('1').name,
						'Item with id of 1 should have the same data in both stores.');

					// Test data integrity...
					assert.strictEqual('""', withHeader.get('3').quote,
						'Value consisting of two double-quotes should pick up properly.');
					assert.strictEqual(' S, P, ...ace! ', withHeader.get('4').quote,
						'Leading/trailing spaces within quotes should be preserved.');
					assert.isTrue(/^Then[\s\S]*"Nevermore\."$/.test(withHeader.get('2').quote),
						'Multiline value should remain intact.');
					assert.isTrue(/smiling,\n/.test(withHeader.get('2').quote),
						'Multiline value should use same newline format as input.');
				},

				'import export': function(){
					assert.strictEqual(csvs.contributors, stores.contributors.toCsv(),
						'toCsv() should generate data matching original if it is well-formed');
				}
			});
		});
	});