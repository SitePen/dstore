define([
	'./Store',
	'./Model',
	'./objectQueryEngine',
	'./Memory',
	// TODO: Examing the following has!host-browser checks to see if the tests can be made to run outside of a browser
	'./Request',
	'./Rest',
	'intern/node_modules/dojo/has!host-browser?./RequestMemory',
	'./Observable',
	'./Cache',
	'intern/node_modules/dojo/has!host-browser?./Csv',
	'./Tree',
	'./extensions/rqlQueryEngine',
	'./validating',
	'./extensions/validating-jsonSchema',
	'./validators',
	'./legacy/DstoreAdapter-Memory',
	'./charting/StoreSeries',
	'./legacy/StoreAdapter-Memory',
	'intern/node_modules/dojo/has!host-browser?./legacy/StoreAdapter-JsonRest',
	'./legacy/StoreAdapter-DojoData'
], function () {
});
